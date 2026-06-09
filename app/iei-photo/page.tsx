"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import IeiPhotoUploader from "@/components/iei-photo/IeiPhotoUploader";
import IeiPhotoModeSelector from "@/components/iei-photo/IeiPhotoModeSelector";
import IeiPhotoBackgroundPanel from "@/components/iei-photo/IeiPhotoBackgroundPanel";
import IeiPhotoAdjustmentPanel from "@/components/iei-photo/IeiPhotoAdjustmentPanel";
import IeiPhotoPreview from "@/components/iei-photo/IeiPhotoPreview";
import IeiPhotoStatus from "@/components/iei-photo/IeiPhotoStatus";
import IeiPhotoStepIndicator from "@/components/iei-photo/IeiPhotoStepIndicator";
import IeiPhotoNextActions from "@/components/iei-photo/IeiPhotoNextActions";
import IeiPhotoQualityCheck from "@/components/iei-photo/IeiPhotoQualityCheck";
import IeiPhotoExportButtons from "@/components/iei-photo/IeiPhotoExportButtons";
import {
  IEI_PHOTO_DEFAULT_MODE,
  IEI_PHOTO_NOTICES,
} from "@/lib/iei-photo/image-rules";
import { IEI_PHOTO_MOCK_STEPS } from "@/lib/iei-photo/mock-job";
import { IEI_PHOTO_EXPORT_ORDER } from "@/lib/iei-photo/export-sizes";
import {
  getAiGenerationProvider,
  IEI_PHOTO_MODE_TO_ROLE,
} from "@/lib/iei-photo/ai-generation-provider";
import { requestBackgroundRemoval } from "@/lib/iei-photo/background-client";
import { IEI_PHOTO_DEFAULT_BACKGROUND } from "@/lib/iei-photo/backgrounds";
import {
  IEI_PHOTO_DEFAULT_ADJUSTMENTS,
  type IeiPhotoAdjustmentKey,
} from "@/lib/iei-photo/adjustments";
import {
  loadImageElement,
  renderBasePhotoCanvas,
  exportFromBaseByKind,
  filenameForKind,
  downloadBlob,
} from "@/lib/iei-photo/client-export";
import type {
  IeiPhotoAdjustments,
  IeiPhotoBackgroundSettings,
  IeiPhotoBackgroundType,
  IeiPhotoExportKind,
  IeiPhotoExports,
  IeiPhotoJobStatus,
  IeiPhotoMode,
  IeiPhotoQualityCheckItem,
} from "@/lib/iei-photo/types";

/** 生成前の品質チェック項目（未判定） */
const INITIAL_QUALITY_CHECKS: IeiPhotoQualityCheckItem[] = [
  {
    key: "identityLikeness",
    label: "本人らしさチェック",
    status: "pending",
    description: "生成後も本人らしさが保たれているかを確認します。",
  },
  {
    key: "featureRetention",
    label: "顔・髪・服の保持",
    status: "pending",
    description: "顔・髪・服の特徴が保持されているかを確認します。",
  },
  {
    key: "aiArtifact",
    label: "AIっぽさチェック",
    status: "pending",
    description: "不自然なAI特有の質感や破綻が出ていないかを確認します。",
  },
  {
    key: "exposureShadow",
    label: "白飛び・影チェック",
    status: "pending",
    description: "白飛びや強い影が残っていないかを確認します。",
  },
  {
    key: "backgroundNaturalness",
    label: "背景自然さチェック",
    status: "pending",
    description: "背景が自然に見えるかを確認します。",
  },
];

/**
 * 基準写真が用意できた後の品質チェック表示。
 * 実判定は未実装。標準生成は元写真ピクセルを優先し、人物を別人化させない。
 */
const READY_QUALITY_CHECKS: IeiPhotoQualityCheckItem[] = [
  {
    key: "identityLikeness",
    label: "本人らしさチェック",
    status: "pending",
    description: "AIによる本人らしさの自動判定は行っていません。",
    note: "未実装",
  },
  {
    key: "featureRetention",
    label: "顔・髪・服の保持",
    status: "pass",
    description: "標準生成では人物を別人化させず、元写真の情報を優先しています。",
    note: "標準生成では元写真ピクセルを優先",
  },
  {
    key: "aiArtifact",
    label: "AIっぽさチェック",
    status: "pending",
    description: "AIっぽさの自動判定は行っていません。",
    note: "未実装",
  },
  {
    key: "exposureShadow",
    label: "白飛び・影チェック",
    status: "pending",
    description: "白飛び・影の自動判定は行っていません。",
    note: "未実装",
  },
  {
    key: "backgroundNaturalness",
    label: "背景自然さチェック",
    status: "pending",
    description: "背景処理APIが未接続のため、背景自然さの自動判定は行っていません。",
    note: "未実装 / 背景処理API未接続",
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
const PREVIEW_DEBOUNCE_MS = 200;
/** 一括ダウンロード時のファイル間の間隔（ms） */
const BULK_DOWNLOAD_GAP_MS = 400;

export default function IeiPhotoPage() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [mode, setMode] = useState<IeiPhotoMode>(IEI_PHOTO_DEFAULT_MODE);
  const [adjustments, setAdjustments] = useState<IeiPhotoAdjustments>(
    IEI_PHOTO_DEFAULT_ADJUSTMENTS,
  );
  const [previewKind, setPreviewKind] = useState<IeiPhotoExportKind>("base");
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [background, setBackground] = useState<IeiPhotoBackgroundSettings>(
    IEI_PHOTO_DEFAULT_BACKGROUND,
  );
  // 背景切り抜き（透過PNG）の状態
  const [cutoutUrl, setCutoutUrl] = useState<string | null>(null);
  const [hasCutout, setHasCutout] = useState<boolean>(false);
  const [removingBg, setRemovingBg] = useState<boolean>(false);
  const [statusState, setStatusState] = useState<StatusState>(IDLE_STATUS);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);
  const [hasBase, setHasBase] = useState<boolean>(false);
  const [hasExported, setHasExported] = useState<boolean>(false);
  const [imgLoaded, setImgLoaded] = useState<boolean>(false);

  // 元画像 File / 読み込み済み元画像 / 切り抜き済み画像 / 基準写真（親データ）
  const fileRef = useRef<File | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const cutoutImgRef = useRef<HTMLImageElement | null>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // 「手動で微調整する」でスクロール移動する先
  const adjustmentRef = useRef<HTMLDivElement | null>(null);

  // ObjectURL の最新値を保持し、アンマウント時に解放するための ref
  const previewUrlRef = useRef<string | null>(null);
  const outputUrlRef = useRef<string | null>(null);
  const cutoutUrlRef = useRef<string | null>(null);
  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);
  useEffect(() => {
    outputUrlRef.current = outputUrl;
  }, [outputUrl]);
  useEffect(() => {
    cutoutUrlRef.current = cutoutUrl;
  }, [cutoutUrl]);

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
      if (outputUrlRef.current) {
        URL.revokeObjectURL(outputUrlRef.current);
      }
      if (cutoutUrlRef.current) {
        URL.revokeObjectURL(cutoutUrlRef.current);
      }
    };
  }, []);

  const replaceOutputUrl = useCallback((next: string | null) => {
    setOutputUrl((prev) => {
      if (prev && prev !== next) {
        URL.revokeObjectURL(prev);
      }
      return next;
    });
  }, []);

  /**
   * 補正値・選択中サイズで基準写真を作り直し、プレビュー画像を生成する。
   * 現在のMVPでは人物再生成は行わず、ブラウザ内 Canvas で基準写真を生成する
   * （AI標準生成の仮実装）。
   */
  const generatePreview = useCallback(
    async (
      adj: IeiPhotoAdjustments,
      kind: IeiPhotoExportKind,
      bg: IeiPhotoBackgroundSettings,
    ) => {
      // 切り抜き済み透過PNGがあればそれを優先（背景と合成）。無ければ元画像。
      const source = cutoutImgRef.current ?? imgRef.current;
      if (!source) {
        return;
      }
      try {
        const canvas = renderBasePhotoCanvas(source, adj, bg);
        baseCanvasRef.current = canvas;
        setHasBase(true);
        setError(null);
        const blob = await exportFromBaseByKind(canvas, kind, bg);
        replaceOutputUrl(URL.createObjectURL(blob));
      } catch (e) {
        baseCanvasRef.current = null;
        setHasBase(false);
        setError(
          e instanceof Error ? e.message : "基準写真の生成に失敗しました。",
        );
      }
    },
    [replaceOutputUrl],
  );

  const replaceCutoutUrl = useCallback((next: string | null) => {
    setCutoutUrl((prev) => {
      if (prev && prev !== next) {
        URL.revokeObjectURL(prev);
      }
      return next;
    });
  }, []);

  const resetResults = useCallback(() => {
    setStatusState(IDLE_STATUS);
    setError(null);
    setInfo(null);
    setHasBase(false);
    setHasExported(false);
    setHasCutout(false);
    setRemovingBg(false);
    baseCanvasRef.current = null;
    cutoutImgRef.current = null;
    replaceOutputUrl(null);
    replaceCutoutUrl(null);
  }, [replaceOutputUrl, replaceCutoutUrl]);

  const handleSelectFile = useCallback(
    (file: File) => {
      clearTimers();
      resetResults();
      setAdjustments(IEI_PHOTO_DEFAULT_ADJUSTMENTS);
      setImgLoaded(false);
      imgRef.current = null;
      fileRef.current = file;

      const url = URL.createObjectURL(file);
      setPreviewUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return url;
      });
      setFileName(file.name);

      loadImageElement(url)
        .then((img) => {
          imgRef.current = img;
          setImgLoaded(true);
          void generatePreview(
            IEI_PHOTO_DEFAULT_ADJUSTMENTS,
            previewKind,
            background,
          );
        })
        .catch(() => {
          setError("画像の読み込みに失敗しました。別の画像でお試しください。");
        });
    },
    [clearTimers, resetResults, generatePreview, previewKind, background],
  );

  const handleClear = useCallback(() => {
    clearTimers();
    resetResults();
    setAdjustments(IEI_PHOTO_DEFAULT_ADJUSTMENTS);
    setFileName(null);
    setImgLoaded(false);
    imgRef.current = null;
    fileRef.current = null;
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

  // 現在の処理ステップ（1〜5）
  const currentStep = !previewUrl
    ? 1
    : isProcessing
      ? 3
      : isCompleted
        ? hasExported
          ? 5
          : 4
        : 2;

  const handleAdjustmentChange = useCallback(
    (key: IeiPhotoAdjustmentKey, value: number) => {
      setAdjustments((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleResetAdjustments = useCallback(() => {
    setAdjustments(IEI_PHOTO_DEFAULT_ADJUSTMENTS);
  }, []);

  // 補正値・プレビュー種類の変更に応じてプレビューを再生成（debounce）。
  useEffect(() => {
    if (!imgLoaded) {
      return;
    }
    const handle = setTimeout(() => {
      void generatePreview(adjustments, previewKind, background);
    }, PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [adjustments, previewKind, background, imgLoaded, generatePreview]);

  /**
   * 「AI遺影写真を生成する」。
   * 進行表示: 写真を解析中 → AI生成設定を確認中 → 基準写真を生成中 → 品質を確認中 → 完了。
   * 実APIは未接続。AI標準生成は Canvas での基準写真生成に委譲する（provider 経由で役割を判定）。
   */
  const handleStart = useCallback(async () => {
    if (!previewUrl) {
      setError("先に写真をアップロードしてください。");
      return;
    }
    if (isProcessing) {
      return;
    }
    clearTimers();
    setError(null);
    setInfo(null);

    // AI処理プロバイダー（現状 mock）に役割を問い合わせる。
    const role = IEI_PHOTO_MODE_TO_ROLE[mode];
    const provider = getAiGenerationProvider();
    const result = await provider.generate({ role });
    if (!result.handledByCanvas) {
      // 高度AI補正 / AI肖像生成は未接続。今回は AI標準生成（Canvas）で生成する。
      setInfo(`${result.message}（今回は AI標準生成（Canvas）で生成します）`);
    }

    let cumulativeDelay = 0;
    IEI_PHOTO_MOCK_STEPS.forEach((step) => {
      const timer = setTimeout(() => {
        setStatusState({
          status: step.status,
          progress: step.progress,
          label: step.label,
        });
      }, cumulativeDelay);
      timersRef.current.push(timer);
      cumulativeDelay += step.delayMs;
    });
  }, [previewUrl, isProcessing, clearTimers, mode]);

  /** 出力（調整後の基準写真を親データに各サイズを派生してダウンロード）。AI不使用・ガイド非焼き込み。 */
  const handleExport = useCallback(async (kind: keyof IeiPhotoExports) => {
    const base = baseCanvasRef.current;
    if (!base) {
      setError("出力できる基準写真がありません。写真をアップロードしてください。");
      return;
    }
    setExporting(true);
    setError(null);
    try {
      const blob = await exportFromBaseByKind(base, kind, background);
      downloadBlob(blob, filenameForKind(kind));
      setHasExported(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "出力に失敗しました。");
    } finally {
      setExporting(false);
    }
  }, [background]);

  /** すべての出力サイズを順番にダウンロードする。 */
  const handleExportAll = useCallback(async () => {
    const base = baseCanvasRef.current;
    if (!base) {
      setError("出力できる基準写真がありません。写真をアップロードしてください。");
      return;
    }
    setExporting(true);
    setError(null);
    try {
      for (const kind of IEI_PHOTO_EXPORT_ORDER) {
        const blob = await exportFromBaseByKind(base, kind, background);
        downloadBlob(blob, filenameForKind(kind));
        await new Promise((resolve) =>
          setTimeout(resolve, BULK_DOWNLOAD_GAP_MS),
        );
      }
      setHasExported(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "一括出力に失敗しました。");
    } finally {
      setExporting(false);
    }
  }, [background]);

  const handleAdjust = useCallback(() => {
    adjustmentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const handleAdvancedAi = useCallback(() => {
    setInfo("高度AI補正は次の開発ステップで外部画像処理APIと接続します。");
  }, []);

  const handleBackgroundType = useCallback((type: IeiPhotoBackgroundType) => {
    setBackground({ type });
  }, []);

  /**
   * 背景切り抜き（自前 rembg ワーカー経由）。
   * 元File を /api/iei-photo/remove-background へ送り、透過PNGを取得。
   * 以後の基準写真生成は切り抜き画像を優先し、選択背景と Canvas 合成する。
   */
  const handleRemoveBackground = useCallback(async () => {
    const file = fileRef.current;
    if (!file) {
      setError("先に写真をアップロードしてください。");
      return;
    }
    setRemovingBg(true);
    setError(null);
    setInfo("背景を切り抜き中…");

    let pendingUrl: string | null = null;
    try {
      const blob = await requestBackgroundRemoval(file);
      const url = URL.createObjectURL(blob);
      pendingUrl = url;
      const img = await loadImageElement(url);
      cutoutImgRef.current = img;
      replaceCutoutUrl(url);
      pendingUrl = null;
      setHasCutout(true);
      setInfo("背景切り抜き済み。選択した背景と合成して出力します。");
      void generatePreview(adjustments, previewKind, background);
    } catch (e) {
      // 失敗時は古い切り抜き画像を残さない。
      if (pendingUrl) {
        URL.revokeObjectURL(pendingUrl);
      }
      cutoutImgRef.current = null;
      replaceCutoutUrl(null);
      setHasCutout(false);
      setInfo(null);
      setError(e instanceof Error ? e.message : "背景切り抜きに失敗しました。");
      // 元画像でのプレビューに戻す。
      void generatePreview(adjustments, previewKind, background);
    } finally {
      setRemovingBg(false);
    }
  }, [adjustments, previewKind, background, generatePreview, replaceCutoutUrl]);

  const canExport = hasBase && !exporting;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6">
        <p className="text-sm font-semibold text-amber-700">AI遺影写真</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">
          AI遺影写真生成
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          元写真をもとに、AIを活用して遺影写真用の基準写真を生成します。標準生成では本人らしさを守るため、人物の特徴をできるだけ保持しながら背景・明るさ・構図を整えます。
        </p>
      </header>

      {/* 処理ステップ表示 */}
      <div className="mb-6">
        <IeiPhotoStepIndicator currentStep={currentStep} />
      </div>

      {/* 注意書き */}
      <section className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 sm:p-5">
        <p className="text-sm font-semibold text-amber-800">ご利用にあたっての注意</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
          {IEI_PHOTO_NOTICES.map((notice) => (
            <li key={notice}>{notice}</li>
          ))}
        </ul>
      </section>

      {/* 情報メッセージ */}
      {info && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          {info}
        </div>
      )}

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
          <IeiPhotoBackgroundPanel
            settings={background}
            onChangeType={handleBackgroundType}
            onRemoveBackground={handleRemoveBackground}
            removing={removingBg}
            hasCutout={hasCutout}
            disabled={isProcessing || !imgLoaded}
          />
          <div ref={adjustmentRef}>
            <IeiPhotoAdjustmentPanel
              adjustments={adjustments}
              onChange={handleAdjustmentChange}
              onReset={handleResetAdjustments}
              disabled={!imgLoaded}
            />
          </div>

          {/* AI生成ボタン */}
          <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
            <button
              type="button"
              onClick={handleStart}
              disabled={!previewUrl || isProcessing}
              className="w-full rounded-lg bg-amber-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing ? "生成中…" : "AI遺影写真を生成する"}
            </button>
            {!previewUrl && (
              <p className="mt-2 text-center text-xs text-slate-500">
                先に写真をアップロードしてください
              </p>
            )}
            {/* 開発用メモ（小さな注意書き） */}
            <p className="mt-3 rounded-md bg-stone-50 px-3 py-2 text-[11px] leading-5 text-slate-500">
              開発メモ: 現在のMVPでは、人物再生成は行わず、ブラウザ内Canvasで基準写真を生成しています。外部AI処理は次の開発ステップで接続します。
            </p>
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
            outputUrl={outputUrl}
            previewKind={previewKind}
            onPreviewKindChange={setPreviewKind}
            showGuides={showGuides}
            onToggleGuides={setShowGuides}
            completed={hasBase}
          />

          {/* 生成完了後の次アクション */}
          {isCompleted && hasBase && (
            <IeiPhotoNextActions
              onDownloadAll={handleExportAll}
              onAdjust={handleAdjust}
              onAdvancedAi={handleAdvancedAi}
              disabled={exporting}
            />
          )}

          <IeiPhotoQualityCheck
            items={hasBase ? READY_QUALITY_CHECKS : INITIAL_QUALITY_CHECKS}
          />
          <IeiPhotoExportButtons
            exports={hasBase ? READY_EXPORTS : null}
            enabled={canExport}
            onExport={handleExport}
            onExportAll={handleExportAll}
          />
        </div>
      </div>
    </main>
  );
}
