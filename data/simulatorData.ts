export type TaxMode = "tax_included" | "tax_excluded";

export type FuneralPlan = {
  id: string;
  name: string;
  displayName: string;
  category: "direct" | "flower_farewell" | "one_day" | "family_two_day" | "citizen";
  description: string;
  memberDiscount: number;
  taxMode: TaxMode;
  ranks: FuneralRank[];
};

export type FuneralRank = {
  id: string;
  name: string;
  displayName: string;
  price: number;
  description: string;
  altarImage: string;
  includedItems: string[];
  recommended?: boolean;
  preDayAvailable?: boolean;
  capacityLabel?: string;
};

export type PriceOption = {
  id: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
};

export type SingleFoodOption = PriceOption & {
  servings: number;
  includeInServingStaffCalculation: boolean;
  unitLabel: string;
};

export type FixedFeeOption = {
  id: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
};

export type ReturnGiftOption = PriceOption & {
  defaultModelNumber: string;
};

export type ReturnGiftInput = {
  id: string;
  modelNumber: string;
  quantity: number;
};

export type OtherItemInput = {
  name: string;
  price: number;
  quantity: number;
};

export type AltarDesign = {
  id: string;
  name: string;
  image: string;
  description?: string;
  priceAdjustment?: number;
};

export type AltarUpgrade = {
  id: string;
  name: string;
  price: number;
  description?: string;
  designs?: AltarDesign[];
};

export type ServiceStaffConfig = {
  name: string;
  pricePerPerson: number;
  peoplePerStaff: number;
  description: string;
};

export type DayCostConfig = {
  id: string;
  name: string;
  pricePerDay: number;
  unitLabel: string;
  description?: string;
  image?: string;
};

export type CompanyInfo = {
  name: string;
  postalCode: string;
  address: string;
  phone: string;
  locationLead: string;
  parking: string;
};

export type VariableCostAppendixSection = {
  id: string;
  title: string;
  items: string[];
};

export type VariableCostAppendix = {
  title: string;
  note: string;
  sections: VariableCostAppendixSection[];
  footerNote: string;
};

const commonIncludedItems = [
  "寝台車",
  "棺",
  "祭壇",
  "遺影写真",
  "受付用品",
  "式進行サポート",
];

const rankDescriptions: Record<string, string> = {
  ran: "華やかさと品格を重視した上位ランクです。",
  tsubaki: "落ち着きと華やかさのバランスがよいランクです。",
  fuji: "必要な内容を整えながら、祭壇の見栄えにも配慮したランクです。",
  kiku: "費用を抑えつつ、式の基本を丁寧に整えるランクです。",
  basic: "必要な内容を中心にした基本ランクです。",
};

type PlanImageKey =
  | "memorial_direct"
  | "memorial_flower_farewell"
  | "memorial_family_one_day"
  | "memorial_family_two_day"
  | "citizen_funeral";

type RankImageKey = "basic" | "kiku" | "fuji" | "tsubaki" | "ran";

export const planBaseImages = {
  base: "/images/plans/base.jpg",
  kiku: "/images/plans/kiku.jpg",
  fuji: "/images/plans/fuji.jpg",
  tsubaki: "/images/plans/tsubaki.jpg",
  ran: "/images/plans/ran.jpg",
} as const;

export const planRankImages: Record<
  PlanImageKey,
  Record<RankImageKey, string>
> = {
  memorial_direct: {
    basic: "/images/plans/memorial_direct/basic.jpg",
    kiku: "/images/plans/memorial_direct/kiku.jpg",
    fuji: "/images/plans/memorial_direct/fuji.jpg",
    tsubaki: "/images/plans/memorial_direct/tsubaki.jpg",
    ran: "/images/plans/memorial_direct/ran.jpg",
  },
  memorial_flower_farewell: {
    basic: "/images/plans/memorial_flower_farewell/basic.jpg",
    kiku: "/images/plans/memorial_flower_farewell/kiku.jpg",
    fuji: "/images/plans/memorial_flower_farewell/fuji.jpg",
    tsubaki: "/images/plans/memorial_flower_farewell/tsubaki.jpg",
    ran: "/images/plans/memorial_flower_farewell/ran.jpg",
  },
  memorial_family_one_day: {
    basic: "/images/plans/memorial_family_one_day/basic.jpg",
    kiku: "/images/plans/memorial_family_one_day/kiku.jpg",
    fuji: "/images/plans/memorial_family_one_day/fuji.jpg",
    tsubaki: "/images/plans/memorial_family_one_day/tsubaki.jpg",
    ran: "/images/plans/memorial_family_one_day/ran.jpg",
  },
  memorial_family_two_day: {
    basic: "/images/plans/memorial_family_two_day/basic.jpg",
    kiku: "/images/plans/memorial_family_two_day/kiku.jpg",
    fuji: "/images/plans/memorial_family_two_day/fuji.jpg",
    tsubaki: "/images/plans/memorial_family_two_day/tsubaki.jpg",
    ran: "/images/plans/memorial_family_two_day/ran.jpg",
  },
  citizen_funeral: {
    basic: "/images/plans/citizen_funeral/basic.jpg",
    kiku: "/images/plans/citizen_funeral/kiku.jpg",
    fuji: "/images/plans/citizen_funeral/fuji.jpg",
    tsubaki: "/images/plans/citizen_funeral/tsubaki.jpg",
    ran: "/images/plans/citizen_funeral/ran.jpg",
  },
};

const createRank = (
  id: RankImageKey,
  displayName: string,
  price: number,
  recommended = false,
  altarImage: string = planBaseImages.base,
): FuneralRank => ({
  id,
  name: displayName,
  displayName,
  price,
  description: rankDescriptions[id],
  altarImage,
  includedItems: commonIncludedItems,
  recommended,
});

const createPlanRank = (
  planKey: PlanImageKey,
  id: RankImageKey,
  displayName: string,
  price: number,
  recommended = false,
) =>
  createRank(
    id,
    displayName,
    price,
    recommended,
    planRankImages[planKey][id],
  );

export const taxModeLabels: Record<TaxMode, string> = {
  tax_included: "税込",
  tax_excluded: "税抜",
};

export const contactInfo = {
  phone: "0120-963-765",
  locationLead: "川口市めぐりの森から車で約5分",
  parking: "駐車場70台対応",
};

export const companyInfo: CompanyInfo = {
  name: "株式会社川口典礼",
  postalCode: "〒333-0833",
  address: "埼玉県川口市西新井宿440-1",
  phone: contactInfo.phone,
  locationLead: "川口市営火葬場「めぐりの森」から車で約5分",
  parking: "駐車場 約70台完備",
};

export const venueImage = "/images/venues/hall-placeholder.svg";

export const noAltarUpgradePlanNames = [
  "メモリアル直想",
  "メモリアル華想",
] as const;

export const proposalNotices = [
  "こちらは選択内容に基づく概算金額です。正式なお見積もりは、ご希望内容・日程・人数・火葬場の空き状況等を確認のうえ、改めてご案内いたします。",
];

export const variableCostAppendix: VariableCostAppendix = {
  title: "必要に応じてかかる物（変動項目）一覧",
  note:
    "※下記は 状況やご希望により必要な場合のみ 発生します。追加が必要になる場合は、事前にご説明し確認のうえで進めます。",
  footerNote: "この別紙は見積金額には加算しない説明用ページです。",
  sections: [
    {
      id: "cremation-venue",
      title: "1）火葬・斎場関連（斎場により変動）",
      items: [
        "火葬料金（実費）\n例：めぐりの森 30,000円（待合室含む）",
        "斎場の式場使用料（斎場で式を行う場合）",
        "斎場の待合室／控室使用料（斎場により）",
        "霊柩車・マイクロバス（必要な場合）",
      ],
    },
    {
      id: "transport",
      title: "2）搬送（距離・時間帯で変動）",
      items: [
        "逝去先→安置先の寝台搬送（距離により）",
        "安置先→式場／火葬場の寝台搬送（距離により）",
        "時間外搬送（17：00～9：00など）",
        "追加搬送（施設→会館→火葬場など経由が増える場合）",
      ],
    },
    {
      id: "resting-preservation",
      title: "3）安置・保全（日数で変動）",
      items: [
        "安置料金（日数分）",
        "ドライアイス（回数分・季節で増減）",
        "追加安置日数（火葬場の空き・親族集合都合などで延びる場合）",
      ],
    },
    {
      id: "farewell-enhancement",
      title: "4）お別れを手厚くする追加（任意）",
      items: [
        "棺の中のお花追加（棺上花・花束など）",
        "祭壇のボリュームアップ／グレードアップ",
        "写真の追加加工・遺影サイズ変更など（必要時）",
      ],
    },
    {
      id: "care-makeup",
      title: "5）湯灌・メイク（任意）",
      items: [
        "湯灌／古式湯灌（ラストメイク）",
        "エンバーミング等（希望・状況による）",
      ],
    },
    {
      id: "meal-gift",
      title: "6）返礼品・飲食（人数で変動）",
      items: [
        "返礼品（単価×数量）",
        "会食（通夜料理／告別式後のお清め等）（単価×人数）",
        "配膳スタッフ（必要人数分）",
        "追加飲料・会場費（戻り会食を行う場合）",
      ],
    },
    {
      id: "religious",
      title: "7）宗教者関連（必要な場合）",
      items: [
        "お布施（読経・戒名・車代など）",
        "宗派・寺院のご意向による追加（例：塔婆など）",
      ],
    },
    {
      id: "other-variable",
      title: "8）その他（状況により）",
      items: [
        "供花（献上花）・供物（盛籠など）",
        "役所・制度手続きの条件による追加（内容により）",
        "自宅安置に必要な物品（状況により）",
      ],
    },
  ],
};

export const estimateNotice =
  "表示金額は概算です。火葬場の空き状況、安置日数、宗教者への御礼、飲食内容等により変動します。正式なお見積りはご相談後に作成いたします。";

export const restingCostConfig: DayCostConfig = {
  id: "resting_days",
  name: "安置日数",
  pricePerDay: 11000,
  unitLabel: "日",
  image: "/images/options/resting.jpg",
  description: "ご安置の日数に応じて加算します。正式なお見積り時に日程を確認します。",
};

export const dryIceCostConfig: DayCostConfig = {
  id: "dry_ice_days",
  name: "ドライアイス日数",
  pricePerDay: 11000,
  unitLabel: "日",
  image: "/images/options/dry-ice.jpg",
  description: "保全のための日数に応じて加算します。気温や安置状況により変動します。",
};

export const funeralPlans: FuneralPlan[] = [
  {
    id: "memorial_direct",
    name: "メモリアル直想",
    displayName: "直葬",
    category: "direct",
    description: "通夜・告別式を行わず、火葬を中心にお見送りするプランです。",
    memberDiscount: 50000,
    taxMode: "tax_excluded",
    ranks: [
      createPlanRank("memorial_direct", "ran", "蘭", 539000),
      createPlanRank("memorial_direct", "tsubaki", "椿", 319000),
      createPlanRank("memorial_direct", "fuji", "藤", 259000),
      createPlanRank("memorial_direct", "kiku", "菊", 239000),
      createPlanRank("memorial_direct", "basic", "基本", 189000, true),
    ],
  },
  {
    id: "memorial_flower_farewell",
    name: "メモリアル華想",
    displayName: "花入れお別れ会",
    category: "flower_farewell",
    description: "お花入れを中心に、ご家族でゆっくりお別れいただくプランです。",
    memberDiscount: 50000,
    taxMode: "tax_excluded",
    ranks: [
      createPlanRank("memorial_flower_farewell", "ran", "蘭", 674000),
      createPlanRank("memorial_flower_farewell", "tsubaki", "椿", 454000),
      createPlanRank("memorial_flower_farewell", "fuji", "藤", 444000),
      createPlanRank("memorial_flower_farewell", "kiku", "菊", 384000),
      createPlanRank("memorial_flower_farewell", "basic", "基本", 279000, true),
    ],
  },
  {
    id: "memorial_family_one_day",
    name: "メモリアル家族葬 一日",
    displayName: "一日葬",
    category: "one_day",
    description: "告別式から火葬までを一日で行う、ご家族中心のプランです。",
    memberDiscount: 100000,
    taxMode: "tax_included",
    ranks: [
      createPlanRank("memorial_family_one_day", "ran", "蘭", 1250000),
      createPlanRank("memorial_family_one_day", "tsubaki", "椿", 1080000),
      createPlanRank("memorial_family_one_day", "fuji", "藤", 930000),
      createPlanRank("memorial_family_one_day", "kiku", "菊", 790000),
      createPlanRank("memorial_family_one_day", "basic", "基本", 496000, true),
    ],
  },
  {
    id: "memorial_family_two_day",
    name: "メモリアル家族葬 二日",
    displayName: "家族葬 二日",
    category: "family_two_day",
    description: "通夜・告別式の二日間で、ゆっくりお別れいただく家族葬です。",
    memberDiscount: 100000,
    taxMode: "tax_included",
    ranks: [
      createPlanRank("memorial_family_two_day", "ran", "蘭", 1400000),
      createPlanRank("memorial_family_two_day", "tsubaki", "椿", 1220000),
      createPlanRank("memorial_family_two_day", "fuji", "藤", 1070000),
      createPlanRank("memorial_family_two_day", "kiku", "菊", 880000),
      createPlanRank("memorial_family_two_day", "basic", "基本", 628000, true),
    ],
  },
  {
    id: "citizen_funeral",
    name: "市民葬",
    displayName: "市民葬",
    category: "citizen",
    description: "市民葬の規定に沿った、分かりやすい標準プランです。",
    memberDiscount: 0,
    taxMode: "tax_included",
    ranks: [
      createPlanRank("citizen_funeral", "ran", "蘭", 1090000),
      createPlanRank("citizen_funeral", "tsubaki", "椿", 990000),
      createPlanRank("citizen_funeral", "fuji", "藤", 890000),
      createPlanRank("citizen_funeral", "kiku", "菊", 790000),
      createPlanRank("citizen_funeral", "basic", "基本", 690000, true),
    ],
  },
];

export const coffinOptions: PriceOption[] = [
  { id: "none", name: "グレードアップしない", price: 0, image: "/images/coffin/none.jpg" },
  { id: "white_cloth", name: "布張り(白)", price: 33000, image: "/images/coffin/nunobari_white.jpg" },
  { id: "blue_cloth", name: "布張り(青)", price: 66000, image: "/images/coffin/nunobari_blue.jpg" },
  { id: "pink_cloth", name: "布張り(桃)", price: 66000, image: "/images/coffin/nunobari_pink.jpg" },
  { id: "premium_cloth", name: "高級布張り", price: 88000, image: "/images/coffin/high_grade_nunobari.jpg" },
  { id: "handled_cloth", name: "取っ手付き布張り棺", price: 110000, image: "/images/coffin/handle_nunobari.jpg" },
];

export const urnOptions: PriceOption[] = [
  { id: "shiro_seto", name: "白瀬戸", price: 14300, image: "/images/urn/shiroseto.jpg" },
  { id: "aya", name: "彩", price: 19800, image: "/images/urn/sai.jpg" },
  { id: "shiro_hanagokoro", name: "白花ごころ", price: 19800, image: "/images/urn/shiro_hanagokoro.jpg" },
  { id: "shiro_karakusa", name: "白唐草", price: 19800, image: "/images/urn/shiro_karakusa.jpg" },
  { id: "shiro_houou", name: "白鳳凰", price: 19800, image: "/images/urn/shiro_houou.jpg" },
  { id: "ao_karakusa", name: "青唐草", price: 22000, image: "/images/urn/ao_karakusa.jpg" },
  { id: "ruri_hanagokoro", name: "瑠璃花ごころ", price: 27500, image: "/images/urn/ruri_hanagokoro.jpg" },
  { id: "ruri_karakusa", name: "瑠璃唐草", price: 27500, image: "/images/urn/ruri_karakusa.jpg" },
  { id: "ruri_houou", name: "瑠璃鳳凰", price: 27500, image: "/images/urn/ruri_houou.jpg" },
];

export const urnCoverOption: PriceOption = {
  id: "urn_cover_change",
  name: "壺覆いを変更する",
  price: 5500,
};

export const altarUpgrades: AltarUpgrade[] = [
  {
    id: "none",
    name: "グレードアップしない",
    price: 0,
    description: "選択中のプラン・ランクに含まれる祭壇を使用します。",
    designs: [],
  },
  {
    id: "upgrade_a",
    name: "グレードアップ A",
    price: 110000,
    description: "Aランクの祭壇グレードアップです。",
    designs: [
      {
        id: "a_1",
        name: "A デザイン1",
        image: "/images/altars/a-1.jpg",
        description: "Aランク デザイン1",
        priceAdjustment: 0,
      },
      {
        id: "a_2",
        name: "A デザイン2",
        image: "/images/altars/a-2.jpg",
        description: "Aランク デザイン2",
        priceAdjustment: 0,
      },
    ],
  },
  {
    id: "upgrade_b",
    name: "グレードアップ B",
    price: 165000,
    description: "Bランクの祭壇グレードアップです。",
    designs: [
      {
        id: "b_1",
        name: "B デザイン1",
        image: "/images/altars/b-1.jpg",
        description: "Bランク デザイン1",
        priceAdjustment: 0,
      },
      {
        id: "b_2",
        name: "B デザイン2",
        image: "/images/altars/b-2.jpg",
        description: "Bランク デザイン2",
        priceAdjustment: 0,
      },
      {
        id: "b_3",
        name: "B デザイン3",
        image: "/images/altars/b-3.jpg",
        description: "Bランク デザイン3",
        priceAdjustment: 0,
      },
    ],
  },
  {
    id: "upgrade_c",
    name: "グレードアップ C",
    price: 220000,
    description: "Cランクの祭壇グレードアップです。",
    designs: [
      {
        id: "c_1",
        name: "C デザイン1",
        image: "/images/altars/c-1.jpg",
        description: "Cランク デザイン1",
        priceAdjustment: 0,
      },
      {
        id: "c_2",
        name: "C デザイン2",
        image: "/images/altars/c-2.jpg",
        description: "Cランク デザイン2",
        priceAdjustment: 0,
      },
      {
        id: "c_3",
        name: "C デザイン3",
        image: "/images/altars/c-3.jpg",
        description: "Cランク デザイン3",
        priceAdjustment: 0,
      },
      {
        id: "c_4",
        name: "C デザイン4",
        image: "/images/altars/c-4.jpg",
        description: "Cランク デザイン4",
        priceAdjustment: 0,
      },
    ],
  },
  {
    id: "upgrade_d",
    name: "グレードアップ D",
    price: 275000,
    description: "Dランクの祭壇グレードアップです。",
    designs: [
      {
        id: "d_1",
        name: "D デザイン1",
        image: "/images/altars/d-1.jpg",
        description: "Dランク デザイン1",
        priceAdjustment: 0,
      },
      {
        id: "d_2",
        name: "D デザイン2",
        image: "/images/altars/d-2.jpg",
        description: "Dランク デザイン2",
        priceAdjustment: 0,
      },
      {
        id: "d_3",
        name: "D デザイン3",
        image: "/images/altars/d-3.jpg",
        description: "Dランク デザイン3",
        priceAdjustment: 0,
      },
      {
        id: "d_4",
        name: "D デザイン4",
        image: "/images/altars/d-4.jpg",
        description: "Dランク デザイン4",
        priceAdjustment: 0,
      },
    ],
  },
  {
    id: "upgrade_e",
    name: "グレードアップ E",
    price: 330000,
    description: "Eランクの祭壇グレードアップです。",
    designs: [
      {
        id: "e_1",
        name: "E デザイン1",
        image: "/images/altars/e-1.jpg",
        description: "Eランク デザイン1",
        priceAdjustment: 0,
      },
      {
        id: "e_2",
        name: "E デザイン2",
        image: "/images/altars/e-2.jpg",
        description: "Eランク デザイン2",
        priceAdjustment: 0,
      },
      {
        id: "e_3",
        name: "E デザイン3",
        image: "/images/altars/e-3.jpg",
        description: "Eランク デザイン3",
        priceAdjustment: 0,
      },
      {
        id: "e_4",
        name: "E デザイン4",
        image: "/images/altars/e-4.jpg",
        description: "Eランク デザイン4",
        priceAdjustment: 0,
      },
    ],
  },
];

export const wakeMealOptions: PriceOption[] = [
  { id: "none", name: "不要", price: 0 },
  {
    id: "set_tsumugi",
    name: "紡〈つむぎ〉（5名様セット）",
    price: 39490,
    image: "/images/meals/shunsaitei/set-tsumugi.jpg",
    description:
      "上握り寿司、天ぷら、オードブル、味わい豊かな煮物を組み合わせたセットです。（旬菜亭）",
  },
  {
    id: "set_mio",
    name: "澪〈みお〉（5名様セット）",
    price: 49170,
    image: "/images/meals/shunsaitei/set-mio.jpg",
    description:
      "特上握り寿司、天ぷらとまい泉ヒレかつ、筑前煮、洋風オードブルの華やかなセットです。（旬菜亭）",
  },
  {
    id: "set_yui",
    name: "結〈ゆい〉（5名様セット）",
    price: 59400,
    image: "/images/meals/shunsaitei/set-yui.jpg",
    description:
      "極上握り寿司、天ぷら、温かな2種類の煮込み料理、国産牛のローストビーフのセットです。（旬菜亭）",
  },
];

export const wakeMealConfig = {
  servingsPerSet: 5,
  unitLabel: "セット",
};

export const funeralMealOptions: PriceOption[] = [
  { id: "none", name: "不要", price: 0 },
  {
    id: "asagiri",
    name: "朝霧〈あさぎり〉（1人前）",
    price: 4620,
    image: "/images/meals/shunsaitei/asagiri.jpg",
    description:
      "お造りをメインに、こだわりの飛龍頭、米沢三元豚のローストポークなどを組み合わせた懐石膳です。（旬菜亭）",
  },
  {
    id: "soraho",
    name: "空穂〈そらほ〉（1人前・折詰弁当）",
    price: 4950,
    image: "/images/meals/shunsaitei/soraho.jpg",
    description:
      "厳選食材を使用した小鉢や天ぷらと、季節の炊き込みご飯を盛り込んだ彩り豊かな折詰弁当です。（旬菜亭）",
  },
  {
    id: "hanagasumi",
    name: "花霞〈はながすみ〉（1人前）",
    price: 5830,
    image: "/images/meals/shunsaitei/hanagasumi.jpg",
    description:
      "お造り・天ぷらなどの和の味と、米沢三元豚のローストポークなどの洋の味を楽しめる懐石膳です。（旬菜亭）",
  },
  {
    id: "kokoyui",
    name: "心結〈ここゆい〉（1人前・折詰弁当）",
    price: 6050,
    image: "/images/meals/shunsaitei/kokoyui.jpg",
    description:
      "「まい泉」自慢の揚げ物をメインに、すき焼きや小鉢、ちらし寿司などを盛り込んだ2段の折詰弁当です。（旬菜亭）",
  },
  {
    id: "soukai",
    name: "蒼海〈そうかい〉（1人前）",
    price: 6380,
    image: "/images/meals/shunsaitei/soukai.jpg",
    description:
      "こだわりのシャリを使用した握り寿司をメインに、料理長特製飛龍頭やデザートなど充実した懐石膳です。（旬菜亭）",
  },
  {
    id: "kuon",
    name: "久遠〈くおん〉（1人前・温かい懐石）",
    price: 6930,
    image: "/images/meals/shunsaitei/kuon.jpg",
    description:
      "蒸し寿司やすき焼き、湯葉シュウマイなどが温かくお召し上がりいただける懐石膳です。（旬菜亭）",
  },
  {
    id: "otoiro",
    name: "音彩〈おといろ〉（1人前・折詰弁当）",
    price: 7260,
    image: "/images/meals/shunsaitei/otoiro.jpg",
    description:
      "国産牛のローストビーフを乗せたご飯をメインに、お魚からお肉まで味わえる豪華な2段の折詰弁当です。（旬菜亭）",
  },
  {
    id: "kazasumi",
    name: "風澄〈かざすみ〉（1人前）",
    price: 7700,
    image: "/images/meals/shunsaitei/kazasumi.jpg",
    description:
      "国産牛のローストビーフやお造りに加え、鯛の胡麻茶漬けと温かな蒸し物、デザートがセットの懐石膳です。（旬菜亭）",
  },
  {
    id: "hoshikage",
    name: "星影〈ほしかげ〉（1人前・温かい懐石）",
    price: 7700,
    image: "/images/meals/shunsaitei/hoshikage.jpg",
    description:
      "ステーキや海鮮蒸しなどのメイン料理が温かくお召し上がりいただける自慢の懐石膳です。（旬菜亭）",
  },
  {
    id: "yoiduki",
    name: "宵月〈よいづき〉（1人前）",
    price: 8800,
    image: "/images/meals/shunsaitei/yoiduki.jpg",
    description:
      "極上握り寿司をメインに、国産牛のローストビーフや厳選食材の逸品を組み合わせた寿司懐石膳です。（旬菜亭）",
  },
  {
    id: "mizukagami",
    name: "水鏡〈みずかがみ〉（1人前）",
    price: 12100,
    image: "/images/meals/shunsaitei/mizukagami.jpg",
    description:
      "前菜盛り合わせ、国産牛のローストビーフ、ウニの茶碗蒸し、鰻のひつまぶしまで堪能できるコース料理です。（旬菜亭）",
  },
];

// 会席膳（告別料理）と併用できるお子様向けの御膳。数量で入力する。
export const childMealOptions: SingleFoodOption[] = [
  {
    id: "kodomo_a",
    name: "子供膳A",
    price: 2310,
    servings: 1,
    includeInServingStaffCalculation: true,
    unitLabel: "人前",
    image: "/images/meals/shunsaitei/kodomo-a.jpg",
  },
  {
    id: "kodomo_b",
    name: "子供膳B",
    price: 1760,
    servings: 1,
    includeInServingStaffCalculation: true,
    unitLabel: "人前",
    image: "/images/meals/shunsaitei/kodomo-b.jpg",
  },
];

export const singleFoodOptions: SingleFoodOption[] = [
  {
    id: "sushi_gokujo_3nin",
    name: "極上握り寿司〈3人盛〉",
    price: 15400,
    servings: 3,
    includeInServingStaffCalculation: true,
    unitLabel: "台",
    image: "/images/food/shunsaitei/sushi-gokujo.jpg",
    description: "旬菜亭の一品料理（3人盛）です。配膳人計算の人数に含めます。",
  },
  {
    id: "sushi_tokujo_3nin",
    name: "特上握り寿司〈3人盛〉",
    price: 12650,
    servings: 3,
    includeInServingStaffCalculation: true,
    unitLabel: "台",
    image: "/images/food/shunsaitei/sushi-tokujo.jpg",
    description: "旬菜亭の一品料理（3人盛）です。配膳人計算の人数に含めます。",
  },
  {
    id: "sushi_jo_3nin",
    name: "上握り寿司〈3人盛〉",
    price: 9790,
    servings: 3,
    includeInServingStaffCalculation: true,
    unitLabel: "台",
    image: "/images/food/shunsaitei/sushi-jo.jpg",
    description: "旬菜亭の一品料理（3人盛）です。配膳人計算の人数に含めます。",
  },
  {
    id: "sushi_nigiri_3nin",
    name: "握り寿司〈3人盛〉",
    price: 7260,
    servings: 3,
    includeInServingStaffCalculation: true,
    unitLabel: "台",
    image: "/images/food/shunsaitei/sushi-nigiri.jpg",
    description: "旬菜亭の一品料理（3人盛）です。配膳人計算の人数に含めます。",
  },
  {
    id: "sushi_maki_3nin",
    name: "巻き寿司〈3人盛〉",
    price: 6050,
    servings: 3,
    includeInServingStaffCalculation: true,
    unitLabel: "台",
    image: "/images/food/shunsaitei/sushi-maki.jpg",
    description: "旬菜亭の一品料理（3人盛）です。配膳人計算の人数に含めます。",
  },
  {
    id: "tempura_yasai_3nin",
    name: "野菜天ぷら〈3人盛〉",
    price: 5280,
    servings: 3,
    includeInServingStaffCalculation: false,
    unitLabel: "台",
    image: "/images/food/shunsaitei/tempura-yasai.jpg",
    description: "旬菜亭の一品料理です。金額に反映し、配膳人計算には含めません。",
  },
  {
    id: "karaage_potato",
    name: "唐揚げポテト",
    price: 5280,
    servings: 3,
    includeInServingStaffCalculation: false,
    unitLabel: "台",
    image: "/images/food/shunsaitei/karaage-potato.jpg",
    description: "旬菜亭の一品料理です。金額に反映し、配膳人計算には含めません。",
  },
  {
    id: "mix_sand",
    name: "ミックスサンド",
    price: 4400,
    servings: 3,
    includeInServingStaffCalculation: false,
    unitLabel: "皿",
    image: "/images/food/shunsaitei/mix-sand.jpg",
    description: "旬菜亭の一品料理です。カラシは入っておりません。",
  },
  {
    id: "sushi_doushi",
    name: "御導師様握り寿司",
    price: 4400,
    servings: 1,
    includeInServingStaffCalculation: false,
    unitLabel: "折",
    image: "/images/food/shunsaitei/sushi-doushi.jpg",
    description: "御導師様用の握り寿司です。配膳人計算には含めません。",
  },
  {
    id: "tsukemono",
    name: "漬物",
    price: 2750,
    servings: 0,
    includeInServingStaffCalculation: false,
    unitLabel: "皿",
    image: "/images/food/shunsaitei/tsukemono.jpg",
    description: "旬菜亭の一品料理です。",
  },
  {
    id: "hirekatsu_sand",
    name: "ヒレかつサンド（6切）",
    price: 1100,
    servings: 1,
    includeInServingStaffCalculation: false,
    unitLabel: "折",
    image: "/images/food/shunsaitei/hirekatsu-sand.jpg",
    description:
      "とんかつ まい泉。ご注文は施行日の2日前12時までにお願いします。",
  },
  {
    id: "onigiri_2ko",
    name: "おにぎり2個（鮭・昆布）",
    price: 660,
    servings: 1,
    includeInServingStaffCalculation: false,
    unitLabel: "折",
    image: "/images/food/shunsaitei/onigiri.jpg",
    description: "旬菜亭の一品料理です。",
  },
  {
    id: "suimono",
    name: "吸物",
    price: 330,
    servings: 0,
    includeInServingStaffCalculation: false,
    unitLabel: "椀",
    image: "/images/food/shunsaitei/suimono.jpg",
    description: "旬菜亭の一品料理です。",
  },
];

type InabaenGiftEntry = {
  code: string;
  name: string;
  price: number;
  file: string;
};

// いなば園「茶美一撰」カタログ（税込・軽減税率8%）
const inabaenGiftCatalog: InabaenGiftEntry[] = [
  { code: "F-BB", name: "静岡深蒸し銘茶・一番摘みティーバッグ煎茶詰合せ", price: 2376, file: "f-bb" },
  { code: "CRS-BC", name: "美味彩撰 バラエティギフト", price: 2484, file: "crs-bc" },
  { code: "KG-B", name: "カップごはんバラエティギフト", price: 2484, file: "kg-b" },
  { code: "AM-BD", name: "六本木アマンド フルーツケーキ＆抹茶ケーキ・プレミアムティーバッグ煎茶セット", price: 2592, file: "am-bd" },
  { code: "AMF-B", name: "六本木アマンド スイーツギフト", price: 2592, file: "amf-b" },
  { code: "UND-BF", name: "紀州南高梅・有明海産焼海苔・だしの素詰合せ", price: 2808, file: "und-bf" },
  { code: "AML-BE", name: "六本木アマンド リーフパイギフト", price: 3024, file: "aml-be" },
  { code: "LC-BH", name: "プレミアムティーバッグ煎茶・ドリップコーヒー・ラングドシャセット", price: 3024, file: "lc-bh" },
  { code: "KG-BH", name: "カップごはんバラエティギフト", price: 3024, file: "kg-bh" },
  { code: "F-BH", name: "静岡深蒸し銘茶詰合せ", price: 3024, file: "f-bh" },
  { code: "YC-BH", name: "一番摘みティーバッグ煎茶・米屋大納言羊羹詰合せ", price: 3024, file: "yc-bh" },
  { code: "SN-BH", name: "一番摘みティーバッグ煎茶・焼鮭明太ほぐし・海苔佃煮詰合せ", price: 3024, file: "sn-bh" },
  { code: "AMF-BG", name: "六本木アマンド スイーツギフト", price: 3132, file: "amf-bg" },
  { code: "CRS-BE", name: "美味彩撰 バラエティ調味料セット", price: 3240, file: "crs-be" },
  { code: "USD-C", name: "紀州南高梅・焼鮭手ほぐし・だしの素詰合せ", price: 3240, file: "usd-c" },
  { code: "AML-CB", name: "六本木アマンド リーフパイギフト", price: 3564, file: "aml-cb" },
  { code: "VH-CC", name: "静岡深蒸し銘茶", price: 3564, file: "vh-cc" },
  { code: "F-CC", name: "静岡深蒸し銘茶詰合せ", price: 3564, file: "f-cc" },
  { code: "RTF-CC", name: "南魚沼産こしひかりギフト", price: 3564, file: "rtf-cc" },
  { code: "KG-C", name: "カップごはんバラエティギフト", price: 3564, file: "kg-c" },
  { code: "Y-CC", name: "静岡深蒸し銘茶・米屋大納言羊羹詰合せ", price: 3564, file: "y-cc" },
  { code: "GT-CC", name: "一番摘みティーバッグ煎茶・利久牛たん・焼鮭明太ほぐし詰合せ", price: 3564, file: "gt-cc" },
  { code: "UN-CC", name: "静岡深蒸し銘茶・紀州南高梅・有明海産味付海苔詰合せ", price: 3564, file: "un-cc" },
  { code: "NY-CC", name: "ヤマサ醤油・有明海産焼海苔・焼鮭手ほぐし詰合せ", price: 3564, file: "ny-cc" },
  { code: "US-CC", name: "静岡深蒸し銘茶・焼鮭手ほぐし・紀州南高梅詰合せ", price: 3564, file: "us-cc" },
  { code: "SN-CC", name: "静岡深蒸し銘茶・有明海産焼海苔・焼鮭手ほぐし詰合せ", price: 3564, file: "sn-cc" },
  { code: "AM-CD", name: "六本木アマンド フルーツケーキ＆抹茶ケーキ・プレミアムティーバッグ煎茶・ドリップコーヒーセット", price: 3672, file: "am-cd" },
  { code: "AMF-CB", name: "六本木アマンド スイーツギフト", price: 3780, file: "amf-cb" },
  { code: "CRS-CF", name: "美味彩撰 バラエティ調味料セット", price: 3888, file: "crs-cf" },
  { code: "V-CH", name: "静岡深蒸し銘茶詰合せ", price: 4104, file: "v-ch" },
  { code: "Y-CH", name: "静岡深蒸し銘茶・米屋栗羊羹詰合せ", price: 4104, file: "y-ch" },
  { code: "GT-CH", name: "一番摘みティーバッグ煎茶・利久牛たん詰合せ", price: 4104, file: "gt-ch" },
  { code: "KC-CH", name: "バラエティギフトセット", price: 4104, file: "kc-ch" },
  { code: "CR-D", name: "美味彩撰 バラエティ調味料セット", price: 4320, file: "cr-d" },
  { code: "RTF-D", name: "南魚沼産こしひかりギフト", price: 4320, file: "rtf-d" },
  { code: "AM-DC", name: "六本木アマンド フルーツケーキ＆抹茶ケーキ・プレミアムティーバッグ煎茶・ドリップコーヒーセット", price: 4644, file: "am-dc" },
  { code: "LC-DC", name: "プレミアムティーバッグ煎茶・ドリップコーヒー・ラングドシャセット", price: 4644, file: "lc-dc" },
  { code: "UN-DC", name: "静岡深蒸し銘茶・有明海産焼海苔・紀州南高梅・海苔佃煮詰合せ", price: 4644, file: "un-dc" },
  { code: "GT-DH", name: "バラエティギフトセット（利久牛たん）", price: 5184, file: "gt-dh" },
  { code: "RS-E", name: "美味彩撰 バラエティ調味料セット", price: 5400, file: "rs-e" },
  { code: "AM-EB", name: "六本木アマンド スイーツギフト", price: 5724, file: "am-eb" },
  { code: "V-EC", name: "静岡深蒸し銘茶詰合せ", price: 5724, file: "v-ec" },
  { code: "GTS-EC", name: "利久牛たんバラエティギフトセット", price: 5724, file: "gts-ec" },
  { code: "VK-G", name: "静岡深蒸し銘茶詰合せ", price: 7560, file: "vk-g" },
];

export const returnGifts: ReturnGiftOption[] = inabaenGiftCatalog.map(
  (item) => ({
    id: `gift-${item.file}`,
    name: `${item.name}（${item.code}）`,
    price: item.price,
    image: `/images/gifts/inabaen/${item.file}.jpg`,
    defaultModelNumber: item.code,
  }),
);

export const defaultReturnGiftInputs: ReturnGiftInput[] = returnGifts.map(
  (gift) => ({
    id: gift.id,
    modelNumber: gift.defaultModelNumber,
    quantity: 0,
  }),
);

export const funeralMealHallFeeOption: FixedFeeOption = {
  id: "farewell_hall_fee",
  name: "忌払会場費",
  price: 22000,
  description: "告別料理を選択した場合に自動で加算します。",
};

export const defaultOtherItems: OtherItemInput[] = [
  { name: "", price: 0, quantity: 0 },
  { name: "", price: 0, quantity: 0 },
  { name: "", price: 0, quantity: 0 },
  { name: "", price: 0, quantity: 0 },
];

export const careOptions: PriceOption[] = [
  {
    id: "old_style_yukan_last_make",
    name: "古式湯灌（ラストメイク）",
    price: 82500,
    image: "/images/options/last-make.jpg",
    description: "お顔まわりを整え、穏やかなお別れの印象に近づけます。",
  },
  {
    id: "yukan",
    name: "湯灌",
    price: 198000,
    image: "/images/options/care.jpg",
    description: "お身体を清め、旅立ちの身支度を整えます。",
  },
  {
    id: "embalming",
    name: "エンバーミング",
    price: 385000,
    image: "/images/options/care.jpg",
    description: "専門的な保全処置により、面会やお別れの時間を整えます。",
  },
];

export const serviceStaffConfig: ServiceStaffConfig = {
  name: "配膳人",
  pricePerPerson: 16500,
  peoplePerStaff: 15,
  description: "お料理をご利用の場合、人数に応じて配膳人が必要になります。",
};
