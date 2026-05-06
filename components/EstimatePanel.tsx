import { estimateNotice, serviceStaffConfig } from "@/data/simulatorData";
import { formatYen } from "@/lib/simulatorUtils";

export type EstimateCareLine = {
  id: string;
  name: string;
  amount: number;
  image?: string;
};

export type EstimateSingleFoodLine = {
  id: string;
  name: string;
  quantity: number;
  unitLabel: string;
  servings: number;
  includeInServingStaffCalculation: boolean;
  unitPrice: number;
  amount: number;
  image?: string;
};

export type EstimateOtherLine = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

export type EstimateSummary = {
  planName: string;
  rankName: string;
  planAmount: number;
  taxLabel: string;
  memberDiscount: number;
  coffinName: string;
  coffinAmount: number;
  urnName: string;
  urnAmount: number;
  urnCoverName?: string;
  urnCoverAmount: number;
  isAltarUpgradeAvailable: boolean;
  altarUpgradeName?: string;
  altarUpgradeAmount: number;
  altarDesignName?: string;
  altarDesignAdjustment: number;
  wakeMealName: string;
  wakeMealSets: number;
  wakeMealPeople: number;
  wakeMealAmount: number;
  wakeMealServingsForStaff: number;
  singleFoodLines: EstimateSingleFoodLine[];
  singleFoodAmount: number;
  wakeStaffCount: number;
  wakeStaffUnitPrice: number;
  wakeStaffAmount: number;
  funeralMealName: string;
  funeralMealPeople: number;
  funeralMealAmount: number;
  funeralMealHallFeeName?: string;
  funeralMealHallFeeAmount: number;
  funeralStaffCount: number;
  funeralStaffUnitPrice: number;
  funeralStaffAmount: number;
  restingDays: number;
  restingUnitPrice: number;
  restingAmount: number;
  dryIceDays: number;
  dryIceUnitPrice: number;
  dryIceAmount: number;
  careLines: EstimateCareLine[];
  careTotal: number;
  otherLines: EstimateOtherLine[];
  otherAmount: number;
  actualCostAmount: number;
  total: number;
};

type EstimatePanelProps = {
  estimate: EstimateSummary;
};

function amountLabel(amount: number) {
  return amount < 0 ? `-${formatYen(Math.abs(amount))}` : formatYen(amount);
}

function EstimateLine({
  label,
  detail,
  amount,
}: {
  label: string;
  detail: string;
  amount?: number;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-stone-100 py-3 last:border-b-0">
      <div>
        <dt className="text-sm font-semibold text-slate-500">{label}</dt>
        <dd className="mt-1 text-base font-medium leading-6 text-slate-900">
          {detail}
        </dd>
      </div>
      {typeof amount === "number" ? (
        <dd className="self-center text-right text-base font-semibold text-slate-950">
          {amountLabel(amount)}
        </dd>
      ) : null}
    </div>
  );
}

function staffDetail(unitPrice: number, count: number) {
  return `単価${formatYen(unitPrice)} × ${count}名`;
}

export default function EstimatePanel({ estimate }: EstimatePanelProps) {
  const altarAmount =
    estimate.altarUpgradeAmount + estimate.altarDesignAdjustment;
  const altarName =
    estimate.altarDesignName ?? estimate.altarUpgradeName ?? "プラン内祭壇";

  return (
    <section
      id="estimate"
      className="rounded-lg border border-stone-200 bg-white shadow-sm"
    >
      <div className="border-b border-stone-200 bg-slate-950 px-4 py-4 text-white sm:px-5">
        <p className="text-sm font-semibold text-amber-200">概算見積もり</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-2xl font-semibold">現在の概算合計</h2>
          <p className="text-3xl font-semibold tracking-normal">
            {formatYen(estimate.total)}
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <dl>
          <EstimateLine
            label="プラン料金"
            detail={`${estimate.planName} ${estimate.rankName}（${estimate.taxLabel}）`}
            amount={estimate.planAmount}
          />

          {estimate.memberDiscount > 0 ? (
            <EstimateLine
              label="会員割引"
              detail="事前相談会員登録あり"
              amount={-estimate.memberDiscount}
            />
          ) : null}

          {estimate.isAltarUpgradeAvailable ? (
            <EstimateLine label="祭壇" detail={altarName} amount={altarAmount} />
          ) : (
            <EstimateLine label="祭壇" detail="祭壇なしプラン" />
          )}

          {estimate.wakeMealAmount > 0 ? (
            <EstimateLine
              label="通夜料理"
              detail={`${estimate.wakeMealName} × ${estimate.wakeMealSets}セット（${estimate.wakeMealPeople}名分）`}
              amount={estimate.wakeMealAmount}
            />
          ) : null}

          {estimate.singleFoodLines.map((line) => (
            <EstimateLine
              key={line.id}
              label="単品料理"
              detail={`${line.name} ${formatYen(line.unitPrice)} × ${line.quantity}${line.unitLabel}`}
              amount={line.amount}
            />
          ))}

          {estimate.wakeStaffAmount > 0 ? (
            <EstimateLine
              label="通夜料理 配膳人"
              detail={staffDetail(
                estimate.wakeStaffUnitPrice,
                estimate.wakeStaffCount,
              )}
              amount={estimate.wakeStaffAmount}
            />
          ) : null}

          {estimate.funeralMealAmount > 0 ? (
            <EstimateLine
              label="告別料理"
              detail={`${estimate.funeralMealName} × ${estimate.funeralMealPeople}名様分`}
              amount={estimate.funeralMealAmount}
            />
          ) : null}

          {estimate.funeralMealHallFeeAmount > 0 &&
          estimate.funeralMealHallFeeName ? (
            <EstimateLine
              label="告別料理"
              detail={estimate.funeralMealHallFeeName}
              amount={estimate.funeralMealHallFeeAmount}
            />
          ) : null}

          {estimate.funeralStaffAmount > 0 ? (
            <EstimateLine
              label="告別料理 配膳人"
              detail={staffDetail(
                estimate.funeralStaffUnitPrice,
                estimate.funeralStaffCount,
              )}
              amount={estimate.funeralStaffAmount}
            />
          ) : null}

          <EstimateLine
            label="棺"
            detail={estimate.coffinName}
            amount={estimate.coffinAmount}
          />

          <EstimateLine
            label="骨壺"
            detail={estimate.urnName}
            amount={estimate.urnAmount}
          />

          {estimate.urnCoverAmount > 0 && estimate.urnCoverName ? (
            <EstimateLine
              label="壺覆い変更"
              detail={estimate.urnCoverName}
              amount={estimate.urnCoverAmount}
            />
          ) : null}

          {estimate.restingAmount > 0 ? (
            <EstimateLine
              label="安置日数"
              detail={`${estimate.restingDays}日 × ${formatYen(
                estimate.restingUnitPrice,
              )}`}
              amount={estimate.restingAmount}
            />
          ) : null}

          {estimate.dryIceAmount > 0 ? (
            <EstimateLine
              label="ドライアイス日数"
              detail={`${estimate.dryIceDays}日 × ${formatYen(
                estimate.dryIceUnitPrice,
              )}`}
              amount={estimate.dryIceAmount}
            />
          ) : null}

          {estimate.careLines.map((line) => (
            <EstimateLine
              key={line.id}
              label="湯灌・エンバーミング"
              detail={line.name}
              amount={line.amount}
            />
          ))}

          {estimate.otherLines.map((line) => (
            <EstimateLine
              key={line.id}
              label="その他"
              detail={`${line.name} 単価${formatYen(line.unitPrice)} × ${line.quantity}個`}
              amount={line.amount}
            />
          ))}
        </dl>

        <div className="mt-5 rounded-lg bg-amber-50 p-4">
          <p className="text-sm leading-6 text-slate-700">
            {estimateNotice}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {serviceStaffConfig.description}
            {estimate.wakeStaffCount + estimate.funeralStaffCount > 0
              ? ` 現在の選択内容では配膳人 ${
                  estimate.wakeStaffCount + estimate.funeralStaffCount
                }名を想定しています。`
              : ""}
          </p>
        </div>
      </div>
    </section>
  );
}
