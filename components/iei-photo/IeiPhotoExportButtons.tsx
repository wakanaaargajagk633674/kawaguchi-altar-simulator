"use client";

import { cn } from "@/lib/simulatorUtils";
import type { IeiPhotoExports } from "@/lib/iei-photo/types";
import {
  IEI_PHOTO_EXPORT_ORDER,
  IEI_PHOTO_EXPORT_SIZES,
} from "@/lib/iei-photo/export-sizes";

type IeiPhotoExportButtonsProps = {
  /** 出力結果。各値が null の場合はまだ生成されていない（MVP では常に null） */
  exports: IeiPhotoExports | null;
  /** 出力ボタンを操作できるか（処理完了後に有効化） */
  enabled: boolean;
  onExport: (kind: keyof IeiPhotoExports) => void;
};

/**
 * 出力ボタン（基準写真 / 手札 / 四つ切り / 16:9モニター用）。
 * MVP では実画像が無いため、押下しても結果は null（未実装）である旨を扱う。
 */
export default function IeiPhotoExportButtons({
  exports,
  enabled,
  onExport,
}: IeiPhotoExportButtonsProps) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <p className="text-sm font-semibold text-amber-700">出力</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-950">
          サイズを選んで出力
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          まず基準写真を作成し、手札・四つ切り・16:9 はそこから切り出します（出力処理は未実装）。
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {IEI_PHOTO_EXPORT_ORDER.map((kind) => {
          const size = IEI_PHOTO_EXPORT_SIZES[kind];
          const ready = Boolean(exports?.[kind]);

          return (
            <button
              key={kind}
              type="button"
              disabled={!enabled}
              onClick={() => onExport(kind)}
              className={cn(
                "rounded-lg border p-4 text-left transition",
                "focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2",
                enabled
                  ? "border-stone-200 bg-white hover:border-amber-500 hover:bg-amber-50/40"
                  : "cursor-not-allowed border-stone-200 bg-stone-50 opacity-60",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-base font-semibold text-slate-950">
                  {size.label}
                </span>
                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
                  {size.aspectRatio}
                </span>
              </span>
              <span className="mt-2 block text-xs leading-5 text-slate-600">
                {size.description}
              </span>
              <span className="mt-2 block text-xs font-semibold text-slate-400">
                {ready ? "出力可能" : "未生成（実装後に出力されます）"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
