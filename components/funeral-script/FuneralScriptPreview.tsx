"use client";

import { cn } from "@/lib/simulatorUtils";
import { printBodyTextClass } from "@/lib/funeral-script/format";
import type {
  FuneralScriptPrintSize,
  FuneralScriptSection,
} from "@/lib/funeral-script/types";

type FuneralScriptPreviewProps = {
  sections: FuneralScriptSection[];
  printSize: FuneralScriptPrintSize;
  onEditBody: (id: string, body: string) => void;
};

/**
 * 画面上の対話プレビュー。
 * - 各セクションを見出し付きで表示し、本文はテキストエリアで編集できる。
 * - AI生成予定（ai_placeholder）は薄い背景で区別表示。
 * - 司会者メモ（note）は読み上げ対象外として注記表示。
 * このコンポーネントは画面用。印刷は FuneralScriptPrintView が担当する。
 */
export default function FuneralScriptPreview({
  sections,
  printSize,
  onEditBody,
}: FuneralScriptPreviewProps) {
  if (sections.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-slate-500">
        左のフォームを入力し、「台本を生成する」を押すと、ここに台本が表示されます。
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {sections.map((section, index) => {
        const isAi = section.kind === "ai_placeholder" || section.aiGenerated;
        return (
          <article
            key={section.id}
            className={cn(
              "rounded-lg border p-4 shadow-sm sm:p-5",
              isAi
                ? "border-amber-300 bg-amber-50/60"
                : "border-stone-200 bg-white",
            )}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-800 px-2 text-xs font-semibold text-white">
                {index + 1}
              </span>
              <h3 className="text-base font-semibold text-slate-950">
                {section.title}
              </h3>
              {isAi && (
                <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  AI生成予定
                </span>
              )}
            </div>

            <textarea
              value={section.body}
              onChange={(e) => onEditBody(section.id, e.target.value)}
              rows={Math.max(2, section.body.split("\n").length)}
              className={cn(
                "w-full resize-y rounded-md border border-stone-200 bg-white px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500",
                printBodyTextClass(printSize),
              )}
            />

            {section.note && (
              <p className="mt-2 rounded-md bg-slate-100 px-3 py-2 text-xs leading-5 text-slate-600">
                〔司会者メモ〕{section.note}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
