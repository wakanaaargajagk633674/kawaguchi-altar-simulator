/**
 * 背景処理プロバイダー設計（入口）
 *
 * 背景切り抜き・背景差し替え・背景合成を「外部サービスへ差し替え可能」にするための抽象です。
 * 現時点では mock のみ実装し、実際の外部API呼び出し・APIキー・環境変数・fetch先URLは
 * 一切追加しません（次の開発ステップで接続予定）。
 *
 * 重要方針:
 * - 現状は人物切り抜きを行わない。元写真の人物部分を切り抜いたり生成したりしない。
 * - 背景タイプは余白・16:9 の左右余白・将来の背景合成領域に使うだけ。
 * - 人物の顔・肌・髪・服・シワ・ほくろ・眼鏡を描き直さない。
 */

import type { IeiPhotoBackgroundSettings } from "./types";

/** 将来差し替え可能な背景処理プロバイダー種別。 */
export type IeiPhotoBackgroundProviderId =
  | "mock" // 現状のダミー（外部接続なし）
  | "self_hosted_http_worker" // 自前 FastAPI worker（HTTPファイル転送）。現行の既定。
  | "runpod_serverless_worker" // RunPod Serverless（base64 でやり取り）。将来接続。
  | "remove_bg_api" // 将来: remove.bg 等
  | "photoroom_api" // 将来: PhotoRoom 等
  | "external_background_api" // 将来: その他の背景処理API
  | "self_hosted_worker"; // 互換用エイリアス（= self_hosted_http_worker）。新規利用は非推奨。

/** 背景処理の役割。 */
export type IeiPhotoBackgroundRole =
  | "remove_background" // 背景切り抜き
  | "replace_background" // 背景差し替え
  | "compose_background"; // 背景合成

/** 背景処理リクエスト（実データの受け渡しは将来拡張）。 */
export type IeiPhotoBackgroundRequest = {
  role: IeiPhotoBackgroundRole;
  settings?: IeiPhotoBackgroundSettings;
  /** 将来: 元画像の参照（Blob URL / ストレージキー等）。現状は未使用。 */
  sourceRef?: string;
};

/**
 * 背景処理結果。
 * - handledByCanvas: true の場合、合成はクライアントの Canvas 側で行う（現状の背景合成）。
 * - resultRef: 将来、外部処理結果（切り抜き画像URL等）を受け取るための枠。現状は null。
 */
export type IeiPhotoBackgroundResult = {
  ok: boolean;
  provider: IeiPhotoBackgroundProviderId;
  role: IeiPhotoBackgroundRole;
  handledByCanvas: boolean;
  resultRef: string | null;
  message: string;
};

/** プロバイダー共通インターフェース。 */
export type IeiPhotoBackgroundProvider = {
  id: IeiPhotoBackgroundProviderId;
  supports: (role: IeiPhotoBackgroundRole) => boolean;
  process: (
    request: IeiPhotoBackgroundRequest,
  ) => Promise<IeiPhotoBackgroundResult>;
};

/**
 * mock プロバイダー。
 * 外部API・APIキー・環境変数・fetch を一切使わない。
 * - remove_background: 未接続（次の開発ステップで接続）。
 * - replace_background / compose_background: Canvas 側で背景設定を合成プレビュー。
 */
export const mockBackgroundProvider: IeiPhotoBackgroundProvider = {
  id: "mock",
  supports: () => true,
  async process({ role }) {
    if (role === "remove_background") {
      return {
        ok: false,
        provider: "mock",
        role,
        handledByCanvas: false,
        resultRef: null,
        message: "背景切り抜きAPIは次の開発ステップで接続します。",
      };
    }
    return {
      ok: true,
      provider: "mock",
      role,
      handledByCanvas: true,
      resultRef: null,
      message:
        "背景処理は未接続のため、現在は元写真全体を使って背景設定を合成プレビューしています。",
    };
  },
};

/** 共通の宣言を組み立てるヘルパー（役割ごとの扱いは全 worker 系で共通）。 */
function buildWorkerProvider(
  id: IeiPhotoBackgroundProviderId,
  removeMessage: string,
): IeiPhotoBackgroundProvider {
  return {
    id,
    supports: (role) =>
      role === "remove_background" || role === "compose_background",
    async process({ role }) {
      if (role === "remove_background") {
        return {
          ok: true,
          provider: id,
          role,
          handledByCanvas: false,
          resultRef: null,
          message: removeMessage,
        };
      }
      return {
        ok: true,
        provider: id,
        role,
        handledByCanvas: true,
        resultRef: null,
        message:
          "切り抜き済みの人物を、選択した背景とブラウザ内 Canvas で合成します。",
      };
    },
  };
}

/**
 * 自前 FastAPI worker（HTTP ファイル転送）プロバイダー。現行の既定。
 *
 * 実際の背景除去は、クライアントから Next.js の `/api/iei-photo/remove-background`
 * を経由して呼ぶ（クライアントは worker を直接叩かない）。実通信は
 * lib/iei-photo/background-client.ts の requestBackgroundRemoval が担当する。
 */
export const selfHostedHttpWorkerBackgroundProvider: IeiPhotoBackgroundProvider =
  buildWorkerProvider(
    "self_hosted_http_worker",
    "背景切り抜きは自前 rembg ワーカー（/api/iei-photo/remove-background 経由）で処理します。人物生成は行いません。",
  );

/**
 * RunPod Serverless worker プロバイダー。
 *
 * クライアントからの呼び出し口は同じ Next.js Route Handler
 * `/api/iei-photo/remove-background`。サーバー側がプロバイダーを切り替える。
 * RunPod では画像を base64 で `RUNPOD_ENDPOINT_URL` に POST し、
 * `Authorization: Bearer ${RUNPOD_API_KEY}` を付与する想定（キーはサーバー側のみ）。
 *
 * TODO(runpod): Next.js Route Handler 側に RunPod 接続の実装を追加する
 * （file → base64 → POST {input:{image_base64,filename}} → output.image_base64 → PNG）。
 * 現状は型・宣言のみで、実 API 接続はしない。
 */
export const runpodServerlessWorkerBackgroundProvider: IeiPhotoBackgroundProvider =
  buildWorkerProvider(
    "runpod_serverless_worker",
    "背景切り抜きは RunPod Serverless（/api/iei-photo/remove-background 経由）で処理する予定です。人物生成は行いません。",
  );

/**
 * 互換用エイリアス（旧 `self_hosted_worker`）。
 * 既存参照を壊さないために残す。中身は HTTP worker と同じ。
 * @deprecated `selfHostedHttpWorkerBackgroundProvider` を使うこと。
 */
export const selfHostedWorkerBackgroundProvider: IeiPhotoBackgroundProvider =
  buildWorkerProvider(
    "self_hosted_worker",
    "背景切り抜きは自前 rembg ワーカー（/api/iei-photo/remove-background 経由）で処理します。人物生成は行いません。",
  );

const PROVIDERS: Partial<
  Record<IeiPhotoBackgroundProviderId, IeiPhotoBackgroundProvider>
> = {
  mock: mockBackgroundProvider,
  self_hosted_http_worker: selfHostedHttpWorkerBackgroundProvider,
  runpod_serverless_worker: runpodServerlessWorkerBackgroundProvider,
  self_hosted_worker: selfHostedWorkerBackgroundProvider, // 互換用
  // remove_bg_api / photoroom_api / external_background_api は将来実装。
};

/**
 * 現在有効な背景プロバイダー。
 * 既定は自前 FastAPI worker 方式（self_hosted_http_worker）。
 * RunPod へ切り替える場合は将来ここを runpod_serverless_worker に変更し、
 * Route Handler 側の接続実装（TODO）を有効化する。
 * 実通信は Next.js Route Handler 経由（background-client.ts はルートを呼ぶだけ）。
 */
export const ACTIVE_BACKGROUND_PROVIDER_ID: IeiPhotoBackgroundProviderId =
  "self_hosted_http_worker";

/**
 * 背景プロバイダーを取得する。未実装IDは mock にフォールバックする。
 * 実API接続は将来この関数の戻り値を差し替えて行う（ここではまだ接続しない）。
 */
export function getBackgroundProvider(
  id: IeiPhotoBackgroundProviderId = ACTIVE_BACKGROUND_PROVIDER_ID,
): IeiPhotoBackgroundProvider {
  return PROVIDERS[id] ?? mockBackgroundProvider;
}
