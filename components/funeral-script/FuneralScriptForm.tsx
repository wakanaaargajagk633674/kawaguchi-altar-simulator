"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { cn } from "@/lib/simulatorUtils";
import {
  CEREMONY_TYPE_LABELS,
  LENGTH_LABELS,
  PRINT_SIZE_LABELS,
  TONE_LABELS,
  WAKE_ATTENDANCE_LABELS,
} from "@/lib/funeral-script/format";
import type {
  FuneralScriptCeremonyType,
  FuneralScriptFormData,
  FuneralScriptLength,
  FuneralScriptPrintSize,
  FuneralScriptTone,
  FuneralScriptWakeAttendance,
} from "@/lib/funeral-script/types";

type FuneralScriptFormProps = {
  form: FuneralScriptFormData;
  onChange: (patch: Partial<FuneralScriptFormData>) => void;
  onCeremonyTypeChange: (ceremonyType: FuneralScriptCeremonyType) => void;
  onGenerate: () => void;
};

const cardClass =
  "overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm";
const labelClass = "block text-sm font-medium text-slate-700";
const inputClass =
  "mt-1 min-h-11 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-base text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 sm:text-sm";

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
        rows={3}
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
    <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-2">
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

function FormSection({
  title,
  summary,
  children,
  defaultOpen = false,
}: {
  title: string;
  summary?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <details
      className={cardClass}
      open={isOpen}
      onToggle={(e) => setIsOpen(e.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 outline-none transition hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-amber-500 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-base font-semibold text-slate-950">
            {title}
          </span>
          {summary && (
            <span className="mt-0.5 block text-xs leading-5 text-slate-500">
              {summary}
            </span>
          )}
        </span>
        <span className="shrink-0 rounded-full border border-stone-300 px-2 py-1 text-xs font-semibold text-slate-600">
          開閉
        </span>
      </summary>
      <div className="border-t border-stone-100 px-4 py-4 sm:px-5">
        {children}
      </div>
    </details>
  );
}

export default function FuneralScriptForm({
  form,
  onChange,
  onCeremonyTypeChange,
  onGenerate,
}: FuneralScriptFormProps) {
  const isBuddhist = form.ceremonyType.startsWith("buddhist");
  // 告別式を含む式のみ「通夜の引き継ぎ」欄を表示（通夜のみは対象外）
  const hasFuneralDay = form.ceremonyType !== "buddhist_wake";

  return (
    <div className="grid gap-4">
      {/* 基本情報 */}
      <FormSection
        title="基本情報"
        summary="式種別、故人名、日時など台本の土台になる項目です。"
        defaultOpen
      >
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
      </FormSection>

      {/* 喪主・関係者 */}
      <FormSection
        title="喪主・関係者"
        summary="焼香順や開式の辞に使う名前を確認します。"
      >
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
      </FormSection>

      {/* 故人情報（AI生成の素材） */}
      <FormSection
        title="取材メモ"
        summary="ナレーションと礼状の精度に直結します。短い箇条書きでも使えます。"
        defaultOpen
      >
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
      </FormSection>

      {/* オリジナル会葬礼状 */}
      <FormSection
        title="オリジナル会葬礼状"
        summary="必要な案件だけオンにします。本文は生成後に礼状画面で編集できます。"
      >
        <ToggleField
          label="オリジナル会葬礼状を作成する"
          checked={form.hasOriginalCondolenceLetter}
          onChange={(v) => onChange({ hasOriginalCondolenceLetter: v })}
        />
        {form.hasOriginalCondolenceLetter && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <TextField
              label="礼状日付"
              value={form.letterDate}
              onChange={(v) => onChange({ letterDate: v })}
              placeholder="例：令和8年6月26日"
            />
            <TextField
              label="礼状の続柄表記"
              value={form.letterDeceasedRelationLabel}
              onChange={(v) => onChange({ letterDeceasedRelationLabel: v })}
              placeholder="例：亡父 / 亡母 / 故"
            />
            <TextField
              label="差出人住所"
              value={form.letterSenderAddress}
              onChange={(v) => onChange({ letterSenderAddress: v })}
              placeholder="例：埼玉県川口市..."
            />
            <TextField
              label="差出人名（喪主名）"
              value={form.letterSenderName}
              onChange={(v) => onChange({ letterSenderName: v })}
              placeholder="空欄なら喪主名を使用"
            />
            <div className="sm:col-span-2">
              <TextField
                label="礼状の見出し・タイトル案"
                value={form.letterTitle}
                onChange={(v) => onChange({ letterTitle: v })}
                placeholder="例：ありがとう　いつも家族を見守ってくれた父へ"
              />
            </div>
            <div className="sm:col-span-2">
              <TextAreaField
                label="必ず伝えたいこと"
                value={form.letterMainMessage}
                onChange={(v) => onChange({ letterMainMessage: v })}
                placeholder="例：家族のために休まず働いてくれたことへの感謝を中心にしたい"
              />
            </div>
            <div className="sm:col-span-2">
              <TextAreaField
                label="口癖・好きだった言葉・印象的な一言"
                value={form.letterMemorableWords}
                onChange={(v) => onChange({ letterMemorableWords: v })}
                placeholder="例：大丈夫だよ / ありがとう / 家族が一番"
              />
            </div>
            <div className="sm:col-span-2">
              <TextAreaField
                label="喪主・ご家族からの修正指示"
                value={form.letterFamilyInstructions}
                onChange={(v) => onChange({ letterFamilyInstructions: v })}
                placeholder="例：仕事の話を短くし、孫との思い出を入れてほしい"
              />
            </div>
            <div className="sm:col-span-2">
              <TextAreaField
                label="印刷会社への申し送り"
                value={form.letterPrintInstructions}
                onChange={(v) => onChange({ letterPrintInstructions: v })}
                placeholder="例：二つ折りカード、縦書き、淡い花柄で校正希望"
              />
            </div>
            <p className="sm:col-span-2 text-xs leading-5 text-slate-500">
              チェックした場合のみ、取材内容から礼状原稿を作成します。原稿はプレビュー側で直接編集でき、礼状だけを再生成できます。
            </p>
          </div>
        )}
      </FormSection>

      {/* 通夜の引き継ぎ（告別式で通夜に言及する素材） */}
      {hasFuneralDay && (
        <FormSection
          title="通夜の引き継ぎ"
          summary="告別式で通夜の様子に触れる場合だけ入力します。"
        >
          <div className="grid gap-3">
            <label className="block">
              <span className={labelClass}>通夜の会葬者の様子</span>
              <select
                value={form.wakeAttendance ?? ""}
                onChange={(e) =>
                  onChange({
                    wakeAttendance: e.target
                      .value as FuneralScriptWakeAttendance,
                  })
                }
                className={inputClass}
              >
                {(
                  Object.keys(
                    WAKE_ATTENDANCE_LABELS,
                  ) as FuneralScriptWakeAttendance[]
                ).map((v) => (
                  <option key={v} value={v}>
                    {WAKE_ATTENDANCE_LABELS[v]}
                  </option>
                ))}
              </select>
            </label>
            <TextAreaField
              label="通夜で印象的だったこと（任意）"
              value={form.wakeImpression}
              onChange={(v) => onChange({ wakeImpression: v })}
              placeholder="例：弔問の列が途切れず、町内の皆様が多く参列された"
            />
          </div>
        </FormSection>
      )}

      {/* 進行オプション */}
      <FormSection
        title="進行オプション"
        summary="弔電、喪主挨拶、出棺案内など式次第を選びます。"
      >
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
              <ToggleField
                label="焼香"
                checked={form.hasIncense}
                onChange={(v) => onChange({ hasIncense: v })}
              />
            </>
          )}
        </div>
        {!isBuddhist && (
          <p className="mt-3 text-xs text-slate-500">
            お供えは選択したものを「献花 → 献灯 → 焼香」の順にご案内します（既定は 献灯 → 焼香）。
          </p>
        )}
      </FormSection>

      {/* 台本設定 */}
      <FormSection
        title="台本設定"
        summary="文体、長さ、印刷時の文字サイズを調整します。"
      >
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
      </FormSection>

      <button
        type="button"
        onClick={onGenerate}
        className="min-h-12 rounded-md bg-amber-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2"
      >
        台本を生成する
      </button>
    </div>
  );
}
