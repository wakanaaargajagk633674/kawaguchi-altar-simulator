/**
 * 台本の整形・補助ユーティリティ。
 * - プレーンテキスト化（コピー用）
 * - 印刷文字サイズのクラス
 * - フォーム既定値・各種ラベル
 */

import { CEREMONY_TYPE_LABELS } from "./flows";
import type {
  FuneralScriptCeremonyType,
  FuneralScriptFormData,
  FuneralScriptLength,
  FuneralScriptPrintSize,
  FuneralScriptSection,
  FuneralScriptTone,
} from "./types";

/** 台本セクション配列を、見出し＋本文＋メモのプレーンテキストに変換（コピー用） */
export function sectionsToPlainText(
  sections: FuneralScriptSection[],
  options?: { ceremonyType?: FuneralScriptCeremonyType; deceasedName?: string },
): string {
  const blocks: string[] = [];

  if (options?.ceremonyType) {
    const heading = `葬儀司会台本　${CEREMONY_TYPE_LABELS[options.ceremonyType]}`;
    const name = options.deceasedName?.trim();
    blocks.push(name ? `${heading}\n故 ${name} 様` : heading);
  }

  sections.forEach((section, i) => {
    const parts: string[] = [];
    parts.push(`■ ${i + 1}. ${section.title}`);
    parts.push(section.body.trim());
    if (section.note?.trim()) {
      parts.push(`〔司会者メモ〕${section.note.trim()}`);
    }
    blocks.push(parts.join("\n"));
  });

  return blocks.join("\n\n────────────────\n\n");
}

/** 印刷文字サイズ → 本文クラス */
export function printBodyTextClass(size: FuneralScriptPrintSize): string {
  switch (size) {
    case "small":
      return "text-sm leading-7";
    case "large":
      return "text-lg leading-9";
    default:
      return "text-base leading-8";
  }
}

/** 印刷文字サイズ → 見出しクラス */
export function printHeadingTextClass(size: FuneralScriptPrintSize): string {
  switch (size) {
    case "small":
      return "text-base";
    case "large":
      return "text-2xl";
    default:
      return "text-xl";
  }
}

/** 印刷文字サイズ → ルート要素の data 属性値 */
export function printSizeAttr(size: FuneralScriptPrintSize): string {
  return size;
}

export const TONE_LABELS: Record<FuneralScriptTone, string> = {
  standard: "標準",
  formal: "厳粛",
  gentle: "やわらかい",
  family: "家族葬向け",
};

export const LENGTH_LABELS: Record<FuneralScriptLength, string> = {
  short: "短め",
  standard: "標準",
  detailed: "丁寧",
};

export const PRINT_SIZE_LABELS: Record<FuneralScriptPrintSize, string> = {
  small: "小さめ",
  standard: "標準",
  large: "大きめ",
};

export { CEREMONY_TYPE_LABELS };

/** 式種別ごとの推奨初期オプション（無宗教は黙祷・献花を初期 true） */
export function defaultFormData(
  ceremonyType: FuneralScriptCeremonyType = "buddhist_funeral",
): FuneralScriptFormData {
  const isNonReligious = ceremonyType === "non_religious_funeral";
  const isFuneral = ceremonyType === "buddhist_funeral";
  return {
    deceasedName: "",
    birthDate: "",
    deathDate: "",
    age: "",
    birthPlace: "",
    ceremonyType,
    venueName: "",
    startTime: "",

    chiefMournerName: "",
    relationshipToChiefMourner: "",
    templeName: "",
    officiantName: "",

    hobbies: "",
    portraitPhotoDescription: "",
    education: "",
    career: "",
    workDescription: "",
    communityActivities: "",
    achievements: "",
    familyStructure: "",
    episodes: "",
    personality: "",

    hasCondolenceAddress: false,
    hasTelegram: isFuneral || isNonReligious,
    hasChiefMournerGreeting: isFuneral || isNonReligious,
    hasMemorialService: false,
    hasFarewellPreparation: isFuneral || isNonReligious,
    hasDeparture: isFuneral || isNonReligious,
    hasCrematoriumGuidance: isFuneral,
    // 無宗教の既定お供えは「献灯 → 焼香」（献花は任意でオフ）
    hasFlowerOffering: false,
    hasCandleOffering: isNonReligious,
    hasIncense: isNonReligious,
    hasSilentPrayer: isNonReligious,

    tone: "standard",
    length: "standard",
    printSize: "standard",
  };
}
