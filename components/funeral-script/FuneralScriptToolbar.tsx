"use client";

import { cn } from "@/lib/simulatorUtils";
import { PRINT_SIZE_LABELS } from "@/lib/funeral-script/format";
import type { FuneralScriptPrintSize } from "@/lib/funeral-script/types";

type FuneralScriptToolbarProps = {
  printSize: FuneralScriptPrintSize;
  onPrintSizeChange: (size: FuneralScriptPrintSize) => void;
  onCopy: () => void;
  onPrint: () => void;
  copied: boolean;
  disabled: boolean;
};

/**
 * 台本プレビューの操作バー（コピー・印刷・文字サイズ）。印刷時は非表示（.no-print）。
 */
export default function FuneralScriptToolbar({
  printSize,
  onPrintSizeChange,
  onCopy,
  onPrint,
  copied,
  disabled,
}: FuneralScriptToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-1">
        <span className="text-xs font-medium text-slate-600">文字サイズ</span>
        <div className="inline-flex overflow-hidden rounded-md border border-stone-300">
          {(Object.keys(PRINT_SIZE_LABELS) as FuneralScriptPrintSize[]).map(
            (size) => (
              <button
                key={size}
                type="button"
                onClick={() => onPrintSizeChange(size)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition",
                  size === printSize
                    ? "bg-amber-600 text-white"
                    : "bg-white text-slate-700 hover:bg-amber-50",
                )}
              >
                {PRINT_SIZE_LABELS[size]}
              </button>
            ),
          )}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onCopy}
          disabled={disabled}
          className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {copied ? "コピーしました" : "全文をコピー"}
        </button>
        <button
          type="button"
          onClick={onPrint}
          disabled={disabled}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          印刷 / PDF
        </button>
      </div>
    </div>
  );
}
