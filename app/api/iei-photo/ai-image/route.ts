/**
 * POST /api/iei-photo/ai-image
 *
 * ブラウザ → この Route Handler → OpenAI Images（edits）→ 生成画像、という中継。
 * OpenAI APIキーはサーバー側のみで使用し、クライアントへ露出しない／ログに出さない。
 *
 * 入力: multipart/form-data
 *  - image:        加工対象画像（基準写真など。クライアント側で長辺1600pxに縮小済み想定）
 *  - mode:         advanced | portrait | auto
 *  - clothingStyle: none | mourning_japanese | mourning_western | suit | casual
 *  - backgroundType: sky | light_gray | warm_beige | pale_blue | pale_pink | auto
 *  - backgroundGradient: true | false
 *  - smile:        0-100（既定 50）
 *  - eyeBrightness: 0-100（既定 40）
 *  - teethAdjust:  true | false
 *  - prompt:       任意の追加指示
 *
 * 成功: image/png（生成画像バイナリ）
 * 失敗: JSON `{ ok:false, message:"..." }`
 *
 * 方針:
 * - 人物のAI生成は「高度AI補正 / AI肖像生成 / AIに全てお任せ」の明示操作時のみ（mode で判定）。
 * - 16:9 などの最終レイアウトはクライアントの Canvas 側で行う（ここでは横長生成しない）。
 * - APIキー・Authorization・画像base64本体は絶対にログへ出さない。
 */

import { buildAiPrompt } from "@/lib/iei-photo/ai-prompts";
import type {
  IeiPhotoAiImageMode,
  IeiPhotoBackgroundType,
  IeiPhotoClothingStyle,
  IeiPhotoExpressionSettings,
  IeiPhotoPose,
} from "@/lib/iei-photo/types";

// 画像生成は時間がかかるため、関数の上限を最大（300秒）にする。
export const maxDuration = 300;

const OPENAI_EDITS_URL = "https://api.openai.com/v1/images/edits";
const DEFAULT_MODEL = "gpt-image-2";
// OpenAI 呼び出しのタイムアウト（ミリ秒）。maxDuration 内に収める。
const OPENAI_FETCH_TIMEOUT_MS = 240_000;

const VALID_MODES: IeiPhotoAiImageMode[] = ["advanced", "portrait", "auto"];
const VALID_BACKGROUND_TYPES: IeiPhotoBackgroundType[] = [
  "sky",
  "light_gray",
  "warm_beige",
  "pale_blue",
  "pale_pink",
  "auto",
];
const GRADIENT_BACKGROUND_TYPES: IeiPhotoBackgroundType[] = [
  "light_gray",
  "warm_beige",
  "pale_blue",
  "pale_pink",
];
const VALID_CLOTHING: IeiPhotoClothingStyle[] = [
  "none",
  "mourning_japanese",
  "mourning_western",
  "suit",
  "casual",
];
const VALID_POSE: IeiPhotoPose[] = [
  "none",
  "front",
  "slight_right",
  "slight_left",
  "upright",
];

function jsonError(message: string, status: number): Response {
  return Response.json({ ok: false, message }, { status });
}

function readRangeNumber(
  form: FormData,
  fieldName: string,
  defaultValue: number,
): number {
  const raw = form.get(fieldName);
  const value = typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isFinite(value)) {
    return defaultValue;
  }
  return Math.min(100, Math.max(0, Math.round(value)));
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonError(
      "OPENAI_API_KEY が未設定です。サーバーの環境変数に OpenAI APIキーを設定してください。",
      503,
    );
  }
  const model = process.env.OPENAI_IMAGE_MODEL || DEFAULT_MODEL;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("フォームデータの解析に失敗しました。", 400);
  }

  const image = form.get("image");
  if (!(image instanceof File)) {
    return jsonError("画像ファイル（image）が見つかりません。", 400);
  }

  const modeRaw = String(form.get("mode") ?? "");
  const mode = VALID_MODES.includes(modeRaw as IeiPhotoAiImageMode)
    ? (modeRaw as IeiPhotoAiImageMode)
    : null;
  if (!mode) {
    return jsonError("AIモード（mode）が不正です。", 400);
  }

  const clothingRaw = String(form.get("clothingStyle") ?? "none");
  const clothingStyle = VALID_CLOTHING.includes(
    clothingRaw as IeiPhotoClothingStyle,
  )
    ? (clothingRaw as IeiPhotoClothingStyle)
    : "none";

  const poseRaw = String(form.get("pose") ?? "none");
  const pose = VALID_POSE.includes(poseRaw as IeiPhotoPose)
    ? (poseRaw as IeiPhotoPose)
    : "none";

  const backgroundRaw = String(form.get("backgroundType") ?? "auto");
  const backgroundType = VALID_BACKGROUND_TYPES.includes(
    backgroundRaw as IeiPhotoBackgroundType,
  )
    ? (backgroundRaw as IeiPhotoBackgroundType)
    : "auto";
  const backgroundGradient =
    String(form.get("backgroundGradient") ?? "false") === "true" &&
    GRADIENT_BACKGROUND_TYPES.includes(backgroundType);
  const expression: IeiPhotoExpressionSettings = {
    smile: readRangeNumber(form, "smile", 50),
    eyeBrightness: readRangeNumber(form, "eyeBrightness", 40),
    teethAdjust: String(form.get("teethAdjust") ?? "false") === "true",
  };

  const extraPromptRaw = form.get("prompt");
  const extraPrompt =
    typeof extraPromptRaw === "string" ? extraPromptRaw : undefined;

  const prompt = buildAiPrompt(
    mode,
    clothingStyle,
    pose,
    backgroundType,
    backgroundGradient,
    expression,
    extraPrompt,
  );

  // OpenAI Images edit へ転送する multipart を組み立てる。
  const upstreamForm = new FormData();
  upstreamForm.append("model", model);
  upstreamForm.append("image", image, image.name || "input.jpg");
  upstreamForm.append("prompt", prompt);
  upstreamForm.append("n", "1");
  // 遺影は縦長。最終的に Canvas 側で各サイズへ派生するため縦長で生成する。
  upstreamForm.append("size", "1024x1536");

  let upstream: Response;
  try {
    upstream = await fetch(OPENAI_EDITS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstreamForm,
      signal: AbortSignal.timeout(OPENAI_FETCH_TIMEOUT_MS),
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "TimeoutError") {
      return jsonError(
        "AI処理がタイムアウトしました。少し待って再試行するか、画像サイズを小さくしてお試しください。",
        504,
      );
    }
    return jsonError(
      "OpenAI への接続に失敗しました。時間をおいて再試行してください。",
      502,
    );
  }

  if (!upstream.ok) {
    const status = upstream.status;
    // 秘密情報は載せない。状態コードから分かりやすいメッセージに変換する。
    let message: string;
    if (status === 401) {
      message =
        "OpenAI の認証に失敗しました。OPENAI_API_KEY を確認してください。";
    } else if (status === 429) {
      message =
        "OpenAI の利用上限またはレート制限に達しました。時間をおいて再試行してください。";
    } else if (status === 413) {
      message =
        "画像サイズが大きすぎます。画像を小さくして再試行してください。";
    } else if (status === 400) {
      message =
        "AI生成リクエストが受け付けられませんでした。別の画像でお試しください。";
    } else {
      message = `OpenAI がエラーを返しました（HTTP ${status}）。時間をおいて再試行してください。`;
    }
    // ログは状態コードのみ（本文・キー・base64 は出さない）。
    console.log(
      `[iei-photo/ai-image] openai error status=${status} mode=${mode}`,
    );
    return jsonError(message, 502);
  }

  let data: unknown;
  try {
    data = await upstream.json();
  } catch {
    return jsonError("OpenAI から不正な応答が返りました。", 502);
  }

  const b64 = extractB64(data);
  if (!b64) {
    return jsonError("AI生成に失敗しました（画像が返りませんでした）。", 502);
  }

  let pngBuffer: Buffer;
  try {
    pngBuffer = Buffer.from(b64, "base64");
  } catch {
    return jsonError("AI生成画像のデコードに失敗しました。", 502);
  }

  console.log(`[iei-photo/ai-image] success mode=${mode}`);
  return new Response(new Uint8Array(pngBuffer), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}

/** OpenAI Images のレスポンスから b64_json を取り出す。 */
function extractB64(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const arr = (data as { data?: unknown }).data;
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const first = arr[0] as { b64_json?: unknown };
  return typeof first?.b64_json === "string" && first.b64_json
    ? first.b64_json
    : null;
}
