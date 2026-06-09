"use client";

import type { IeiPhotoAdjustments } from "@/lib/iei-photo/types";
import {
  IEI_PHOTO_ADJUSTMENT_RANGES,
  IEI_PHOTO_ADJUSTMENT_SLIDERS,
  type IeiPhotoAdjustmentKey,
} from "@/lib/iei-photo/adjustments";

type IeiPhotoAdjustmentPanelProps = {
  adjustments: IeiPhotoAdjustments;
  onChange: (key: IeiPhotoAdjustmentKey, value: number) => void;
  onReset: () => void;
  disabled?: boolean;
};

/**
 * 手動補正パネル（明るさ・コントラスト・彩度・拡大率・横位置・縦位置・リセット）。
 * すべてブラウザ内 Canvas で適用される値で、AI 生成は行わない。
 */
export default function IeiPhotoAdjustmentPanel({
  adjustments,
  onChange,
  onReset,
  disabled = false,
}: IeiPhotoAdjustmentPanelProps) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-amber-700">手動補正</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">
            明るさ・色味・切り抜き位置の調整
          </h2>
        </div>
        <button
          type="button"
          onClick={onReset}
          disabled={disabled}
          className="shrink-0 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          リセット
        </button>
      </div>

      <p className="mb-4 rounded-md bg-stone-50 px-3 py-2 text-xs leading-5 text-slate-600">
        この補正はAI生成ではありません。元写真のピクセルを使い、明るさ・色味・切り抜き位置のみを調整します。
      </p>

      <div className="grid gap-4">
        {IEI_PHOTO_ADJUSTMENT_SLIDERS.map((slider) => {
          const key = slider.key as IeiPhotoAdjustmentKey;
          const range = IEI_PHOTO_ADJUSTMENT_RANGES[key];
          const value = adjustments[key];
          const isOffset = key === "offsetX" || key === "offsetY";
          // 位置は符号付き（例: +10 / -8）、その他は単位付き（例: 105%）
          const valueLabel = isOffset
            ? `${value > 0 ? "+" : ""}${value}`
            : `${value}${slider.unit}`;

          return (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between">
                <label
                  htmlFor={`iei-adjust-${key}`}
                  className="text-sm font-semibold text-slate-700"
                >
                  {slider.label}
                </label>
                <span className="text-xs font-semibold tabular-nums text-slate-600">
                  {valueLabel}
                </span>
              </div>
              <input
                id={`iei-adjust-${key}`}
                type="range"
                min={range.min}
                max={range.max}
                step={range.step}
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(key, Number(e.target.value))}
                className="w-full accent-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
