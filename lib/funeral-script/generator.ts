/**
 * 台本生成ロジック（固定テンプレート方式・AIなし）。
 *
 * generateFuneralScript(form) は、式種別に応じた進行フロー（flows.ts）を辿り、
 * 進行オプションの有無で各セクションを出し分け、固定テンプレート（phrases.ts）に
 * フォーム値を差し込んだ FuneralScriptSection[] を返す。
 */

import type { FlowStep, FlowStepKey } from "./flows";
import { getFlow } from "./flows";
import {
  aiNarration,
  buildScriptContext,
  candleOffering,
  chiefMournerGreeting,
  closingBuddhistFuneral,
  closingBuddhistWake,
  closingNonReligious,
  condolenceAddress,
  crematoriumGuidance,
  departure,
  farewellPreparation,
  flowerOffering,
  incense,
  memorialService,
  officiantEntrance,
  officiantExit,
  openingBuddhist,
  openingNonReligious,
  preAnnouncementBuddhistFuneral,
  preAnnouncementBuddhistWake,
  preAnnouncementNonReligious,
  silentPrayer,
  telegram,
  type ScriptContext,
  type SectionDraft,
} from "./phrases";
import type { FuneralScriptFormData, FuneralScriptSection } from "./types";

/** 無宗教式のお供え（献花 > 献灯 > 焼香 の優先で1つ選ぶ） */
function nonReligiousOffering(
  ctx: ScriptContext,
  form: FuneralScriptFormData,
): SectionDraft {
  if (form.hasFlowerOffering) return flowerOffering(ctx);
  if (form.hasCandleOffering) return candleOffering(ctx);
  return incense(ctx); // いずれも未指定なら焼香でフォールバック
}

/** フローのステップ1つを SectionDraft（または null=スキップ）に変換 */
function buildStep(
  key: FlowStepKey,
  ctx: ScriptContext,
  form: FuneralScriptFormData,
): SectionDraft | null {
  const isWake = form.ceremonyType === "buddhist_wake";

  switch (key) {
    case "pre_announcement":
      if (form.ceremonyType === "non_religious_funeral")
        return preAnnouncementNonReligious(ctx);
      return isWake
        ? preAnnouncementBuddhistWake(ctx)
        : preAnnouncementBuddhistFuneral(form);

    case "opening":
      return form.ceremonyType === "non_religious_funeral"
        ? openingNonReligious(ctx)
        : openingBuddhist(ctx, form);

    case "officiant_entrance":
      return officiantEntrance();

    case "officiant_exit":
      return officiantExit();

    case "narration_opening":
      return aiNarration(ctx, form, {
        title: "開式ナレーション",
        phase: "opening",
      });

    case "narration_main":
      return aiNarration(ctx, form, {
        title: "メインナレーション",
        phase: "main",
      });

    case "narration_closing":
      return aiNarration(ctx, form, {
        title: "閉式前ナレーション",
        phase: "closing",
      });

    case "incense":
      return incense(ctx);

    case "offering":
      return nonReligiousOffering(ctx, form);

    case "silent_prayer":
      return silentPrayer(ctx);

    case "condolence_address":
      return condolenceAddress();

    case "telegram":
      return telegram();

    case "chief_mourner_greeting":
      return chiefMournerGreeting(ctx);

    case "memorial_service":
      return memorialService();

    case "farewell_preparation":
      return farewellPreparation(ctx);

    case "closing":
      if (form.ceremonyType === "non_religious_funeral")
        return closingNonReligious(ctx);
      return isWake ? closingBuddhistWake(ctx) : closingBuddhistFuneral(ctx);

    case "departure":
      return departure(ctx);

    case "crematorium_guidance":
      return crematoriumGuidance(ctx);

    default:
      return null;
  }
}

/** 進行フローを台本セクション配列へ変換する。 */
export function generateFuneralScript(
  form: FuneralScriptFormData,
): FuneralScriptSection[] {
  const ctx = buildScriptContext(form);
  const flow = getFlow(form.ceremonyType);

  const sections: FuneralScriptSection[] = [];
  let index = 0;

  for (const step of flow as FlowStep[]) {
    if (step.when && !step.when(form)) continue;

    const draft = buildStep(step.key, ctx, form);
    if (!draft) continue;
    // 本文が空のセクションは出力しない（空欄オプションの組み合わせ対策）
    if (!draft.body.trim()) continue;

    index += 1;
    sections.push({
      id: `${form.ceremonyType}-${String(index).padStart(2, "0")}-${step.key}`,
      ...draft,
    });
  }

  return sections;
}
