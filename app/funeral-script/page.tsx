"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FuneralScriptForm from "@/components/funeral-script/FuneralScriptForm";
import FuneralScriptFileControls from "@/components/funeral-script/FuneralScriptFileControls";
import FuneralScriptAiControls from "@/components/funeral-script/FuneralScriptAiControls";
import FuneralScriptOriginalLetterPanel from "@/components/funeral-script/FuneralScriptOriginalLetterPanel";
import FuneralScriptPreview from "@/components/funeral-script/FuneralScriptPreview";
import FuneralScriptPrintView from "@/components/funeral-script/FuneralScriptPrintView";
import FuneralScriptToolbar from "@/components/funeral-script/FuneralScriptToolbar";
import { cn } from "@/lib/simulatorUtils";
import { createPdfBlobFromElement, downloadPdfBlob } from "@/lib/pdf";
import { generateFuneralScript } from "@/lib/funeral-script/generator";
import {
  buildOriginalCondolenceLetter,
  originalLetterToPrintText,
} from "@/lib/funeral-script/original-letter";
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
  FuneralScriptOriginalLetter,
  FuneralScriptSection,
  GenerateNarrationResponse,
  GenerateOriginalLetterResponse,
} from "@/lib/funeral-script/types";

const AI_GENERIC_ERROR =
  "AI生成に失敗しました。固定テンプレートの台本はそのまま利用できます。";

type WorkspaceView = "form" | "script" | "letter";

// 印刷用CSS（共有 globals.css は変更せず、本ページ内に閉じる）
const PRINT_CSS = `
.fs-print-root { display: none; }
.fs-pdf-root {
  position: fixed;
  left: -10000px;
  top: 0;
  width: 794px;
  min-height: 1123px;
  overflow: visible;
  background: #ffffff;
  color: #0f172a;
  pointer-events: none;
}
@page { size: A4; margin: 16mm 14mm; }
@media print {
  html, body { background: #ffffff !important; }
  .no-print { display: none !important; }
  .fs-pdf-root { display: none !important; }
  .fs-print-root { display: block !important; }
  .fs-print-root { width: auto; margin: 0; padding: 0; }
  .fs-heading { break-after: avoid; page-break-after: avoid; }
  .fs-section.avoid-break { break-inside: avoid; page-break-inside: avoid; }
  .fs-section { break-inside: auto; orphans: 3; widows: 3; }
  .fs-letter-page { break-before: page; page-break-before: always; }
}
`;

function safeFileNamePart(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 40);
}

function buildScriptPdfFileName(form: FuneralScriptFormData): string {
  const name = safeFileNamePart(form.deceasedName || "未入力");
  return `葬儀司会台本_${name}.pdf`;
}

async function writeClipboardText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

export default function FuneralScriptPage() {
  const pdfRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<FuneralScriptFormData>(() =>
    defaultFormData("buddhist_funeral"),
  );
  const [activeView, setActiveView] = useState<WorkspaceView>("form");
  const [sections, setSections] = useState<FuneralScriptSection[]>([]);
  const [copied, setCopied] = useState(false);
  const [letterCopied, setLetterCopied] = useState(false);
  const [originalLetter, setOriginalLetter] =
    useState<FuneralScriptOriginalLetter | null>(null);

  // AIナレーション生成の状態
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  // AI生成前のセクション退避（「AI生成前に戻す」用）
  const [preAiSections, setPreAiSections] = useState<
    FuneralScriptSection[] | null
  >(null);
  const [letterLoading, setLetterLoading] = useState(false);
  const [letterError, setLetterError] = useState<string | null>(null);
  const [letterWarnings, setLetterWarnings] = useState<string[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState("葬儀司会台本.pdf");

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const handleChange = useCallback(
    (patch: Partial<FuneralScriptFormData>) => {
      setForm((prev) => ({ ...prev, ...patch }));
      setPdfError(null);
      setPdfUrl(null);
      if (patch.hasOriginalCondolenceLetter === false) {
        setLetterError(null);
        setLetterWarnings([]);
        setLetterCopied(false);
        setActiveView((prev) => (prev === "letter" ? "form" : prev));
      }
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
    if (form.hasOriginalCondolenceLetter) {
      setOriginalLetter((prev) => prev ?? buildOriginalCondolenceLetter(form));
      setLetterError(null);
      setLetterWarnings([]);
    } else {
      setOriginalLetter(null);
      setLetterError(null);
      setLetterWarnings([]);
    }
    setCopied(false);
    setLetterCopied(false);
    // テンプレート再生成時はAI状態をリセット
    setPreAiSections(null);
    setAiError(null);
    setAiWarnings([]);
    setPdfError(null);
    setPdfUrl(null);
    setActiveView("script");
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
    const json = serializeSavedFile(
      form,
      sections,
      new Date(),
      form.hasOriginalCondolenceLetter ? originalLetter : null,
    );
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = buildSavedFileName(form, new Date());
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [form, sections, originalLetter]);

  // 保存ファイルを読み込み、form と sections を復元
  const handleLoadFile = useCallback(
    (
      loadedForm: FuneralScriptFormData,
      loadedSections: FuneralScriptSection[],
      loadedOriginalLetter?: FuneralScriptOriginalLetter | null,
    ) => {
      const normalizedForm = {
        ...defaultFormData(loadedForm.ceremonyType),
        ...loadedForm,
      };
      setForm(normalizedForm);
      setSections(loadedSections);
      setOriginalLetter(
        loadedOriginalLetter ??
          (normalizedForm.hasOriginalCondolenceLetter
            ? buildOriginalCondolenceLetter(normalizedForm)
            : null),
      );
      setPreAiSections(null);
      setAiError(null);
      setAiWarnings([]);
      setLetterError(null);
      setLetterWarnings([]);
      setCopied(false);
      setLetterCopied(false);
      setPdfError(null);
      setPdfUrl(null);
      setActiveView(loadedSections.length > 0 ? "script" : "form");
    },
    [],
  );

  const handleEditBody = useCallback((id: string, body: string) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === id ? { ...section, body } : section,
      ),
    );
    setPdfError(null);
    setPdfUrl(null);
  }, []);

  const handleEditLetterBody = useCallback((body: string) => {
    setOriginalLetter((prev) =>
      prev
        ? {
            ...prev,
            body,
            updatedAt: new Date().toISOString(),
          }
        : prev,
    );
    setLetterCopied(false);
    setPdfError(null);
    setPdfUrl(null);
  }, []);

  const handleGenerateLetter = useCallback(async () => {
    if (!form.hasOriginalCondolenceLetter) return;
    const current = originalLetter ?? buildOriginalCondolenceLetter(form);
    setOriginalLetter(current);
    setLetterLoading(true);
    setLetterError(null);

    try {
      const res = await fetch("/api/funeral-script/generate-original-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form, currentLetter: current }),
      });
      const data: unknown = await res.json();

      if (!res.ok) {
        const message =
          (data as { error?: string })?.error ||
          "オリジナル会葬礼状の再生成に失敗しました。現在の本文はそのまま編集できます。";
        setLetterError(message);
        setLetterWarnings([]);
        return;
      }

      const ok = data as GenerateOriginalLetterResponse;
      setOriginalLetter(ok.letter);
      setLetterWarnings(ok.warnings ?? []);
      setLetterCopied(false);
    } catch {
      setLetterError(
        "オリジナル会葬礼状の再生成に失敗しました。現在の本文はそのまま編集できます。",
      );
    } finally {
      setLetterLoading(false);
    }
  }, [form, originalLetter]);

  const handleCopy = useCallback(async () => {
    const blocks = [
      sectionsToPlainText(sections, {
        ceremonyType: form.ceremonyType,
        deceasedName: form.deceasedName,
      }),
    ];
    if (form.hasOriginalCondolenceLetter && originalLetter) {
      blocks.push(originalLetterToPrintText(form, originalLetter));
    }
    const text = blocks.join("\n\n────────────────\n\n");
    try {
      await writeClipboardText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // 本文には個人情報が含まれ得るため、内容はログ出力しない
      setCopied(false);
    }
  }, [sections, form, originalLetter]);

  const handleCopyLetter = useCallback(async () => {
    if (!originalLetter) return;
    try {
      await writeClipboardText(originalLetterToPrintText(form, originalLetter));
      setLetterCopied(true);
      window.setTimeout(() => setLetterCopied(false), 2000);
    } catch {
      setLetterCopied(false);
    }
  }, [form, originalLetter]);

  const handleCreatePdf = useCallback(async () => {
    if (sections.length === 0 || !pdfRef.current || pdfLoading) return;

    const filename = buildScriptPdfFileName(form);
    setPdfFileName(filename);
    setPdfLoading(true);
    setPdfError(null);

    try {
      const blob = await createPdfBlobFromElement(pdfRef.current);
      const url = downloadPdfBlob(blob, filename);
      setPdfUrl(url);
    } catch {
      setPdfError(
        "PDF作成に失敗しました。本文をコピーして印刷会社へ渡すか、時間をおいて再度お試しください。",
      );
    } finally {
      setPdfLoading(false);
    }
  }, [form, pdfLoading, sections.length]);

  const hasScript = sections.length > 0;
  const hasLetter = form.hasOriginalCondolenceLetter;
  const deceasedLabel = form.deceasedName.trim() || "故人名未入力";
  const profileCount = [
    form.hobbies,
    form.personality,
    form.episodes,
    form.portraitPhotoDescription,
    form.workDescription || form.career,
    form.familyStructure,
  ].filter((value) => value?.trim()).length;
  const mobileTabs: { id: WorkspaceView; label: string; status: string }[] = [
    {
      id: "form",
      label: "入力",
      status: `${profileCount}/6`,
    },
    {
      id: "script",
      label: "台本",
      status: hasScript ? `${sections.length}項目` : "未生成",
    },
    {
      id: "letter",
      label: "礼状",
      status: hasLetter ? (originalLetter ? "作成済" : "未生成") : "任意",
    },
  ];

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 pb-28 pt-5 sm:px-6 sm:pt-8 lg:pb-10">
      <style>{PRINT_CSS}</style>

      {/* 画面表示（印刷時は非表示） */}
      <div className="no-print">
        <header className="mb-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:mb-5 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
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
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
            <div className="rounded-md bg-stone-50 px-3 py-2">
              <p className="text-xs font-medium text-slate-500">案件</p>
              <p className="mt-0.5 font-semibold text-slate-950">
                {deceasedLabel}
              </p>
            </div>
            <div className="rounded-md bg-stone-50 px-3 py-2">
              <p className="text-xs font-medium text-slate-500">式種別</p>
              <p className="mt-0.5 font-semibold text-slate-950">
                {CEREMONY_TYPE_LABELS[form.ceremonyType]}
              </p>
            </div>
            <div className="rounded-md bg-stone-50 px-3 py-2">
              <p className="text-xs font-medium text-slate-500">作成状況</p>
              <p className="mt-0.5 font-semibold text-slate-950">
                {hasScript ? `台本 ${sections.length}項目` : "台本未生成"}
                {hasLetter ? " ／ 礼状あり" : ""}
              </p>
            </div>
          </div>
        </header>

        <nav className="sticky top-0 z-30 -mx-4 mb-4 border-y border-stone-200 bg-[#f7f4ee]/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:hidden">
          <div className="grid grid-cols-3 gap-2">
            {mobileTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveView(tab.id)}
                disabled={tab.id === "letter" && !hasLetter}
                className={cn(
                  "min-h-12 rounded-md border px-2 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-45",
                  activeView === tab.id
                    ? "border-slate-800 bg-slate-800 text-white"
                    : "border-stone-300 bg-white text-slate-700",
                )}
              >
                <span className="block text-sm font-semibold">{tab.label}</span>
                <span
                  className={cn(
                    "block text-[11px]",
                    activeView === tab.id ? "text-slate-200" : "text-slate-500",
                  )}
                >
                  {tab.status}
                </span>
              </button>
            ))}
          </div>
        </nav>

        <div className="grid gap-5 lg:grid-cols-[minmax(360px,460px)_minmax(0,1fr)] lg:items-start">
          {/* 入力フォーム */}
          <div
            className={cn(
              "content-start gap-4 lg:grid",
              activeView === "form" ? "grid" : "hidden",
            )}
          >
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
            <div
              className={cn(
                "content-start gap-3 lg:grid",
                activeView === "script" ? "grid" : "hidden",
              )}
            >
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
                onCreatePdf={handleCreatePdf}
                copied={copied}
                disabled={!hasScript}
                pdfLoading={pdfLoading}
              />
              {(pdfLoading || pdfError || pdfUrl) && (
                <div
                  className={cn(
                    "rounded-md border px-3 py-2 text-xs leading-5",
                    pdfError
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-emerald-200 bg-emerald-50 text-slate-700",
                  )}
                >
                  {pdfLoading && "PDFを作成しています。長い台本は少し時間がかかります。"}
                  {pdfError && pdfError}
                  {pdfUrl && !pdfLoading && !pdfError && (
                    <span>
                      PDFを作成しました。iPhoneで保存画面が出ない場合は{" "}
                      <a
                        href={pdfUrl}
                        download={pdfFileName}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-emerald-800 underline underline-offset-2"
                      >
                        PDFを開く
                      </a>
                      から共有・保存してください。
                    </span>
                  )}
                </div>
              )}
              {hasScript && (
                <p className="text-xs text-slate-500">
                  {CEREMONY_TYPE_LABELS[form.ceremonyType]} ／ 全{" "}
                  {sections.length} セクション（本文は直接編集できます）
                </p>
              )}
              <FuneralScriptPreview
                sections={sections}
                printSize={form.printSize}
                onEditBody={handleEditBody}
              />
            </div>

            <div
              className={cn(
                "content-start gap-3 lg:grid",
                activeView === "letter" ? "grid" : "hidden",
                !hasLetter && "lg:hidden",
              )}
            >
              <FuneralScriptOriginalLetterPanel
                form={form}
                letter={originalLetter}
                loading={letterLoading}
                error={letterError}
                warnings={letterWarnings}
                copied={letterCopied}
                onEditBody={handleEditLetterBody}
                onRegenerate={handleGenerateLetter}
                onCopy={handleCopyLetter}
              />
            </div>
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] backdrop-blur lg:hidden">
          {activeView === "form" ? (
            <button
              type="button"
              onClick={handleGenerate}
              className="min-h-12 w-full rounded-md bg-amber-600 px-4 py-3 text-sm font-semibold text-white shadow-sm"
            >
              台本を生成して確認へ
            </button>
          ) : (
            <div className="grid gap-2">
              {(pdfError || pdfUrl) && (
                <div
                  className={cn(
                    "rounded-md border px-3 py-2 text-xs leading-5",
                    pdfError
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-emerald-200 bg-emerald-50 text-slate-700",
                  )}
                >
                  {pdfError}
                  {pdfUrl && !pdfError && (
                    <a
                      href={pdfUrl}
                      download={pdfFileName}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-emerald-800 underline underline-offset-2"
                    >
                      作成済みPDFを開く
                    </a>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveView("form")}
                  className="min-h-12 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  入力を直す
                </button>
                <button
                  type="button"
                  onClick={handleCreatePdf}
                  disabled={!hasScript || pdfLoading}
                  className="min-h-12 rounded-md bg-slate-800 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pdfLoading ? "PDF作成中..." : "PDFを作成"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 印刷専用ビュー（画面では非表示、印刷時のみ表示） */}
      <div className="fs-print-root">
        <FuneralScriptPrintView
          sections={sections}
          form={form}
          ceremonyType={form.ceremonyType}
          deceasedName={form.deceasedName}
          printSize={form.printSize}
          originalLetter={originalLetter}
        />
      </div>
      <div ref={pdfRef} className="fs-pdf-root" aria-hidden="true">
        <FuneralScriptPrintView
          sections={sections}
          form={form}
          ceremonyType={form.ceremonyType}
          deceasedName={form.deceasedName}
          printSize={form.printSize}
          originalLetter={originalLetter}
        />
      </div>
    </main>
  );
}
