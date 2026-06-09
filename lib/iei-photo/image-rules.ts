/**
 * 画像処理ルール定義（MVP）
 *
 * ここは「各加工モードで何を許可し、何を禁止するか」をコード上で明示するための場所です。
 * 実際の画像処理エンジン（将来の外部GPUサーバー / ComfyUI / Python画像処理API 等）は、
 * このルールを参照して動作する想定です。MVP では定義のみで処理は行いません。
 *
 * 重要な方針:
 * - 通常は人物の顔・肌・髪・服を AI で描き直さない。
 * - 生成AI肖像は、元写真の白飛びや破損が大きい場合の最終手段としてのみ使用する。
 * - まず基準写真を1枚作り、手札・四つ切り・16:9 はそこから切り出す。
 */

import type { IeiPhotoMode } from "./types";

/** モードごとに許可される操作・禁止される操作・注意点を定義する。 */
export type IeiPhotoModeRule = {
  mode: IeiPhotoMode;
  /** UI 表示用の名称 */
  label: string;
  /** UI 表示用の概要 */
  summary: string;
  /** 許可される操作（人物の再生成を伴わない範囲） */
  allowedOperations: string[];
  /** 明確に禁止される操作 */
  forbiddenOperations: string[];
  /** 保護すべき人物特徴 */
  protectedFeatures: string[];
  /** このモードを使う条件・前提 */
  usageConditions: string[];
  /** 明示的な許可が必要かどうか */
  requiresExplicitConsent: boolean;
};

export const IEI_PHOTO_MODE_RULES: Record<IeiPhotoMode, IeiPhotoModeRule> = {
  PHOTO_CORRECTION_ONLY: {
    mode: "PHOTO_CORRECTION_ONLY",
    label: "写真補正のみ",
    summary: "人物の再生成は行わず、明るさ・色味などの補正のみを行います。",
    allowedOperations: [
      "明るさ補正",
      "色味補正",
      "コントラスト調整",
      "影の軽減",
      "必要最低限のノイズ調整",
      "背景切り抜き",
      "背景差し替え",
      "トリミング",
      "サイズ変更",
    ],
    forbiddenOperations: [
      "人物（顔・肌・髪・服）の再生成",
      "顔のパーツの描き直し",
      "本人らしさを損なう加工",
    ],
    protectedFeatures: ["顔", "肌", "髪", "服", "ほくろ", "シワ", "眼鏡"],
    usageConditions: ["元写真の状態が比較的良好な場合の標準モード"],
    requiresExplicitConsent: false,
  },

  PARTIAL_AI_CORRECTION: {
    mode: "PARTIAL_AI_CORRECTION",
    label: "部分AI補正",
    summary:
      "背景・照明・白飛び感の自然化のみを AI で補助します。顔の重要特徴は保護します。",
    allowedOperations: [
      "背景の自然化",
      "照明の自然化",
      "白飛び感の自然化",
    ],
    forbiddenOperations: [
      "顔の重要特徴の改変",
      "人物そのものの再生成",
    ],
    protectedFeatures: [
      "ほくろ",
      "イボ",
      "シワ",
      "眼鏡",
      "目",
      "口",
      "髪",
      "服の質感",
    ],
    usageConditions: [
      "写真補正のみでは背景・照明・白飛びが改善しきれない場合",
    ],
    requiresExplicitConsent: false,
  },

  FULL_AI_PORTRAIT: {
    mode: "FULL_AI_PORTRAIT",
    label: "生成AI肖像",
    summary:
      "明示的に許可された場合のみ使用する最終手段です。本人らしさの維持を最優先します。",
    allowedOperations: [
      "元写真を基にした肖像の再構成（明示許可時のみ）",
    ],
    forbiddenOperations: [
      "許可なく人物を再生成すること",
      "本人らしさを損なう創作的な改変",
    ],
    protectedFeatures: ["本人らしさ（顔の同一性）"],
    usageConditions: [
      "元写真の白飛びや破損が大きく、他のモードでは基準写真を作れない場合のみ",
      "利用には明示的な許可が必要",
    ],
    requiresExplicitConsent: true,
  },
};

/** モード一覧（UI のセレクタ表示順） */
export const IEI_PHOTO_MODE_ORDER: IeiPhotoMode[] = [
  "PHOTO_CORRECTION_ONLY",
  "PARTIAL_AI_CORRECTION",
  "FULL_AI_PORTRAIT",
];

/** 既定モード */
export const IEI_PHOTO_DEFAULT_MODE: IeiPhotoMode = "PHOTO_CORRECTION_ONLY";

/** UI に表示する共通の注意書き。 */
export const IEI_PHOTO_NOTICES: string[] = [
  "通常は人物の顔・肌・髪・服を AI で描き直しません。",
  "生成AI肖像は、元写真の白飛びや破損が大きい場合のみ使用します。",
  "まず基準写真を1枚作り、手札・四つ切り・16:9 はそこから切り出します。",
];
