"use client";

import { useMemo, useRef, useState } from "react";
import CustomerInfoForm from "@/components/CustomerInfoForm";
import EstimatePanel, { type EstimateSummary } from "@/components/EstimatePanel";
import FixedCTA from "@/components/FixedCTA";
import OptionSelector from "@/components/OptionSelector";
import PlanSelector from "@/components/PlanSelector";
import ProposalDocument from "@/components/ProposalDocument";
import PreviewStage from "@/components/PreviewStage";
import RankSelector from "@/components/RankSelector";
import {
  altarUpgrades,
  careOptions,
  coffinOptions,
  contactInfo,
  defaultOtherItems,
  defaultReturnGiftInputs,
  dryIceCostConfig,
  funeralMealHallFeeOption,
  funeralMealOptions,
  funeralPlans,
  noAltarUpgradePlanNames,
  returnGifts,
  restingCostConfig,
  serviceStaffConfig,
  singleFoodOptions,
  taxModeLabels,
  type FuneralPlan,
  type FuneralRank,
  type OtherItemInput,
  type PriceOption,
  type ReturnGiftInput,
  urnCoverOption,
  urnOptions,
  wakeMealConfig,
  wakeMealOptions,
} from "@/data/simulatorData";
import { createPdfFromElement } from "@/lib/pdf";
import type { ProposalLineItem, ProposalTableRow } from "@/lib/proposalTypes";
import { cn, formatYen, toNonNegativeInteger } from "@/lib/simulatorUtils";

const defaultPlan =
  funeralPlans.find((plan) => plan.category === "one_day") ?? funeralPlans[0];

const defaultSingleFoodCounts = singleFoodOptions.reduce<Record<string, number>>(
  (counts, option) => {
    counts[option.id] = 0;
    return counts;
  },
  {},
);

function defaultRankForPlan(plan: FuneralPlan): FuneralRank {
  return plan.ranks.find((rank) => rank.recommended) ?? plan.ranks[0];
}

function findOption(options: PriceOption[], selectedId: string): PriceOption {
  return options.find((option) => option.id === selectedId) ?? options[0];
}

function staffCountForPeople(people: number) {
  return people > 0
    ? Math.ceil(people / serviceStaffConfig.peoplePerStaff)
    : 0;
}

function isNoAltarUpgradePlan(plan: FuneralPlan) {
  return (noAltarUpgradePlanNames as readonly string[]).includes(plan.name);
}

function safePdfName(value: string) {
  return value.trim().replace(/[\\/:*?"<>|]/g, "");
}

export default function Simulator() {
  const proposalRef = useRef<HTMLDivElement>(null);
  const [selectedPlanId, setSelectedPlanId] = useState(defaultPlan.id);
  const [selectedRankId, setSelectedRankId] = useState(
    defaultRankForPlan(defaultPlan).id,
  );
  const [hasMembership, setHasMembership] = useState(true);
  const [selectedCoffinId, setSelectedCoffinId] = useState(
    coffinOptions[0].id,
  );
  const [selectedUrnId, setSelectedUrnId] = useState(urnOptions[0].id);
  const [isUrnCoverSelected, setIsUrnCoverSelected] = useState(false);
  const [selectedAltarUpgradeId, setSelectedAltarUpgradeId] = useState(
    altarUpgrades[0].id,
  );
  const [selectedAltarDesignId, setSelectedAltarDesignId] = useState<
    string | null
  >(null);
  const [selectedWakeMealId, setSelectedWakeMealId] = useState(
    wakeMealOptions[0].id,
  );
  const [wakeMealSets, setWakeMealSets] = useState(0);
  const [selectedFuneralMealId, setSelectedFuneralMealId] = useState(
    funeralMealOptions[0].id,
  );
  const [funeralMealPeople, setFuneralMealPeople] = useState(0);
  const [singleFoodCounts, setSingleFoodCounts] = useState<Record<string, number>>(
    defaultSingleFoodCounts,
  );
  const [returnGiftInputs, setReturnGiftInputs] = useState<ReturnGiftInput[]>(
    () => defaultReturnGiftInputs.map((input) => ({ ...input })),
  );
  const [restingDays, setRestingDays] = useState(0);
  const [dryIceDays, setDryIceDays] = useState(0);
  const [selectedCareIds, setSelectedCareIds] = useState<string[]>([]);
  const [otherItems, setOtherItems] = useState<OtherItemInput[]>(() =>
    defaultOtherItems.map((item) => ({ ...item })),
  );
  const [visibleOtherItemCount, setVisibleOtherItemCount] = useState(2);
  const [customerName, setCustomerName] = useState("");
  const [pdfError, setPdfError] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const createdDate = useMemo(
    () =>
      new Intl.DateTimeFormat("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date()),
    [],
  );

  const selectedPlan =
    funeralPlans.find((plan) => plan.id === selectedPlanId) ?? defaultPlan;
  const selectedRank =
    selectedPlan.ranks.find((rank) => rank.id === selectedRankId) ??
    defaultRankForPlan(selectedPlan);
  const selectedCoffin = findOption(coffinOptions, selectedCoffinId);
  const selectedUrn = findOption(urnOptions, selectedUrnId);
  const selectedWakeMeal = findOption(wakeMealOptions, selectedWakeMealId);
  const selectedFuneralMeal = findOption(
    funeralMealOptions,
    selectedFuneralMealId,
  );
  const isAltarUpgradeAvailable = !isNoAltarUpgradePlan(selectedPlan);
  const rawSelectedAltarUpgrade =
    altarUpgrades.find((upgrade) => upgrade.id === selectedAltarUpgradeId) ??
    altarUpgrades[0];
  const selectedAltarUpgrade = isAltarUpgradeAvailable
    ? rawSelectedAltarUpgrade
    : altarUpgrades[0];
  const selectedAltarDesign = isAltarUpgradeAvailable
    ? selectedAltarUpgrade.designs?.find(
        (design) => design.id === selectedAltarDesignId,
      ) ?? null
    : null;

  const estimate = useMemo<EstimateSummary>(() => {
    const memberDiscount = hasMembership ? selectedPlan.memberDiscount : 0;
    const urnCoverAmount = isUrnCoverSelected ? urnCoverOption.price : 0;
    const altarDesignAdjustment = selectedAltarDesign?.priceAdjustment ?? 0;

    const effectiveWakeSets = selectedWakeMeal.price > 0 ? wakeMealSets : 0;
    const wakeMealPeople = effectiveWakeSets * wakeMealConfig.servingsPerSet;
    const wakeMealAmount = selectedWakeMeal.price * effectiveWakeSets;

    const singleFoodLines = singleFoodOptions
      .map((option) => {
        const quantity = singleFoodCounts[option.id] ?? 0;

        return {
          id: option.id,
          name: option.name,
          quantity,
          unitLabel: option.unitLabel,
          servings: option.servings,
          includeInServingStaffCalculation:
            option.includeInServingStaffCalculation,
          unitPrice: option.price,
          amount: option.price * quantity,
          image: option.image,
        };
      })
      .filter((line) => line.quantity > 0 && line.amount > 0);
    const singleFoodAmount = singleFoodLines.reduce(
      (sum, line) => sum + line.amount,
      0,
    );
    const singleFoodServingsForStaff = singleFoodLines
      .filter((line) => line.includeInServingStaffCalculation)
      .reduce((sum, line) => sum + line.servings * line.quantity, 0);
    const wakeMealServingsForStaff =
      wakeMealPeople + singleFoodServingsForStaff;
    const wakeStaffCount = staffCountForPeople(wakeMealServingsForStaff);
    const wakeStaffAmount =
      wakeStaffCount * serviceStaffConfig.pricePerPerson;

    const effectiveFuneralPeople =
      selectedFuneralMeal.price > 0 ? funeralMealPeople : 0;
    const funeralMealAmount =
      selectedFuneralMeal.price * effectiveFuneralPeople;
    const funeralMealHallFeeAmount =
      funeralMealAmount > 0 ? funeralMealHallFeeOption.price : 0;
    const funeralStaffCount = staffCountForPeople(effectiveFuneralPeople);
    const funeralStaffAmount =
      funeralStaffCount * serviceStaffConfig.pricePerPerson;

    const restingAmount = restingDays * restingCostConfig.pricePerDay;
    const dryIceAmount = dryIceDays * dryIceCostConfig.pricePerDay;
    const careLines = careOptions
      .filter((option) => selectedCareIds.includes(option.id))
      .map((option) => ({
        id: option.id,
        name: option.name,
        amount: option.price,
        image: option.image,
      }));
    const careTotal = careLines.reduce((sum, line) => sum + line.amount, 0);
    const returnGiftLines = returnGifts
      .map((gift) => {
        const input = returnGiftInputs.find((item) => item.id === gift.id);
        const quantity = Math.max(0, Math.floor(input?.quantity ?? 0));
        const modelNumber = (input?.modelNumber ?? "").trim();

        return {
          id: gift.id,
          name: gift.name,
          modelNumber,
          quantity,
          unitPrice: gift.price,
          amount: gift.price * quantity,
          image: gift.image,
        };
      })
      .filter((line) => line.quantity > 0 && line.amount > 0);
    const returnGiftAmount = returnGiftLines.reduce(
      (sum, line) => sum + line.amount,
      0,
    );
    const otherLines = otherItems
      .map((item, index) => {
        const name = item.name.trim();
        const quantity = Math.max(0, Math.floor(item.quantity));
        const unitPrice = Math.max(0, Math.floor(item.price));

        return {
          id: `other-${index + 1}`,
          name,
          quantity,
          unitPrice,
          amount: unitPrice * quantity,
        };
      })
      .filter(
        (line) => line.name.length > 0 && line.quantity > 0 && line.unitPrice > 0,
      );
    const otherAmount = otherLines.reduce((sum, line) => sum + line.amount, 0);
    const actualCostAmount =
      restingAmount + dryIceAmount + funeralMealHallFeeAmount;

    const total =
      selectedRank.price -
      memberDiscount +
      selectedCoffin.price +
      selectedUrn.price +
      urnCoverAmount +
      selectedAltarUpgrade.price +
      altarDesignAdjustment +
      wakeMealAmount +
      singleFoodAmount +
      funeralMealAmount +
      funeralMealHallFeeAmount +
      wakeStaffAmount +
      funeralStaffAmount +
      restingAmount +
      dryIceAmount +
      careTotal +
      returnGiftAmount +
      otherAmount;

    return {
      planName: selectedPlan.name,
      rankName: selectedRank.displayName,
      planAmount: selectedRank.price,
      taxLabel: taxModeLabels[selectedPlan.taxMode],
      memberDiscount,
      coffinName: selectedCoffin.name,
      coffinAmount: selectedCoffin.price,
      urnName: selectedUrn.name,
      urnAmount: selectedUrn.price,
      urnCoverName: isUrnCoverSelected ? urnCoverOption.name : undefined,
      urnCoverAmount,
      isAltarUpgradeAvailable,
      altarUpgradeName:
        selectedAltarUpgrade.price > 0 ? selectedAltarUpgrade.name : undefined,
      altarUpgradeAmount: selectedAltarUpgrade.price,
      altarDesignName: selectedAltarDesign?.name,
      altarDesignAdjustment,
      wakeMealName: selectedWakeMeal.name,
      wakeMealSets: effectiveWakeSets,
      wakeMealPeople,
      wakeMealAmount,
      wakeMealServingsForStaff,
      singleFoodLines,
      singleFoodAmount,
      wakeStaffCount,
      wakeStaffUnitPrice: serviceStaffConfig.pricePerPerson,
      wakeStaffAmount,
      funeralMealName: selectedFuneralMeal.name,
      funeralMealPeople: effectiveFuneralPeople,
      funeralMealAmount,
      funeralMealHallFeeName:
        funeralMealHallFeeAmount > 0
          ? funeralMealHallFeeOption.name
          : undefined,
      funeralMealHallFeeAmount,
      funeralStaffCount,
      funeralStaffUnitPrice: serviceStaffConfig.pricePerPerson,
      funeralStaffAmount,
      restingDays,
      restingUnitPrice: restingCostConfig.pricePerDay,
      restingAmount,
      dryIceDays,
      dryIceUnitPrice: dryIceCostConfig.pricePerDay,
      dryIceAmount,
      careLines,
      careTotal,
      returnGiftLines,
      returnGiftAmount,
      otherLines,
      otherAmount,
      actualCostAmount,
      total,
    };
  }, [
    dryIceDays,
    funeralMealPeople,
    hasMembership,
    isAltarUpgradeAvailable,
    isUrnCoverSelected,
    otherItems,
    returnGiftInputs,
    restingDays,
    selectedAltarDesign,
    selectedAltarUpgrade,
    selectedCareIds,
    selectedCoffin,
    selectedFuneralMeal,
    selectedPlan,
    selectedRank,
    selectedUrn,
    selectedWakeMeal,
    singleFoodCounts,
    wakeMealSets,
  ]);

  const previewAltarImage =
    selectedAltarDesign?.image ?? selectedRank.altarImage;
  const altarDisplayName = isAltarUpgradeAvailable
    ? selectedAltarDesign?.name ??
      `${selectedPlan.displayName} ${selectedRank.displayName}`
    : "祭壇なしプラン";

  const selectedOptionItems = useMemo<ProposalLineItem[]>(() => {
    const items: ProposalLineItem[] = [
      {
        id: "coffin",
        category: "棺",
        name: selectedCoffin.name,
        image: selectedCoffin.image,
        quantityLabel: "1式",
        unitPrice: selectedCoffin.price,
        subtotal: selectedCoffin.price,
      },
      {
        id: "urn",
        category: "骨壺",
        name: selectedUrn.name,
        image: selectedUrn.image,
        quantityLabel: "1式",
        unitPrice: selectedUrn.price,
        subtotal: selectedUrn.price,
      },
    ];

    if (estimate.wakeMealAmount > 0) {
      items.push({
        id: "wake-meal",
        category: "通夜料理",
        name: selectedWakeMeal.name,
        image: selectedWakeMeal.image,
        quantityLabel: `${estimate.wakeMealPeople}名分（${estimate.wakeMealSets}セット）`,
        unitPrice: selectedWakeMeal.price,
        subtotal: estimate.wakeMealAmount,
        note:
          estimate.wakeStaffCount > 0
            ? `配膳人 ${estimate.wakeStaffCount}名`
            : undefined,
      });
    }

    estimate.singleFoodLines.forEach((line) => {
      items.push({
        id: line.id,
        category: "単品料理",
        name: line.name,
        image: line.image,
        quantityLabel: `${line.quantity}${line.unitLabel}（${
          line.servings * line.quantity
        }名分）`,
        unitPrice: line.unitPrice,
        subtotal: line.amount,
        note: line.includeInServingStaffCalculation
          ? "配膳人計算対象"
          : "配膳人計算対象外",
      });
    });

    if (estimate.funeralMealAmount > 0) {
      items.push({
        id: "funeral-meal",
        category: "告別料理",
        name: selectedFuneralMeal.name,
        image: selectedFuneralMeal.image,
        quantityLabel: `${estimate.funeralMealPeople}名分`,
        unitPrice: selectedFuneralMeal.price,
        subtotal: estimate.funeralMealAmount,
        note:
          estimate.funeralStaffCount > 0
            ? `配膳人 ${estimate.funeralStaffCount}名`
            : undefined,
      });
    }

    if (estimate.restingAmount > 0) {
      items.push({
        id: "resting-days",
        category: "安置日数",
        name: restingCostConfig.name,
        image: restingCostConfig.image,
        quantityLabel: `${estimate.restingDays}日`,
        unitPrice: estimate.restingUnitPrice,
        subtotal: estimate.restingAmount,
      });
    }

    if (estimate.dryIceAmount > 0) {
      items.push({
        id: "dry-ice-days",
        category: "ドライアイス日数",
        name: dryIceCostConfig.name,
        image: dryIceCostConfig.image,
        quantityLabel: `${estimate.dryIceDays}日`,
        unitPrice: estimate.dryIceUnitPrice,
        subtotal: estimate.dryIceAmount,
      });
    }

    estimate.careLines.forEach((line) => {
      items.push({
        id: line.id,
        category: "湯灌・エンバーミング",
        name: line.name,
        image: line.image,
        quantityLabel: "1式",
        unitPrice: line.amount,
        subtotal: line.amount,
      });
    });

    estimate.returnGiftLines.forEach((line) => {
      items.push({
        id: line.id,
        category: "返礼品",
        name: line.name,
        image: line.image,
        quantityLabel: `${line.quantity}個`,
        unitPrice: line.unitPrice,
        subtotal: line.amount,
        note: `${line.modelNumber ? `型番：${line.modelNumber} / ` : ""}単価：${formatYen(
          line.unitPrice,
        )}`,
      });
    });


    estimate.otherLines.forEach((line) => {
      items.push({
        id: line.id,
        category: "その他",
        name: line.name,
        quantityLabel: `${line.quantity}個`,
        unitPrice: line.unitPrice,
        subtotal: line.amount,
      });
    });

    return items;
  }, [
    estimate.careLines,
    estimate.dryIceAmount,
    estimate.dryIceDays,
    estimate.dryIceUnitPrice,
    estimate.funeralMealAmount,
    estimate.funeralMealPeople,
    estimate.funeralStaffCount,
    estimate.otherLines,
    estimate.restingAmount,
    estimate.restingDays,
    estimate.restingUnitPrice,
    estimate.returnGiftLines,
    estimate.singleFoodLines,
    estimate.wakeMealAmount,
    estimate.wakeMealPeople,
    estimate.wakeMealSets,
    estimate.wakeStaffCount,
    selectedCoffin,
    selectedFuneralMeal,
    selectedUrn,
    selectedWakeMeal,
  ]);

  const proposalRows = useMemo<ProposalTableRow[]>(() => {
    const altarAmount =
      estimate.altarUpgradeAmount + estimate.altarDesignAdjustment;
    const altarName =
      estimate.altarDesignName ?? estimate.altarUpgradeName ?? "プラン内祭壇";
    const rows: ProposalTableRow[] = [
      {
        id: "plan",
        category: "葬儀プラン",
        name: `${estimate.planName} ${estimate.rankName}`,
        quantity: "1式",
        unitPrice: estimate.planAmount,
        subtotal: estimate.planAmount,
      },
    ];

    if (estimate.memberDiscount > 0) {
      rows.push({
        id: "member-discount",
        category: "割引",
        name: "事前相談会員登録",
        quantity: "1式",
        unitPrice: -estimate.memberDiscount,
        subtotal: -estimate.memberDiscount,
      });
    }

    rows.push({
      id: "altar",
      category: "祭壇",
      name: estimate.isAltarUpgradeAvailable ? altarName : "祭壇なしプラン",
      quantity: estimate.isAltarUpgradeAvailable ? "1式" : "-",
      unitPrice: estimate.isAltarUpgradeAvailable ? altarAmount : 0,
      subtotal: estimate.isAltarUpgradeAvailable ? altarAmount : 0,
    });

    if (estimate.wakeMealAmount > 0) {
      rows.push({
        id: "wake-meal",
        category: "通夜料理",
        name: estimate.wakeMealName,
        quantity: `${estimate.wakeMealPeople}名分（${estimate.wakeMealSets}セット）`,
        unitPrice: selectedWakeMeal.price,
        subtotal: estimate.wakeMealAmount,
      });
    }

    estimate.singleFoodLines.forEach((line) => {
      rows.push({
        id: line.id,
        category: "単品料理",
        name: line.name,
        quantity: `${line.quantity}${line.unitLabel}（${
          line.servings * line.quantity
        }名分）`,
        unitPrice: line.unitPrice,
        subtotal: line.amount,
      });
    });

    if (estimate.wakeStaffAmount > 0) {
      rows.push({
        id: "wake-staff",
        category: "通夜料理 配膳人",
        name: "配膳人",
        quantity: `単価${formatYen(estimate.wakeStaffUnitPrice)} × ${
          estimate.wakeStaffCount
        }名`,
        subtotal: estimate.wakeStaffAmount,
      });
    }

    if (estimate.funeralMealAmount > 0) {
      rows.push({
        id: "funeral-meal",
        category: "告別料理",
        name: estimate.funeralMealName,
        quantity: `${estimate.funeralMealPeople}名様分`,
        unitPrice: selectedFuneralMeal.price,
        subtotal: estimate.funeralMealAmount,
      });
    }

    if (
      estimate.funeralMealHallFeeAmount > 0 &&
      estimate.funeralMealHallFeeName
    ) {
      rows.push({
        id: "funeral-hall-fee",
        category: "告別料理",
        name: estimate.funeralMealHallFeeName,
        quantity: "1式",
        unitPrice: estimate.funeralMealHallFeeAmount,
        subtotal: estimate.funeralMealHallFeeAmount,
      });
    }

    if (estimate.funeralStaffAmount > 0) {
      rows.push({
        id: "funeral-staff",
        category: "告別料理 配膳人",
        name: "配膳人",
        quantity: `単価${formatYen(estimate.funeralStaffUnitPrice)} × ${
          estimate.funeralStaffCount
        }名`,
        subtotal: estimate.funeralStaffAmount,
      });
    }

    rows.push(
      {
        id: "coffin",
        category: "棺",
        name: estimate.coffinName,
        quantity: "1式",
        unitPrice: estimate.coffinAmount,
        subtotal: estimate.coffinAmount,
      },
      {
        id: "urn",
        category: "骨壺",
        name: estimate.urnName,
        quantity: "1式",
        unitPrice: estimate.urnAmount,
        subtotal: estimate.urnAmount,
      },
    );

    if (estimate.urnCoverAmount > 0 && estimate.urnCoverName) {
      rows.push({
        id: "urn-cover",
        category: "骨壺",
        name: estimate.urnCoverName,
        quantity: "1式",
        unitPrice: estimate.urnCoverAmount,
        subtotal: estimate.urnCoverAmount,
      });
    }

    if (estimate.restingAmount > 0) {
      rows.push({
        id: "resting-days",
        category: "安置日数",
        name: restingCostConfig.name,
        quantity: `${estimate.restingDays}日`,
        unitPrice: estimate.restingUnitPrice,
        subtotal: estimate.restingAmount,
      });
    }

    if (estimate.dryIceAmount > 0) {
      rows.push({
        id: "dry-ice-days",
        category: "ドライアイス",
        name: dryIceCostConfig.name,
        quantity: `${estimate.dryIceDays}日`,
        unitPrice: estimate.dryIceUnitPrice,
        subtotal: estimate.dryIceAmount,
      });
    }

    estimate.careLines.forEach((line) => {
      rows.push({
        id: line.id,
        category: "湯灌・エンバーミング",
        name: line.name,
        quantity: "1式",
        unitPrice: line.amount,
        subtotal: line.amount,
      });
    });

    estimate.returnGiftLines.forEach((line) => {
      rows.push({
        id: line.id,
        category: "返礼品",
        name: `${line.name}${line.modelNumber ? ` 型番：${line.modelNumber}` : ""}`,
        quantity: `${line.quantity}個`,
        unitPrice: line.unitPrice,
        subtotal: line.amount,
      });
    });

    if (estimate.returnGiftAmount > 0) {
      rows.push({
        id: "return-gift-total",
        category: "返礼品合計",
        name: `${estimate.returnGiftLines.length}種類`,
        quantity: "-",
        subtotal: estimate.returnGiftAmount,
      });
    }

    estimate.otherLines.forEach((line) => {
      rows.push({
        id: line.id,
        category: "その他",
        name: line.name,
        quantity: `単価${formatYen(line.unitPrice)} × ${line.quantity}個`,
        subtotal: line.amount,
      });
    });

    return rows;
  }, [estimate, selectedFuneralMeal.price, selectedWakeMeal.price]);

  const handlePlanSelect = (planId: string) => {
    const nextPlan =
      funeralPlans.find((plan) => plan.id === planId) ?? defaultPlan;

    setSelectedPlanId(nextPlan.id);
    setSelectedRankId(defaultRankForPlan(nextPlan).id);

    if (isNoAltarUpgradePlan(nextPlan)) {
      setSelectedAltarUpgradeId(altarUpgrades[0].id);
      setSelectedAltarDesignId(null);
    }
  };

  const handleAltarUpgradeChange = (upgradeId: string) => {
    const nextUpgrade =
      altarUpgrades.find((upgrade) => upgrade.id === upgradeId) ??
      altarUpgrades[0];
    const firstDesign = nextUpgrade.designs?.[0];

    setSelectedAltarUpgradeId(nextUpgrade.id);
    setSelectedAltarDesignId(firstDesign?.id ?? null);
  };

  const handleWakeMealChange = (optionId: string) => {
    const nextOption = findOption(wakeMealOptions, optionId);
    setSelectedWakeMealId(nextOption.id);

    if (nextOption.price === 0) {
      setWakeMealSets(0);
    }
  };

  const handleFuneralMealChange = (optionId: string) => {
    const nextOption = findOption(funeralMealOptions, optionId);
    setSelectedFuneralMealId(nextOption.id);

    if (nextOption.price === 0) {
      setFuneralMealPeople(0);
    }
  };

  const handleSingleFoodCountChange = (optionId: string, value: string) => {
    setSingleFoodCounts((currentCounts) => ({
      ...currentCounts,
      [optionId]: toNonNegativeInteger(value),
    }));
  };

  const handleReturnGiftChange = (
    giftId: string,
    field: keyof Omit<ReturnGiftInput, "id">,
    value: string,
  ) => {
    setReturnGiftInputs((currentInputs) =>
      currentInputs.map((input) => {
        if (input.id !== giftId) {
          return input;
        }

        if (field === "modelNumber") {
          return { ...input, modelNumber: value };
        }

        return { ...input, quantity: toNonNegativeInteger(value) };
      }),
    );
  };

  const handleAddOtherItem = () => {
    setVisibleOtherItemCount((currentCount) =>
      Math.min(defaultOtherItems.length, currentCount + 1),
    );
  };

  const handleOtherItemChange = (
    index: number,
    field: keyof OtherItemInput,
    value: string,
  ) => {
    setOtherItems((currentItems) =>
      currentItems.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        if (field === "name") {
          return { ...item, name: value };
        }

        if (field === "price") {
          return { ...item, price: toNonNegativeInteger(value) };
        }

        return { ...item, quantity: toNonNegativeInteger(value) };
      }),
    );
  };

  const handleCareToggle = (optionId: string) => {
    setSelectedCareIds((currentIds) =>
      currentIds.includes(optionId)
        ? currentIds.filter((id) => id !== optionId)
        : [...currentIds, optionId],
    );
  };

  const handleCreatePdf = async () => {
    const trimmedCustomerName = customerName.trim();

    if (!trimmedCustomerName) {
      setPdfError("お客様名を入力してください");
      return;
    }

    if (!proposalRef.current) {
      setPdfError(
        "PDFの作成準備が完了していません。少し待ってから再度お試しください。",
      );
      return;
    }

    setPdfError("");
    setIsGeneratingPdf(true);

    try {
      await createPdfFromElement(
        proposalRef.current,
        `川口典礼_祭壇シミュレーター_概算見積_${safePdfName(
          trimmedCustomerName,
        )}.pdf`,
      );
    } catch (error) {
      console.error("Failed to create proposal PDF", error);
      setPdfError(
        "PDF作成中にエラーが発生しました。コンソールの内容をご確認ください。",
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <main className="min-h-screen overflow-x-clip bg-[#f7f4ee] pb-40 text-slate-950 md:pb-12">
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 py-6 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-amber-700">
              株式会社川口典礼
            </p>
            <h1 className="mt-2 max-w-full text-3xl font-semibold leading-tight tracking-normal text-slate-950 sm:text-4xl lg:text-5xl">
              <span className="block sm:inline">川口典礼</span>
              <span className="block sm:inline sm:ml-3">
                祭壇シミュレーター
              </span>
            </h1>
            <p className="mt-3 max-w-full text-base leading-7 text-slate-700 [overflow-wrap:anywhere] sm:text-lg">
              プランやオプションを選びながら、おおよそのイメージと概算費用をご確認いただけます。
            </p>
          </div>
          <div className="grid gap-2 rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm font-medium text-slate-700 sm:grid-cols-3 lg:min-w-[420px] lg:grid-cols-1">
            <span>{contactInfo.locationLead}</span>
            <span>{contactInfo.parking}</span>
            <a
              href={`tel:${contactInfo.phone.replaceAll("-", "")}`}
              className="font-semibold text-slate-950 underline-offset-4 hover:underline"
            >
              電話番号：{contactInfo.phone}
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-[1440px] gap-6 px-4 py-6 sm:px-6 md:grid-cols-2 md:items-start lg:px-8">
        <div className="md:sticky md:top-6 md:z-30">
          <PreviewStage
            plan={selectedPlan}
            rank={selectedRank}
            altarImage={previewAltarImage}
            altarDesignName={altarDisplayName}
            selectedItems={selectedOptionItems}
            total={estimate.total}
          />
        </div>

        <div className="space-y-5 md:max-h-[calc(100vh-3rem)] md:overflow-y-auto md:pr-1">
          <CustomerInfoForm
            customerName={customerName}
            error={pdfError}
            onCustomerNameChange={(value) => {
              setCustomerName(value);
              if (pdfError) {
                setPdfError("");
              }
            }}
          />

          <PlanSelector
            plans={funeralPlans}
            selectedPlanId={selectedPlan.id}
            onSelect={handlePlanSelect}
          />

          <RankSelector
            plan={selectedPlan}
            selectedRankId={selectedRank.id}
            onSelect={setSelectedRankId}
          />

          <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-700">
                  会員割引
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  事前相談会員登録
                </h2>
              </div>
              {selectedPlan.memberDiscount > 0 ? (
                <span className="w-fit rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">
                  {formatYen(selectedPlan.memberDiscount)}値引き
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-lg bg-stone-100 p-1">
              {[
                { value: true, label: "事前相談会員登録あり" },
                { value: false, label: "事前相談会員登録なし" },
              ].map((item) => {
                const isSelected = hasMembership === item.value;

                return (
                  <button
                    key={item.label}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setHasMembership(item.value)}
                    className={cn(
                      "min-h-12 rounded-md px-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2",
                      isSelected
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-600 hover:bg-white/70",
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {selectedPlan.category === "citizen" ? (
              <p className="mt-3 rounded-lg bg-stone-50 p-3 text-sm font-medium leading-6 text-slate-700">
                市民葬は会員割引対象外です。
              </p>
            ) : hasMembership ? (
              <p className="mt-3 text-sm font-medium leading-6 text-slate-700">
                選択中のプランは、概算合計から
                {formatYen(selectedPlan.memberDiscount)}を差し引きます。
              </p>
            ) : null}
          </section>

          <OptionSelector
            selectedCoffinId={selectedCoffinId}
            onCoffinChange={setSelectedCoffinId}
            selectedUrnId={selectedUrnId}
            onUrnChange={setSelectedUrnId}
            isUrnCoverSelected={isUrnCoverSelected}
            onUrnCoverChange={setIsUrnCoverSelected}
            showAltarUpgrade={isAltarUpgradeAvailable}
            selectedAltarUpgradeId={selectedAltarUpgradeId}
            selectedAltarDesignId={selectedAltarDesignId}
            onAltarUpgradeChange={handleAltarUpgradeChange}
            onAltarDesignChange={setSelectedAltarDesignId}
            selectedWakeMealId={selectedWakeMealId}
            wakeMealSets={wakeMealSets}
            onWakeMealChange={handleWakeMealChange}
            onWakeMealSetsChange={(value) =>
              setWakeMealSets(toNonNegativeInteger(value))
            }
            selectedFuneralMealId={selectedFuneralMealId}
            funeralMealPeople={funeralMealPeople}
            onFuneralMealChange={handleFuneralMealChange}
            onFuneralMealPeopleChange={(value) =>
              setFuneralMealPeople(toNonNegativeInteger(value))
            }
            singleFoodCounts={singleFoodCounts}
            onSingleFoodCountChange={handleSingleFoodCountChange}
            returnGiftInputs={returnGiftInputs}
            onReturnGiftChange={handleReturnGiftChange}
            restingDays={restingDays}
            onRestingDaysChange={(value) =>
              setRestingDays(toNonNegativeInteger(value))
            }
            dryIceDays={dryIceDays}
            onDryIceDaysChange={(value) =>
              setDryIceDays(toNonNegativeInteger(value))
            }
            selectedCareIds={selectedCareIds}
            onCareToggle={handleCareToggle}
            otherItems={otherItems}
            visibleOtherItemCount={visibleOtherItemCount}
            onAddOtherItem={handleAddOtherItem}
            onOtherItemChange={handleOtherItemChange}
            wakeStaffCount={estimate.wakeStaffCount}
            funeralStaffCount={estimate.funeralStaffCount}
          />

          <div className="space-y-4">
            <EstimatePanel estimate={estimate} />
            {pdfError ? (
              <p className="rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-700">
                {pdfError}
              </p>
            ) : null}
            <FixedCTA
              total={estimate.total}
              variant="desktop"
              onCreatePdf={handleCreatePdf}
              isGenerating={isGeneratingPdf}
            />
          </div>
        </div>
      </div>

      <div
        ref={proposalRef}
        aria-hidden="true"
        className="fixed top-0 -left-[10000px]"
        style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
      >
        <ProposalDocument
          createdDate={createdDate}
          customerName={customerName.trim() || "未入力"}
          altarImage={previewAltarImage}
          altarName={altarDisplayName}
          estimate={estimate}
          rows={proposalRows}
          optionItems={selectedOptionItems}
        />
      </div>

      <FixedCTA
        total={estimate.total}
        variant="mobile"
        onCreatePdf={handleCreatePdf}
        isGenerating={isGeneratingPdf}
      />
    </main>
  );
}
