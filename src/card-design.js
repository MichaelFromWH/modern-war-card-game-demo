export const MODERN_CARD_ART_ROOT = "./assets/card-art-v2";
export const LEGACY_CARD_ART_ROOT = "./assets/card-art";
export const COMMON_CARD_UI_ROOT = "./assets/common-card-ui";
export const GENERATED_CARD_ROOT = "./assets/generated-cards/imagegen-us-model-test";
export const CARD_FIRE_VIDEO_ROOT = "./assets/card-fire-vfx";

export const GENERATED_CARD_IDS = new Set([
  "us_marine_rifle",
  "us_javelin_team",
  "us_stinger_team",
  "us_rangers_target",
  "us_marine_engineers",
  "us_bradley",
  "us_m1a2",
  "us_m88",
  "us_apache",
  "us_m109",
  "us_himars",
  "us_atacms",
  "us_avenger",
  "us_mshorad",
  "us_patriot",
  "us_gray_eagle",
  "us_reaper",
  "us_f15e",
  "us_f35",
  "us_f35a_sead",
  "us_b2",
  "us_stryker",
  "us_smoke_screen",
  "us_reposition",
  "us_battlefield_repair",
  "us_emergency_supply",
  "us_electronic_suppression",
  "us_decoy_position",
  "us_green_beret",
  "us_mlrs",
  "us_tomahawk",
  "ru_motostrelki",
  "ru_kornet_team",
  "ru_igla_team",
  "ru_spetsnaz_target",
  "ru_marines",
  "ru_vdv",
  "ru_bmp3m",
  "ru_btr82",
  "ru_t90m",
  "ru_bmpt",
  "ru_ka52_unit",
  "ru_2s19",
  "ru_tornado_s",
  "ru_tos1a",
  "ru_iskander",
  "ru_pantsir",
  "ru_s300v",
  "ru_orlan10",
  "ru_forpost",
  "ru_su34",
  "ru_su35",
  "ru_su57_sead",
  "ru_tu22m3",
  "ru_battlefield_repair",
  "ru_electronic_suppression",
  "ru_smoke_decoys",
  "ru_reposition",
  "ru_ammo_supply",
  "ru_decoy_position",
  "ru_buk_m3",
  "ru_kalibr",
]);

export const GENERATED_DETAIL_CARD_IDS = new Set([
  "us_marine_rifle",
  "us_javelin_team",
  "us_stinger_team",
  "us_rangers_target",
  "us_marine_engineers",
  "us_bradley",
  "us_m1a2",
  "us_m88",
  "us_apache",
  "us_m109",
  "us_himars",
  "us_atacms",
  "us_avenger",
  "us_mshorad",
  "us_patriot",
  "us_gray_eagle",
  "us_reaper",
  "us_f15e",
  "us_f35",
  "us_f35a_sead",
  "us_b2",
  "us_stryker",
  "us_smoke_screen",
  "us_reposition",
  "us_battlefield_repair",
  "us_emergency_supply",
  "us_electronic_suppression",
  "us_decoy_position",
  "us_green_beret",
  "us_mlrs",
  "us_tomahawk",
  "ru_motostrelki",
  "ru_kornet_team",
  "ru_igla_team",
  "ru_spetsnaz_target",
  "ru_marines",
  "ru_vdv",
  "ru_bmp3m",
  "ru_btr82",
  "ru_t90m",
  "ru_bmpt",
  "ru_ka52_unit",
  "ru_2s19",
  "ru_tornado_s",
  "ru_tos1a",
  "ru_iskander",
  "ru_pantsir",
  "ru_s300v",
  "ru_orlan10",
  "ru_forpost",
  "ru_su34",
  "ru_su35",
  "ru_su57_sead",
  "ru_tu22m3",
  "ru_battlefield_repair",
  "ru_electronic_suppression",
  "ru_smoke_decoys",
  "ru_reposition",
  "ru_ammo_supply",
  "ru_decoy_position",
  "ru_buk_m3",
  "ru_kalibr",
]);

export const LIVE_DETAIL_OVERLAY_CARD_IDS = new Set([
  "us_f35",
  "us_f35a_sead",
  "ru_su57_sead",
]);

export const LIVE_DETAIL_POWER_OVERLAY_CARD_IDS = new Set([
  "us_f35",
  "us_f35a_sead",
  "ru_su57_sead",
]);

export const CARD_FIRE_VIDEO_PATHS = {
  us_m1a2: `${CARD_FIRE_VIDEO_ROOT}/us_m1a2-fire.mp4`,
};

export const CARD_UI_ASSETS = {
  bottom: `${COMMON_CARD_UI_ROOT}/bottom-ui.png`,
  skillFrame: `${COMMON_CARD_UI_ROOT}/skill/description-frame.png`,
  rarityStars: {
    1: `${COMMON_CARD_UI_ROOT}/rarity/stars-1.png`,
    2: `${COMMON_CARD_UI_ROOT}/rarity/stars-2.png`,
    3: `${COMMON_CARD_UI_ROOT}/rarity/stars-3.png`,
    4: `${COMMON_CARD_UI_ROOT}/rarity/stars-4.png`,
    5: `${COMMON_CARD_UI_ROOT}/rarity/stars-5.png`,
  },
  skillIcons: {
    support: `${COMMON_CARD_UI_ROOT}/skill/coordinated-advance.png`,
    assault: `${COMMON_CARD_UI_ROOT}/skill/armored-assault.png`,
  },
  factionMarks: {
    usa: `${COMMON_CARD_UI_ROOT}/faction/usa.png`,
  },
  tagBadges: {
    伴随防空: `${COMMON_CARD_UI_ROOT}/tags/mobile-aa.png`,
    步兵: `${COMMON_CARD_UI_ROOT}/tags/infantry.png`,
    导弹: `${COMMON_CARD_UI_ROOT}/tags/missile.png`,
    轰炸机: `${COMMON_CARD_UI_ROOT}/tags/bomber.png`,
    火箭炮: `${COMMON_CARD_UI_ROOT}/tags/rocket-artillery.png`,
    榴弹炮: `${COMMON_CARD_UI_ROOT}/tags/howitzer.png`,
    无人机: `${COMMON_CARD_UI_ROOT}/tags/drone.png`,
    战斗机: `${COMMON_CARD_UI_ROOT}/tags/fighter.png`,
    直升机: `${COMMON_CARD_UI_ROOT}/tags/helicopter.png`,
    重型防空: `${COMMON_CARD_UI_ROOT}/tags/heavy-aa.png`,
    装甲: `${COMMON_CARD_UI_ROOT}/tags/armor.png`,
  },
};

export const CARD_DESIGN_ELEMENTS = {
  artLayer: {
    root: MODERN_CARD_ART_ROOT,
    ratio: "2:3",
    targetSize: [1024, 1536],
    treatment: "bright realistic battlefield illustration, full-card cover",
  },
  compactVariant: ["unitName", "powerBadge", "artLayer"],
  detailedVariant: ["unitName", "powerBadge", "deployZone", "unitTag", "skillPanels", "rarityStars", "factionMark"],
  powerBadge: {
    values: [1, 2, 3, 4, 5, 6, 7, 8],
    shape: "radarCircle",
  },
  rarityStars: {
    values: [1, 2, 3, 4, 5],
  },
  skillIcons: {
    repair: "✚",
    airDefense: "⛨",
    recon: "◎",
    strike: "⌖",
    support: "◆",
    assault: "◇",
    air: "✈",
  },
  factionMark: {
    usa: "★",
  },
};

export function isModernUnitCard(card) {
  return card?.type === "unit" && card?.faction === "usa";
}

export function getCardArtPath(card) {
  const generated = getGeneratedCardImages(card);
  if (generated?.art) {
    return generated.art;
  }
  const artKey = card?.art || card?.id;
  if (!artKey) {
    return "";
  }
  const root = isModernUnitCard(card) ? MODERN_CARD_ART_ROOT : LEGACY_CARD_ART_ROOT;
  return `${root}/${artKey}.jpg`;
}

export function getGeneratedCardImages(card) {
  const id = card?.id;
  if (!id || (!GENERATED_CARD_IDS.has(id) && !GENERATED_DETAIL_CARD_IDS.has(id))) {
    return null;
  }
  return {
    art: GENERATED_CARD_IDS.has(id) ? `${GENERATED_CARD_ROOT}/${id}-art.png` : "",
    detail: GENERATED_DETAIL_CARD_IDS.has(id) ? `${GENERATED_CARD_ROOT}/${id}-detail.png` : "",
  };
}

export function getCardDetailImagePath(card) {
  return getGeneratedCardImages(card)?.detail || "";
}

export function hasGeneratedCardImages(card) {
  const generated = getGeneratedCardImages(card);
  return Boolean(generated?.art);
}

export function hasLiveDetailOverlay(card) {
  return LIVE_DETAIL_OVERLAY_CARD_IDS.has(card?.id);
}

export function hasLiveDetailPowerOverlay(card) {
  return LIVE_DETAIL_POWER_OVERLAY_CARD_IDS.has(card?.id);
}

export function getCardFireVideoPath(card) {
  return CARD_FIRE_VIDEO_PATHS[card?.id] || "";
}

export function getRarityCount(card) {
  const counts = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
  return counts[card?.rarity] || 1;
}

export function renderRarityStars(card) {
  const count = getRarityCount(card);
  const src = CARD_UI_ASSETS.rarityStars[count];
  return src
    ? `<img src="${src}" alt="" loading="lazy" />`
    : Array.from({ length: 5 }, (_, index) => `<i class="${index < count ? "is-lit" : ""}">★</i>`).join("");
}

export function getTagBadgePath(tag) {
  return CARD_UI_ASSETS.tagBadges[tag] || "";
}

export function getSkillFramePath() {
  return CARD_UI_ASSETS.skillFrame;
}

export function getCardBottomPath() {
  return CARD_UI_ASSETS.bottom;
}

export function getFactionMarkPath(faction) {
  return CARD_UI_ASSETS.factionMarks[faction] || "";
}

export function getSkillIconPath(text, card) {
  const content = `${text} ${(card?.tags || []).join("")}`;
  if (/装甲|突击|压制|伏击|反甲|火力覆盖|火箭|炮击|轰炸|导弹|空袭|打击/.test(content)) {
    return CARD_UI_ASSETS.skillIcons.assault;
  }
  if (/协同|推进|掩护|固守|支援|维修|修复|回收|侦查|侦扫|指示|引导|坐标|暴露|渗透|防空|拦截|地空|毒刺|SHORAD|爱国者/.test(content)) {
    return CARD_UI_ASSETS.skillIcons.support;
  }
  if ((card?.tags || []).some((tag) => ["装甲", "导弹", "火箭炮", "榴弹炮", "战斗机", "轰炸机"].includes(tag))) {
    return CARD_UI_ASSETS.skillIcons.assault;
  }
  return CARD_UI_ASSETS.skillIcons.support;
}

export function getSkillGlyph(text, card) {
  const content = `${text} ${(card?.tags || []).join("")}`;
  if (/维修|修复|回收/.test(content)) return CARD_DESIGN_ELEMENTS.skillIcons.repair;
  if (/防空|拦截|地空|毒刺|SHORAD|爱国者/.test(content)) return CARD_DESIGN_ELEMENTS.skillIcons.airDefense;
  if (/侦查|侦扫|指示|引导|坐标|暴露|渗透/.test(content)) return CARD_DESIGN_ELEMENTS.skillIcons.recon;
  if (/火力覆盖|火箭|炮击|轰炸|导弹|空袭|打击/.test(content)) return CARD_DESIGN_ELEMENTS.skillIcons.strike;
  if (/协同|推进|掩护|固守|支援/.test(content)) return CARD_DESIGN_ELEMENTS.skillIcons.support;
  if (/装甲|突击|压制|伏击|反甲/.test(content)) return CARD_DESIGN_ELEMENTS.skillIcons.assault;
  if ((card?.tags || []).some((tag) => ["战斗机", "轰炸机", "直升机"].includes(tag))) return CARD_DESIGN_ELEMENTS.skillIcons.air;
  return getPrimaryTagGlyph(card);
}

function getPrimaryTagGlyph(card) {
  const tags = card?.tags || [];
  if (tags.includes("装甲")) return "甲";
  if (tags.includes("直升机")) return "旋";
  if (tags.includes("无人机")) return "侦";
  if (tags.includes("榴弹炮")) return "炮";
  if (tags.includes("火箭炮")) return "箭";
  if (tags.includes("重型防空") || tags.includes("伴随防空")) return "防";
  if (tags.includes("战斗机")) return "空";
  if (tags.includes("轰炸机")) return "轰";
  if (tags.includes("导弹")) return "弹";
  return "兵";
}
