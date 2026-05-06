import Image from "next/image";
import type { FuneralPlan, FuneralRank } from "@/data/simulatorData";
import { contactInfo } from "@/data/simulatorData";
import SelectedOptionsSummary from "@/components/SelectedOptionsSummary";
import type { ProposalLineItem } from "@/lib/proposalTypes";
import { formatYen } from "@/lib/simulatorUtils";

type PreviewStageProps = {
  plan: FuneralPlan;
  rank: FuneralRank;
  altarImage: string;
  altarDesignName?: string;
  selectedItems: ProposalLineItem[];
  total: number;
};

export default function PreviewStage({
  plan,
  rank,
  altarImage,
  altarDesignName,
  selectedItems,
  total,
}: PreviewStageProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      <div className="relative h-[360px] bg-stone-100 sm:h-[460px] md:h-[360px] lg:h-[520px] xl:h-[560px]">
        <Image
          data-testid="main-preview-image"
          src={altarImage}
          alt={altarDesignName ?? `${plan.displayName} ${rank.displayName} 祭壇イメージ`}
          fill
          priority
          unoptimized
          className="object-contain"
          sizes="(min-width: 1024px) 56vw, 100vw"
        />

        <div className="absolute left-4 top-4 max-w-[calc(100%-2rem)] rounded-lg border border-white/50 bg-white/90 p-4 shadow-sm backdrop-blur sm:left-5 sm:top-5">
          <p className="text-sm font-semibold text-amber-700">
            選択中のプレビュー
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950 sm:text-xl lg:text-2xl">
            {plan.name} / {rank.displayName}
          </h2>
          <p className="mt-2 text-base font-semibold text-slate-800">
            {formatYen(rank.price)}
          </p>
          {altarDesignName ? (
            <p className="mt-1 text-sm text-slate-600">{altarDesignName}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 border-t border-stone-200 bg-stone-50 px-4 py-4 text-sm font-medium text-slate-700 sm:grid-cols-2 sm:px-5">
        <span>{contactInfo.locationLead}</span>
        <span>{contactInfo.parking}</span>
      </div>

      <SelectedOptionsSummary items={selectedItems} total={total} />
    </section>
  );
}
