/**
 * POST /api/iei-photo/remove-background
 *
 * ブラウザ → この Route Handler → 自前 rembg ワーカー → 透過PNG、という中継。
 * クライアントから直接ワーカーを叩かせないことで、ワーカーURL/トークンを隠す。
 *
 * - 入力: multipart/form-data の `file`
 * - 成功: ワーカーが返した image/png をそのまま返す
 * - 失敗: JSON `{ ok:false, message:"..." }`
 *
 * 環境変数（サーバー側のみ。クライアントには露出しない）:
 * - REMBG_WORKER_URL   例) http://localhost:8000
 * - REMBG_WORKER_TOKEN 任意。設定時は Authorization: Bearer を付与
 *
 * ここでは背景除去（透過PNG化）の中継のみ。人物の生成・描き直しは行わない。
 */

function jsonError(message: string, status: number): Response {
  return Response.json({ ok: false, message }, { status });
}

export async function POST(request: Request): Promise<Response> {
  const workerUrl = process.env.REMBG_WORKER_URL;
  if (!workerUrl) {
    return jsonError(
      "rembg ワーカーURLが未設定です。環境変数 REMBG_WORKER_URL を設定してください。",
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

  // ワーカーへ転送する multipart を組み立てる（boundary は fetch が自動設定）。
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
    // ワーカーからのエラーメッセージのみ転記（秘密情報は含めない）。
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
