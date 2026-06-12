"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/simulatorUtils";
import {
  CEREMONY_TYPE_LABELS,
  LENGTH_LABELS,
  PRINT_SIZE_LABELS,
  TONE_LABELS,
} from "@/lib/funeral-script/format";
import type {
  FuneralScriptCeremonyType,
  FuneralScriptFormData,
  FuneralScriptLength,
  FuneralScriptPrintSize,
  FuneralScriptTone,
} from "@/lib/funeral-script/types";

type FuneralScriptFormProps = {
  form: FuneralScriptFormData;
  onChange: (patch: Partial<FuneralScriptFormData>) => void;
  onCeremonyTypeChange: (ceremonyType: FuneralScriptCeremonyType) => void;
  onGenerate: () => void;
};

const cardClass =
  "rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5";
const labelClass = "block text-sm font-medium text-slate-700";
const inputClass =
  "mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500";

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className={cn(inputClass, "resize-y")}
      />
    </label>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-amber-600"
      />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 text-base font-semibold text-slate-950">{children}</h2>
  );
}

export default function FuneralScriptForm({
  form,
  onChange,
  onCeremonyTypeChange,
  onGenerate,
}: FuneralScriptFormProps) {
  const isBuddhist = form.ceremonyType !== "non_religious_funeral";

  return (
    <div className="grid gap-4">
      {/* 基本情報 */}
      <section className={cardClass}>
        <SectionTitle>基本情報</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className={labelClass}>式種別</span>
            <select
              value={form.ceremonyType}
              onChange={(e) =>
                onCeremonyTypeChange(
                  e.target.value as FuneralScriptCeremonyType,
                )
              }
              className={inputClass}
            >
              {(
                Object.keys(
                  CEREMONY_TYPE_LABELS,
                ) as FuneralScriptCeremonyType[]
              ).map((value) => (
                <option key={value} value={value}>
                  {CEREMONY_TYPE_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <TextField
            label="故人名"
            value={form.deceasedName}
            onChange={(v) => onChange({ deceasedName: v })}
            placeholder="例：山田 太郎"
          />
          <TextField
            label="行年（享年）"
            value={form.age}
            onChange={(v) => onChange({ age: v })}
            placeholder="例：88"
          />
          <TextField
            label="生年月日"
            value={form.birthDate}
            onChange={(v) => onChange({ birthDate: v })}
            placeholder="例：昭和10年4月1日"
          />
          <TextField
            label="没日"
            value={form.deathDate}
            onChange={(v) => onChange({ deathDate: v })}
            placeholder="例：令和7年6月1日"
          />
          <TextField
            label="出身地"
            value={form.birthPlace}
            onChange={(v) => onChange({ birthPlace: v })}
            placeholder="例：埼玉県川口市"
          />
          <TextField
            label="会場名"
            value={form.venueName}
            onChange={(v) => onChange({ venueName: v })}
            placeholder="例：川口典礼会館"
          />
          <TextField
            label="開式時刻"
            value={form.startTime}
            onChange={(v) => onChange({ startTime: v })}
            placeholder="例：午前10時"
          />
        </div>
      </section>

      {/* 喪主・関係者 */}
      <section className={cardClass}>
        <SectionTitle>喪主・関係者</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="喪主名"
            value={form.chiefMournerName}
            onChange={(v) => onChange({ chiefMournerName: v })}
            placeholder="例：山田 一郎"
          />
          <TextField
            label="喪主との続柄"
            value={form.relationshipToChiefMourner}
            onChange={(v) => onChange({ relationshipToChiefMourner: v })}
            placeholder="例：ご長男"
          />
          {isBuddhist && (
            <>
              <TextField
                label="寺院名"
                value={form.templeName}
                onChange={(v) => onChange({ templeName: v })}
                placeholder="例：○○宗 ○○寺"
              />
              <TextField
                label="導師名（司式者名）"
                value={form.officiantName}
                onChange={(v) => onChange({ officiantName: v })}
                placeholder="例：○○寺 ご住職"
              />
            </>
          )}
        </div>
        {!isBuddhist && (
          <p className="mt-3 text-xs text-slate-500">
            無宗教式のため、寺院・導師の欄は使用しません。
          </p>
        )}
      </section>

      {/* 故人情報（AI生成の素材） */}
      <section className={cardClass}>
        <SectionTitle>故人情報（ナレーションの素材）</SectionTitle>
        <p className="mb-3 text-xs text-slate-500">
          ここで入力した内容は、次フェーズのAIナレーション生成の素材になります。現状は仮文として一部反映されます。
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="趣味"
            value={form.hobbies}
            onChange={(v) => onChange({ hobbies: v })}
            placeholder="例：俳句、家庭菜園"
          />
          <TextField
            label="人柄"
            value={form.personality}
            onChange={(v) => onChange({ personality: v })}
            placeholder="例：温厚で面倒見がよく"
          />
          <TextAreaField
            label="遺影写真は、いつの何の写真か"
            value={form.portraitPhotoDescription}
            onChange={(v) => onChange({ portraitPhotoDescription: v })}
            placeholder="例：昨年春、家族旅行で撮影した一枚"
          />
          <TextAreaField
            label="エピソード"
            value={form.episodes}
            onChange={(v) => onChange({ episodes: v })}
            placeholder="例：いつも家族を笑顔にしてくれた…"
          />
          <TextField
            label="学歴"
            value={form.education}
            onChange={(v) => onChange({ education: v })}
          />
          <TextField
            label="職歴"
            value={form.career}
            onChange={(v) => onChange({ career: v })}
          />
          <TextField
            label="仕事内容"
            value={form.workDescription}
            onChange={(v) => onChange({ workDescription: v })}
            placeholder="例：地域の建設業"
          />
          <TextField
            label="地域での活動"
            value={form.communityActivities}
            onChange={(v) => onChange({ communityActivities: v })}
          />
          <TextField
            label="生前の功労"
            value={form.achievements}
            onChange={(v) => onChange({ achievements: v })}
          />
          <TextField
            label="家族構成"
            value={form.familyStructure}
            onChange={(v) => onChange({ familyStructure: v })}
          />
        </div>
      </section>

      {/* 進行オプション */}
      <section className={cardClass}>
        <SectionTitle>進行オプション</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleField
            label="弔辞"
            checked={form.hasCondolenceAddress}
            onChange={(v) => onChange({ hasCondolenceAddress: v })}
          />
          <ToggleField
            label="弔電紹介"
            checked={form.hasTelegram}
            onChange={(v) => onChange({ hasTelegram: v })}
          />
          <ToggleField
            label="喪主挨拶"
            checked={form.hasChiefMournerGreeting}
            onChange={(v) => onChange({ hasChiefMournerGreeting: v })}
          />
          {isBuddhist && (
            <ToggleField
              label="初七日 繰上げ併修"
              checked={form.hasMemorialService}
              onChange={(v) => onChange({ hasMemorialService: v })}
            />
          )}
          <ToggleField
            label="お別れ準備案内"
            checked={form.hasFarewellPreparation}
            onChange={(v) => onChange({ hasFarewellPreparation: v })}
          />
          <ToggleField
            label="出棺案内"
            checked={form.hasDeparture}
            onChange={(v) => onChange({ hasDeparture: v })}
          />
          <ToggleField
            label="火葬場同行案内"
            checked={form.hasCrematoriumGuidance}
            onChange={(v) => onChange({ hasCrematoriumGuidance: v })}
          />
          {!isBuddhist && (
            <>
              <ToggleField
                label="黙祷"
                checked={form.hasSilentPrayer}
                onChange={(v) => onChange({ hasSilentPrayer: v })}
              />
              <ToggleField
                label="献花"
                checked={form.hasFlowerOffering}
                onChange={(v) => onChange({ hasFlowerOffering: v })}
              />
              <ToggleField
                label="献灯"
                checked={form.hasCandleOffering}
                onChange={(v) => onChange({ hasCandleOffering: v })}
              />
            </>
          )}
        </div>
        {!isBuddhist && (
          <p className="mt-3 text-xs text-slate-500">
            お供えは「献花 → 献灯 → 焼香」の優先で1つ案内します。いずれも未選択の場合は焼香案内になります。
          </p>
        )}
      </section>

      {/* 台本設定 */}
      <section className={cardClass}>
        <SectionTitle>台本設定</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className={labelClass}>文体</span>
            <select
              value={form.tone}
              onChange={(e) =>
                onChange({ tone: e.target.value as FuneralScriptTone })
              }
              className={inputClass}
            >
              {(Object.keys(TONE_LABELS) as FuneralScriptTone[]).map((v) => (
                <option key={v} value={v}>
                  {TONE_LABELS[v]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>長さ</span>
            <select
              value={form.length}
              onChange={(e) =>
                onChange({ length: e.target.value as FuneralScriptLength })
              }
              className={inputClass}
            >
              {(Object.keys(LENGTH_LABELS) as FuneralScriptLength[]).map(
                (v) => (
                  <option key={v} value={v}>
                    {LENGTH_LABELS[v]}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>印刷文字サイズ</span>
            <select
              value={form.printSize}
              onChange={(e) =>
                onChange({
                  printSize: e.target.value as FuneralScriptPrintSize,
                })
              }
              className={inputClass}
            >
              {(
                Object.keys(PRINT_SIZE_LABELS) as FuneralScriptPrintSize[]
              ).map((v) => (
                <option key={v} value={v}>
                  {PRINT_SIZE_LABELS[v]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <button
        type="button"
        onClick={onGenerate}
        className="rounded-md bg-amber-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2"
      >
        台本を生成する
      </button>
    </div>
  );
}
