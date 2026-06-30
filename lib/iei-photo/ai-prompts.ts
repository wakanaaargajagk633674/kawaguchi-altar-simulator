/**
 * AI遺影写真生成のプロンプト定義（サーバー/クライアント両用・DOM非依存）
 *
 * 重要方針:
 * - 人物をAI生成する処理は「高度AI補正 / AI肖像生成 / AIに全てお任せ」の明示操作時のみ。
 * - 本人らしさを最優先し、別人化・過度な若返り・過剰な美肌化・顔の作り替えは避ける。
 * - 服装変更はAI処理時のみ。clothingStyle="none" のときは服装指示を追加しない。
 *
 * プロンプト統合順:
 *   1. 本人らしさ維持 → 2. 顔の特徴維持 → 3. 背景テーマ → 4. 服装指定
 */

import type {
  IeiPhotoAiImageMode,
  IeiPhotoBackgroundType,
  IeiPhotoClothingStyle,
  IeiPhotoPose,
} from "./types";

/** モードごとの基本プロンプト（本人らしさ・顔特徴・背景明るさ補正を含む）。 */
export const IEI_PHOTO_AI_BASE_PROMPTS: Record<IeiPhotoAiImageMode, string> = {
  advanced:
    "遺影写真として自然で品のある写真に整えてください。人物の本人らしさ、顔の輪郭、目、鼻、口、髪型、眼鏡、ほくろ、シワ、服の印象をできるだけ保持してください。白飛び、強い影、色かぶり、背景との境界、全体の明るさを自然に補正してください。別人化、若返り、美化しすぎ、顔の作り替え、服の大幅変更は避けてください。背景は清潔な淡い無地または自然な遺影写真向け背景にしてください。",
  portrait:
    "元写真の人物を参考に、遺影写真として自然で品のある肖像写真を生成してください。本人らしさを最優先し、顔の特徴、髪型、眼鏡、ほくろ、シワ、表情の印象を可能な限り維持してください。強い白飛びや暗さを補い、落ち着いた背景、自然な照明、上半身の構図で仕上げてください。過度な若返り、別人化、過剰な美肌化、服や顔の不自然な作り替えは避けてください。",
  auto:
    "AIに全てお任せします。元写真の人物を参考に、遺影写真として最も自然で品のある仕上がりになるよう、背景、明るさ、色味、構図、服装、全体の印象を総合的に整えてください。本人らしさを最優先し、顔の特徴、髪型、眼鏡、ほくろ、シワ、表情の印象を可能な限り維持してください。白飛び、強い影、背景の乱れ、服装の違和感を自然に補い、遺影写真として落ち着いた印象にしてください。ただし、過度な若返り、別人化、過剰な美肌化、不自然な顔の作り替えは避けてください。",
};

/** 背景テーマごとの追加指示。背景は別画像合成ではなく AI に生成させる。 */
export const IEI_PHOTO_BACKGROUND_PROMPTS: Record<
  IeiPhotoBackgroundType,
  string
> = {
  sky: "背景は穏やかで明るい空の雰囲気にしてください。人物の輪郭になじむ自然な光で、遺影写真として落ち着いた品のある背景にしてください。",
  light_gray:
    "背景は明るく落ち着いたグレー系にしてください。無地に近く、人物が自然に引き立つ遺影写真向けの背景にしてください。",
  warm_beige:
    "背景は淡いベージュ系にしてください。温かみがあり、派手すぎず、人物の輪郭となじむ自然な背景にしてください。",
  pale_blue:
    "背景は淡いブルー系にしてください。清潔感があり、人物が自然に引き立つ遺影写真向けの背景にしてください。",
  pale_pink:
    "背景は淡いピンク系にしてください。柔らかく上品で、人物の雰囲気を損なわない自然な背景にしてください。",
  auto:
    "背景はAIが元写真の人物、服装、明るさに合わせて、遺影写真として最も自然で品のあるものを生成してください。",
  white:
    "背景は白を基調にした清潔で落ち着いた無地に近い背景にしてください。",
  gradient:
    "背景は淡いグラデーションにしてください。人物の輪郭になじむ自然で上品な背景にしてください。",
  photo:
    "背景は遺影写真として自然で品のある淡い背景にしてください。既存の別背景画像を貼り付けたような不自然な合成は避けてください。",
};

/** 服装ごとの追加指示（none は追加なし）。 */
export const IEI_PHOTO_CLOTHING_PROMPTS: Record<IeiPhotoClothingStyle, string> =
  {
    none: "",
    mourning_japanese:
      "服装は落ち着いた正式な喪服の和装にしてください。葬儀用として自然で品のある印象にしてください。",
    mourning_western:
      "服装は落ち着いた正式な喪服の洋装にしてください。葬儀用として自然で品のある印象にしてください。",
    suit:
      "服装は落ち着いたフォーマルなスーツにしてください。遺影写真として自然で上品な印象にしてください。",
    casual:
      "服装は落ち着いた清潔感のあるカジュアル服にしてください。派手すぎず、自然で品のある印象にしてください。",
  };

/** UI 表示用の服装ラベル。 */
export const IEI_PHOTO_CLOTHING_LABELS: Record<IeiPhotoClothingStyle, string> = {
  none: "指定なし",
  mourning_japanese: "喪服（和装）",
  mourning_western: "喪服（洋装）",
  suit: "スーツ",
  casual: "カジュアル",
};

/** UI のボタン表示順。 */
export const IEI_PHOTO_CLOTHING_ORDER: IeiPhotoClothingStyle[] = [
  "none",
  "mourning_japanese",
  "mourning_western",
  "suit",
  "casual",
];

/** 体勢・向きごとの追加指示（none は追加なし）。 */
export const IEI_PHOTO_POSE_PROMPTS: Record<IeiPhotoPose, string> = {
  none: "",
  front:
    "人物の顔と上半身をできるだけ正面に向け、まっすぐカメラを見ている構図にしてください。",
  slight_right: "人物の顔をやや右斜めに向けた、落ち着いた構図にしてください。",
  slight_left: "人物の顔をやや左斜めに向けた、落ち着いた構図にしてください。",
  upright: "背筋を伸ばし、落ち着いた自然な姿勢に整えてください。",
};

/** UI 表示用の体勢ラベル。 */
export const IEI_PHOTO_POSE_LABELS: Record<IeiPhotoPose, string> = {
  none: "指定なし",
  front: "正面を向く",
  slight_right: "やや右向き",
  slight_left: "やや左向き",
  upright: "姿勢を正す",
};

/** UI のボタン表示順。 */
export const IEI_PHOTO_POSE_ORDER: IeiPhotoPose[] = [
  "none",
  "front",
  "slight_right",
  "slight_left",
  "upright",
];

/**
 * 最終プロンプトを組み立てる。
 * 統合順: 本人らしさ・顔特徴・背景明るさ（基本）→ 服装 → 体勢・向き → 追加指示。
 */
export function buildAiPrompt(
  mode: IeiPhotoAiImageMode,
  clothingStyle: IeiPhotoClothingStyle,
  pose: IeiPhotoPose,
  backgroundType: IeiPhotoBackgroundType = "auto",
  extraPrompt?: string,
): string {
  const parts: string[] = [IEI_PHOTO_AI_BASE_PROMPTS[mode]];
  parts.push(IEI_PHOTO_BACKGROUND_PROMPTS[backgroundType]);
  const clothing = IEI_PHOTO_CLOTHING_PROMPTS[clothingStyle];
  if (clothing) {
    parts.push(clothing);
  }
  const poseText = IEI_PHOTO_POSE_PROMPTS[pose];
  if (poseText) {
    parts.push(poseText);
  }
  const extra = extraPrompt?.trim();
  if (extra) {
    parts.push(extra);
  }
  return parts.join(" ");
}
