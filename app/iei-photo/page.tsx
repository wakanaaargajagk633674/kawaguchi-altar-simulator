"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import IeiPhotoUploader from "@/components/iei-photo/IeiPhotoUploader";
import IeiPhotoModeSelector from "@/components/iei-photo/IeiPhotoModeSelector";
import IeiPhotoAdjustmentPanel from "@/components/iei-photo/IeiPhotoAdjustmentPanel";
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
  IEI_PHOTO_DEFAULT_ADJUSTMENTS,
  type IeiPhotoAdjustmentKey,
} from "@/lib/iei-photo/adjustments";
import {
  loadImageElement,
  renderBasePhotoCanvas,
  exportBaseFromBase,
  exportFromBaseByKind,
  filenameForKind,
  downloadBlob,
} from "@/lib/iei-photo/client-export";
import type {
  IeiPhotoAdjustments,
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
 * 実判定は行わず、ブラウザ内 Canvas で「元写真ピクセルのトリミング・補正のみ」を
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

const READY_EXPORTS: IeiPhotoExports = {
  base: "ready",
  tesatsu: "ready",
  yotsugiri: "ready",
  monitor169: "ready",
};

type StatusState = {
  status: IeiPhotoJobStatus | "idle";
  progress: number;
  label: string;
};

const IDLE_STATUS: StatusState = { status: "idle", progress: 0, label: "" };

/** プレビュー再生成の debounce（ms） */
const PREVIEW_DEBOUNCE_MS = 250;

export default function IeiPhotoPage() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [afterUrl, setAfterUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [mode, setMode] = useState<IeiPhotoMode>(IEI_PHOTO_DEFAULT_MODE);
  const [adjustments, setAdjustments] = useState<IeiPhotoAdjustments>(
    IEI_PHOTO_DEFAULT_ADJUSTMENTS,
  );
  const [statusState, setStatusState] = useState<StatusState>(IDLE_STATUS);
  const [exports, setExports] = useState<IeiPhotoExports | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);
  const [hasBase, setHasBase] = useState<boolean>(false);
  const [imgLoaded, setImgLoaded] = useState<boolean>(false);

  // 読み込み済み元画像（プレビュー・基準写真生成の元データ）
  const imgRef = useRef<HTMLImageElement | null>(null);
  // 基準写真（親データ）。各サイズはここから派生させる。
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // ObjectURL の最新値を保持し、アンマウント時に解放するための ref
  const previewUrlRef = useRef<string | null>(null);
  const afterUrlRef = useRef<string | null>(null);
  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);
  useEffect(() => {
    afterUrlRef.current = afterUrl;
  }, [afterUrl]);

  // 進行中タイマーの管理
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

  // アンマウント時のみ ObjectURL とタイマーを解放（ref 経由で最新値を参照）
  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      if (afterUrlRef.current) {
        URL.revokeObjectURL(afterUrlRef.current);
      }
    };
  }, []);

  const replaceAfterUrl = useCallback((next: string | null) => {
    setAfterUrl((prev) => {
      if (prev && prev !== next) {
        URL.revokeObjectURL(prev);
      }
      return next;
    });
  }, []);

  const resetResults = useCallback(() => {
    setExports(null);
    setStatusState(IDLE_STATUS);
    setError(null);
    setHasBase(false);
    baseCanvasRef.current = null;
    replaceAfterUrl(null);
  }, [replaceAfterUrl]);

  const handleSelectFile = useCallback(
    (file: File) => {
      clearTimers();
      resetResults();
      setAdjustments(IEI_PHOTO_DEFAULT_ADJUSTMENTS);
      setImgLoaded(false);
      imgRef.current = null;

      const url = URL.createObjectURL(file);
      setPreviewUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return url;
      });
      setFileName(file.name);

      // 元画像を一度だけ読み込み、以降のプレビュー/出力で再利用する。
      loadImageElement(url)
        .then((img) => {
          imgRef.current = img;
          setImgLoaded(true);
        })
        .catch(() => {
          setError("画像の読み込みに失敗しました。別の画像でお試しください。");
        });
    },
    [clearTimers, resetResults],
  );

  const handleClear = useCallback(() => {
    clearTimers();
    resetResults();
    setAdjustments(IEI_PHOTO_DEFAULT_ADJUSTMENTS);
    setFileName(null);
    setImgLoaded(false);
    imgRef.current = null;
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

  const handleAdjustmentChange = useCallback(
    (key: IeiPhotoAdjustmentKey, value: number) => {
      setAdjustments((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleResetAdjustments = useCallback(() => {
    setAdjustments(IEI_PHOTO_DEFAULT_ADJUSTMENTS);
  }, []);

  // 補正値の変更に応じて基準写真プレビューを再生成（debounce）。
  // 処理開始前でも補正後の基準写真イメージを確認できる。
  useEffect(() => {
    const img = imgRef.current;
    if (!img || !imgLoaded) {
      return;
    }
    let cancelled = false;
    const handle = setTimeout(() => {
      try {
        const canvas = renderBasePhotoCanvas(img, adjustments);
        if (cancelled) {
          return;
        }
        baseCanvasRef.current = canvas;
        setHasBase(true);
        setError(null);
        exportBaseFromBase(canvas)
          .then((blob) => {
            if (cancelled) {
              return;
            }
            replaceAfterUrl(URL.createObjectURL(blob));
          })
          .catch(() => {
            if (!cancelled) {
              setError("プレビューの生成に失敗しました。");
            }
          });
      } catch (e) {
        if (!cancelled) {
          baseCanvasRef.current = null;
          setHasBase(false);
          setError(
            e instanceof Error ? e.message : "基準写真の作成に失敗しました。",
          );
        }
      }
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [adjustments, imgLoaded, replaceAfterUrl]);

  /**
   * 処理開始（モック進行 → 完了時に出力を有効化）。
   * 解析中 → 基準写真作成中 → 品質チェック中 → 完了。
   * 基準写真は補正プレビューで常に最新化されているため、完了時はそれを採用する。
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

    let cumulativeDelay = 0;
    IEI_PHOTO_MOCK_STEPS.forEach((step) => {
      const timer = setTimeout(() => {
        setStatusState({
          status: step.status,
          progress: step.progress,
          label: step.label,
        });
        if (step.status === "completed") {
          // 補正プレビューで生成済みの基準写真を採用。万一無ければ再生成を試みる。
          if (!baseCanvasRef.current && imgRef.current) {
            try {
              baseCanvasRef.current = renderBasePhotoCanvas(
                imgRef.current,
                adjustments,
              );
              setHasBase(true);
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : "基準写真の作成に失敗しました。",
              );
            }
          }
          if (baseCanvasRef.current) {
            setExports(READY_EXPORTS);
          } else {
            setStatusState({ status: "failed", progress: 100, label: "失敗" });
          }
        }
      }, cumulativeDelay);
      timersRef.current.push(timer);
      cumulativeDelay += step.delayMs;
    });
  }, [previewUrl, isProcessing, clearTimers, adjustments]);

  /**
   * 出力（調整後の基準写真を親データに各サイズを派生してダウンロード）。
   * すべてブラウザ内 Canvas 処理。AI は不使用。
   */
  const handleExport = useCallback(async (kind: keyof IeiPhotoExports) => {
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
      setError(e instanceof Error ? e.message : "出力に失敗しました。");
    } finally {
      setExporting(false);
    }
  }, []);

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
          <IeiPhotoAdjustmentPanel
            adjustments={adjustments}
            onChange={handleAdjustmentChange}
            onReset={handleResetAdjustments}
            disabled={isProcessing || !imgLoaded}
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
              isCompleted && hasBase
                ? COMPLETED_QUALITY_CHECKS
                : INITIAL_QUALITY_CHECKS
            }
          />
          <IeiPhotoExportButtons
            exports={exports}
            enabled={isCompleted && hasBase && !exporting}
            onExport={handleExport}
          />
        </div>
      </div>
    </main>
  );
}
