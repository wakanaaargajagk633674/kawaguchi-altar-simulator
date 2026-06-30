/**
 * AI画像処理のクライアント側トランスポート
 *
 * クライアントは OpenAI を直接叩かず、必ず Next.js の `/api/iei-photo/ai-image`
 * を経由する（APIキーをサーバー側に隠すため）。
 *
 * 送信前に画像を縮小する（Vercel のペイロード制限・OpenAI の負荷対策）。
 * - 長辺最大 1600px / JPEG quality 0.9
 * 成功時は生成画像の Blob を返す。失敗時はユーザー向けメッセージ付きで throw する。
 */

import type {
  IeiPhotoAiImageMode,
  IeiPhotoBackgroundType,
  IeiPhotoClothingStyle,
  IeiPhotoPose,
} from "./types";

const AI_IMAGE_ENDPOINT = "/api/iei-photo/ai-image";
/** OpenAI へ送る画像の長辺上限（px）。 */
const MAX_EDGE = 1600;
/** 送信画像の JPEG 品質。 */
const SEND_JPEG_QUALITY = 0.9;

function canvasToJpegBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("画像の書き出しに失敗しました。"));
        }
      },
      "image/jpeg",
      quality,
    );
  });
}

/**
 * 基準写真 Canvas を、長辺 MAX_EDGE 以下の JPEG Blob に縮小する。
 * 既に小さければそのまま JPEG 化する（極端に小さくはしない）。
 */
export async function downscaleCanvasForAi(
  source: HTMLCanvasElement,
): Promise<Blob> {
  const { width, height } = source;
  const longEdge = Math.max(width, height);
  if (longEdge <= MAX_EDGE) {
    return canvasToJpegBlob(source, SEND_JPEG_QUALITY);
  }
  const scale = MAX_EDGE / longEdge;
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const small = document.createElement("canvas");
  small.width = w;
  small.height = h;
  const ctx = small.getContext("2d");
  if (!ctx) {
    // コンテキストが取れない場合は等倍で書き出す。
    return canvasToJpegBlob(source, SEND_JPEG_QUALITY);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, w, h);
  return canvasToJpegBlob(small, SEND_JPEG_QUALITY);
}

async function extractErrorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { message?: unknown };
    if (typeof data?.message === "string" && data.message) {
      return data.message;
    }
  } catch {
    // JSON でない場合は既定メッセージ
  }
  return "AI生成に失敗しました。";
}

/**
 * 基準写真 Canvas を AI 処理し、生成画像の Blob を取得する。
 * @throws ユーザー向けメッセージを持つ Error
 */
export async function requestAiImage(
  baseCanvas: HTMLCanvasElement,
  mode: IeiPhotoAiImageMode,
  clothingStyle: IeiPhotoClothingStyle,
  pose: IeiPhotoPose,
  backgroundType: IeiPhotoBackgroundType,
  extraPrompt?: string,
): Promise<Blob> {
  const imageBlob = await downscaleCanvasForAi(baseCanvas);

  const form = new FormData();
  form.append("image", imageBlob, "input.jpg");
  form.append("mode", mode);
  form.append("clothingStyle", clothingStyle);
  form.append("pose", pose);
  form.append("backgroundType", backgroundType);
  if (extraPrompt && extraPrompt.trim()) {
    form.append("prompt", extraPrompt.trim());
  }

  let res: Response;
  try {
    res = await fetch(AI_IMAGE_ENDPOINT, { method: "POST", body: form });
  } catch {
    throw new Error(
      "AI生成の通信に失敗しました。ネットワークを確認してください。",
    );
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok || !contentType.includes("image/")) {
    throw new Error(await extractErrorMessage(res));
  }
  return res.blob();
}
