"use client";

import { cn } from "@/lib/simulatorUtils";
import {
  buildOriginalLetterFooter,
  buildOriginalLetterPrintSpec,
  detectOriginalLetterWarnings,
  normalizeOriginalLetterBody,
  originalLetterCharCount,
} from "@/lib/funeral-script/original-letter";
import type {
  FuneralScriptFormData,
  FuneralScriptOriginalLetter,
} from "@/lib/funeral-script/types";

type FuneralScriptOriginalLetterPanelProps = {
  form: FuneralScriptFormData;
  letter: FuneralScriptOriginalLetter | null;
  loading: boolean;
  error: string | null;
  warnings: string[];
  copied: boolean;
  onEditBody: (body: string) => void;
  onRegenerate: () => void;
  onCopy: () => void;
};

export default function FuneralScriptOriginalLetterPanel({
  form,
  letter,
  loading,
  error,
  warnings,
  copied,
  onEditBody,
  onRegenerate,
  onCopy,
}: FuneralScriptOriginalLetterPanelProps) {
  if (!form.hasOriginalCondolenceLetter) return null;

  if (!letter) {
    return (
      <section className="rounded-lg border border-dashed border-stone-300 bg-white p-5 text-sm text-slate-500">
        オリジナル会葬礼状は「台本を生成する」で初稿を作成します。
      </section>
    );
  }

  const localWarnings = detectOriginalLetterWarnings(letter.body);
  const allWarnings = Array.from(new Set([...warnings, ...localWarnings]));
  const normalizedBody = normalizeOriginalLetterBody(letter.body);
  const charCount = originalLetterCharCount(letter.body);

  return (
    <section className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-slate-950">
              オリジナル会葬礼状
            </h2>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
              印刷会社提出用
            </span>
            {letter.aiGenerated && (
              <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                AI生成済み
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            本文 {charCount}字 ／ 縦書き想定
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={loading}
            className={cn(
              "rounded-md bg-slate-800 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-900",
              "focus:outline-none focus:ring-2 focus:ring-slate-700 focus:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            {loading ? "再生成しています..." : "礼状だけ再生成"}
          </button>
          <button
            type="button"
            onClick={onCopy}
            disabled={loading}
            className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copied ? "コピーしました" : "提出用テキストをコピー"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      {allWarnings.length > 0 && (
        <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2">
          <p className="text-xs font-semibold text-amber-800">
            確認してください（{allWarnings.length}件）
          </p>
          <ul className="mt-1 list-disc pl-5 text-xs leading-5 text-slate-700">
            {allWarnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">本文</span>
            <textarea
              value={letter.body}
              onChange={(e) => onEditBody(e.target.value)}
              rows={Math.max(9, letter.body.split("\n").length + 2)}
              className="mt-1 w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2 text-sm leading-7 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </label>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="border-t border-stone-200 pt-3">
              <h3 className="text-sm font-semibold text-slate-800">仕様</h3>
              <pre className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">
                {buildOriginalLetterPrintSpec(form, letter)}
              </pre>
            </div>
            <div className="border-t border-stone-200 pt-3">
              <h3 className="text-sm font-semibold text-slate-800">差出人</h3>
              <pre className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">
                {buildOriginalLetterFooter(form)}
              </pre>
            </div>
          </div>
        </div>

        <div className="min-h-[360px] border border-stone-300 bg-[#fbfaf7] p-4">
          <div
            className="mx-auto h-[330px] max-w-full overflow-hidden text-sm leading-7 text-slate-900"
            style={{
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              fontFamily:
                '"Hiragino Mincho ProN", "Yu Mincho", "YuMincho", serif',
            }}
          >
            <p className="whitespace-pre-wrap">{normalizedBody}</p>
            <p className="mt-8 whitespace-pre-wrap text-xs leading-6">
              {buildOriginalLetterFooter(form)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
