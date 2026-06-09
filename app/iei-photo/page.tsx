"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import IeiPhotoUploader from "@/components/iei-photo/IeiPhotoUploader";
import IeiPhotoModeSelector from "@/components/iei-photo/IeiPhotoModeSelector";
import IeiPhotoPreview from "@/components/iei-photo/IeiPhotoPreview";
import IeiPhotoStatus from "@/components/iei-photo/IeiPhotoStatus";
import IeiPhotoQualityCheck from "@/components/iei-photo/IeiPhotoQualityCheck";
import IeiPhotoExportButtons from "@/components/iei-photo/IeiPhotoExportButtons";
import {
  IEI_PHOTO_DEFAULT_MODE,
  IEI_PHOTO_NOTICES,
} from "@/lib/iei-photo/image-rules";
import { IEI_PHOTO_MOCK_STEPS } from "@/lib/iei-photo/mock-job";
import {
  createBasePhotoFromImage,
  exportBaseFromBase,
  exportFromBaseByKind,
  filenameForKind,
  downloadBlob,
} from "@/lib/iei-photo/client-export";
import type {
  IeiPhotoExports,
  IeiPhotoJobStatus,
  IeiPhotoMode,
  IeiPhotoQualityCheckItem,
} from "@/lib/iei-photo/types";

/** 処理前の品質チェック項目（未判定） */
const INITIAL_QUALITY_CHECKS: IeiPhotoQualityCheckItem[] = [
  {
    key: "faceSimilarity",
    label: "顔の類似度",
    status: "pending",
    description: "加工後も本人の顔立ちが保たれているかを確認します。",
  },
  {
    key: "featureProtection",
    label: "ほくろ・シワ・眼鏡などの保護",
    status: "pending",
    description: "ほくろ・シワ・眼鏡など本人の特徴が消えていないかを確認します。",
  },
  {
    key: "aiArtifact",
    label: "AIっぽさチェック",
    status: "pending",
    description: "不自然なAI特有の質感や破綻が出ていないかを確認します。",
  },
  {
    key: "overexposure",
    label: "白飛びチェック",
    status: "pending",
    description: "ハイライトの白飛びや階調の損失がないかを確認します。",
  },
];

/**
 * 処理完了後の品質チェック表示。
 * 今回は実判定を行わず、ブラウザ内 Canvas で「元写真ピクセルのトリミング・配置のみ」を
 * 行っている事実を表示する（AI は未使用）。
 */
const COMPLETED_QUALITY_CHECKS: IeiPhotoQualityCheckItem[] = [
  {
    key: "faceSimilarity",
    label: "顔の類似度",
    status: "pending",
    description: "AIによる類似度の自動判定は行っていません。",
    note: "未実装",
  },
  {
    key: "featureProtection",
    label: "ほくろ・シワ・眼鏡などの保護",
    status: "pass",
    description: "元写真のピクセルをそのまま使用しています（描き直しなし）。",
    note: "元写真ピクセル使用",
  },
  {
    key: "aiArtifact",
    label: "AIっぽさチェック",
    status: "pass",
    description: "AIによる生成・補正は使用していません。",
    note: "AI未使用",
  },
  {
    key: "overexposure",
    label: "白飛びチェック",
    status: "pending",
    description: "白飛びの自動判定は行っていません。",
    note: "未実装",
  },
];

type StatusState = {
  status: IeiPhotoJobStatus | "idle";
  progress: number;
  label: string;
};

const IDLE_STATUS: StatusState = { status: "idle", progress: 0, label: "" };

export default function IeiPhotoPage() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [afterUrl, setAfterUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [mode, setMode] = useState<IeiPhotoMode>(IEI_PHOTO_DEFAULT_MODE);
  const [statusState, setStatusState] = useState<StatusState>(IDLE_STATUS);
  const [exports, setExports] = useState<IeiPhotoExports | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);

  // 基準写真（親データ）。各サイズはここから派生させる。
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [baseReady, setBaseReady] = useState<boolean>(false);

  // 進行中タイマーの管理（アンマウント時にクリア）
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

  // ObjectURL の解放（アンマウント時）
  useEffect(() => {
    return () => {
      clearTimers();
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      if (afterUrl) {
        URL.revokeObjectURL(afterUrl);
      }
    };
  }, [previewUrl, afterUrl, clearTimers]);

  const resetResults = useCallback(() => {
    setExports(null);
    setStatusState(IDLE_STATUS);
    setError(null);
    setBaseReady(false);
    baseCanvasRef.current = null;
    setAfterUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
  }, []);

  const handleSelectFile = useCallback(
    (file: File) => {
      clearTimers();
      resetResults();
      setPreviewUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return URL.createObjectURL(file);
      });
      setFileName(file.name);
    },
    [clearTimers, resetResults],
  );

  const handleClear = useCallback(() => {
    clearTimers();
    resetResults();
    setFileName(null);
    setPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
  }, [clearTimers, resetResults]);

  const isProcessing =
    statusState.status !== "idle" &&
    statusState.status !== "completed" &&
    statusState.status !== "failed";
  const isCompleted = statusState.status === "completed";

  /**
   * 基準写真を作成し、After プレビュー生成と出力ボタンの有効化を行う。
   * 失敗時はエラー表示し、ステータスを失敗にする。
   */
  const buildBasePhoto = useCallback(async (sourceUrl: string) => {
    try {
      const canvas = await createBasePhotoFromImage(sourceUrl);
      baseCanvasRef.current = canvas;

      // After プレビュー用に基準写真を ObjectURL 化
      const previewBlob = await exportBaseFromBase(canvas);
      const url = URL.createObjectURL(previewBlob);
      setAfterUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return url;
      });

      setExports({
        base: "ready",
        tesatsu: "ready",
        yotsugiri: "ready",
        monitor169: "ready",
      });
      setBaseReady(true);
    } catch (e) {
      baseCanvasRef.current = null;
      setBaseReady(false);
      setExports(null);
      setError(
        e instanceof Error
          ? e.message
          : "基準写真の作成に失敗しました。",
      );
      setStatusState({ status: "failed", progress: 100, label: "失敗" });
    }
  }, []);

  /**
   * 処理開始（モック進行 → 完了時に基準写真を実生成）。
   * 解析中 → 基準写真作成中 → 品質チェック中 → 完了。
   * 画像処理本体（AI 等）は使わず、完了時にブラウザ内 Canvas で基準写真のみ作成する。
   */
  const handleStart = useCallback(() => {
    if (!previewUrl) {
      setError("先に写真をアップロードしてください。");
      return;
    }
    if (isProcessing) {
      return;
    }
    clearTimers();
    setError(null);
    setExports(null);
    setBaseReady(false);
    baseCanvasRef.current = null;
    setAfterUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });

    let cumulativeDelay = 0;
    IEI_PHOTO_MOCK_STEPS.forEach((step) => {
      const timer = setTimeout(() => {
        setStatusState({
          status: step.status,
          progress: step.progress,
          label: step.label,
        });
        if (step.status === "completed") {
          void buildBasePhoto(previewUrl);
        }
      }, cumulativeDelay);
      timersRef.current.push(timer);
      cumulativeDelay += step.delayMs;
    });
  }, [previewUrl, isProcessing, clearTimers, buildBasePhoto]);

  /**
   * 出力（基準写真から各サイズを派生させてダウンロード）。
   * すべてブラウザ内 Canvas 処理。AI は不使用。
   */
  const handleExport = useCallback(
    async (kind: keyof IeiPhotoExports) => {
      const base = baseCanvasRef.current;
      if (!base) {
        setError(
          "出力できる基準写真がありません。写真をアップロードして処理を完了してください。",
        );
        return;
      }
      setExporting(true);
      setError(null);
      try {
        const blob = await exportFromBaseByKind(base, kind);
        downloadBlob(blob, filenameForKind(kind));
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "出力に失敗しました。",
        );
      } finally {
        setExporting(false);
      }
    },
    [],
  );

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-8">
        <p className="text-sm font-semibold text-amber-700">遺影写真</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">
          遺影写真作成
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          元写真をもとに、遺影写真用の基準写真を作成します。
        </p>
      </header>

      {/* 注意書き */}
      <section className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-4 sm:p-5">
        <p className="text-sm font-semibold text-amber-800">ご利用にあたっての注意</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
          {IEI_PHOTO_NOTICES.map((notice) => (
            <li key={notice}>{notice}</li>
          ))}
        </ul>
      </section>

      {/* エラー表示 */}
      {error && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm font-semibold text-rose-700"
        >
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="grid gap-6">
          <IeiPhotoUploader
            previewUrl={previewUrl}
            fileName={fileName}
            onSelectFile={handleSelectFile}
            onClear={handleClear}
            disabled={isProcessing}
          />
          <IeiPhotoModeSelector
            selectedMode={mode}
            onSelect={setMode}
            disabled={isProcessing}
          />

          {/* 処理開始ボタン */}
          <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
            <button
              type="button"
              onClick={handleStart}
              disabled={!previewUrl || isProcessing}
              className="w-full rounded-lg bg-amber-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing ? "処理中…" : "処理を開始する"}
            </button>
            {!previewUrl && (
              <p className="mt-2 text-center text-xs text-slate-500">
                先に写真をアップロードしてください
              </p>
            )}
          </div>

          <IeiPhotoStatus
            status={statusState.status}
            progress={statusState.progress}
            label={statusState.label}
          />
        </div>

        <div className="grid gap-6">
          <IeiPhotoPreview
            beforeUrl={previewUrl}
            afterUrl={afterUrl}
            completed={isCompleted}
          />
          <IeiPhotoQualityCheck
            items={
              isCompleted && baseReady
                ? COMPLETED_QUALITY_CHECKS
                : INITIAL_QUALITY_CHECKS
            }
          />
          <IeiPhotoExportButtons
            exports={exports}
            enabled={isCompleted && baseReady && !exporting}
            onExport={handleExport}
          />
        </div>
      </div>
    </main>
  );
}
