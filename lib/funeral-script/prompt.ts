/**
 * OpenAI へ渡すナレーション生成プロンプトの組み立て。
 *
 * 紙面抽出資料（docs/funeral-script/source-extraction/）から整理した文体ルール（style-guide.ts）と
 * 忌み言葉（ng-words.ts）、フォーム入力、生成対象セクションを 1 本のプロンプトに統合する。
 * Markdown 本文そのものは投げず、要約・構造化したルールのみを渡す。
 */

import { CEREMONY_TYPE_LABELS } from "./flows";
import {
  ceremonyRulesFor,
  funeralNarrationStyleGuide as guide,
  lengthStyleInstructions,
  toneStyleInstructions,
} from "./style-guide";
import { NG_WATCH_WORDS } from "./ng-words";
import { buildScriptContext, closingDeclaration } from "./phrases";
import {
  expressionBank,
  extractMonth,
  seasonalExpression,
} from "./expressions";
import type {
  FuneralScriptCeremonyType,
  FuneralScriptFormData,
  FuneralScriptSection,
} from "./types";

/**
 * 「最丁寧（most_detailed）」のときだけ付与する追加素材。
 * - 生・没の月から季節を感じさせる句
 * - ショートフレーズ集由来の参考表現（丸写しせず、合う場合のみ活用）
 * それ以外の length では空配列。
 */
function buildMostDetailedBlock(form: FuneralScriptFormData): string[] {
  if (form.length !== "most_detailed") return [];

  const block: string[] = ["", "# 最丁寧モードの追加指示"];

  const birthSeason = seasonalExpression(extractMonth(form.birthDate));
  const deathSeason = seasonalExpression(extractMonth(form.deathDate));
  if (birthSeason || deathSeason) {
    block.push("- 季節感を一言添える（無理に全部使わず、自然に。創作の事実は加えない）:");
    if (birthSeason) block.push(`  - お生まれの月の情景: ${birthSeason}`);
    if (deathSeason) block.push(`  - 旅立たれた月の情景: ${deathSeason}`);
  } else {
    block.push(
      "- 月が分かる場合は、その季節を感じさせる一言を自然に添える（不明なら無理に書かない）。",
    );
  }

  block.push(
    "- 次の参考表現は“素材”です。故人に合う場合のみ、言い回しを整えて自然に取り入れる（丸写し・羅列はしない／合わなければ使わない）:",
    `  - 遺影への言及: ${expressionBank.portraitIntros.join(" / ")}`,
    `  - 人柄: ${expressionBank.personalityExpressions.join(" / ")}`,
    `  - 歩み・仕事: ${expressionBank.profileExpressions.join(" / ")}`,
    `  - 家族への想い: ${expressionBank.familyExpressions.join(" / ")}`,
    `  - 結びの余韻: ${expressionBank.closingExpressions.join(" / ")}`,
    "- 情報のある項目を、歩み→人柄→趣味/活動→家族→遺影→結び の流れで丁寧につなぐ。入力に無い事実は決して作らない。",
  );

  return block;
}

/** セクションIDの接頭辞から式種別を判定（通夜・告別式の統合台本で日ごとに使い分けるため） */
function ceremonyTypeFromSectionId(
  id: string,
  fallback: FuneralScriptCeremonyType,
): FuneralScriptCeremonyType {
  const known: FuneralScriptCeremonyType[] = [
    "buddhist_wake_funeral",
    "buddhist_wake",
    "buddhist_funeral",
    "non_religious_funeral",
  ];
  // より長い接頭辞を優先（buddhist_wake_funeral を buddhist_wake より先に判定）
  for (const t of known) {
    if (id.startsWith(`${t}-`)) return t;
  }
  return fallback;
}

/** セクションの役割ガイド（タイトルから推定） */
function sectionRoleGuide(section: FuneralScriptSection): {
  kindLabel: string;
  structure: string[];
} {
  const t = section.title;
  if (t.includes("メイン")) {
    return { kindLabel: "メインナレーション", structure: guide.mainNarrationStructure.slice() };
  }
  if (t.includes("閉式")) {
    return {
      kindLabel: "閉式前ナレーション・閉式（閉式の辞を含む）",
      structure: [
        ...guide.closingNarrationStructure,
        "結びのナレーションのあと、最後は必ず閉式の宣言で締める（下記の閉式の言葉を下敷きにする）",
      ],
    };
  }
  if (t.includes("開式")) {
    return { kindLabel: "開式ナレーション", structure: guide.openingNarrationStructure.slice() };
  }
  // 将来の細分セクション（遺影写真紹介・人柄紹介 等）への汎用フォールバック
  return {
    kindLabel: t,
    structure: [
      "入力された故人情報の範囲で、該当テーマを簡潔に紹介する",
      "進行案内は含めず、故人を偲ぶ読み上げ文にする",
    ],
  };
}

/** 入力済みの故人情報だけを箇条書きにする（空欄は出さない） */
function deceasedInfoLines(form: FuneralScriptFormData): string[] {
  const pairs: [string, string | undefined][] = [
    ["故人名", form.deceasedName],
    ["生年月日", form.birthDate],
    ["没日", form.deathDate],
    ["行年", form.age],
    ["出身地", form.birthPlace],
    ["趣味", form.hobbies],
    ["遺影写真（いつ・何の写真か）", form.portraitPhotoDescription],
    ["学歴", form.education],
    ["職歴", form.career],
    ["仕事内容", form.workDescription],
    ["地域での活動", form.communityActivities],
    ["生前の功労", form.achievements],
    ["家族構成", form.familyStructure],
    ["エピソード", form.episodes],
    ["人柄", form.personality],
  ];
  return pairs
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `- ${k}: ${v!.trim()}`);
}

export function buildFuneralNarrationPrompt(params: {
  form: FuneralScriptFormData;
  targetSections: FuneralScriptSection[];
}): string {
  const { form, targetSections } = params;
  const ceremonyLabel = CEREMONY_TYPE_LABELS[form.ceremonyType];
  const isNonReligious = form.ceremonyType === "non_religious_funeral";
  const nameForGuide = form.deceasedName.trim()
    ? `${form.deceasedName.trim()}様`
    : "故人様";

  const infoLines = deceasedInfoLines(form);
  const hasInfo = infoLines.length > 0;

  const ctx = buildScriptContext(form);

  const targetBlocks = targetSections.map((s) => {
    const role = sectionRoleGuide(s);
    const lines = [
      `- id: "${s.id}"`,
      `  種類: ${role.kindLabel}`,
      `  構成の目安: ${role.structure.join(" / ")}`,
    ];
    if (s.title.includes("閉式")) {
      // 統合「閉式前ナレーション・閉式」の締め。通夜・告別式（統合）では
      // セクションIDの接頭辞から日ごとの式種別を判定し、通夜は「区切り」表現を保つ。
      const sub = ceremonyTypeFromSectionId(s.id, form.ceremonyType);
      const closingLine = closingDeclaration(ctx, sub).replace(/\n/g, " ");
      lines.push(`  閉式の言葉（この趣旨で必ず締める。言い回しは整えてよい）: ${closingLine}`);
    }
    return lines.join("\n");
  });

  const rules = [
    ...guide.commonToneRules,
    ...ceremonyRulesFor(form.ceremonyType),
    ...guide.separationRules,
    ...guide.profileFlow,
    ...guide.portraitMentionTips,
  ];

  // 「最丁寧」モードの追加素材（季節感・参考表現）
  const mostDetailedBlock = buildMostDetailedBlock(form);

  return [
    "あなたは、日本の葬儀における司会者向けの台本ナレーションを作成する専門家です。",
    "現場の司会資料から整理された文体ルール・構成ルール・表現傾向に厳密に従ってください。",
    "",
    "# 式の情報",
    `- 式種別: ${ceremonyLabel}`,
    isNonReligious
      ? "- 宗教区分: 無宗教式（仏式・宗教用語は使わない）"
      : "- 宗教区分: 仏式",
    `- 故人の呼称: ${nameForGuide}（過度に連発しない）`,
    "",
    "# 文体設定",
    `- 文体（tone）: ${toneStyleInstructions[form.tone]}`,
    `- 長さ（length）: ${lengthStyleInstructions[form.length]}`,
    "",
    "# 生成対象セクション（この id 以外は作らない／進行案内は作らない）",
    ...targetBlocks,
    "",
    "# 故人情報（この内容だけを使う。書かれていない事実・逸話・続柄・年号を創作しない）",
    hasInfo
      ? infoLines.join("\n")
      : "- （ほとんど入力がありません。無理に補わず、短く自然なナレーションにまとめてください）",
    "",
    "# 文体・構成ルール（必ず守る）",
    ...rules.map((r) => `- ${r}`),
    ...mostDetailedBlock,
    "",
    "# 避ける表現（忌み言葉・重ね言葉・直接表現）",
    `- 次の語は避ける: ${NG_WATCH_WORDS.join("、")}`,
    "- 「死亡」「死ぬ」などは「ご逝去」「旅立ち」などへ言い換える",
    "- 文末に「〜だそうです」を用いるのは可（司会者は第三者の立場のため）",
    "",
    "# 出力形式（厳守）",
    "- 必ず次の JSON オブジェクトのみを出力する（前後に説明文やコードフェンスを付けない）。",
    '- 形式: {"sections":[{"id":"<対象id>","body":"<本文>"}]}',
    "- body は読み上げ用の本文。適度な改行（\\n）を含めてよい。",
    "- 対象セクションの id すべてに対して body を返す。対象外の id は含めない。",
  ].join("\n");
}
