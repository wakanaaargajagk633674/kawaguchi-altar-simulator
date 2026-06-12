# アプリ用 構造化データ案（実装はまだしない）

> 後で `lib/funeral-script` に変換しやすい構造化データの設計メモ。HTML→A4印刷を前提に**セクション単位**で扱える形にする。
> 実装ではない。型・データ形のドラフトのみ。

## セクション型（ユーザー提示案を拡張）

```ts
// 進行セクションの種別（資料の式次第に対応）
type FuneralScriptKind =
  | "pre_announcement"      // 開式前前説
  | "guide_seating"         // 式場誘導案内
  | "notice"                // 注意事項（携帯/手荷物）
  | "narration"             // ナレーション（開式前/メイン）
  | "officiant_entrance"    // 導師入場
  | "opening_address"       // 開式の辞
  | "silent_prayer"         // 黙祷（無宗教）
  | "condolence_speech"     // 弔辞
  | "condolence_telegram"   // 弔電紹介
  | "incense"               // 焼香
  | "flower_offering"       // 献花
  | "candle_offering"       // 献灯
  | "music_offering"        // 献奏
  | "officiant_exit"        // 導師退場
  | "closing_narration"     // 閉式前ナレーション
  | "chief_mourner_speech"  // 喪主挨拶
  | "farewell_preparation"  // お別れ準備案内（ホール待機）
  | "farewell_ceremony"     // お別れの儀（献花・御蓋閉じ）
  | "closing"               // 閉式
  | "departure"             // 出棺
  | "first_week_memorial"   // 初七日（繰上げ）
  | "meal_after"            // 精進落とし案内
  | "note"                  // 司会者メモ

type FuneralScriptSection = {
  id: string
  title: string                 // 見出し（印刷見出し）
  kind: FuneralScriptKind
  source: "fixed" | "ai" | "hybrid"  // generation-policy.md と対応
  body: string                  // 読み上げ本文（変数差し込み済み）
  mcNote?: string               // 司会者メモ（印刷時は注記/非読み上げ）
  caution?: string              // 注意事項（宗派/地域/会場依存）
  sourceImageRefs?: string[]    // 抽出元 No.（例: ["No.057"]）。元画像パスではなく抽出ドキュメント参照
  aiGenerated?: boolean
  optional?: boolean            // 有無フラグで出し分け
  avoidPageBreak?: boolean      // A4印刷で改ページを避けたい短い案内
  longForm?: boolean            // 長文ナレーション（改ページ可）
}
```

> 注：`sourceImageRefs` は **元画像パスではなく** 抽出ドキュメント上の No.（`extracted-all.md`）を指す。元画像は削除予定のため依存しない。

## 台本全体の型

```ts
type CeremonyType = "wake" | "funeral" | "secular_farewell" // 通夜/告別式/お別れの会
type ReligionType = "buddhist" | "secular"

type FuneralScript = {
  ceremonyType: CeremonyType
  religionType: ReligionType
  fields: FuneralScriptFields    // form-fields-draft.md の入力値
  flags: FuneralScriptFlags      // 各有無フラグ
  sections: FuneralScriptSection[]  // 並び順＝進行順（ceremony-flows.md）
}
```

## 入力値・フラグの型（form-fields-draft.md と対応）

```ts
type FuneralScriptFields = {
  // 事実（fixed差し込み用）
  deceasedName: string
  birthDate?: string
  deathDate?: string
  age?: string
  venueName?: string
  crematoriumName?: string
  ceremonyDate?: string
  startTime?: string
  chiefMournerName?: string
  chiefMournerRelation?: string
  templeName?: string
  buddhistSect?: string         // 例: 浄土真宗本願寺派
  officiantName?: string
  mcName?: string
  guideMinutesBefore?: number
  // 取材（AI素材）
  birthplace?: string
  education?: string
  careerHistory?: string
  jobDescription?: string
  communityActivity?: string
  achievements?: string
  familyStructure?: string
  hobbies?: string
  episodes?: string
  personality?: string
  favoriteMusic?: string
  memorableWords?: string
  favoriteThings?: string
  portraitStory?: string        // 遺影の由来
  memorialItems?: string
}

type FuneralScriptFlags = {
  useNarration: boolean
  incense: "standing" | "passing" | "none"
  singleIncense: boolean        // 一回焼香依頼
  flowerOffering: boolean
  candleOffering: boolean
  silentPrayer: boolean
  musicOffering: boolean
  condolenceTelegram: boolean
  condolenceSpeech: boolean     // 弔辞
  chiefMournerSpeech: boolean
  memorialMovie: boolean
  firstWeekMemorial: boolean    // 初七日 繰上げ併修
  farewellGuide: boolean
  returnToVenue: boolean        // 出棺後に式場へ戻るか
  crematoriumAccompany: boolean
  mealAfter: boolean
}
```

## 固定テンプレート断片の保持イメージ

```ts
// fixed テンプレートは校閲済みの定文を変数プレースホルダ付きで保持
const TEMPLATE_OPENING_ADDRESS_FUNERAL =
  "只今より、故{{deceasedName}}様、{{deathDate}}、{{age}}年のご生涯を閉じられました、" +
  "故{{deceasedName}}様のご葬儀を開式致します。" +
  "お勤めを賜りますご導師は{{templeName}}ご住職でございます。"
// 出典: extracted-all.md No.061
```

## HTML/A4印刷の構造方針（10章）
- 1セクション = 1ブロック（`<section>`）。見出し `title` / 本文 `body` / 注記 `mcNote`・`caution`。
- `avoidPageBreak: true` の短い案内（誘導・携帯・導師入退場・閉式など）は CSS `break-inside: avoid` で途中改ページ禁止。
- `longForm: true` のナレーションは改ページ許容。段落単位で `orphans/widows` を設定。
- 司会者メモ・注意は印刷スタイルで本文と視覚的に区別（薄字/枠）。読み上げ本文のみ大きめ・行間広め。

## 変換時の対応表（kind → 出典 No.）
| kind | 主な出典 |
|------|---------|
| pre_announcement | No.057, 058 |
| opening_address | No.059, 061 |
| incense | No.059, 062 |
| officiant_entrance/exit | No.059–062 |
| silent_prayer | No.044 |
| flower_offering / music_offering | No.046 |
| condolence_telegram | No.062, 063 |
| farewell_preparation | No.058, 062 |
| closing | No.060, 062, 046 |
| narration / closing_narration | No.001, 021–038, 039–040, 044–045 |
