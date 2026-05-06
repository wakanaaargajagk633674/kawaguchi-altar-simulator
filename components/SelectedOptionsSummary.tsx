import Image from "next/image";
import type { ProposalLineItem } from "@/lib/proposalTypes";
import { formatYen } from "@/lib/simulatorUtils";

type SelectedOptionsSummaryProps = {
  items: ProposalLineItem[];
  total: number;
};

export default function SelectedOptionsSummary({
  items,
  total,
}: SelectedOptionsSummaryProps) {
  const visibleItems = items.filter((item) => item.image || item.subtotal > 0);

  return (
    <section className="border-t border-stone-200 bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-amber-700">
            選択済み内容
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            画像付きサマリー
          </h2>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-slate-500">概算合計</p>
          <p className="text-xl font-semibold text-slate-950">
            {formatYen(total)}
          </p>
        </div>
      </div>

      {visibleItems.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
          {visibleItems.map((item) => (
            <article
              key={item.id}
              className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3"
            >
              <div className="relative h-[72px] overflow-hidden rounded-md bg-white">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    unoptimized
                    className="object-contain p-1"
                    sizes="72px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs font-semibold text-slate-400">
                    画像なし
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-700">
                  {item.category}
                </p>
                <h3 className="mt-1 text-sm font-semibold text-slate-950">
                  {item.name}
                </h3>
                {item.quantityLabel ? (
                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {item.quantityLabel}
                  </p>
                ) : null}
                {item.note ? (
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    {item.note}
                  </p>
                ) : null}
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {formatYen(item.subtotal)}
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-lg bg-stone-50 p-3 text-sm leading-6 text-slate-600">
          料理・棺・骨壺などの選択内容が、ここに画像付きで表示されます。
        </p>
      )}
    </section>
  );
}
