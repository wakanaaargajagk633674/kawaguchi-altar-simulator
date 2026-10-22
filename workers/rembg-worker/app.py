"""
自前 rembg ワーカー（背景切り抜き専用）

役割:
- アップロード画像から「人物領域を透過PNG化（背景除去）」するだけ。
- 人物の顔・肌・髪・服・シワ・ほくろ・眼鏡などを生成・描き直しはしない。
- 背景合成はブラウザ側 Canvas で行うため、ここは透過PNGを返すのみ。

セキュリティ:
- REMBG_WORKER_TOKEN（必須）を設定し、Authorization: Bearer <token> を要求する。
- 未設定のまま起動すると即終了する（fail closed）。
  ローカル開発で認証なしにしたい場合のみ REMBG_ALLOW_NO_AUTH=1 を明示的に設定する（本番では絶対に使わない）。
- アップロードは REMBG_MAX_UPLOAD_BYTES（既定 15MB）まで。
- 例外の詳細はサーバーログにのみ出し、クライアントには汎用メッセージを返す。
"""

import hmac
import logging
import os

from fastapi import FastAPI, File, Header, UploadFile
from fastapi.responses import JSONResponse, Response

from rembg_core import remove_background_to_png_bytes

logger = logging.getLogger("rembg-worker")

# 本番では必ず設定する。
EXPECTED_TOKEN = os.environ.get("REMBG_WORKER_TOKEN") or ""
ALLOW_NO_AUTH = os.environ.get("REMBG_ALLOW_NO_AUTH") == "1"
MAX_UPLOAD_BYTES = int(os.environ.get("REMBG_MAX_UPLOAD_BYTES") or 15 * 1024 * 1024)
_READ_CHUNK = 1024 * 1024

if not EXPECTED_TOKEN and not ALLOW_NO_AUTH:
    raise RuntimeError(
        "REMBG_WORKER_TOKEN が未設定です。本番では必ず設定してください。"
        "（ローカル開発で認証なしにする場合のみ REMBG_ALLOW_NO_AUTH=1 を設定）"
    )
if not EXPECTED_TOKEN:
    logger.warning("REMBG_ALLOW_NO_AUTH=1: 認証なしで起動しています（ローカル開発専用）。")

app = FastAPI(title="iei-photo rembg worker", version="0.1.0")


def _is_authorized(authorization: "str | None") -> bool:
    if not EXPECTED_TOKEN:
        # REMBG_ALLOW_NO_AUTH=1 を明示した場合のみここに来る。
        return True
    expected = f"Bearer {EXPECTED_TOKEN}".encode("utf-8")
    provided = (authorization or "").encode("utf-8")
    return hmac.compare_digest(provided, expected)


async def _read_limited(file: UploadFile) -> "bytes | None":
    """上限を超えたら None を返す（全体をメモリに載せる前に打ち切る）。"""
    chunks = []
    total = 0
    while True:
        chunk = await file.read(_READ_CHUNK)
        if not chunk:
            break
        total += len(chunk)
        if total > MAX_UPLOAD_BYTES:
            return None
        chunks.append(chunk)
    return b"".join(chunks)


@app.get("/health")
def health():
    return {"ok": True, "auth_required": bool(EXPECTED_TOKEN)}


@app.post("/remove-background")
async def remove_background(
    file: UploadFile = File(...),
    authorization: "str | None" = Header(default=None),
):
    if not _is_authorized(authorization):
        return JSONResponse(
            status_code=401,
            content={"ok": False, "message": "認証に失敗しました。"},
        )

    try:
        data = await _read_limited(file)
    finally:
        await file.close()

    if data is None:
        return JSONResponse(
            status_code=413,
            content={"ok": False, "message": "画像ファイルが大きすぎます。"},
        )
    if not data:
        return JSONResponse(
            status_code=400,
            content={"ok": False, "message": "画像ファイルが空です。"},
        )

    try:
        # 背景除去のみ（人物の生成・描き直しは行わない）。
        png_bytes = remove_background_to_png_bytes(data)
        return Response(content=png_bytes, media_type="image/png")
    except Exception:  # noqa: BLE001 - 詳細はログのみ。クライアントには汎用メッセージを返す
        logger.exception("背景除去に失敗しました。")
        return JSONResponse(
            status_code=500,
            content={"ok": False, "message": "背景除去に失敗しました。"},
        )
