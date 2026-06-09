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
  | "remove_bg_api" // 将来: remove.bg 等
  | "photoroom_api" // 将来: PhotoRoom 等
  | "external_background_api" // 将来: その他の背景処理API
  | "self_hosted_worker"; // 将来: 自前GPUワーカー / ComfyUI 等

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

const PROVIDERS: Partial<
  Record<IeiPhotoBackgroundProviderId, IeiPhotoBackgroundProvider>
> = {
  mock: mockBackgroundProvider,
  // remove_bg_api / photoroom_api / external_background_api / self_hosted_worker は将来実装。
};

/** 現在有効な背景プロバイダー（現状は mock 固定）。 */
export const ACTIVE_BACKGROUND_PROVIDER_ID: IeiPhotoBackgroundProviderId = "mock";

/**
 * 背景プロバイダーを取得する。未実装IDは mock にフォールバックする。
 * 実API接続は将来この関数の戻り値を差し替えて行う（ここではまだ接続しない）。
 */
export function getBackgroundProvider(
  id: IeiPhotoBackgroundProviderId = ACTIVE_BACKGROUND_PROVIDER_ID,
): IeiPhotoBackgroundProvider {
  return PROVIDERS[id] ?? mockBackgroundProvider;
}
