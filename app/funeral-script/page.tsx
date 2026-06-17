"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import FuneralScriptForm from "@/components/funeral-script/FuneralScriptForm";
import FuneralScriptFileControls from "@/components/funeral-script/FuneralScriptFileControls";
import FuneralScriptAiControls from "@/components/funeral-script/FuneralScriptAiControls";
import FuneralScriptPreview from "@/components/funeral-script/FuneralScriptPreview";
import FuneralScriptPrintView from "@/components/funeral-script/FuneralScriptPrintView";
import FuneralScriptToolbar from "@/components/funeral-script/FuneralScriptToolbar";
import { generateFuneralScript } from "@/lib/funeral-script/generator";
import {
  buildSavedFileName,
  serializeSavedFile,
} from "@/lib/funeral-script/save-file";
import {
  CEREMONY_TYPE_LABELS,
  defaultFormData,
  sectionsToPlainText,
} from "@/lib/funeral-script/format";
import type {
  FuneralScriptCeremonyType,
  FuneralScriptFormData,
  FuneralScriptSection,
  GenerateNarrationResponse,
} from "@/lib/funeral-script/types";

const AI_GENERIC_ERROR =
  "AI生成に失敗しました。固定テンプレートの台本はそのまま利用できます。";

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

  // AIナレーション生成の状態
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  // AI生成前のセクション退避（「AI生成前に戻す」用）
  const [preAiSections, setPreAiSections] = useState<
    FuneralScriptSection[] | null
  >(null);

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
    // テンプレート再生成時はAI状態をリセット
    setPreAiSections(null);
    setAiError(null);
    setAiWarnings([]);
  }, [form]);

  // AI生成対象（ai_placeholder）の id 一覧
  const aiTargetIds = useMemo(
    () =>
      sections.filter((s) => s.kind === "ai_placeholder").map((s) => s.id),
    [sections],
  );
  const hasAiGenerated = useMemo(
    () => sections.some((s) => s.aiGenerated),
    [sections],
  );

  const handleGenerateAi = useCallback(async () => {
    if (aiTargetIds.length === 0) return;
    setAiLoading(true);
    setAiError(null);
    // AI生成前のスナップショットを一度だけ退避（プレースホルダー基準を保持）
    setPreAiSections((prev) => prev ?? sections);

    try {
      const res = await fetch("/api/funeral-script/generate-narration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form,
          sections,
          targetSectionIds: aiTargetIds,
        }),
      });
      const data: unknown = await res.json();

      if (!res.ok) {
        const message =
          (data as { error?: string })?.error || AI_GENERIC_ERROR;
        setAiError(message);
        setAiWarnings([]);
        return;
      }

      const ok = data as GenerateNarrationResponse;
      const generatedById = new Map(ok.sections.map((s) => [s.id, s]));
      // 返ってきた id に対応する ai_placeholder の本文だけ置換（固定部分は触れない）
      setSections((prev) =>
        prev.map((section) => {
          const g = generatedById.get(section.id);
          if (g && section.kind === "ai_placeholder") {
            return {
              ...section,
              body: g.body,
              note: undefined,
              aiGenerated: true,
            };
          }
          return section;
        }),
      );
      setAiWarnings(ok.warnings ?? []);
      setCopied(false);
    } catch {
      // 入力本文はログ出力しない
      setAiError(AI_GENERIC_ERROR);
    } finally {
      setAiLoading(false);
    }
  }, [aiTargetIds, sections, form]);

  const handleRevertAi = useCallback(() => {
    if (!preAiSections) return;
    setSections(preAiSections);
    setPreAiSections(null);
    setAiWarnings([]);
    setAiError(null);
    setCopied(false);
  }, [preAiSections]);

  // 台本をファイルに書き出す（通夜→告別式の引き継ぎ用）
  const handleSaveFile = useCallback(() => {
    const json = serializeSavedFile(form, sections, new Date());
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = buildSavedFileName(form, new Date());
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [form, sections]);

  // 保存ファイルを読み込み、form と sections を復元
  const handleLoadFile = useCallback(
    (
      loadedForm: FuneralScriptFormData,
      loadedSections: FuneralScriptSection[],
    ) => {
      setForm(loadedForm);
      setSections(loadedSections);
      setPreAiSections(null);
      setAiError(null);
      setAiWarnings([]);
      setCopied(false);
    },
    [],
  );

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
            進行案内は固定のまま、ナレーション部分だけを任意でAI生成できます（生成結果は編集可能）。
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* 入力フォーム */}
          <div className="grid content-start gap-4">
            <FuneralScriptFileControls
              canSave={hasScript}
              onSave={handleSaveFile}
              onLoaded={handleLoadFile}
            />
            <FuneralScriptForm
              form={form}
              onChange={handleChange}
              onCeremonyTypeChange={handleCeremonyTypeChange}
              onGenerate={handleGenerate}
            />
          </div>

          {/* プレビュー */}
          <div className="grid content-start gap-3">
            {hasScript && (
              <FuneralScriptAiControls
                targetCount={aiTargetIds.length}
                hasGenerated={hasAiGenerated}
                loading={aiLoading}
                error={aiError}
                warnings={aiWarnings}
                onGenerate={handleGenerateAi}
                onRevert={handleRevertAi}
                canRevert={preAiSections !== null}
              />
            )}
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
