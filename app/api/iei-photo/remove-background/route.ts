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
 * 1. REMBG_WORKER_URL があれば → 自前 FastAPI worker（HTTP ファイル転送）。現行の既定。
 * 2. 無く RUNPOD_ENDPOINT_URL があれば → RunPod Serverless（base64）。※未実装（TODO）。
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

function jsonError(message: string, status: number): Response {
  return Response.json({ ok: false, message }, { status });
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

/**
 * RunPod Serverless 経由で背景除去する。
 *
 * TODO(runpod): 次の開発ステップで実装する。
 *   1. file を base64 へエンコード
 *   2. POST `${RUNPOD_ENDPOINT_URL}` に
 *      `{ "input": { "image_base64": "...", "filename": file.name } }` を送信
 *      ヘッダー: `Authorization: Bearer ${process.env.RUNPOD_API_KEY}`（サーバー側のみ）
 *   3. RunPod のレスポンス（`{ output: { ok, image_base64, mime_type } }`）から
 *      image_base64 をデコードして image/png として返す
 *   ※ APIキーはレスポンスに含めない / クライアントへ出さない。
 *
 * 現状は実 API 接続をしないため、未実装である旨を返す。
 */
async function viaRunpodServerless(_file: File): Promise<Response> {
  void _file; // 将来 base64 化して送信する
  return jsonError(
    "RunPod Serverless 接続は未実装です（次の開発ステップで対応）。現在は self-hosted HTTP worker（REMBG_WORKER_URL）をご利用ください。",
    501,
  );
}

export async function POST(request: Request): Promise<Response> {
  const httpWorkerUrl = process.env.REMBG_WORKER_URL;
  const runpodEndpointUrl = process.env.RUNPOD_ENDPOINT_URL;

  if (!httpWorkerUrl && !runpodEndpointUrl) {
    return jsonError(
      "背景除去 worker が未設定です。環境変数 REMBG_WORKER_URL（自前HTTP worker）または RUNPOD_ENDPOINT_URL（RunPod）を設定してください。",
      503,
    );
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

  // 1: 自前 HTTP worker を優先（明示設定）。2: RunPod（未実装）。
  if (httpWorkerUrl) {
    return viaHttpWorker(httpWorkerUrl, file);
  }
  return viaRunpodServerless(file);
}
