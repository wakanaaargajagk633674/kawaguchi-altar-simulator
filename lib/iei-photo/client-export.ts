/**
 * ブラウザ内 Canvas での画像書き出しユーティリティ
 *
 * 重要方針:
 * - すべてブラウザ内の Canvas 処理のみ（サーバー・Vercel Functions では処理しない）。
 * - AI 生成・顔再生成・AI 補正は一切行わない。元写真のピクセルをそのまま使用した
 *   トリミング・サイズ変更・配置のみ。
 * - 手札・四つ切り・16:9 は、必ず「基準写真（base canvas）」を親データとして派生させる。
 *
 * このファイルはブラウザでのみ実行される想定です（document / Image / canvas を使用）。
 * モジュール読み込み時には何も実行しないため、SSR / ビルドでも安全です。
 */

import {
  IEI_PHOTO_EXPORT_FILENAMES,
  IEI_PHOTO_EXPORT_SIZES,
} from "./export-sizes";
import type { IeiPhotoExportKind } from "./types";

const JPEG_TYPE = "image/jpeg";
const JPEG_QUALITY = 0.92;

/** 16:9 配置時の余白背景色（薄いグレー無地） */
const MONITOR_BG_COLOR = "#f3f4f6";
/** 透過 PNG 対策などのための基準背景色（白） */
const BASE_BG_COLOR = "#ffffff";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error("画像の読み込みに失敗しました。別の画像でお試しください。"));
    img.decoding = "async";
    img.src = src;
  });
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("出力サイズが不正です。");
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function get2dContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas の描画コンテキストを取得できませんでした。");
  }
  // 拡大・縮小時の品質を確保
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return ctx;
}

/** 中央基準のトリミング（cover: 描画先を埋め、はみ出しは切り取る）。 */
function drawCover(
  ctx: CanvasRenderingContext2D,
  src: CanvasImageSource,
  srcWidth: number,
  srcHeight: number,
  destWidth: number,
  destHeight: number,
): void {
  if (!srcWidth || !srcHeight) {
    throw new Error("画像サイズを取得できませんでした。");
  }
  const scale = Math.max(destWidth / srcWidth, destHeight / srcHeight);
  const drawWidth = srcWidth * scale;
  const drawHeight = srcHeight * scale;
  const dx = (destWidth - drawWidth) / 2;
  const dy = (destHeight - drawHeight) / 2;
  ctx.drawImage(src, dx, dy, drawWidth, drawHeight);
}

/** 中央配置（contain: 全体が収まるように縮小して中央へ。余白が出る）。 */
function drawContain(
  ctx: CanvasRenderingContext2D,
  src: CanvasImageSource,
  srcWidth: number,
  srcHeight: number,
  destWidth: number,
  destHeight: number,
): void {
  if (!srcWidth || !srcHeight) {
    throw new Error("画像サイズを取得できませんでした。");
  }
  const scale = Math.min(destWidth / srcWidth, destHeight / srcHeight);
  const drawWidth = srcWidth * scale;
  const drawHeight = srcHeight * scale;
  const dx = (destWidth - drawWidth) / 2;
  const dy = (destHeight - drawHeight) / 2;
  ctx.drawImage(src, dx, dy, drawWidth, drawHeight);
}

function canvasToJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("画像の書き出しに失敗しました。"));
          }
        },
        JPEG_TYPE,
        JPEG_QUALITY,
      );
    } catch {
      reject(
        new Error(
          "画像の書き出し中にエラーが発生しました。画像が大きすぎる可能性があります。",
        ),
      );
    }
  });
}

/**
 * アップロード画像から「基準写真」（縦長 3:4）を作成する。
 * 中央基準でトリミング（cover）するのみで、AI 補正・顔再生成は行わない。
 *
 * @param source File または ObjectURL 文字列
 * @returns 基準写真の Canvas（以降の派生処理の親データ）
 */
export async function createBasePhotoFromImage(
  source: File | string,
): Promise<HTMLCanvasElement> {
  const ownsUrl = typeof source !== "string";
  const url = ownsUrl ? URL.createObjectURL(source) : source;
  try {
    const img = await loadImage(url);
    const { width, height } = IEI_PHOTO_EXPORT_SIZES.base.pixelGuide;
    const canvas = createCanvas(width, height);
    const ctx = get2dContext(canvas);
    ctx.fillStyle = BASE_BG_COLOR;
    ctx.fillRect(0, 0, width, height);
    drawCover(ctx, img, img.naturalWidth, img.naturalHeight, width, height);
    return canvas;
  } finally {
    // 自前で作成した ObjectURL のみ解放（呼び出し側所有の URL は解放しない）。
    if (ownsUrl) {
      URL.revokeObjectURL(url);
    }
  }
}

/** 基準写真そのものを JPEG 出力する。 */
export async function exportBaseFromBase(
  base: HTMLCanvasElement,
): Promise<Blob> {
  return canvasToJpegBlob(base);
}

/** 基準写真から手札サイズ（縦長, cover）を書き出す。 */
export async function exportTesatsuFromBase(
  base: HTMLCanvasElement,
): Promise<Blob> {
  const { width, height } = IEI_PHOTO_EXPORT_SIZES.tesatsu.pixelGuide;
  const canvas = createCanvas(width, height);
  const ctx = get2dContext(canvas);
  ctx.fillStyle = BASE_BG_COLOR;
  ctx.fillRect(0, 0, width, height);
  drawCover(ctx, base, base.width, base.height, width, height);
  return canvasToJpegBlob(canvas);
}

/** 基準写真から四つ切りサイズ（縦長, cover）を書き出す。 */
export async function exportYotsugiriFromBase(
  base: HTMLCanvasElement,
): Promise<Blob> {
  const { width, height } = IEI_PHOTO_EXPORT_SIZES.yotsugiri.pixelGuide;
  const canvas = createCanvas(width, height);
  const ctx = get2dContext(canvas);
  ctx.fillStyle = BASE_BG_COLOR;
  ctx.fillRect(0, 0, width, height);
  drawCover(ctx, base, base.width, base.height, width, height);
  return canvasToJpegBlob(canvas);
}

/**
 * 16:9 モニター用を書き出す。
 * 1920x1080 の横長キャンバスに、基準写真を縦長のまま中央へ contain 配置。
 * 余白は無地（薄いグレー）で埋めるだけ。AI で背景・服を生成しない。
 */
export async function exportMonitor169FromBase(
  base: HTMLCanvasElement,
): Promise<Blob> {
  const { width, height } = IEI_PHOTO_EXPORT_SIZES.monitor169.pixelGuide;
  const canvas = createCanvas(width, height);
  const ctx = get2dContext(canvas);
  ctx.fillStyle = MONITOR_BG_COLOR;
  ctx.fillRect(0, 0, width, height);
  drawContain(ctx, base, base.width, base.height, width, height);
  return canvasToJpegBlob(canvas);
}

/** 種別に応じて基準写真から派生 Blob を生成する。 */
export async function exportFromBaseByKind(
  base: HTMLCanvasElement,
  kind: IeiPhotoExportKind,
): Promise<Blob> {
  switch (kind) {
    case "base":
      return exportBaseFromBase(base);
    case "tesatsu":
      return exportTesatsuFromBase(base);
    case "yotsugiri":
      return exportYotsugiriFromBase(base);
    case "monitor169":
      return exportMonitor169FromBase(base);
    default: {
      // 網羅性チェック
      const _exhaustive: never = kind;
      throw new Error(`未知の出力種別です: ${String(_exhaustive)}`);
    }
  }
}

/** 種別に対応する出力ファイル名を返す。 */
export function filenameForKind(kind: IeiPhotoExportKind): string {
  return IEI_PHOTO_EXPORT_FILENAMES[kind];
}

/**
 * Blob をダウンロードさせる。
 * 生成した ObjectURL はダウンロード開始後に解放する。
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    // クリック直後に revoke するとダウンロードが中断される場合があるため、少し遅らせる。
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
}
