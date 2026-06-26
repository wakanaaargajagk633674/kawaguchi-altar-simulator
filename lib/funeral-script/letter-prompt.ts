import { toneStyleInstructions } from "./style-guide";
import { ORIGINAL_LETTER_ID } from "./original-letter";
import type {
  FuneralScriptFormData,
  FuneralScriptOriginalLetter,
} from "./types";

function line(label: string, value?: string): string | null {
  const text = value?.trim();
  return text ? `- ${label}: ${text}` : null;
}

function formLines(form: FuneralScriptFormData): string[] {
  return [
    line("故人名", form.deceasedName),
    line("生年月日", form.birthDate),
    line("没日", form.deathDate),
    line("行年", form.age),
    line("出身地", form.birthPlace),
    line("趣味", form.hobbies),
    line("遺影写真", form.portraitPhotoDescription),
    line("学歴", form.education),
    line("職歴", form.career),
    line("仕事内容", form.workDescription),
    line("地域での活動", form.communityActivities),
    line("生前の功労", form.achievements),
    line("家族構成", form.familyStructure),
    line("エピソード", form.episodes),
    line("人柄", form.personality),
    line("喪主名", form.letterSenderName || form.chiefMournerName),
    line("礼状の続柄表記", form.letterDeceasedRelationLabel),
    line("礼状日付", form.letterDate),
    line("差出人住所", form.letterSenderAddress),
    line("喪主・家族からの修正指示", form.letterFamilyInstructions),
  ].filter(Boolean) as string[];
}

export const ORIGINAL_LETTER_SYSTEM_INSTRUCTIONS =
  "あなたは日本の葬儀で用いるオリジナル会葬礼状の原稿を作成する専門家です。出力は指定のJSONオブジェクトのみとします。";

export function buildOriginalLetterPrompt(params: {
  form: FuneralScriptFormData;
  currentLetter?: FuneralScriptOriginalLetter | null;
}): string {
  const { form, currentLetter } = params;
  const info = formLines(form);
  const current = currentLetter?.body?.trim();
  const relation = form.letterDeceasedRelationLabel?.trim() || "故";
  const subject = form.deceasedName?.trim()
    ? `${relation} ${form.deceasedName.trim()} 儀`
    : "故人様";

  return [
    "会葬者へ渡す「オリジナル会葬礼状」の本文だけを作成してください。",
    "本文はアプリ側で差出人・日付・住所と組み合わせて印刷会社へ渡します。本文内に日付・住所・喪主名・親族一同は入れないでください。",
    "",
    "# 入力情報",
    info.length > 0 ? info.join("\n") : "- 入力情報は少なめです",
    "",
    "# 現在の本文",
    current
      ? current
      : "（初回生成です。入力情報から自然な初稿を作成してください）",
    "",
    "# 文体",
    `- ${toneStyleInstructions[form.tone]}`,
    "- 葬儀司会ナレーションよりも、紙面で読まれる礼状として簡潔で整った文にする",
    "- 形式的な礼状に終わらせず、入力にある範囲で故人らしさ・家族の感謝を一、二文入れる",
    "- 司会者目線ではなく、喪主・親族側からの礼状として書く",
    "",
    "# 会葬礼状の構成",
    `- 冒頭は「${subject} 葬儀に際しまして」などから始める`,
    "- 会葬・弔意への感謝を述べる",
    "- 故人の人柄・歩み・趣味・家族との思い出のうち、入力にある事実だけを自然に入れる",
    "- 生前の厚情への感謝を述べる",
    "- 本来なら直接御礼すべきところ、書中での御礼となる旨で結ぶ",
    "",
    "# 厳守ルール",
    "- 入力にない事実、職業、続柄、場所、病名、年齢、宗教表現を創作しない",
    "- 『ご多忙』は使わず『ご多用』などにする",
    "- 句読点（、。）は使わない。区切りは改行または全角スペースにする",
    "- 時候の挨拶は入れない",
    "- 頭語・結語（拝啓・敬具）は原則入れない。入れる場合は必ず対にするが、この出力では入れない",
    "- 忌み言葉・重ね言葉を避ける（ますます、重ね重ね、たびたび、再び、また、なお、くれぐれも、死亡、死ぬ、去る、終える、消える、迷う、涙、忙しい等）",
    "- 目安は本文380〜520字。情報が少ない場合は無理に長くしない",
    "",
    "# 出力形式（厳守）",
    "- 必ず次の JSON オブジェクトのみを出力する（前後に説明文やコードフェンスを付けない）。",
    `- 形式: {"sections":[{"id":"${ORIGINAL_LETTER_ID}","body":"<本文>"}]}`,
  ].join("\n");
}
