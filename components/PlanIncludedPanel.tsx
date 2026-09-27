"use client";

import { useState } from "react";
import { planIncludedContents } from "@/data/planIncludedItems";
import type { FuneralPlan } from "@/data/simulatorData";

type PlanIncludedPanelProps = {
  plan: FuneralPlan;
};

export default function PlanIncludedPanel({ plan }: PlanIncludedPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const content = planIncludedContents[plan.category];
  const itemCount = content.groups.reduce(
    (sum, group) => sum + group.items.length,
    0,
  );

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-700">基本セット</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">
            {plan.displayName}に含まれるもの
          </h2>
        </div>
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((value) => !value)}
          className="w-fit rounded-full bg-stone-100 px-3 py-1 text-sm font-semibold text-slate-700 transition hover:bg-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2"
        >
          {isOpen ? "閉じる" : `全${itemCount}項目を見る`}
        </button>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{content.lead}</p>

      {isOpen ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {content.groups.map((group) => (
            <div key={group.id} className="rounded-lg bg-stone-50 p-3">
              <p className="text-sm font-semibold text-amber-800">
                {group.title}
              </p>
              <ul className="mt-1 space-y-0.5 text-sm text-slate-800">
                {group.items.map((item) => (
                  <li key={item} className="flex gap-1.5">
                    <span aria-hidden="true" className="text-emerald-700">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {content.separateItems ? (
            <div className="rounded-lg bg-amber-50 p-3 sm:col-span-2">
              <p className="text-sm font-semibold text-slate-900">
                {content.separateItems.title}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {content.separateItems.note}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-800">
                {content.separateItems.items.join("／")}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
      <p className="mt-2 text-xs text-slate-500">
        見積PDFの2ページ目にも、この内容と専門家アドバイスが記載されます。
      </p>
    </section>
  );
}
