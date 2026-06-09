/**
 * 遺影写真作成機能の共通型定義（MVP）
 *
 * 注意:
 * - ここはあくまで「土台」であり、実際の画像処理はまだ実装していません。
 * - 画像処理の実行は将来 lib/iei-photo/mock-job.ts の差し替え（外部GPUサーバー等）で行います。
 */

/**
 * AI生成モード。
 * 各モードで「何をして良いか／何をしてはいけないか」は image-rules.ts に明示しています。
 * 標準は本人らしさを守り、人物を勝手に別人化させない設計です。
 */
export type IeiPhotoMode =
  | "AI_STANDARD" // AI標準生成（本人らしさ保持。背景・明るさ・色味・構図を整える）
  | "AI_ADVANCED" // 高度AI補正（白飛び・強い影・背景境界・服まわりなどをAI補正）
  | "AI_PORTRAIT"; // AI肖像生成（元写真の状態が悪い場合の最終手段）

/**
 * ジョブの進行状態。
 */
export type IeiPhotoJobStatus =
  | "queued" // 受付済み
  | "analyzing" // 写真を解析中
  | "configuring" // AI生成設定を確認中
  | "creating_base" // 基準写真を生成中
  | "checking_quality" // 品質を確認中
  | "completed" // 完了
  | "failed"; // 失敗

/**
 * 出力サイズの種類。
 * - base:      基準写真（まずこの1枚を作り、他はここから切り出す）
 * - tesatsu:   手札サイズ
 * - yotsugiri: 四つ切りサイズ
 * - monitor169:16:9 モニター用
 */
export type IeiPhotoExportKind = "base" | "tesatsu" | "yotsugiri" | "monitor169";

/**
 * /api/iei-photo/analyze のレスポンス内の診断結果。
 */
export type IeiPhotoDiagnosis = {
  overexposed: boolean; // 白飛びしているか
  blurred: boolean; // ブレ・ボケがあるか
  faceDetected: boolean; // 顔が検出できたか
  recommendedMode: IeiPhotoMode; // 推奨する加工モード
};

export type IeiPhotoAnalyzeResponse = {
  ok: boolean;
  diagnosis: IeiPhotoDiagnosis;
};

/**
 * /api/iei-photo/create-job のレスポンス。
 */
export type IeiPhotoCreateJobResponse = {
  ok: boolean;
  jobId: string;
  status: IeiPhotoJobStatus;
};

/**
 * /api/iei-photo/status のレスポンス。
 */
export type IeiPhotoStatusResponse = {
  ok: boolean;
  jobId: string;
  status: IeiPhotoJobStatus;
  progress: number; // 0-100
};

/**
 * 出力結果。値が null の場合は「まだ生成されていない」ことを表す。
 * MVP では実画像が無いため、すべて null を返します。
 */
export type IeiPhotoExports = {
  base: string | null;
  tesatsu: string | null;
  yotsugiri: string | null;
  monitor169: string | null;
};

export type IeiPhotoExportResponse = {
  ok: boolean;
  exports: IeiPhotoExports;
};

/**
 * 手動補正の調整値（すべてブラウザ内 Canvas で適用。AI は不使用）。
 * - brightness / contrast / saturation: パーセント（100 = 無補正）
 * - zoom: パーセント（100 = 現在の中央 cover と同じ）
 * - offsetX / offsetY: 基準写真キャンバスに対する移動量（パーセント, 0 = 中央）
 */
export type IeiPhotoAdjustments = {
  brightness: number;
  contrast: number;
  saturation: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
};

/**
 * 背景設定。
 * 現状は人物切り抜きを行わず、画像外の余白・16:9の左右余白・将来の背景合成領域に使う。
 */
export type IeiPhotoBackgroundType =
  | "white" // 白
  | "light_gray" // 薄いグレー
  | "warm_beige" // 淡いベージュ
  | "pale_blue" // 淡いブルー
  | "gradient"; // グラデーション

export type IeiPhotoBackgroundSettings = {
  type: IeiPhotoBackgroundType;
};

/**
 * 品質チェック項目。UI 表示用（MVP ではモック値）。
 */
export type IeiPhotoQualityCheckItem = {
  key:
    | "identityLikeness" // 本人らしさ
    | "featureRetention" // 顔・髪・服の保持
    | "aiArtifact" // AIっぽさ
    | "exposureShadow" // 白飛び・影
    | "backgroundNaturalness"; // 背景自然さ
  label: string;
  /** pending: 未判定 / pass: 合格 / warn: 要確認 / fail: 不合格 */
  status: "pending" | "pass" | "warn" | "fail";
  description: string;
  /** 補足表示（例: 「元写真ピクセル使用」「AI未使用」「未実装」） */
  note?: string;
};
