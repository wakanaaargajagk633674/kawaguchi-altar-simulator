# rembg worker（背景切り抜き専用）

AI遺影写真生成アプリ `/iei-photo` の背景切り抜きを担う、自前ワーカーの雛形です。
**背景除去のみ**を行い、人物の生成・描き直しはしません。アップロード画像から
人物領域を透過PNG化して返します。背景合成はブラウザ側 Canvas で行います。

アプリ（ブラウザ）からは直接このワーカーを叩かず、必ず Next.js の
`/api/iei-photo/remove-background` を経由します（ワーカーURL/トークンを隠すため）。

## エンドポイント

### `POST /remove-background`
- 入力: `multipart/form-data` の `file`（画像）
- 認証: 任意。`REMBG_WORKER_TOKEN` を設定した場合は `Authorization: Bearer <token>` が必要
- 成功: `image/png`（透過PNG）を返す
- 失敗: JSON `{ "ok": false, "message": "..." }`

### `GET /health`
- 稼働確認用。`{ "ok": true, "auth_required": <bool> }`

## 依存（推論バックエンド）
- `requirements.txt` には **CPU 推論バックエンド（`rembg[cpu]` = onnxruntime）** を含めています。
  これが無いと初回推論時に `No onnxruntime backend found` で失敗します。GPU 依存は入れていません（CPU worker 前提）。
- **初回推論時に u2net などのモデル（約170MB）を自動ダウンロード**するため、最初の1回だけ時間がかかります
  （以降はキャッシュされます。モデルキャッシュはコミットしません）。

## 環境変数
- `REMBG_WORKER_TOKEN`（任意）: 設定すると Bearer トークン認証を有効化。
  - 未設定ならローカル開発用として**認証なし**で動作します。
  - **本番では必ず設定してください。**

## ローカル起動

```bash
cd workers/rembg-worker
python -m venv .venv
# Windows: .venv\Scripts\activate  /  macOS・Linux: source .venv/bin/activate
pip install -r requirements.txt

# 認証なし（ローカル開発）
uvicorn app:app --host 0.0.0.0 --port 8000

# 認証あり（推奨）
# Windows(PowerShell): $env:REMBG_WORKER_TOKEN="任意のトークン"; uvicorn app:app --port 8000
# macOS/Linux:        REMBG_WORKER_TOKEN=任意のトークン uvicorn app:app --port 8000
```

初回は rembg のモデル（u2net 等, 約170MB）が自動ダウンロードされるため、最初の1回だけ時間がかかります。

動作確認（ローカルでは `localhost` より `127.0.0.1` を推奨）:

```bash
curl -f -X POST http://127.0.0.1:8000/remove-background \
  -F "file=@sample.jpg" \
  -o cutout.png
```

## Docker 起動

```bash
cd workers/rembg-worker
docker build -t iei-rembg-worker .

# 認証なし
docker run --rm -p 8000:8000 iei-rembg-worker

# 認証あり
docker run --rm -p 8000:8000 -e REMBG_WORKER_TOKEN=任意のトークン iei-rembg-worker
```

## Next.js 側との接続

`.env.local`（コミットしない）に以下を設定します。

```env
# ローカルでは localhost より 127.0.0.1 を推奨（環境によっては Node が IPv6(::1) を
# 先に解決し、IPv4 待受のワーカーに繋がらず接続エラーになることがあるため）。
REMBG_WORKER_URL=http://127.0.0.1:8000
REMBG_WORKER_TOKEN=任意のトークン   # ワーカー側と一致させる。未設定なら空でも可（ローカルのみ）
```

ブラウザ → `/api/iei-photo/remove-background` → このワーカー `/remove-background` → 透過PNG
→ ブラウザ Canvas で背景設定と合成、という流れです。

### よくあるハマりどころ
- **`localhost` で繋がらない場合は `127.0.0.1` を使う**（上記の IPv6 解決問題）。
  または、ワーカーを全インターフェースで起動する（`uvicorn app:app --host 0.0.0.0 --port 8000`）。
- **古い Next dev サーバが残っていると、新しい API ルート（`/api/iei-photo/remove-background`）が
  404 になる**ことがあります。その場合は古い dev サーバを停止してから `npm run dev` で起動し直してください
  （Next は同一ディレクトリで複数 dev サーバを同時起動できません）。

## 注意点
- **人物生成は行いません。** 背景除去（人物マスク作成・透過PNG化）のみです。
- 顔・肌・髪・服・シワ・ほくろ・眼鏡などを描き直すことはありません。
- **本番では認証トークン（`REMBG_WORKER_TOKEN`）を必ず設定してください。**
- 大きすぎる画像は処理に時間がかかる、または失敗する場合があります。必要に応じて縮小してください。
- 将来 RunPod / VPS / Railway / Render / Fly.io 等にデプロイできる最小構成です（本番デプロイは今回未実施）。
