/**
 * POST /api/iei-photo/remove-background
 *
 * ブラウザ → この Route Handler → 背景除去 worker → 透過PNG、という中継。
 * クライアントから直接 worker を叩かせないことで、worker URL/トークン/APIキーを隠す。
 *
 * - 入力: multipart/form-data の `file`
 * - 成功: image/png（透過PNG）を返す
 * - 失敗: JSON `{ ok:false, message:"..." }`
 *
 * プロバイダー選択（サーバー側のみ。クライアントには露出しない）:
 * 1. REMBG_WORKER_URL があれば → 自前 FastAPI worker（HTTP ファイル転送）。優先。
 * 2. 無く RUNPOD_ENDPOINT_URL + RUNPOD_API_KEY があれば → RunPod Serverless（base64）。
 * 3. どちらも無ければ → 未設定エラー。
 *
 * 環境変数（すべてサーバー側のみ）:
 * - REMBG_WORKER_URL    例) http://127.0.0.1:8000
 * - REMBG_WORKER_TOKEN  任意。設定時は Authorization: Bearer を付与
 * - RUNPOD_ENDPOINT_URL RunPod Serverless Endpoint（将来）
 * - RUNPOD_API_KEY      RunPod APIキー（将来。クライアントへ絶対に出さない）
 *
 * ここでは背景除去（透過PNG化）の中継のみ。人物の生成・描き直しは行わない。
 */

// RunPod はコールドスタート時に /runsync が IN_QUEUE のまま戻るため、
// /run でジョブ投入 → /status/{jobId} をポーリングする非同期方式を使う。
// その総待ち時間（最大 ~270 秒）を満たせるよう、関数の上限を 300 秒にする。
export const maxDuration = 300;

// ポーリングの総待ち時間（ミリ秒）。Vercel の maxDuration 内に収める。
const RUNPOD_POLL_TOTAL_TIMEOUT_MS = 270_000;
// /status の各 GET ごとのタイムアウト（ミリ秒）。
const RUNPOD_STATUS_FETCH_TIMEOUT_MS = 30_000;
// /run の POST のタイムアウト（ミリ秒）。
const RUNPOD_RUN_FETCH_TIMEOUT_MS = 60_000;
// ポーリング間隔（ミリ秒）。
const RUNPOD_POLL_INTERVAL_MS = 2_500;

function jsonError(message: string, status: number): Response {
  return Response.json({ ok: false, message }, { status });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * RUNPOD_ENDPOINT_URL（末尾が /runsync でも /run でも可）から
 * エンドポイントのベースURL（.../v2/<endpointId>）を導出する。
 */
function deriveRunpodBaseUrl(endpointUrl: string): string {
  return endpointUrl
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/(runsync|run|status)(\/.*)?$/i, "");
}

/** 自前 FastAPI worker（HTTP ファイル転送）経由で背景除去する。 */
async function viaHttpWorker(
  workerUrl: string,
  file: File,
): Promise<Response> {
  // worker へ転送する multipart を組み立てる（boundary は fetch が自動設定）。
  const upstreamForm = new FormData();
  upstreamForm.append("file", file, file.name || "upload.png");

  const headers: Record<string, string> = {};
  const token = process.env.REMBG_WORKER_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const endpoint = `${workerUrl.replace(/\/+$/, "")}/remove-background`;

  let upstream: Response;
  try {
    upstream = await fetch(endpoint, {
      method: "POST",
      body: upstreamForm,
      headers,
    });
  } catch {
    return jsonError(
      "rembg ワーカーに接続できませんでした。ワーカーの起動状態と REMBG_WORKER_URL を確認してください。",
      502,
    );
  }

  const contentType = upstream.headers.get("content-type") ?? "";

  if (!upstream.ok || !contentType.includes("image/")) {
    // worker からのエラーメッセージのみ転記（秘密情報は含めない）。
    let message = "背景切り抜きに失敗しました。";
    try {
      const data = (await upstream.json()) as { message?: unknown };
      if (typeof data?.message === "string" && data.message) {
        message = data.message;
      }
    } catch {
      // JSON でない場合は既定メッセージ
    }
    return jsonError(message, 502);
  }

  const buffer = await upstream.arrayBuffer();
  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType || "image/png",
      "Cache-Control": "no-store",
    },
  });
}

/** RunPod のレスポンスから透過PNGの base64 を取り出す（揺れに対応）。 */
function extractRunpodImageBase64(data: unknown): {
  ok: boolean;
  imageBase64?: string;
  mimeType?: string;
  message?: string;
} {
  if (!data || typeof data !== "object") {
    return { ok: false, message: "RunPod から不正な応答が返りました。" };
  }
  const root = data as Record<string, unknown>;

  // RunPod 自体のエラー
  if (root.error) {
    return { ok: false, message: "RunPod でエラーが発生しました。" };
  }

  // { output: {...} } か、直接 {...} の両対応
  const out =
    root.output && typeof root.output === "object"
      ? (root.output as Record<string, unknown>)
      : root;

  if (out.ok === false) {
    const m = typeof out.message === "string" ? out.message : undefined;
    return { ok: false, message: m ?? "背景切り抜きに失敗しました。" };
  }

  const imageBase64 =
    typeof out.image_base64 === "string" ? out.image_base64 : undefined;
  if (!imageBase64) {
    // status などからの失敗判定（COMPLETED 以外）
    const status = typeof root.status === "string" ? root.status : undefined;
    return {
      ok: false,
      message:
        status && status !== "COMPLETED"
          ? `RunPod のジョブが完了しませんでした（${status}）。`
          : "RunPod 応答に画像が含まれていませんでした。",
    };
  }

  const mimeType =
    typeof out.mime_type === "string" ? out.mime_type : "image/png";
  return { ok: true, imageBase64, mimeType };
}

/** /run のレスポンスから jobId を取り出す（揺れに少し耐性を持たせる）。 */
function extractRunpodJobId(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const root = data as Record<string, unknown>;
  const candidates = [root.id, root.jobId, root.job_id];
  for (const c of candidates) {
    if (typeof c === "string" && c) return c;
  }
  return undefined;
}

/** PNG 化したレスポンスを返す共通処理。 */
function pngResponse(imageBase64: string, mimeType?: string): Response {
  let pngBuffer: Buffer;
  try {
    pngBuffer = Buffer.from(imageBase64, "base64");
  } catch {
    return jsonError("RunPod 応答画像のデコードに失敗しました。", 502);
  }
  return new Response(new Uint8Array(pngBuffer), {
    status: 200,
    headers: {
      "Content-Type": mimeType || "image/png",
      "Cache-Control": "no-store",
    },
  });
}

/**
 * RunPod Serverless 経由で背景除去する（非同期 /run + /status ポーリング方式）。
 *
 * /runsync はコールドスタート時に IN_QUEUE のまま戻るため、
 *   1. /run に POST {input:{image_base64,filename}} → jobId 取得
 *   2. /status/{jobId} を数秒間隔でポーリング
 *   3. COMPLETED → output.image_base64 を取り出して PNG 返却
 * とする。総待ち時間は最大 ~270 秒。
 *
 * APIキー（RUNPOD_API_KEY）はサーバー側のみで使用し、レスポンス・エラー・ログに含めない。
 * ログに出すのは status / jobId のみ（base64 画像本体や Authorization は出さない）。
 */
async function viaRunpodServerless(
  endpointUrl: string,
  apiKey: string,
  file: File,
): Promise<Response> {
  let imageBase64: string;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    imageBase64 = buffer.toString("base64");
  } catch {
    return jsonError("画像の読み込みに失敗しました。", 400);
  }

  const baseUrl = deriveRunpodBaseUrl(endpointUrl);
  const runUrl = `${baseUrl}/run`;
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  // 1) ジョブ投入（/run）
  const payload = {
    input: {
      image_base64: imageBase64,
      filename: file.name || "input.png",
    },
  };

  let runRes: Response;
  try {
    runRes = await fetch(runUrl, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(RUNPOD_RUN_FETCH_TIMEOUT_MS),
    });
  } catch {
    return jsonError(
      "RunPod エンドポイントに接続できませんでした。RUNPOD_ENDPOINT_URL を確認してください。",
      502,
    );
  }

  if (!runRes.ok) {
    const status = runRes.status;
    const message =
      status === 401 || status === 403
        ? "RunPod の認証に失敗しました。RUNPOD_API_KEY を確認してください。"
        : `RunPod がエラーを返しました（HTTP ${status}）。`;
    return jsonError(message, 502);
  }

  let runData: unknown;
  try {
    runData = await runRes.json();
  } catch {
    return jsonError("RunPod から不正な応答が返りました。", 502);
  }

  // /run が同期的に COMPLETED を返すケースにも一応対応。
  const runStatus =
    runData && typeof runData === "object"
      ? (runData as Record<string, unknown>).status
      : undefined;
  if (runStatus === "COMPLETED") {
    const immediate = extractRunpodImageBase64(runData);
    if (immediate.ok && immediate.imageBase64) {
      return pngResponse(immediate.imageBase64, immediate.mimeType);
    }
  }

  const jobId = extractRunpodJobId(runData);
  if (!jobId) {
    return jsonError("RunPod のジョブIDを取得できませんでした。", 502);
  }
  console.log(`[iei-photo/remove-background] runpod job submitted: ${jobId}`);

  const statusUrl = `${baseUrl}/status/${encodeURIComponent(jobId)}`;

  // 2) ポーリング（/status/{jobId}）
  const deadline = Date.now() + RUNPOD_POLL_TOTAL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(RUNPOD_POLL_INTERVAL_MS);

    let statusRes: Response;
    try {
      statusRes = await fetch(statusUrl, {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(RUNPOD_STATUS_FETCH_TIMEOUT_MS),
      });
    } catch {
      // 一時的な失敗は次のポーリングで再試行。
      continue;
    }

    if (statusRes.status === 401 || statusRes.status === 403) {
      return jsonError(
        "RunPod の認証に失敗しました。RUNPOD_API_KEY を確認してください。",
        502,
      );
    }
    if (!statusRes.ok) {
      // 一時的な 5xx 等は再試行。
      continue;
    }

    let statusData: unknown;
    try {
      statusData = await statusRes.json();
    } catch {
      continue;
    }

    const jobStatus =
      statusData && typeof statusData === "object"
        ? ((statusData as Record<string, unknown>).status as string | undefined)
        : undefined;

    if (jobStatus === "COMPLETED") {
      const result = extractRunpodImageBase64(statusData);
      if (!result.ok || !result.imageBase64) {
        return jsonError(result.message ?? "背景切り抜きに失敗しました。", 502);
      }
      return pngResponse(result.imageBase64, result.mimeType);
    }

    if (
      jobStatus === "FAILED" ||
      jobStatus === "CANCELLED" ||
      jobStatus === "TIMED_OUT"
    ) {
      console.log(
        `[iei-photo/remove-background] runpod job ${jobId} ended: ${jobStatus}`,
      );
      return jsonError(
        `RunPod のジョブが完了しませんでした（${jobStatus}）。`,
        502,
      );
    }

    // IN_QUEUE / IN_PROGRESS / PROCESSING などは待機して再ポーリング。
  }

  console.log(
    `[iei-photo/remove-background] runpod job ${jobId} polling timed out`,
  );
  return jsonError(
    "RunPodの処理が時間内に完了しませんでした。初回起動またはモデル読み込み中の可能性があります。少し待って再試行してください。",
    504,
  );
}

export async function POST(request: Request): Promise<Response> {
  const httpWorkerUrl = process.env.REMBG_WORKER_URL;
  const runpodEndpointUrl = process.env.RUNPOD_ENDPOINT_URL;
  const runpodApiKey = process.env.RUNPOD_API_KEY;
  const runpodReady = Boolean(runpodEndpointUrl && runpodApiKey);

  // 優先順位: 1) self_hosted_http_worker  2) runpod_serverless_worker
  if (!httpWorkerUrl && !runpodReady) {
    const detail = runpodEndpointUrl
      ? "RUNPOD_API_KEY が未設定です。"
      : "REMBG_WORKER_URL（自前HTTP worker）または RUNPOD_ENDPOINT_URL + RUNPOD_API_KEY（RunPod）を設定してください。";
    return jsonError(`背景除去 worker が未設定です。${detail}`, 503);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("フォームデータの解析に失敗しました。", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError("画像ファイル（file）が見つかりません。", 400);
  }

  if (httpWorkerUrl) {
    return viaHttpWorker(httpWorkerUrl, file);
  }
  // ここに来る時点で runpodReady === true
  return viaRunpodServerless(
    runpodEndpointUrl as string,
    runpodApiKey as string,
    file,
  );
}
