/**
 * 出力サイズ定義（MVP）
 *
 * 方針: まず「基準写真」を1枚作り、手札・四つ切り・16:9 はそこから切り出します。
 * 寸法はあくまで初期値であり、実際の出力処理を実装する際に調整してください。
 */

import type { IeiPhotoExportKind } from "./types";

export type IeiPhotoExportSize = {
  kind: IeiPhotoExportKind;
  label: string;
  description: string;
  /** 縦横比（width:height）。プレビュー枠やトリミングの基準に使う。 */
  aspectRatio: string;
  /** 参考の出力ピクセル（将来の実装で使用） */
  pixelGuide?: { width: number; height: number };
};

export const IEI_PHOTO_EXPORT_SIZES: Record<
  IeiPhotoExportKind,
  IeiPhotoExportSize
> = {
  base: {
    kind: "base",
    label: "基準写真",
    description: "最初に作成する基準となる1枚。他のサイズはここから切り出します。",
    aspectRatio: "4:5",
    pixelGuide: { width: 2000, height: 2500 },
  },
  tesatsu: {
    kind: "tesatsu",
    label: "手札",
    description: "手札サイズ。受付や手元用。",
    aspectRatio: "4:5",
    pixelGuide: { width: 1063, height: 1339 },
  },
  yotsugiri: {
    kind: "yotsugiri",
    label: "四つ切り",
    description: "四つ切りサイズ。祭壇用の標準的な遺影サイズ。",
    aspectRatio: "4:5",
    pixelGuide: { width: 2544, height: 3180 },
  },
  monitor169: {
    kind: "monitor169",
    label: "16:9モニター用",
    description: "モニター表示用の 16:9 切り出し。",
    aspectRatio: "16:9",
    pixelGuide: { width: 1920, height: 1080 },
  },
};

/** 出力ボタンの表示順 */
export const IEI_PHOTO_EXPORT_ORDER: IeiPhotoExportKind[] = [
  "base",
  "tesatsu",
  "yotsugiri",
  "monitor169",
];
