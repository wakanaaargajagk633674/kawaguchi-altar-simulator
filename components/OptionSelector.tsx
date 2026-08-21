"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  altarUpgrades,
  careOptions,
  coffinOptions,
  dryIceCostConfig,
  funeralMealOptions,
  returnGifts,
  restingCostConfig,
  serviceStaffConfig,
  singleFoodOptions,
  type AltarUpgrade,
  type OtherItemInput,
  type PriceOption,
  type ReturnGiftInput,
  urnCoverOption,
  urnOptions,
  wakeMealConfig,
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
  returnGiftInputs: ReturnGiftInput[];
  onReturnGiftChange: (
    giftId: string,
    field: keyof Omit<ReturnGiftInput, "id">,
    value: string,
  ) => void;
  restingDays: number;
  onRestingDaysChange: (days: string) => void;
  dryIceDays: number;
  onDryIceDaysChange: (days: string) => void;
  selectedCareIds: string[];
  onCareToggle: (optionId: string) => void;
  otherItems: OtherItemInput[];
  visibleOtherItemCount: number;
  onAddOtherItem: () => void;
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

/** 数量の増減。行の中に収まる小さめのステッパー。 */
function QuantityStepper({
  id,
  label,
  value,
  unitLabel,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  unitLabel: string;
  onChange: (value: string) => void;
}) {
  const buttonClass =
    "h-9 w-9 shrink-0 rounded-md border border-stone-300 bg-white text-lg font-bold text-slate-700 transition hover:border-amber-500 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-600 disabled:opacity-40";

  return (
    <span className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        aria-label={`${label}を1${unitLabel}減らす`}
        disabled={value <= 0}
        onClick={() => onChange(String(Math.max(0, value - 1)))}
        className={buttonClass}
      >
        −
      </button>
      <input
        id={id}
        type="number"
        min={0}
        inputMode="numeric"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-12 rounded-md border border-stone-300 bg-white px-1 text-center text-base font-semibold text-slate-950 outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-200"
      />
      <button
        type="button"
        aria-label={`${label}を1${unitLabel}増やす`}
        onClick={() => onChange(String(value + 1))}
        className={buttonClass}
      >
        ＋
      </button>
    </span>
  );
}

/** 画像・名称・単価・数量を1行にまとめた省スペース行。 */
function QuantityRow({
  image,
  name,
  priceLabel,
  quantity,
  unitLabel,
  inputId,
  onQuantityChange,
  children,
}: {
  image?: string;
  name: string;
  priceLabel: string;
  quantity: number;
  unitLabel: string;
  inputId: string;
  onQuantityChange: (value: string) => void;
  children?: React.ReactNode;
}) {
  const isActive = quantity > 0;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-2 transition",
        isActive
          ? "border-amber-600 bg-amber-50 shadow-sm"
          : "border-stone-200 bg-white",
      )}
    >
      <span className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-md bg-stone-100">
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            unoptimized
            className="object-cover"
            sizes="56px"
          />
        ) : null}
      </span>
      <span className="block min-w-0 flex-1">
        <span className="line-clamp-2 block text-sm font-semibold leading-5 text-slate-950">
          {name}
        </span>
        <span className="mt-0.5 block text-sm font-medium text-slate-700">
          {priceLabel}
        </span>
        {children}
      </span>
      <QuantityStepper
        id={inputId}
        label={`${name}の数量`}
        value={quantity}
        unitLabel={unitLabel}
        onChange={onQuantityChange}
      />
    </div>
  );
}

/** 通夜料理・告別料理などの単一選択。写真タイルを並べて縦の長さを抑える。 */
function PickerGrid({
  options,
  selectedId,
  onSelect,
}: {
  options: PriceOption[];
  selectedId: string;
  onSelect: (optionId: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
      {options.map((option) => {
        const isSelected = option.id === selectedId;

        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(option.id)}
            className={cn(
              "rounded-lg border p-2 text-left transition hover:border-amber-500 hover:bg-amber-50/40",
              "focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2",
              isSelected
                ? "border-amber-600 bg-amber-50 shadow-sm"
                : "border-stone-200 bg-white",
            )}
          >
            <span className="relative block aspect-[4/3] overflow-hidden rounded-md bg-stone-100">
              {option.image ? (
                <Image
                  src={option.image}
                  alt={option.name}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="(min-width: 1280px) 12vw, (min-width: 640px) 20vw, 45vw"
                />
              ) : (
                <span className="flex h-full items-center justify-center text-sm font-semibold text-slate-500">
                  選択しない
                </span>
              )}
            </span>
            <span className="mt-2 line-clamp-2 block text-sm font-semibold leading-5 text-slate-950">
              {option.name}
            </span>
            <span className="mt-1 block text-sm font-bold text-amber-800">
              {option.price > 0 ? formatYen(option.price) : "加算なし"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** 項目数が多いブロックを折りたたむ。 */
function Collapsible({
  title,
  summary,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  summary: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-left transition hover:border-amber-500 hover:bg-amber-50/60 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2"
      >
        <span className="min-w-0">
          <span className="block text-base font-semibold text-slate-900">
            {title}
          </span>
          <span className="block text-sm font-medium text-slate-600">
            {summary}
          </span>
        </span>
        <span className="shrink-0 text-sm font-semibold text-amber-800">
          {isOpen ? "閉じる ▲" : "開く ▼"}
        </span>
      </button>
      {isOpen ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

const giftPriceBands = [
  { id: "all", label: "すべて", min: 0, max: Number.POSITIVE_INFINITY },
  { id: "b2", label: "〜2,999円", min: 0, max: 2999 },
  { id: "b3", label: "3,000円台", min: 3000, max: 3999 },
  { id: "b4", label: "4,000円台", min: 4000, max: 4999 },
  { id: "b5", label: "5,000円〜", min: 5000, max: Number.POSITIVE_INFINITY },
] as const;

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
  returnGiftInputs,
  onReturnGiftChange,
  restingDays,
  onRestingDaysChange,
  dryIceDays,
  onDryIceDaysChange,
  selectedCareIds,
  onCareToggle,
  otherItems,
  visibleOtherItemCount,
  onAddOtherItem,
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
  const returnGiftInputById = new Map(
    returnGiftInputs.map((input) => [input.id, input]),
  );
  const visibleOtherItems = otherItems.slice(0, visibleOtherItemCount);
  const canAddOtherItem = visibleOtherItemCount < otherItems.length;

  const [isSingleFoodOpen, setIsSingleFoodOpen] = useState(false);
  const [isGiftOpen, setIsGiftOpen] = useState(false);
  const [giftQuery, setGiftQuery] = useState("");
  const [giftBandId, setGiftBandId] =
    useState<(typeof giftPriceBands)[number]["id"]>("all");

  const selectedSingleFoodCount = singleFoodOptions.filter(
    (option) => (singleFoodCounts[option.id] ?? 0) > 0,
  ).length;

  const selectedGifts = returnGifts
    .map((gift) => {
      const input = returnGiftInputById.get(gift.id);
      return {
        gift,
        quantity: input?.quantity ?? 0,
        modelNumber: input?.modelNumber ?? gift.defaultModelNumber,
      };
    })
    .filter((line) => line.quantity > 0);

  const filteredGifts = useMemo(() => {
    const band =
      giftPriceBands.find((item) => item.id === giftBandId) ??
      giftPriceBands[0];
    const query = giftQuery.trim().toLowerCase();

    return returnGifts.filter((gift) => {
      if (gift.price < band.min || gift.price > band.max) {
        return false;
      }
      if (!query) {
        return true;
      }
      return (
        gift.name.toLowerCase().includes(query) ||
        gift.defaultModelNumber.toLowerCase().includes(query)
      );
    });
  }, [giftBandId, giftQuery]);

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

        <div className="space-y-5">
          <div>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-base font-semibold text-slate-900">
                通夜料理
              </h3>
              <p className="text-sm font-medium text-slate-600">
                1セット{wakeMealConfig.servingsPerSet}名様分
              </p>
            </div>
            <PickerGrid
              options={wakeMealOptions}
              selectedId={selectedWakeMealId}
              onSelect={onWakeMealChange}
            />
            {selectedWakeMeal.price > 0 ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3">
                <span className="text-base font-semibold text-slate-800">
                  セット数
                </span>
                <span className="flex items-center gap-3">
                  {wakeStaffCount > 0 ? (
                    <span className="text-sm font-semibold text-amber-900">
                      配膳人 {wakeStaffCount}名
                    </span>
                  ) : null}
                  <QuantityStepper
                    id="wake-meal-sets"
                    label="通夜料理のセット数"
                    value={wakeMealSets}
                    unitLabel="セット"
                    onChange={onWakeMealSetsChange}
                  />
                </span>
              </div>
            ) : null}
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-base font-semibold text-slate-900">
                告別料理
              </h3>
              <p className="text-sm font-medium text-slate-600">1人前</p>
            </div>
            <PickerGrid
              options={funeralMealOptions}
              selectedId={selectedFuneralMealId}
              onSelect={onFuneralMealChange}
            />
            {selectedFuneralMeal.price > 0 ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3">
                <span className="text-base font-semibold text-slate-800">
                  人数
                </span>
                <span className="flex items-center gap-3">
                  {funeralStaffCount > 0 ? (
                    <span className="text-sm font-semibold text-amber-900">
                      配膳人 {funeralStaffCount}名
                    </span>
                  ) : null}
                  <QuantityStepper
                    id="funeral-meal-people"
                    label="告別料理の人数"
                    value={funeralMealPeople}
                    unitLabel="名"
                    onChange={onFuneralMealPeopleChange}
                  />
                </span>
              </div>
            ) : null}
          </div>

          <Collapsible
            title="単品料理"
            summary={
              selectedSingleFoodCount > 0
                ? `${selectedSingleFoodCount}品を選択中`
                : `寿司・天ぷらなど${singleFoodOptions.length}品`
            }
            isOpen={isSingleFoodOpen}
            onToggle={() => setIsSingleFoodOpen((open) => !open)}
          >
            <div className="grid gap-2 2xl:grid-cols-2">
              {singleFoodOptions.map((option) => (
                <QuantityRow
                  key={option.id}
                  image={option.image}
                  name={option.name}
                  priceLabel={`${formatYen(option.price)} / ${option.unitLabel}`}
                  quantity={singleFoodCounts[option.id] ?? 0}
                  unitLabel={option.unitLabel}
                  inputId={`single-food-${option.id}`}
                  onQuantityChange={(value) =>
                    onSingleFoodCountChange(option.id, value)
                  }
                />
              ))}
            </div>
          </Collapsible>
        </div>
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <p className="text-sm font-semibold text-amber-700">返礼品</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">
            返礼品を選択
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            数量が1個以上の返礼品のみ、概算金額と確認欄に反映されます。
          </p>
        </div>

        {selectedGifts.length > 0 ? (
          <ul className="mb-3 space-y-1 rounded-lg bg-amber-50 p-3">
            {selectedGifts.map(({ gift, quantity, modelNumber }) => (
              <li
                key={gift.id}
                className="flex flex-wrap items-baseline justify-between gap-2 text-sm font-semibold text-amber-900"
              >
                <span className="min-w-0 truncate">
                  {modelNumber || gift.defaultModelNumber} × {quantity}個
                </span>
                <span>{formatYen(gift.price * quantity)}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <Collapsible
          title="返礼品カタログ（いなば園）"
          summary={
            selectedGifts.length > 0
              ? `${selectedGifts.length}種類を選択中`
              : `全${returnGifts.length}点から選択`
          }
          isOpen={isGiftOpen}
          onToggle={() => setIsGiftOpen((open) => !open)}
        >
          <div className="space-y-3">
            <input
              type="search"
              value={giftQuery}
              onChange={(event) => setGiftQuery(event.target.value)}
              placeholder="品名・型番で絞り込み（例：煎茶、AM-EB）"
              className="h-12 w-full rounded-lg border border-stone-300 bg-white px-3 text-base font-medium text-slate-950 outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-200"
            />

            <div className="flex flex-wrap gap-2">
              {giftPriceBands.map((band) => (
                <button
                  key={band.id}
                  type="button"
                  aria-pressed={giftBandId === band.id}
                  onClick={() => setGiftBandId(band.id)}
                  className={cn(
                    "min-h-10 rounded-full border px-3 text-sm font-semibold transition",
                    giftBandId === band.id
                      ? "border-amber-600 bg-amber-600 text-white"
                      : "border-stone-300 bg-white text-slate-700 hover:border-amber-500 hover:bg-amber-50",
                  )}
                >
                  {band.label}
                </button>
              ))}
            </div>

            <p className="text-sm font-medium text-slate-600">
              {filteredGifts.length}点を表示中
            </p>

            {filteredGifts.length === 0 ? (
              <p className="rounded-lg bg-stone-50 p-3 text-sm font-semibold text-slate-700">
                条件に合う返礼品がありません。
              </p>
            ) : (
              <div className="grid max-h-[32rem] gap-2 overflow-y-auto pr-1 2xl:grid-cols-2">
                {filteredGifts.map((gift) => {
                  const input = returnGiftInputById.get(gift.id);
                  const modelNumber =
                    input?.modelNumber ?? gift.defaultModelNumber;
                  const quantity = input?.quantity ?? 0;

                  return (
                    <QuantityRow
                      key={gift.id}
                      image={gift.image}
                      name={gift.name}
                      priceLabel={
                        quantity > 0
                          ? `${formatYen(gift.price)} / 小計 ${formatYen(
                              gift.price * quantity,
                            )}`
                          : formatYen(gift.price)
                      }
                      quantity={quantity}
                      unitLabel="個"
                      inputId={`return-gift-${gift.id}`}
                      onQuantityChange={(value) =>
                        onReturnGiftChange(gift.id, "quantity", value)
                      }
                    >
                      {quantity > 0 ? (
                        <span className="mt-1 flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-600">
                            型番
                          </span>
                          <input
                            type="text"
                            value={modelNumber}
                            onChange={(event) =>
                              onReturnGiftChange(
                                gift.id,
                                "modelNumber",
                                event.target.value,
                              )
                            }
                            className="h-9 w-32 rounded-md border border-stone-300 bg-white px-2 text-sm font-medium text-slate-950 outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-200"
                          />
                        </span>
                      ) : null}
                    </QuantityRow>
                  );
                })}
              </div>
            )}
          </div>
        </Collapsible>
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
          {visibleOtherItems.map((item, index) => {
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

        <div className="mt-4">
          {canAddOtherItem ? (
            <button
              type="button"
              onClick={onAddOtherItem}
              className="min-h-12 rounded-lg border border-amber-600 bg-white px-4 text-base font-semibold text-amber-800 transition hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2"
            >
              自由項目を追加
            </button>
          ) : (
            <p className="rounded-lg bg-stone-50 p-3 text-sm font-semibold text-slate-700">
              自由項目は最大4件まで追加できます
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
