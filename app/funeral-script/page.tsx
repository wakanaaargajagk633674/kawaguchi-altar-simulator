"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import FuneralScriptForm from "@/components/funeral-script/FuneralScriptForm";
import FuneralScriptPreview from "@/components/funeral-script/FuneralScriptPreview";
import FuneralScriptPrintView from "@/components/funeral-script/FuneralScriptPrintView";
import FuneralScriptToolbar from "@/components/funeral-script/FuneralScriptToolbar";
import { generateFuneralScript } from "@/lib/funeral-script/generator";
import {
  CEREMONY_TYPE_LABELS,
  defaultFormData,
  sectionsToPlainText,
} from "@/lib/funeral-script/format";
import type {
  FuneralScriptCeremonyType,
  FuneralScriptFormData,
  FuneralScriptSection,
} from "@/lib/funeral-script/types";

// 印刷用CSS（共有 globals.css は変更せず、本ページ内に閉じる）
const PRINT_CSS = `
.fs-print-root { display: none; }
@page { size: A4; margin: 16mm 14mm; }
@media print {
  html, body { background: #ffffff !important; }
  .no-print { display: none !important; }
  .fs-print-root { display: block !important; }
  .fs-print-root { width: auto; margin: 0; padding: 0; }
  .fs-heading { break-after: avoid; page-break-after: avoid; }
  .fs-section.avoid-break { break-inside: avoid; page-break-inside: avoid; }
  .fs-section { break-inside: auto; orphans: 3; widows: 3; }
}
`;

export default function FuneralScriptPage() {
  const [form, setForm] = useState<FuneralScriptFormData>(() =>
    defaultFormData("buddhist_funeral"),
  );
  const [sections, setSections] = useState<FuneralScriptSection[]>([]);
  const [copied, setCopied] = useState(false);

  const handleChange = useCallback(
    (patch: Partial<FuneralScriptFormData>) => {
      setForm((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  // 式種別変更時は、その式に推奨の進行オプション既定値へ更新（入力済みテキストは保持）
  const handleCeremonyTypeChange = useCallback(
    (ceremonyType: FuneralScriptCeremonyType) => {
      const d = defaultFormData(ceremonyType);
      setForm((prev) => ({
        ...prev,
        ceremonyType,
        hasCondolenceAddress: d.hasCondolenceAddress,
        hasTelegram: d.hasTelegram,
        hasChiefMournerGreeting: d.hasChiefMournerGreeting,
        hasMemorialService: d.hasMemorialService,
        hasFarewellPreparation: d.hasFarewellPreparation,
        hasDeparture: d.hasDeparture,
        hasCrematoriumGuidance: d.hasCrematoriumGuidance,
        hasFlowerOffering: d.hasFlowerOffering,
        hasCandleOffering: d.hasCandleOffering,
        hasSilentPrayer: d.hasSilentPrayer,
      }));
    },
    [],
  );

  const handleGenerate = useCallback(() => {
    setSections(generateFuneralScript(form));
    setCopied(false);
  }, [form]);

  const handleEditBody = useCallback((id: string, body: string) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === id ? { ...section, body } : section,
      ),
    );
  }, []);

  const handleCopy = useCallback(async () => {
    const text = sectionsToPlainText(sections, {
      ceremonyType: form.ceremonyType,
      deceasedName: form.deceasedName,
    });
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // フォールバック（クリップボードAPI非対応環境）
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // 本文には個人情報が含まれ得るため、内容はログ出力しない
      setCopied(false);
    }
  }, [sections, form.ceremonyType, form.deceasedName]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const hasScript = sections.length > 0;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <style>{PRINT_CSS}</style>

      {/* 画面表示（印刷時は非表示） */}
      <div className="no-print">
        <header className="mb-6">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-amber-700">川口典礼</p>
            <Link
              href="/"
              className="text-xs text-slate-500 underline-offset-2 hover:text-amber-700 hover:underline"
            >
              ← 祭壇シミュレーターへ
            </Link>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">
            葬儀司会台本作成
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            式種別と各項目を入力すると、固定テンプレートから司会台本を生成します。
            ナレーション部分は次フェーズでAI生成予定のプレースホルダーとして表示されます。
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* 入力フォーム */}
          <div>
            <FuneralScriptForm
              form={form}
              onChange={handleChange}
              onCeremonyTypeChange={handleCeremonyTypeChange}
              onGenerate={handleGenerate}
            />
          </div>

          {/* プレビュー */}
          <div className="grid content-start gap-3">
            <FuneralScriptToolbar
              printSize={form.printSize}
              onPrintSizeChange={(printSize) => handleChange({ printSize })}
              onCopy={handleCopy}
              onPrint={handlePrint}
              copied={copied}
              disabled={!hasScript}
            />
            {hasScript && (
              <p className="text-xs text-slate-500">
                {CEREMONY_TYPE_LABELS[form.ceremonyType]} ／ 全 {sections.length}{" "}
                セクション（本文は直接編集できます）
              </p>
            )}
            <FuneralScriptPreview
              sections={sections}
              printSize={form.printSize}
              onEditBody={handleEditBody}
            />
          </div>
        </div>
      </div>

      {/* 印刷専用ビュー（画面では非表示、印刷時のみ表示） */}
      <div className="fs-print-root">
        <FuneralScriptPrintView
          sections={sections}
          ceremonyType={form.ceremonyType}
          deceasedName={form.deceasedName}
          printSize={form.printSize}
        />
      </div>
    </main>
  );
}
