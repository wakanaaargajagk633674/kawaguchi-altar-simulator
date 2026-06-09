/**
 * 遺影写真作成機能の共通型定義（MVP）
 *
 * 注意:
 * - ここはあくまで「土台」であり、実際の画像処理はまだ実装していません。
 * - 画像処理の実行は将来 lib/iei-photo/mock-job.ts の差し替え（外部GPUサーバー等）で行います。
 */

/**
 * 加工モード。
 * 各モードで「何をして良いか／何をしてはいけないか」は image-rules.ts に明示しています。
 */
export type IeiPhotoMode =
  | "PHOTO_CORRECTION_ONLY" // 写真補正のみ（人物の再生成なし）
  | "PARTIAL_AI_CORRECTION" // 部分AI補正（背景・照明・白飛びの自然化のみ）
  | "FULL_AI_PORTRAIT"; // 生成AI肖像（明示許可時の最終手段のみ）

/**
 * ジョブの進行状態。
 */
export type IeiPhotoJobStatus =
  | "queued" // 受付済み
  | "analyzing" // 解析中
  | "creating_base" // 基準写真作成中
  | "checking_quality" // 品質チェック中
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
 * 品質チェック項目。UI 表示用（MVP ではモック値）。
 */
export type IeiPhotoQualityCheckItem = {
  key: "faceSimilarity" | "featureProtection" | "aiArtifact" | "overexposure";
  label: string;
  /** pending: 未判定 / pass: 合格 / warn: 要確認 / fail: 不合格 */
  status: "pending" | "pass" | "warn" | "fail";
  description: string;
};
