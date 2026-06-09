/**
 * 背景タイプの定義（UI スウォッチ ＋ Canvas 塗り色）
 *
 * 現状は人物切り抜きを行わず、画像外の余白・16:9 の左右余白・将来の背景合成領域に使います。
 * 実際の背景切り抜き/差し替えAPIは将来 background-provider.ts 経由で接続します。
 */

import type {
  IeiPhotoBackgroundSettings,
  IeiPhotoBackgroundType,
} from "./types";

/** UI 表示用（表示順・ラベル・スウォッチCSS） */
export const IEI_PHOTO_BACKGROUND_OPTIONS: {
  type: IeiPhotoBackgroundType;
  label: string;
  swatchCss: string;
}[] = [
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

/** 単色タイプの塗り色（Canvas 用） */
export const IEI_PHOTO_BACKGROUND_SOLID_COLORS: Record<
  Exclude<IeiPhotoBackgroundType, "gradient">,
  string
> = {
  white: "#ffffff",
  light_gray: "#f3f4f6",
  warm_beige: "#f5efe6",
  pale_blue: "#eaf1f8",
};

/** グラデーションの上端→下端カラー（Canvas 用） */
export const IEI_PHOTO_BACKGROUND_GRADIENT = {
  from: "#eef2f7",
  to: "#d9e2ec",
};

/** 既定の背景設定 */
export const IEI_PHOTO_DEFAULT_BACKGROUND: IeiPhotoBackgroundSettings = {
  type: "white",
};
