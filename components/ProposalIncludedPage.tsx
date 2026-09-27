import type { EstimateSummary } from "@/components/EstimatePanel";
import {
  estimateReadingGuide,
  planIncludedContents,
} from "@/data/planIncludedItems";
import type { FuneralPlan } from "@/data/simulatorData";
import { companyInfo } from "@/data/simulatorData";
import { formatYen } from "@/lib/simulatorUtils";

// 見積PDF 2ページ目: 「基本セットに含まれるもの」と専門家アドバイス。
// 色は ProposalDocument と揃える（html2canvas 対策でインライン指定）。
const colors = {
  paper: "#ffffff",
  navy: "#0f172a",
  muted: "#475569",
  subtle: "#64748b",
  gold: "#a16207",
  goldSoft: "#fffbeb",
  goldLine: "#f3d37a",
  line: "#d6d3d1",
  lineSoft: "#e7e5e4",
  panel: "#fafaf9",
  check: "#15803d",
};

type ProposalIncludedPageProps = {
  planCategory: FuneralPlan["category"];
  customerName: string;
  createdDate: string;
  estimate: EstimateSummary;
};

function BreakdownRow({
  label,
  note,
  amount,
  sign = "",
  strong = false,
}: {
  label: string;
  note?: string;
  amount: number;
  sign?: string;
  strong?: boolean;
}) {
  return (
    <div
      className="flex items-baseline justify-between gap-3 border-b py-1.5"
      style={{ borderColor: colors.lineSoft }}
    >
      <div>
        <span
          className={strong ? "text-[14px] font-semibold" : "text-[12px] font-semibold"}
        >
          {label}
        </span>
        {note ? (
          <span className="ml-2 text-[10px]" style={{ color: colors.subtle }}>
            {note}
          </span>
        ) : null}
      </div>
      <span
        className={strong ? "text-[18px] font-semibold" : "text-[13px] font-semibold"}
      >
        {sign}
        {formatYen(amount)}
      </span>
    </div>
  );
}

export default function ProposalIncludedPage({
  planCategory,
  customerName,
  createdDate,
  estimate,
}: ProposalIncludedPageProps) {
  const content = planIncludedContents[planCategory];
  const planAfterDiscount = estimate.planAmount - estimate.memberDiscount;
  const additionAmount = Math.max(
    0,
    estimate.total - planAfterDiscount - estimate.actualCostAmount,
  );
  const hasSeparate = Boolean(content.separateItems);

  return (
    <section className="pdf-page flex h-[1124px] flex-col p-[42px]">
      <header className="border-b-4 pb-3" style={{ borderColor: colors.navy }}>
        <p className="text-sm font-semibold" style={{ color: colors.gold }}>
          {companyInfo.name}
        </p>
        <div className="mt-1 flex items-end justify-between gap-8">
          <h1 className="text-2xl font-semibold tracking-normal">
            プラン内容とお見積りの見方
          </h1>
          <p className="text-sm font-medium" style={{ color: colors.muted }}>
            作成日：{createdDate}
          </p>
        </div>
        <p className="mt-2 text-sm">
          <span className="font-semibold" style={{ color: colors.subtle }}>
            お客様名：
          </span>
          <span className="font-semibold">{customerName}</span>
          <span className="ml-6 font-semibold" style={{ color: colors.subtle }}>
            プラン：
          </span>
          <span className="font-semibold">
            {estimate.planName} {estimate.rankName}（{estimate.taxLabel}）
          </span>
        </p>
      </header>

      <p className="mt-3 text-[12.5px] leading-6" style={{ color: colors.muted }}>
        {content.lead}
      </p>

      {/* 日程の流れ */}
      <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold">
        {content.schedule.map((step, index) => (
          <div key={step} className="flex items-center gap-1">
            {index > 0 ? (
              <span aria-hidden="true" style={{ color: colors.gold }}>
                ▶
              </span>
            ) : null}
            <span
              className="rounded px-2 py-1"
              style={{ backgroundColor: colors.panel, border: `1px solid ${colors.lineSoft}` }}
            >
              {step}
            </span>
          </div>
        ))}
      </div>

      {/* 金額の内訳 */}
      <section className="mt-4 grid grid-cols-[1fr_1.15fr] gap-4">
        <div className="rounded-lg border p-3" style={{ borderColor: colors.navy }}>
          <h2 className="text-[13px] font-semibold" style={{ color: colors.gold }}>
            概算金額の内訳
          </h2>
          <div className="mt-1">
            <BreakdownRow
              label="① 基本プラン料金"
              note="基本セット込み"
              amount={estimate.planAmount}
            />
            {estimate.memberDiscount > 0 ? (
              <BreakdownRow
                label="　 会員割引"
                amount={estimate.memberDiscount}
                sign="−"
              />
            ) : null}
            <BreakdownRow
              label="② 追加・グレードアップ"
              note="ご希望で選択"
              amount={additionAmount}
              sign="＋"
            />
            <BreakdownRow
              label="③ 日数等による加算"
              note="安置・ドライアイス等"
              amount={estimate.actualCostAmount}
              sign="＋"
            />
            <BreakdownRow label="概算合計" amount={estimate.total} strong />
          </div>
          <p className="mt-1.5 text-[10px] leading-4" style={{ color: colors.subtle }}>
            ※火葬料・お布施など実費は含みません（別紙参照）。
          </p>
        </div>

        <div className="space-y-2">
          {estimateReadingGuide.map((guide) => (
            <div
              key={guide.step}
              className="flex gap-2 rounded-lg p-2"
              style={{ backgroundColor: colors.panel, border: `1px solid ${colors.lineSoft}` }}
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold"
                style={{ backgroundColor: colors.navy, color: colors.paper }}
              >
                {guide.step}
              </span>
              <div>
                <p className="text-[12px] font-semibold">{guide.title}</p>
                <p className="text-[10.5px] leading-[1.45]" style={{ color: colors.muted }}>
                  {guide.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 基本セット内容 */}
      <section className="mt-4">
        <div className="flex items-end justify-between border-b pb-1.5" style={{ borderColor: colors.line }}>
          <h2 className="text-lg font-semibold">
            <span style={{ color: colors.check }}>✓</span> 基本プラン料金に含まれるもの
          </h2>
          <p className="text-[10px]" style={{ color: colors.subtle }}>
            ランクにより祭壇の規模・内容が異なります
          </p>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {content.groups.map((group) => (
            <article
              key={group.id}
              className="rounded-lg border p-2"
              style={{ borderColor: colors.lineSoft, backgroundColor: colors.panel }}
            >
              <h3 className="text-[11.5px] font-semibold" style={{ color: colors.gold }}>
                {group.title}
              </h3>
              <ul className="mt-1 space-y-0.5 text-[10.5px] leading-[1.4]">
                {group.items.map((item) => (
                  <li key={item} className="flex gap-1">
                    <span aria-hidden="true" style={{ color: colors.check }}>
                      ✓
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {content.separateItems ? (
        <section
          className="mt-3 rounded-lg border p-2.5"
          style={{ borderColor: colors.goldLine, backgroundColor: colors.goldSoft }}
        >
          <h2 className="text-[12.5px] font-semibold">{content.separateItems.title}</h2>
          <p className="mt-0.5 text-[10px] leading-4" style={{ color: colors.muted }}>
            {content.separateItems.note}
          </p>
          <p className="mt-1 text-[10.5px] leading-[1.6]">
            {content.separateItems.items.join("　／　")}
          </p>
        </section>
      ) : null}

      {/* 専門家アドバイス */}
      <section
        className={`${hasSeparate ? "mt-3" : "mt-4"} rounded-lg border-l-4 p-3`}
        style={{ borderColor: colors.gold, backgroundColor: colors.goldSoft }}
      >
        <h2 className="text-[13px] font-semibold">
          葬祭ディレクターからのアドバイス
        </h2>
        <ul className="mt-1.5 space-y-1 text-[11px] leading-[1.55]" style={{ color: colors.navy }}>
          {content.advice.map((advice) => (
            <li key={advice} className="flex gap-1.5">
              <span aria-hidden="true" style={{ color: colors.gold }}>
                ●
              </span>
              <span>{advice}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer
        className="mt-auto border-t pt-2 text-[10.5px] leading-5"
        style={{ borderColor: colors.line, color: colors.muted }}
      >
        ご不明な点は、どんな小さなことでもお気軽にご質問ください。
        {companyInfo.name}　フリーダイヤル {companyInfo.phone}
      </footer>
    </section>
  );
}
