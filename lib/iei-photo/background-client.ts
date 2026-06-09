/**
 * 背景切り抜きのクライアント側トランスポート
 *
 * クライアントは自前 rembg ワーカーを直接叩かず、必ず Next.js の
 * `/api/iei-photo/remove-background` を経由する（ワーカーURL/トークンを隠すため）。
 *
 * 成功時は透過PNGの Blob を返す。失敗時はユーザー向けメッセージ付きで throw する。
 */

const REMOVE_BACKGROUND_ENDPOINT = "/api/iei-photo/remove-background";

async function extractErrorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { message?: unknown };
    if (typeof data?.message === "string" && data.message) {
      return data.message;
    }
  } catch {
    // JSON でない場合は既定メッセージ
  }
  return "背景切り抜きに失敗しました。";
}

/**
 * アップロード画像を送り、背景切り抜き済みの透過PNG Blob を取得する。
 * @throws ユーザー向けメッセージを持つ Error
 */
export async function requestBackgroundRemoval(file: File): Promise<Blob> {
  const form = new FormData();
  form.append("file", file);

  let res: Response;
  try {
    res = await fetch(REMOVE_BACKGROUND_ENDPOINT, {
      method: "POST",
      body: form,
    });
  } catch {
    throw new Error("背景切り抜きの通信に失敗しました。ネットワークを確認してください。");
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok || !contentType.includes("image/")) {
    throw new Error(await extractErrorMessage(res));
  }

  return res.blob();
}
