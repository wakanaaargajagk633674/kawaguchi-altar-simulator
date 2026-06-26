import type {
  FuneralScriptFormData,
  FuneralScriptOriginalLetter,
} from "./types";

export const ORIGINAL_LETTER_ID = "original-condolence-letter" as const;

const DEFAULT_TITLE = "オリジナル会葬礼状";

const LETTER_NG_WORDS = [
  "ますます",
  "重ね重ね",
  "たびたび",
  "再び",
  "わざわざ",
  "たまたま",
  "また",
  "なお",
  "くれぐれも",
  "死亡",
  "死ぬ",
  "亡くなる",
  "去る",
  "終える",
  "消える",
  "浮かばれない",
  "迷う",
  "涙",
  "忙しい",
] as const;

function text(value?: string): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function cleanForLetter(value?: string): string {
  return text(value)
    .replace(/[、。，．,.]/g, " ")
    .replace(/[「」『』]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function displayName(form: FuneralScriptFormData): string {
  return text(form.deceasedName) || "故人様";
}

function letterSubject(form: FuneralScriptFormData): string {
  const name = text(form.deceasedName);
  if (!name) return "故人様";
  const relation = text(form.letterDeceasedRelationLabel) || "故";
  return `${relation} ${name} 儀`;
}

function sentenceLines(lines: string[]): string {
  return lines
    .map((line) => normalizeOriginalLetterBody(line))
    .filter(Boolean)
    .join("\n");
}

function buildStoryLines(form: FuneralScriptFormData): string[] {
  const name = displayName(form);
  const lines: string[] = [];
  const birthPlace = cleanForLetter(form.birthPlace);
  const work = cleanForLetter(form.workDescription || form.career);
  const hobbies = cleanForLetter(form.hobbies);
  const personality = cleanForLetter(form.personality);
  const episodes = cleanForLetter(form.episodes);
  const family = cleanForLetter(form.familyStructure);
  const portrait = cleanForLetter(form.portraitPhotoDescription);
  const community = cleanForLetter(form.communityActivities);
  const achievements = cleanForLetter(form.achievements);

  if (birthPlace || work || community || achievements) {
    const parts: string[] = [];
    if (birthPlace) parts.push(`${birthPlace}に生まれ`);
    if (work) parts.push(`${work}に励み`);
    if (community) parts.push(`${community}にも心を寄せ`);
    if (achievements) parts.push(`${achievements}を重ね`);
    lines.push(`${name}は ${parts.join(" ")} 一日一日を大切に歩んでまいりました`);
  }

  if (personality) {
    lines.push(`${personality}お人柄は 多くの方の心に温かな記憶として残っております`);
  }

  if (hobbies) {
    lines.push(`${hobbies}を楽しむ時間を大切にし 周りの皆様との語らいを喜びとしておりました`);
  }

  if (family) {
    lines.push(`家族にとりましても ${name}が注いでくれた思いやりは かけがえのない支えでございました`);
  }

  if (episodes) {
    lines.push(`ご家族より伺った思い出には ${episodes} というお姿が今も鮮やかに残っております`);
  }

  if (portrait) {
    lines.push(`ご遺影は ${portrait}の一枚で 皆様を穏やかに見守っているようでございます`);
  }

  return lines.slice(0, 5);
}

export function normalizeOriginalLetterBody(input: string): string {
  return input
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .replace(/[、。，．,.]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildOriginalCondolenceLetter(
  form: FuneralScriptFormData,
): FuneralScriptOriginalLetter {
  const subject = letterSubject(form);
  const storyLines = buildStoryLines(form);
  const body = sentenceLines([
    `${subject} 葬儀に際しまして ご多用中にもかかわらずご会葬を賜り 心より御礼申し上げます`,
    ...storyLines,
    "生前に賜りましたご厚情に 深く感謝申し上げます",
    "本来であれば拝眉のうえ御礼申し上げるべきところ 略儀ながら書中をもちまして御礼申し上げます",
  ]);

  return {
    id: ORIGINAL_LETTER_ID,
    title: DEFAULT_TITLE,
    body,
    aiGenerated: false,
    updatedAt: new Date().toISOString(),
  };
}

export function originalLetterCharCount(body: string): number {
  return normalizeOriginalLetterBody(body).replace(/\s/g, "").length;
}

export function buildOriginalLetterFooter(
  form: FuneralScriptFormData,
): string {
  const date = text(form.letterDate) || "令和　年　月　日";
  const address = text(form.letterSenderAddress) || "住所　";
  const mourner = text(form.letterSenderName || form.chiefMournerName);
  return [
    date,
    address,
    `喪主　${mourner || "　　　　　"}`,
    "外　親族一同",
  ].join("\n");
}

export function buildOriginalLetterPrintSpec(
  form: FuneralScriptFormData,
  letter: FuneralScriptOriginalLetter,
): string {
  const count = originalLetterCharCount(letter.body);
  const instructions = text(form.letterPrintInstructions);
  return [
    "用途：オリジナル会葬礼状",
    "組版：縦書き想定　句読点なし",
    `本文文字数：${count}字`,
    "校正：喪主・ご家族確認後に入稿",
    instructions ? `印刷会社への申し送り：${instructions}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function originalLetterToPrintText(
  form: FuneralScriptFormData,
  letter: FuneralScriptOriginalLetter,
): string {
  return [
    "【印刷会社提出用】",
    `【${letter.title}】`,
    "",
    "【仕様】",
    buildOriginalLetterPrintSpec(form, letter),
    "",
    "【本文】",
    normalizeOriginalLetterBody(letter.body),
    "",
    "【差出人】",
    buildOriginalLetterFooter(form),
  ].join("\n");
}

export function detectOriginalLetterWarnings(body: string): string[] {
  const normalized = normalizeOriginalLetterBody(body);
  const warnings: string[] = [];
  const found = LETTER_NG_WORDS.filter((word) => normalized.includes(word));
  if (found.length > 0) {
    warnings.push(`会葬礼状の忌み言葉候補をご確認ください: ${found.join("、")}`);
  }
  if (/[、。，．,.]/.test(body)) {
    warnings.push("句読点が含まれています。印刷時は空白または改行への調整を推奨します。");
  }
  const count = originalLetterCharCount(body);
  if (count < 260) {
    warnings.push("本文が短めです。オリジナル礼状としては故人らしい一文を足せるか確認してください。");
  }
  if (count > 620) {
    warnings.push("本文が長めです。カード紙面に収まるか印刷会社へ確認してください。");
  }
  return warnings;
}
