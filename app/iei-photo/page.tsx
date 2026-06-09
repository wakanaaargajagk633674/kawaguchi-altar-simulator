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
import type {
  IeiPhotoExports,
  IeiPhotoJobStatus,
  IeiPhotoMode,
  IeiPhotoQualityCheckItem,
} from "@/lib/iei-photo/types";

/** 品質チェック項目の初期表示（MVP では未判定） */
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

type StatusState = {
  status: IeiPhotoJobStatus | "idle";
  progress: number;
  label: string;
};

const IDLE_STATUS: StatusState = { status: "idle", progress: 0, label: "" };

export default function IeiPhotoPage() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [mode, setMode] = useState<IeiPhotoMode>(IEI_PHOTO_DEFAULT_MODE);
  const [statusState, setStatusState] = useState<StatusState>(IDLE_STATUS);
  const [exports, setExports] = useState<IeiPhotoExports | null>(null);

  // 進行中タイマーの管理（アンマウント時にクリア）
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

  // オブジェクト URL の解放
  useEffect(() => {
    return () => {
      clearTimers();
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl, clearTimers]);

  const handleSelectFile = useCallback(
    (file: File) => {
      clearTimers();
      setStatusState(IDLE_STATUS);
      setExports(null);
      setPreviewUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return URL.createObjectURL(file);
      });
      setFileName(file.name);
    },
    [clearTimers],
  );

  const handleClear = useCallback(() => {
    clearTimers();
    setStatusState(IDLE_STATUS);
    setExports(null);
    setFileName(null);
    setPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
  }, [clearTimers]);

  const isProcessing =
    statusState.status !== "idle" && statusState.status !== "completed";
  const isCompleted = statusState.status === "completed";

  /**
   * 処理開始（モック動作）。
   * 実画像処理は行わず、解析中 → 基準写真作成中 → 完了 と擬似的に進行させる。
   * 実処理は将来 lib/iei-photo/mock-job.ts 経由で外部サービスに差し替える。
   */
  const handleStart = useCallback(() => {
    if (!previewUrl || isProcessing) {
      return;
    }
    clearTimers();
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
          // MVP: 実画像が無いため出力はすべて null
          setExports({
            base: null,
            tesatsu: null,
            yotsugiri: null,
            monitor169: null,
          });
        }
      }, cumulativeDelay);
      timersRef.current.push(timer);
      cumulativeDelay += step.delayMs;
    });
  }, [previewUrl, isProcessing, clearTimers]);

  const handleExport = useCallback((kind: keyof IeiPhotoExports) => {
    // MVP: 実出力は未実装。将来はここで /api/iei-photo/export を呼び出してダウンロードする。
    window.alert(
      `「${kind}」の出力はまだ実装されていません。基準写真の生成処理を実装後に有効化されます。`,
    );
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
            afterUrl={null}
            completed={isCompleted}
          />
          <IeiPhotoQualityCheck items={INITIAL_QUALITY_CHECKS} />
          <IeiPhotoExportButtons
            exports={exports}
            enabled={isCompleted}
            onExport={handleExport}
          />
        </div>
      </div>
    </main>
  );
}
