import type { FuneralPlan } from "@/data/simulatorData";
import { taxModeLabels } from "@/data/simulatorData";
import { cn, formatYen } from "@/lib/simulatorUtils";

type PlanSelectorProps = {
  plans: FuneralPlan[];
  selectedPlanId: string;
  onSelect: (planId: string) => void;
};

export default function PlanSelector({
  plans,
  selectedPlanId,
  onSelect,
}: PlanSelectorProps) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <p className="text-sm font-semibold text-amber-700">プラン選択</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-950">
          ご希望のお見送りを選択
        </h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
        {plans.map((plan) => {
          const isSelected = plan.id === selectedPlanId;
          const startingPrice = plan.ranks.at(-1)?.price ?? plan.ranks[0]?.price ?? 0;

          return (
            <button
              key={plan.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(plan.id)}
              className={cn(
                "rounded-lg border p-4 text-left transition hover:border-amber-500 hover:bg-amber-50/40",
                "focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2",
                isSelected
                  ? "border-amber-600 bg-amber-50 shadow-sm"
                  : "border-stone-200 bg-white",
              )}
            >
              <span className="block text-base font-semibold text-slate-950">
                {plan.name}
              </span>
              <span className="mt-1 block text-sm text-slate-600">
                {plan.displayName}
              </span>
              <span className="mt-3 block text-sm leading-6 text-slate-700">
                {plan.description}
              </span>
              <span className="mt-3 inline-flex rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold text-white">
                {formatYen(startingPrice)}から {taxModeLabels[plan.taxMode]}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
