---
name: iei-photo-dev
description: 遺影写真作成機能 /iei-photo を開発・修正・出力するときの手順とルール。新しいUI/出力/補正/プレビューの追加、Canvas書き出しの変更、feature/iei-photo-mvp へのコミット/pushを行うときに使う。
---

# 遺影写真 `/iei-photo` 開発スキル

`CLAUDE.md` の要点に対する「詳細手順」。ここを読めば、関連ファイルを総当たりで開かずに作業できる。

## 0. 着手前チェック
```bash
git branch --show-current   # feature/iei-photo-mvp であること
git status                  # working tree clean であること
```
- ブランチが違う/dirty なら止めて確認する。

## 1. 守るべき不変条件（レビュー観点）
1. AI不使用。顔・肌・髪・服・シワ・ほくろ・眼鏡を描き直さない。元写真ピクセルのみ。
2. 画像処理はブラウザ内 Canvas のみ（`filter` + `drawImage` + `toBlob`）。サーバー/Functions で重処理しない。
3. 手札/四つ切り/16:9 は必ず基準写真(base canvas)から派生（`exportFromBaseByKind`）。元画像から直接作らない。
4. ガイド線は書き出しに焼き込まない（`IeiPhotoCropGuides` は SVG オーバーレイ表示のみ。出力は `baseCanvasRef` から生成）。
5. 既存の見積もり機能・既存ファイル・`vercel.json` を壊さない。依存追加・環境変数追加・サーバー保存をしない。
6. 既存サイトへの導線を追加しない。

## 2. ファイル早見表
- 画面の中枢: `app/iei-photo/page.tsx`
  - 元画像は `imgRef`（`loadImageElement` で1回読込）、基準写真は `baseCanvasRef`。
  - `generatePreview(adj, kind)` が基準写真生成→選択サイズのプレビュー Blob を作る。アップロード直後と、補正/種類変更時（debounce）に呼ぶ。
  - 出力可否は `hasBase`（基準写真の有無）で決まる。モックの「処理開始」完了には依存しない。
  - ObjectURL は置換時に revoke、アンマウント時に ref 経由でまとめて revoke。
- Canvas 書き出し: `lib/iei-photo/client-export.ts`
  - `renderBasePhotoCanvas(img, adj)`: 3:4 基準写真。`ctx.filter` で明るさ/コントラスト/彩度、zoom/offset で手動トリミング。**filter は描画後に必ず `"none"` へ戻す**。
  - `exportFromBaseByKind(base, kind)` / `exportBaseFromBase|Tesatsu|Yotsugiri|Monitor169FromBase` / `downloadBlob` / `filenameForKind`。
- 出力寸法・ファイル名: `lib/iei-photo/export-sizes.ts`（base 1800x2400 / tesatsu 1051x1500 / yotsugiri 3000x3600 / monitor169 1920x1080）。
- 手動補正の既定値・範囲・clamp: `lib/iei-photo/adjustments.ts`。
- 加工モード規則（PHOTO_CORRECTION_ONLY / PARTIAL_AI_CORRECTION / FULL_AI_PORTRAIT）: `lib/iei-photo/image-rules.ts`。
- 型: `lib/iei-photo/types.ts`。将来の外部処理連携の入口: `lib/iei-photo/mock-job.ts`。

## 3. Next.js 16 の注意
- 新しい挙動は `node_modules/next/dist/docs/` を確認してから書く（AGENTS.md 参照）。
- Route Handler は `Response.json()` と `NextRequest`（`request.nextUrl.searchParams`）。

## 4. 仕上げ（必須順序）
```bash
npm run lint
npm run build
```
- 両方通ったらコミット。コミットメッセージは Conventional Commits（例 `feat: ...` / `fix: ...`）。
- コミット末尾に `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`。
- push は **feature/iei-photo-mvp のみ**。`git push origin feature/iei-photo-mvp`。
- main/master へ push/マージしない。本番デプロイしない。

## 5. PowerShell/Git の落とし穴（この環境）
- コミットメッセージは `-m "..." -m "..."` の複数指定が安全（here-string は先頭に余計な `@` が入る事故あり）。
- LF→CRLF 警告は無害。

## 6. Vercel 確認
- プレビューは Deployment Protection（401）。オーナーのログイン済みブラウザで開くか、Settings で調整。
- gh / Vercel CLI は未インストール。global install しない。PRはGitHubのcompare URLを案内する。
