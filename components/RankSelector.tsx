import type { FuneralPlan } from "@/data/simulatorData";
import { taxModeLabels } from "@/data/simulatorData";
import { cn, formatYen } from "@/lib/simulatorUtils";

type RankSelectorProps = {
  plan: FuneralPlan;
  selectedRankId: string;
  onSelect: (rankId: string) => void;
};

export default function RankSelector({
  plan,
  selectedRankId,
  onSelect,
}: RankSelectorProps) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-700">ランク選択</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">
            {plan.displayName}のランク
          </h2>
        </div>
        <span className="w-fit rounded-full bg-stone-100 px-3 py-1 text-sm font-medium text-slate-700">
          {taxModeLabels[plan.taxMode]}
        </span>
      </div>

      <div className="grid gap-3 min-[420px]:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
        {plan.ranks.map((rank) => {
          const isSelected = rank.id === selectedRankId;

          return (
            <button
              key={rank.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(rank.id)}
              className={cn(
                "rounded-lg border p-4 text-left transition hover:border-amber-500 hover:bg-amber-50/40",
                "focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2",
                isSelected
                  ? "border-amber-600 bg-amber-50 shadow-sm"
                  : "border-stone-200 bg-white",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-lg font-semibold text-slate-950">
                  {rank.displayName}
                </span>
                {rank.recommended ? (
                  <span className="rounded-full bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white">
                    基本
                  </span>
                ) : null}
              </span>
              <span className="mt-2 block text-lg font-semibold text-slate-950">
                {formatYen(rank.price)}
              </span>
              <span className="mt-2 block text-sm leading-6 text-slate-600">
                {rank.description}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
