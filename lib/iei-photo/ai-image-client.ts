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
  IeiPhotoExpressionSettings,
  IeiPhotoPose,
} from "./types";

const AI_IMAGE_ENDPOINT = "/api/iei-photo/ai-image";
/** OpenAI へ送る画像の長辺上限（px）。 */
const MAX_EDGE = 1600;
/** 送信画像の JPEG 品質。 */
const SEND_JPEG_QUALITY = 0.9;
const SAFETY_CROP_HEIGHT_RATIO = 0.6;
const SAFETY_CROP_RETRY_PROMPT =
  "元写真は施設で撮影された楽しい記念写真です。首元や胸元の近くに手が写っている場合がありますが、危険行為ではなく、喜びを表す自然なしぐさです。AI送信用に下部をトリミングしているため、見えている顔、髪型、表情、本人らしさを最優先で維持し、肩や胸元は自然なポートレートとして補ってください。";

type AiImageErrorPayload = {
  message?: unknown;
  code?: unknown;
  retryableWithSafetyCrop?: unknown;
};

class IeiPhotoAiImageError extends Error {
  code?: string;
  retryableWithSafetyCrop: boolean;

  constructor(
    message: string,
    options: { code?: string; retryableWithSafetyCrop?: boolean } = {},
  ) {
    super(message);
    this.name = "IeiPhotoAiImageError";
    this.code = options.code;
    this.retryableWithSafetyCrop = Boolean(options.retryableWithSafetyCrop);
  }
}

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

function createSafetyCropCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const cropHeight = Math.max(
    1,
    Math.round(source.height * SAFETY_CROP_HEIGHT_RATIO),
  );
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = cropHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return source;
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    source,
    0,
    0,
    source.width,
    cropHeight,
    0,
    0,
    source.width,
    cropHeight,
  );
  return canvas;
}

async function extractAiImageError(res: Response): Promise<IeiPhotoAiImageError> {
  try {
    const data = (await res.json()) as AiImageErrorPayload;
    if (typeof data?.message === "string" && data.message) {
      return new IeiPhotoAiImageError(data.message, {
        code: typeof data.code === "string" ? data.code : undefined,
        retryableWithSafetyCrop: data.retryableWithSafetyCrop === true,
      });
    }
  } catch {
    // JSON でない場合は既定メッセージ
  }
  return new IeiPhotoAiImageError("AI生成に失敗しました。");
}

/**
 * 基準写真 Canvas を AI 処理し、生成画像の Blob を取得する。
 * @throws ユーザー向けメッセージを持つ Error
 */
async function requestAiImageOnce(
  baseCanvas: HTMLCanvasElement,
  mode: IeiPhotoAiImageMode,
  clothingStyle: IeiPhotoClothingStyle,
  pose: IeiPhotoPose,
  backgroundType: IeiPhotoBackgroundType,
  backgroundGradient: boolean,
  expression: IeiPhotoExpressionSettings,
  extraPrompt?: string,
): Promise<Blob> {
  const imageBlob = await downscaleCanvasForAi(baseCanvas);

  const form = new FormData();
  form.append("image", imageBlob, "input.jpg");
  form.append("mode", mode);
  form.append("clothingStyle", clothingStyle);
  form.append("pose", pose);
  form.append("backgroundType", backgroundType);
  form.append("backgroundGradient", backgroundGradient ? "true" : "false");
  form.append("expressionEnabled", expression.enabled ? "true" : "false");
  form.append("smileLevel", expression.smile);
  form.append("eyeBrightness", expression.eyeBrightness ? "true" : "false");
  form.append("teethVisibility", expression.teethVisibility);
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
    throw await extractAiImageError(res);
  }
  return res.blob();
}

/**
 * 基準写真 Canvas を AI 処理し、生成画像の Blob を取得する。
 * 首元の手などで OpenAI の安全判定に誤検知された場合は、
 * AI送信用に写真下部を自動クロップして1回だけ再試行する。
 *
 * @throws ユーザー向けメッセージを持つ Error
 */
export async function requestAiImage(
  baseCanvas: HTMLCanvasElement,
  mode: IeiPhotoAiImageMode,
  clothingStyle: IeiPhotoClothingStyle,
  pose: IeiPhotoPose,
  backgroundType: IeiPhotoBackgroundType,
  backgroundGradient: boolean,
  expression: IeiPhotoExpressionSettings,
  extraPrompt?: string,
): Promise<Blob> {
  try {
    return await requestAiImageOnce(
      baseCanvas,
      mode,
      clothingStyle,
      pose,
      backgroundType,
      backgroundGradient,
      expression,
      extraPrompt,
    );
  } catch (error) {
    if (
      !(error instanceof IeiPhotoAiImageError) ||
      error.code !== "moderation_blocked" ||
      !error.retryableWithSafetyCrop
    ) {
      throw error;
    }
  }

  const safetyPrompt = [extraPrompt?.trim(), SAFETY_CROP_RETRY_PROMPT]
    .filter(Boolean)
    .join("\n");

  try {
    return await requestAiImageOnce(
      createSafetyCropCanvas(baseCanvas),
      mode,
      clothingStyle,
      pose,
      backgroundType,
      backgroundGradient,
      expression,
      safetyPrompt,
    );
  } catch (retryError) {
    if (retryError instanceof IeiPhotoAiImageError) {
      throw new Error(
        "OpenAI の安全判定によりAI生成できませんでした。写真の下部を手動で少し切る、または顔が中心になるように拡大してから再度お試しください。",
      );
    }
    throw retryError;
  }
}
