/**
 * 背景タイプの定義（UI スウォッチ ＋ Canvas 塗り色）
 *
 * 現状は人物切り抜きを行わず、画像外の余白・16:9 の左右余白・将来の背景合成領域に使います。
 * 実際の背景切り抜き/差し替えAPIは将来 background-provider.ts 経由で接続します。
 */

import type {
  IeiPhotoBackgroundSettings,
  IeiPhotoBackgroundType,
  IeiPhotoExportKind,
  IeiPhotoGender,
} from "./types";

/** UI 表示用（表示順・ラベル・スウォッチCSS）。photo は性別トグルで選ぶため含めない。 */
export const IEI_PHOTO_BACKGROUND_OPTIONS: {
  type: IeiPhotoBackgroundType;
  label: string;
  swatchCss: string;
}[] = [
  {
    type: "sky",
    label: "空（16:9）",
    swatchCss: "linear-gradient(180deg, #cfe0f4, #ffffff)",
  },
  { type: "white", label: "白", swatchCss: "#ffffff" },
  { type: "light_gray", label: "薄いグレー", swatchCss: "#f3f4f6" },
  { type: "warm_beige", label: "淡いベージュ", swatchCss: "#f5efe6" },
  { type: "pale_blue", label: "淡いブルー", swatchCss: "#eaf1f8" },
  {
    type: "gradient",
    label: "グラデーション",
    swatchCss: "linear-gradient(180deg, #eef2f7, #d9e2ec)",
  },
];

/** 性別トグル（写真背景の自動選択: 男性=ブルー / 女性=ピンク）。 */
export const IEI_PHOTO_GENDER_OPTIONS: {
  gender: IeiPhotoGender;
  label: string;
  swatchCss: string;
}[] = [
  {
    gender: "male",
    label: "男性（ブルー）",
    swatchCss: "linear-gradient(180deg, #9cc0ec, #ffffff)",
  },
  {
    gender: "female",
    label: "女性（ピンク）",
    swatchCss: "linear-gradient(180deg, #f3b6c6, #ffffff)",
  },
];

/** 単色タイプの塗り色（Canvas 用）。画像系（photo/sky）とグラデは除く。 */
export const IEI_PHOTO_BACKGROUND_SOLID_COLORS: Record<
  Exclude<IeiPhotoBackgroundType, "gradient" | "photo" | "sky">,
  string
> = {
  white: "#ffffff",
  light_gray: "#f3f4f6",
  warm_beige: "#f5efe6",
  pale_blue: "#eaf1f8",
};

/** 背景画像（写真背景）が置かれているベースパス。 */
const PHOTO_BG_DIR = "/images/tmp/";

/**
 * 性別 × 向きごとの写真背景ファイル名。
 * - vertical: 手札・四切（縦長）。四切画像（高解像）を基準写真に焼き込み、手札/四切はそこから派生。
 * - wide: 16:9 モニタ。
 */
const PHOTO_BG_FILES: Record<
  IeiPhotoGender,
  { vertical: string; wide: string }
> = {
  male: { vertical: "青（男性）四切.png", wide: "青（男性）モニタ.png" },
  female: { vertical: "ピンク（女性）四切.png", wide: "ピンク（女性）モニタ.png" },
};

/** 空背景（16:9専用）。 */
const SKY_BG_WIDE_FILE = "空　モニタ.png";

/** 出力種別 → 背景画像の向き。 */
export function orientationForKind(
  kind: IeiPhotoExportKind,
): "vertical" | "wide" {
  return kind === "monitor169" ? "wide" : "vertical";
}

/** 画像系の背景タイプか（写真背景 / 空）。 */
export function isPhotoBackgroundType(
  type: IeiPhotoBackgroundType,
): type is "photo" | "sky" {
  return type === "photo" || type === "sky";
}

/**
 * 背景設定と向きから、使用する背景画像 URL を返す（写真系以外は null）。
 * - photo: 性別の縦/横画像。
 * - sky: 横は空画像、縦は性別の写真背景にフォールバック（空は16:9専用のため）。
 * ファイル名は日本語のため encodeURIComponent でエンコードして URL 化する。
 */
export function backgroundImageSrc(
  settings: IeiPhotoBackgroundSettings,
  orientation: "vertical" | "wide",
): string | null {
  const gender: IeiPhotoGender = settings.gender ?? "male";
  let file: string | null = null;
  if (settings.type === "photo") {
    file = PHOTO_BG_FILES[gender][orientation];
  } else if (settings.type === "sky") {
    file =
      orientation === "wide"
        ? SKY_BG_WIDE_FILE
        : PHOTO_BG_FILES[gender].vertical; // 縦は性別の写真背景にフォールバック
  }
  if (!file) {
    return null;
  }
  return PHOTO_BG_DIR + encodeURIComponent(file);
}

/** グラデーションの上端→下端カラー（Canvas 用） */
export const IEI_PHOTO_BACKGROUND_GRADIENT = {
  from: "#eef2f7",
  to: "#d9e2ec",
};

/** 既定の背景設定（写真背景・男性=ブルー） */
export const IEI_PHOTO_DEFAULT_BACKGROUND: IeiPhotoBackgroundSettings = {
  type: "photo",
  gender: "male",
};
