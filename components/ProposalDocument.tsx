/* eslint-disable @next/next/no-img-element */
import type { EstimateSummary } from "@/components/EstimatePanel";
import {
  companyInfo,
  proposalNotices,
  serviceStaffConfig,
  variableCostAppendix,
} from "@/data/simulatorData";
import type { ProposalLineItem, ProposalTableRow } from "@/lib/proposalTypes";
import { formatYen } from "@/lib/simulatorUtils";

type ProposalDocumentProps = {
  customerName: string;
  createdDate: string;
  altarImage: string;
  altarName: string;
  estimate: EstimateSummary;
  rows: ProposalTableRow[];
  optionItems: ProposalLineItem[];
};

const pdfColors = {
  paper: "#ffffff",
  navy: "#0f172a",
  muted: "#475569",
  subtle: "#64748b",
  gold: "#a16207",
  goldSoft: "#fffbeb",
  line: "#d6d3d1",
  lineSoft: "#e7e5e4",
  panel: "#fafaf9",
};

const firstDetailPageRows = 9;
const rowsPerDetailPage = 13;

function amountText(amount?: number) {
  if (typeof amount !== "number") {
    return "-";
  }

  return formatYen(amount);
}

function chunkRows(rows: ProposalTableRow[]) {
  if (rows.length <= firstDetailPageRows) {
    return [rows];
  }

  const pages: ProposalTableRow[][] = [rows.slice(0, firstDetailPageRows)];

  for (
    let index = firstDetailPageRows;
    index < rows.length;
    index += rowsPerDetailPage
  ) {
    pages.push(rows.slice(index, index + rowsPerDetailPage));
  }

  return pages;
}

function OptionVisualCard({ item }: { item: ProposalLineItem }) {
  return (
    <div
      className="min-h-[122px] rounded-lg border p-2"
      style={{
        backgroundColor: pdfColors.panel,
        borderColor: pdfColors.lineSoft,
      }}
    >
      <div
        className="flex h-[58px] items-center justify-center rounded-md p-1"
        style={{ backgroundColor: pdfColors.paper }}
      >
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            style={{
              height: "auto",
              maxHeight: "100%",
              maxWidth: "100%",
              objectFit: "contain",
              width: "auto",
            }}
          />
        ) : null}
      </div>
      <p
        className="mt-2 text-[10.5px] font-semibold leading-[1.35]"
        style={{
          overflowWrap: "anywhere",
        }}
      >
        {item.name}
      </p>
      {item.quantityLabel ? (
        <p
          className="mt-0.5 text-[9.5px] leading-[1.3]"
          style={{ color: pdfColors.muted, overflowWrap: "anywhere" }}
        >
          {item.quantityLabel}
        </p>
      ) : null}
      {item.note ? (
        <p
          className="mt-0.5 text-[9.5px] font-semibold leading-[1.3]"
          style={{ color: pdfColors.gold, overflowWrap: "anywhere" }}
        >
          {item.note}
        </p>
      ) : null}
    </div>
  );
}

function DetailTable({ rows }: { rows: ProposalTableRow[] }) {
  return (
    <table className="mt-3 w-full border-collapse text-[12px]">
      <thead>
        <tr
          style={{
            backgroundColor: pdfColors.navy,
            color: pdfColors.paper,
          }}
        >
          <th className="w-[112px] px-3 py-2 text-left">項目</th>
          <th className="px-3 py-2 text-left">内容</th>
          <th className="w-[150px] px-3 py-2 text-left">数量</th>
          <th className="w-[100px] px-3 py-2 text-right">単価</th>
          <th className="w-[105px] px-3 py-2 text-right">小計</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.id}
            className="border-b"
            style={{ borderColor: pdfColors.lineSoft }}
          >
            <td
              className="px-3 py-2 font-semibold leading-5"
              style={{ color: pdfColors.muted }}
            >
              {row.category}
            </td>
            <td className="px-3 py-2 leading-5">{row.name}</td>
            <td className="px-3 py-2 leading-5">{row.quantity}</td>
            <td className="px-3 py-2 text-right leading-5">
              {amountText(row.unitPrice)}
            </td>
            <td className="px-3 py-2 text-right font-semibold leading-5">
              {amountText(row.subtotal)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DetailTotalSummary({ estimate }: { estimate: EstimateSummary }) {
  return (
    <section
      className="mt-5 grid grid-cols-2 gap-4 rounded-lg border p-4"
      style={{ borderColor: pdfColors.navy }}
    >
      <div>
        <p
          className="text-sm font-semibold"
          style={{ color: pdfColors.muted }}
        >
          概算合計金額
        </p>
        <p className="mt-1 text-3xl font-semibold">
          {formatYen(estimate.total)}
        </p>
      </div>
      <div className="border-l pl-4" style={{ borderColor: pdfColors.line }}>
        <p className="text-sm" style={{ color: pdfColors.muted }}>
          実費項目
        </p>
        <p className="mt-1 text-lg font-semibold">
          {formatYen(estimate.actualCostAmount)}
        </p>
        <p className="mt-2 text-xs leading-5" style={{ color: pdfColors.muted }}>
          こちらは概算です。正式なお見積もりは内容確認後に作成します。
        </p>
      </div>
    </section>
  );
}

function DetailFooter() {
  return (
    <footer
      className="mt-5 border-t pt-4 text-xs leading-5"
      style={{ borderColor: pdfColors.line, color: pdfColors.muted }}
    >
      <p className="font-semibold" style={{ color: pdfColors.navy }}>
        {companyInfo.name}
      </p>
      <p>
        {companyInfo.postalCode} {companyInfo.address}
      </p>
      <p>フリーダイヤル：{companyInfo.phone}</p>
      <p>{companyInfo.locationLead}</p>
      <p>{companyInfo.parking}</p>
    </footer>
  );
}

function VariableCostAppendixPage({ createdDate }: { createdDate: string }) {
  return (
    <section className="pdf-page flex h-[1124px] flex-col p-[42px]">
      <header
        className="border-b-4 pb-4"
        style={{ borderColor: pdfColors.navy }}
      >
        <p className="text-sm font-semibold" style={{ color: pdfColors.gold }}>
          {companyInfo.name}
        </p>
        <div className="mt-2 flex items-end justify-between gap-8">
          <div>
            <p
              className="text-xs font-semibold"
              style={{ color: pdfColors.subtle }}
            >
              A4別紙
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">
              {variableCostAppendix.title}
            </h1>
          </div>
          <p className="text-sm font-medium" style={{ color: pdfColors.muted }}>
            作成日：{createdDate}
          </p>
        </div>
      </header>

      <section
        className="mt-5 rounded-lg border p-4 text-[12px] font-semibold leading-6"
        style={{
          backgroundColor: pdfColors.goldSoft,
          borderColor: "#f3d37a",
          color: pdfColors.navy,
        }}
      >
        {variableCostAppendix.note}
      </section>

      <section className="mt-5 grid grid-cols-2 gap-3">
        {variableCostAppendix.sections.map((section) => (
          <article
            key={section.id}
            className="rounded-lg border p-3"
            style={{
              backgroundColor: pdfColors.panel,
              borderColor: pdfColors.lineSoft,
            }}
          >
            <h2 className="text-[13px] font-semibold leading-5">
              {section.title}
            </h2>
            <ul
              className="mt-2 space-y-1 text-[11px] leading-[1.45]"
              style={{ color: pdfColors.muted }}
            >
              {section.items.map((item) => {
                const lines = item.split("\n");

                return (
                  <li key={item} className="flex gap-1.5">
                    <span aria-hidden="true">・</span>
                    <span>
                      {lines.map((line, lineIndex) => (
                        <span
                          key={`${item}-${lineIndex}`}
                          className={lineIndex > 0 ? "mt-0.5 block text-[10px]" : "block"}
                          style={{
                            color:
                              lineIndex > 0
                                ? pdfColors.subtle
                                : pdfColors.muted,
                          }}
                        >
                          {line}
                        </span>
                      ))}
                    </span>
                  </li>
                );
              })}
            </ul>
          </article>
        ))}
      </section>

      <footer
        className="mt-auto border-t pt-4 text-xs leading-5"
        style={{ borderColor: pdfColors.line, color: pdfColors.muted }}
      >
        <p className="font-semibold" style={{ color: pdfColors.navy }}>
          {variableCostAppendix.footerNote}
        </p>
        <p className="mt-1">
          {companyInfo.name}　{companyInfo.phone}
        </p>
      </footer>
    </section>
  );
}

export default function ProposalDocument({
  customerName,
  createdDate,
  altarImage,
  altarName,
  estimate,
  rows,
  optionItems,
}: ProposalDocumentProps) {
  const detailPages = chunkRows(rows);
  const firstPageOptionItems = optionItems
    .filter((item) => Boolean(item.image))
    .slice(0, 12);
  const mealStaffCount = estimate.wakeStaffCount + estimate.funeralStaffCount;
  const hasMeal =
    estimate.wakeMealAmount > 0 ||
    estimate.singleFoodAmount > 0 ||
    estimate.funeralMealAmount > 0;

  return (
    <div
      className="w-[794px]"
      style={{ backgroundColor: pdfColors.paper, color: pdfColors.navy }}
    >
      <section className="pdf-page flex h-[1124px] flex-col gap-5 p-[42px]">
        <header
          className="border-b-4 pb-4"
          style={{ borderColor: pdfColors.navy }}
        >
          <p
            className="text-sm font-semibold"
            style={{ color: pdfColors.gold }}
          >
            {companyInfo.name}
          </p>
          <div className="mt-2 flex items-end justify-between gap-8">
            <div>
              <h1 className="text-3xl font-semibold tracking-normal">
                川口典礼 祭壇シミュレーター 概算見積
              </h1>
              <p className="mt-2 text-sm" style={{ color: pdfColors.muted }}>
                完成イメージ確認用
              </p>
            </div>
            <p
              className="text-sm font-medium"
              style={{ color: pdfColors.muted }}
            >
              作成日：{createdDate}
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <p>
              <span
                className="font-semibold"
                style={{ color: pdfColors.subtle }}
              >
                お客様名：
              </span>
              <span className="text-lg font-semibold">{customerName}</span>
            </p>
            <p>
              <span
                className="font-semibold"
                style={{ color: pdfColors.subtle }}
              >
                選択プラン：
              </span>
              <span className="font-semibold">
                {estimate.planName} {estimate.rankName}
              </span>
            </p>
          </div>
        </header>

        <div
          className="flex h-[400px] items-center justify-center rounded-lg border p-4"
          style={{
            backgroundColor: pdfColors.panel,
            borderColor: pdfColors.lineSoft,
          }}
        >
          <img
            src={altarImage}
            alt={altarName}
            className="h-full w-full object-contain"
          />
        </div>

        <section className="min-h-[300px]">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-lg font-semibold">選択したオプション画像</h2>
            <p className="text-xs" style={{ color: pdfColors.muted }}>
              画像のない項目は詳細ページに表示しています。
            </p>
          </div>
          {firstPageOptionItems.length > 0 ? (
            <div className="grid grid-cols-4 gap-3">
              {firstPageOptionItems.map((item) => (
                <OptionVisualCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div
              className="rounded-lg border p-6 text-sm"
              style={{
                borderColor: pdfColors.lineSoft,
                color: pdfColors.muted,
              }}
            >
              画像付きオプションは選択されていません。
            </div>
          )}
        </section>

        <p
          className="mt-auto rounded-lg p-3 text-xs leading-5"
          style={{ backgroundColor: pdfColors.panel, color: pdfColors.muted }}
        >
          お見積もりの詳細内容は、次ページ以降でご確認いただけます。
        </p>
      </section>

      {detailPages.map((pageRows, pageIndex) => {
        const isLastPage = pageIndex === detailPages.length - 1;

        return (
          <section
            key={`detail-page-${pageIndex}`}
            className="pdf-page flex h-[1124px] flex-col p-[42px]"
          >
            <header
              className="border-b-4 pb-4"
              style={{ borderColor: pdfColors.navy }}
            >
              <p
                className="text-sm font-semibold"
                style={{ color: pdfColors.gold }}
              >
                {companyInfo.name}
              </p>
              <div className="mt-2 flex items-end justify-between gap-8">
                <h1 className="text-2xl font-semibold tracking-normal">
                  お打ち合わせ内容ご提案書
                </h1>
                <p
                  className="text-sm font-medium"
                  style={{ color: pdfColors.muted }}
                >
                  作成日：{createdDate}
                </p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <p>
                  <span
                    className="font-semibold"
                    style={{ color: pdfColors.subtle }}
                  >
                    お客様名：
                  </span>
                  <span className="text-lg font-semibold">{customerName}</span>
                </p>
                <p>
                  <span
                    className="font-semibold"
                    style={{ color: pdfColors.subtle }}
                  >
                    選択画像：
                  </span>
                  <span className="font-semibold">{altarName}</span>
                </p>
              </div>
            </header>

            <main className="pt-5">
              {pageIndex === 0 ? <DetailTotalSummary estimate={estimate} /> : null}

              <h2
                className="mt-5 border-b pb-2 text-xl font-semibold"
                style={{ borderColor: pdfColors.line }}
              >
                見積もり詳細
              </h2>
              <DetailTable rows={pageRows} />

              {isLastPage ? (
                <>
                  <section
                    className="mt-6 rounded-lg p-4 text-sm leading-6"
                    style={{
                      backgroundColor: pdfColors.goldSoft,
                      color: pdfColors.muted,
                    }}
                  >
                    {hasMeal ? (
                      <p>
                        {serviceStaffConfig.description}
                        現在の選択内容では配膳人 {mealStaffCount}
                        名を想定しています。
                      </p>
                    ) : (
                      <p>{serviceStaffConfig.description}</p>
                    )}
                  </section>

                  <section
                    className="mt-5 space-y-2 rounded-lg p-4 text-xs leading-5"
                    style={{
                      backgroundColor: pdfColors.panel,
                      color: pdfColors.muted,
                    }}
                  >
                    {proposalNotices.map((notice) => (
                      <p key={notice}>※{notice}</p>
                    ))}
                  </section>

                  <DetailFooter />
                </>
              ) : null}
            </main>

            {!isLastPage ? (
              <p
                className="mt-auto border-t pt-3 text-right text-xs"
                style={{ borderColor: pdfColors.line, color: pdfColors.muted }}
              >
                次ページへ続きます
              </p>
            ) : null}
          </section>
        );
      })}

      <VariableCostAppendixPage createdDate={createdDate} />
    </div>
  );
}
