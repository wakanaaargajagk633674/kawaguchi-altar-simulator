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
        "時間外搬送（18:00〜9:00など）",
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
  { id: "wake_a", name: "A（10人前）", price: 55308, image: "/images/meals/tsuya_a_10.jpg" },
  { id: "wake_b", name: "B（10人前）", price: 61050, image: "/images/meals/tsuya_b_10.jpg" },
  { id: "wake_c", name: "C（10人前）", price: 72666, image: "/images/meals/tsuya_c_10.jpg" },
  { id: "wake_d", name: "D（10人前）", price: 91443, image: "/images/meals/tsuya_d_10.jpg" },
];

export const wakeMealConfig = {
  servingsPerSet: 10,
  unitLabel: "セット",
};

export const funeralMealOptions: PriceOption[] = [
  { id: "none", name: "不要", price: 0 },
  { id: "funeral_a", name: "A（1人前）", price: 3630, image: "/images/meals/kokubetsu_a_1.jpg" },
  { id: "funeral_b", name: "B（1人前）", price: 4400, image: "/images/meals/kokubetsu_b_1.jpg" },
  { id: "funeral_c", name: "C（1人前）", price: 5390, image: "/images/meals/kokubetsu_c_1.jpg" },
  { id: "funeral_d", name: "D（1人前）", price: 6490, image: "/images/meals/kokubetsu_d_1.jpg" },
  { id: "funeral_e", name: "E（1人前）", price: 8140, image: "/images/meals/kokubetsu_e_1.jpg" },
  { id: "funeral_f", name: "F（1人前）", price: 11440, image: "/images/meals/kokubetsu_f_1.jpg" },
];

export const singleFoodOptions: SingleFoodOption[] = [
  {
    id: "sushi_3nin",
    name: "寿司（3人前）",
    price: 12705,
    servings: 3,
    includeInServingStaffCalculation: true,
    unitLabel: "台",
    image: "/images/food/sushi_3nin.jpg",
    description: "3人前の単品料理です。配膳人計算の人数に含めます。",
  },
  {
    id: "hors_doeuvre_3nin",
    name: "オードブル（3人前）",
    price: 9372,
    servings: 3,
    includeInServingStaffCalculation: false,
    unitLabel: "台",
    image: "/images/food/hors_doeuvre_3nin.jpg",
    description: "3人前の単品料理です。金額に反映し、配膳人計算には含めません。",
  },
];

export const returnGifts: ReturnGiftOption[] = [
  {
    id: "gift-a",
    name: "返礼品A",
    price: 2376,
    image: "/images/options/gift.jpg",
    defaultModelNumber: "A-001",
  },
  {
    id: "gift-b",
    name: "返礼品B",
    price: 2916,
    image: "/images/options/gift.jpg",
    defaultModelNumber: "B-001",
  },
  {
    id: "gift-c",
    name: "返礼品C",
    price: 3024,
    image: "/images/options/gift.jpg",
    defaultModelNumber: "C-001",
  },
  {
    id: "gift-d",
    name: "返礼品D",
    price: 3456,
    image: "/images/options/gift.jpg",
    defaultModelNumber: "D-001",
  },
  {
    id: "gift-e",
    name: "返礼品E",
    price: 3672,
    image: "/images/options/gift.jpg",
    defaultModelNumber: "E-001",
  },
  {
    id: "gift-f",
    name: "返礼品F",
    price: 4536,
    image: "/images/options/gift.jpg",
    defaultModelNumber: "F-001",
  },
  {
    id: "gift-g",
    name: "返礼品G",
    price: 5616,
    image: "/images/options/gift.jpg",
    defaultModelNumber: "G-001",
  },
];

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
