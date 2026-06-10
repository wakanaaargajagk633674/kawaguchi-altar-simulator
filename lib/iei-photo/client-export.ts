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
  IEI_PHOTO_EXPORT_ORDER,
  IEI_PHOTO_EXPORT_SIZES,
} from "./export-sizes";
import { createZipBlob, type ZipEntry } from "./zip";
import { clampAdjustments } from "./adjustments";
import {
  IEI_PHOTO_BACKGROUND_GRADIENT,
  IEI_PHOTO_BACKGROUND_SOLID_COLORS,
  IEI_PHOTO_DEFAULT_BACKGROUND,
  backgroundImageSrc,
  isPhotoBackgroundType,
} from "./backgrounds";
import type {
  IeiPhotoAdjustments,
  IeiPhotoBackgroundSettings,
  IeiPhotoExportKind,
} from "./types";

const JPEG_TYPE = "image/jpeg";
const JPEG_QUALITY = 0.92;

/** 透過 PNG 対策などのための基準背景色（白） */
const BASE_BG_COLOR = "#ffffff";

/**
 * 背景設定に応じて Canvas 全面を塗る／敷く（フィルタ非適用）。
 * - bgImage があれば写真背景を cover で全面に敷く（人物はこの上に合成される）。
 * - 無ければ単色 or 縦方向グラデーション。画像系で未ロード時は白にフォールバック。
 * 人物の描き直しは行わず、背景の塗り/敷きのみ。
 */
function fillBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  background?: IeiPhotoBackgroundSettings,
  bgImage?: HTMLImageElement | null,
): void {
  const settings = background ?? IEI_PHOTO_DEFAULT_BACKGROUND;
  ctx.filter = "none";
  if (bgImage) {
    drawCover(
      ctx,
      bgImage,
      bgImage.naturalWidth,
      bgImage.naturalHeight,
      width,
      height,
    );
    return;
  }
  if (settings.type === "gradient") {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, IEI_PHOTO_BACKGROUND_GRADIENT.from);
    gradient.addColorStop(1, IEI_PHOTO_BACKGROUND_GRADIENT.to);
    ctx.fillStyle = gradient;
  } else if (isPhotoBackgroundType(settings.type)) {
    // 写真背景なのに画像が未ロード（読み込み失敗等）の場合は白で代替。
    ctx.fillStyle = BASE_BG_COLOR;
  } else {
    ctx.fillStyle = IEI_PHOTO_BACKGROUND_SOLID_COLORS[settings.type];
  }
  ctx.fillRect(0, 0, width, height);
}

/** 背景画像のキャッシュ（同一 URL の再読み込みを防ぐ）。 */
const backgroundImageCache = new Map<string, HTMLImageElement>();

/**
 * 背景設定と向きに対応する写真背景画像を読み込む（写真系以外は null）。
 * 読み込み失敗時は null を返し、呼び出し側は単色フォールバックする（throw しない）。
 */
export async function resolveBackgroundImage(
  background: IeiPhotoBackgroundSettings | undefined,
  orientation: "vertical" | "wide",
): Promise<HTMLImageElement | null> {
  const settings = background ?? IEI_PHOTO_DEFAULT_BACKGROUND;
  const src = backgroundImageSrc(settings, orientation);
  if (!src) {
    return null;
  }
  const cached = backgroundImageCache.get(src);
  if (cached) {
    return cached;
  }
  try {
    const img = await loadImageElement(src);
    backgroundImageCache.set(src, img);
    return img;
  } catch {
    return null;
  }
}

/** 画像 URL（ObjectURL など）から HTMLImageElement を読み込む。 */
export function loadImageElement(src: string): Promise<HTMLImageElement> {
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

/**
 * 中央 cover に zoom / offset を加味して描画する（手動トリミング）。
 * - zoom 100 は cover と同じ。100 超で拡大。
 * - offsetX / offsetY は描画先サイズに対するパーセント移動（中央=0）。
 * - 画像外が見える部分は、呼び出し側で塗った背景色で埋まる。
 */
function drawAdjustedCover(
  ctx: CanvasRenderingContext2D,
  src: CanvasImageSource,
  srcWidth: number,
  srcHeight: number,
  destWidth: number,
  destHeight: number,
  zoom: number,
  offsetX: number,
  offsetY: number,
): void {
  if (!srcWidth || !srcHeight) {
    throw new Error("画像サイズを取得できませんでした。");
  }
  const baseScale = Math.max(destWidth / srcWidth, destHeight / srcHeight);
  const scale = baseScale * (zoom / 100);
  const drawWidth = srcWidth * scale;
  const drawHeight = srcHeight * scale;
  const dx = (destWidth - drawWidth) / 2 + (offsetX / 100) * destWidth;
  const dy = (destHeight - drawHeight) / 2 + (offsetY / 100) * destHeight;
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
 * 読み込み済み画像から「基準写真」（縦長 3:4）の Canvas を作成する（同期処理）。
 *
 * - 明るさ / コントラスト / 彩度は CanvasRenderingContext2D.filter で適用し、描画後に必ず reset する。
 * - zoom / offsetX / offsetY を中央 cover に加味して手動トリミングする。
 * - 画像外が見える部分は背景色（白）で埋める。AI で背景生成はしない。
 * - 元写真のピクセルをそのまま使用し、顔・肌・髪・服などの描き直しは行わない。
 *
 * @param img 読み込み済みの画像要素
 * @param adjustments 手動補正値（範囲外はクランプ、未指定は無補正）
 * @returns 基準写真の Canvas（以降の派生処理の親データ）
 */
export function renderBasePhotoCanvas(
  img: HTMLImageElement,
  adjustments?: Partial<IeiPhotoAdjustments>,
  background?: IeiPhotoBackgroundSettings,
  bgImage?: HTMLImageElement | null,
): HTMLCanvasElement {
  const a = clampAdjustments(adjustments);
  const { width, height } = IEI_PHOTO_EXPORT_SIZES.base.pixelGuide;
  const canvas = createCanvas(width, height);
  const ctx = get2dContext(canvas);

  // 背景はフィルタ非適用で塗る／敷く（選択した背景を反映。人物切り抜きはしない）。
  fillBackground(ctx, width, height, background, bgImage);

  // 明るさ・コントラスト・彩度を適用して描画。
  ctx.filter = `brightness(${a.brightness}%) contrast(${a.contrast}%) saturate(${a.saturation}%)`;
  drawAdjustedCover(
    ctx,
    img,
    img.naturalWidth,
    img.naturalHeight,
    width,
    height,
    a.zoom,
    a.offsetX,
    a.offsetY,
  );

  // フィルタが他描画に残らないよう必ず reset する。
  ctx.filter = "none";
  return canvas;
}

/**
 * アップロード画像（File / ObjectURL）から基準写真 Canvas を作成する。
 * 画像読み込み → renderBasePhotoCanvas を行う非同期ヘルパー。
 *
 * @param source File または ObjectURL 文字列
 * @param adjustments 手動補正値
 * @returns 基準写真の Canvas（以降の派生処理の親データ）
 */
export async function createBasePhotoFromImage(
  source: File | string,
  adjustments?: Partial<IeiPhotoAdjustments>,
  background?: IeiPhotoBackgroundSettings,
): Promise<HTMLCanvasElement> {
  const ownsUrl = typeof source !== "string";
  const url = ownsUrl ? URL.createObjectURL(source) : source;
  try {
    const img = await loadImageElement(url);
    // 基準写真（縦）に焼き込む写真背景を読み込む（写真系以外は null）。
    const bgImage = await resolveBackgroundImage(background, "vertical");
    return renderBasePhotoCanvas(img, adjustments, background, bgImage);
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
 * 基準写真の指定領域の平均色を rgb() 文字列で返す（1x1 へ縮小して読む）。
 * 16:9 余白の下地（エッジ延長のフェード保険）に使う。
 */
function averageColorOfRegion(
  src: HTMLCanvasElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
): string {
  const tmp = createCanvas(1, 1);
  const tctx = get2dContext(tmp);
  tctx.drawImage(src, sx, sy, sw, sh, 0, 0, 1, 1);
  const d = tctx.getImageData(0, 0, 1, 1).data;
  return `rgb(${d[0]}, ${d[1]}, ${d[2]})`;
}

/**
 * 16:9 モニター用を書き出す。
 * 1920x1080 の横長キャンバスに、基準写真（縦長）を中央へ contain 配置（全体が切れない）。
 *
 * 左右余白は「無地背景」や「切れた人物のボケ」ではなく、基準写真の左右端の背景を
 * 横方向へ引き伸ばして（エッジ延長）埋める。四切も同じ基準写真から切り出すため、
 * 16:9 の余白＝四切の背景の続きになり、両者が自然につながる。
 * AI 生成（背景が淡い無地/グラデ）では特になじみやすい。AI で横長生成はしない。
 */
export async function exportMonitor169FromBase(
  base: HTMLCanvasElement,
): Promise<Blob> {
  const { width, height } = IEI_PHOTO_EXPORT_SIZES.monitor169.pixelGuide;
  const canvas = createCanvas(width, height);
  const ctx = get2dContext(canvas);

  const bw = base.width;
  const bh = base.height;
  // 中央の人物（基準写真）を contain 配置する領域。
  const scale = Math.min(width / bw, height / bh);
  const pw = bw * scale;
  const ph = bh * scale;
  const px = (width - pw) / 2;
  const py = (height - ph) / 2;

  // 端から取るストリップ幅（基準写真幅の数%）。
  const stripW = Math.max(2, Math.round(bw * 0.04));

  // 1) 下地: 左右端の平均色で左右半分を塗る（エッジ延長のぼかしフェード保険）。
  let leftAvg = BASE_BG_COLOR;
  let rightAvg = BASE_BG_COLOR;
  try {
    leftAvg = averageColorOfRegion(base, 0, 0, stripW, bh);
    rightAvg = averageColorOfRegion(base, bw - stripW, 0, stripW, bh);
  } catch {
    // getImageData が使えない環境では白下地のままにする。
  }
  ctx.fillStyle = leftAvg;
  ctx.fillRect(0, 0, Math.ceil(width / 2), height);
  ctx.fillStyle = rightAvg;
  ctx.fillRect(Math.floor(width / 2), 0, Math.ceil(width / 2), height);

  // 2) エッジ延長: 基準写真の左右端ストリップを余白へ横引き伸ばし（軽いぼかしでムラ消し）。
  const seamOverlap = Math.round(width * 0.02);
  ctx.save();
  ctx.filter = "blur(18px)";
  // 左余白
  ctx.drawImage(base, 0, 0, stripW, bh, 0, py, px + seamOverlap, ph);
  // 右余白
  const rightStart = px + pw - seamOverlap;
  ctx.drawImage(
    base,
    bw - stripW,
    0,
    stripW,
    bh,
    rightStart,
    py,
    width - rightStart,
    ph,
  );
  ctx.restore();

  // 3) 中央に人物全体を配置（上下左右が切れない）。
  ctx.drawImage(base, px, py, pw, ph);

  // 4) ごく弱いビネット（祭壇モニタとして人物を引き立てる）。
  const vignette = ctx.createRadialGradient(
    width / 2,
    height / 2,
    height * 0.38,
    width / 2,
    height / 2,
    width * 0.72,
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.12)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  return canvasToJpegBlob(canvas);
}

/**
 * 種別に応じて基準写真から派生 Blob を生成する。
 * base/手札/四つ切りは基準写真（縦・背景焼き込み済み）から、16:9 は中央配置＋ボケ背景で生成する。
 */
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
 * すべての出力サイズを1つの ZIP にまとめて返す（単一ダウンロード）。
 * 複数ファイルの連続ダウンロードはブラウザにブロックされやすいため、
 * 一括ダウンロードは ZIP 化して単一ダウンロードにする。中身は各サイズの JPEG。
 */
export async function exportAllZipFromBase(
  base: HTMLCanvasElement,
): Promise<Blob> {
  const entries: ZipEntry[] = [];
  for (const kind of IEI_PHOTO_EXPORT_ORDER) {
    const blob = await exportFromBaseByKind(base, kind);
    const data = new Uint8Array(await blob.arrayBuffer());
    entries.push({ name: filenameForKind(kind), data });
  }
  return createZipBlob(entries);
}

/**
 * Blob をダウンロードさせる。
 * 生成した ObjectURL はダウンロード開始後に解放する。
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  // クリック直後にアンカー削除/URL解放を行うと、ブラウザによっては
  // ダウンロードが中断される（特に連続ダウンロードの2件目以降）。
  // ダウンロードが確定するまで少し待ってから後始末する。
  window.setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 1500);
}
