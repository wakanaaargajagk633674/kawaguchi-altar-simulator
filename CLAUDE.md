@AGENTS.md

# プロジェクトガイド（再探索を減らすための要点）

> このファイルは毎セッション自動で読み込まれます。詳細な手順は `/iei-photo-dev` スキルに分離しているので、ここは「地図」として簡潔に保つこと。

## 何のプロジェクトか
- 川口典礼の **祭壇シミュレーター（見積もり）** Web アプリ。
- そこに新機能として **遺影写真作成 `/iei-photo`**（MVP）を追加中。

## 技術スタック
- Next.js **16.2.4 / App Router**（`src` なし、`app/` 直下）、React 19、TypeScript strict。
- **Tailwind CSS v4**（`app/globals.css` で `@import "tailwindcss"`）。UI は日本語。
- パスエイリアス **`@/*` → リポジトリroot**（`tsconfig.json`）。
- スクリプト: `npm run dev` / `build` / `lint`（eslint flat config）。
- 依存追加は原則禁止（現状: html2canvas, jspdf, next, react のみ）。

## ディレクトリ規約
- ページ: `app/**/page.tsx`、API: `app/api/**/route.ts`（Route Handler は `Response.json()` / `NextRequest`）。
- 共有UI: `components/`、ロジック/型: `lib/`、静的: `public/`。
- UI 配色は既存に合わせる: **amber（強調）/ stone / slate**、カードは `rounded-lg border border-stone-200 bg-white shadow-sm`。
- 既存ユーティリティ: `lib/simulatorUtils.ts` の `cn()`, `formatYen()`。

## 既存機能を壊さない（最重要）
- 見積もり機能・既存ページ・既存API・共有スタイル・`vercel.json` は変更しない。
- 既存ファイルは大きく書き換えない。新機能は新規ファイルで足す。

## 遺影写真 `/iei-photo` の構成（ここを見れば探索不要）
- ページ: `app/iei-photo/page.tsx`（状態管理・プレビュー生成・出力の中枢）
- API スタブ: `app/api/iei-photo/{analyze,create-job,status,export}/route.ts`（将来の外部処理連携の入口。モック）
- コンポーネント: `components/iei-photo/`
  - `IeiPhotoUploader` / `IeiPhotoAdjustmentPanel` / `IeiPhotoModeSelector` /
    `IeiPhotoPreview` / `IeiPhotoCropGuides` / `IeiPhotoStatus` /
    `IeiPhotoQualityCheck` / `IeiPhotoExportButtons`
- ロジック/型: `lib/iei-photo/`
  - `types.ts` 型 / `image-rules.ts` 加工モード規則 / `export-sizes.ts` 出力寸法・ファイル名 /
    `adjustments.ts` 手動補正の既定値・範囲・clamp / `client-export.ts` Canvas 書き出し /
    `mock-job.ts` 将来の外部GPU/RunPod/ComfyUI/Python連携の入口

## 遺影写真の不変条件（変更時も必ず維持）
1. **AIを使わない**（顔・肌・髪・服・シワ・ほくろ・眼鏡を描き直さない）。元写真ピクセルのみ。
2. 画像処理は **ブラウザ内 Canvas のみ**（`filter`＋`drawImage`＋`toBlob`）。Vercel Functions で重処理しない。
3. 手札・四つ切り・16:9 は **必ず「基準写真(base canvas)」から派生**（`exportFromBaseByKind`）。
4. **ガイド線は書き出し画像に焼き込まない**（SVGオーバーレイ表示のみ）。
5. サーバー保存なし／環境変数・APIキー追加なし。
6. 出力ファイル名: `iei-base.jpg` / `iei-tesatsu.jpg` / `iei-yotsugiri.jpg` / `iei-monitor-16x9.jpg`。

## 作業フロー（厳守）
- 作業ブランチは **`feature/iei-photo-mvp`**。**main/master へ直接 push しない／マージしない／本番デプロイしない**。
- コミット前に必ず `npm run lint` と `npm run build` を通す。
- push は `feature/iei-photo-mvp` のみ（Preview Deployment まで）。
- 既存サイトからの **導線（リンク）は追加しない**（`/iei-photo` は直打ち運用）。

## Vercel メモ
- プロジェクト: syosan33-gmailcoms-projects / kawaguchi-altar-simulator。
- プレビューURLは **Deployment Protection（Vercel Authentication）が ON** で、未ログインだと **401**。
  確認はオーナーのログイン済みブラウザで開くか、Settings → Deployment Protection を調整する。
- Vercel CLI / gh CLI はこの環境に未インストール（勝手に global install しない）。
