"use client";

import { cn } from "@/lib/simulatorUtils";
import { IEI_PHOTO_BACKGROUND_OPTIONS } from "@/lib/iei-photo/backgrounds";
import type {
  IeiPhotoBackgroundSettings,
  IeiPhotoBackgroundType,
} from "@/lib/iei-photo/types";

type IeiPhotoBackgroundPanelProps = {
  settings: IeiPhotoBackgroundSettings;
  onChangeType: (type: IeiPhotoBackgroundType) => void;
  /** 背景切り抜き（未接続。押すと未実装メッセージを表示） */
  onRemoveBackground: () => void;
  disabled?: boolean;
};

/**
 * 背景設定パネル。
 * - 背景タイプの選択（余白・16:9 余白・将来の背景合成に使う）
 * - 背景切り抜き: 未接続（将来API接続予定）
 * - 背景差し替えプレビュー: 現在はモック
 * 人物の描き直しは行わない。
 */
export default function IeiPhotoBackgroundPanel({
  settings,
  onChangeType,
  onRemoveBackground,
  disabled = false,
}: IeiPhotoBackgroundPanelProps) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3">
        <p className="text-sm font-semibold text-amber-700">背景設定</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-950">
          背景タイプを選択
        </h2>
      </div>

      {/* 背景タイプ */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {IEI_PHOTO_BACKGROUND_OPTIONS.map((option) => {
          const isActive = option.type === settings.type;
          return (
            <button
              key={option.type}
              type="button"
              aria-pressed={isActive}
              disabled={disabled}
              onClick={() => onChangeType(option.type)}
              className={cn(
                "flex items-center gap-2 rounded-lg border p-2 text-left text-sm font-semibold transition",
                "focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-60",
                isActive
                  ? "border-amber-600 bg-amber-50 text-slate-950"
                  : "border-stone-200 bg-white text-slate-700 hover:bg-stone-50",
              )}
            >
              <span
                aria-hidden="true"
                className="h-6 w-6 shrink-0 rounded border border-stone-300"
                style={{ background: option.swatchCss }}
              />
              {option.label}
            </button>
          );
        })}
      </div>

      {/* 背景切り抜き（未接続） */}
      <div className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">背景切り抜き</p>
          <p className="text-xs text-slate-500">未接続 / 将来API接続予定</p>
        </div>
        <button
          type="button"
          onClick={onRemoveBackground}
          disabled={disabled}
          className="shrink-0 rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          背景を切り抜く
        </button>
      </div>

      {/* 背景差し替えプレビュー（モック） */}
      <p className="mt-3 text-xs text-slate-500">
        背景差し替えプレビュー: 現在はモックです。
      </p>

      <p className="mt-3 rounded-md bg-stone-50 px-3 py-2 text-[11px] leading-5 text-slate-500">
        現在のMVPでは、背景切り抜きAPIは未接続です。背景タイプは余白や将来の背景差し替えに使われます。人物の描き直しは行いません。
      </p>
    </section>
  );
}
