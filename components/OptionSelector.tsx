import Image from "next/image";
import {
  altarUpgrades,
  careOptions,
  coffinOptions,
  dryIceCostConfig,
  funeralMealOptions,
  restingCostConfig,
  serviceStaffConfig,
  singleFoodOptions,
  type AltarUpgrade,
  type OtherItemInput,
  type PriceOption,
  urnCoverOption,
  urnOptions,
  wakeMealOptions,
} from "@/data/simulatorData";
import { cn, formatYen } from "@/lib/simulatorUtils";

type OptionSelectorProps = {
  selectedCoffinId: string;
  onCoffinChange: (optionId: string) => void;
  selectedUrnId: string;
  onUrnChange: (optionId: string) => void;
  isUrnCoverSelected: boolean;
  onUrnCoverChange: (selected: boolean) => void;
  showAltarUpgrade: boolean;
  selectedAltarUpgradeId: string;
  selectedAltarDesignId: string | null;
  onAltarUpgradeChange: (upgradeId: string) => void;
  onAltarDesignChange: (designId: string) => void;
  selectedWakeMealId: string;
  wakeMealSets: number;
  onWakeMealChange: (optionId: string) => void;
  onWakeMealSetsChange: (sets: string) => void;
  selectedFuneralMealId: string;
  funeralMealPeople: number;
  onFuneralMealChange: (optionId: string) => void;
  onFuneralMealPeopleChange: (people: string) => void;
  singleFoodCounts: Record<string, number>;
  onSingleFoodCountChange: (optionId: string, quantity: string) => void;
  restingDays: number;
  onRestingDaysChange: (days: string) => void;
  dryIceDays: number;
  onDryIceDaysChange: (days: string) => void;
  selectedCareIds: string[];
  onCareToggle: (optionId: string) => void;
  otherItems: OtherItemInput[];
  onOtherItemChange: (
    index: number,
    field: keyof OtherItemInput,
    value: string,
  ) => void;
  wakeStaffCount: number;
  funeralStaffCount: number;
};

type OptionGridProps = {
  options: PriceOption[];
  selectedId: string;
  onSelect: (optionId: string) => void;
  columns?: "compact" | "wide";
};

function OptionGrid({
  options,
  selectedId,
  onSelect,
  columns = "compact",
}: OptionGridProps) {
  const hasImages = options.some((option) => option.image);

  return (
    <div
      className={cn(
        "grid gap-3",
        columns === "wide"
          ? "sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3"
          : "min-[420px]:grid-cols-2 md:grid-cols-1 xl:grid-cols-2",
      )}
    >
      {options.map((option) => {
        const isSelected = option.id === selectedId;

        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(option.id)}
            className={cn(
              "min-h-24 rounded-lg border p-3 text-left transition hover:border-amber-500 hover:bg-amber-50/40",
              "focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2",
              hasImages && "grid grid-cols-[82px_minmax(0,1fr)] gap-3",
              isSelected
                ? "border-amber-600 bg-amber-50 shadow-sm"
                : "border-stone-200 bg-white",
            )}
          >
            {hasImages ? (
              <span className="relative block h-20 overflow-hidden rounded-md bg-stone-100">
                {option.image ? (
                  <Image
                    src={option.image}
                    alt={option.name}
                    fill
                    unoptimized
                    className="object-contain p-2"
                    sizes="82px"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-xs font-semibold text-slate-400">
                    画像なし
                  </span>
                )}
              </span>
            ) : null}
            <span className="min-w-0 self-center">
              <span className="block text-base font-semibold text-slate-950">
                {option.name}
              </span>
              <span className="mt-1 block text-sm font-medium text-slate-700">
                {option.price > 0 ? formatYen(option.price) : "加算なし"}
              </span>
              {option.description ? (
                <span className="mt-2 block text-sm leading-6 text-slate-600">
                  {option.description}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

type NumberFieldProps = {
  id: string;
  label: string;
  value: number;
  disabled?: boolean;
  suffix: string;
  onChange: (value: string) => void;
};

function NumberField({
  id,
  label,
  value,
  disabled = false,
  suffix,
  onChange,
}: NumberFieldProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "mt-3 flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3",
        disabled && "opacity-60",
      )}
    >
      <span className="text-base font-semibold text-slate-800">{label}</span>
      <span className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          min={0}
          inputMode="numeric"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-24 rounded-lg border border-stone-300 bg-white px-3 text-right text-lg font-semibold text-slate-950 outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-200 disabled:bg-stone-100"
        />
        <span className="text-sm font-medium text-slate-600">{suffix}</span>
      </span>
    </label>
  );
}

function selectedOption(options: PriceOption[], selectedId: string) {
  return options.find((option) => option.id === selectedId) ?? options[0];
}

function AltarDesignGrid({
  upgrade,
  selectedDesignId,
  onSelect,
}: {
  upgrade: AltarUpgrade;
  selectedDesignId: string | null;
  onSelect: (designId: string) => void;
}) {
  const designs = upgrade.designs ?? [];

  if (designs.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <h4 className="text-base font-semibold text-slate-950">
        祭壇デザインを選択
      </h4>
      <div className="mt-3 grid gap-3 min-[430px]:grid-cols-2 xl:grid-cols-4">
        {designs.map((design) => {
          const isSelected = design.id === selectedDesignId;

          return (
            <button
              key={design.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(design.id)}
              className={cn(
                "rounded-lg border bg-white p-2 text-left transition hover:border-amber-500 hover:bg-amber-50/40",
                "focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2",
                isSelected
                  ? "border-amber-600 bg-amber-50 shadow-sm"
                  : "border-stone-200",
              )}
            >
              <span className="relative block aspect-[4/3] overflow-hidden rounded-md bg-stone-100">
                <Image
                  src={design.image}
                  alt={design.name}
                  fill
                  unoptimized
                  className="object-contain p-2"
                  sizes="(min-width: 1280px) 10vw, (min-width: 768px) 22vw, 45vw"
                />
              </span>
              <span className="mt-3 block text-sm font-semibold text-slate-950">
                {design.name}
              </span>
              {design.description ? (
                <span className="mt-1 block text-xs leading-5 text-slate-600">
                  {design.description}
                </span>
              ) : null}
              {design.priceAdjustment ? (
                <span className="mt-2 block text-xs font-semibold text-amber-700">
                  追加 {formatYen(design.priceAdjustment)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function OptionSelector({
  selectedCoffinId,
  onCoffinChange,
  selectedUrnId,
  onUrnChange,
  isUrnCoverSelected,
  onUrnCoverChange,
  showAltarUpgrade,
  selectedAltarUpgradeId,
  selectedAltarDesignId,
  onAltarUpgradeChange,
  onAltarDesignChange,
  selectedWakeMealId,
  wakeMealSets,
  onWakeMealChange,
  onWakeMealSetsChange,
  selectedFuneralMealId,
  funeralMealPeople,
  onFuneralMealChange,
  onFuneralMealPeopleChange,
  singleFoodCounts,
  onSingleFoodCountChange,
  restingDays,
  onRestingDaysChange,
  dryIceDays,
  onDryIceDaysChange,
  selectedCareIds,
  onCareToggle,
  otherItems,
  onOtherItemChange,
  wakeStaffCount,
  funeralStaffCount,
}: OptionSelectorProps) {
  const selectedWakeMeal = selectedOption(wakeMealOptions, selectedWakeMealId);
  const selectedFuneralMeal = selectedOption(
    funeralMealOptions,
    selectedFuneralMealId,
  );
  const selectedAltarUpgrade =
    altarUpgrades.find((upgrade) => upgrade.id === selectedAltarUpgradeId) ??
    altarUpgrades[0];
  const totalStaffCount = wakeStaffCount + funeralStaffCount;

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <p className="text-sm font-semibold text-amber-700">棺・骨壺</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">
            お納めする品を選択
          </h2>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="mb-3 text-base font-semibold text-slate-900">
              棺
            </h3>
            <OptionGrid
              options={coffinOptions}
              selectedId={selectedCoffinId}
              onSelect={onCoffinChange}
              columns="wide"
            />
          </div>

          <div>
            <h3 className="mb-3 text-base font-semibold text-slate-900">
              骨壺
            </h3>
            <OptionGrid
              options={urnOptions}
              selectedId={selectedUrnId}
              onSelect={onUrnChange}
              columns="wide"
            />
            <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 p-4 transition hover:border-amber-500">
              <input
                type="checkbox"
                checked={isUrnCoverSelected}
                onChange={(event) => onUrnCoverChange(event.target.checked)}
                className="h-5 w-5 accent-amber-700"
              />
              <span className="flex flex-1 flex-col gap-1">
                <span className="text-base font-semibold text-slate-950">
                  {urnCoverOption.name}
                </span>
                <span className="text-sm font-medium text-slate-700">
                  {formatYen(urnCoverOption.price)}
                </span>
              </span>
            </label>
          </div>
        </div>
      </div>

      {showAltarUpgrade ? (
        <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4">
            <p className="text-sm font-semibold text-amber-700">
              祭壇グレードアップ
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              祭壇の印象を調整
            </h2>
          </div>

          <OptionGrid
            options={altarUpgrades}
            selectedId={selectedAltarUpgradeId}
            onSelect={onAltarUpgradeChange}
            columns="wide"
          />

          <AltarDesignGrid
            upgrade={selectedAltarUpgrade}
            selectedDesignId={selectedAltarDesignId}
            onSelect={onAltarDesignChange}
          />
        </div>
      ) : null}

      <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <p className="text-sm font-semibold text-amber-700">料理</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">
            通夜料理・告別料理
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {serviceStaffConfig.description}
            {totalStaffCount > 0
              ? ` 現在の選択内容では配膳人 ${totalStaffCount}名を想定しています。`
              : " 料理数量が未入力の場合、配膳人は加算されません。"}
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="mb-3 text-base font-semibold text-slate-900">
              通夜料理
            </h3>
            <OptionGrid
              options={wakeMealOptions}
              selectedId={selectedWakeMealId}
              onSelect={onWakeMealChange}
              columns="wide"
            />
            <NumberField
              id="wake-meal-sets"
              label="セット数"
              value={wakeMealSets}
              disabled={selectedWakeMeal.price === 0}
              suffix="セット"
              onChange={onWakeMealSetsChange}
            />
            {wakeStaffCount > 0 ? (
              <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                配膳人 {wakeStaffCount}名
              </p>
            ) : null}
          </div>

          <div>
            <h3 className="mb-3 text-base font-semibold text-slate-900">
              告別料理
            </h3>
            <OptionGrid
              options={funeralMealOptions}
              selectedId={selectedFuneralMealId}
              onSelect={onFuneralMealChange}
              columns="wide"
            />
            <NumberField
              id="funeral-meal-people"
              label="人数"
              value={funeralMealPeople}
              disabled={selectedFuneralMeal.price === 0}
              suffix="名様分"
              onChange={onFuneralMealPeopleChange}
            />
            {funeralStaffCount > 0 ? (
              <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                配膳人 {funeralStaffCount}名
              </p>
            ) : null}
          </div>

          <div>
            <h3 className="mb-3 text-base font-semibold text-slate-900">
              単品料理
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
              {singleFoodOptions.map((option) => {
                const quantity = singleFoodCounts[option.id] ?? 0;

                return (
                  <div
                    key={option.id}
                    className="rounded-lg border border-stone-200 bg-stone-50 p-3"
                  >
                    <div className="grid grid-cols-[82px_minmax(0,1fr)] gap-3">
                      <div className="relative h-20 overflow-hidden rounded-md bg-white">
                        {option.image ? (
                          <Image
                            src={option.image}
                            alt={option.name}
                            fill
                            unoptimized
                            className="object-contain p-2"
                            sizes="82px"
                          />
                        ) : null}
                      </div>
                      <div>
                        <h4 className="text-base font-semibold text-slate-950">
                          {option.name}
                        </h4>
                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {formatYen(option.price)} / {option.unitLabel}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {option.description}
                        </p>
                      </div>
                    </div>
                    <NumberField
                      id={`single-food-${option.id}`}
                      label="数量"
                      value={quantity}
                      suffix={option.unitLabel}
                      onChange={(value) =>
                        onSingleFoodCountChange(option.id, value)
                      }
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <p className="text-sm font-semibold text-amber-700">
            安置・ドライアイス
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">
            日数を入力
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
            <div className="grid grid-cols-[82px_minmax(0,1fr)] gap-3">
              <div className="relative h-20 overflow-hidden rounded-md bg-white">
                <Image
                  src={restingCostConfig.image ?? "/images/options/resting.svg"}
                  alt={restingCostConfig.name}
                  fill
                  unoptimized
                  className="object-contain p-2"
                  sizes="82px"
                />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-950">
                  {restingCostConfig.name}
                </h3>
                <p className="mt-1 text-sm font-medium text-slate-700">
                  {formatYen(restingCostConfig.pricePerDay)} / 日
                </p>
                {restingCostConfig.description ? (
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {restingCostConfig.description}
                  </p>
                ) : null}
              </div>
            </div>
            <NumberField
              id="resting-days"
              label="日数"
              value={restingDays}
              suffix={restingCostConfig.unitLabel}
              onChange={onRestingDaysChange}
            />
          </div>

          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
            <div className="grid grid-cols-[82px_minmax(0,1fr)] gap-3">
              <div className="relative h-20 overflow-hidden rounded-md bg-white">
                <Image
                  src={dryIceCostConfig.image ?? "/images/options/dry-ice.svg"}
                  alt={dryIceCostConfig.name}
                  fill
                  unoptimized
                  className="object-contain p-2"
                  sizes="82px"
                />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-950">
                  {dryIceCostConfig.name}
                </h3>
                <p className="mt-1 text-sm font-medium text-slate-700">
                  {formatYen(dryIceCostConfig.pricePerDay)} / 日
                </p>
                {dryIceCostConfig.description ? (
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {dryIceCostConfig.description}
                  </p>
                ) : null}
              </div>
            </div>
            <NumberField
              id="dry-ice-days"
              label="日数"
              value={dryIceDays}
              suffix={dryIceCostConfig.unitLabel}
              onChange={onDryIceDaysChange}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <p className="text-sm font-semibold text-amber-700">
            湯灌・エンバーミング
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">
            ご希望のケアを選択
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
          {careOptions.map((option) => {
            const isSelected = selectedCareIds.includes(option.id);

            return (
              <label
                key={option.id}
                className={cn(
                  "grid cursor-pointer grid-cols-[82px_minmax(0,1fr)_auto] gap-3 rounded-lg border p-3 transition hover:border-amber-500 hover:bg-amber-50/40",
                  isSelected
                    ? "border-amber-600 bg-amber-50 shadow-sm"
                    : "border-stone-200 bg-white",
                )}
              >
                <span className="relative h-20 overflow-hidden rounded-md bg-stone-100">
                  {option.image ? (
                    <Image
                      src={option.image}
                      alt={option.name}
                      fill
                      unoptimized
                      className="object-contain p-2"
                      sizes="82px"
                    />
                  ) : null}
                </span>
                <span className="self-center">
                  <span className="block text-base font-semibold text-slate-950">
                    {option.name}
                  </span>
                  <span className="mt-1 block text-sm font-medium text-slate-700">
                    {formatYen(option.price)}
                  </span>
                  {option.description ? (
                    <span className="mt-2 block text-sm leading-6 text-slate-600">
                      {option.description}
                    </span>
                  ) : null}
                </span>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onCareToggle(option.id)}
                  className="mt-7 h-5 w-5 accent-amber-700"
                />
              </label>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <p className="text-sm font-semibold text-amber-700">その他</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">
            自由項目を追加
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            品名・単価・数量がすべて入力された項目だけ見積もりに反映します。
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
          {otherItems.map((item, index) => {
            const subtotal =
              item.name.trim() && item.price > 0 && item.quantity > 0
                ? item.price * item.quantity
                : 0;

            return (
              <div
                key={`other-${index}`}
                className="rounded-lg border border-stone-200 bg-stone-50 p-3"
              >
                <p className="mb-3 text-base font-semibold text-slate-950">
                  その他{index + 1}
                </p>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">
                    品名
                  </span>
                  <input
                    id={`other-${index}-name`}
                    type="text"
                    value={item.name}
                    onChange={(event) =>
                      onOtherItemChange(index, "name", event.target.value)
                    }
                    className="mt-1 h-12 w-full rounded-lg border border-stone-300 bg-white px-3 text-base font-medium text-slate-950 outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-200"
                    placeholder="例：追加搬送費"
                  />
                </label>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">
                      単価
                    </span>
                    <input
                      id={`other-${index}-price`}
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={item.price}
                      onChange={(event) =>
                        onOtherItemChange(index, "price", event.target.value)
                      }
                      className="mt-1 h-12 w-full rounded-lg border border-stone-300 bg-white px-3 text-right text-base font-semibold text-slate-950 outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-200"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">
                      数量
                    </span>
                    <input
                      id={`other-${index}-quantity`}
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={item.quantity}
                      onChange={(event) =>
                        onOtherItemChange(
                          index,
                          "quantity",
                          event.target.value,
                        )
                      }
                      className="mt-1 h-12 w-full rounded-lg border border-stone-300 bg-white px-3 text-right text-base font-semibold text-slate-950 outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-200"
                    />
                  </label>
                </div>
                {subtotal > 0 ? (
                  <p className="mt-3 rounded-lg bg-white p-3 text-right text-sm font-semibold text-slate-900">
                    小計 {formatYen(subtotal)}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
