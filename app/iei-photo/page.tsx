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
import IeiPhotoAiPanel from "@/components/iei-photo/IeiPhotoAiPanel";
import {
  IEI_PHOTO_DEFAULT_MODE,
  IEI_PHOTO_NOTICES,
} from "@/lib/iei-photo/image-rules";
import { IEI_PHOTO_MOCK_STEPS } from "@/lib/iei-photo/mock-job";
import {
  getAiGenerationProvider,
  IEI_PHOTO_MODE_TO_ROLE,
} from "@/lib/iei-photo/ai-generation-provider";
import { requestBackgroundRemoval } from "@/lib/iei-photo/background-client";
import { requestAiImage } from "@/lib/iei-photo/ai-image-client";
import { IEI_PHOTO_DEFAULT_BACKGROUND } from "@/lib/iei-photo/backgrounds";
import {
  IEI_PHOTO_DEFAULT_ADJUSTMENTS,
  applyAutoCorrect,
  type IeiPhotoAdjustmentKey,
} from "@/lib/iei-photo/adjustments";
import {
  loadImageElement,
  renderBasePhotoCanvas,
  resolveBackgroundImage,
  exportFromBaseByKind,
  exportAllZipFromBase,
  filenameForKind,
  downloadBlob,
} from "@/lib/iei-photo/client-export";
import type {
  IeiPhotoAdjustments,
  IeiPhotoAiImageMode,
  IeiPhotoAiResultMode,
  IeiPhotoBackgroundSettings,
  IeiPhotoBackgroundType,
  IeiPhotoClothingStyle,
  IeiPhotoExportKind,
  IeiPhotoExports,
  IeiPhotoGender,
  IeiPhotoJobStatus,
  IeiPhotoMode,
  IeiPhotoPose,
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

export default function IeiPhotoPage() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [mode, setMode] = useState<IeiPhotoMode>(IEI_PHOTO_DEFAULT_MODE);
  const [adjustments, setAdjustments] = useState<IeiPhotoAdjustments>(
    IEI_PHOTO_DEFAULT_ADJUSTMENTS,
  );
  const [autoCorrect, setAutoCorrect] = useState<boolean>(false);
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
  // AIモード（高度AI補正 / AI肖像生成 / AIに全てお任せ）の状態
  const [clothingStyle, setClothingStyle] =
    useState<IeiPhotoClothingStyle>("none");
  const [pose, setPose] = useState<IeiPhotoPose>("none");
  const [aiResultMode, setAiResultMode] = useState<IeiPhotoAiResultMode>(null);
  const [allowPortrait, setAllowPortrait] = useState<boolean>(false);
  const [allowAuto, setAllowAuto] = useState<boolean>(false);
  const [aiProcessing, setAiProcessing] = useState<boolean>(false);
  const [aiEnhancedUrl, setAiEnhancedUrl] = useState<string | null>(null);

  // 元画像 File / 読み込み済み元画像 / 切り抜き済み画像 / 基準写真（親データ）
  const fileRef = useRef<File | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const cutoutImgRef = useRef<HTMLImageElement | null>(null);
  // AI結果画像（あれば最優先の親データ）
  const aiEnhancedImgRef = useRef<HTMLImageElement | null>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // 「手動で微調整する」でスクロール移動する先
  const adjustmentRef = useRef<HTMLDivElement | null>(null);
  // 切り抜き・生成の完了時にプレビュー（元画像＋切り抜き画像）へ移動する先
  const previewRef = useRef<HTMLDivElement | null>(null);

  // ObjectURL の最新値を保持し、アンマウント時に解放するための ref
  const previewUrlRef = useRef<string | null>(null);
  const outputUrlRef = useRef<string | null>(null);
  const cutoutUrlRef = useRef<string | null>(null);
  const aiEnhancedUrlRef = useRef<string | null>(null);
  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);
  useEffect(() => {
    outputUrlRef.current = outputUrl;
  }, [outputUrl]);
  useEffect(() => {
    cutoutUrlRef.current = cutoutUrl;
  }, [cutoutUrl]);
  useEffect(() => {
    aiEnhancedUrlRef.current = aiEnhancedUrl;
  }, [aiEnhancedUrl]);

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
      if (aiEnhancedUrlRef.current) {
        URL.revokeObjectURL(aiEnhancedUrlRef.current);
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
      // 親データの優先順位:
      //   1. AI結果画像（高度AI補正 / AI肖像生成 / AIお任せ）
      //   2. 背景切り抜き済み透過PNG（選択背景と合成）
      //   3. 元画像
      const source =
        aiEnhancedImgRef.current ?? cutoutImgRef.current ?? imgRef.current;
      if (!source) {
        return;
      }
      try {
        // 写真背景（縦: 手札/四切）を基準写真に焼き込む。写真系以外は null。
        const bgImage = await resolveBackgroundImage(bg, "vertical");
        const canvas = renderBasePhotoCanvas(source, adj, bg, bgImage);
        baseCanvasRef.current = canvas;
        setHasBase(true);
        setError(null);
        // AI結果があるときは 16:9 余白も雲固定にせず AI画像をぼかして敷く。
        const aiActive = aiEnhancedImgRef.current != null;
        const blob = await exportFromBaseByKind(canvas, kind, bg, {
          monitorFillFromBase: aiActive,
        });
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

  const replaceAiEnhancedUrl = useCallback((next: string | null) => {
    setAiEnhancedUrl((prev) => {
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
    // AI結果も解除する（新しい写真・クリア時）。
    aiEnhancedImgRef.current = null;
    setAiResultMode(null);
    setAiProcessing(false);
    setAllowPortrait(false);
    setAllowAuto(false);
    replaceOutputUrl(null);
    replaceCutoutUrl(null);
    replaceAiEnhancedUrl(null);
  }, [replaceOutputUrl, replaceCutoutUrl, replaceAiEnhancedUrl]);

  const handleSelectFile = useCallback(
    (file: File) => {
      clearTimers();
      resetResults();
      setAdjustments(IEI_PHOTO_DEFAULT_ADJUSTMENTS);
      setAutoCorrect(false);
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
  // AIモード（AI標準以外）。服装選択・お任せ・許可チェックはこのときだけ表示・有効。
  const isAiMode = mode !== "AI_STANDARD";

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

  // 自動補正 ON の場合は手動補正に自動補正を重ねた値を返す。
  const computeEffective = useCallback(
    (adj: IeiPhotoAdjustments): IeiPhotoAdjustments =>
      autoCorrect ? applyAutoCorrect(adj) : adj,
    [autoCorrect],
  );

  const handleResetAdjustments = useCallback(() => {
    setAdjustments(IEI_PHOTO_DEFAULT_ADJUSTMENTS);
    // リセット時は自動補正も解除する。
    setAutoCorrect(false);
  }, []);

  // 補正値・自動補正・プレビュー種類・背景の変更に応じてプレビューを再生成（debounce）。
  useEffect(() => {
    if (!imgLoaded) {
      return;
    }
    const handle = setTimeout(() => {
      void generatePreview(computeEffective(adjustments), previewKind, background);
    }, PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [
    adjustments,
    previewKind,
    background,
    imgLoaded,
    generatePreview,
    computeEffective,
  ]);

  // 生成が完了したら、結果（元画像＋切り抜き画像）へ自動スクロールする
  // （操作ボタンと結果プレビューが離れていても、見るための手動スクロールを不要にする）。
  useEffect(() => {
    if (isCompleted && hasBase) {
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [isCompleted, hasBase]);

  const handleChangeClothing = useCallback((style: IeiPhotoClothingStyle) => {
    setClothingStyle(style);
  }, []);

  const handleChangePose = useCallback((next: IeiPhotoPose) => {
    setPose(next);
  }, []);

  /**
   * AI画像処理（高度AI補正 / AI肖像生成 / AIに全てお任せ）を実行する。
   * 現在の基準写真 Canvas を /api/iei-photo/ai-image へ送り、AI結果画像を
   * 新しい親データ（aiEnhancedImgRef）として反映する。以後の4種出力もこれから派生する。
   * 16:9 はここでは横長生成せず、Canvas 側で中央配置する（出力仕様は不変）。
   */
  const runAiImage = useCallback(
    async (aiMode: IeiPhotoAiImageMode) => {
      const base = baseCanvasRef.current;
      if (!base) {
        setError("先に写真をアップロードして基準写真を作成してください。");
        return;
      }
      if (aiMode === "portrait" && !allowPortrait) {
        setError("AI肖像生成を許可するにチェックしてください。");
        return;
      }
      if (aiMode === "auto" && !allowAuto) {
        setError("AIに全てお任せ生成を許可するにチェックしてください。");
        return;
      }
      const processingLabel =
        aiMode === "advanced"
          ? "AI高度補正中…"
          : aiMode === "portrait"
            ? "AI肖像生成中…"
            : "AIにお任せ生成中…";
      setAiProcessing(true);
      setError(null);
      setInfo(processingLabel);
      setStatusState({
        status: "creating_base",
        progress: 60,
        label: processingLabel,
      });

      let pendingUrl: string | null = null;
      try {
        const blob = await requestAiImage(base, aiMode, clothingStyle, pose);
        const url = URL.createObjectURL(blob);
        pendingUrl = url;
        const img = await loadImageElement(url);
        aiEnhancedImgRef.current = img;
        replaceAiEnhancedUrl(url);
        pendingUrl = null;
        setAiResultMode(aiMode);
        const doneLabel =
          aiMode === "advanced"
            ? "AI高度補正済み。出力に反映します。"
            : aiMode === "portrait"
              ? "AI肖像生成済み。出力に反映します。"
              : "AIお任せ生成済み。出力に反映します。";
        setInfo(doneLabel);
        setStatusState({ status: "completed", progress: 100, label: "完了" });
        await generatePreview(
          computeEffective(adjustments),
          previewKind,
          background,
        );
        requestAnimationFrame(() => {
          previewRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      } catch (e) {
        if (pendingUrl) {
          URL.revokeObjectURL(pendingUrl);
        }
        setInfo(null);
        setStatusState({
          status: "failed",
          progress: 0,
          label: "AI生成に失敗しました",
        });
        setError(e instanceof Error ? e.message : "AI生成に失敗しました。");
      } finally {
        setAiProcessing(false);
      }
    },
    [
      allowPortrait,
      allowAuto,
      clothingStyle,
      pose,
      generatePreview,
      computeEffective,
      adjustments,
      previewKind,
      background,
      replaceAiEnhancedUrl,
    ],
  );

  const handleAuto = useCallback(() => {
    void runAiImage("auto");
  }, [runAiImage]);

  /** AI結果を解除して通常生成（切り抜き or 元画像）に戻す。 */
  const handleClearAiResult = useCallback(() => {
    aiEnhancedImgRef.current = null;
    replaceAiEnhancedUrl(null);
    setAiResultMode(null);
    setInfo("AI結果を解除しました。通常生成に戻しました。");
    void generatePreview(
      computeEffective(adjustments),
      previewKind,
      background,
    );
  }, [
    replaceAiEnhancedUrl,
    generatePreview,
    computeEffective,
    adjustments,
    previewKind,
    background,
  ]);

  /**
   * 「AI遺影写真を生成する」。
   * - AI肖像生成モード: 許可チェック必須で /api/iei-photo/ai-image(mode=portrait) を実行。
   * - それ以外（AI標準 / 高度AI補正）: 進行表示 → Canvas で基準写真を生成（AI標準の仮実装）。
   *   高度AI補正の実AIは「高度AI補正を実行」ボタン（runAiImage("advanced")）で行う。
   */
  const handleStart = useCallback(async () => {
    if (!previewUrl) {
      setError("先に写真をアップロードしてください。");
      return;
    }
    if (isProcessing || aiProcessing) {
      return;
    }
    // AI肖像生成は人物を含めて生成するため、明示許可が必要。
    if (mode === "AI_PORTRAIT") {
      if (!allowPortrait) {
        setError("AI肖像生成を許可するにチェックしてください。");
        return;
      }
      void runAiImage("portrait");
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
  }, [
    previewUrl,
    isProcessing,
    aiProcessing,
    clearTimers,
    mode,
    allowPortrait,
    runAiImage,
  ]);

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
      const blob = await exportFromBaseByKind(base, kind, background, {
        monitorFillFromBase: aiEnhancedImgRef.current != null,
      });
      downloadBlob(blob, filenameForKind(kind));
      setHasExported(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "出力に失敗しました。");
    } finally {
      setExporting(false);
    }
  }, [background]);

  /**
   * すべての出力サイズを1つの ZIP にまとめてダウンロードする。
   * 複数ファイルの連続ダウンロードはブラウザにブロックされやすいため、単一 ZIP にする。
   */
  const handleExportAll = useCallback(async () => {
    const base = baseCanvasRef.current;
    if (!base) {
      setError("出力できる基準写真がありません。写真をアップロードしてください。");
      return;
    }
    setExporting(true);
    setError(null);
    try {
      const zip = await exportAllZipFromBase(base, background, {
        monitorFillFromBase: aiEnhancedImgRef.current != null,
      });
      downloadBlob(zip, "iei-photos.zip");
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
    void runAiImage("advanced");
  }, [runAiImage]);

  const handleBackgroundType = useCallback((type: IeiPhotoBackgroundType) => {
    // 性別（写真背景の選択）は保持したままタイプだけ切り替える。
    setBackground((prev) => ({ ...prev, type }));
  }, []);

  // 性別トグル: 写真背景（男性=ブルー / 女性=ピンク）を自動選択する。
  const handleBackgroundGender = useCallback((gender: IeiPhotoGender) => {
    setBackground({ type: "photo", gender });
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
      void generatePreview(computeEffective(adjustments), previewKind, background);
      // 切り抜き直後、結果（元画像＋切り抜き画像）を見るための手動スクロールを不要にする。
      requestAnimationFrame(() => {
        previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
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
      void generatePreview(computeEffective(adjustments), previewKind, background);
    } finally {
      setRemovingBg(false);
    }
  }, [
    adjustments,
    previewKind,
    background,
    generatePreview,
    replaceCutoutUrl,
    computeEffective,
  ]);

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

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
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
            disabled={isProcessing || aiProcessing}
          />
          {/* AIモード専用: 服装選択・AIに全てお任せ・高度AI補正・許可チェック */}
          {isAiMode && (
            <IeiPhotoAiPanel
              mode={mode}
              clothingStyle={clothingStyle}
              onChangeClothing={handleChangeClothing}
              pose={pose}
              onChangePose={handleChangePose}
              allowPortrait={allowPortrait}
              onTogglePortrait={setAllowPortrait}
              allowAuto={allowAuto}
              onToggleAuto={setAllowAuto}
              onAdvanced={handleAdvancedAi}
              onAuto={handleAuto}
              aiProcessing={aiProcessing}
              aiResultMode={aiResultMode}
              onClearAiResult={handleClearAiResult}
              disabled={isProcessing || !imgLoaded || !hasBase}
            />
          )}
          <IeiPhotoBackgroundPanel
            settings={background}
            onChangeType={handleBackgroundType}
            onChangeGender={handleBackgroundGender}
            onRemoveBackground={handleRemoveBackground}
            removing={removingBg}
            hasCutout={hasCutout}
            disabled={isProcessing || !imgLoaded}
          />
          <IeiPhotoQualityCheck
            items={hasBase ? READY_QUALITY_CHECKS : INITIAL_QUALITY_CHECKS}
          />

          {/* AI生成ボタン */}
          <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
            <button
              type="button"
              onClick={handleStart}
              disabled={!previewUrl || isProcessing || aiProcessing}
              className="w-full rounded-lg bg-amber-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing || aiProcessing
                ? "生成中…"
                : mode === "AI_PORTRAIT"
                  ? "AI肖像生成を実行する"
                  : "AI遺影写真を生成する"}
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

        <div
          ref={previewRef}
          className="grid gap-6 scroll-mt-4 lg:sticky lg:top-4 lg:self-start"
        >
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

          {/* モバイル用の固定ライブプレビュー（補正スライダー操作中も常に見える）。
              デスクトップは右カラムのプレビューが sticky になるため非表示。 */}
          {outputUrl && (
            <div className="sticky top-0 z-20 mb-1 rounded-lg border border-stone-200 bg-white/95 p-2 shadow-sm backdrop-blur lg:hidden">
              <p className="mb-1 text-[11px] font-semibold text-slate-500">
                プレビュー（補正中に反映）
              </p>
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={outputUrl}
                  alt="補正プレビュー"
                  className="max-h-44 w-auto rounded border border-stone-200 object-contain"
                />
              </div>
            </div>
          )}

          <div ref={adjustmentRef}>
            <IeiPhotoAdjustmentPanel
              adjustments={adjustments}
              onChange={handleAdjustmentChange}
              onReset={handleResetAdjustments}
              autoCorrect={autoCorrect}
              onToggleAutoCorrect={setAutoCorrect}
              disabled={!imgLoaded}
            />
          </div>
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
