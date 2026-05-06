import { contactInfo } from "@/data/simulatorData";
import { cn, formatYen } from "@/lib/simulatorUtils";

type FixedCTAProps = {
  total: number;
  variant: "mobile" | "desktop";
  onCreatePdf: () => void;
  isGenerating?: boolean;
};

export default function FixedCTA({
  total,
  variant,
  onCreatePdf,
  isGenerating = false,
}: FixedCTAProps) {
  const phoneHref = `tel:${contactInfo.phone.replaceAll("-", "")}`;

  return (
    <div
      className={cn(
        variant === "mobile"
          ? "fixed inset-x-0 bottom-0 z-50 border-t border-stone-200 bg-white/95 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-10px_30px_rgba(15,23,42,0.12)] backdrop-blur md:hidden"
          : "hidden rounded-lg border border-stone-200 bg-white p-4 shadow-sm md:block",
      )}
    >
      <div className={cn("mx-auto max-w-6xl", variant === "desktop" && "mx-0")}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-slate-600">概算合計</span>
          <span className="text-xl font-semibold text-slate-950">
            {formatYen(total)}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCreatePdf}
            disabled={isGenerating}
            className="flex min-h-12 items-center justify-center rounded-lg bg-amber-600 px-4 text-center text-base font-semibold text-white transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2"
          >
            {isGenerating ? "PDF作成中" : "PDFを作成する"}
          </button>
          <a
            href={phoneHref}
            className="flex min-h-12 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-center text-base font-semibold text-slate-950 transition hover:border-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
          >
            電話する
          </a>
        </div>
        <p className="mt-2 text-center text-xs font-medium text-slate-500">
          {contactInfo.phone}
        </p>
      </div>
    </div>
  );
}
