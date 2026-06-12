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

  // 進行番号は区切り（note）を除いて採番する（描画中の変数再代入を避けるため純粋に算出）
  const stepNumbers = sections.map((s, i) =>
    s.kind === "note"
      ? null
      : sections.slice(0, i + 1).filter((x) => x.kind !== "note").length,
  );

  return (
    <div className="grid gap-3">
      {sections.map((section, index) => {
        // 日付区切り（通夜・告別式の統合台本）は見出しバーで表示
        if (section.kind === "note") {
          return (
            <div
              key={section.id}
              className="mt-2 rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white"
            >
              {section.title}
              {section.body && (
                <span className="ml-2 text-xs font-normal text-slate-300">
                  {section.body}
                </span>
              )}
            </div>
          );
        }
        const isAiSlot =
          section.kind === "ai_placeholder" || section.aiGenerated;
        const isGenerated = Boolean(section.aiGenerated);
        return (
          <article
            key={section.id}
            className={cn(
              "rounded-lg border p-4 shadow-sm sm:p-5",
              isGenerated
                ? "border-emerald-300 bg-emerald-50/50"
                : isAiSlot
                  ? "border-amber-300 bg-amber-50/60"
                  : "border-stone-200 bg-white",
            )}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-800 px-2 text-xs font-semibold text-white">
                {stepNumbers[index]}
              </span>
              <h3 className="text-base font-semibold text-slate-950">
                {section.title}
              </h3>
              {isGenerated ? (
                <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                  AI生成済み
                </span>
              ) : (
                isAiSlot && (
                  <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-800">
                    AI生成予定
                  </span>
                )
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
