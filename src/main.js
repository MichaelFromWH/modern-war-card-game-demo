import {
  CARD_DISPLAY_ORDER,
  CARD_LIBRARY,
  FACTIONS,
  LINES,
  RARITY_LABELS,
  STARTER_DECKS,
  TYPE_LABELS,
  VICTORY_SCORE,
  getCard,
  getFaction,
  getLine,
} from "./game-data.js";
import { gameAudio } from "./audio.js";
import {
  getFactionMarkPath,
  getCardArtPath,
  getCardFireVideoPath,
  getCardListThumbnailArtPath,
  getCardThumbnailArtPath,
  getGeneratedCardImages,
  getSkillIconPath,
  getSkillGlyph,
  getTagBadgePath,
  hasGeneratedCardImages,
  isModernUnitCard,
  renderRarityStars,
} from "./card-design.js";

const refs = {
  app: document.querySelector("#app"),
  resourceLoading: document.querySelector("#resource-loading"),
  resourceLoadingTitle: document.querySelector("#resource-loading-title"),
  resourceLoadingStatus: document.querySelector("#resource-loading-status"),
  resourceLoadingProgress: document.querySelector("#resource-loading-progress"),
  resourceLoadingFill: document.querySelector("#resource-loading-fill"),
  briefing: document.querySelector("#briefing"),
  battleMapImage: document.querySelector(".battle-map img"),
  board: document.querySelector("#battle-board"),
  hand: document.querySelector("#player-hand"),
  score: document.querySelector("#score-overlay"),
  logPanel: document.querySelector("#action-log-panel"),
  logToggle: document.querySelector(".action-log-toggle"),
  log: document.querySelector("#battle-log"),
  inspector: document.querySelector("#card-inspector"),
  spotlight: document.querySelector("#card-spotlight"),
  codex: document.querySelector("#codex-overlay"),
  guide: document.querySelector("#guide-overlay"),
  deckBuilder: document.querySelector("#deck-builder-overlay"),
  deckStatus: document.querySelector("#deck-status"),
  onlinePanel: document.querySelector("#online-panel"),
  bgm: document.querySelector("#battle-bgm"),
  pass: document.querySelector("#pass-button"),
  endTurn: document.querySelector("#end-turn-button"),
  bgmButton: document.querySelector("#bgm-button"),
  reset: document.querySelector("#reset-button"),
  codexButton: document.querySelector("#codex-button"),
  intent: document.querySelector("#intent-overlay"),
  mulligan: document.querySelector("#mulligan-overlay"),
  turnOverlay: document.querySelector("#turn-overlay"),
  fxLayer: document.querySelector("#fx-layer"),
  targetingLine: document.querySelector("#targeting-line"),
  targetingPath: document.querySelector("#targeting-line-path"),
  difficultyButtons: Array.from(document.querySelectorAll("[data-action^='ai-difficulty:']")),
};

const lineOrders = {
  enemy: ["support", "frontline"],
  player: ["frontline", "support"],
};

const BGM_PLAYLIST = [
  "./assets/audio/bgm/assembling-the-fleet.mp3",
  "./assets/audio/bgm/battle-loop.mp3",
  "./assets/audio/bgm/opening-credits.mp3",
  "./assets/audio/bgm/star-sky-instrumental.mp3",
];

const BATTLEFIELD_BACKGROUND_PATH = "./assets/backgrounds/battlefield-board.optimized.webp";
const CARD_BACK_ART_PATH = "./assets/ui/card-back-frame.webp";
const HOME_BOOT_IMAGE_ASSETS = [
  "./assets/backgrounds/homepage-v3.optimized.webp",
  "./assets/backgrounds/details-page-v3.optimized.webp",
  "./assets/ui/commander-usa.jpg",
  "./assets/ui/commander-russia.jpg",
  "./assets/ui/optimized/home-faction-panel.webp",
  "./assets/ui/optimized/home-deck-panel.webp",
  "./assets/ui/optimized/home-rules-panel.webp",
  "./assets/ui/optimized/duel-button.webp",
  "./assets/ui/optimized/ai-easy.png",
  "./assets/ui/optimized/ai-medium.png",
  "./assets/ui/optimized/ai-hard.png",
  CARD_BACK_ART_PATH,
  "./assets/cards/card-shell-frame.webp",
];
const BATTLE_BOOT_IMAGE_ASSETS = [
  BATTLEFIELD_BACKGROUND_PATH,
  CARD_BACK_ART_PATH,
  "./assets/cards/card-shell-frame.webp",
  "./assets/cards/card-hover-frame.webp",
  "./assets/cards/card-selected-frame.webp",
  "./assets/ui/deck-grave-panel.webp",
  "./assets/ui/lane-icons.webp",
  "./assets/ui/end-turn-button.png",
  "./assets/ui/commander-panel.png",
  "./assets/ui/commander-usa.jpg",
  "./assets/ui/commander-russia.jpg",
];
const ASSET_PRELOAD_CONCURRENCY = 8;
const TURN_HANDOFF_MS = 2000;
const AI_THINK_MS = 1050;
const CARD_FLIGHT_MS = 760;
const DEPLOY_CARD_FLIGHT_MS = 940;
const DEPLOY_EFFECT_DELAY_MS = 1700;
const DEPLOY_VIDEO_START_DELAY_MS = DEPLOY_CARD_FLIGHT_MS + 120;
const COMBAT_RESOLUTION_HOLD_MS = 820;
const TACTIC_PRESENTATION_MS = 2000;
const MULLIGAN_LIMIT = 2;
const LINE_CAPACITY = {
  frontline: 7,
  support: 6,
};
const CARD_FIRE_VIDEO_FALLBACK_MS = 7000;
const CARD_FIRE_VIDEO_MAX_MS = 7000;
const CARD_FIRE_VIDEO_READY_TIMEOUT_MS = 1600;
const CALLED_FIRE_REVEAL_HOLD_MS = 520;
const CONTACT_REVEAL_HOLD_MS = 720;
const CONTACT_FIRE_START_MS = 180;
const CONTACT_CLEANUP_HOLD_MS = 980;
const INTERCEPTION_CANCELLED_DAMAGE = -1;
const ONLINE_SOCKET_TIMEOUT_MS = 8000;
const AI_DIFFICULTY_LABELS = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};
const AI_DIFFICULTY_PROFILES = {
  easy: {
    topPool: 5,
    mistakeChance: 0.26,
    scoreNoise: 4.6,
    targetRandomChance: 0.52,
    hiddenMinScore: 16,
    hiddenFirstMargin: 9,
    hiddenBias: -5,
    targetMultiplier: 0.24,
    tacticMultiplier: 0.82,
    killBonus: 0.55,
    chainBonus: 0.35,
    protectionBonus: 0.35,
    scoreRaceBonus: 0.45,
    concealSupportChance: 0.3,
    concealHighValueChance: 0.12,
  },
  medium: {
    topPool: 2,
    mistakeChance: 0.04,
    scoreNoise: 0.9,
    targetRandomChance: 0.1,
    hiddenMinScore: 11,
    hiddenFirstMargin: 2,
    hiddenBias: 0,
    targetMultiplier: 0.42,
    tacticMultiplier: 1,
    killBonus: 1,
    chainBonus: 1,
    protectionBonus: 1,
    scoreRaceBonus: 1,
    concealSupportChance: 0.72,
    concealHighValueChance: 0.55,
  },
  hard: {
    topPool: 1,
    mistakeChance: 0,
    scoreNoise: 0.15,
    targetRandomChance: 0.02,
    hiddenMinScore: 8.5,
    hiddenFirstMargin: -0.5,
    hiddenBias: 2,
    targetMultiplier: 0.62,
    tacticMultiplier: 1.25,
    killBonus: 1.55,
    chainBonus: 1.6,
    protectionBonus: 1.6,
    scoreRaceBonus: 1.7,
    concealSupportChance: 0.95,
    concealHighValueChance: 0.9,
  },
};
const COMMANDER_PROFILES = {
  player: {
    name: "铁镰前锋",
    rank: "少校",
    initial: "F",
    portrait: "./assets/ui/commander-usa.jpg",
  },
  enemy: {
    name: "北境孤牙",
    rank: "上校",
    initial: "N",
    portrait: "./assets/ui/commander-russia.jpg",
  },
};
const DECK_RULES = {
  size: 30,
  unitMin: 24,
  unitMax: 24,
  tacticMin: 6,
  tacticMax: 6,
  strikeTacticMin: 0,
  strikeTacticMax: 0,
  supportTacticMin: 6,
  supportTacticMax: 6,
  frontlineMin: 8,
  supportMin: 7,
  reconMin: 2,
  airDefenseMin: 2,
  copyLimitByRarity: {
    common: 3,
    uncommon: 3,
    rare: 2,
    epic: 2,
    legendary: 1,
  },
};
const UNIT_ATTRIBUTE_NOTES = {
  步兵: "可打击地面目标；普通步兵默认不能打击直升机。",
  反甲步兵: "可打击地面目标，擅长反装甲；不承担低空反制。",
  防空步兵: "可打击低空单位，主要反制直升机和无人机。",
  侦查步兵: "主要负责暴露隐蔽目标并引导远程火力，本体不承担常规伤害。",
  侦察兵: "主要负责暴露隐蔽目标并引导远程火力；若目标不适合校射则转为抽牌。",
  装甲: "可打击地面目标；少数装甲支援车可对低空目标造成低额伤害。",
  直升机: "可打击地面与低空目标，可执行前线突破；敌方前线有单位时不能隐蔽部署。",
  榴弹炮: "可打击所有战线的地面和低空单位，适合被侦察单位校射。",
  火箭炮: "可覆盖所有战线的地面和低空单位，适合压制同一战线多个目标。",
  伴随防空: "可打击低空和高空单位，并可拦截巡航导弹。",
  重型防空: "可打击高空单位，并可拦截战斗机和所有类型导弹，不拦截轰炸机。",
  无人机: "主要负责侦查、暴露和校射，默认不承担常规攻击。",
  巡航导弹: "可打击地面和低空单位，包括无人机和直升机；不能打击高空单位。",
  弹道导弹: "可打击地面和低空单位，包括无人机和直升机；不能打击高空单位。",
  战斗机: "高空单位，可执行制空和精确打击；会被重型防空拦截。",
  SEAD战斗机: "V0.5.2 已取消专职 SEAD 口径；F-35A/Su-57 按普通战斗机对地打击处理。",
  轰炸机: "高空单位，擅长对地面和后排装备进行范围打击；不被重型防空拦截。",
  战斗轰炸机: "高空单位，偏重对地打击，也会被防空单位拦截。",
};
const DECK_STORAGE_PREFIX = "warzone.customDeck.v1";
const FACTION_PAIR = {
  usa: "russia",
  russia: "usa",
};
const UNIT_DISPLAY_PLATFORM_TAGS = [
  "步兵",
  "装甲",
  "直升机",
  "无人机",
  "榴弹炮",
  "火箭炮",
  "伴随防空",
  "重型防空",
  "战斗机",
  "轰炸机",
];
const MISSILE_DISPLAY_TYPE_TAGS = ["弹道导弹", "巡航导弹", "导弹"];
const initialPlayerFaction = loadSavedDeckFaction();
const imagePreloadState = {
  queue: [],
  queued: new Set(),
  loaded: new Set(),
  failed: new Set(),
  inFlight: 0,
};

const state = {
  screen: "briefing",
  battle: null,
  selectedHandUid: null,
  hoveredCardId: null,
  draggingUid: null,
  dragMode: null,
  dragTargets: [],
  dragStart: null,
  pending: null,
  codexOpen: false,
  codexFaction: "usa",
  guideOpen: false,
  deckBuilderOpen: false,
  playerFaction: initialPlayerFaction,
  playerDeck: loadSavedDeck(initialPlayerFaction),
  logCollapsed: false,
  bgmOn: false,
  currentBgmTrack: null,
  aiDifficulty: "medium",
  online: {
    socket: null,
    status: "idle",
    clientId: null,
    roomCode: "",
    side: null,
    players: [],
    ready: false,
    matchReady: false,
    match: null,
    battleSnapshot: null,
    lastEffectSerial: 0,
    effectPlayback: Promise.resolve(),
    error: "",
    name: loadOnlineName(),
    joinCode: getInitialOnlineRoomCode(),
    lastEvent: getInitialOnlineRoomCode() ? "已从邀请链接识别房间码，点击加入房间即可进入。" : "",
  },
  mulligan: {
    active: false,
    selectedUids: [],
  },
  uidCounter: 0,
};

void bootstrap();

async function bootstrap() {
  gameAudio.preload();
  bindEvents();
  await runInitialResourceLoading();
  warmShellAssets();
  updateDifficultyButtons();
  render();
  runWhenIdle(() => {
    warmDeckAssets(state.playerDeck, { includeFull: true });
    warmFactionPoolAssets(FACTION_PAIR[state.playerFaction] || "russia");
  }, 1200);
  if (state.online.joinCode) {
    window.setTimeout(() => focusOnlinePanel(), 420);
  }
  exposeDebugHooks();
}

function bindEvents() {
  window.addEventListener("pointerdown", () => gameAudio.unlock(), { once: true, passive: true });
  window.addEventListener("keydown", () => gameAudio.unlock(), { once: true });
  document.addEventListener("click", handleClick);
  document.addEventListener("input", handleInput);
  document.addEventListener("mouseover", handleHover);
  document.addEventListener("mouseout", handleHoverOut);
  document.addEventListener("dragstart", handleDragStart);
  document.addEventListener("drag", handleDragMove);
  document.addEventListener("dragover", handleDragOver);
  document.addEventListener("dragleave", handleDragLeave);
  document.addEventListener("drop", handleDrop);
  document.addEventListener("dragend", clearDragState);
  window.addEventListener("resize", updateSpotlightPosition, { passive: true });
  window.visualViewport?.addEventListener("resize", updateSpotlightPosition, { passive: true });
  refs.bgm?.addEventListener("ended", handleBgmEnded);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (state.deckBuilderOpen) {
        closeDeckBuilder();
      } else if (state.guideOpen) {
        closeGuide();
      } else if (state.codexOpen) {
        closeCodex();
      } else {
        cancelIntent();
      }
    }
    if (event.key.toLowerCase() === "f") {
      toggleFullscreen();
    }
  });
}

function warmShellAssets() {
  scheduleImagePreload(getInitialInterfaceAssetUrls(), { priority: true });
}

function getInitialInterfaceAssetUrls() {
  const factionIds = ["usa", "russia"];
  const cardUrls = factionIds.flatMap((factionId) =>
    getFactionCards(factionId).flatMap((card) => getCardListImagePreloadUrls(card)),
  );
  return [...HOME_BOOT_IMAGE_ASSETS, ...cardUrls];
}

async function runInitialResourceLoading() {
  await runLoadingTask({
    title: "战术终端校准中",
    status: "正在激活各模块并校准终端参数，请稍候...",
    assets: getInitialInterfaceAssetUrls(),
    minDuration: 450,
  });
}

async function runBattlefieldLoading() {
  const battleAssets = [
    ...BATTLE_BOOT_IMAGE_ASSETS,
    ...state.playerDeck.slice(0, 8).flatMap((cardId) => {
      const card = getCard(cardId);
      return card ? getCardImagePreloadUrls(card, { includeFull: false }) : [];
    }),
  ];
  await runLoadingTask({
    title: "战术终端校准中",
    status: "正在部署战场...",
    assets: battleAssets,
    minDuration: 3000,
  });
  await ensureBattlefieldBackgroundLoaded();
}

function setLoadingOverlay(progress, title, status) {
  if (!refs.resourceLoading) {
    return;
  }
  const nextProgress = Math.max(1, Math.min(100, Math.round(progress)));
  refs.resourceLoading.hidden = false;
  refs.resourceLoading.classList.remove("is-complete");
  refs.resourceLoading.setAttribute("aria-busy", "true");
  if (refs.resourceLoadingTitle && title) {
    refs.resourceLoadingTitle.textContent = title;
  }
  if (refs.resourceLoadingStatus && status) {
    refs.resourceLoadingStatus.textContent = status;
  }
  if (refs.resourceLoadingProgress) {
    refs.resourceLoadingProgress.textContent = `${nextProgress}%`;
  }
  if (refs.resourceLoadingFill) {
    refs.resourceLoadingFill.style.width = `${nextProgress}%`;
  }
}

function hideLoadingOverlay() {
  if (!refs.resourceLoading) {
    return;
  }
  refs.resourceLoading.classList.add("is-complete");
  refs.resourceLoading.setAttribute("aria-busy", "false");
  window.setTimeout(() => {
    refs.resourceLoading.hidden = true;
  }, 220);
}

async function runLoadingTask({ title, status, assets = [], minDuration = 0 } = {}) {
  if (!refs.resourceLoading) {
    await preloadImageAssets(assets, { priority: true });
    return;
  }

  const startedAt = performance.now();
  let taskProgress = 0.01;
  let done = false;
  setLoadingOverlay(1, title, status);

  const ticker = window.setInterval(() => {
    const elapsedRatio = minDuration ? Math.min(1, (performance.now() - startedAt) / minDuration) : 1;
    const blended = Math.min(taskProgress, Math.max(0.01, elapsedRatio));
    setLoadingOverlay(done ? 100 : Math.min(99, blended * 100), title, status);
  }, 50);

  try {
    await Promise.all([
      preloadImageAssets(assets, {
        priority: true,
        onProgress: (ratio) => {
          taskProgress = Math.max(taskProgress, ratio || 0.01);
        },
      }),
      waitForMinimumDuration(startedAt, minDuration),
      waitForFontsReady(),
    ]);
  } finally {
    done = true;
    window.clearInterval(ticker);
    setLoadingOverlay(100, title, status);
    await delay(220);
    hideLoadingOverlay();
  }
}

function waitForMinimumDuration(startedAt, minDuration) {
  const remaining = Math.max(0, minDuration - (performance.now() - startedAt));
  return delay(remaining);
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, Math.max(0, ms)));
}

function waitForFontsReady() {
  return document.fonts?.ready?.catch(() => undefined) || Promise.resolve();
}

async function preloadImageAssets(urls = [], options = {}) {
  const entries = [...new Set(urls.map(normalizeAssetUrl).filter(Boolean))];
  if (!entries.length) {
    options.onProgress?.(1);
    return;
  }

  let completed = 0;
  let cursor = 0;
  const total = entries.length;
  const concurrency = Math.min(ASSET_PRELOAD_CONCURRENCY, total);

  const markDone = (src, ok) => {
    completed += 1;
    imagePreloadState.queued.delete(src);
    if (ok) {
      imagePreloadState.loaded.add(src);
    } else {
      imagePreloadState.failed.add(src);
    }
    options.onProgress?.(completed / total);
  };

  const worker = async () => {
    while (cursor < total) {
      const src = entries[cursor];
      cursor += 1;
      if (imagePreloadState.loaded.has(src)) {
        markDone(src, true);
        continue;
      }
      try {
        imagePreloadState.queued.add(src);
        await preloadImageAsset(src, Boolean(options.priority));
        markDone(src, true);
      } catch {
        markDone(src, false);
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, worker));
}

async function ensureBattlefieldBackgroundLoaded() {
  const image = refs.battleMapImage;
  if (!image) {
    return;
  }
  const src = image.dataset.src || BATTLEFIELD_BACKGROUND_PATH;
  if (!image.getAttribute("src")) {
    image.fetchPriority = "high";
    image.src = src;
  }
  if (image.complete && image.naturalWidth > 0) {
    return;
  }
  await new Promise((resolve) => {
    image.onload = resolve;
    image.onerror = resolve;
  });
}

function runWhenIdle(callback, timeout = 1600) {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(callback, { timeout });
  } else {
    window.setTimeout(callback, Math.min(timeout, 250));
  }
}

function scheduleImagePreload(urls = [], options = {}) {
  const entries = [...new Set(urls.map(normalizeAssetUrl).filter(Boolean))];
  if (!entries.length) {
    return;
  }
  entries.forEach((src) => {
    if (imagePreloadState.loaded.has(src) || imagePreloadState.queued.has(src)) {
      return;
    }
    imagePreloadState.queued.add(src);
    const entry = { src, priority: Boolean(options.priority) };
    if (entry.priority) {
      imagePreloadState.queue.unshift(entry);
    } else {
      imagePreloadState.queue.push(entry);
    }
  });
  pumpImagePreloadQueue();
}

function pumpImagePreloadQueue() {
  while (imagePreloadState.inFlight < ASSET_PRELOAD_CONCURRENCY && imagePreloadState.queue.length) {
    const entry = imagePreloadState.queue.shift();
    imagePreloadState.inFlight += 1;
    preloadImageAsset(entry.src, entry.priority)
      .then(() => {
        imagePreloadState.loaded.add(entry.src);
      })
      .catch(() => {
        imagePreloadState.failed.add(entry.src);
      })
      .finally(() => {
        imagePreloadState.inFlight -= 1;
        pumpImagePreloadQueue();
      });
  }
}

function preloadImageAsset(src, priority = false) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.fetchPriority = priority ? "high" : "low";
    image.onload = () => {
      const decode = typeof image.decode === "function" ? image.decode() : Promise.resolve();
      decode.then(resolve).catch(resolve);
    };
    image.onerror = reject;
    image.src = src;
  });
}

function normalizeAssetUrl(url) {
  if (!url || typeof url !== "string") {
    return "";
  }
  if (/^(data:|blob:)/.test(url)) {
    return "";
  }
  try {
    return new URL(url, window.location.href).href;
  } catch {
    return url;
  }
}

function warmDeckAssets(cardIds = [], options = {}) {
  const cards = cardIds.map((cardId) => getCard(cardId)).filter(Boolean);
  const urls = cards.flatMap((card) => getCardImagePreloadUrls(card, options));
  scheduleImagePreload(urls, { priority: Boolean(options.priority) });
}

function warmFactionPoolAssets(factionId, options = {}) {
  const cards = getFactionCards(factionId).slice(0, options.limit || 40);
  const urls = cards.flatMap((card) => getCardImagePreloadUrls(card, options));
  scheduleImagePreload(urls, { priority: Boolean(options.priority) });
}

function warmBattleDeckReserves(battle) {
  if (!battle) {
    return;
  }
  warmDeckAssets(collectInstanceCardIds(battle.decks.player).slice(0, 10), { includeFull: false });
  warmDeckAssets(collectInstanceCardIds(battle.decks.enemy).slice(0, 10), { includeFull: false });
}

function warmVisibleBattleAssets(battle, options = {}) {
  if (!battle) {
    return;
  }
  const priorityUrls = [CARD_BACK_ART_PATH];
  collectInstanceCardIds(battle.hands.player).forEach((cardId) => {
    const card = getCard(cardId);
    if (card) {
      priorityUrls.push(...getCardImagePreloadUrls(card, { includeFull: false }));
    }
  });
  ["player", "enemy"].forEach((side) => {
    ["frontline", "support"].forEach((lineId) => {
      (battle.board?.[side]?.[lineId] || []).forEach((instance) => {
        if (instance.hidden || instance.masked) {
          priorityUrls.push(CARD_BACK_ART_PATH);
          return;
        }
        const card = getCard(instance.cardId);
        if (card) {
          priorityUrls.push(...getCardImagePreloadUrls(card, { includeFull: false }));
        }
      });
    });
  });
  scheduleImagePreload(priorityUrls, { priority: options.priority !== false });
  runWhenIdle(() => {
    const fullUrls = collectBattleVisibleCards(battle).flatMap((card) => getCardImagePreloadUrls(card, { includeFull: true }));
    scheduleImagePreload(fullUrls);
  }, 1800);
}

function warmOnlineRoomAssets() {
  warmDeckAssets(state.playerDeck, { priority: true, includeFull: false });
  const factions = state.online.players
    .map((player) => player?.loadout?.faction)
    .filter(Boolean);
  runWhenIdle(() => {
    factions.forEach((factionId) => warmFactionPoolAssets(factionId, { includeFull: false }));
  }, 1200);
}

function warmBattleSnapshotAssets(snapshot) {
  if (snapshot?.battle) {
    warmVisibleBattleAssets(snapshot.battle, { priority: true });
  }
}

function collectBattleVisibleCards(battle) {
  const cards = [];
  collectInstanceCardIds(battle.hands.player).forEach((cardId) => {
    const card = getCard(cardId);
    if (card) {
      cards.push(card);
    }
  });
  ["player", "enemy"].forEach((side) => {
    ["frontline", "support"].forEach((lineId) => {
      (battle.board?.[side]?.[lineId] || []).forEach((instance) => {
        if (instance.hidden || instance.masked) {
          return;
        }
        const card = getCard(instance.cardId);
        if (card) {
          cards.push(card);
        }
      });
    });
  });
  return cards;
}

function collectInstanceCardIds(instances = []) {
  return instances
    .map((instance) => instance?.cardId)
    .filter(Boolean);
}

function getCardImagePreloadUrls(card, options = {}) {
  const urls = [getCardThumbnailArtPath(card)];
  if (options.includeFull) {
    urls.push(getCardArtPath(card));
  }
  return urls.filter(Boolean);
}

function getCardListImagePreloadUrls(card) {
  return [getCardListThumbnailArtPath(card)].filter(Boolean);
}

function handleInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }
  if (target.id === "online-player-name") {
    state.online.name = target.value.slice(0, 32);
    saveOnlineName(state.online.name);
  } else if (target.id === "online-room-code") {
    state.online.joinCode = target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    target.value = state.online.joinCode;
  }
}

function handleClick(event) {
  const target = event.target.closest("[data-action],[data-hand-card],[data-row],[data-board-card]");
  if (!target) {
    return;
  }
  gameAudio.unlock();

  if (target.dataset.action) {
    gameAudio.play("ui.click");
    handleAction(target.dataset.action);
    return;
  }

  if (target.dataset.handCard) {
    if (state.mulligan.active) {
      toggleMulliganCard(target.dataset.handCard);
      return;
    }
    gameAudio.play("card.flip");
    selectHandCard(target.dataset.handCard, { conceal: event.shiftKey });
    return;
  }

  if (target.dataset.row) {
    playSelectedUnitToRow(target.dataset.side, target.dataset.row);
    return;
  }

  if (target.dataset.boardCard) {
    handleBoardTarget(target.dataset.side, target.dataset.boardCard);
  }
}

function handleHover(event) {
  const cardElement = event.target.closest("[data-card-id]");
  if (!cardElement) {
    return;
  }
  gameAudio.play("ui.hover");
  state.hoveredCardId = cardElement.dataset.cardId;
  renderInspector();
  renderSpotlight();
}

function handleHoverOut(event) {
  const cardElement = event.target.closest("[data-card-id]");
  if (!cardElement || cardElement.contains(event.relatedTarget)) {
    return;
  }
  if (state.hoveredCardId === cardElement.dataset.cardId) {
    clearSpotlight();
  }
}

function clearSpotlight() {
  state.hoveredCardId = null;
  if (!refs.spotlight) {
    return;
  }
  refs.spotlight.classList.remove("is-overlay-preview");
  refs.spotlight.classList.remove("has-rule-aside");
  clearSpotlightLayout();
  refs.spotlight.hidden = true;
  refs.spotlight.innerHTML = "";
}

function clearSpotlightLayout() {
  if (!refs.spotlight) {
    return;
  }
  ["--spotlight-left", "--spotlight-top", "--spotlight-width", "--spotlight-height"].forEach((property) => {
    refs.spotlight.style.removeProperty(property);
  });
}

function positionDeckBuilderSpotlight() {
  if (!refs.spotlight) {
    return;
  }
  const panel = refs.deckBuilder?.querySelector(".deck-builder-panel");
  if (!panel) {
    clearSpotlightLayout();
    return;
  }
  const rect = panel.getBoundingClientRect();
  const viewport = window.visualViewport;
  const viewportWidth = viewport?.width ?? window.innerWidth;
  const viewportHeight = viewport?.height ?? window.innerHeight;
  const gap = 24;
  const edge = 18;
  const hasRuleAside = refs.spotlight.classList.contains("has-rule-aside");
  const minWidth = hasRuleAside ? 540 : 240;
  const maxWidth = hasRuleAside ? 704 : 312;
  const sideSpace = viewportWidth - rect.right - gap - edge;
  const hasSideSpace = sideSpace >= minWidth;
  const width = hasSideSpace
    ? Math.min(maxWidth, sideSpace)
    : Math.min(maxWidth, Math.max(hasRuleAside ? 320 : 220, viewportWidth - edge * 2));
  const left = hasSideSpace ? rect.right + gap : Math.max(edge, viewportWidth - width - edge);
  const top = Math.max(edge, rect.top);
  const height = Math.min(468, Math.max(240, viewportHeight - top - edge));

  refs.spotlight.style.setProperty("--spotlight-left", `${Math.round(left)}px`);
  refs.spotlight.style.setProperty("--spotlight-top", `${Math.round(top)}px`);
  refs.spotlight.style.setProperty("--spotlight-width", `${Math.round(width)}px`);
  refs.spotlight.style.setProperty("--spotlight-height", `${Math.round(height)}px`);
}

function updateSpotlightPosition() {
  if (!refs.spotlight || refs.spotlight.hidden || !refs.spotlight.classList.contains("is-overlay-preview")) {
    return;
  }
  positionDeckBuilderSpotlight();
}

const SPOTLIGHT_SOURCE_SELECTOR = ".hand-rail [data-card-id], .battle-board [data-card-id], .codex-overlay [data-card-id], .deck-builder-overlay [data-card-id]";

function getHoveredSpotlightSource(cardId) {
  return Array.from(document.querySelectorAll(SPOTLIGHT_SOURCE_SELECTOR)).find(
    (element) => element.dataset.cardId === cardId && element.matches(":hover"),
  );
}

function handleAction(action) {
  if (action === "start") {
    void startBattleWithLoading();
  } else if (action.startsWith("ai-difficulty:")) {
    setAiDifficulty(action.split(":")[1] || "medium");
  } else if (action === "confirm-mulligan") {
    confirmMulligan();
  } else if (action === "skip-mulligan") {
    skipMulligan();
  } else if (action.startsWith("keep-supply:")) {
    chooseSupplyCard(action.split(":")[1]);
  } else if (action === "pass") {
    passTurn("player");
  } else if (action === "end-turn") {
    passTurn("player");
  } else if (action === "surrender") {
    surrenderBattle();
  } else if (action === "reset") {
    resetBattle();
  } else if (action === "cancel") {
    gameAudio.play("ui.switch");
    cancelIntent();
  } else if (action === "open-codex") {
    gameAudio.play("ui.switch");
    openCodex();
  } else if (action === "close-codex") {
    gameAudio.play("ui.switch");
    closeCodex();
  } else if (action === "open-guide") {
    gameAudio.play("ui.switch");
    openGuide();
  } else if (action === "close-guide") {
    gameAudio.play("ui.switch");
    closeGuide();
  } else if (action === "open-deck-builder") {
    gameAudio.play("ui.switch");
    openDeckBuilder();
  } else if (action === "close-deck-builder") {
    gameAudio.play("ui.switch");
    closeDeckBuilder();
  } else if (action.startsWith("deck-faction:")) {
    setDeckFaction(action.split(":")[1] || "usa");
  } else if (action.startsWith("deck-add:")) {
    addDeckCard(action.split(":")[1]);
  } else if (action.startsWith("deck-remove:")) {
    removeDeckCard(action.split(":")[1]);
  } else if (action === "deck-reset") {
    resetPlayerDeck();
  } else if (action === "deck-clear") {
    clearPlayerDeck();
  } else if (action === "deck-autofill") {
    autoFillPlayerDeck();
  } else if (action === "toggle-bgm") {
    gameAudio.play("ui.switch");
    toggleBgm();
  } else if (action === "toggle-log") {
    gameAudio.play("ui.switch");
    toggleLogPanel();
  } else if (action === "online-focus") {
    focusOnlinePanel();
  } else if (action === "online-create-room") {
    void createOnlineRoom();
  } else if (action === "online-join-room") {
    void joinOnlineRoom();
  } else if (action === "online-toggle-ready") {
    toggleOnlineReady();
  } else if (action === "online-start-battle") {
    void startOnlineBattlePreview();
  } else if (action === "online-leave-room") {
    leaveOnlineRoom();
  } else if (action === "online-copy-code") {
    void copyOnlineRoomCode();
  } else if (action === "online-clear-error") {
    state.online.error = "";
    renderOnlinePanel();
  } else if (action.startsWith("play-hidden:")) {
    selectHandCard(action.split(":")[1], { conceal: true });
  } else if (action.startsWith("play-open:")) {
    selectHandCard(action.split(":")[1], { conceal: false });
  } else if (action.startsWith("choose-target:")) {
    const [, side, uid] = action.split(":");
    if (side && uid) {
      handleBoardTarget(side, uid);
    }
  } else if (action.startsWith("codex:")) {
    state.codexFaction = action.split(":")[1] || "usa";
    renderCodex();
  }
}

async function startBattleWithLoading(options = {}) {
  const validation = validateDeck(state.playerDeck, state.playerFaction);
  if (!validation.valid) {
    gameAudio.play("ui.error");
    state.deckBuilderOpen = true;
    render();
    return;
  }
  await runBattlefieldLoading();
  startBattle({ ...options, skipValidation: true });
}

function startBattle(options = {}) {
  const { skipValidation = false, ...battleOptions } = options;
  if (!skipValidation) {
    const validation = validateDeck(state.playerDeck, state.playerFaction);
    if (!validation.valid) {
      gameAudio.play("ui.error");
      state.deckBuilderOpen = true;
      render();
      return;
    }
  }
  state.battle = createBattle(battleOptions);
  warmVisibleBattleAssets(state.battle, { priority: true });
  runWhenIdle(() => warmBattleDeckReserves(state.battle), 900);
  if (battleOptions.mode === "online-preview") {
    const seedText = options.seed ? `Seed ${options.seed}` : "未指定 Seed";
    const opponentText = options.opponentName ? `对手：${options.opponentName}。` : "";
    state.battle.log.push(`线上房间 ${options.roomCode || state.online.roomCode || "未知"} 已生成 ${seedText}。${opponentText}`);
    state.battle.log.push("当前进入本地战斗预演：房间、准备和 Seed 已同步；出牌、目标和回合结算还未接入服务器权威同步。");
  } else {
    state.battle.log.push(`AI 难度：${AI_DIFFICULTY_LABELS[state.aiDifficulty]}。`);
  }
  state.battle.log.push(`玩家卡组：${getFaction(state.playerFaction).shortName}自定义编成，${state.playerDeck.length} 张。`);
  state.screen = "battle";
  state.selectedHandUid = null;
  state.hoveredCardId = null;
  state.pending = null;
  state.guideOpen = false;
  state.deckBuilderOpen = false;
  state.mulligan = {
    active: true,
    selectedUids: [],
  };
  state.bgmOn = true;
  playBgm(true);
  gameAudio.play("system.start");
  gameAudio.play("card.drawHand", { count: 7, side: "player" });
  render();
}

function resetBattle() {
  gameAudio.play("ui.switch");
  clearBattleTimers(state.battle);
  clearSpotlight();
  if (refs.bgm) {
    refs.bgm.pause();
    refs.bgm.currentTime = 0;
  }
  state.screen = "briefing";
  state.battle = null;
  state.selectedHandUid = null;
  state.hoveredCardId = null;
  state.pending = null;
  state.guideOpen = false;
  state.deckBuilderOpen = false;
  state.mulligan = {
    active: false,
    selectedUids: [],
  };
  state.bgmOn = false;
  render();
}

function toggleMulliganCard(uid) {
  const battle = state.battle;
  if (!battle || !state.mulligan.active) {
    return;
  }
  if (!battle.hands.player.some((instance) => instance.uid === uid)) {
    return;
  }
  const selected = state.mulligan.selectedUids;
  const index = selected.indexOf(uid);
  if (index !== -1) {
    selected.splice(index, 1);
  } else if (selected.length < MULLIGAN_LIMIT) {
    selected.push(uid);
  } else {
    gameAudio.play("ui.error");
    return;
  }
  gameAudio.play("ui.switch");
  renderHand();
  renderMulligan();
}

function confirmMulligan() {
  completeMulligan(state.mulligan.selectedUids);
}

function skipMulligan() {
  completeMulligan([]);
}

function completeMulligan(selectedUids = []) {
  const battle = state.battle;
  if (!battle || !state.mulligan.active) {
    return;
  }

  if (isOnlineAuthoritativeBattle()) {
    sendOnlineBattleAction({
      kind: "mulligan",
      selectedUids: selectedUids.slice(0, MULLIGAN_LIMIT),
    });
    return;
  }

  const selected = selectedUids.slice(0, MULLIGAN_LIMIT);
  const returned = [];
  selected.forEach((uid) => {
    const index = battle.hands.player.findIndex((instance) => instance.uid === uid);
    if (index === -1) {
      return;
    }
    const [instance] = battle.hands.player.splice(index, 1);
    returned.push(instance);
  });

  if (returned.length) {
    battle.decks.player.push(...returned);
    drawCards(battle, "player", returned.length);
    battle.log.push(`美国完成开局调度，置换 ${returned.length} 张手牌。`);
  } else {
    battle.log.push("美国保留开局手牌。");
  }

  state.mulligan = {
    active: false,
    selectedUids: [],
  };
  state.selectedHandUid = null;
  clearSpotlight();
  beginTurnHandoff(battle, null, "player", { opening: true });
}

function clearBattleTimers(battle) {
  if (!battle) {
    return;
  }
  window.clearTimeout(battle.aiTimer);
  window.clearTimeout(battle.turnTimer);
  battle.aiTimer = null;
  battle.turnTimer = null;
  battle.turnTransition = null;
  battle.aiThinking = false;
  battle.actionAnimation = null;
}

function beginTurnHandoff(battle, fromSide, toSide, options = {}) {
  if (!battle || battle.phase !== "battle") {
    render();
    return;
  }

  clearSpotlight();
  window.clearTimeout(battle.aiTimer);
  window.clearTimeout(battle.turnTimer);
  battle.aiTimer = null;
  battle.turnTimer = null;
  battle.aiThinking = false;
  battle.activeSide = toSide;
  battle.turnTransition = {
    fromSide,
    toSide,
    opening: Boolean(options.opening),
    serial: battle.actionSerial,
  };

  render();

  battle.turnTimer = window.setTimeout(() => {
    if (state.battle !== battle || battle.phase !== "battle") {
      return;
    }
    battle.turnTransition = null;
    resetTurnActions(battle, battle.activeSide);
    render();
    if (battle.activeSide === "enemy") {
      scheduleAi();
    }
  }, options.duration || TURN_HANDOFF_MS);
}

function getSideLabel(side) {
  if (side === "player") {
    return "我方";
  }
  if (side === "enemy") {
    return "敌方";
  }
  return "停火";
}

function resetTurnActions(battle, side) {
  if (!battle || !side) {
    return;
  }
  battle.turnActions ||= {};
  const nextActions = createTurnActionState();
  const opponent = side === "player" ? "enemy" : side === "enemy" ? "player" : null;
  nextActions.enemyFrontlineEmptyAtStart = opponent ? countAliveUnitsOnLine(battle, opponent, "frontline") === 0 : false;
  nextActions.ownBoardEmptyAtStart = countAliveUnitsForSide(battle, side) === 0;
  battle.turnActions[side] = nextActions;
}

function getTurnActions(battle, side) {
  battle.turnActions ||= {};
  battle.turnActions[side] ||= createTurnActionState();
  return battle.turnActions[side];
}

function getTurnUiState(battle) {
  if (!battle) {
    return { tone: "neutral", eyebrow: "", title: "", detail: "" };
  }
  if (battle.phase === "match-over") {
    const result =
      battle.matchWinner === "draw"
        ? "平局"
        : battle.matchWinner === "player"
          ? "已获得胜利"
          : "作战失败";
    return {
      tone: battle.matchWinner || "neutral",
      eyebrow: "对局结束",
      title: result,
      detail: battle.matchWinner === "player" ? "我方已达到胜利分数" : "最终得分结算完成",
    };
  }
  if (battle.turnTransition) {
    const toSide = battle.turnTransition.toSide;
    return {
      tone: toSide || "neutral",
      eyebrow: battle.turnTransition.opening ? "战斗开始" : "指挥权移交",
      title: `${getSideLabel(toSide)}回合`,
      detail: `行动序列 ${battle.turnTransition.serial}`,
    };
  }
  if (battle.aiThinking) {
    return {
      tone: "enemy",
      eyebrow: "敌方回合",
      title: "敌方研判中",
      detail: `行动序列 ${battle.actionSerial}`,
    };
  }
  if (battle.pendingSide) {
    const ownPending = battle.pendingSide === "player";
    const kindLabel = battle.pendingKind === "interceptChoice" ? "防空拦截窗口" : "目标选择窗口";
    return {
      tone: ownPending ? "player" : "enemy",
      eyebrow: ownPending ? "等待选择" : "等待对手",
      title: ownPending ? (battle.pendingKind === "interceptChoice" ? "请选择拦截单位" : "请选择目标") : "对手正在选择",
      detail: `${kindLabel} · 行动序列 ${battle.actionSerial}`,
    };
  }
  if (battle.activeSide === "player") {
    return {
      tone: "player",
      eyebrow: "当前回合",
      title: "我方行动",
      detail: battle.finalActions ? `最终行动剩余 ${battle.finalActions.player}` : `行动序列 ${battle.actionSerial}`,
    };
  }
  if (battle.activeSide === "enemy") {
    return {
      tone: "enemy",
      eyebrow: "当前回合",
      title: "敌方行动",
      detail: battle.finalActions ? `最终行动剩余 ${battle.finalActions.enemy}` : `行动序列 ${battle.actionSerial}`,
    };
  }
  return {
    tone: "neutral",
    eyebrow: "等待结算",
    title: "停火",
    detail: "战场状态同步中",
  };
}

function createBattle(options = {}) {
  const playerFaction = options.playerFaction || state.playerFaction;
  const requestedEnemyFaction = options.enemyFaction;
  const enemyFaction = getFaction(requestedEnemyFaction) ? requestedEnemyFaction : FACTION_PAIR[playerFaction] || "russia";
  const rng = options.seed ? createSeededRandom(`${options.seed}:${playerFaction}:${enemyFaction}`) : Math.random;
  const battle = {
    round: 1,
    actionSerial: 1,
    phase: "battle",
    mode: options.mode || "ai",
    onlineMatch: options.onlineMatch || null,
    activeSide: "player",
    factions: {
      player: playerFaction,
      enemy: enemyFaction,
    },
    aiDifficulty: state.aiDifficulty,
    passed: {
      player: false,
      enemy: false,
    },
    turnActions: {
      player: createTurnActionState(),
      enemy: createTurnActionState(),
    },
    intel: {
      player: 0,
      enemy: 0,
    },
    scores: {
      player: 0,
      enemy: 0,
    },
    decks: {
      player: createDeckFromList(options.playerDeck || state.playerDeck, rng),
      enemy: createDeckFromList(options.enemyDeck || getStarterDeckForFaction(enemyFaction), rng),
    },
    hands: {
      player: [],
      enemy: [],
    },
    board: {
      player: createEmptyLines(() => []),
      enemy: createEmptyLines(() => []),
    },
    graves: {
      player: [],
      enemy: [],
    },
    guards: {
      player: [],
      enemy: [],
    },
    intelDenials: {
      player: [],
      enemy: [],
    },
    fireBoost: {
      player: 0,
      enemy: 0,
    },
    log: [
      "V0.5.2 / 20260527 规则：单位拆分为攻击、生命和目标价值，摧毁后按目标价值获得战场得分。",
      "巡航导弹、弹道导弹、战斗机和轰炸机均为驻场单位，拥有生命、可被摧毁并提供得分。",
      "巡航导弹和弹道导弹可打击地面与低空单位，包括无人机和直升机；巡航可被伴随/重型防空拦截，弹道只能被重型防空拦截。",
      "F-35A 与 Su-57 按普通战斗机对地打击处理，不再使用 SEAD、反辐射或隐蔽防空锁定规则。",
      "每个单位每回合最多行动一次；部署单位可立即行动，但本回合不能再次作为场上行动单位，也不能执行前线突破。",
      "敌方前线仍有单位时，前线单位不能越过前线直接攻击支援区目标。",
      "若己方回合开始时敌方前线为空，可用一个回合开始前已部署且未行动的前线单位突破，暴露并打击其可有效攻击的敌方隐蔽支援区单位。",
    ],
    aiTimer: null,
    turnTimer: null,
    turnTransition: null,
    aiThinking: false,
    actionAnimation: null,
    matchWinner: null,
    supplyExhausted: false,
    finalActions: null,
    finalTriggeredAtAction: null,
  };

  drawCards(battle, "player", 7, { triggerExhaustion: false, silent: true });
  drawCards(battle, "enemy", 7, { triggerExhaustion: false, silent: true });
  return battle;
}

function createDeckFromList(cardIds, rng = Math.random) {
  return shuffleInstances(cardIds.map((cardId) => createInstance(cardId)), rng);
}

function shuffleInstances(items, rng = Math.random) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function createSeededRandom(seed) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return () => {
    hash += 0x6d2b79f5;
    let value = hash;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createInstance(cardId) {
  return {
    uid: `card-${++state.uidCounter}`,
    cardId,
    damage: 0,
    exposed: false,
    exposedAtAction: null,
    hidden: false,
    shield: false,
    fortified: false,
    decoy: false,
    suppressed: false,
    airspaceControl: false,
    bonus: 0,
    deployedAtAction: null,
    actedAction: null,
    damageDebuff: 0,
    calledAction: null,
    assistAction: null,
    interceptAction: null,
    lastDamagedBy: null,
    flipAnimation: null,
    flipAnimationId: 0,
  };
}

function createTurnActionState() {
  return {
    handPlayed: false,
    unitPlayed: false,
    tacticPlayed: false,
    hiddenActivated: false,
    breakthroughUsed: false,
    enemyFrontlineEmptyAtStart: false,
    ownBoardEmptyAtStart: false,
    nonTacticActionsUsed: 0,
    unitDeployments: 0,
    boardActions: 0,
  };
}

function render() {
  refs.app.dataset.screen = state.screen;
  refs.app.dataset.pending = state.pending ? "true" : "false";
  refs.app.dataset.activeSide = state.battle?.activeSide || "none";
  refs.app.dataset.turnLocked = state.battle?.turnTransition || state.battle?.aiThinking || state.battle?.actionAnimation ? "true" : "false";
  refs.app.dataset.mulligan = state.mulligan.active ? "true" : "false";
  refs.app.dataset.bgm = state.bgmOn ? "on" : "off";
  refs.briefing.hidden = state.screen !== "briefing";
  if (state.battle) {
    warmVisibleBattleAssets(state.battle);
  }
  renderDeckStatus();
  renderOnlinePanel();
  renderBoard();
  renderHand();
  renderScore();
  renderTurnOverlay();
  renderLog();
  renderInspector();
  renderSpotlight();
  renderIntent();
  renderMulligan();
  renderCodex();
  renderGuide();
  renderDeckBuilder();
  renderBgmToggle();
}

function renderBgmToggle() {
  const label = state.bgmOn ? "关闭声音" : "开启声音";
  document.querySelectorAll('[data-action="toggle-bgm"]').forEach((button) => {
    button.setAttribute("aria-label", label);
    button.setAttribute("aria-pressed", state.bgmOn ? "true" : "false");
  });
}

function renderBoard() {
  const battle = state.battle;
  if (!battle) {
    refs.board.innerHTML = renderEmptyBoard();
    return;
  }

  const enemyRows = lineOrders.enemy.map((lineId) => renderLine("enemy", lineId)).join("");
  const playerRows = lineOrders.player.map((lineId) => renderLine("player", lineId)).join("");
  refs.board.innerHTML = `${enemyRows}${renderNoMansLand(battle)}${playerRows}`;
}

function renderEmptyBoard() {
  const rows = [
    ...lineOrders.enemy.map((lineId) => renderEmptyLine("enemy", lineId)),
    `<div class="no-mans-land"><span>NO MAN'S LAND</span></div>`,
    ...lineOrders.player.map((lineId) => renderEmptyLine("player", lineId)),
  ];
  return rows.join("");
}

function renderNoMansLand(battle) {
  const breakthrough = getBreakthroughVisualState(battle);
  if (!breakthrough) {
    return `<div class="no-mans-land"><span>NO MAN'S LAND</span></div>`;
  }
  return `
    <div class="no-mans-land is-breakthrough-ready" style="--breakthrough-accent:${getFaction(battle.factions[breakthrough.side]).accent}">
      <span>NO MAN'S LAND</span>
      <strong>前线突破窗口</strong>
      <small>${getSideName(battle, breakthrough.side)}可突破${getSideName(battle, breakthrough.opponent)}支援区</small>
    </div>
  `;
}

function renderEmptyLine(side, lineId) {
  const line = getLine(lineId);
  return `
    <section class="battle-line battle-line--${side}" data-side="${side}" data-row="${lineId}">
      <div
        class="battle-line__label battle-line__label--icon"
        style="--lane-icon:url('${getLineIconPath(lineId)}')"
        aria-label="${side === "player" ? "我方" : "敌方"}${line.name}"
      ></div>
      <div class="battle-line__cards"><span class="battle-line__empty">${line.role}</span></div>
      <div class="battle-line__score" style="--lane-icon:url('${getLineIconPath(lineId)}')" aria-label="${line.label} 0">
        <span></span>
        <strong>0</strong>
      </div>
    </section>
  `;
}

function renderLine(side, lineId) {
  const battle = state.battle;
  const line = getLine(lineId);
  const cards = battle.board[side][lineId];
  const score = getLineScore(battle, side, lineId);
  const canDrop = isSelectedUnitAllowedOn(side, lineId);
  const active = battle.activeSide === side && !battle.passed[side];
  const unsupported = lineId === "support" && isSupportUncovered(battle, side);
  const breakthrough = getBreakthroughVisualState(battle);
  const breakthroughSource = breakthrough?.side === side;
  const breakthroughTarget = breakthrough?.opponent === side;
  const breakthroughAccent = breakthrough ? getFaction(battle.factions[breakthrough.side]).accent : "";
  return `
    <section
      class="battle-line battle-line--${side} ${active ? "is-active" : ""} ${canDrop ? "is-drop-valid" : ""} ${unsupported ? "is-uncovered" : ""} ${breakthroughSource ? "is-breakthrough-source" : ""} ${breakthroughTarget ? "is-breakthrough-target" : ""}"
      data-side="${side}"
      data-row="${lineId}"
      ${breakthrough ? `style="--breakthrough-accent:${breakthroughAccent}"` : ""}
    >
      <div
        class="battle-line__label battle-line__label--icon"
        style="--lane-icon:url('${getLineIconPath(lineId)}')"
        aria-label="${side === "player" ? "我方" : "敌方"}${line.name}"
      ></div>
      <div class="battle-line__cards">
        ${
          cards.length
            ? cards.map((instance) => renderBoardCard(instance, side, lineId)).join("")
            : `<span class="battle-line__empty">待部署</span>`
        }
      </div>
      <div class="battle-line__score" style="--lane-icon:url('${getLineIconPath(lineId)}')" aria-label="${line.label} ${score}">
        <span>${breakthroughTarget ? "突破威胁" : breakthroughSource && lineId === "frontline" ? "突破就绪" : unsupported ? "失去掩护" : ""}</span>
        <strong>${score}</strong>
      </div>
    </section>
  `;
}

function renderBoardCard(instance, side, lineId) {
  const card = getVisibleCardForInstance(instance, side);
  const attack = getCardBaseAttack(card);
  const currentHealth = getCurrentPower(instance);
  const maxHealth = getCardHealth(card);
  const targetable = isPendingTarget(side, instance.uid);
  const concealed = instance.hidden;
  const inspectable = !concealed || side === "player";
  const artPath = concealed ? CARD_BACK_ART_PATH : getCardThumbnailArtPath(card);
  const fireVideoPath = concealed ? "" : getCardFireVideoPath(card);
  const title = concealed ? "" : card.name;
  const tags = concealed ? "" : getCardDisplayTags(card).join(" / ");
  const flipClass = instance.flipAnimation ? `is-flipping-${instance.flipAnimation}` : "";
  const generated = hasGeneratedCardImages(card);
  const modernClass = !concealed && (isModernUnitCard(card) || generated) ? "board-card--modern" : "";
  const generatedClass = !concealed && generated ? "board-card--generated-card" : "";
  const actionAnimation = state.battle?.actionAnimation;
  const contactClass = getContactAnimationClass(actionAnimation, instance.uid);
  const deployClass = actionAnimation?.kind === "deployHold" && actionAnimation.sourceUid === instance.uid ? "is-deploying" : "";
  const thumbnailClass = !concealed && card.type === "unit" ? "board-card--thumbnail" : "";
  const stateTitle = concealed
    ? side === "player"
      ? `${card.name}（隐蔽部署，悬停查看详情）`
      : "敌方隐蔽单位"
    : targetable
      ? `${card.name}（可选目标）`
      : card.name;
  return `
    <article
      class="board-card ${modernClass} ${generatedClass} ${thumbnailClass} ${contactClass} ${deployClass} ${targetable ? "is-targetable" : ""} ${instance.hidden ? "is-hidden" : ""} ${concealed ? "is-concealed-card" : ""} ${instance.exposed ? "is-exposed" : ""} ${flipClass}"
      data-board-card="${instance.uid}"
      data-side="${side}"
      ${inspectable ? `data-card-id="${card.id}"` : ""}
      aria-label="${escapeHtml(stateTitle)}"
      title="${escapeHtml(stateTitle)}"
      style="--accent:${getFaction(card.faction).accent};--card-art:${artPath ? `url('${artPath}')` : "none"};--art-position:${getCardArtPosition(card.id)}"
    >
      <div class="board-card__power">${concealed ? "" : `<strong>${attack}</strong><span>战</span>`}</div>
      ${!concealed && card.type === "unit" ? renderUnitHealthBadge(card, "board-card__health-badge", currentHealth, maxHealth) : ""}
      ${!concealed && card.type === "unit" ? renderUnitValueBadge(card, "board-card__value-badge") : ""}
      ${!concealed && card.type === "unit" ? renderThumbnailCombatOverlay(card, { className: "board-card__thumb-hud", currentHealth, maxHealth }) : ""}
      ${fireVideoPath ? `<video class="board-card__fire-video" src="${escapeHtml(fireVideoPath)}" poster="${escapeHtml(artPath)}" playsinline preload="metadata"></video>` : ""}
      <div class="board-card__art ${artPath ? "" : "is-empty"}" data-glyph="${escapeHtml(getPrimaryGlyph(card))}">
        ${artPath ? "" : `<span>${escapeHtml(TYPE_LABELS[card.type])}</span>`}
      </div>
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(tags)}</span>
      ${targetable ? `<em class="board-card__target-line">${escapeHtml(getLine(lineId).name)}</em>` : ""}
      <p class="board-card__effect">${concealed ? "" : escapeHtml(card.effect)}</p>
      <div class="board-card__states">
        ${!concealed && instance.hidden ? "<i>Hidden</i>" : ""}
        ${!concealed && instance.exposed ? "<i>Exposed</i>" : ""}
        ${!concealed && instance.shield ? "<i>Smoke</i>" : ""}
        ${!concealed && instance.fortified ? "<i>Fortified</i>" : ""}
        ${!concealed && instance.decoy ? "<i>Decoy</i>" : ""}
        ${!concealed && instance.suppressed ? "<i>Suppressed</i>" : ""}
        ${!concealed && instance.airspaceControl ? "<i>Airspace</i>" : ""}
        ${!concealed && instance.bonus > 0 ? `<i>Bonus ${instance.bonus}</i>` : ""}
        ${!concealed && instance.damageDebuff > 0 ? `<i>压制 -${instance.damageDebuff}</i>` : ""}
        ${!concealed && instance.damage > 0 ? `<i>Damage ${instance.damage}</i>` : ""}
      </div>
    </article>
  `;
}

function getContactAnimationClass(actionAnimation, uid) {
  if (actionAnimation?.kind !== "frontlineContact") {
    return "";
  }
  const isSource = actionAnimation.sourceUid === uid;
  const isTarget = actionAnimation.targetUids?.includes(uid);
  if (!isSource && !isTarget) {
    return "";
  }
  const role = isSource ? "source" : "ambusher";
  return `is-contact-${role} is-contact-${actionAnimation.phase || "reveal"}`;
}
function renderHand() {
  const battle = state.battle;
  if (!battle) {
    refs.hand.innerHTML = "";
    return;
  }

  refs.hand.innerHTML = battle.hands.player
    .map((instance, index) =>
      renderHandCard(instance, {
        selected: state.selectedHandUid === instance.uid,
        mulliganSelected: state.mulligan.active && state.mulligan.selectedUids.includes(instance.uid),
        showDeployActions: !state.mulligan.active,
        index,
        total: battle.hands.player.length,
      }),
    )
    .join("");
}

function renderHandCard(instance, options = {}) {
  const card = getCard(instance.cardId);
  return renderWarCard(card, {
    ...options,
    handUid: instance.uid,
    canConceal: canConcealCardFromHand("player", card),
  });
}

function renderPreviewCard(card) {
  return renderWarCard(card, { preview: true });
}

function renderScore() {
  const battle = state.battle;
  if (!battle) {
    refs.score.innerHTML = "";
    refs.pass.disabled = true;
    refs.endTurn.hidden = true;
    refs.bgmButton.hidden = true;
    refs.codexButton.hidden = true;
    refs.reset.hidden = true;
    return;
  }

  const playerFaction = getFaction(battle.factions.player);
  const enemyFaction = getFaction(battle.factions.enemy);
  const turn = getTurnUiState(battle);
  refs.score.innerHTML = `
    ${renderCommanderPanel(battle, "enemy", enemyFaction)}
    <div class="enemy-hand-strip" aria-label="敌方手牌">
      ${battle.hands.enemy.map((_, index) => `<span class="enemy-hand-back" style="--i:${index}"></span>`).join("")}
    </div>
    ${renderDeckPanel(battle, "enemy")}
    <div class="round-plaque round-plaque--${turn.tone} ${battle.turnTransition ? "is-transitioning" : ""} ${battle.aiThinking ? "is-thinking" : ""}">
      <span>${escapeHtml(turn.eyebrow)}</span>
      <strong>${escapeHtml(turn.title)}</strong>
      <div class="round-plaque__scores">
        <i>${getTotalScore(battle, "player")}</i>
        <em>:</em>
        <i>${getTotalScore(battle, "enemy")}</i>
      </div>
      <small>${escapeHtml(turn.detail)}</small>
    </div>
    ${renderCommanderPanel(battle, "player", playerFaction)}
    ${renderDeckPanel(battle, "player")}
  `;
  const battleOver = battle.phase === "match-over";
  refs.pass.disabled = false;
  refs.pass.textContent = battleOver ? "退出" : "投降";
  refs.endTurn.hidden = false;
  refs.endTurn.disabled = battleOver || !canPlayerEndTurn();
  refs.endTurn.textContent = battleOver ? "对局结束" : battle.activeSide === "player" && !battle.turnTransition ? "回合结束" : "等待对方";
  refs.bgmButton.hidden = false;
  refs.bgmButton.classList.toggle("is-active", state.bgmOn);
  refs.bgmButton.textContent = state.bgmOn ? "🔊" : "🔇";
  refs.bgmButton.setAttribute("aria-label", state.bgmOn ? "关闭音乐" : "开启音乐");
  refs.bgmButton.setAttribute("title", state.bgmOn ? "关闭音乐" : "开启音乐");
  refs.codexButton.hidden = true;
  refs.reset.hidden = true;
}

function renderTurnOverlay() {
  const battle = state.battle;
  const showResult = battle?.phase === "match-over";
  if (!refs.turnOverlay || !battle || state.screen !== "battle" || (!showResult && !battle.turnTransition && !battle.aiThinking)) {
    if (refs.turnOverlay) {
      refs.turnOverlay.hidden = true;
      refs.turnOverlay.innerHTML = "";
    }
    return;
  }

  const turn = getTurnUiState(battle);
  refs.turnOverlay.hidden = false;
  refs.turnOverlay.className = `turn-overlay turn-overlay--${turn.tone} ${showResult ? "is-result" : battle.aiThinking ? "is-thinking" : "is-handoff"}`;
  refs.turnOverlay.innerHTML = `
    <div class="turn-overlay__band">
      <span>${escapeHtml(turn.eyebrow)}</span>
      <strong>${escapeHtml(turn.title)}</strong>
      <small>${escapeHtml(turn.detail)}</small>
    </div>
  `;
}

function renderMulligan() {
  if (!refs.mulligan) {
    return;
  }
  if (!state.mulligan.active || !state.battle || state.screen !== "battle") {
    refs.mulligan.hidden = true;
    refs.mulligan.innerHTML = "";
    return;
  }
  const selectedCount = state.mulligan.selectedUids.length;
  refs.mulligan.hidden = false;
  refs.mulligan.innerHTML = `
    <div class="mulligan-panel">
      <span>开局调度</span>
      <strong>选择最多 ${MULLIGAN_LIMIT} 张手牌置换</strong>
      <p>已选择 ${selectedCount}/${MULLIGAN_LIMIT}。确认后会抽取同等数量的新手牌，也可以直接放弃调度。</p>
      <div class="mulligan-panel__actions">
        <button type="button" class="small-button" data-action="confirm-mulligan" ${selectedCount ? "" : "disabled"}>确认调度</button>
        <button type="button" class="primary-button" data-action="skip-mulligan">保留手牌</button>
      </div>
    </div>
  `;
}

function renderCommanderPanel(battle, side, faction) {
  const profile = COMMANDER_PROFILES[side];
  const player = battle.players?.[side] || {};
  const displayName = player.name || profile.name;
  const turnActive = battle.activeSide === side && battle.phase === "battle";
  const status = battle.phase === "match-over" ? "结算" : turnActive ? (battle.aiThinking && side === "enemy" ? "研判" : "行动") : "待命";
  return `
    <section class="commander-hud commander-hud--${side} ${turnActive ? "is-active-turn" : ""}" style="--accent:${faction.accent}">
      <div class="commander-hud__portrait commander-hud__portrait--${side}" aria-hidden="true">
        <img src="${escapeHtml(profile.portrait)}" alt="" loading="eager" />
      </div>
      <div class="commander-hud__body">
        <span class="commander-hud__turn">${escapeHtml(status)}</span>
        <strong>${escapeHtml(displayName)}</strong>
        <small class="commander-hud__rank">
          <span class="commander-hud__rank-line"><em>${escapeHtml(profile.rank)}</em></span>
          <span class="commander-hud__stars" aria-label="三星">★★★</span>
        </small>
      </div>
    </section>
  `;
}

function renderWarCard(card, options = {}) {
  const faction = getFaction(card.faction);
  const glyph = getPrimaryGlyph(card);
  const isHandThumbnail = Boolean(options.handUid && !options.preview);
  const spread = (options.total || 1) > 8 ? 1.35 : 1.72;
  const fan = ((options.index || 0) - ((options.total || 1) - 1) / 2) * spread;
  const generated = hasGeneratedCardImages(card);
  const generatedImages = getGeneratedCardImages(card);
  const detailArtPath = "";
  const previewArtPath = options.preview && generatedImages?.art ? generatedImages.art : "";
  const liveDetailOverlay = false;
  const livePowerOverlay = false;
  const artPath = isHandThumbnail ? getCardThumbnailArtPath(card) : previewArtPath || detailArtPath || getCardArtPath(card);
  const modern = isModernUnitCard(card);
  const displayTags = getCardDisplayTags(card);
  const metaItems = displayTags;
  const factionMarkPath = getFactionMarkPath(card.faction);
  const footerFactionLabel = options.preview ? faction.shortName : card.specialization;
  const classes = [
    "war-card",
    `war-card--${card.type}`,
    `war-card--${card.rarity}`,
    `war-card--faction-${card.faction}`,
    modern ? "war-card--modern" : "",
    generated ? "war-card--generated-card" : "",
    detailArtPath ? "war-card--generated-detail" : "",
    liveDetailOverlay ? "war-card--live-detail-overlay" : "",
    options.preview && generated ? "war-card--visual-preview" : "",
    options.preview ? "war-card--detailed" : "war-card--simple",
    isHandThumbnail ? "war-card--thumbnail" : "",
    options.preview ? "war-card--preview" : "",
    options.selected ? "is-selected" : "",
    options.mulliganSelected ? "is-mulligan-selected" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const showPowerBadge = isHandThumbnail ? false : card.type === "unit" ? (!detailArtPath || livePowerOverlay) : !generated;
  const powerBadge = card.type === "unit" ? getCardBaseAttack(card) : card.type === "tactic" ? "T" : "S";
  const footerStarsLabel = card.type === "unit" ? `目标价值 ${getCardTargetValue(card)} 星` : "";
  const footerStars = card.type === "unit" ? renderUnitValueStars(card) : "";
  const renderedTags = displayTags.map((tag) => {
    const tagBadge = getTagBadgePath(tag);
    const style = tagBadge ? ` style="--tag-art:url('${tagBadge}')"` : "";
    return `<i class="${tagBadge ? "has-art" : ""}"${style} aria-label="${escapeHtml(tag)}"><span>${escapeHtml(tag)}</span></i>`;
  }).join("");
  const extraAttrs = options.handUid ? `data-hand-card="${options.handUid}" draggable="true"` : "";
  const deployActions =
    options.handUid && card.type === "unit" && options.showDeployActions !== false
      ? `
        <div class="war-card__deploy-actions">
          <button type="button" data-action="play-open:${options.handUid}">正面</button>
          <button type="button" data-action="play-hidden:${options.handUid}" ${options.canConceal ? "" : "disabled"}>隐蔽</button>
        </div>
      `
      : "";
  return `
    <article
      class="${classes}"
      ${extraAttrs}
      data-card-id="${card.id}"
      title="${escapeHtml(card.effect)}"
      style="--accent:${faction.accent};--fan:${fan.toFixed(2)}deg;--hand-index:${(options.index || 0) + 1};--card-art:${artPath ? `url('${artPath}')` : "none"};--art-position:${getCardArtPosition(card.id)}"
    >
        ${showPowerBadge ? `
          <div class="war-card__power">
            <strong>${powerBadge}</strong>
            ${card.type === "unit" ? "<span>战</span>" : ""}
          </div>
        ` : ""}
      ${isHandThumbnail && card.type === "unit" ? renderThumbnailCombatOverlay(card, { className: "war-card__thumb-hud" }) : ""}
      ${card.type === "unit" && !isHandThumbnail ? renderUnitHealthBadge(card) : ""}
      ${card.type === "unit" && !isHandThumbnail ? renderUnitValueBadge(card) : ""}
      <div class="war-card__titlebar">
        <strong>${escapeHtml(card.name)}</strong>
        <div class="war-card__meta">
          ${metaItems.map((item) => `<span data-meta-item="${escapeHtml(item)}">${escapeHtml(item)}</span>`).join("")}
        </div>
      </div>
      ${card.type === "unit" && !isHandThumbnail ? renderUnitHudStrip(card, glyph) : ""}
      <div class="war-card__art ${artPath ? "" : "is-empty"}" data-glyph="${escapeHtml(glyph)}">
        ${artPath ? "" : "<span>插画待补</span>"}
      </div>
      <div class="war-card__tags">
        ${renderedTags}
      </div>
      ${renderCardStats(card)}
      <div class="war-card__body">
        ${renderEffectParagraphs(card.effect, card)}
      </div>
      <div class="war-card__footer">
        ${card.type === "unit" ? `<span class="war-card__stars war-card__value-stars" aria-label="${escapeHtml(footerStarsLabel)}">${footerStars}</span>` : ""}
        <em class="war-card__faction-mark" ${factionMarkPath ? `style="--faction-mark:url('${factionMarkPath}')"` : ""} aria-label="${escapeHtml(faction.shortName)}">${escapeHtml(footerFactionLabel)}</em>
      </div>
      ${deployActions}
    </article>
  `;
}

function renderUnitHudStrip(card, glyph = getPrimaryGlyph(card)) {
  if (card.type !== "unit") {
    return "";
  }
  const attribute = getCardUnitAttribute(card);
  return `
    <div class="war-card__unit-hud" aria-label="战力 ${getCardBaseAttack(card)}，单位属性 ${attribute}，生命 ${getCardHealth(card)}">
      <span class="war-card__hud-stat is-attack">
        <i aria-hidden="true">◎</i>
        <b>${getCardBaseAttack(card)}</b>
      </span>
      <span class="war-card__hud-unit" aria-label="${escapeHtml(attribute)}">
        <i aria-hidden="true">${escapeHtml(glyph)}</i>
        <b>${escapeHtml(attribute)}</b>
      </span>
      <span class="war-card__hud-stat is-health">
        <i aria-hidden="true">盾</i>
        <b>${getCardHealth(card)}</b>
      </span>
    </div>
  `;
}

function renderThumbnailCombatOverlay(card, options = {}) {
  if (card.type !== "unit") {
    return "";
  }
  const currentHealth = options.currentHealth ?? getCardHealth(card);
  const maxHealth = options.maxHealth ?? getCardHealth(card);
  const damagedClass = currentHealth < maxHealth ? " is-damaged" : "";
  const className = options.className ? ` ${options.className}` : "";
  const attack = getCardBaseAttack(card);
  const value = getCardTargetValue(card);
  return `
    <div class="card-thumb-hud${className}" aria-label="星级 ${value}，攻击 ${attack}，生命 ${currentHealth}">
      <div class="card-thumb-hud__rating" aria-hidden="true"><b>${value}</b></div>
      <div class="card-thumb-hud__combat" aria-hidden="true">
        <span class="card-thumb-hud__stat card-thumb-hud__stat--attack">
          <i class="card-thumb-hud__icon card-thumb-hud__icon--attack">&#8982;</i>
          <b>${attack}</b>
        </span>
        <span class="card-thumb-hud__stat card-thumb-hud__stat--health${damagedClass}">
          <i class="card-thumb-hud__icon card-thumb-hud__icon--health">&#9829;</i>
          <b>${currentHealth}</b>
        </span>
      </div>
    </div>
  `;
}

function renderUnitValueBadge(card, className = "war-card__value-badge") {
  if (card.type !== "unit") {
    return "";
  }
  const value = getCardTargetValue(card);
  return `
    <div class="${className}" aria-label="目标价值 ${value} 星">
      <span aria-hidden="true">★</span>
      <b>${value}</b>
    </div>
  `;
}

function renderUnitHealthBadge(card, className = "war-card__health-badge", currentHealth = getCardHealth(card), maxHealth = getCardHealth(card)) {
  if (card.type !== "unit") {
    return "";
  }
  const damagedClass = currentHealth < maxHealth ? " is-damaged" : "";
  const healthLabel = currentHealth === maxHealth
    ? `生命 ${currentHealth}`
    : `生命 ${currentHealth}/${maxHealth}`;
  return `
    <div class="${className}${damagedClass}" aria-label="${escapeHtml(healthLabel)}">
      <span>命</span>
      <b>${currentHealth}</b>
    </div>
  `;
}

function renderUnitValueStars(card) {
  const value = Math.max(0, Math.min(5, Math.round(getCardTargetValue(card))));
  return Array.from({ length: 5 }, (_, index) => `<i class="${index < value ? "is-lit" : ""}" aria-hidden="true">★</i>`).join("");
}

function renderCardStats(card) {
  if (card.type !== "unit") {
    return "";
  }
  return `
    <div class="war-card__stats" aria-label="战力、生命和目标价值">
      <span><b>战</b>${getCardBaseAttack(card)}</span>
      <span><b>命</b>${getCardHealth(card)}</span>
      <span class="is-value-star"><b>★</b>${getCardTargetValue(card)}</span>
    </div>
  `;
}

function getCardDisplayTags(card) {
  if (Array.isArray(card.displayTags) && card.displayTags.length) {
    return uniqueDisplayTags(card.displayTags).slice(0, 2);
  }
  const tags = Array.isArray(card.tags) ? card.tags : [];
  if (card.type === "unit") {
    return uniqueDisplayTags([getDeployChipLabel(card), getUnitDisplayTypeTag(card)]).slice(0, 2);
  }
  return uniqueDisplayTags([
    ...tags.slice(0, 2),
    TYPE_LABELS[card.type],
    card.line === "instant" ? "即时" : getDeployChipLabel(card),
  ]).slice(0, 2);
}

function getVisibleCardForInstance(instance, side = "player") {
  if (!instance?.masked) {
    return getCard(instance.cardId);
  }
  const factionId = state.battle?.factions?.[side] || "usa";
  return {
    id: `${factionId}_masked_contact`,
    faction: factionId,
    name: "隐蔽单位",
    type: "unit",
    line: "frontline",
    power: 0,
    rarity: "common",
    specialization: "情报未知",
    tags: ["隐蔽"],
    effect: "敌方隐蔽单位，详细信息由服务器保密，暴露后显示。",
  };
}

function getUnitDisplayTypeTag(card) {
  const tags = Array.isArray(card.tags) ? card.tags : [];
  return UNIT_DISPLAY_PLATFORM_TAGS.find((tag) => tags.includes(tag))
    || MISSILE_DISPLAY_TYPE_TAGS.find((tag) => tags.includes(tag))
    || tags[0]
    || TYPE_LABELS[card.type]
    || "单位";
}

function getCardBaseAttack(card) {
  if (card.type !== "unit") {
    return 0;
  }
  if (Number.isFinite(card.attack)) {
    return card.attack;
  }
  if (Number.isFinite(card.baseAttack)) {
    return card.baseAttack;
  }
  if (Number.isFinite(card.ability?.amount)) {
    return card.ability.amount;
  }
  return 0;
}

function getCardHealth(card) {
  if (card.type !== "unit") {
    return 0;
  }
  if (Number.isFinite(card.health)) {
    return card.health;
  }
  return card.power || 0;
}

function getCardTargetValue(card) {
  if (card.type !== "unit") {
    return 0;
  }
  if (Number.isFinite(card.targetValue)) {
    return card.targetValue;
  }
  if (Number.isFinite(card.value)) {
    return card.value;
  }
  return getCardHealth(card);
}

function getCardUnitAttribute(card) {
  if (card.type !== "unit") {
    return TYPE_LABELS[card.type] || "战术";
  }
  if (card.unitAttribute) {
    return card.unitAttribute;
  }
  const tags = Array.isArray(card.tags) ? card.tags : [];
  if (tags.includes("SEAD")) return "SEAD战斗机";
  if (tags.includes("弹道导弹")) return "弹道导弹";
  if (tags.includes("巡航导弹")) return "巡航导弹";
  if (tags.includes("重型防空")) return "重型防空";
  if (tags.includes("伴随防空")) return "伴随防空";
  if (tags.includes("轰炸机")) return "轰炸机";
  if (tags.includes("战斗机")) return "战斗机";
  if (tags.includes("直升机")) return "直升机";
  if (tags.includes("无人机")) return "无人机";
  if (tags.includes("火箭炮")) return "火箭炮";
  if (tags.includes("榴弹炮")) return "榴弹炮";
  if (tags.includes("装甲")) return "装甲";
  if (tags.includes("侦查")) return "侦查步兵";
  if (tags.includes("步兵")) return "步兵";
  return getUnitDisplayTypeTag(card);
}

function getCardAttributeNote(card) {
  return card.ruleNote || UNIT_ATTRIBUTE_NOTES[getCardUnitAttribute(card)] || "按单位属性判定可打击目标，技能只负责伤害修正和特殊效果。";
}

function uniqueDisplayTags(items) {
  const result = [];
  items.forEach((item) => {
    if (item && !result.includes(item)) {
      result.push(item);
    }
  });
  return result;
}

function renderEffectParagraphs(effect, card) {
  return splitEffectText(effect)
    .map((part) => renderEffectPanel(part, card))
    .join("");
}

function renderEffectPanel(part, card) {
  const match = part.match(/^【([^】]+)】：(.+)$/);
  const title = match ? match[1] : "";
  const body = match ? match[2] : part;
  const glyph = getSkillGlyph(title || body, card);
  const iconPath = getSkillIconPath(title || body, card);
  const iconStyle = iconPath ? ` style="--skill-icon:url('${iconPath}')"` : "";
  return `
    <p class="war-card__skill">
      <span class="war-card__skill-icon" data-glyph="${escapeHtml(glyph)}"${iconStyle} aria-hidden="true"></span>
      <span class="war-card__skill-copy">${title ? `<strong>【${escapeHtml(title)}】：</strong>` : ""}${escapeHtml(body)}</span>
    </p>
  `;
}

function splitEffectText(effect) {
  const text = String(effect || "").trim();
  if (!text) {
    return [];
  }
  const skillStarts = Array.from(text.matchAll(/【[^】]+】：/g), (match) => match.index).filter((index) => Number.isFinite(index));
  if (skillStarts.length <= 1) {
    return [text];
  }
  return skillStarts
    .map((start, index) => text.slice(start, skillStarts[index + 1] ?? text.length).trim())
    .filter(Boolean);
}

function compactCardEffect(effect, maxLength = 80) {
  const text = String(effect || "")
    .replace(/【([^】]+)】：/g, "$1：")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 1))}…` : text;
}

function getDeployChipLabel(card) {
  if (card.line === "instant") {
    return "即时";
  }
  return getDeployLines(card).map((lineId) => getLine(lineId).label).join("/");
}

function renderDeckPanel(battle, side) {
  const deckCount = battle.decks[side].length;
  const graveCount = battle.graves[side].length;
  return `
    <section class="deck-hud deck-hud--${side}" aria-label="${side === "player" ? "我方" : "敌方"}牌库与弃牌">
      ${renderPile("deck", "牌库", deckCount)}
      ${renderPile("grave", "弃牌", graveCount)}
    </section>
  `;
}

function renderPile(kind, label, count) {
  const layers = Math.max(1, Math.min(4, Math.ceil(count / 8)));
  return `
    <div class="deck-pile deck-pile--${kind}" data-pile="${kind}" style="--pile-count:${layers}">
      <span class="deck-pile__cards" aria-hidden="true">
        ${Array.from({ length: layers }, (_, index) => `<i style="--i:${index}"></i>`).join("")}
      </span>
      <span>${label}</span>
      <strong>${count}</strong>
    </div>
  `;
}

function renderLog() {
  const battle = state.battle;
  const items = battle?.log.slice().reverse() || [
    "正确来源：/Users/michaelwu/Documents/战区卡牌游戏项目/战争卡牌游戏。",
    "本原型使用 V0.5 / 20260521 三线卡牌机制与美俄首发 30 张预组。",
  ];
  if (refs.logPanel) {
    refs.logPanel.hidden = state.screen !== "battle";
  }
  refs.logPanel?.classList.toggle("is-collapsed", state.logCollapsed);
  refs.logToggle?.setAttribute("aria-expanded", String(!state.logCollapsed));
  if (refs.logToggle) {
    refs.logToggle.innerHTML = "<span>战场日志</span><small>全部</small>";
  }
  refs.log.innerHTML = items.map((item) => `<div>${escapeHtml(item)}</div>`).join("");
}

function renderInspector() {
  const battle = state.battle;
  const selected = battle?.hands.player.find((item) => item.uid === state.selectedHandUid);
  const cardId = selected?.cardId || state.hoveredCardId;
  const card = cardId ? getCard(cardId) : getCard("us_reaper");
  refs.inspector.innerHTML = `
    <div class="inspector-card" style="--accent:${getFaction(card.faction).accent}">
      <span>${escapeHtml(TYPE_LABELS[card.type])} / ${escapeHtml(RARITY_LABELS[card.rarity])}</span>
      <strong>${escapeHtml(card.name)}</strong>
      ${card.type === "unit" ? `
        <div class="inspector-card__stats">
          <i>战 ${getCardBaseAttack(card)}</i>
          <i>命 ${getCardHealth(card)}</i>
          <i class="is-value-star">★ ${getCardTargetValue(card)}</i>
        </div>
        <small>${escapeHtml(getCardAttributeNote(card).replace(/\n+/g, " "))}</small>
      ` : ""}
      <p>${escapeHtml(card.effect)}</p>
      <div>
        ${getCardDisplayTags(card).map((tag) => `<i>${escapeHtml(tag)}</i>`).join("")}
      </div>
    </div>
  `;
}

function renderSpotlight() {
  const canShowInBattle = state.screen === "battle" && !state.deckBuilderOpen && !state.codexOpen && !state.guideOpen;
  const canShowInCodex = state.codexOpen && !state.guideOpen && !state.deckBuilderOpen;
  const canShowInDeckBuilder = state.deckBuilderOpen && !state.codexOpen && !state.guideOpen;
  if (!state.hoveredCardId || state.draggingUid || (!canShowInBattle && !canShowInCodex && !canShowInDeckBuilder)) {
    clearSpotlight();
    return;
  }
  const hoveredSource = getHoveredSpotlightSource(state.hoveredCardId);
  if (!hoveredSource) {
    clearSpotlight();
    return;
  }
  const card = getCard(state.hoveredCardId);
  const showRuleAside = canShowInBattle && shouldShowBattleRuleAside(card, hoveredSource);
  refs.spotlight.hidden = false;
  refs.spotlight.classList.toggle("is-overlay-preview", canShowInDeckBuilder);
  refs.spotlight.classList.toggle("has-rule-aside", showRuleAside);
  refs.spotlight.innerHTML = `
    <div class="card-spotlight__stage">
      ${renderPreviewCard(card)}
      ${showRuleAside ? renderCardRuleAside(card) : ""}
    </div>
  `;
  if (canShowInDeckBuilder) {
    positionDeckBuilderSpotlight();
  } else {
    clearSpotlightLayout();
  }
}

function shouldShowBattleRuleAside(card, hoveredSource) {
  const boardCard = hoveredSource?.closest("[data-board-card]");
  const handCard = hoveredSource?.closest("[data-hand-card]");
  if (handCard) {
    return true;
  }
  if (!boardCard) {
    return false;
  }
  return !(boardCard.dataset.side === "enemy" && boardCard.classList.contains("is-concealed-card"));
}

function renderCardRuleAside(card) {
  const ruleNote = String(card.ruleNote || card.effect || "").trim();
  const bullets = getCardRuleBullets(card);
  return `
    <aside class="card-rule-aside" aria-label="侧边注释">
      <span>侧边注释</span>
      <strong>${escapeHtml(card.name)}</strong>
      ${card.type === "unit" ? `
        <div class="card-rule-aside__stats">
          <i><b>攻</b>${getCardBaseAttack(card)}</i>
          <i><b>命</b>${getCardHealth(card)}</i>
          <i class="is-value-star"><b>值</b>${getCardTargetValue(card)}</i>
        </div>
      ` : `<div class="card-rule-aside__stats card-rule-aside__stats--tactic"><i><b>类型</b>${escapeHtml(TYPE_LABELS[card.type] || "战术")}</i></div>`}
      <p>${escapeHtml(ruleNote).replace(/\n/g, "<br>")}</p>
      ${bullets.length ? `<ul>${bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
    </aside>
  `;
}

function getCardRuleBullets(card) {
  if (card.type !== "unit") {
    return ["战术牌按卡面效果立即结算，结算后进入弃牌堆。"];
  }
  const attribute = getCardUnitAttribute(card);
  const bullets = [];
  if (card.line === "support") {
    bullets.push("敌方前线有单位时，未暴露支援区单位不能被前线单位直接指定。");
  }
  if (card.ability?.sourceExposes || card.fire?.sourceExposes) {
    bullets.push("主动发动技能后会暴露。");
  }
  if (["巡航导弹", "弹道导弹"].includes(attribute)) {
    bullets.push(attribute === "弹道导弹" ? "只能被重型防空拦截。" : "可被伴随防空或重型防空拦截。");
  }
  if (attribute === "重型防空") {
    bullets.push("可保护前线和支援区，拦截战斗机和导弹，不拦截轰炸机。");
  }
  if (attribute === "SEAD战斗机") {
    bullets.push("V0.5.2 中按普通战斗机处理，不再指定隐蔽防空。");
  }
  if (getCardBaseAttack(card) === 0) {
    bullets.push("本单位的行动价值来自暴露、校射或引导，而不是直接伤害。");
  }
  return bullets.slice(0, 3);
}

function shouldConcealEnemyInfo(target) {
  return Boolean(target?.side === "enemy" && target.instance?.hidden);
}

function renderIntentTargetButton(target) {
  const concealed = shouldConcealEnemyInfo(target);
  const targetCard = getVisibleCardForInstance(target.instance, target.side);
  const side = target.side === "player" ? "我方" : "敌方";
  const lineLabel = getLine(target.lineId).name;
  const power = getCurrentPower(target.instance);
  const artPath = concealed ? CARD_BACK_ART_PATH : getCardThumbnailArtPath(targetCard);
  const targetLabel = concealed ? `${side}${lineLabel}隐蔽单位` : `${side}${lineLabel}${targetCard.name}`;
  const cardClass = concealed ? "intent-target__card intent-target__card--back" : "intent-target__card";

  return `
    <button
      class="intent-target ${concealed ? "intent-target--concealed" : ""}"
      type="button"
      data-action="choose-target:${target.side}:${target.uid}"
      data-board-card="${target.uid}"
      data-side="${target.side}"
      aria-label="${escapeHtml(targetLabel)}"
      title="${escapeHtml(concealed ? "" : targetLabel)}"
    >
      <span
        class="${cardClass}"
        style="--mini-art:${artPath ? `url('${artPath}')` : "none"};--accent:${getFaction(targetCard.faction).accent}"
        aria-hidden="true"
      >
        ${concealed ? "" : `<i>${power}</i><b>${escapeHtml(targetCard.name)}</b>`}
      </span>
      ${concealed ? "" : `<strong>${escapeHtml(targetCard.name)}</strong>`}
      <span class="intent-target__line">${escapeHtml(side)} / ${escapeHtml(lineLabel)}</span>
    </button>
  `;
}

function renderIntent() {
  if (!state.pending) {
    refs.intent.hidden = true;
    refs.intent.innerHTML = "";
    refs.intent.classList.remove("intent-overlay--supply");
    return;
  }

  if (state.pending.kind === "supplyChoice") {
    renderSupplyChoice();
    return;
  }

  refs.intent.classList.remove("intent-overlay--supply");
  const card = getCard(state.pending.cardId);
  const targetButtons = state.pending.targets.map((target) => renderIntentTargetButton(target)).join("");
  const isInterceptChoice = state.pending.kind === "interceptChoice";
  const isCallFireChoice = state.pending.kind === "callFireChoice";
  const intentLabel = isInterceptChoice ? "选择拦截单位" : isCallFireChoice ? "选择校射单位" : "选择目标";
  const isForcedChoice = isInterceptChoice || isCallFireChoice;
  refs.intent.hidden = false;
  refs.intent.innerHTML = `
    <div>
      <span>${intentLabel} · ${state.pending.targets.length}</span>
      <strong>${escapeHtml(card.name)}</strong>
      <p>${escapeHtml(getIntentCopy(card, state.pending))}</p>
      <div class="intent-targets">${targetButtons}</div>
    </div>
    ${isForcedChoice ? "" : `<button type="button" data-action="cancel">取消</button>`}
  `;
}

function renderSupplyChoice() {
  const pending = state.pending;
  const sourceCard = getCard(pending.cardId);
  const choiceCards = pending.drawn
    .map((instance) => {
      const card = getCard(instance.cardId);
      return `
        <button class="supply-choice-card" type="button" data-action="keep-supply:${instance.uid}">
          ${renderPreviewCard(card)}
        </button>
      `;
    })
    .join("");
  refs.intent.hidden = false;
  refs.intent.classList.add("intent-overlay--supply");
  refs.intent.innerHTML = `
    <div>
      <div class="supply-choice-heading">
        <span>补给调度 · 保留 ${pending.keepAmount}/${pending.drawn.length}</span>
        <strong>${escapeHtml(sourceCard.name)}</strong>
        <p>选择一张加入手牌，其余放回牌库底。</p>
      </div>
      <div class="supply-choice-grid">${choiceCards}</div>
    </div>
  `;
}

function renderCodex() {
  refs.codex.hidden = !state.codexOpen;
  if (!state.codexOpen) {
    refs.codex.innerHTML = "";
    return;
  }

  const faction = getFaction(state.codexFaction);
  const entries = getCodexDeckEntries(state.codexFaction);
  const totalCards = entries.reduce((total, entry) => total + entry.count, 0);

  refs.codex.innerHTML = `
    ${renderDetailCommanderCard()}
    <div class="codex-panel" style="--accent:${faction.accent}">
      <header class="codex-panel__header">
        <div>
          <span>牌组预览</span>
          <strong>${escapeHtml(faction.name)}</strong>
          <p>${totalCards} 张 · ${entries.length} 类</p>
        </div>
        <nav class="codex-tabs" aria-label="阵营筛选">
          ${Object.values(FACTIONS)
            .map(
              (item) => `
                <button
                  type="button"
                  class="${item.id === state.codexFaction ? "is-active" : ""}"
                  data-action="codex:${item.id}"
                  style="--accent:${item.accent}"
                >${escapeHtml(item.shortName)}</button>
              `,
            )
            .join("")}
        </nav>
        <button class="codex-close" type="button" data-action="close-codex" aria-label="关闭牌组预览">×</button>
      </header>
      <div class="codex-grid">
        ${entries.map((entry) => renderCodexCard(entry.card, entry.count, entry.order)).join("")}
      </div>
    </div>
  `;
}

function getCodexDeckEntries(factionId) {
  const deckIds = getCodexDeckIds(factionId);
  const counts = deckIds.reduce((map, cardId) => {
    const card = CARD_LIBRARY[cardId];
    if (card && card.faction === factionId) {
      map[cardId] = (map[cardId] || 0) + 1;
    }
    return map;
  }, {});
  const orderedIds = CARD_DISPLAY_ORDER[factionId] || [];
  const ids = [
    ...orderedIds.filter((cardId) => counts[cardId]),
    ...Object.keys(counts).filter((cardId) => !orderedIds.includes(cardId)).sort((left, right) => sortDeckCards(CARD_LIBRARY[left], CARD_LIBRARY[right])),
  ];
  return ids
    .map((cardId, index) => ({
      card: CARD_LIBRARY[cardId],
      count: counts[cardId],
      order: CARD_LIBRARY[cardId]?.docOrder || index + 1,
    }))
    .filter((entry) => entry.card);
}

function getCodexDeckIds(factionId) {
  if (factionId === state.playerFaction && Array.isArray(state.playerDeck) && state.playerDeck.length) {
    return state.playerDeck.slice();
  }
  return getStarterDeckForFaction(factionId);
}

function renderCodexCard(card, count = 1, order = card.docOrder || 0) {
  const artPath = getCardListThumbnailArtPath(card);
  const lineLabel = card.line === "instant" ? "即时/无部署线" : getLine(card.line)?.name || card.line;
  const typeLabel = card.type === "unit" ? "驻场单位" : card.type === "tactic" ? "功能战术" : TYPE_LABELS[card.type];
  const tags = getCardDisplayTags(card).map((tag) => `<i>${escapeHtml(tag)}</i>`).join("");
  const ruleNote = String(card.ruleNote || "").trim();
  const effect = String(card.effect || "").trim();
  return `
    <article class="codex-card codex-card--${card.type}" data-card-id="${card.id}" style="--accent:${getFaction(card.faction).accent};--card-art:url('${artPath}')">
      <div class="codex-card__art" aria-hidden="true">
        <span>${String(order).padStart(2, "0")}</span>
      </div>
      <div class="codex-card__body">
        <header class="codex-card__head">
          <div>
            <strong>${escapeHtml(card.name)}</strong>
            <em>${escapeHtml(typeLabel)} · ${escapeHtml(lineLabel)}</em>
          </div>
          <b aria-label="牌组数量">x${count}</b>
        </header>
        <div class="codex-card__meta">
          ${renderCodexCardStats(card)}
          <span>${escapeHtml(card.id)}</span>
        </div>
        <div class="codex-card__tags">${tags}</div>
        <section class="codex-card__text">
          <strong>侧边注释</strong>
          <p>${escapeHtml(ruleNote).replace(/\n/g, "<br>")}</p>
        </section>
        <section class="codex-card__text">
          <strong>技能/效果</strong>
          <p>${escapeHtml(effect).replace(/\n/g, "<br>")}</p>
        </section>
      </div>
    </article>
  `;
}

function renderCodexCardStats(card) {
  if (card.type !== "unit") {
    return "<span>一次性</span>";
  }
  return `
    <span>战 ${getCardBaseAttack(card)}</span>
    <span>命 ${getCardHealth(card)}</span>
    <span>价值 ${getCardTargetValue(card)}星</span>
  `;
}

function renderGuide() {
  if (!refs.guide) {
    return;
  }
  refs.guide.hidden = !state.guideOpen;
  if (!state.guideOpen) {
    refs.guide.innerHTML = "";
    return;
  }

  const steps = [
    {
      index: "01",
      title: "胜利目标",
      body: "摧毁敌方单位即可按其目标价值得分，率先达到 50 分获胜。牌库耗尽不会直接结束，玩家仍可继续行动。",
    },
    {
      index: "02",
      title: "双层战场",
      body: "前线负责步兵、装甲、直升机接敌；支援区负责榴弹炮、火箭炮、导弹、防空、无人机和航空兵。敌方前线仍有单位时，前线单位不能越过前线直接攻击支援区。",
    },
    {
      index: "03",
      title: "隐蔽与暴露",
      body: "单位可以正面或隐蔽部署。每回合除了打出一张手牌，还能选择一个场上单位行动：隐蔽单位主动翻开，或已暴露单位再次发动技能。",
    },
    {
      index: "04",
      title: "火力链",
      body: "侦察单位先翻开目标，远火、导弹、战斗机和轰炸机作为驻场单位兑现伤害；巡航/弹道导弹可打击地面和低空目标，巡航可被伴随/重型防空拦截，弹道只能被重型防空拦截；轰炸机不被重型防空拦截。",
    },
    {
      index: "05",
      title: "首局建议",
      body: "先部署前线地面单位稳住战线，再隐藏支援火力；不要急着暴露高价值单位，等侦察链准备好再集中打击。",
    },
  ];

  refs.guide.innerHTML = `
    ${renderDetailCommanderCard()}
    <div class="guide-panel">
      <header class="guide-panel__header">
        <div>
          <span>FIELD MANUAL</span>
          <strong>新玩家作战简报</strong>
        </div>
        <button class="codex-close" type="button" data-action="close-guide" aria-label="关闭玩法介绍">×</button>
      </header>
      <div class="guide-grid">
        ${steps
          .map(
            (step) => `
              <section class="guide-step">
                <small>${escapeHtml(step.index)}</small>
                <strong>${escapeHtml(step.title)}</strong>
                <p>${escapeHtml(step.body)}</p>
              </section>
            `,
          )
          .join("")}
      </div>
      <footer class="guide-panel__footer">
        <button class="small-button" type="button" data-action="open-deck-builder">调整卡组</button>
        <button class="primary-button" type="button" data-action="start">开始作战</button>
      </footer>
    </div>
  `;
}

function renderDeckStatus() {
  if (!refs.deckStatus) {
    return;
  }
  if (state.screen !== "briefing") {
    refs.deckStatus.innerHTML = "";
    return;
  }

  const validation = validateDeck(state.playerDeck, state.playerFaction);
  const faction = getFaction(state.playerFaction);
  refs.deckStatus.innerHTML = `
    <div class="deck-status__panel ${validation.valid ? "is-valid" : "is-invalid"}" style="--accent:${faction.accent}">
      <div>
        <span>当前卡组</span>
        <strong>${escapeHtml(faction.shortName)}编成 · ${validation.stats.total}/${DECK_RULES.size}</strong>
      </div>
      <div class="deck-status__chips">
        ${renderDeckMetric("单位", `${validation.stats.units}/${DECK_RULES.unitMin}-${DECK_RULES.unitMax}`, validation.stats.units >= DECK_RULES.unitMin && validation.stats.units <= DECK_RULES.unitMax)}
        ${renderDeckMetric("战术", `${validation.stats.tactics}/${DECK_RULES.tacticMin}`, validation.stats.tactics >= DECK_RULES.tacticMin && validation.stats.tactics <= DECK_RULES.tacticMax)}
        ${renderDeckMetric("前线", `${validation.stats.frontline}/${DECK_RULES.frontlineMin}+`, validation.stats.frontline >= DECK_RULES.frontlineMin)}
        ${renderDeckMetric("支援", `${validation.stats.support}/${DECK_RULES.supportMin}+`, validation.stats.support >= DECK_RULES.supportMin)}
        ${renderDeckMetric("侦察", `${validation.stats.recon}/${DECK_RULES.reconMin}+`, validation.stats.recon >= DECK_RULES.reconMin)}
        ${renderDeckMetric("防空", `${validation.stats.airDefense}/${DECK_RULES.airDefenseMin}+`, validation.stats.airDefense >= DECK_RULES.airDefenseMin)}
      </div>
      <button class="small-button" type="button" data-action="open-deck-builder">${validation.valid ? "编辑卡组" : "修正卡组"}</button>
    </div>
  `;
}

function renderDeckMetric(label, value, valid) {
  return `<i class="${valid ? "is-valid" : "is-invalid"}"><span>${escapeHtml(label)}</span>${escapeHtml(value)}</i>`;
}

function renderDetailCommanderCard() {
  return `
    <div class="detail-command-card" aria-label="指挥官状态">
      <img src="./assets/ui/commander-usa.jpg" alt="" decoding="async" />
      <div>
        <strong>北境孤牙</strong>
        <span>上校</span>
        <em>军衔</em>
        <i>在线</i>
      </div>
    </div>
  `;
}

function renderOnlinePanel() {
  if (!refs.onlinePanel) {
    return;
  }
  if (state.screen !== "briefing") {
    refs.onlinePanel.innerHTML = "";
    return;
  }

  const online = state.online;
  const inRoom = Boolean(online.roomCode);
  const connected = online.status === "connected" || inRoom;
  const playerSlot = online.players.find((player) => player.side === "player");
  const enemySlot = online.players.find((player) => player.side === "enemy");
  const createDisabled = online.status === "connecting" || inRoom;
  const joinDisabled = online.status === "connecting" || inRoom;
  const readyDisabled = !inRoom || online.players.length < 2 || online.matchReady;
  const canStartBattle = inRoom && online.matchReady && Boolean(online.match);
  const matchSeed = online.match?.seed || "";
  const readyLabel = online.matchReady ? "已准备" : online.ready ? "取消准备" : "准备";
  const statusText = getOnlineStatusText();

  refs.onlinePanel.classList.toggle("is-in-room", inRoom);
  refs.onlinePanel.classList.toggle("is-match-ready", online.matchReady);

  refs.onlinePanel.innerHTML = `
    <div class="online-panel__header">
      <div>
        <span>ONLINE 1V1 / SERVER AUTHORITY</span>
        <strong>邀请朋友进入同一战区房间</strong>
        <p>双方准备后进入服务器权威战斗；发牌、调度、部署、目标与回合移交由服务器统一裁决。</p>
      </div>
      <i class="online-status online-status--${escapeHtml(online.status)}">${escapeHtml(statusText)}</i>
    </div>
    <div class="online-panel__body">
      <section class="online-card online-card--controls">
        <label>
          <span>你的代号</span>
          <input id="online-player-name" type="text" value="${escapeHtml(online.name)}" maxlength="32" autocomplete="nickname" placeholder="Michael" />
        </label>
        <div class="online-actions">
          <button class="primary-button" type="button" data-action="online-create-room" ${createDisabled ? "disabled" : ""}>创建房间</button>
          <label>
            <span>房间码</span>
            <input id="online-room-code" type="text" value="${escapeHtml(online.joinCode)}" maxlength="8" autocomplete="off" placeholder="ABC123" ${inRoom ? "disabled" : ""} />
          </label>
          <button class="small-button" type="button" data-action="online-join-room" ${joinDisabled ? "disabled" : ""}>加入房间</button>
        </div>
      </section>
      <section class="online-card online-card--room ${inRoom ? "is-active" : ""}">
        <div class="online-room-code">
          <span>当前房间</span>
          <strong>${inRoom ? escapeHtml(online.roomCode) : "未创建"}</strong>
          <button class="small-button" type="button" data-action="online-copy-code" ${inRoom ? "" : "disabled"}>复制邀请链接</button>
        </div>
        <div class="online-slots">
          ${renderOnlineSlot("player", playerSlot)}
          ${renderOnlineSlot("enemy", enemySlot)}
        </div>
        <div class="online-room-actions">
          <button class="primary-button" type="button" data-action="online-toggle-ready" ${readyDisabled ? "disabled" : ""}>
            ${readyLabel}
          </button>
          <button class="primary-button online-start-button" type="button" data-action="online-start-battle" ${canStartBattle ? "" : "disabled"}>
            进入战场
          </button>
          <button class="small-button" type="button" data-action="online-leave-room" ${connected ? "" : "disabled"}>离开/断开</button>
        </div>
      </section>
    </div>
    ${
      online.matchReady
        ? `<div class="online-match-start">
            <strong>对局已锁定${matchSeed ? ` · Seed ${escapeHtml(matchSeed)}` : ""}</strong>
            <span>点击“进入战场”接入服务器快照；当前版本先覆盖核心回合与主要技能裁决。</span>
          </div>`
        : ""
    }
    ${online.error ? `<div class="online-callout is-error">${escapeHtml(online.error)} <button type="button" data-action="online-clear-error">关闭</button></div>` : ""}
    ${online.lastEvent ? `<div class="online-callout">${escapeHtml(online.lastEvent)}</div>` : ""}
  `;
}

function renderOnlineSlot(side, player) {
  const label = side === "player" ? "房主" : "挑战者";
  const occupied = Boolean(player);
  const self = occupied && player.id === state.online.clientId;
  const loadout = player?.loadout;
  const faction = loadout?.faction ? getFaction(loadout.faction)?.shortName : "";
  const deckSize = Number.isFinite(loadout?.deckSize) ? `${loadout.deckSize} 张` : "";
  const loadoutText = [faction, deckSize].filter(Boolean).join(" · ");
  const readyText = occupied ? `${self ? "你 · " : ""}${player.ready ? "已准备" : "未准备"}` : "空位";
  return `
    <div class="online-slot ${occupied ? "is-occupied" : ""} ${player?.ready ? "is-ready" : ""}">
      <span>${escapeHtml(label)}</span>
      <strong>${occupied ? escapeHtml(player.name) : "等待加入"}</strong>
      <i>${escapeHtml(occupied && loadoutText ? `${readyText} · ${loadoutText}` : readyText)}</i>
    </div>
  `;
}

function renderDeckBuilder() {
  if (!refs.deckBuilder) {
    return;
  }
  refs.deckBuilder.hidden = !state.deckBuilderOpen;
  if (!state.deckBuilderOpen) {
    refs.deckBuilder.innerHTML = "";
    return;
  }

  const faction = getFaction(state.playerFaction);
  const validation = validateDeck(state.playerDeck, state.playerFaction);
  const cards = getFactionCards(state.playerFaction);
  const issueList = validation.errors.length
    ? validation.errors.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : "<li>卡组满足当前组卡限制，可以直接进入战场。</li>";

  refs.deckBuilder.innerHTML = `
    ${renderDetailCommanderCard()}
    <div class="deck-builder-panel" style="--accent:${faction.accent}">
      <header class="deck-builder-panel__header">
        <div>
          <span>ARMORY / DECK BUILDING</span>
          <strong>自由组卡</strong>
        </div>
        <nav class="codex-tabs" aria-label="玩家阵营">
          ${Object.values(FACTIONS)
            .map(
              (item) => `
                <button
                  type="button"
                  class="${item.id === state.playerFaction ? "is-active" : ""}"
                  data-action="deck-faction:${item.id}"
                  style="--accent:${item.accent}"
                >${escapeHtml(item.shortName)}</button>
              `,
            )
            .join("")}
        </nav>
        <button class="codex-close" type="button" data-action="close-deck-builder" aria-label="关闭自由组卡">×</button>
      </header>
      <div class="deck-builder-layout">
        <aside class="deck-builder-summary">
          <section class="deck-builder-count ${validation.valid ? "is-valid" : "is-invalid"}">
            <span>当前编成</span>
            <strong>${validation.stats.total}/${DECK_RULES.size}</strong>
            <p>${escapeHtml(faction.doctrine)}</p>
          </section>
          <section class="deck-builder-rules">
            <strong>组卡限制</strong>
            <ul>
              <li>总数必须为 ${DECK_RULES.size} 张。</li>
              <li>驻场单位 ${DECK_RULES.unitMin} 张，功能战术 ${DECK_RULES.tacticMin} 张；导弹、战斗机、轰炸机都算驻场单位。</li>
              <li>前线可部署单位至少 ${DECK_RULES.frontlineMin} 张，支援可部署单位至少 ${DECK_RULES.supportMin} 张。</li>
              <li>侦察/暴露链至少 ${DECK_RULES.reconMin} 张，防空拦截至少 ${DECK_RULES.airDefenseMin} 张。</li>
              <li>1星/2星最多 3 张，3星/4星最多 2 张，5星最多 1 张。</li>
            </ul>
          </section>
          <section class="deck-builder-issues">
            <strong>${validation.valid ? "校验通过" : "需要修正"}</strong>
            <ul>${issueList}</ul>
          </section>
          <div class="deck-builder-actions">
            <button class="small-button" type="button" data-action="deck-reset">恢复默认</button>
            <button class="small-button" type="button" data-action="deck-autofill">自动补齐</button>
            <button class="small-button" type="button" data-action="deck-clear">清空</button>
            <button class="primary-button" type="button" data-action="start" ${validation.valid ? "" : "disabled"}>使用此卡组作战</button>
          </div>
        </aside>
        <section class="deck-builder-pool" aria-label="可选卡牌">
          ${cards.map((card) => renderDeckBuilderCard(card, validation.counts[card.id] || 0)).join("")}
        </section>
      </div>
    </div>
  `;
}

function renderDeckBuilderCard(card, count) {
  const maxCopies = getCopyLimit(card);
  const canAdd = state.playerDeck.length < DECK_RULES.size && count < maxCopies;
  const line = card.line === "instant" ? "即时" : getDeployLines(card).map((lineId) => getLine(lineId).label).join("/");
  const tags = getCardDisplayTags(card).map((tag) => `<i>${escapeHtml(tag)}</i>`).join("");
  return `
    <article class="deck-card ${count ? "is-in-deck" : ""}" data-card-id="${card.id}" style="--accent:${getFaction(card.faction).accent}">
      <div class="deck-card__art" style="--card-art:url('${getCardListThumbnailArtPath(card)}')"></div>
      <div class="deck-card__body">
        <div class="deck-card__title">
          <strong>${escapeHtml(card.name)}</strong>
          <span>${card.type === "unit" ? `战${getCardBaseAttack(card)} 命${getCardHealth(card)}` : "T"}</span>
        </div>
        <p>${escapeHtml(TYPE_LABELS[card.type])} / ${escapeHtml(line)} / ${escapeHtml(RARITY_LABELS[card.rarity] || card.rarity)}</p>
        <div class="deck-card__tags">${tags}</div>
        <em>${escapeHtml(card.specialization)}</em>
      </div>
      <div class="deck-card__controls">
        <button type="button" data-action="deck-remove:${card.id}" ${count ? "" : "disabled"}>-</button>
        <strong>${count}/${maxCopies}</strong>
        <button type="button" data-action="deck-add:${card.id}" ${canAdd ? "" : "disabled"}>+</button>
      </div>
    </article>
  `;
}

function selectHandCard(uid, options = {}) {
  const battle = state.battle;
  if (!canPlayerAct() || state.pending) {
    return;
  }

  const instance = battle.hands.player.find((item) => item.uid === uid);
  if (!instance) {
    return;
  }

  const card = getCard(instance.cardId);
  if (!canUseHandAction(battle, "player", card)) {
    gameAudio.play("ui.error");
    battle.log.push(card.type === "unit"
      ? "本回合已经部署过一张单位牌。你仍可打出一张战术牌、执行一次场上单位行动，或点击【回合结束】。"
      : "本回合已经打出过一张战术牌。你仍可部署一张单位牌、执行一次场上单位行动，或点击【回合结束】。");
    render();
    return;
  }
  state.selectedHandUid = uid;
  state.pending = null;

  if (isOnlineAuthoritativeBattle()) {
    if (card.type === "unit") {
      sendOnlineBattleAction({
        kind: "play_unit",
        handUid: uid,
        lineId: card.line,
        hidden: Boolean(options.conceal),
      });
    } else {
      sendOnlineBattleAction({
        kind: "play_tactic",
        handUid: uid,
      });
    }
    state.selectedHandUid = null;
    render();
    return;
  }

  if (card.type === "unit") {
    playUnitFromHand(battle, "player", uid, card.line, { hidden: Boolean(options.conceal) });
    return;
  }

  if (card.type !== "unit") {
    if (canResolveHandEffectWithoutTargets(battle, "player", card)) {
      const result = resolveNoTargetHandEffect(battle, "player", uid, card);
      if (result === "pending") {
        render();
        return;
      }
      finishAction("player");
      return;
    }
    const targets = getValidEffectTargets(battle, "player", card.ability, card);
    if (!targets.length) {
      gameAudio.play("ui.error");
      battle.log.push(getNoLegalTargetMessage(card));
      state.selectedHandUid = null;
      render();
      return;
    }
    state.pending = {
      kind: "handEffect",
      side: "player",
      handUid: uid,
      cardId: card.id,
      ability: card.ability,
      targets,
    };
    gameAudio.play("target.lock", { card });
    if (targets.length === 1) {
      const [target] = targets;
      state.pending = null;
      state.selectedHandUid = null;
      const result = resolveEffectOnTarget(battle, {
        side: "player",
        handUid: uid,
        cardId: card.id,
        ability: card.ability,
        target,
      });
      if (result === "pending-animation" || result === "pending") {
        return;
      }
      finishAction("player");
      return;
    }
  }

  render();
}

function playSelectedUnitToRow(side, lineId) {
  const battle = state.battle;
  if (!battle || !state.selectedHandUid || !canPlayerAct()) {
    return;
  }
  if (side !== "player") {
    return;
  }

  const instance = battle.hands.player.find((item) => item.uid === state.selectedHandUid);
  if (!instance) {
    return;
  }
  const card = getCard(instance.cardId);
  if (card.type !== "unit" || !getDeployLines(card).includes(lineId)) {
    return;
  }

  if (isOnlineAuthoritativeBattle()) {
    sendOnlineBattleAction({
      kind: "play_unit",
      handUid: instance.uid,
      lineId,
      hidden: false,
    });
    state.selectedHandUid = null;
    render();
    return;
  }

  playUnitFromHand(battle, "player", instance.uid, lineId);
}

function playUnitFromHand(battle, side, uid, lineId, options = {}) {
  const hand = battle.hands[side];
  const index = hand.findIndex((item) => item.uid === uid);
  if (index === -1) {
    return;
  }

  const instance = hand[index];
  const card = getCard(instance.cardId);
  if (isLineAtCapacity(battle, side, lineId)) {
    battle.log.push(`${getLine(lineId)?.name || "战线"}已满，不能继续部署。`);
    gameAudio.play("ui.error");
    state.selectedHandUid = null;
    render();
    return;
  }

  const sourceRect = getHandCardElement(side, uid)?.getBoundingClientRect();
  hand.splice(index, 1);
  markHandActionUsed(battle, side, card);
  instance.hidden = Boolean(options.hidden && canConcealCardForSide(battle, side, card, lineId));
  instance.deployedAtAction = battle.actionSerial;
  instance.actedAction = null;
  battle.board[side][lineId].push(instance);
  battle.actionAnimation = {
    kind: "deployHold",
    side,
    sourceUid: instance.uid,
    cardId: card.id,
  };
  state.selectedHandUid = null;
  render();
  playCardFlight(card, side, sourceRect, getBoardCardElement(side, instance.uid)?.getBoundingClientRect(), {
    back: instance.hidden,
    duration: DEPLOY_CARD_FLIGHT_MS,
    intent: "deploy",
  });
  if (!instance.hidden) {
    gameAudio.playCard(card, { action: "deploy", side, hidden: false });
  }
  battle.log.push(getDeploymentLog(battle, side, instance, card, lineId));

  const deployDelay = DEPLOY_EFFECT_DELAY_MS;
  window.setTimeout(() => {
    if (state.battle !== battle || battle.phase !== "battle") {
      return;
    }
    const liveRef = findBoardInstance(battle, side, instance.uid);
    if (!liveRef) {
      battle.actionAnimation = null;
      render();
      return;
    }
    battle.actionAnimation = null;
    continueUnitDeployment(battle, side, liveRef, card);
  }, deployDelay);
}

function getDeploymentLog(battle, side, instance, card, lineId) {
  if (side === "enemy" && instance.hidden) {
    return `${getSideName(battle, side)}在${getLine(lineId).name}部署了一个隐蔽单位。`;
  }
  return `${getSideName(battle, side)}${instance.hidden ? "隐蔽部署" : "部署"} ${card.name} 到${getLine(lineId).name}。`;
}

function continueUnitDeployment(battle, side, sourceRef, card, options = {}) {
  const { instance, lineId } = sourceRef;
  if (!options.skipContact && startFrontlineEngagementSequence(battle, side, sourceRef, () => {
    const liveRef = findBoardInstance(battle, side, instance.uid);
    if (!liveRef) {
      finishActionWithResolutionHold(battle, side, { pacedFinish: true });
      return;
    }
    continueUnitDeployment(battle, side, liveRef, card, { ...options, skipContact: true });
  })) {
    return;
  }

  if (!options.skipContact && instance.hidden) {
    resolveHighAirEngagement(battle, side, sourceRef);
    if (instance.hidden) {
      refreshIntelValues(battle);
      finishAction(side);
      return;
    }
  }
  if (!findBoardInstance(battle, side, instance.uid)) {
    finishActionWithResolutionHold(battle, side, { pacedFinish: true });
    return;
  }

  applyDeploySelfBonuses(battle, side, instance, card);

  resolveDeployBoardEffect(battle, side, instance, card, { skipCardFireVideo: false, pacedFinish: true });
}

function shouldDeferCardDeployVideo(side, card, sourceRef) {
  return Boolean(
    sourceRef?.instance &&
      !sourceRef.instance.hidden &&
      getCardFireVideoPath(card),
  );
}

function beginCardDeployVideoTransition(battle, side, sourceRef, card) {
  battle.actionAnimation = {
    kind: "cardDeployVideo",
    side,
    sourceUid: sourceRef.instance.uid,
    cardId: card.id,
  };
  state.pending = null;
  state.selectedHandUid = null;
  clearSpotlight();
  render();

  playCardFireVideo(sourceRef, card).finally(() => {
    if (state.battle !== battle || battle.phase !== "battle") {
      return;
    }
    battle.actionAnimation = null;
    resolveDeployBoardEffect(battle, side, sourceRef.instance, card, { skipCardFireVideo: true, pacedFinish: true });
  });
  return "pending-animation";
}

function resolveDeployBoardEffect(battle, side, instance, card, options = {}) {
  if (!findBoardInstance(battle, side, instance.uid)) {
    finishAction(side);
    return;
  }

  if (instance.exposed) {
    finishActionWithResolutionHold(battle, side, options);
    return;
  }

  const sourceRef = findBoardInstance(battle, side, instance.uid);
  const targets = getValidEffectTargets(battle, side, card.ability, card, { sourceRef, asActingSource: true });
  if (card.ability && targets.length) {
    markUnitActed(battle, instance);
    if (side === "player") {
      if (targets.length === 1) {
        const result = resolveEffectOnTarget(battle, {
          side,
          sourceUid: instance.uid,
          cardId: card.id,
          ability: card.ability,
          target: targets[0],
        }, { skipCardFireVideo: Boolean(options.skipCardFireVideo) });
        if (result === "pending-animation" || result === "pending") {
          return;
        }
        finishActionWithResolutionHold(battle, side, options);
        return;
      }
      state.pending = {
        kind: "boardEffect",
        side,
        sourceUid: instance.uid,
        cardId: card.id,
        ability: card.ability,
        targets,
        skipCardFireVideo: Boolean(options.skipCardFireVideo),
      };
      render();
      return;
    }

    const result = resolveEffectOnTarget(battle, {
      side,
      sourceUid: instance.uid,
      cardId: card.id,
      ability: card.ability,
      target: side === "enemy" ? chooseAiTarget(battle, card, targets, battle.aiDifficulty || "medium") : chooseBestTarget(battle, targets),
    }, { skipCardFireVideo: Boolean(options.skipCardFireVideo) });
    if (result === "pending-animation" || result === "pending") {
      return;
    }
  } else if (card.ability && canResolveBoardAbilityWithoutTargets(card)) {
    markUnitActed(battle, instance);
    resolveNoTargetAbility(battle, side, instance, card);
  } else if (card.ability) {
    exposeSourceAfterActiveAttempt(battle, side, instance, card);
  }

  finishActionWithResolutionHold(battle, side, options);
}

function handleBoardTarget(side, uid) {
  const battle = state.battle;
  if (!battle) {
    return;
  }

  if (state.pending?.kind === "supplyChoice") {
    return;
  }

  if (isOnlineAuthoritativeBattle()) {
    if (state.pending) {
      if (!isPendingTarget(side, uid)) {
        return;
      }
      sendOnlineBattleAction({
        kind: "choose_target",
        targetSide: side,
        targetUid: uid,
      });
      return;
    }
    if (side === "player" && canPlayerAct()) {
      sendOnlineBattleAction({
        kind: "activate_unit",
        sourceUid: uid,
      });
    }
    return;
  }

  if (!state.pending) {
    if (side === "player" && canPlayerAct()) {
      activateOwnBoardUnit(battle, side, uid);
    }
    return;
  }

  if (!isPendingTarget(side, uid)) {
    return;
  }

  const pending = state.pending;
  const selectedTarget = pending.targets?.find((target) => target.side === side && target.uid === uid) || { side, uid };
  state.pending = null;
  state.selectedHandUid = null;
  gameAudio.play("target.lock");
  if (pending.kind === "callFireChoice") {
    const result = resolveCallFireChoice(battle, pending, selectedTarget);
    if (result === "pending-animation" || result === "pending") {
      return;
    }
    if (pending.originKind === "boardEffect") {
      finishActionWithResolutionHold(battle, pending.side, { pacedFinish: true });
      return;
    }
    finishAction(pending.side);
    return;
  }

  const result = resolveEffectOnTarget(battle, {
    side: pending.side,
    handUid: pending.handUid,
    sourceUid: pending.sourceUid,
    cardId: pending.cardId,
    ability: pending.ability,
    target: selectedTarget,
  }, {
    skipCardFireVideo: Boolean(pending.skipCardFireVideo),
    pacedFinish: pending.kind === "boardEffect",
  });
  if (result === "pending-animation" || result === "pending") {
    return;
  }
  if (pending.kind === "boardEffect") {
    finishActionWithResolutionHold(battle, pending.side, { pacedFinish: true });
    return;
  }
  finishAction(pending.side);
}

function activateOwnBoardUnit(battle, side, uid) {
  const source = findBoardInstance(battle, side, uid);
  if (!source || (!source.instance.hidden && !source.instance.exposed)) {
    return;
  }
  if (!canUseBoardAction(battle, side)) {
    battle.log.push("本回合已经执行过一次场上单位行动。");
    gameAudio.play("ui.error");
    render();
    return;
  }
  if (wasUnitDeployedThisTurn(battle, source.instance)) {
    battle.log.push(`${getCard(source.instance.cardId).name} 是本回合新部署单位，不能再次作为场上单位行动。`);
    gameAudio.play("ui.error");
    render();
    return;
  }
  if (hasUnitActedThisTurn(battle, source.instance)) {
    battle.log.push(`${getCard(source.instance.cardId).name} 本回合已经行动过。`);
    gameAudio.play("ui.error");
    render();
    return;
  }
  if (source.instance.suppressed) {
    battle.log.push(`${getCard(source.instance.cardId).name} 受到【电子压制】，本回合不能行动。`);
    gameAudio.play("ui.error");
    render();
    return;
  }
  const card = getCard(source.instance.cardId);
  if (!card.ability) {
    gameAudio.play("ui.error");
    battle.log.push(`${card.name} 暂无可主动发动的技能。`);
    render();
    return;
  }
  if (source.instance.exposed && !canResolveBoardAbilityWithoutTargets(card)) {
    const previewTargets = getValidEffectTargets(battle, side, card.ability, card, { sourceRef: source, asActingSource: true });
    if (!previewTargets.length) {
      gameAudio.play("ui.error");
      battle.log.push(getNoLegalTargetMessage(card));
      render();
      return;
    }
  }

  markBoardActionUsed(battle, side);
  markUnitActed(battle, source.instance);
  if (source.instance.hidden) {
    source.instance.hidden = false;
    markCardFlip(source.instance, "reveal");
    gameAudio.playCard(card, { action: "reveal", side });
    battle.log.push(`${getSideName(battle, side)}主动翻开 ${card.name}。`);
  } else {
    battle.log.push(`${getSideName(battle, side)}命令已暴露的 ${card.name} 再次发动技能。`);
  }

  if (card.ability && ["damageGuard", "intelDeny", "fireBoost", "supply"].includes(card.ability.kind)) {
    resolveNoTargetBoardEffect(battle, side, source.instance, card);
    finishAction(side);
    return;
  }

  const targets = getValidEffectTargets(battle, side, card.ability, card, { sourceRef: source, asActingSource: true });
  if (card.ability && targets.length) {
    if (targets.length === 1) {
      const result = resolveEffectOnTarget(battle, {
        side,
        sourceUid: source.instance.uid,
        cardId: card.id,
        ability: card.ability,
        target: targets[0],
      });
      if (result === "pending-animation" || result === "pending") {
        return;
      }
      finishAction(side);
      return;
    }
    state.pending = {
      kind: "boardEffect",
      side,
      sourceUid: source.instance.uid,
      cardId: card.id,
      ability: card.ability,
      targets,
    };
    render();
    return;
  }

  finishAction(side);
}

function revealOwnHiddenUnit(battle, side, uid) {
  activateOwnBoardUnit(battle, side, uid);
}

function canResolveBoardAbilityWithoutTargets(card) {
  const ability = card.ability;
  if (!ability) {
    return false;
  }
  return (
    ability.noTarget ||
    ["damageGuard", "intelDeny", "fireBoost", "supply", "fortify", "repair"].includes(ability.kind) ||
    (ability.kind === "damageOrSelfBonus" && ability.selfBonusIfNoTargets)
  );
}

function canResolveHandEffectWithoutTargets(battle, side, card) {
  const ability = card.ability;
  if (!ability) {
    return false;
  }
  if (ability.noTarget || ["damageGuard", "intelDeny", "fireBoost", "supply"].includes(ability.kind)) {
    return true;
  }
  return ability.kind === "repair" && ability.drawAlternative && getValidEffectTargets(battle, side, ability, card).length === 0;
}

function resolveEffectOnTarget(battle, payload, options = {}) {
  const sourceCard = getCard(payload.cardId);
  const target = findBoardInstance(battle, payload.target.side, payload.target.uid);
  if (!target) {
    return;
  }

  const ability = payload.ability;
  const sourceRef = payload.sourceUid ? findBoardInstance(battle, payload.side, payload.sourceUid) : null;
  if (payload.target?.breakthrough && sourceRef) {
    return resolveBreakthroughAction(battle, payload.side, sourceCard, sourceRef, target, ability, options);
  }
  if (isDirectAttackAbility(ability) && !canTargetForAbility(battle, payload.side, target, ability, { sourceRef, sourceCard })) {
    battle.log.push(`${sourceCard.name} 的目标已不再满足当前前线遮蔽规则。`);
    return "resolved";
  }
  if (shouldDeferCardFireVideo(payload, sourceCard, sourceRef, options)) {
    return beginCardFireVideoTransition(battle, payload, sourceRef, sourceCard);
  }
  if (applyIntelDenial(battle, payload.side, sourceCard, ability)) {
    if (ability.sourceExposes && sourceRef) {
      exposeInstance(battle, sourceRef, sourceCard.name, { ignoreDecoy: true });
    }
    return;
  }
  if (!spendIntelForAbility(battle, payload.side, ability, sourceCard)) {
    return;
  }

  if (payload.handUid) {
    markHandActionUsed(battle, payload.side, sourceCard);
    playTacticCardPresentation(payload.side, sourceCard);
    moveHandCardToGrave(battle, payload.side, payload.handUid);
    battle.log.push(`${getSideName(battle, payload.side)}打出 ${sourceCard.name}。`);
  }

  if (!options.skipActionAudio) {
    gameAudio.playCard(sourceCard, { action: "effect", ability, side: payload.side });
  }

  if (ability.kind === "expose") {
    if (target.instance.hidden) {
      exposeInstance(battle, target, sourceCard.name);
    } else {
      battle.log.push(`${sourceCard.name} 确认 ${getCard(target.instance.cardId).name} 已处于可打击状态。`);
    }
    if (ability.sourceExposes && sourceRef) {
      exposeInstance(battle, sourceRef, sourceCard.name, { ignoreDecoy: true });
    }
  }

  if (ability.kind === "exposeDeployTag") {
    if (exposeInstance(battle, target, sourceCard.name)) {
      deployHandUnitWithTagAndActivate(battle, payload.side, ability.deployTag, sourceCard);
    }
    if (ability.sourceExposes && sourceRef) {
      exposeInstance(battle, sourceRef, sourceCard.name, { ignoreDecoy: true });
    }
  }

  if (ability.kind === "exposeAndSupply") {
    if (exposeInstance(battle, target, sourceCard.name)) {
      resolveImmediateSupplyDraw(battle, payload.side, ability, sourceCard);
    }
    if (ability.sourceExposes && sourceRef) {
      exposeInstance(battle, sourceRef, sourceCard.name, { ignoreDecoy: true });
    }
  }

  if (ability.kind === "exposeAndCallFire") {
    let exposedNow = false;
    if (target.instance.hidden) {
      exposedNow = exposeInstance(battle, target, sourceCard.name);
    }
    if (ability.sourceExposes && sourceRef) {
      exposeInstance(battle, sourceRef, sourceCard.name, { ignoreDecoy: true });
    }
    const availableCallers = getCallableUnits(battle, payload.side, ability.callerTags);
    const callFireOptions = getCallableFireOptions(battle, payload.side, ability, target, { exposedNow });
    if (callFireOptions.length > 1 && payload.side === "player") {
      return openCallFireChoice(battle, payload, sourceCard, target, ability, callFireOptions);
    }
    if (callFireOptions.length) {
      const { caller, fire } = callFireOptions[0];
      const result = resolveCalledFire(battle, payload.side, sourceCard, caller, target, fire, {
        onComplete: () => {
          cleanupDestroyed(battle, payload.side, sourceCard, target);
          finishDeferredEffectAction(battle, payload.side, options);
        },
      });
      if (result === "pending-animation" || result === "pending") {
        return result;
      }
    } else {
      if (availableCallers.length && ability.callFireTargetTags?.length && !targetHasAnyTag(target.instance, ability.callFireTargetTags)) {
        battle.log.push(`${sourceCard.name} 暴露目标，但该目标不适合远程校射。`);
      } else if (availableCallers.length && ability.callFireRequiresFreshExpose && !exposedNow) {
        battle.log.push(`${sourceCard.name} 确认目标已暴露，未触发额外校射。`);
      } else {
        battle.log.push(`${sourceCard.name} 完成坐标引导，但己方没有本回合未行动的远程单位。`);
      }
      resolveNoCallerFallback(battle, payload.side, sourceCard, sourceRef, ability, { exposedNow, target });
    }
  }

  if (ability.kind === "exposeOrDamage") {
    if (target.instance.hidden) {
      exposeInstance(battle, target, sourceCard.name);
    } else if (ability.damageIfExposed && target.instance.exposed) {
      dealDamage(battle, payload.side, target.side, target, ability.damageIfExposed, sourceCard, sourceRef);
    } else if (ability.damageIfTag && hasTag(target.instance, ability.damageIfTag.tag)) {
      dealDamage(battle, payload.side, target.side, target, ability.damageIfTag.amount, sourceCard, sourceRef);
    }
    if (ability.sourceExposes && sourceRef) {
      exposeInstance(battle, sourceRef, sourceCard.name, { ignoreDecoy: true });
    }
  }

  if (ability.kind === "damage" || ability.kind === "damageOrSelfBonus" || ability.kind === "strike") {
    if (target.instance.hidden && canRevealHiddenTargetForAbility(ability, target.instance)) {
      exposeInstance(battle, target, sourceCard.name);
    }
    const amount = getDamageAmount(battle, payload.side, ability, target.instance, target.lineId, sourceCard);
    dealDamage(battle, payload.side, target.side, target, amount, sourceCard, sourceRef);
    if (ability.splash) {
      applySplashDamage(battle, payload.side, target, ability.splash, sourceCard);
    }
    if (ability.sourceExposes && sourceRef) {
      exposeInstance(battle, sourceRef, sourceCard.name, { ignoreDecoy: true });
    }
  }

  if (ability.kind === "areaDamage") {
    const areaTargets = getAreaDamageTargets(battle, payload.side, ability, target, { sourceRef, sourceCard });
    areaTargets.forEach((areaTarget, index) => {
      if (areaTarget.instance.hidden && canRevealHiddenTargetForAbility(ability, areaTarget.instance)) {
        exposeInstance(battle, areaTarget, sourceCard.name);
      }
      const amount = getDamageAmount(battle, payload.side, ability, areaTarget.instance, areaTarget.lineId, sourceCard, { areaIndex: index, primaryTarget: target.instance });
      dealDamage(battle, payload.side, areaTarget.side, areaTarget, amount, sourceCard, sourceRef);
    });
    if (ability.sourceExposes && sourceRef) {
      exposeInstance(battle, sourceRef, sourceCard.name, { ignoreDecoy: true });
    }
  }

  if (ability.kind === "damageBoost") {
    battle.log.push(`${sourceCard.name} 的旧版火力指示效果已停用；当前规则仅使用隐蔽与暴露状态。`);
    if (ability.sourceExposes && sourceRef) {
      exposeInstance(battle, sourceRef, sourceCard.name, { ignoreDecoy: true });
    }
  }

  if (ability.kind === "callFire" || ability.kind === "counterBattery") {
    const caller = findCallableUnit(battle, payload.side, ability.callerTags);
    if (!caller) {
      battle.log.push(`${sourceCard.name} 没有可调用单位。`);
    } else {
      const callerCard = getCard(caller.instance.cardId);
      const fire = ability.kind === "callFire" ? callerCard.fire : { amount: ability.amount, sourceExposes: true };
      const result = resolveCalledFire(battle, payload.side, sourceCard, caller, target, fire, {
        onComplete: () => {
          if (ability.kind === "callFire" && fire.splash) {
            applySplashDamage(battle, payload.side, target, fire.splash, callerCard);
          }
          cleanupDestroyed(battle, payload.side, sourceCard, target);
          finishDeferredEffectAction(battle, payload.side, options);
        },
      });
      if (result === "pending-animation" || result === "pending") {
        return result;
      }
      if (ability.kind === "callFire" && fire.splash) {
        applySplashDamage(battle, payload.side, target, fire.splash, callerCard);
      }
    }
  }

  if (ability.kind === "smoke") {
    const wasHidden = target.instance.hidden;
    target.instance.exposed = false;
    target.instance.exposedAtAction = null;
    target.instance.hidden = ability.hide !== false;
    target.instance.shield = Boolean(ability.shield);
    if (!wasHidden && target.instance.hidden) {
      markCardFlip(target.instance, "hide");
    }
    if (ability.repairIfTag && hasTag(target.instance, ability.repairIfTag.tag)) {
      const before = target.instance.damage;
      target.instance.damage = Math.max(0, target.instance.damage - ability.repairIfTag.amount);
      battle.log.push(`${sourceCard.name} 修复 ${getCard(target.instance.cardId).name} ${before - target.instance.damage} 点伤害。`);
    }
    if (ability.repairIfLine && target.lineId === ability.repairIfLine.line) {
      const before = target.instance.damage;
      target.instance.damage = Math.max(0, target.instance.damage - ability.repairIfLine.amount);
      if (before !== target.instance.damage) {
        battle.log.push(`${sourceCard.name} 修复 ${getCard(target.instance.cardId).name} ${before - target.instance.damage} 点伤害。`);
      }
    }
    battle.log.push(`${sourceCard.name} 令 ${getCard(target.instance.cardId).name} 重新进入【隐蔽】。`);
  }

  if (ability.kind === "suppress") {
    if (target.instance.hidden || ability.suppressExposedTargets || !ability.damageDebuffIfExposed) {
      target.instance.suppressed = true;
      battle.log.push(`${sourceCard.name} 压制 ${getCard(target.instance.cardId).name}，其下回合不能行动。`);
    } else {
      target.instance.damageDebuff = Math.max(target.instance.damageDebuff || 0, ability.damageDebuffIfExposed || 1);
      battle.log.push(`${sourceCard.name} 干扰 ${getCard(target.instance.cardId).name}，其下一次造成伤害 -${target.instance.damageDebuff}。`);
    }
  }

  if (ability.kind === "decoy") {
    target.instance.decoy = true;
    battle.log.push(`${sourceCard.name} 为 ${getCard(target.instance.cardId).name} 建立假目标阵地，下一次侦查暴露无效。`);
  }

  if (ability.kind === "camouflage") {
    const wasHidden = target.instance.hidden;
    target.instance.exposed = false;
    target.instance.exposedAtAction = null;
    target.instance.hidden = true;
    if (!wasHidden) {
      markCardFlip(target.instance, "hide");
    }
    battle.log.push(`${sourceCard.name} 令 ${getCard(target.instance.cardId).name} 进入【隐蔽】。`);
  }

  if (ability.kind === "airspaceControl") {
    target.instance.airspaceControl = true;
    battle.log.push(`${sourceCard.name} 为 ${getCard(target.instance.cardId).name} 建立空域管制，下一次伴随防空拦截减弱。`);
  }

  if (ability.kind === "repair") {
    const before = target.instance.damage;
    const amount = getRepairAmount(ability, target.instance);
    target.instance.damage = Math.max(0, target.instance.damage - amount);
    battle.log.push(`${sourceCard.name} 修复 ${getCard(target.instance.cardId).name} ${before - target.instance.damage} 点伤害。`);
    resolveSupplySideEffects(battle, payload.side, ability, sourceCard, { repaired: true });
  }

  cleanupDestroyed(battle, payload.side, sourceCard, target);
  return "resolved";
}

function resolveBreakthroughAction(battle, side, sourceCard, sourceRef, target, ability, options = {}) {
  if (!canSourceUseBreakthrough(battle, side, sourceRef, { ignoreActed: true })) {
    battle.log.push("当前不满足前线突破条件。");
    return "resolved";
  }

  const breakthroughAbility = getBreakthroughStrikeAbility(ability);
  markBreakthroughUsed(battle, side);
  battle.log.push(`${sourceCard.name} 执行前线突破，迫使 ${getCard(target.instance.cardId).name} 暴露。`);
  exposeInstance(battle, target, "前线突破", { ignoreDecoy: true });

  const canDamage =
    breakthroughAbility &&
    canTargetForAbility(battle, side, target, breakthroughAbility, { sourceRef, sourceCard, ignoreFrontlineSupportBlock: true }) &&
    matchesTargetRequirements(target.instance, breakthroughAbility);

  if (canDamage) {
    if (!options.skipActionAudio) {
      gameAudio.playCard(sourceCard, { action: "effect", ability: breakthroughAbility, side });
    }
    const amount = getDamageAmount(battle, side, breakthroughAbility, target.instance, target.lineId, sourceCard);
    dealDamage(battle, side, target.side, target, amount, sourceCard, sourceRef);
  } else {
    battle.log.push(`${sourceCard.name} 无法有效打击该目标，本次突破未造成伤害。`);
  }

  if (ability?.sourceExposes && sourceRef) {
    exposeInstance(battle, sourceRef, sourceCard.name, { ignoreDecoy: true });
  }
  cleanupDestroyed(battle, side, sourceCard, target);
  return "resolved";
}

function shouldDeferCardFireVideo(payload, sourceCard, sourceRef, options = {}) {
  return Boolean(
    !options.skipCardFireVideo &&
      payload?.sourceUid &&
      sourceRef?.instance &&
      !sourceRef.instance.hidden &&
      getCardFireVideoPath(sourceCard),
  );
}

function beginCardFireVideoTransition(battle, payload, sourceRef, sourceCard) {
  battle.actionAnimation = {
    kind: "cardFireVideo",
    side: payload.side,
    sourceUid: sourceRef.instance.uid,
    cardId: sourceCard.id,
  };
  state.pending = null;
  state.selectedHandUid = null;
  clearSpotlight();
  render();

  playCardFireVideo(sourceRef, sourceCard).finally(() => {
    if (state.battle !== battle || battle.phase !== "battle") {
      return;
    }
    battle.actionAnimation = null;
    resolveEffectOnTarget(battle, payload, { skipActionAudio: true, skipCardFireVideo: true });
    finishAction(payload.side);
  });
  return "pending-animation";
}

function finishDeferredEffectAction(battle, side, options = {}) {
  if (options.pacedFinish) {
    finishActionWithResolutionHold(battle, side, options);
    return;
  }
  finishAction(side);
}

function shouldDeferCalledFireVideo(caller, callerCard, options = {}) {
  return Boolean(
    !options.skipCalledFireVideo &&
      caller?.instance &&
      !caller.instance.hidden &&
      getCardFireVideoPath(callerCard),
  );
}

function beginCalledFireVideoTransition(battle, side, sourceCard, caller, target, fire, options = {}) {
  const callerCard = getCard(caller.instance.cardId);
  battle.actionAnimation = {
    kind: "cardFireVideo",
    side,
    sourceUid: caller.instance.uid,
    cardId: callerCard.id,
  };
  state.pending = null;
  state.selectedHandUid = null;
  clearSpotlight();
  render();

  window.setTimeout(() => {
    if (state.battle !== battle || battle.phase !== "battle") {
      return;
    }
    playCardFireVideo(caller, callerCard).finally(() => {
      if (state.battle !== battle || battle.phase !== "battle") {
        return;
      }
      battle.actionAnimation = null;
      const result = resolveCalledFire(battle, side, sourceCard, caller, target, fire, {
        ...options,
        skipCalledFireVideo: true,
        onComplete: null,
      });
      if (typeof options.onComplete === "function") {
        options.onComplete(result);
      } else {
        render();
      }
    });
  }, options.revealHoldMs ?? CALLED_FIRE_REVEAL_HOLD_MS);
  return "pending-animation";
}

function waitForVideoFirstFrame(video) {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    let settled = false;
    const cleanup = () => {
      video.removeEventListener("loadeddata", handleReady);
      video.removeEventListener("canplay", handleReady);
      video.removeEventListener("error", handleError);
      window.clearTimeout(timer);
    };
    const settle = (ready) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve(ready);
    };
    const handleReady = () => settle(true);
    const handleError = () => settle(false);
    const timer = window.setTimeout(() => settle(false), CARD_FIRE_VIDEO_READY_TIMEOUT_MS);

    video.addEventListener("loadeddata", handleReady, { once: true });
    video.addEventListener("canplay", handleReady, { once: true });
    video.addEventListener("error", handleError, { once: true });
    video.preload = "auto";
    video.load();
  });
}

function playCardFireVideo(sourceRef, sourceCard) {
  return new Promise((resolve) => {
    const element = getBoardCardElement(sourceRef.side, sourceRef.instance.uid);
    const video = element?.querySelector(".board-card__fire-video");
    if (!element || !video) {
      resolve();
      return;
    }

    let settled = false;
    let timer = null;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timer);
      video.pause();
      try {
        video.currentTime = 0;
      } catch (error) {
        // Ignore media reset failures; the card will reinitialize the video before the next play.
      }
      element.classList.remove("is-video-firing");
      resolve();
    };
    const getTimeoutMs = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        return Math.min(Math.max(video.duration * 1000 + 180, 900), CARD_FIRE_VIDEO_MAX_MS);
      }
      return CARD_FIRE_VIDEO_FALLBACK_MS;
    };
    const armTimeout = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(finish, getTimeoutMs());
    };

    video.muted = false;
    video.volume = 1;
    video.playsInline = true;
    video.pause();
    try {
      video.currentTime = 0;
    } catch (error) {
      // Some browsers reject seeking before metadata; loading below will still start from the beginning.
    }

    waitForVideoFirstFrame(video).then((ready) => {
      if (!ready || settled) {
        finish();
        return;
      }
      element.classList.add("is-video-firing");
      video.addEventListener("ended", finish, { once: true });
      video.addEventListener("error", finish, { once: true });
      video.addEventListener("loadedmetadata", armTimeout, { once: true });
      armTimeout();
      const playPromise = video.play();
      if (playPromise?.catch) {
        playPromise.catch(finish);
      }
    });
  });
}

function dealDamage(battle, attackerSide, defenderSide, targetRefOrInstance, rawAmount, sourceCard, sourceRef = null, options = {}) {
  const targetRef = normalizeTargetRef(battle, defenderSide, targetRefOrInstance);
  if (!targetRef) {
    return;
  }
  const target = targetRef.instance;
  let amount = rawAmount;

  if (target.shield && !target.hidden) {
    target.shield = false;
  }

  if (target.shield && target.hidden && sourceCard.type !== "unit") {
    target.shield = false;
    playBlockedVfx(targetRef, "烟幕吸收");
    battle.log.push(`${getCard(target.cardId).name} 的烟幕吸收了 ${sourceCard.name}。`);
    return;
  }

  amount = applyOutgoingDamageDebuff(battle, amount, sourceRef, sourceCard);
  amount = applyOutgoingFireBoost(battle, attackerSide, amount, sourceCard);
  amount = applyDamageGuard(battle, defenderSide, amount, sourceCard);
  const amountBeforeInterception = amount;
  amount = applyInterception(battle, defenderSide, targetRef.lineId, amount, sourceCard, sourceRef, targetRef);
  if (amount === INTERCEPTION_CANCELLED_DAMAGE) {
    return;
  }
  if (amountBeforeInterception > 0 && amount <= 0 && canInterceptionCancelDamage(sourceCard, targetRef)) {
    return;
  }
  amount = applyScreening(battle, defenderSide, targetRef, amount, sourceCard);
  if (amount <= 0) {
    amount = Math.min(1, Math.max(0, rawAmount));
  }
  if (amount <= 0) {
    return;
  }

  target.damage += amount;
  target.lastDamagedBy = attackerSide;
  gameAudio.playImpact(sourceCard, getCard(target.cardId), { amount, defenderSide });
  playCombatVfx({ attackerSide, sourceCard, targetRef, amount });
  battle.log.push(`${sourceCard.name} 对 ${getCard(target.cardId).name} 造成 ${amount} 点伤害。`);
  if (!options.skipAssist) {
    applyAssistFire(battle, attackerSide, defenderSide, targetRef, sourceCard, sourceRef);
  }
}

function playCombatVfx({ attackerSide, sourceCard, targetRef, amount }) {
  if (!refs.fxLayer || state.screen !== "battle") {
    return;
  }
  const targetElement = getBoardCardElement(targetRef.side, targetRef.instance.uid);
  const sourceElement = findVfxSourceElement(attackerSide, sourceCard);
  const start = getElementCenter(sourceElement) || getFallbackVfxPoint(attackerSide, sourceCard.line);
  const end = getElementCenter(targetElement) || getFallbackVfxPoint(targetRef.side, targetRef.lineId);
  const kind = getCombatVfxKind(sourceCard, amount);

  flashSource(start, kind);
  pulseElement(sourceElement, "is-firing", 360);
  pulseElement(targetElement, "is-hit", 520);

  if (kind === "rocket") {
    playRocketSalvoVfx(start, end, amount);
  } else if (kind === "artillery") {
    playArtilleryVfx(start, end, amount);
  } else if (kind === "infantry" || kind === "autocannon") {
    playBurstVfx(start, end, kind, amount);
  } else {
    playProjectileVfx(start, end, kind, amount);
  }

  window.setTimeout(() => playImpactVfx(end, kind, amount), getImpactDelay(kind));
  shakeScreen(kind, amount);
}

function playProjectileVfx(start, end, kind, amount, delay = 0) {
  const projectile = createFxElement("span", `fx-projectile fx-projectile--${kind}`);
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  projectile.style.setProperty("--angle", `${angle}rad`);
  projectile.style.setProperty("--power", String(Math.max(1, amount || 1)));
  refs.fxLayer.append(projectile);
  const duration = kind === "tank" ? 260 : kind === "air" ? 380 : 320;
  animateAndRemove(
    projectile,
    [
      { transform: `translate(${start.x}px, ${start.y}px) rotate(${angle}rad) scaleX(0.72)`, opacity: 0 },
      { transform: `translate(${start.x}px, ${start.y}px) rotate(${angle}rad) scaleX(1)`, opacity: 1, offset: 0.12 },
      { transform: `translate(${end.x}px, ${end.y}px) rotate(${angle}rad) scaleX(1.18)`, opacity: 1 },
    ],
    { duration, delay, easing: "cubic-bezier(0.08, 0.72, 0.18, 1)" },
  );
}

function playArtilleryVfx(start, end, amount) {
  const shell = createFxElement("span", "fx-projectile fx-projectile--artillery");
  const middle = {
    x: (start.x + end.x) / 2,
    y: Math.min(start.y, end.y) - Math.min(210, 92 + Math.abs(end.x - start.x) * 0.08),
  };
  refs.fxLayer.append(shell);
  animateAndRemove(
    shell,
    [
      { transform: `translate(${start.x}px, ${start.y}px) rotate(-34deg) scale(0.76)`, opacity: 0 },
      { transform: `translate(${middle.x}px, ${middle.y}px) rotate(8deg) scale(1)`, opacity: 1, offset: 0.48 },
      { transform: `translate(${end.x}px, ${end.y}px) rotate(62deg) scale(1.18)`, opacity: 1 },
    ],
    { duration: 720, easing: "cubic-bezier(0.24, 0.05, 0.18, 1)" },
  );
  makeTrailPath(start, middle, end, "fx-arc-path");
}

function playRocketSalvoVfx(start, end, amount) {
  const rockets = Math.min(6, Math.max(3, amount || 3));
  for (let index = 0; index < rockets; index += 1) {
    const offset = {
      x: (index - (rockets - 1) / 2) * 22,
      y: ((index % 2) - 0.5) * 26,
    };
    const nextEnd = { x: end.x + offset.x, y: end.y + offset.y };
    const nextStart = { x: start.x + offset.x * 0.2, y: start.y - index * 4 };
    playProjectileVfx(nextStart, nextEnd, "rocket", amount, index * 70);
    window.setTimeout(() => playImpactVfx(nextEnd, "rocket", amount, { showDamageNumber: false }), 510 + index * 70);
  }
}

function playBurstVfx(start, end, kind, amount) {
  const shots = kind === "autocannon" ? 9 : 6;
  for (let index = 0; index < shots; index += 1) {
    const spread = {
      x: (Math.random() - 0.5) * 34,
      y: (Math.random() - 0.5) * 26,
    };
    const nextEnd = { x: end.x + spread.x, y: end.y + spread.y };
    const delay = index * (kind === "autocannon" ? 42 : 55);
    playProjectileVfx(start, nextEnd, kind, amount, delay);
    window.setTimeout(() => playSparkVfx(nextEnd, kind), 190 + delay);
  }
}

function playImpactVfx(point, kind, amount = 1, options = {}) {
  if (!refs.fxLayer) {
    return;
  }
  const impact = createFxElement("div", `fx-impact fx-impact--${kind}`);
  impact.style.left = `${point.x}px`;
  impact.style.top = `${point.y}px`;
  impact.style.setProperty("--power", String(Math.max(1, amount || 1)));
  impact.innerHTML = `
    <span class="fx-impact__core"></span>
    <span class="fx-impact__ring"></span>
    <span class="fx-impact__smoke"></span>
  `;
  refs.fxLayer.append(impact);
  addParticles(point, kind, amount);
  if (options.showDamageNumber !== false) {
    addDamageNumber(point, amount);
  }
  removeFxElement(impact, kind === "artillery" || kind === "rocket" || kind === "heavy" ? 1050 : 760);
}

function playSparkVfx(point, kind) {
  const spark = createFxElement("span", `fx-spark fx-spark--${kind}`);
  spark.style.left = `${point.x}px`;
  spark.style.top = `${point.y}px`;
  refs.fxLayer?.append(spark);
  removeFxElement(spark, 420);
}

function playBlockedVfx(targetRef, label = "拦截") {
  if (!refs.fxLayer || state.screen !== "battle") {
    return;
  }
  const point = getElementCenter(getBoardCardElement(targetRef.side, targetRef.instance.uid)) || getFallbackVfxPoint(targetRef.side, targetRef.lineId);
  const block = createFxElement("div", "fx-blocked");
  block.style.left = `${point.x}px`;
  block.style.top = `${point.y}px`;
  block.textContent = label;
  refs.fxLayer.append(block);
  removeFxElement(block, 740);
}

function playDestroyedVfx(side, uid) {
  if (!refs.fxLayer || state.screen !== "battle") {
    return;
  }
  const point = getElementCenter(getBoardCardElement(side, uid));
  if (!point) {
    return;
  }
  const destroyed = createFxElement("div", "fx-destroyed");
  destroyed.style.left = `${point.x}px`;
  destroyed.style.top = `${point.y}px`;
  destroyed.textContent = "摧毁";
  refs.fxLayer.append(destroyed);
  addParticles(point, "destroyed", 5);
  removeFxElement(destroyed, 980);
}

function flashSource(point, kind) {
  const flash = createFxElement("span", `fx-muzzle fx-muzzle--${kind}`);
  flash.style.left = `${point.x}px`;
  flash.style.top = `${point.y}px`;
  refs.fxLayer?.append(flash);
  removeFxElement(flash, 360);
}

function addDamageNumber(point, amount) {
  const damage = createFxElement("span", "fx-damage-number");
  damage.style.left = `${point.x}px`;
  damage.style.top = `${point.y}px`;
  damage.textContent = `-${amount}`;
  refs.fxLayer?.append(damage);
  removeFxElement(damage, 900);
}

function addParticles(point, kind, amount = 1) {
  const count = kind === "infantry" || kind === "autocannon" ? 5 : Math.min(16, 7 + amount);
  for (let index = 0; index < count; index += 1) {
    const particle = createFxElement("span", `fx-particle fx-particle--${kind}`);
    const angle = Math.random() * Math.PI * 2;
    const distance = 22 + Math.random() * (kind === "tank" || kind === "artillery" || kind === "rocket" ? 72 : 38);
    particle.style.left = `${point.x}px`;
    particle.style.top = `${point.y}px`;
    particle.style.setProperty("--px", `${Math.cos(angle) * distance}px`);
    particle.style.setProperty("--py", `${Math.sin(angle) * distance}px`);
    particle.style.animationDelay = `${Math.random() * 70}ms`;
    refs.fxLayer?.append(particle);
    removeFxElement(particle, 850);
  }
}

function makeTrailPath(start, middle, end, className) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("fx-trail-svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("class", className);
  path.setAttribute("d", `M ${start.x} ${start.y} Q ${middle.x} ${middle.y} ${end.x} ${end.y}`);
  svg.append(path);
  refs.fxLayer?.append(svg);
  removeFxElement(svg, 820);
}

function getImpactDelay(kind) {
  if (kind === "artillery") return 720;
  if (kind === "rocket") return 510;
  if (kind === "infantry" || kind === "autocannon") return 430;
  if (kind === "air") return 410;
  return 260;
}

function getCombatVfxKind(card, amount = 1) {
  const signal = `${card.id || ""} ${card.name || ""} ${card.specialization || ""} ${(card.tags || []).join(" ")}`.toLowerCase();
  if (signal.includes("himars") || signal.includes("m270") || signal.includes("tos") || signal.includes("rocket") || signal.includes("火箭") || signal.includes("导弹")) {
    return "rocket";
  }
  if (signal.includes("m109") || signal.includes("2s19") || signal.includes("howitzer") || signal.includes("artillery") || signal.includes("榴弹") || signal.includes("炮兵")) {
    return "artillery";
  }
  if (signal.includes("m1a2") || signal.includes("t90") || signal.includes("t-90") || signal.includes("tank") || signal.includes("装甲")) {
    return "tank";
  }
  if (signal.includes("avenger") || signal.includes("pantsir") || signal.includes("mshorad")) {
    return "autocannon";
  }
  if (signal.includes("infantry") || signal.includes("marine") || signal.includes("ranger") || signal.includes("步兵")) {
    return "infantry";
  }
  if (signal.includes("apache") || signal.includes("helicopter") || signal.includes("fighter") || signal.includes("bomber") || signal.includes("直升机") || signal.includes("战斗机") || signal.includes("空战") || signal.includes("战机") || signal.includes("轰炸机")) {
    return "air";
  }
  return amount >= 5 ? "heavy" : "small";
}

function findVfxSourceElement(side, sourceCard) {
  if (!sourceCard) {
    return null;
  }
  const direct = refs.board.querySelector(`[data-side="${side}"][data-card-id="${sourceCard.id}"]`);
  if (direct) {
    return direct;
  }
  const lineId = sourceCard.line === "support" || sourceCard.tags?.some((tag) => ["榴弹炮", "火箭炮", "导弹", "重型防空", "无人机", "战斗机", "轰炸机"].includes(tag)) ? "support" : "frontline";
  return refs.board.querySelector(`.battle-line[data-side="${side}"][data-row="${lineId}"]`) || document.querySelector(`.commander-hud--${side}`);
}

function getBoardCardElement(side, uid) {
  return refs.board.querySelector(`[data-side="${side}"][data-board-card="${uid}"]`);
}

function getHandCardElement(side, uid) {
  if (side === "player") {
    return document.querySelector(`[data-hand-card="${uid}"]`);
  }
  return document.querySelector(".enemy-hand-strip .enemy-hand-back:last-child");
}

function getPileElement(side, kind) {
  return document.querySelector(`.deck-hud--${side} [data-pile="${kind}"] .deck-pile__cards`);
}

function getHandDestinationElement(side) {
  if (side === "player") {
    return document.querySelector(".hand-rail") || document.querySelector(".command-overlay");
  }
  return document.querySelector(".enemy-hand-strip") || document.querySelector(".commander-hud--enemy");
}

function getFallbackHandPoint(side) {
  const element = getHandDestinationElement(side);
  const point = getElementCenter(element);
  if (point) {
    return point;
  }
  return {
    x: side === "player" ? window.innerWidth * 0.5 : window.innerWidth * 0.5,
    y: side === "player" ? window.innerHeight * 0.88 : window.innerHeight * 0.1,
  };
}

function getElementCenter(element) {
  if (!element) {
    return null;
  }
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function getRectCenter(rect) {
  if (!rect) {
    return null;
  }
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function playCardFlight(card, side, fromRect, toRect, options = {}) {
  if (!refs.fxLayer || state.screen !== "battle") {
    return;
  }
  const from = getRectCenter(fromRect);
  const to = getRectCenter(toRect);
  if (!from || !to) {
    return;
  }
  const element = document.createElement("div");
  const width = options.width || (options.intent === "deploy" ? 128 : options.intent === "discard" ? 112 : 104);
  const height = Math.round(width * 1.5);
  const intentClass = options.intent ? `card-flight--${options.intent}` : "";
  element.className = `card-flight card-flight--${side} ${intentClass} ${options.back ? "is-back" : "is-front"}`;
  element.style.setProperty("--from-x", `${from.x}px`);
  element.style.setProperty("--from-y", `${from.y}px`);
  element.style.setProperty("--to-x", `${to.x}px`);
  element.style.setProperty("--to-y", `${to.y}px`);
  element.style.setProperty("--mid-x", `${(from.x + to.x) / 2}px`);
  element.style.setProperty("--mid-y", `${Math.min(from.y, to.y) - (options.arc || 128)}px`);
  element.style.setProperty("--flight-w", `${width}px`);
  element.style.setProperty("--flight-h", `${height}px`);
  element.style.setProperty("--flight-half-w", `${width / 2}px`);
  element.style.setProperty("--flight-half-h", `${height / 2}px`);
  element.style.setProperty("--card-art", options.back ? `url('${CARD_BACK_ART_PATH}')` : `url('${getCardThumbnailArtPath(card)}')`);
  element.style.setProperty("--flight-duration", `${options.duration || CARD_FLIGHT_MS}ms`);
  element.innerHTML = `<span>${options.back ? "" : escapeHtml(card?.name || "")}</span>`;
  refs.fxLayer.append(element);
  window.setTimeout(() => element.remove(), options.duration || CARD_FLIGHT_MS);
}

function playCardFlightFromPoint(card, side, fromPoint, toElement, options = {}) {
  const to = getElementCenter(toElement);
  if (!fromPoint || !to) {
    return;
  }
  const fromRect = {
    left: fromPoint.x,
    top: fromPoint.y,
    width: 0,
    height: 0,
  };
  const toRect = {
    left: to.x,
    top: to.y,
    width: 0,
    height: 0,
  };
  playCardFlight(card, side, fromRect, toRect, options);
}

function playCardFlightBetweenElements(card, side, fromElement, toElement, options = {}) {
  const fromRect = fromElement?.getBoundingClientRect?.();
  const toRect = toElement?.getBoundingClientRect?.();
  playCardFlight(card, side, fromRect, toRect, options);
}

function playTacticCardPresentation(side, card) {
  if (!refs.fxLayer || state.screen !== "battle" || !card) {
    return;
  }
  const element = document.createElement("div");
  element.className = `played-card-stage played-card-stage--${side}`;
  element.style.setProperty("--stage-duration", `${TACTIC_PRESENTATION_MS}ms`);
  element.innerHTML = renderPreviewCard(card);
  refs.fxLayer.append(element);
  window.setTimeout(() => element.remove(), TACTIC_PRESENTATION_MS);
}

function getFallbackVfxPoint(side, lineId = "frontline") {
  const line = refs.board.querySelector(`.battle-line[data-side="${side}"][data-row="${lineId === "support" ? "support" : "frontline"}"]`);
  const point = getElementCenter(line);
  if (point) {
    return point;
  }
  return {
    x: side === "player" ? window.innerWidth * 0.42 : window.innerWidth * 0.58,
    y: side === "player" ? window.innerHeight * 0.72 : window.innerHeight * 0.28,
  };
}

function createFxElement(tagName, className) {
  const element = document.createElement(tagName);
  element.className = className;
  return element;
}

function animateAndRemove(element, keyframes, options) {
  const animation = element.animate(keyframes, { fill: "both", ...options });
  animation.finished.then(() => element.remove()).catch(() => element.remove());
  return animation;
}

function removeFxElement(element, delay = 600) {
  window.setTimeout(() => element.remove(), delay);
}

function pulseElement(element, className, delay = 360) {
  if (!element) {
    return;
  }
  element.classList.add(className);
  window.setTimeout(() => element.classList.remove(className), delay);
}

function shakeScreen(kind, amount = 1) {
  if (!refs.app || ["infantry", "autocannon", "small"].includes(kind)) {
    return;
  }
  refs.app.classList.remove("is-screen-shaking");
  refs.app.style.setProperty("--shake-power", `${Math.min(10, 3 + amount)}px`);
  window.requestAnimationFrame(() => refs.app.classList.add("is-screen-shaking"));
  window.setTimeout(() => refs.app.classList.remove("is-screen-shaking"), kind === "artillery" || kind === "rocket" || kind === "heavy" ? 560 : 360);
}

function canPassiveRevealFromHidden(passive) {
  return Boolean(passive?.canReveal || passive?.sourceExposes);
}

function applyInterception(battle, defenderSide, targetLineId, amount, sourceCard, sourceRef = null, targetRef = null) {
  if (!sourceCard.tags.some((tag) => ["直升机", "战斗机", "轰炸机", "导弹", "空战", "战机", "巡航导弹", "弹道导弹"].includes(tag))) {
    return amount;
  }
  if (shouldIgnoreInterceptionForTarget(sourceCard, targetRef)) {
    return amount;
  }

  if (tryConsumeTargetInterceptionCancel(battle, defenderSide, targetLineId, sourceCard, targetRef)) {
    gameAudio.play("defense.intercept", { sourceCard, reduction: amount });
    return 0;
  }

  const candidates = [];
  LINES.forEach((line) => {
    battle.board[defenderSide][line.id].forEach((instance) => {
      const card = getCard(instance.cardId);
      const intercept = card.continuous?.intercept;
      const cancelsDamage = Boolean(card.continuous?.interceptCancelsDamage);
      const canProtectLine = !card.continuous?.protectLines || card.continuous.protectLines.includes(targetLineId);
      const canIntercept = card.continuous?.interceptTags?.some((tag) => sourceCard.tags.includes(tag));
      const allowedInterceptorTags = getAllowedInterceptorTags(sourceCard.ability, targetRef);
      const tagAllowed = !allowedInterceptorTags || allowedInterceptorTags.some((tag) => card.tags.includes(tag));
      const canRevealHiddenInterceptor = canPassiveRevealFromHidden(card.continuous);
      if (
        (intercept || cancelsDamage) &&
        canProtectLine &&
        canIntercept &&
        tagAllowed &&
        getCurrentPower(instance) > 0 &&
        !instance.suppressed &&
        (!instance.hidden || canRevealHiddenInterceptor) &&
        !hasUnitActedThisTurn(battle, instance)
      ) {
        let appliedIntercept = cancelsDamage ? amount : intercept;
        if (sourceRef?.instance?.airspaceControl && sourceCard.tags.includes("战斗机") && card.tags.includes("伴随防空")) {
          appliedIntercept = Math.max(0, appliedIntercept - 1);
        }
        candidates.push({ line, instance, card, appliedIntercept, cancelsDamage });
      }
    });
  });

  const interceptors = isSingleInterceptorStrikeCard(sourceCard)
    ? candidates.sort((left, right) => right.appliedIntercept - left.appliedIntercept).slice(0, 1)
    : candidates;
  let reduction = 0;
  let cancelled = false;
  interceptors.forEach(({ line, instance, card, appliedIntercept, cancelsDamage }) => {
    if (sourceRef?.instance?.airspaceControl && sourceCard.tags.includes("战斗机") && card.tags.includes("伴随防空")) {
      sourceRef.instance.airspaceControl = false;
      battle.log.push(`${sourceCard.name} 获得空域管制，${card.name} 拦截减弱 1 点。`);
    }
    instance.interceptAction = battle.actionSerial;
    markUnitActed(battle, instance);
    cancelled ||= cancelsDamage;
    reduction += appliedIntercept;
    exposeInstance(battle, { side: defenderSide, lineId: line.id, instance }, `${card.name} 拦截`, { ignoreDecoy: true });
    if (card.continuous?.counterDamage && sourceRef?.instance) {
      dealDamage(battle, defenderSide, sourceRef.side, sourceRef, card.continuous.counterDamage, card);
    }
  });

  if (reduction > 0) {
    gameAudio.play("defense.intercept", { sourceCard, reduction });
  }
  if (cancelled) {
    return INTERCEPTION_CANCELLED_DAMAGE;
  }
  return Math.max(0, amount - reduction);
}

function shouldIgnoreInterceptionForTarget(sourceCard, targetRef) {
  return Boolean(sourceCard?.ability?.ignoreInterceptionForTargetTags?.some((tag) => targetRef?.instance && hasTag(targetRef.instance, tag)));
}

function canInterceptionCancelDamage(sourceCard, targetRef) {
  return Boolean(
    sourceCard?.ability?.cancelToZeroOnInterceptionForTags?.some((tag) => targetRef?.instance && hasTag(targetRef.instance, tag)),
  );
}

function tryConsumeTargetInterceptionCancel(battle, defenderSide, targetLineId, sourceCard, targetRef) {
  if (!canInterceptionCancelDamage(sourceCard, targetRef)) {
    return false;
  }
  const instance = targetRef.instance;
  const card = getCard(instance.cardId);
  const intercept = card.continuous?.intercept;
  const cancelsDamage = Boolean(card.continuous?.interceptCancelsDamage);
  const canProtectLine = !card.continuous?.protectLines || card.continuous.protectLines.includes(targetLineId);
  const canIntercept = card.continuous?.interceptTags?.some((tag) => sourceCard.tags.includes(tag));
  if (
    (!intercept && !cancelsDamage) ||
    !canProtectLine ||
    !canIntercept ||
    getCurrentPower(instance) <= 0 ||
    instance.suppressed ||
    (instance.hidden && !canPassiveRevealFromHidden(card.continuous)) ||
    hasUnitActedThisTurn(battle, instance)
  ) {
    return false;
  }
  instance.interceptAction = battle.actionSerial;
  markUnitActed(battle, instance);
  exposeInstance(battle, { side: defenderSide, lineId: targetRef.lineId, instance }, `${card.name} 拦截`, { ignoreDecoy: true });
  battle.log.push(`${card.name} 抵消 ${sourceCard.name} 的打击，仅暴露并消耗本回合拦截窗口。`);
  return true;
}

function getAllowedInterceptorTags(ability, targetRef = null) {
  const conditional = ability?.interceptByTagsByTargetTag?.find((rule) => rule.tag && targetRef?.instance && hasTag(targetRef.instance, rule.tag));
  return conditional?.interceptByTags || ability?.interceptByTags || null;
}

function applyAssistFire(battle, attackerSide, defenderSide, targetRef, sourceCard, sourceRef = null) {
  if (!sourceCard?.tags?.length || sourceCard.type !== "unit") {
    return;
  }

  LINES.forEach((line) => {
    battle.board[attackerSide][line.id].forEach((instance) => {
      if (sourceRef?.instance?.uid === instance.uid || getCurrentPower(instance) <= 0 || instance.hidden) {
        return;
      }
      const card = getCard(instance.cardId);
      const rule = card.continuous?.assistFire;
      if (!rule || instance.assistAction === battle.actionSerial) {
        return;
      }
      if (rule.triggerTags && !rule.triggerTags.some((tag) => sourceCard.tags.includes(tag))) {
        return;
      }
      if (rule.rows && !rule.rows.includes(targetRef.lineId)) {
        return;
      }
      if (!matchesTargetRequirements(targetRef.instance, rule)) {
        return;
      }

      instance.assistAction = battle.actionSerial;
      markUnitActed(battle, instance);
      const amount = rule.amount || 1;
      battle.log.push(`${card.name} 触发【前线协同】，追加 ${amount} 点伤害。`);
      dealDamage(battle, attackerSide, defenderSide, targetRef, amount, card, { side: attackerSide, lineId: line.id, instance }, { skipAssist: true });
    });
  });
}

function applyScreening(battle, defenderSide, targetRef, amount, sourceCard) {
  if (targetRef.lineId !== "support" || sourceCard.type === "strategy") {
    return amount;
  }
  const screen = battle.board[defenderSide].frontline.find((instance) => {
    const card = getCard(instance.cardId);
    return getCurrentPower(instance) > 0 && !instance.hidden && card.screen;
  });
  if (!screen) {
    return amount;
  }

  const screenCard = getCard(screen.cardId);
  const capacity = screen.fortified ? screenCard.screen?.fortifiedAmount || 3 : screenCard.screen?.amount || 2;
  const redirected = Math.min(capacity, amount);
  screen.damage += redirected;
  gameAudio.play("defense.screen", { sourceCard, screenCard, redirected });
  battle.log.push(`${screenCard.name} 抗线，替支援区承受 ${redirected} 点伤害。`);
  return amount - redirected;
}

function cleanupDestroyed(battle, actingSide, sourceCard, targetSnapshot) {
  const destroyed = [];
  ["player", "enemy"].forEach((side) => {
    LINES.forEach((line) => {
      const row = battle.board[side][line.id];
      for (let index = row.length - 1; index >= 0; index -= 1) {
        const instance = row[index];
        if (getCurrentPower(instance) <= 0) {
          const card = getCard(instance.cardId);
          const sourceRect = getBoardCardElement(side, instance.uid)?.getBoundingClientRect();
          const scorer = instance.lastDamagedBy && instance.lastDamagedBy !== side ? instance.lastDamagedBy : actingSide !== side ? actingSide : null;
          row.splice(index, 1);
          battle.graves[side].push(instance);
          playCardFlight(card, side, sourceRect, getPileElement(side, "grave")?.getBoundingClientRect(), { back: true, duration: 720 });
          destroyed.push({ side, lineId: line.id, instance });
          if (scorer) {
            const points = getCardTargetValue(card);
            battle.scores[scorer] += points;
            battle.log.push(`${getSideName(battle, scorer)}摧毁 ${card.name}，获得 ${points} 点战场得分。`);
          }
          gameAudio.play("combat.destroyed", { card, side });
          playDestroyedVfx(side, instance.uid);
          battle.log.push(`${card.name} 被摧毁。`);
        }
      }
    });
  });

  const targetDestroyed = destroyed.some((item) => item.instance.uid === targetSnapshot?.instance?.uid);
  if (targetDestroyed && sourceCard.ability?.splashOnDestroy && targetSnapshot.lineId !== "frontline") {
    const row = battle.board[targetSnapshot.side][targetSnapshot.lineId];
    const splash = row[0];
    if (splash) {
      dealDamage(battle, actingSide, targetSnapshot.side, splash, sourceCard.ability.splashOnDestroy, sourceCard);
      cleanupDestroyed(battle, actingSide, sourceCard, null);
    }
  }
}

function finishActionWithResolutionHold(battle, side, options = {}) {
  if (!options.pacedFinish || options.holdMs === 0) {
    finishAction(side);
    return;
  }

  battle.actionAnimation = {
    kind: "resolutionHold",
    side,
  };
  render();
  window.setTimeout(() => {
    if (state.battle !== battle || battle.phase !== "battle") {
      return;
    }
    battle.actionAnimation = null;
    finishAction(side);
  }, options.holdMs ?? COMBAT_RESOLUTION_HOLD_MS);
}

function finishAction(side, options = {}) {
  const battle = state.battle;
  if (!battle || battle.phase !== "battle") {
    render();
    return;
  }

  clearSpotlight();
  state.selectedHandUid = null;
  state.pending = null;
  refreshIntelValues(battle);

  if (!options.endTurn && !battle.finalActions && (side === "player" || side === "enemy")) {
    if (resolveBattleEndIfReady(battle)) {
      render();
      return;
    }
    render();
    if (side === "enemy") {
      if (shouldAiContinueAfterAction(battle)) {
        scheduleAi();
      } else {
        scheduleAiPassTurn(battle);
      }
    }
    return;
  }

  clearSuppressionForSide(battle, side);
  if (battle.finalActions && battle.finalTriggeredAtAction !== battle.actionSerial) {
    battle.finalActions[side] = Math.max(0, battle.finalActions[side] - 1);
  } else if (!battle.finalActions) {
    drawCards(battle, side, 1);
  }

  if (resolveBattleEndIfReady(battle)) {
    render();
    return;
  }

  const other = side === "player" ? "enemy" : "player";
  let nextSide = null;
  if (battle.finalActions) {
    nextSide = battle.finalActions[other] > 0 ? other : battle.finalActions[side] > 0 ? side : null;
  } else {
    nextSide = other;
  }
  battle.actionSerial += 1;
  beginTurnHandoff(battle, side, nextSide);
}

function shouldAiContinueAfterAction(battle) {
  if (!battle || battle.phase !== "battle" || battle.activeSide !== "enemy" || battle.turnTransition || battle.aiThinking) {
    return false;
  }
  return Boolean(chooseAiTurnAction(battle));
}

function scheduleAiPassTurn(battle) {
  window.clearTimeout(battle.aiTimer);
  battle.aiTimer = window.setTimeout(() => {
    if (state.battle !== battle || battle.phase !== "battle" || battle.activeSide !== "enemy" || battle.turnTransition || battle.aiThinking || state.pending) {
      return;
    }
    passTurn("enemy");
  }, Math.max(360, AI_THINK_MS * 0.45));
}

function passTurn(side) {
  const battle = state.battle;
  if (!battle || state.pending || battle.turnTransition || battle.aiThinking || battle.phase !== "battle" || battle.activeSide !== side) {
    return;
  }

  if (isOnlineAuthoritativeBattle()) {
    sendOnlineBattleAction({ kind: "pass_turn" });
    return;
  }

  refreshIntelValues(battle);
  battle.log.push(`${getSideName(battle, side)}结束回合，移交指挥权。`);
  state.selectedHandUid = null;
  state.pending = null;
  finishAction(side, { endTurn: true });
}

function surrenderBattle() {
  const battle = state.battle;
  if (!battle) {
    return;
  }
  const battleOver = battle.phase === "match-over";
  if (isOnlineAuthoritativeBattle() && !battleOver) {
    sendOnlineBattleAction({ kind: "surrender" });
    leaveOnlineRoom();
  } else if (isOnlineAuthoritativeBattle() && battleOver) {
    leaveOnlineRoom();
  }
  clearBattleTimers(battle);
  clearSpotlight();
  state.selectedHandUid = null;
  state.hoveredCardId = null;
  state.pending = null;
  clearDragState({ render: false });
  gameAudio.play(battleOver ? "ui.confirm" : "system.defeat");
  if (refs.bgm) {
    refs.bgm.pause();
    refs.bgm.currentTime = 0;
  }
  state.screen = "briefing";
  state.battle = null;
  state.codexOpen = false;
  state.guideOpen = false;
  state.deckBuilderOpen = false;
  state.mulligan = {
    active: false,
    selectedUids: [],
  };
  state.bgmOn = false;
  render();
}

function performAiTurn() {
  const battle = state.battle;
  if (!battle || battle.phase !== "battle" || battle.activeSide !== "enemy") {
    return;
  }
  battle.aiThinking = false;

  const play = chooseAiTurnAction(battle);
  if (!play) {
    passTurn("enemy");
    return;
  }

  if (play.kind === "board") {
    performAiBoardActivation(battle, play);
    return;
  }

  performAiHandPlay(battle, play);
}

function performAiHandPlay(battle, play) {
  if (play.card.type === "unit") {
    playUnitFromHand(battle, "enemy", play.instance.uid, play.card.line, { hidden: play.conceal });
    return;
  }

  if (play.noTarget) {
    const result = resolveNoTargetHandEffect(battle, "enemy", play.instance.uid, play.card);
    if (result !== "pending") {
      finishAction("enemy");
    }
    return;
  }

  markHandActionUsed(battle, "enemy", play.card);
  playTacticCardPresentation("enemy", play.card);
  moveHandCardToGrave(battle, "enemy", play.instance.uid);
  battle.log.push(`${getSideName(battle, "enemy")}打出 ${play.card.name}。`);
  const result = resolveEffectOnTarget(battle, {
    side: "enemy",
    cardId: play.card.id,
    ability: play.card.ability,
    target: play.target,
  });
  if (result === "pending-animation" || result === "pending") {
    return;
  }
  finishAction("enemy");
}

function performAiBoardActivation(battle, play) {
  const source = findBoardInstance(battle, "enemy", play.instance.uid);
  if (
    !source ||
    (!source.instance.hidden && !source.instance.exposed) ||
    source.instance.suppressed ||
    !canUseBoardAction(battle, "enemy") ||
    !canUseExistingUnitAction(battle, source.instance)
  ) {
    passTurn("enemy");
    return;
  }

  markBoardActionUsed(battle, "enemy");
  markUnitActed(battle, source.instance);
  if (source.instance.hidden) {
    source.instance.hidden = false;
    markCardFlip(source.instance, "reveal");
    gameAudio.playCard(play.card, { action: "reveal", side: "enemy" });
    battle.log.push(`${getSideName(battle, "enemy")}主动翻开 ${play.card.name}。`);
  } else {
    battle.log.push(`${getSideName(battle, "enemy")}命令已暴露的 ${play.card.name} 再次发动技能。`);
  }

  if (play.card.ability && ["damageGuard", "intelDeny", "fireBoost", "supply"].includes(play.card.ability.kind)) {
    resolveNoTargetBoardEffect(battle, "enemy", source.instance, play.card);
    finishAction("enemy");
    return;
  }

  const targets = getAiEffectTargets(battle, "enemy", play.card.ability, play.card, { sourceRef: source, asActingSource: true });
  if (play.card.ability && targets.length) {
    const target = chooseAiTarget(battle, play.card, targets, battle.aiDifficulty || "medium");
    const result = resolveEffectOnTarget(battle, {
      side: "enemy",
      sourceUid: source.instance.uid,
      cardId: play.card.id,
      ability: play.card.ability,
      target,
    });
    if (result === "pending-animation" || result === "pending") {
      return;
    }
    finishAction("enemy");
    return;
  }

  if (play.card.ability) {
    resolveNoTargetAbility(battle, "enemy", source.instance, play.card);
  }
  finishAction("enemy");
}

function chooseAiTurnAction(battle) {
  const difficulty = battle.aiDifficulty || "medium";
  const profile = getAiProfile(difficulty);
  const actions = getTurnActions(battle, "enemy");
  const handPlay = canAnyHandAction(battle, "enemy") ? chooseAiPlay(battle) : null;
  const boardPlay = canUseBoardAction(battle, "enemy") ? chooseAiBoardActivation(battle) : null;

  if (!handPlay && !boardPlay) {
    return null;
  }
  if (!handPlay) {
    return getAiOptionScore(boardPlay) >= profile.hiddenMinScore ? boardPlay : null;
  }
  if (!boardPlay) {
    return handPlay;
  }
  if (!canAnyHandAction(battle, "enemy")) {
    return getAiOptionScore(boardPlay) >= profile.hiddenMinScore ? boardPlay : null;
  }
  if (!canUseBoardAction(battle, "enemy")) {
    return handPlay;
  }

  const hiddenScore = getAiOptionScore(boardPlay) + profile.hiddenBias;
  const handScore = getAiOptionScore(handPlay);
  if (difficulty === "easy") {
    return hiddenScore > handScore + profile.hiddenFirstMargin && Math.random() < 0.22 ? boardPlay : handPlay;
  }
  return hiddenScore > handScore + profile.hiddenFirstMargin ? boardPlay : handPlay;
}

function chooseAiPlay(battle) {
  const difficulty = battle.aiDifficulty || "medium";
  const options = battle.hands.enemy
    .map((instance) => createAiPlayOption(battle, instance, difficulty))
    .filter(Boolean)
    .filter((option) => canUseHandAction(battle, "enemy", option.card));

  if (!options.length) {
    return null;
  }
  const weightedOptions = options.map((option) => ({
    ...option,
    kind: "hand",
    finalWeight: applyAiScoreNoise(scoreAiOption(battle, option, difficulty), difficulty),
  }));
  return chooseAiOptionByDifficulty(weightedOptions, difficulty);
}

function createAiPlayOption(battle, instance, difficulty) {
  const card = getCard(instance.cardId);
  if (card.type === "unit") {
    const conceal = chooseAiConceal(battle, card, difficulty);
    return {
      instance,
      card,
      weight: scoreAiUnitOption(battle, card, conceal, difficulty),
      target: null,
      conceal,
    };
  }
  if (canResolveHandEffectWithoutTargets(battle, "enemy", card)) {
    return { instance, card, weight: scoreAiNoTargetOption(battle, card, difficulty), noTarget: true };
  }
  const targets = getAiEffectTargets(battle, "enemy", card.ability, card);
  if (!targets.length) {
    return null;
  }
  const target = chooseAiTarget(battle, card, targets, difficulty);
  return {
    instance,
    card,
    weight: scoreAiTargetedOption(battle, card, target, difficulty),
    target,
  };
}

function chooseEasyAiPlay(options) {
  return chooseAiOptionByDifficulty(
    options.map((option) => ({ ...option, finalWeight: option.finalWeight ?? option.weight ?? 0 })),
    "easy",
  );
}

function chooseHardAiPlay(battle, options) {
  return chooseAiOptionByDifficulty(
    options.map((option) => ({ ...option, finalWeight: scoreAiOption(battle, option, "hard") })),
    "hard",
  );
}

function chooseAiBoardActivation(battle) {
  const difficulty = battle.aiDifficulty || "medium";
  if (!canUseBoardAction(battle, "enemy")) {
    return null;
  }
  const options = getAiBoardActivationOptions(battle, difficulty);
  if (!options.length) {
    return null;
  }
  return chooseAiOptionByDifficulty(options, difficulty);
}

function getAiBoardActivationOptions(battle, difficulty) {
  return getAllBoardTargets(battle, "enemy")
    .filter((target) => (target.instance.hidden || target.instance.exposed) && !target.instance.suppressed && canUseExistingUnitAction(battle, target.instance))
    .map((target) => createAiBoardActivationOption(battle, target, difficulty))
    .filter(Boolean);
}

function createAiBoardActivationOption(battle, source, difficulty) {
  const card = getCard(source.instance.cardId);
  if (!card.ability) {
    return null;
  }
  const scoreWithSourceState = () => {
    if (["damageGuard", "intelDeny", "fireBoost", "supply"].includes(card.ability.kind)) {
      return scoreAiNoTargetOption(battle, card, difficulty) + 2;
    }
    const targets = getAiEffectTargets(battle, "enemy", card.ability, card, { sourceRef: source, asActingSource: true });
    if (!targets.length) {
      return scoreAiUnitNoTargetActivation(battle, card, difficulty);
    }
    const target = chooseAiTarget(battle, card, targets, difficulty);
    return scoreAiTargetedOption(battle, card, target, difficulty) + 1.5;
  };
  const weight = source.instance.hidden ? withAiSourceVisible(source.instance, scoreWithSourceState) : scoreWithSourceState();
  const finalWeight = applyAiScoreNoise(weight + (source.instance.hidden ? getAiProfile(difficulty).hiddenBias : 0), difficulty);
  if (finalWeight < getAiProfile(difficulty).hiddenMinScore * 0.55) {
    return null;
  }
  return {
    kind: "board",
    instance: source.instance,
    card,
    source,
    weight,
    finalWeight,
  };
}

function withAiSourceVisible(instance, callback) {
  const previousHidden = instance.hidden;
  const previousExposed = instance.exposed;
  instance.hidden = false;
  instance.exposed = false;
  try {
    return callback();
  } finally {
    instance.hidden = previousHidden;
    instance.exposed = previousExposed;
  }
}

function chooseAiOptionByDifficulty(options, difficulty) {
  if (!options.length) {
    return null;
  }
  const profile = getAiProfile(difficulty);
  const sorted = options.slice().sort((left, right) => getAiOptionScore(right) - getAiOptionScore(left));
  if (difficulty === "easy") {
    if (sorted.length > 1 && Math.random() < profile.mistakeChance) {
      const lowerHalf = sorted.slice(Math.max(1, Math.floor(sorted.length / 2)));
      return lowerHalf[Math.floor(Math.random() * lowerHalf.length)] || sorted[sorted.length - 1];
    }
    const relaxedPool = sorted.slice(0, Math.min(sorted.length, profile.topPool));
    return relaxedPool[Math.floor(Math.random() * relaxedPool.length)] || sorted[0];
  }
  if (difficulty === "medium") {
    const topPool = sorted.slice(0, Math.min(sorted.length, profile.topPool));
    if (topPool.length > 1 && Math.random() < 0.18) {
      return chooseWeightedAiOption(topPool);
    }
    if (sorted.length > 1 && Math.random() < profile.mistakeChance) {
      return sorted[1];
    }
  }
  return sorted[0];
}

function chooseWeightedAiOption(options) {
  const minScore = Math.min(...options.map((option) => getAiOptionScore(option)));
  const weights = options.map((option) => Math.max(0.2, getAiOptionScore(option) - minScore + 0.8));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = Math.random() * total;
  for (let index = 0; index < options.length; index += 1) {
    roll -= weights[index];
    if (roll <= 0) {
      return options[index];
    }
  }
  return options[0];
}

function getAiOptionScore(option) {
  return Number.isFinite(option?.finalWeight) ? option.finalWeight : option?.weight || 0;
}

function chooseAiConceal(battle, card, difficulty) {
  if (!canConcealCardForSide(battle, "enemy", card)) {
    return false;
  }
  const profile = getAiProfile(difficulty);
  const immediateTargets = getAiEffectTargets(battle, "enemy", card.ability, card);
  const immediateScore = scoreBestAiEffectTarget(battle, card, immediateTargets, difficulty);
  if (immediateScore >= (difficulty === "hard" ? 19 : 23)) {
    return false;
  }
  const highValue = isHighValueAiCard(card);
  if (difficulty === "easy") {
    if (card.line === "support") {
      return Math.random() < profile.concealSupportChance;
    }
    return highValue && Math.random() < profile.concealHighValueChance;
  }
  if (difficulty === "hard") {
    return card.line === "support" || highValue || card.rarity === "epic" || card.rarity === "legendary";
  }
  if (card.line === "support") {
    return getTotalScore(battle, "enemy") >= getTotalScore(battle, "player") || Math.random() < profile.concealSupportChance;
  }
  return highValue && Math.random() < profile.concealHighValueChance;
}

function chooseAiTarget(battle, card, targets, difficulty) {
  const profile = getAiProfile(difficulty);
  if (Math.random() < profile.targetRandomChance) {
    return targets[Math.floor(Math.random() * targets.length)];
  }
  return targets
    .slice()
    .sort((left, right) => scoreAiTarget(battle, card, card.ability, right, difficulty) - scoreAiTarget(battle, card, card.ability, left, difficulty))[0];
}

function scoreAiOption(battle, option, difficulty) {
  if (option.target) {
    return scoreAiTargetedOption(battle, option.card, option.target, difficulty);
  }
  if (option.noTarget) {
    return scoreAiNoTargetOption(battle, option.card, difficulty);
  }
  return scoreAiUnitOption(battle, option.card, option.conceal, difficulty);
}

function scoreAiUnitOption(battle, card, conceal, difficulty) {
  const profile = getAiProfile(difficulty);
  const ownFrontline = countAliveUnitsOnLine(battle, "enemy", "frontline");
  let score = (card.power || 0) + getRarityAiValue(card) + (card.ability ? 2 : 0);
  if (card.line === "frontline" && !ownFrontline) {
    score += difficulty === "hard" ? 6 : difficulty === "medium" ? 4 : 2;
  }
  if (card.line === "support" && !ownFrontline) {
    score -= difficulty === "hard" ? 2.5 : difficulty === "medium" ? 2 : 0.5;
  }
  if (isHighValueAiCard(card)) {
    score += difficulty === "hard" ? 3.5 : difficulty === "medium" ? 2 : 0.4;
  }
  if (conceal) {
    score += (isHighValueAiCard(card) ? 3.2 : 1.2) * profile.protectionBonus;
  } else if (card.ability) {
    const targets = getAiEffectTargets(battle, "enemy", card.ability, card);
    score += scoreBestAiEffectTarget(battle, card, targets, difficulty) * 0.32;
  }
  if (getTotalScore(battle, "enemy") < getTotalScore(battle, "player")) {
    score += (card.power || 0) * (difficulty === "hard" ? 0.55 : 0.25);
  }
  return score;
}

function scoreAiNoTargetOption(battle, card, difficulty) {
  const profile = getAiProfile(difficulty);
  const ability = card.ability || {};
  let score = card.type === "strategy" ? 8 : 4;
  if (ability.kind === "supply") {
    if (battle.hands.enemy.length <= 3) {
      score += difficulty === "hard" ? 6 : difficulty === "medium" ? 4 : 1.5;
    }
    if (battle.hands.enemy.length >= 6) {
      score -= difficulty === "hard" ? 5 : 2;
    }
  }
  if (ability.kind === "fireBoost") {
    score += (hasAiCallableFireSource(battle) ? 4 : -2) + countAiExposedTargets(battle, "player") * 2.2 * profile.chainBonus;
  }
  if (ability.kind === "damageGuard" || ability.kind === "intelDeny") {
    const exposedValue = getAiBestOwnExposedValue(battle);
    score += exposedValue * 0.55 * profile.protectionBonus;
    if (ability.kind === "damageGuard" && battle.guards.enemy.length) {
      score -= 4;
    }
    if (ability.kind === "intelDeny" && battle.intelDenials.enemy.length) {
      score -= 4;
    }
  }
  return score;
}

function scoreAiTargetedOption(battle, card, target, difficulty) {
  const profile = getAiProfile(difficulty);
  let score = card.type === "strategy" ? 8 : card.type === "tactic" ? 6 : 4;
  if (isStrikeAiCard(card)) {
    score += 2.5;
  }
  score += scoreAiTarget(battle, card, card.ability, target, difficulty) * profile.targetMultiplier;
  if (isExposureAbility(card.ability)) {
    score += scoreAiExposureChain(battle, card.ability, difficulty);
  }
  return score * profile.tacticMultiplier;
}

function scoreAiTarget(battle, sourceCard, ability, target, difficulty = "medium") {
  if (target.side === "enemy") {
    return scoreAiOwnTarget(battle, sourceCard, ability, target, difficulty);
  }
  return scoreAiEnemyTarget(battle, sourceCard, ability, target, difficulty);
}

function scoreAiOwnTarget(battle, sourceCard, ability, target, difficulty) {
  void battle;
  void sourceCard;
  const profile = getAiProfile(difficulty);
  const targetCard = getCard(target.instance.cardId);
  const currentPower = getCurrentPower(target.instance);
  let score = currentPower * 0.8 + getRarityAiValue(targetCard);
  if (isHighValueAiCard(targetCard)) {
    score += 5 * profile.protectionBonus;
  }
  if (target.lineId === "support") {
    score += 2.5 * profile.protectionBonus;
  }
  if (target.instance.exposed) {
    score += 8 * profile.protectionBonus;
  }
  if (ability?.kind === "repair") {
    score += target.instance.damage * 5 + (target.instance.damage >= currentPower ? 8 : 0);
  }
  if (["smoke", "camouflage"].includes(ability?.kind)) {
    score += target.instance.exposed ? 7 * profile.protectionBonus : 1.5;
  }
  if (ability?.kind === "decoy") {
    score += (target.instance.decoy ? -8 : 4) + (isHighValueAiCard(targetCard) ? 3 : 0);
  }
  if (ability?.kind === "airspaceControl") {
    score += aiTargetHasAnyKnownTag(target, ["重型防空", "伴随防空"]) ? 5 : 1;
  }
  return score;
}

function scoreAiEnemyTarget(battle, sourceCard, ability, target, difficulty) {
  const profile = getAiProfile(difficulty);
  const targetCard = getAiKnownTargetCard(target);
  const currentPower = getAiTargetCurrentPower(target);
  const knownDamage = getAiKnownTargetDamage(target);
  const estimatedDamage = estimateAiDamage(battle, sourceCard, ability, target);
  const targetValue = getAiTargetEstimatedValue(target);
  let score = currentPower + knownDamage * 1.5 + targetValue * 0.35;
  if (estimatedDamage >= currentPower && currentPower > 0) {
    score += (18 + targetValue) * profile.killBonus;
  } else {
    score += estimatedDamage * 2.3;
  }
  if (target.lineId === "support") {
    score += 2.5;
  }
  if (target.instance.exposed) {
    score += 3.2 * profile.chainBonus;
  }
  if (target.instance.hidden) {
    score += isExposureAbility(ability) || ability?.kind === "suppress" ? 5.5 * profile.chainBonus : -4;
    if (target.lineId === "support") {
      score += 2.5 * profile.chainBonus;
    }
  }
  if (ability?.kind === "exposeAndCallFire" && findCallableUnit(battle, "enemy", ability.callerTags)) {
    score += 7 * profile.chainBonus;
  }
  if (ability?.kind === "suppress" && target.instance.hidden) {
    score += 4 * profile.chainBonus;
  }
  if (isStrikeAiCard(sourceCard) && target.instance.exposed) {
    score += 4.5 * profile.chainBonus;
  }
  if (targetCard && isHighValueAiCard(targetCard)) {
    score += 4.5;
  }
  if (aiTargetHasAnyKnownTag(target, ["重型防空", "榴弹炮", "火箭炮", "无人机", "导弹"])) {
    score += 3.2;
  }
  score += scoreAiVictoryRace(battle, target, estimatedDamage, profile);
  return score;
}

function estimateAiDamage(battle, sourceCard, ability, target) {
  if (!ability) {
    return 0;
  }
  if (["damage", "damageOrSelfBonus", "strike", "areaDamage"].includes(ability.kind)) {
    if (!canAiKnowTargetIdentity(target)) {
      return getBasicAbilityAmount(ability, target.lineId);
    }
    return getDamageAmount(battle, "enemy", ability, target.instance, target.lineId, sourceCard) || 0;
  }
  if (ability.kind === "exposeOrDamage") {
    if (target.instance.hidden) {
      return 0;
    }
    if (ability.damageIfExposed && target.instance.exposed) {
      return ability.damageIfExposed;
    }
    if (ability.damageIfTag && aiTargetHasTag(target, ability.damageIfTag.tag)) {
      return ability.damageIfTag.amount;
    }
  }
  if (ability.kind === "callFire" || ability.kind === "counterBattery") {
    const caller = findCallableUnit(battle, "enemy", ability.callerTags);
    const fire = ability.kind === "callFire" ? caller?.card?.fire : ability;
    return fire?.amount || 0;
  }
  return 0;
}

function getAiProfile(difficulty) {
  return AI_DIFFICULTY_PROFILES[difficulty] || AI_DIFFICULTY_PROFILES.medium;
}

function applyAiScoreNoise(score, difficulty) {
  const noise = getAiProfile(difficulty).scoreNoise;
  if (!noise) {
    return score;
  }
  return score + (Math.random() - 0.35) * noise;
}

function getAiEffectTargets(battle, side, ability, sourceCard, options = {}) {
  if (!ability) {
    return [];
  }
  const targets = getValidEffectTargets(battle, side, ability, sourceCard, options);
  if (side !== "enemy" || isExposureAbility(ability) || ability.kind === "suppress") {
    return targets;
  }
  if (ability.requiresAnyTag || ability.requiresExposedOrAnyTag) {
    return targets.filter((target) => target.side !== "player" || !target.instance.hidden || canRevealHiddenTargetForAbility(ability, target.instance));
  }
  return targets;
}

function scoreBestAiEffectTarget(battle, sourceCard, targets, difficulty) {
  if (!targets?.length) {
    return 0;
  }
  return Math.max(...targets.map((target) => scoreAiTarget(battle, sourceCard, sourceCard.ability, target, difficulty)));
}

function scoreAiUnitNoTargetActivation(battle, card, difficulty) {
  if (!card.ability) {
    return 0;
  }
  if (card.ability.kind === "damageOrSelfBonus" && card.ability.selfBonusIfNoTargets) {
    return 5 + card.ability.selfBonusIfNoTargets * 2;
  }
  if (card.ability.kind === "repair") {
    return scoreAiNoTargetOption(battle, card, difficulty) * 0.5;
  }
  return card.ability.sourceExposes ? -2 : 1;
}

function canAiKnowTargetIdentity(target) {
  return target.side !== "player" || !target.instance.hidden;
}

function getAiKnownTargetCard(target) {
  return canAiKnowTargetIdentity(target) ? getCard(target.instance.cardId) : null;
}

function getAiTargetCurrentPower(target) {
  if (!canAiKnowTargetIdentity(target)) {
    return target.lineId === "support" ? 4.5 : 3.5;
  }
  return getCurrentPower(target.instance);
}

function getAiKnownTargetDamage(target) {
  return canAiKnowTargetIdentity(target) ? target.instance.damage : 0;
}

function getAiTargetEstimatedValue(target) {
  const targetCard = getAiKnownTargetCard(target);
  if (targetCard) {
    return getCardTargetValue(targetCard) || getCurrentPower(target.instance);
  }
  return target.lineId === "support" ? 4 : 3;
}

function aiTargetHasTag(target, tag) {
  return canAiKnowTargetIdentity(target) && hasTag(target.instance, tag);
}

function aiTargetHasAnyKnownTag(target, tags = []) {
  return tags.some((tag) => aiTargetHasTag(target, tag));
}

function isHighValueAiCard(card) {
  if (!card) {
    return false;
  }
  return (
    card.rarity === "epic" ||
    card.rarity === "legendary" ||
    card.tags.some((tag) => ["侦察", "无人机", "导弹", "榴弹炮", "火箭炮", "重型防空", "战斗机", "轰炸机"].includes(tag))
  );
}

function isStrikeAiCard(card) {
  if (!card?.ability) {
    return false;
  }
  return (
    ["strike", "areaDamage", "damage"].includes(card.ability.kind) &&
    (card.type !== "unit" || card.tags.some((tag) => ["导弹", "战斗机", "轰炸机", "火箭炮", "榴弹炮"].includes(tag)))
  );
}

function isExposureAbility(ability) {
  return ["expose", "exposeAndCallFire", "exposeDeployTag", "exposeAndSupply", "exposeOrDamage"].includes(ability?.kind);
}

function getRarityAiValue(card) {
  return {
    common: 0.4,
    uncommon: 0.8,
    rare: 1.4,
    epic: 2.2,
    legendary: 3,
  }[card?.rarity] || 0;
}

function hasAiCallableFireSource(battle) {
  return Boolean(findCallableUnit(battle, "enemy", ["榴弹炮", "火箭炮", "导弹"]));
}

function countAiExposedTargets(battle, side) {
  return getAllBoardTargets(battle, side).filter((target) => target.instance.exposed && !target.instance.hidden).length;
}

function getAiBestOwnExposedValue(battle) {
  return getAllBoardTargets(battle, "enemy")
    .filter((target) => target.instance.exposed && !target.instance.hidden)
    .reduce((best, target) => Math.max(best, getCurrentPower(target.instance) + (isHighValueAiCard(getCard(target.instance.cardId)) ? 4 : 0)), 0);
}

function scoreAiExposureChain(battle, ability, difficulty) {
  const profile = getAiProfile(difficulty);
  let score = 0;
  if (ability?.kind === "exposeAndCallFire" && findCallableUnit(battle, "enemy", ability.callerTags)) {
    score += 6;
  }
  const followUp = battle.hands.enemy.some((instance) => {
    const card = getCard(instance.cardId);
    return card.ability?.requiresExposed || card.ability?.requiresExposedOrAnyTag || isStrikeAiCard(card);
  });
  if (followUp) {
    score += 4;
  }
  return score * profile.chainBonus;
}

function scoreAiVictoryRace(battle, target, estimatedDamage, profile) {
  const currentPower = getAiTargetCurrentPower(target);
  if (estimatedDamage < currentPower || currentPower <= 0) {
    return 0;
  }
  const targetValue = getAiTargetEstimatedValue(target);
  let score = 0;
  if (getTotalScore(battle, "enemy") + targetValue >= VICTORY_SCORE) {
    score += 24 * profile.scoreRaceBonus;
  }
  if (getTotalScore(battle, "player") > getTotalScore(battle, "enemy")) {
    score += Math.min(8, getTotalScore(battle, "player") - getTotalScore(battle, "enemy")) * 0.6 * profile.scoreRaceBonus;
  }
  return score;
}

function getBasicAbilityAmount(ability, lineId) {
  if (!ability) {
    return 0;
  }
  if (Number.isFinite(ability.hiddenAmount)) {
    return ability.hiddenAmount;
  }
  if (Number.isFinite(ability.lineAmounts?.[lineId])) {
    return ability.lineAmounts[lineId];
  }
  if (ability.fallbackRows?.includes(lineId) && Number.isFinite(ability.fallbackAmount)) {
    return ability.fallbackAmount;
  }
  return ability.amount || ability.secondaryAmount || 0;
}

function scheduleAi() {
  const battle = state.battle;
  if (!battle || battle.phase !== "battle" || battle.activeSide !== "enemy" || battle.turnTransition) {
    return;
  }
  window.clearTimeout(battle.aiTimer);
  battle.aiThinking = true;
  render();
  battle.aiTimer = window.setTimeout(performAiTurn, AI_THINK_MS);
}

function resolveBattleEndIfReady(battle) {
  const playerScore = getTotalScore(battle, "player");
  const enemyScore = getTotalScore(battle, "enemy");
  if (playerScore >= VICTORY_SCORE || enemyScore >= VICTORY_SCORE) {
    const winner = playerScore === enemyScore ? "draw" : playerScore > enemyScore ? "player" : "enemy";
    battle.phase = "match-over";
    battle.activeSide = null;
    battle.matchWinner = winner;
    clearBattleTimers(battle);
    gameAudio.play(winner === "draw" ? "system.draw" : winner === "player" ? "system.victory" : "system.defeat");
    battle.log.push(`战场得分达标：美国 ${playerScore} : 俄罗斯 ${enemyScore}，${winner === "draw" ? "双方平局" : `${getSideName(battle, winner)}获胜`}。`);
    return true;
  }

  if (!battle.finalActions) {
    return false;
  }

  if (battle.finalActions.player > 0 || battle.finalActions.enemy > 0) {
    return false;
  }

  revealAllHidden(battle);
  const playerBoardPower = getBoardPowerTotal(battle, "player");
  const enemyBoardPower = getBoardPowerTotal(battle, "enemy");
  battle.phase = "match-over";
  battle.activeSide = null;
  battle.matchWinner =
    playerScore === enemyScore
      ? playerBoardPower === enemyBoardPower
        ? "draw"
        : playerBoardPower > enemyBoardPower
          ? "player"
          : "enemy"
      : playerScore > enemyScore
        ? "player"
        : "enemy";
  clearBattleTimers(battle);
  gameAudio.play(battle.matchWinner === "draw" ? "system.draw" : battle.matchWinner === "player" ? "system.victory" : "system.defeat");
  if (battle.matchWinner === "draw") {
    battle.log.push(`补给耗尽最终结算：美国 ${playerScore} : 俄罗斯 ${enemyScore}，场上生命 ${playerBoardPower} : ${enemyBoardPower}，整场平局。`);
  } else {
    battle.log.push(`补给耗尽最终结算：美国 ${playerScore} : 俄罗斯 ${enemyScore}，场上生命 ${playerBoardPower} : ${enemyBoardPower}，${getSideName(battle, battle.matchWinner)}获胜。`);
  }
  return true;
}

function moveBoardToGraves(battle) {
  ["player", "enemy"].forEach((side) => {
    LINES.forEach((line) => {
      battle.board[side][line.id].forEach((instance) => battle.graves[side].push(instance));
      battle.board[side][line.id] = [];
    });
  });
}

function autoPassEmptyHands(battle) {
  ["player", "enemy"].forEach((side) => {
    if (battle.hands[side].length === 0 && !battle.passed[side]) {
      battle.passed[side] = true;
      battle.log.push(`${getSideName(battle, side)}已无手牌，被迫 Pass。`);
    }
  });
}

function getValidEffectTargets(battle, side, ability, sourceCard, options = {}) {
  if (!ability) {
    return [];
  }
  if (ability.intelCost && battle.intel[side] < ability.intelCost) {
    return [];
  }

  if (ability.kind === "smoke") {
    return getAllBoardTargets(battle, side).filter((target) => {
      if (!target.instance.exposed) {
        return false;
      }
      if (ability.rows && !ability.rows.includes(target.lineId)) {
        return false;
      }
      return matchesTargetRequirements(target.instance, ability);
    });
  }

  if (ability.kind === "decoy") {
    return getAllBoardTargets(battle, side).filter((target) => {
      if (ability.rows && !ability.rows.includes(target.lineId)) {
        return false;
      }
      return !target.instance.decoy;
    });
  }

  if (ability.kind === "camouflage") {
    return getAllBoardTargets(battle, side).filter((target) => {
      if (ability.rows && !ability.rows.includes(target.lineId)) {
        return false;
      }
      return !target.instance.exposed;
    });
  }

  if (ability.kind === "airspaceControl") {
    return getAllBoardTargets(battle, side).filter((target) => matchesTargetRequirements(target.instance, ability));
  }

  if (ability.kind === "repair") {
    return getAllBoardTargets(battle, side).filter((target) => target.instance.damage > 0 && matchesTargetRequirements(target.instance, ability));
  }

  if (ability.kind === "fortify") {
    return [];
  }

  const opponent = side === "player" ? "enemy" : "player";
  const enemyTargets = getAllBoardTargets(battle, opponent);

  if (ability.kind === "suppress") {
    return enemyTargets.filter((target) => {
      if (ability.rows && !ability.rows.includes(target.lineId)) {
        return false;
      }
      if (!canTargetForAbility(battle, side, target, { ...ability, canRevealHidden: true }, sourceCard)) {
        return false;
      }
      return (target.instance.hidden && !target.instance.suppressed) || (ability.allowExposedTargets && target.instance.exposed);
    });
  }

  if (ability.kind === "expose" || ability.kind === "exposeAndCallFire" || ability.kind === "exposeDeployTag" || ability.kind === "exposeAndSupply") {
    const targets = enemyTargets.filter((target) => {
      if (!ability.rows.includes(target.lineId)) {
        return false;
      }
      if (!canTargetForAbility(battle, side, target, { ...ability, canRevealHidden: true }, sourceCard)) {
        return false;
      }
      return ability.allowExposedTargets ? true : ability.hiddenOnly ? target.instance.hidden : !target.instance.exposed;
    });
    return withBreakthroughTargets(battle, side, ability, sourceCard, targets, options);
  }

  if (ability.kind === "exposeOrDamage") {
    const hiddenTargets = enemyTargets.filter((target) => ability.exposeRows.includes(target.lineId) && target.instance.hidden);
    if (hiddenTargets.length) {
      return hiddenTargets;
    }
    return enemyTargets.filter(
      (target) =>
        ability.damageRows.includes(target.lineId) &&
        !target.instance.hidden &&
        ((ability.damageIfExposed && target.instance.exposed) || (ability.damageIfTag && hasTag(target.instance, ability.damageIfTag.tag))),
    );
  }

  if (ability.kind === "damage" || ability.kind === "damageOrSelfBonus" || ability.kind === "strike" || ability.kind === "areaDamage") {
    if (ability.requiresOwnSupportTag && !hasOwnAnyTagOnLine(battle, side, "support", ability.requiresOwnSupportTag)) {
      return [];
    }
    const collectTargets = (profile = {}) => {
      const activeAbility = { ...ability, ...profile };
      return enemyTargets.filter((target) => {
        if (!activeAbility.rows?.includes(target.lineId)) {
          return false;
        }
        if (!canTargetForAbility(battle, side, target, activeAbility, { sourceRef: options.sourceRef, sourceCard })) {
          return false;
        }
        return matchesTargetRequirements(target.instance, activeAbility);
      });
    };
    if (ability.preferredTargetProfile) {
      const preferredTargets = withBreakthroughTargets(battle, side, ability, sourceCard, collectTargets(ability.preferredTargetProfile), options);
      if (preferredTargets.length) {
        return preferredTargets;
      }
      const fallbackTargets = withBreakthroughTargets(battle, side, ability, sourceCard, collectTargets(ability.fallbackTargetProfile || {}), options);
      if (fallbackTargets.length || !ability.fallbackRows) {
        return fallbackTargets;
      }
    }
    const targets = collectTargets();
    const targetsWithBreakthrough = withBreakthroughTargets(battle, side, ability, sourceCard, targets, options);
    if (targetsWithBreakthrough.length || !ability.fallbackRows) {
      return targetsWithBreakthrough;
    }
    return enemyTargets.filter((target) => {
      if (!ability.fallbackRows.includes(target.lineId)) {
        return false;
      }
      if (target.instance.hidden) {
        return false;
      }
      const fallbackAbility = { ...ability, requiresExposed: false };
      return canTargetForAbility(battle, side, target, fallbackAbility, { sourceRef: options.sourceRef, sourceCard }) && matchesTargetRequirements(target.instance, fallbackAbility);
    });
  }

  if (ability.kind === "damageBoost") {
    return enemyTargets.filter((target) => ability.rows.includes(target.lineId) && target.instance.exposed && !target.instance.hidden);
  }

  if (ability.kind === "callFire") {
    if (!findCallableUnit(battle, side, ability.callerTags)) {
      return [];
    }
    return enemyTargets.filter((target) => {
      const caller = findCallableUnit(battle, side, ability.callerTags);
      const fire = caller?.card?.fire || {};
      const rows = fire.rows || ["frontline", "support"];
      return caller && rows.includes(target.lineId) && canTargetForAbility(battle, side, target, { ...fire, rows, canRevealHidden: fire.canRevealHidden }, { sourceRef: caller, sourceCard: caller.card }) && matchesTargetRequirements(target.instance, fire);
    });
  }

  if (ability.kind === "counterBattery") {
    if (!findCallableUnit(battle, side, ability.callerTags)) {
      return [];
    }
    return enemyTargets.filter((target) => target.lineId === "support" && target.instance.exposed && !target.instance.hidden);
  }

  return [];
}

function withBreakthroughTargets(battle, side, ability, sourceCard, targets, options = {}) {
  const sourceRef = options.sourceRef;
  if (!canSourceUseBreakthrough(battle, side, sourceRef, { ignoreActed: Boolean(options.asActingSource) })) {
    return targets;
  }
  const opponent = side === "player" ? "enemy" : "player";
  const hiddenSupportTargets = getAllBoardTargets(battle, opponent)
    .filter((target) => target.lineId === "support" && target.instance.hidden && getCurrentPower(target.instance) > 0)
    .filter((target) => canBreakthroughStrikeTarget(battle, side, sourceCard, target, ability, sourceRef))
    .map((target) => ({ ...target, breakthrough: true }));
  if (!hiddenSupportTargets.length) {
    return targets;
  }
  const breakthroughIds = new Set(hiddenSupportTargets.map((target) => target.uid));
  const normalizedTargets = targets.map((target) => {
    if (target.lineId === "support" && target.instance.hidden && breakthroughIds.has(target.uid)) {
      return { ...target, breakthrough: true };
    }
    return target;
  });
  const existingIds = new Set(normalizedTargets.map((target) => target.uid));
  const extraTargets = hiddenSupportTargets.filter((target) => !existingIds.has(target.uid));
  return [...normalizedTargets, ...extraTargets];
}

function canBreakthroughStrikeTarget(battle, side, sourceCard, target, ability, sourceRef = null) {
  const breakthroughAbility = getBreakthroughStrikeAbility(ability);
  return Boolean(
    breakthroughAbility &&
      canTargetForAbility(battle, side, target, breakthroughAbility, { sourceRef, sourceCard, ignoreFrontlineSupportBlock: true }) &&
      matchesTargetRequirements(target.instance, breakthroughAbility),
  );
}

function getBreakthroughStrikeAbility(ability) {
  if (!ability || !["damage", "damageOrSelfBonus", "strike"].includes(ability.kind)) {
    return null;
  }
  return {
    ...ability,
    rows: [...new Set([...(ability.rows || []), "support"])],
    canRevealHidden: true,
    allowSupport: true,
    requiresExposed: false,
  };
}

function getAllBoardTargets(battle, side) {
  const targets = [];
  LINES.forEach((line) => {
    battle.board[side][line.id].forEach((instance) => {
      targets.push({ side, lineId: line.id, uid: instance.uid, instance });
    });
  });
  return targets;
}

function isPendingTarget(side, uid) {
  return Boolean(
    state.pending?.targets?.some((target) => target.side === side && target.uid === uid) ||
      state.dragTargets.some((target) => target.side === side && target.uid === uid),
  );
}

function chooseBestTarget(battle, targets) {
  if (targets.some((target) => target.instance.damage > 0)) {
    return targets.slice().sort((left, right) => right.instance.damage - left.instance.damage)[0];
  }
  return targets
    .slice()
    .sort((left, right) => getCurrentPower(right.instance) - getCurrentPower(left.instance))[0];
}

function getDamageAmount(battle, side, ability, target, lineId, sourceCard = null, context = {}) {
  const bonus = ability.bonuses?.find((item) => hasTag(target, item.tag));
  let amount = bonus?.amount || ability.lineAmounts?.[lineId] || (ability.fallbackRows?.includes(lineId) && !ability.rows?.includes(lineId) ? ability.fallbackAmount : ability.amount);
  if (context.areaIndex > 0 && Number.isFinite(ability.secondaryAmount)) {
    amount = ability.secondaryAmount;
    const secondaryBonus = ability.secondaryBonuses?.find((item) => hasTag(target, item.tag));
    if (secondaryBonus) {
      amount = secondaryBonus.amount;
    } else if (ability.primaryTagSecondaryAmount && context.primaryTarget && hasTag(context.primaryTarget, ability.primaryTagSecondaryAmount.tag)) {
      amount = ability.primaryTagSecondaryAmount.amount;
    }
  }
  if (target.exposedAtAction === battle.actionSerial && ability.hiddenAmount) {
    amount = ability.hiddenAmount;
  }
  if (target.damage > 0 && ability.damagedAmount) {
    amount = ability.damagedAmount;
  }
  if (ability.damagedBonus && target.damage > 0) {
    amount += ability.damagedBonus;
  }
  if (ability.exposedBonus && target.exposed) {
    amount += ability.exposedBonus;
  }
  if (ability.flatBonus) {
    amount += ability.flatBonus;
  }
  if (
    ability.ownTagBonus &&
    hasOwnTagOnLine(battle, side, ability.ownTagBonus.line, ability.ownTagBonus.tag, { exposedOnly: Boolean(ability.ownTagBonus.exposedOnly) }) &&
    (!ability.ownTagBonus.targetTags || ability.ownTagBonus.targetTags.some((tag) => hasTag(target, tag)))
  ) {
    amount += ability.ownTagBonus.amount;
    if (Number.isFinite(ability.ownTagBonus.cap)) {
      amount = Math.min(amount, ability.ownTagBonus.cap);
    }
  }
  if (ability.ownAnyTagBonus && hasOwnAnyTagOnLine(battle, side, ability.ownAnyTagBonus.line, ability.ownAnyTagBonus.tags)) {
    amount += ability.ownAnyTagBonus.amount;
  }
  if (ability.ownSameCardBonus && sourceCard && countOwnVisibleCardOnLine(battle, side, ability.ownSameCardBonus.line, sourceCard.id) > 1) {
    amount += ability.ownSameCardBonus.amount;
  }
  if (ability.scoutExtraDamage && hasOwnTagOnLine(battle, side, "frontline", "侦察")) {
    amount += ability.scoutExtraDamage;
  }
  if (ability.artillerySynergyAmount && hasOwnArtillery(battle, side)) {
    amount = Math.max(amount, ability.artillerySynergyAmount);
  }
  if (ability.artillerySynergyBonus && hasOwnArtillery(battle, side)) {
    amount += ability.artillerySynergyBonus;
  }
  if (ability.antiInfiltrationAmount && opponentControlsTag(battle, side, "渗透")) {
    amount = Math.max(amount, ability.antiInfiltrationAmount);
  }
  return amount;
}

function getRepairAmount(ability, target) {
  if (ability.full) {
    return target.damage;
  }
  const bonus = ability.bonuses?.find((item) => hasTag(target, item.tag));
  return bonus?.amount || ability.amount;
}

function getContinuousSum(battle, side, key) {
  let sum = 0;
  LINES.forEach((line) => {
    battle.board[side][line.id].forEach((instance) => {
      const card = getCard(instance.cardId);
      const canProvide = key === "intel" || !instance.hidden;
      if (card.continuous?.[key] && getCurrentPower(instance) > 0 && canProvide) {
        sum += card.continuous[key];
      }
    });
  });
  return sum;
}

function applyDeploySelfBonuses(battle, side, instance, card) {
  const ability = card.ability;
  if (!ability?.selfBonusIfOwnScout) {
    return;
  }
  if (hasOwnTagOnLine(battle, side, "frontline", "侦察") || hasOwnTagOnLine(battle, side, "support", "侦察")) {
    instance.bonus += ability.selfBonusIfOwnScout;
    battle.log.push(`${card.name} 获得侦察引导，战力 +${ability.selfBonusIfOwnScout}。`);
  }
}

function resolveNoTargetHandEffect(battle, side, uid, card) {
  if (!spendIntelForAbility(battle, side, card.ability, card)) {
    return "failed";
  }
  markHandActionUsed(battle, side, card);
  if (card.ability?.kind !== "supply") {
    playTacticCardPresentation(side, card);
  }
  moveHandCardToGrave(battle, side, uid);
  battle.log.push(`${getSideName(battle, side)}打出 ${card.name}。`);
  gameAudio.playCard(card, { action: "effect", ability: card.ability, side });
  return resolveNoTargetEffect(battle, side, null, card);
}

function resolveNoTargetBoardEffect(battle, side, instance, card) {
  if (!spendIntelForAbility(battle, side, card.ability, card)) {
    return "failed";
  }
  gameAudio.playCard(card, { action: "effect", ability: card.ability, side });
  return resolveNoTargetEffect(battle, side, instance, card);
}

function getNoLegalTargetMessage(card) {
  if (card.ability?.requiresExposed) {
    return `${card.name} 暂无已暴露的合法目标。`;
  }
  if (card.ability?.requiresExposedOrAnyTag) {
    return `${card.name} 暂无已暴露或符合标签条件的合法目标。`;
  }
  return `${card.name} 暂无合法目标。`;
}

function resolveNoTargetEffect(battle, side, sourceInstance, card) {
  const ability = card.ability || {};
  if (ability.kind === "fireBoost") {
    battle.fireBoost[side] = Math.max(battle.fireBoost[side] || 0, ability.amount || 1);
    battle.log.push(`${card.name} 完成无人校射，己方下一次远火伤害 +${ability.amount || 1}。`);
  }

  if (ability.kind === "supply") {
    return resolveSupplyDraw(battle, side, ability, card);
  }

  if (ability.kind === "repair" && ability.drawAlternative) {
    return resolveSupplyDraw(battle, side, { draw: ability.drawAlternative, keep: ability.keepAlternative || 1 }, card);
  }

  if (ability.kind === "damageGuard") {
    battle.guards[side].push({
      reduction: ability.reduction || 1,
      sourceTags: ability.sourceTags || [],
      sourceName: card.name,
    });
    battle.log.push(`${card.name} 建立诱饵窗口，下一次匹配打击伤害 -${ability.reduction || 1}。`);
    drawIfOwnCardPresent(battle, side, ability.drawIfOwnCard, card);
  }

  if (ability.kind === "intelDeny") {
    battle.log.push(`${card.name} 的旧版反引导效果已停用；当前规则使用电子压制处理隐蔽和暴露目标。`);
    drawIfOwnCardPresent(battle, side, ability.drawIfOwnCard, card);
  }

  if (ability.sourceExposes && sourceInstance) {
    exposeInstance(battle, { side, lineId: findBoardInstance(battle, side, sourceInstance.uid)?.lineId, instance: sourceInstance }, card.name, { ignoreDecoy: true });
  }
  return "resolved";
}

function resolveSupplyDraw(battle, side, ability, sourceCard) {
  const drawAmount = ability.draw || 1;
  const keepAmount = ability.keep || drawAmount;
  const drawn = [];
  for (let index = 0; index < drawAmount; index += 1) {
    const card = battle.decks[side].shift();
    if (!card) {
      triggerSupplyExhaustion(battle, side);
      break;
    }
    drawn.push(card);
  }
  if (!drawn.length) {
    battle.log.push(`${sourceCard.name} supply draw failed: deck is empty.`);
    return "resolved";
  }
  if (side === "player" && drawn.length > keepAmount) {
    state.pending = {
      kind: "supplyChoice",
      side,
      cardId: sourceCard.id,
      ability,
      drawn,
      keepAmount,
    };
    gameAudio.play(drawn.length > 1 ? "card.drawHand" : "card.draw", { count: drawn.length, side });
    battle.log.push(`${sourceCard.name} revealed ${drawn.length} supply choices; waiting to keep ${keepAmount}.`);
    return "pending";
  }
  const kept = chooseSupplyCardsForAi(battle, side, drawn, keepAmount);
  completeSupplyDraw(battle, side, sourceCard, drawn, kept);
  return "resolved";
}

function resolveImmediateSupplyDraw(battle, side, ability, sourceCard) {
  const drawAmount = ability.draw || 1;
  const keepAmount = ability.keep || drawAmount;
  const drawn = [];
  for (let index = 0; index < drawAmount; index += 1) {
    const card = battle.decks[side].shift();
    if (!card) {
      triggerSupplyExhaustion(battle, side);
      break;
    }
    drawn.push(card);
  }
  if (!drawn.length) {
    battle.log.push(`${sourceCard.name} 未能完成侦查补给，牌库已空。`);
    return;
  }
  const kept = chooseSupplyCardsForAi(battle, side, drawn, keepAmount);
  completeSupplyDraw(battle, side, sourceCard, drawn, kept);
}

function chooseSupplyCardsForAi(battle, side, drawn, keepAmount) {
  if (side !== "enemy") {
    return drawn.slice(0, keepAmount);
  }
  return drawn
    .slice()
    .sort((left, right) => scoreSupplyCard(battle, side, right) - scoreSupplyCard(battle, side, left))
    .slice(0, keepAmount);
}

function scoreSupplyCard(battle, side, instance) {
  const card = getCard(instance.cardId);
  let score = card.type === "unit" ? card.power || 0 : card.type === "strategy" ? 6 : 4;
  if (card.type === "unit" && card.line === "frontline" && !countAliveUnitsOnLine(battle, side, "frontline")) {
    score += 4;
  }
  if (card.ability?.kind === "supply" && battle.hands[side].length <= 2) {
    score += 2;
  }
  if (card.rarity === "legendary") {
    score += 3;
  } else if (card.rarity === "epic") {
    score += 2;
  }
  return score;
}

function chooseSupplyCard(uid) {
  const battle = state.battle;
  const pending = state.pending;
  if (!battle || pending?.kind !== "supplyChoice" || pending.side !== "player") {
    return;
  }
  const selected = pending.drawn.find((instance) => instance.uid === uid);
  if (!selected) {
    gameAudio.play("ui.error");
    return;
  }
  if (isOnlineAuthoritativeBattle()) {
    sendOnlineBattleAction({
      kind: "choose_supply",
      selectedUids: [selected.uid],
    });
    return;
  }
  completeSupplyDraw(battle, pending.side, getCard(pending.cardId), pending.drawn, [selected]);
  state.pending = null;
  state.selectedHandUid = null;
  finishAction(pending.side);
}

function completeSupplyDraw(battle, side, sourceCard, drawn, kept) {
  const keptIds = new Set(kept.map((instance) => instance.uid));
  const returned = drawn.filter((instance) => !keptIds.has(instance.uid));
  kept.forEach((instance) => {
    const choiceElement = Array.from(refs.intent?.querySelectorAll(".supply-choice-card") || [])
      .find((element) => element.dataset.action === `keep-supply:${instance.uid}`);
    playCardFlightBetweenElements(getCard(instance.cardId), side, choiceElement?.querySelector(".war-card") || getPileElement(side, "deck"), getHandDestinationElement(side), {
      back: side === "enemy",
      duration: 920,
      intent: "draw",
    });
  });
  battle.hands[side].push(...kept);
  battle.decks[side].push(...returned);
  gameAudio.play(kept.length > 1 ? "card.drawHand" : "card.draw", { count: kept.length, side });
  battle.log.push(`${sourceCard.name} kept ${kept.length} supply card(s); ${returned.length} returned to deck bottom.`);
}
function resolveNoTargetAbility(battle, side, instance, card) {
  if (card.ability && ["damageGuard", "intelDeny", "fireBoost", "supply"].includes(card.ability.kind)) {
    resolveNoTargetBoardEffect(battle, side, instance, card);
    return;
  }
  if (card.ability?.kind === "fortify") {
    gameAudio.playCard(card, { action: "effect", ability: card.ability, side });
    instance.fortified = true;
    battle.log.push(`${card.name} 构筑【阵地】，抗线承伤上限提高。`);
    return;
  }
  if (card.ability?.kind === "damageOrSelfBonus" && card.ability.selfBonusIfNoTargets) {
    gameAudio.playCard(card, { action: "effect", ability: card.ability, side });
    instance.bonus += card.ability.selfBonusIfNoTargets;
    battle.log.push(`${card.name} 未发现步兵目标，转入机动推进，当前战力 +${card.ability.selfBonusIfNoTargets}。`);
    exposeSourceAfterActiveAttempt(battle, side, instance, card);
    return;
  }
  if (card.ability?.kind !== "repair") {
    exposeSourceAfterActiveAttempt(battle, side, instance, card);
    return;
  }
  const didSomething = resolveSupplySideEffects(battle, side, card.ability, card);
  if (!didSomething) {
    battle.log.push(`${card.name} 未找到可修复目标，部署效果略过。`);
  }
  exposeSourceAfterActiveAttempt(battle, side, instance, card);
}

function exposeSourceAfterActiveAttempt(battle, side, instance, card) {
  if (!instance || !card?.ability?.sourceExposes) {
    return false;
  }
  const source = findBoardInstance(battle, side, instance.uid);
  if (!source || source.instance.exposed) {
    return false;
  }
  return exposeInstance(battle, source, card.name, { ignoreDecoy: true });
}

function resolveSupplySideEffects(battle, side, ability, sourceCard, context = {}) {
  let didSomething = false;
  const drawAmount = ability.draw || (!context.repaired ? ability.drawAlternative : 0);
  if (drawAmount) {
    const before = battle.hands[side].length;
    drawCards(battle, side, drawAmount);
    const drawn = battle.hands[side].length - before;
    if (drawn > 0) {
      battle.log.push(`${sourceCard.name} 补给 ${drawn} 张手牌。`);
      didSomething = true;
    }
  }

  if (ability.rescueMaxPower && !context.repaired) {
    const grave = battle.graves[side];
    const index = grave.findIndex((instance) => {
      const card = getCard(instance.cardId);
      return card.type === "unit" && card.power <= ability.rescueMaxPower;
    });
    if (index !== -1) {
      const [rescued] = grave.splice(index, 1);
      rescued.damage = 0;
      rescued.exposed = false;
      rescued.exposedAtAction = null;
      rescued.hidden = false;
      rescued.shield = false;
      rescued.fortified = false;
      rescued.damageDebuff = 0;
      battle.hands[side].push(rescued);
      battle.log.push(`${sourceCard.name} 回收 ${getCard(rescued.cardId).name} 至手牌。`);
      didSomething = true;
    }
  }
  return didSomething;
}

function spendIntelForAbility(battle, side, ability, sourceCard) {
  void battle;
  void side;
  void ability;
  void sourceCard;
  return true;
}

function applyIntelDenial(battle, actingSide, sourceCard, ability) {
  void battle;
  void actingSide;
  void sourceCard;
  void ability;
  return false;
}

function applyOutgoingDamageDebuff(battle, amount, sourceRef, sourceCard) {
  const debuff = sourceRef?.instance?.damageDebuff || 0;
  if (!debuff) {
    return amount;
  }
  sourceRef.instance.damageDebuff = 0;
  const nextAmount = Math.max(0, amount - debuff);
  battle.log.push(`${getCard(sourceRef.instance.cardId).name} 受到电子压制，${sourceCard.name} 伤害 -${amount - nextAmount}。`);
  return nextAmount;
}

function applyOutgoingFireBoost(battle, side, amount, sourceCard) {
  const boost = battle.fireBoost?.[side] || 0;
  if (!boost || !sourceCard.tags.some((tag) => ["榴弹炮", "火箭炮"].includes(tag))) {
    return amount;
  }
  battle.fireBoost[side] = 0;
  gameAudio.play("target.lock", { sourceCard });
  battle.log.push(`${sourceCard.name} 获得无人校射，伤害 +${boost}。`);
  return amount + boost;
}

function applyDamageGuard(battle, defenderSide, amount, sourceCard) {
  const guards = battle.guards?.[defenderSide] || [];
  const index = guards.findIndex((guard) => !guard.sourceTags.length || guard.sourceTags.some((tag) => sourceCard.tags.includes(tag)));
  if (index === -1) {
    return amount;
  }
  const [guard] = guards.splice(index, 1);
  const nextAmount = Math.max(0, amount - guard.reduction);
  gameAudio.playCard(sourceCard, { action: "effect", ability: { kind: "damageGuard" }, side: defenderSide });
  battle.log.push(`${guard.sourceName} 干扰 ${sourceCard.name}，伤害 -${amount - nextAmount}。`);
  return nextAmount;
}

function drawIfOwnCardPresent(battle, side, cardId, sourceCard) {
  if (!cardId || !hasOwnCardOnBoard(battle, side, cardId)) {
    return;
  }
  const drawn = drawCards(battle, side, 1);
  if (drawn) {
    battle.log.push(`${sourceCard.name} 与电子战单位协同，补给 1 张手牌。`);
  }
}

function hasOwnCardOnBoard(battle, side, cardId) {
  return LINES.some((line) => battle.board[side][line.id].some((instance) => instance.cardId === cardId && getCurrentPower(instance) > 0));
}

function resolveHighAirEngagement(battle, side, deployedRef) {
  const deployedCard = getCard(deployedRef.instance.cardId);
  if (!deployedRef.instance.hidden || !isHighAirUnit(deployedCard)) {
    return;
  }
  const opponent = side === "player" ? "enemy" : "player";
  const opponentRef = getAllBoardTargets(battle, opponent).find((target) => {
    const card = getCard(target.instance.cardId);
    return target.instance.hidden && getCurrentPower(target.instance) > 0 && isHighAirUnit(card);
  });
  if (!opponentRef) {
    return;
  }

  exposeInstance(battle, deployedRef, "高空接敌", { ignoreDecoy: true });
  exposeInstance(battle, opponentRef, "高空接敌", { ignoreDecoy: true });
  battle.log.push(`高空接敌：${deployedCard.name} 与 ${getCard(opponentRef.instance.cardId).name} 同时暴露并交战。`);
  const deployedFired = resolveFrontlineContactFire(battle, side, deployedRef, opponent, opponentRef, { exposeSource: false });
  const opponentFired = resolveFrontlineContactFire(battle, opponent, opponentRef, side, deployedRef, { exposeSource: false });
  cleanupDestroyed(battle, deployedFired ? side : opponentFired ? opponent : side, deployedFired ? deployedCard : getCard(opponentRef.instance.cardId), opponentFired ? deployedRef : opponentRef);
}

function getAreaDamageTargets(battle, side, ability, primaryTarget, context = {}) {
  const rows = ability.sameLineOnly ? [primaryTarget.lineId] : ability.rows || [primaryTarget.lineId];
  const candidates = getAllBoardTargets(battle, primaryTarget.side).filter((target) => {
    if (!rows.includes(target.lineId)) {
      return false;
    }
    if (!canTargetForAbility(battle, side, target, ability, context)) {
      return false;
    }
    return matchesTargetRequirements(target.instance, ability);
  });
  const ordered = candidates.sort((left, right) => {
    if (left.uid === primaryTarget.uid) return -1;
    if (right.uid === primaryTarget.uid) return 1;
    return getCurrentPower(right.instance) - getCurrentPower(left.instance);
  });
  return ordered.slice(0, ability.maxTargets || ordered.length);
}

function startFrontlineEngagementSequence(battle, side, deployedRef, onComplete) {
  const deployedCard = getCard(deployedRef.instance.cardId);
  if (deployedRef.lineId !== "frontline" || !isFrontlineContactUnit(deployedCard) || deployedCard.contactException) {
    return false;
  }

  const opponent = side === "player" ? "enemy" : "player";
  const videoSources = [];
  if (deployedRef.instance.hidden && canStayHiddenDuringFrontlineDeploy(deployedCard)) {
    battle.log.push(`${deployedCard.name} 依靠低空前线支援保持隐蔽部署。`);
    return false;
  }
  if (deployedRef.instance.hidden && countAliveUnitsOnLine(battle, opponent, "frontline") > 0) {
    exposeInstance(battle, deployedRef, "前线接敌", { ignoreDecoy: true });
    videoSources.push({ side, uid: deployedRef.instance.uid });
  }
  if (deployedRef.instance.hidden) {
    return false;
  }

  const ambushers = battle.board[opponent].frontline.filter((instance) => {
    const card = getCard(instance.cardId);
    return instance.hidden && !instance.suppressed && getCurrentPower(instance) > 0 && isFrontlineContactUnit(card) && !card.contactException;
  });
  if (!ambushers.length) {
    return false;
  }

  battle.log.push(`前线接敌：${deployedCard.name} 进入火线，触发 ${ambushers.length} 个隐蔽前线单位。`);
  const ambusherUids = ambushers.map((instance) => instance.uid);
  ambushers.forEach((instance) => {
    exposeInstance(battle, { side: opponent, lineId: "frontline", instance }, "前线接敌", { ignoreDecoy: true });
    videoSources.push({ side: opponent, uid: instance.uid });
  });
  battle.actionAnimation = {
    kind: "frontlineContact",
    phase: "reveal",
    side,
    sourceUid: deployedRef.instance.uid,
    targetUids: ambusherUids,
  };
  render();
  window.setTimeout(() => {
    resolveFrontlineEngagementFirePhase(battle, side, deployedRef.instance.uid, ambusherUids, videoSources, onComplete);
  }, CONTACT_REVEAL_HOLD_MS);
  return true;
}

function resolveFrontlineEngagementFirePhase(battle, side, deployedUid, ambusherUids, videoSources, onComplete) {
  if (state.battle !== battle || battle.phase !== "battle") {
    return;
  }
  playFrontlineContactExposureVideos(battle, videoSources).finally(() => {
    if (state.battle !== battle || battle.phase !== "battle") {
      return;
    }
    resolveFrontlineEngagementDamagePhase(battle, side, deployedUid, ambusherUids, onComplete);
  });
}

function playFrontlineContactExposureVideos(battle, videoSources = []) {
  const playable = videoSources
    .map((source) => findBoardInstance(battle, source.side, source.uid))
    .filter(Boolean)
    .map((ref) => ({ ref, card: getCard(ref.instance.cardId) }))
    .filter(({ card }) => getCardFireVideoPath(card));
  if (!playable.length) {
    return Promise.resolve();
  }

  battle.actionAnimation = {
    kind: "cardFireVideoGroup",
    sources: playable.map(({ ref, card }) => ({
      side: ref.side,
      sourceUid: ref.instance.uid,
      cardId: card.id,
    })),
  };
  render();

  return Promise.all(playable.map(({ ref, card }) => playCardFireVideo(ref, card))).finally(() => {
    if (state.battle !== battle || battle.phase !== "battle") {
      return;
    }
    battle.actionAnimation = null;
    render();
  });
}

function resolveFrontlineEngagementDamagePhase(battle, side, deployedUid, ambusherUids, onComplete) {
  if (state.battle !== battle || battle.phase !== "battle") {
    return;
  }
  const opponent = side === "player" ? "enemy" : "player";
  battle.actionAnimation = {
    kind: "frontlineContact",
    phase: "fire",
    side,
    sourceUid: deployedUid,
    targetUids: ambusherUids,
  };
  render();
  window.setTimeout(() => {
    if (state.battle !== battle || battle.phase !== "battle") {
      return;
    }
    const deployedRef = findBoardInstance(battle, side, deployedUid);
    const deployedCard = deployedRef ? getCard(deployedRef.instance.cardId) : null;
    const ambusherRefs = ambusherUids.map((uid) => findBoardInstance(battle, opponent, uid)).filter(Boolean);
    let anyAmbusherFired = false;
    ambusherRefs.forEach((sourceRef) => {
      const liveDeployedRef = deployedRef || findBoardInstance(battle, side, deployedUid);
      if (!liveDeployedRef) {
        return;
      }
      anyAmbusherFired = resolveFrontlineContactFire(battle, opponent, sourceRef, side, liveDeployedRef, { includeAmbushBonus: true }) || anyAmbusherFired;
    });

    let deployedFired = false;
    const priorityAmbusher = ambusherRefs.find((sourceRef) => findBoardInstance(battle, opponent, sourceRef.instance.uid));
    if (deployedRef && priorityAmbusher) {
      deployedFired = resolveFrontlineContactFire(battle, side, deployedRef, opponent, priorityAmbusher, { exposeSource: true });
    }

    battle.actionAnimation = {
      kind: "frontlineContact",
      phase: "impact",
      side,
      sourceUid: deployedUid,
      targetUids: ambusherUids,
    };
    window.setTimeout(() => {
      if (state.battle !== battle || battle.phase !== "battle") {
        return;
      }
      battle.actionAnimation = null;
      const cleanupSourceCard = deployedFired && deployedCard ? deployedCard : ambusherRefs[0] ? getCard(ambusherRefs[0].instance.cardId) : deployedCard;
      if (cleanupSourceCard) {
        cleanupDestroyed(battle, deployedFired ? side : anyAmbusherFired ? opponent : side, cleanupSourceCard, deployedRef || ambusherRefs[0] || null);
      }
      render();
      onComplete?.();
    }, CONTACT_CLEANUP_HOLD_MS);
  }, CONTACT_FIRE_START_MS);
}

function resolveFrontlineContactFire(battle, attackerSide, sourceRef, defenderSide, targetRef, options = {}) {
  if (!sourceRef?.instance || !targetRef?.instance) {
    return false;
  }
  if (sourceRef.instance.suppressed || hasUnitActedThisTurn(battle, sourceRef.instance)) {
    return false;
  }
  const sourceCard = getCard(sourceRef.instance.cardId);
  const ability = sourceCard.ability;
  if (!ability || !["damage", "damageOrSelfBonus", "strike"].includes(ability.kind)) {
    return false;
  }
  if (!canTargetForAbility(battle, attackerSide, targetRef, ability, { sourceRef, sourceCard }) || !matchesTargetRequirements(targetRef.instance, ability)) {
    return false;
  }
  const amount = getDamageAmount(battle, attackerSide, ability, targetRef.instance, targetRef.lineId, sourceCard) + (options.includeAmbushBonus ? sourceCard.ambushBonus || 0 : 0);
  if (options.includeAmbushBonus && sourceCard.ambushBonus) {
    battle.log.push(`${sourceCard.name} 触发【前线伏击】，本次伤害 +${sourceCard.ambushBonus}。`);
  }
  markUnitActed(battle, sourceRef.instance);
  dealDamage(battle, attackerSide, defenderSide, targetRef, amount, sourceCard, sourceRef);
  if (options.exposeSource && ability.sourceExposes && !sourceRef.instance.exposed) {
    exposeInstance(battle, sourceRef, "前线接敌开火", { ignoreDecoy: true });
  }
  return true;
}

function hasOwnTagOnLine(battle, side, lineId, tag, options = {}) {
  return battle.board[side][lineId].some((instance) =>
    getCurrentPower(instance) > 0 &&
      !instance.hidden &&
      (!options.exposedOnly || instance.exposed) &&
      hasTag(instance, tag)
  );
}

function hasOwnArtillery(battle, side) {
  return battle.board[side].support.some((instance) => {
    const card = getCard(instance.cardId);
    return getCurrentPower(instance) > 0 && !instance.hidden && card.tags.some((tag) => ["榴弹炮", "火箭炮"].includes(tag));
  });
}

function opponentControlsTag(battle, side, tag) {
  const opponent = side === "player" ? "enemy" : "player";
  return LINES.some((line) =>
    battle.board[opponent][line.id].some((instance) => getCurrentPower(instance) > 0 && !instance.hidden && hasTag(instance, tag)),
  );
}

function hasOwnAnyTagOnLine(battle, side, lineId, tags) {
  return tags.some((tag) => hasOwnTagOnLine(battle, side, lineId, tag));
}

function hasOwnVisibleTag(battle, side, tag) {
  return LINES.some((line) => hasOwnTagOnLine(battle, side, line.id, tag));
}

function countOwnVisibleCardOnLine(battle, side, lineId, cardId) {
  return battle.board[side][lineId].filter((instance) => getCurrentPower(instance) > 0 && !instance.hidden && instance.cardId === cardId).length;
}

function canRevealHiddenTargetForAbility(ability, instance) {
  return Boolean(ability?.canRevealHidden || ability?.canRevealHiddenForTags?.some((tag) => hasTag(instance, tag)));
}

function normalizeTargetingContext(context) {
  if (!context) {
    return {};
  }
  if (context.sourceRef || context.sourceCard || context.ignoreFrontlineSupportBlock) {
    return context;
  }
  return { sourceCard: context };
}

function isDirectAttackAbility(ability) {
  return ["damage", "damageOrSelfBonus", "strike", "areaDamage"].includes(ability?.kind);
}

function isFrontlineSourceContext(context) {
  if (context.sourceRef?.lineId) {
    return context.sourceRef.lineId === "frontline";
  }
  const sourceCard = context.sourceCard;
  return Boolean(sourceCard?.type === "unit" && sourceCard.line === "frontline");
}

function isBlockedByEnemyFrontlineScreen(battle, actingSide, target, ability, context) {
  if (context.ignoreFrontlineSupportBlock || target.breakthrough || !isDirectAttackAbility(ability)) {
    return false;
  }
  if (target.side === actingSide || target.lineId !== "support" || !isFrontlineSourceContext(context)) {
    return false;
  }
  return countAliveUnitsOnLine(battle, target.side, "frontline") > 0;
}

function canTargetForAbility(battle, actingSide, target, ability, context = {}) {
  const targetingContext = normalizeTargetingContext(context);
  if (isBlockedByEnemyFrontlineScreen(battle, actingSide, target, ability, targetingContext)) {
    return false;
  }
  const canRevealHiddenTarget = canRevealHiddenTargetForAbility(ability, target.instance);
  if (target.instance.hidden && !canRevealHiddenTarget) {
    return false;
  }
  if (ability.publicOnly && target.instance.hidden) {
    return false;
  }
  if (ability.requiresExposed && !target.instance.exposed && !canRevealHiddenTarget) {
    return false;
  }
  if (ability.requiresExposedOrAnyTag && !target.instance.exposed && !ability.requiresExposedOrAnyTag.some((tag) => hasTag(target.instance, tag))) {
    return false;
  }
  if (target.lineId === "frontline") {
    return true;
  }
  return target.instance.exposed || canRevealHiddenTarget || isSupportUncovered(battle, target.side) || ability.allowSupport || (ability.rows?.length === 1 && ability.rows[0] === "support");
}

function matchesTargetRequirements(instance, ability) {
  if (ability.requiresAnyTag && !ability.requiresAnyTag.some((tag) => hasTag(instance, tag))) {
    return false;
  }
  if (ability.requiresExposedForTags?.some((tag) => hasTag(instance, tag)) && !instance.exposed) {
    return false;
  }
  return true;
}

function getCallableUnits(battle, side, callerTags = []) {
  const candidates = [];
  LINES.forEach((line) => {
    battle.board[side][line.id].forEach((instance) => {
      const card = getCard(instance.cardId);
      if (
        getCurrentPower(instance) > 0 &&
        card.fire &&
        !instance.suppressed &&
        !wasUnitDeployedThisTurn(battle, instance) &&
        !hasUnitActedThisTurn(battle, instance) &&
        callerTags.some((tag) => card.tags.includes(tag))
      ) {
        candidates.push({ side, lineId: line.id, uid: instance.uid, instance, card });
      }
    });
  });
  return candidates.sort((left, right) => getCurrentPower(right.instance) - getCurrentPower(left.instance));
}

function findCallableUnit(battle, side, callerTags = []) {
  return getCallableUnits(battle, side, callerTags)[0] || null;
}

function getCallableFireOptions(battle, side, ability, targetRef, context = {}) {
  if (targetRef.instance.hidden || (ability.callFireRequiresFreshExpose && !context.exposedNow)) {
    return [];
  }
  return getCallableUnits(battle, side, ability.callerTags)
    .map((caller) => ({ caller, fire: getCalledFireProfile(caller, ability) }))
    .filter(({ caller, fire }) => fire && canCallFireAtTarget(battle, side, targetRef, ability, caller, fire));
}

function openCallFireChoice(battle, payload, sourceCard, targetRef, ability, callFireOptions) {
  state.pending = {
    kind: "callFireChoice",
    originKind: payload.sourceUid ? "boardEffect" : "handEffect",
    side: payload.side,
    handUid: payload.handUid,
    sourceUid: payload.sourceUid,
    cardId: sourceCard.id,
    ability,
    target: {
      side: targetRef.side,
      lineId: targetRef.lineId,
      uid: targetRef.uid,
    },
    targets: callFireOptions.map(({ caller }) => caller),
  };
  battle.log.push(`${sourceCard.name} 已完成坐标引导，选择一个未行动的火力单位立即校射。`);
  render();
  return "pending";
}

function resolveCallFireChoice(battle, pending, selectedCaller) {
  const sourceCard = getCard(pending.cardId);
  const target = findBoardInstance(battle, pending.target.side, pending.target.uid);
  const callerRef = selectedCaller ? findBoardInstance(battle, pending.side, selectedCaller.uid) : null;
  if (!target || !callerRef) {
    battle.log.push(`${sourceCard.name} 的校射目标已失效。`);
    return "resolved";
  }
  const callerCard = getCard(callerRef.instance.cardId);
  const caller = { ...callerRef, uid: callerRef.instance.uid, card: callerCard };
  const fire = getCalledFireProfile(caller, pending.ability);
  if (!getCallableUnits(battle, pending.side, pending.ability.callerTags).some((item) => item.uid === caller.uid) ||
      !canCallFireAtTarget(battle, pending.side, target, pending.ability, caller, fire)) {
    battle.log.push(`${sourceCard.name} 的校射单位已不能执行本次打击。`);
    resolveNoCallerFallback(battle, pending.side, sourceCard, null, pending.ability, { exposedNow: false, target });
    return "resolved";
  }
  const result = resolveCalledFire(battle, pending.side, sourceCard, caller, target, fire, {
    onComplete: () => {
      cleanupDestroyed(battle, pending.side, sourceCard, target);
      if (pending.originKind === "boardEffect") {
        finishActionWithResolutionHold(battle, pending.side, { pacedFinish: true });
        return;
      }
      finishAction(pending.side);
    },
  });
  if (result === "pending-animation" || result === "pending") {
    return result;
  }
  cleanupDestroyed(battle, pending.side, sourceCard, target);
  return "resolved";
}

function canCallFireAtTarget(battle, side, targetRef, ability = {}, caller, fire = {}) {
  if (ability.callFireTargetTags?.length && !targetHasAnyTag(targetRef.instance, ability.callFireTargetTags)) {
    return false;
  }
  const rows = fire.rows || ["frontline", "support"];
  return rows.includes(targetRef.lineId) &&
    canTargetForAbility(battle, side, targetRef, { ...fire, rows, canRevealHidden: fire.canRevealHidden }, { sourceRef: caller, sourceCard: caller.card }) &&
    matchesTargetRequirements(targetRef.instance, fire);
}

function targetHasAnyTag(instance, tags = []) {
  return tags.some((tag) => hasTag(instance, tag));
}

function exposeInstance(battle, targetRef, sourceName, options = {}) {
  if (!targetRef?.instance) {
    return false;
  }
  if (targetRef.instance.decoy && !options.ignoreDecoy) {
    targetRef.instance.decoy = false;
    battle.log.push(`${getCard(targetRef.instance.cardId).name} 的假目标阵地吸收了 ${sourceName} 的侦查暴露。`);
    playBlockedVfx(targetRef, "诱饵");
    return false;
  }
  const wasHidden = targetRef.instance.hidden;
  targetRef.instance.hidden = false;
  targetRef.instance.exposed = true;
  targetRef.instance.exposedAtAction = battle.actionSerial;
  targetRef.instance.shield = false;
  if (wasHidden) {
    markCardFlip(targetRef.instance, "reveal");
  }
  const cardName = getCard(targetRef.instance.cardId).name;
  battle.log.push(`${sourceName} 令 ${cardName}${wasHidden ? " 翻开并" : ""}【暴露】。`);
  return true;
}

function getCalledFireProfile(caller, ability) {
  const baseFire = caller?.card?.fire || caller?.card?.ability || {};
  const bonus = ability?.calledFireBonus || 0;
  if (!bonus) {
    return baseFire;
  }
  return {
    ...baseFire,
    flatBonus: (baseFire.flatBonus || 0) + bonus,
  };
}

function resolveNoCallerFallback(battle, side, sourceCard, sourceRef, ability, context = {}) {
  if (!ability?.noCallerFallback) {
    return false;
  }
  if (ability.callFireRequiresFreshExpose && !context.exposedNow) {
    return false;
  }
  if (ability.noCallerFallback === "draw") {
    const amount = ability.fallbackDraw || 1;
    const drawn = drawCards(battle, side, amount);
    if (drawn > 0) {
      battle.log.push(`${sourceCard.name} 未获得火力跟进，补给 ${drawn} 张手牌。`);
      return true;
    }
    return false;
  }
  return false;
}

function markCardFlip(instance, direction) {
  if (!instance) {
    return;
  }
  instance.flipAnimation = direction;
  instance.flipAnimationId = (instance.flipAnimationId || 0) + 1;
  const animationId = instance.flipAnimationId;
  window.setTimeout(() => {
    if (instance.flipAnimationId !== animationId) {
      return;
    }
    instance.flipAnimation = null;
    if (state.screen === "battle") {
      renderBoard();
    }
  }, 620);
}

function applyExposeMarkers(battle, actingSide, ability, targetRef, sourceCard) {
  void battle;
  void actingSide;
  void ability;
  void targetRef;
  void sourceCard;
}

function deployHandUnitWithTagAndActivate(battle, side, tag, sourceCard) {
  if (!tag) {
    return false;
  }
  const hand = battle.hands[side];
  const index = hand.findIndex((instance) => {
    const card = getCard(instance.cardId);
    return card.type === "unit" && card.tags.includes(tag);
  });
  if (index === -1) {
    battle.log.push(`${sourceCard.name} 完成火力指示，但手牌中没有可立即部署的【${tag}】。`);
    return false;
  }

  const [instance] = hand.splice(index, 1);
  const card = getCard(instance.cardId);
  const lineId = getDeployLines(card)[0] || card.line;
  instance.hidden = false;
  instance.deployedAtAction = battle.actionSerial;
  instance.actedAction = null;
  battle.board[side][lineId].push(instance);
  gameAudio.playCard(card, { action: "deploy", side, hidden: false });
  battle.log.push(`${sourceCard.name} 引导 ${card.name} 立即部署到${getLine(lineId).name}。`);
  applyDeploySelfBonuses(battle, side, instance, card);

  const sourceRef = findBoardInstance(battle, side, instance.uid);
  if (card.ability) {
    markUnitActed(battle, instance);
  }
  const targets = getValidEffectTargets(battle, side, card.ability, card, { sourceRef, asActingSource: true });
  if (card.ability && targets.length) {
    const result = resolveEffectOnTarget(battle, {
      side,
      sourceUid: instance.uid,
      cardId: card.id,
      ability: card.ability,
      target: side === "enemy" ? chooseAiTarget(battle, card, targets, battle.aiDifficulty || "medium") : chooseBestTarget(battle, targets),
    });
    if (result === "pending-animation" || result === "pending") {
      return true;
    }
  } else if (card.ability) {
    resolveNoTargetAbility(battle, side, instance, card);
  }
  return true;
}

function resolveCalledFire(battle, side, sourceCard, caller, target, fire, options = {}) {
  if (!caller?.instance || getCurrentPower(caller.instance) <= 0 || caller.instance.suppressed || hasUnitActedThisTurn(battle, caller.instance) || wasUnitDeployedThisTurn(battle, caller.instance)) {
    return "resolved";
  }
  const callerCard = getCard(caller.instance.cardId);
  if (shouldDeferCalledFireVideo(caller, callerCard, options)) {
    return beginCalledFireVideoTransition(battle, side, sourceCard, caller, target, fire, options);
  }
  caller.instance.calledAction = battle.actionSerial;
  markUnitActed(battle, caller.instance);
  gameAudio.playCard(callerCard, { action: "fire", ability: fire, side });
  if (fire.kind === "areaDamage") {
    getAreaDamageTargets(battle, side, fire, target, { sourceRef: caller, sourceCard: callerCard }).forEach((areaTarget, index) => {
      if (areaTarget.instance.hidden && fire.canRevealHidden) {
        exposeInstance(battle, areaTarget, callerCard.name);
      }
      const amount = getDamageAmount(battle, side, fire, areaTarget.instance, areaTarget.lineId, callerCard, { areaIndex: index, primaryTarget: target.instance });
      dealDamage(battle, side, areaTarget.side, areaTarget, amount, callerCard, caller);
    });
  } else {
    if (target.instance.hidden && fire.canRevealHidden) {
      exposeInstance(battle, target, callerCard.name);
    }
    const amount = getDamageAmount(battle, side, fire, target.instance, target.lineId, callerCard);
    dealDamage(battle, side, target.side, target, amount, callerCard, caller);
  }
  if (fire.sourceExposes !== false) {
    exposeInstance(battle, caller, sourceCard.name, { ignoreDecoy: true });
  }
  return "resolved";
}

function applySplashDamage(battle, attackerSide, primaryTarget, amount, sourceCard) {
  const row = battle.board[primaryTarget.side][primaryTarget.lineId];
  const splash = row.find((instance) => instance.uid !== primaryTarget.instance.uid && !instance.hidden);
  if (!splash) {
    return;
  }
  dealDamage(battle, attackerSide, primaryTarget.side, { side: primaryTarget.side, lineId: primaryTarget.lineId, instance: splash }, amount, sourceCard);
}

function normalizeTargetRef(battle, side, targetRefOrInstance) {
  if (targetRefOrInstance?.instance) {
    return targetRefOrInstance;
  }
  if (!targetRefOrInstance?.uid) {
    return null;
  }
  return findBoardInstance(battle, side, targetRefOrInstance.uid);
}

function isSupportUncovered(battle, side) {
  return countAliveUnitsOnLine(battle, side, "frontline") === 0 && countAliveUnitsOnLine(battle, side, "support") > 0;
}

function countAliveUnitsOnLine(battle, side, lineId) {
  return battle.board[side][lineId].filter((instance) => getCurrentPower(instance) > 0).length;
}

function countAliveUnitsForSide(battle, side) {
  return LINES.reduce((total, line) => total + countAliveUnitsOnLine(battle, side, line.id), 0);
}

function getLineCapacity(lineId) {
  return LINE_CAPACITY[lineId] ?? Infinity;
}

function isLineAtCapacity(battle, side, lineId) {
  return (battle.board?.[side]?.[lineId]?.length || 0) >= getLineCapacity(lineId);
}

function refreshIntelValues(battle) {
  void battle;
}

function clearSuppressionForSide(battle, side) {
  LINES.forEach((line) => {
    battle.board[side][line.id].forEach((instance) => {
      instance.suppressed = false;
    });
  });
}

function decayExposureWindows(battle, actingSide) {
  void battle;
  void actingSide;
}

function triggerSupplyExhaustion(battle, side) {
  if (battle.supplyExhausted) {
    return;
  }
  battle.supplyExhausted = true;
  battle.finalActions = { player: 1, enemy: 1 };
  battle.finalTriggeredAtAction = battle.actionSerial;
  gameAudio.play("system.supplyExhausted", { side });
  battle.log.push(`${getSideName(battle, side)}需要抽牌但牌库为空，触发补给耗尽。双方各获得 1 个最终主行动。`);
}

function revealAllHidden(battle) {
  ["player", "enemy"].forEach((side) => {
    LINES.forEach((line) => {
      battle.board[side][line.id].forEach((instance) => {
        instance.hidden = false;
      });
    });
  });
}

function getLineCollapseWinner(battle) {
  for (const side of ["player", "enemy"]) {
    const opponent = side === "player" ? "enemy" : "player";
    if (!isSupportUncovered(battle, side)) {
      continue;
    }
    const deficit = getTotalScore(battle, opponent) - getTotalScore(battle, side);
    if (deficit >= 15) {
      return opponent;
    }
  }
  return null;
}

function findBoardInstance(battle, side, uid) {
  for (const line of LINES) {
    const instance = battle.board[side][line.id].find((item) => item.uid === uid);
    if (instance) {
      return { side, lineId: line.id, instance };
    }
  }
  return null;
}

function moveHandCardToGrave(battle, side, uid) {
  const hand = battle.hands[side];
  const index = hand.findIndex((item) => item.uid === uid);
  if (index === -1) {
    return null;
  }
  const [instance] = hand.splice(index, 1);
  battle.graves[side].push(instance);
  playCardFlightBetweenElements(getCard(instance.cardId), side, getHandCardElement(side, uid), getPileElement(side, "grave"), {
    back: false,
    duration: 900,
    intent: "discard",
  });
  return instance;
}

function drawCards(battle, side, amount, options = {}) {
  let drawn = 0;
  for (let index = 0; index < amount; index += 1) {
    const card = battle.decks[side].shift();
    if (!card) {
      if (options.triggerExhaustion !== false) {
        triggerSupplyExhaustion(battle, side);
      }
      if (drawn && !options.silent) {
        gameAudio.play(drawn > 1 ? "card.drawHand" : "card.draw", { count: drawn, side });
      }
      return drawn;
    }
    battle.hands[side].push(card);
    if (!options.silent) {
      playCardFlightBetweenElements(getCard(card.cardId), side, getPileElement(side, "deck"), getHandDestinationElement(side), {
        back: side === "enemy",
        duration: 880,
        intent: "draw",
      });
    }
    drawn += 1;
  }
  if (drawn && !options.silent) {
    gameAudio.play(drawn > 1 ? "card.drawHand" : "card.draw", { count: drawn, side });
  }
  return drawn;
}

function getCurrentPower(instance) {
  if (instance?.masked) {
    return Number.isFinite(instance.power) ? instance.power : 0;
  }
  const card = getCard(instance.cardId);
  return Math.max(0, getCardHealth(card) + (instance.bonus || 0) - instance.damage);
}

function getLineScore(battle, side, lineId) {
  const raw = battle.board[side][lineId].reduce((sum, instance) => sum + getCurrentPower(instance), 0);
  if (lineId === "support" && isSupportUncovered(battle, side)) {
    return Math.floor(raw * 0.5);
  }
  return raw;
}

function getTotalScore(battle, side) {
  return battle.scores?.[side] || 0;
}

function getBoardPowerTotal(battle, side) {
  return LINES.reduce((sum, line) => sum + battle.board[side][line.id].reduce((lineSum, instance) => lineSum + getCurrentPower(instance), 0), 0);
}

function hasTag(instance, tag) {
  return getCard(instance.cardId).tags.includes(tag);
}

function createEmptyLines(factory) {
  return LINES.reduce((acc, line) => {
    acc[line.id] = factory();
    return acc;
  }, {});
}

function canConcealCardFromHand(side, card) {
  const battle = state.battle;
  return Boolean(battle && canConcealCardForSide(battle, side, card));
}

function canConcealCardForSide(battle, side, card, lineId = card?.line) {
  if (!battle || card.type !== "unit") {
    return false;
  }
  const opponent = side === "player" ? "enemy" : "player";
  if (lineId === "frontline" && isFrontlineContactUnit(card) && !canStayHiddenDuringFrontlineDeploy(card) && countAliveUnitsOnLine(battle, opponent, "frontline") > 0) {
    return false;
  }
  if (isHighAirUnit(card) && opponentHasExposedHighAir(battle, side)) {
    return false;
  }
  return true;
}

function isGroundContactUnit(card) {
  return card.tags.includes("步兵") || card.tags.includes("装甲");
}

function isFrontlineContactUnit(card) {
  return isGroundContactUnit(card) || card.tags.includes("直升机");
}

function canStayHiddenDuringFrontlineDeploy(card) {
  return Boolean(card?.contactException);
}

function isHighAirUnit(card) {
  return card.tags.includes("战斗机") || card.tags.includes("轰炸机");
}

function opponentHasExposedHighAir(battle, side) {
  const opponent = side === "player" ? "enemy" : "player";
  return LINES.some((line) =>
    battle.board[opponent][line.id].some((instance) => {
      const card = getCard(instance.cardId);
      return getCurrentPower(instance) > 0 && instance.exposed && isHighAirUnit(card);
    }),
  );
}

function isSelectedUnitAllowedOn(side, lineId) {
  const battle = state.battle;
  if (!battle || !state.selectedHandUid || side !== "player" || !canPlayerAct()) {
    return false;
  }
  const instance = battle.hands.player.find((item) => item.uid === state.selectedHandUid);
  if (!instance) {
    return false;
  }
  const card = getCard(instance.cardId);
  if (!canUseHandAction(battle, "player", card)) {
    return false;
  }
  return card.type === "unit" && getDeployLines(card).includes(lineId);
}

function getDeployLines(card) {
  return card.lines || [card.line];
}

function canPlayerAct() {
  const battle = state.battle;
  return Boolean(
      battle &&
      battle.phase === "battle" &&
      battle.activeSide === "player" &&
      !state.mulligan.active &&
      !battle.turnTransition &&
      !battle.aiThinking &&
      !battle.actionAnimation &&
      !battle.pendingSide &&
      (!battle.finalActions || battle.finalActions.player > 0),
  );
}

function canPlayerEndTurn() {
  const battle = state.battle;
  return Boolean(
    battle &&
      battle.phase === "battle" &&
      battle.activeSide === "player" &&
      !state.mulligan.active &&
      !state.pending &&
      !battle.pendingSide &&
      !battle.turnTransition &&
      !battle.aiThinking &&
      !battle.actionAnimation,
  );
}

function canAnyHandAction(battle, side) {
  return (battle?.hands?.[side] || []).some((instance) => canUseHandAction(battle, side, getCard(instance.cardId)));
}

function canUseHandAction(battle, side, card = null) {
  const actions = getTurnActions(battle, side);
  if (card && card.type !== "unit") {
    return !actions.tacticPlayed;
  }
  return canUseUnitDeployment(battle, side);
}

function markHandActionUsed(battle, side, card = null) {
  const actions = getTurnActions(battle, side);
  if (card && card.type !== "unit") {
    actions.tacticPlayed = true;
    return;
  }
  actions.unitDeployments = (actions.unitDeployments || 0) + 1;
  actions.nonTacticActionsUsed = (actions.nonTacticActionsUsed || 0) + 1;
  actions.unitPlayed = actions.unitDeployments > 0;
  actions.handPlayed = actions.unitDeployments > 0;
}

function canUseHiddenAction(battle, side) {
  return canUseBoardAction(battle, side);
}

function markHiddenActionUsed(battle, side) {
  markBoardActionUsed(battle, side);
}

function canUseBoardAction(battle, side) {
  const actions = getTurnActions(battle, side);
  return (actions.nonTacticActionsUsed || 0) < 2 && (actions.boardActions || 0) < 2;
}

function markBoardActionUsed(battle, side) {
  const actions = getTurnActions(battle, side);
  actions.boardActions = (actions.boardActions || 0) + 1;
  actions.nonTacticActionsUsed = (actions.nonTacticActionsUsed || 0) + 1;
  actions.hiddenActivated = actions.boardActions > 0;
}

function canUseUnitDeployment(battle, side) {
  const actions = getTurnActions(battle, side);
  if ((actions.nonTacticActionsUsed || 0) >= 2 || (actions.unitDeployments || 0) >= 2) {
    return false;
  }
  if ((actions.unitDeployments || 0) >= 1 && !actions.ownBoardEmptyAtStart) {
    return false;
  }
  return true;
}

function wasUnitDeployedThisTurn(battle, instance) {
  return instance?.deployedAtAction === battle?.actionSerial;
}

function hasUnitActedThisTurn(battle, instance) {
  return (
    instance?.actedAction === battle?.actionSerial ||
    instance?.calledAction === battle?.actionSerial ||
    instance?.assistAction === battle?.actionSerial ||
    instance?.interceptAction === battle?.actionSerial
  );
}

function markUnitActed(battle, instance) {
  if (battle && instance) {
    instance.actedAction = battle.actionSerial;
  }
}

function canUseExistingUnitAction(battle, instance) {
  return Boolean(instance && getCurrentPower(instance) > 0 && !wasUnitDeployedThisTurn(battle, instance) && !hasUnitActedThisTurn(battle, instance));
}

function canSourceUseBreakthrough(battle, side, sourceRef, options = {}) {
  if (!battle || !sourceRef?.instance || sourceRef.lineId !== "frontline") {
    return false;
  }
  const sourceCard = getCard(sourceRef.instance.cardId);
  if (!sourceCard?.canBreakthrough) {
    return false;
  }
  const actions = getTurnActions(battle, side);
  if (!actions.enemyFrontlineEmptyAtStart || actions.breakthroughUsed) {
    return false;
  }
  if (!canUseBoardAction(battle, side)) {
    return false;
  }
  if (wasUnitDeployedThisTurn(battle, sourceRef.instance)) {
    return false;
  }
  return options.ignoreActed || !hasUnitActedThisTurn(battle, sourceRef.instance);
}

function markBreakthroughUsed(battle, side) {
  getTurnActions(battle, side).breakthroughUsed = true;
}

function getBreakthroughVisualState(battle) {
  const side = battle?.activeSide;
  if (!side || side === "none" || battle.phase !== "battle" || battle.turnTransition) {
    return null;
  }
  const opponent = side === "player" ? "enemy" : side === "enemy" ? "player" : null;
  const actions = getTurnActions(battle, side);
  if (!opponent || !actions.enemyFrontlineEmptyAtStart || actions.breakthroughUsed || !canUseBoardAction(battle, side)) {
    return null;
  }
  const hasEligibleSource = battle.board[side].frontline.some((instance) => canSourceUseBreakthrough(battle, side, { side, lineId: "frontline", instance }));
  if (!hasEligibleSource) {
    return null;
  }
  return { side, opponent };
}

function openCodex() {
  state.codexOpen = true;
  renderCodex();
}

function closeCodex() {
  state.codexOpen = false;
  clearSpotlight();
  renderCodex();
}

function openGuide() {
  state.guideOpen = true;
  state.deckBuilderOpen = false;
  renderGuide();
  renderDeckBuilder();
}

function closeGuide() {
  state.guideOpen = false;
  renderGuide();
}

function openDeckBuilder() {
  if (state.screen !== "briefing") {
    return;
  }
  state.deckBuilderOpen = true;
  state.guideOpen = false;
  renderGuide();
  renderDeckBuilder();
}

function closeDeckBuilder() {
  state.deckBuilderOpen = false;
  clearSpotlight();
  renderDeckBuilder();
  renderDeckStatus();
}

function setDeckFaction(factionId) {
  if (!FACTIONS[factionId]) {
    return;
  }
  state.playerFaction = factionId;
  state.codexFaction = factionId;
  state.playerDeck = loadSavedDeck(factionId);
  saveDeckState();
  renderDeckStatus();
  renderDeckBuilder();
}

function addDeckCard(cardId) {
  const card = getCard(cardId);
  if (!card || card.faction !== state.playerFaction || state.playerDeck.length >= DECK_RULES.size) {
    gameAudio.play("ui.error");
    return;
  }
  const count = state.playerDeck.filter((id) => id === cardId).length;
  if (count >= getCopyLimit(card)) {
    gameAudio.play("ui.error");
    return;
  }
  updatePlayerDeck([...state.playerDeck, cardId]);
}

function removeDeckCard(cardId) {
  const index = state.playerDeck.lastIndexOf(cardId);
  if (index === -1) {
    gameAudio.play("ui.error");
    return;
  }
  const nextDeck = state.playerDeck.slice();
  nextDeck.splice(index, 1);
  updatePlayerDeck(nextDeck);
}

function resetPlayerDeck() {
  updatePlayerDeck(getStarterDeckForFaction(state.playerFaction));
}

function clearPlayerDeck() {
  updatePlayerDeck([]);
}

function autoFillPlayerDeck() {
  const nextDeck = [];
  const currentCounts = {};
  const addIfAllowed = (cardId) => {
    if (nextDeck.length >= DECK_RULES.size) {
      return false;
    }
    const card = getCard(cardId);
    if (!card || card.faction !== state.playerFaction) {
      return false;
    }
    const count = currentCounts[cardId] || 0;
    if (count >= getCopyLimit(card)) {
      return false;
    }
    currentCounts[cardId] = count + 1;
    nextDeck.push(cardId);
    return true;
  };

  state.playerDeck.forEach(addIfAllowed);
  [...getStarterDeckForFaction(state.playerFaction), ...getFactionCards(state.playerFaction).map((card) => card.id)].forEach(addIfAllowed);
  updatePlayerDeck(nextDeck);
}

function updatePlayerDeck(nextDeck) {
  state.playerDeck = sanitizeDeckIds(state.playerFaction, nextDeck);
  saveDeckState();
  gameAudio.play("ui.switch");
  renderDeckStatus();
  renderDeckBuilder();
}

function saveDeckState() {
  try {
    localStorage.setItem(`${DECK_STORAGE_PREFIX}.faction`, state.playerFaction);
    localStorage.setItem(getDeckStorageKey(state.playerFaction), JSON.stringify(state.playerDeck));
  } catch (error) {
    // Local storage can be unavailable in restricted browser contexts.
  }
}

function loadSavedDeckFaction() {
  try {
    const factionId = localStorage.getItem(`${DECK_STORAGE_PREFIX}.faction`);
    return FACTIONS[factionId] ? factionId : "usa";
  } catch (error) {
    return "usa";
  }
}

function loadSavedDeck(factionId) {
  try {
    const raw = localStorage.getItem(getDeckStorageKey(factionId));
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) {
      const deck = sanitizeDeckIds(factionId, parsed);
      if (validateDeck(deck, factionId).valid) {
        return deck;
      }
    }
  } catch (error) {
    // Fall back to the tuned starter list.
  }
  return getStarterDeckForFaction(factionId);
}

function getDeckStorageKey(factionId) {
  return `${DECK_STORAGE_PREFIX}.${factionId}`;
}

function getStarterDeckForFaction(factionId) {
  return (factionId === "russia" ? STARTER_DECKS.enemy : STARTER_DECKS.player).slice();
}

function sanitizeDeckIds(factionId, cardIds) {
  return cardIds.filter((cardId) => {
    const card = CARD_LIBRARY[cardId];
    return card && card.faction === factionId;
  });
}

function getFactionCards(factionId) {
  return Object.values(CARD_LIBRARY)
    .filter((card) => card.faction === factionId)
    .sort(sortDeckCards);
}

function sortDeckCards(left, right) {
  const typeOrder = { unit: 0, tactic: 1, strategy: 2 };
  const lineOrder = { frontline: 0, support: 1, instant: 2 };
  return (
    (left.docOrder || 999) - (right.docOrder || 999) ||
    typeOrder[left.type] - typeOrder[right.type] ||
    lineOrder[left.line] - lineOrder[right.line] ||
    (left.power || 99) - (right.power || 99) ||
    left.name.localeCompare(right.name, "zh-CN")
  );
}

function validateDeck(deckIds, factionId) {
  const errors = [];
  const stats = {
    total: deckIds.length,
    units: 0,
    tactics: 0,
    strikeTactics: 0,
    supportTactics: 0,
    frontline: 0,
    support: 0,
    recon: 0,
    airDefense: 0,
  };
  const counts = {};

  deckIds.forEach((cardId) => {
    const card = CARD_LIBRARY[cardId];
    counts[cardId] = (counts[cardId] || 0) + 1;
    if (!card) {
      errors.push(`未知卡牌：${cardId}`);
      return;
    }
    if (card.faction !== factionId) {
      errors.push(`${card.name} 不属于当前阵营。`);
    }
    if (card.type === "unit") {
      stats.units += 1;
      if (canDeployToLine(card, "frontline")) {
        stats.frontline += 1;
      }
      if (canDeployToLine(card, "support")) {
        stats.support += 1;
      }
    } else {
      stats.tactics += 1;
      if (isStrikeTacticCard(card)) {
        stats.strikeTactics += 1;
      } else {
        stats.supportTactics += 1;
      }
    }
    if (isReconCard(card)) {
      stats.recon += 1;
    }
    if (isAirDefenseCard(card)) {
      stats.airDefense += 1;
    }
  });

  Object.entries(counts).forEach(([cardId, count]) => {
    const card = CARD_LIBRARY[cardId];
    if (!card) {
      return;
    }
    const limit = getCopyLimit(card);
    if (count > limit) {
      errors.push(`${card.name} 超过复制上限：${count}/${limit}。`);
    }
  });

  if (stats.total !== DECK_RULES.size) {
    errors.push(`卡组必须为 ${DECK_RULES.size} 张，目前 ${stats.total} 张。`);
  }
  if (stats.units < DECK_RULES.unitMin || stats.units > DECK_RULES.unitMax) {
    errors.push(`单位牌需要 ${DECK_RULES.unitMin}-${DECK_RULES.unitMax} 张，目前 ${stats.units} 张。`);
  }
  if (stats.tactics < DECK_RULES.tacticMin || stats.tactics > DECK_RULES.tacticMax) {
    errors.push(`战术牌需要 ${DECK_RULES.tacticMin} 张，目前 ${stats.tactics} 张。`);
  }
  if (stats.strikeTactics < DECK_RULES.strikeTacticMin || stats.strikeTactics > DECK_RULES.strikeTacticMax) {
    errors.push(`当前规则不再使用打击战术牌，目前 ${stats.strikeTactics} 张。`);
  }
  if (stats.supportTactics < DECK_RULES.supportTacticMin || stats.supportTactics > DECK_RULES.supportTacticMax) {
    errors.push(`支援战术牌需要 ${DECK_RULES.supportTacticMin} 张，目前 ${stats.supportTactics} 张。`);
  }
  if (stats.frontline < DECK_RULES.frontlineMin) {
    errors.push(`前线可部署单位至少 ${DECK_RULES.frontlineMin} 张，目前 ${stats.frontline} 张。`);
  }
  if (stats.support < DECK_RULES.supportMin) {
    errors.push(`支援可部署单位至少 ${DECK_RULES.supportMin} 张，目前 ${stats.support} 张。`);
  }
  if (stats.recon < DECK_RULES.reconMin) {
    errors.push(`侦察/暴露链至少 ${DECK_RULES.reconMin} 张，目前 ${stats.recon} 张。`);
  }
  if (stats.airDefense < DECK_RULES.airDefenseMin) {
    errors.push(`防空拦截单位至少 ${DECK_RULES.airDefenseMin} 张，目前 ${stats.airDefense} 张。`);
  }

  return {
    valid: errors.length === 0,
    errors,
    stats,
    counts,
  };
}

function getCopyLimit(card) {
  return DECK_RULES.copyLimitByRarity[card.rarity] || 3;
}

function canDeployToLine(card, lineId) {
  return card.type === "unit" && getDeployLines(card).includes(lineId);
}

function isReconCard(card) {
  const kind = card.ability?.kind;
  return ["expose", "exposeAndCallFire", "exposeDeployTag", "exposeAndSupply", "exposeOrDamage", "callFire"].includes(kind);
}

function isStrikeTacticCard(card) {
  return card.type !== "unit" && card.tags.some((tag) => ["打击", "导弹", "战斗机", "轰炸机"].includes(tag));
}

function isSingleInterceptorStrikeCard(card) {
  return card.tags.some((tag) => ["导弹", "战斗机", "轰炸机"].includes(tag));
}

function isAirDefenseCard(card) {
  return Boolean(card.continuous?.intercept || card.tags.some((tag) => ["伴随防空", "重型防空"].includes(tag)));
}

function setAiDifficulty(difficulty) {
  if (!AI_DIFFICULTY_LABELS[difficulty]) {
    return;
  }
  state.aiDifficulty = difficulty;
  updateDifficultyButtons();
}

function updateDifficultyButtons() {
  refs.difficultyButtons.forEach((button) => {
    const difficulty = button.dataset.action?.split(":")[1];
    const isActive = difficulty === state.aiDifficulty;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function focusOnlinePanel() {
  refs.onlinePanel?.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => {
    document.querySelector("#online-player-name")?.focus();
  }, 260);
}

async function createOnlineRoom() {
  const socket = await ensureOnlineSocket();
  if (!socket) {
    return;
  }
  resetOnlineRoomState();
  sendOnlineMessage({
    type: "create_room",
    name: state.online.name,
  });
  state.online.lastEvent = "正在创建房间...";
  renderOnlinePanel();
}

async function joinOnlineRoom() {
  if (!state.online.joinCode) {
    state.online.error = "请输入朋友发来的房间码。";
    renderOnlinePanel();
    return;
  }
  const socket = await ensureOnlineSocket();
  if (!socket) {
    return;
  }
  resetOnlineRoomState();
  sendOnlineMessage({
    type: "join_room",
    roomCode: state.online.joinCode,
    name: state.online.name,
  });
  state.online.lastEvent = `正在加入房间 ${state.online.joinCode}...`;
  renderOnlinePanel();
}

function toggleOnlineReady() {
  if (!state.online.roomCode) {
    return;
  }
  state.online.ready = !state.online.ready;
  if (state.online.ready) {
    warmOnlineRoomAssets();
  }
  sendOnlineMessage({
    type: "ready",
    ready: state.online.ready,
    loadout: getOnlineLoadout(),
  });
  renderOnlinePanel();
}

async function startOnlineBattlePreview() {
  if (!state.online.matchReady || !state.online.match) {
    state.online.error = "双方准备完成后才能进入战场。";
    renderOnlinePanel();
    return;
  }

  if (state.online.battleSnapshot) {
    await runBattlefieldLoading();
    enterOnlineAuthoritativeBattle(state.online.battleSnapshot);
    return;
  }

  state.online.lastEvent = "正在向服务器请求权威战斗快照...";
  sendOnlineMessage({ type: "battle_enter" });
  renderOnlinePanel();
}

function getOnlineOpponent() {
  return state.online.players.find((player) => player.id !== state.online.clientId) || null;
}

function enterOnlineAuthoritativeBattle(snapshot) {
  if (!snapshot?.battle) {
    state.online.error = "服务器战斗快照尚未准备好。";
    renderOnlinePanel();
    return;
  }
  state.online.lastEffectSerial = 0;
  state.online.effectPlayback = Promise.resolve();
  state.battle = hydrateOnlineBattle(snapshot.battle);
  warmVisibleBattleAssets(state.battle, { priority: true });
  state.screen = "battle";
  state.selectedHandUid = null;
  state.hoveredCardId = null;
  state.pending = snapshot.pending || null;
  state.mulligan = snapshot.mulligan || { active: false, selectedUids: [] };
  state.guideOpen = false;
  state.deckBuilderOpen = false;
  state.bgmOn = true;
  playBgm(true);
  gameAudio.play("system.start");
  render();
}

function hydrateOnlineBattle(battle) {
  return {
    ...battle,
    aiTimer: null,
    turnTimer: null,
    turnTransition: null,
    aiThinking: false,
    actionAnimation: null,
  };
}

function applyOnlineBattleSnapshot(snapshot) {
  state.online.battleSnapshot = snapshot;
  warmBattleSnapshotAssets(snapshot);
  if (state.screen !== "battle" || state.battle?.mode !== "online-authoritative") {
    renderOnlinePanel();
    return;
  }
  const previousBattle = state.battle;
  const previousMulliganActive = state.mulligan.active;
  const nextBattle = hydrateOnlineBattle(snapshot.battle);
  applyOnlineTurnTransition(previousBattle, nextBattle, previousMulliganActive, Boolean(snapshot.mulligan?.active));
  state.battle = nextBattle;
  state.pending = snapshot.pending || null;
  state.mulligan = snapshot.mulligan || { active: false, selectedUids: [] };
  state.selectedHandUid = null;
  render();
  playOnlineBattleEffects(nextBattle.effects || []);
}

function isOnlineAuthoritativeBattle() {
  return state.battle?.mode === "online-authoritative";
}

function sendOnlineBattleAction(action) {
  if (!isOnlineAuthoritativeBattle()) {
    return false;
  }
  return sendOnlineMessage({
    type: "battle_action",
    action,
  });
}

function applyOnlineTurnTransition(previousBattle, nextBattle, previousMulliganActive, nextMulliganActive) {
  if (!previousBattle || previousBattle.mode !== "online-authoritative" || nextBattle.phase !== "battle" || nextMulliganActive) {
    return;
  }
  const opening = Boolean(previousMulliganActive && !nextMulliganActive);
  const changedTurn = previousBattle.activeSide && previousBattle.activeSide !== nextBattle.activeSide;
  if (!opening && !changedTurn) {
    return;
  }
  nextBattle.turnTransition = {
    fromSide: opening ? null : previousBattle.activeSide,
    toSide: nextBattle.activeSide,
    opening,
    serial: nextBattle.actionSerial,
  };
  nextBattle.turnTimer = window.setTimeout(() => {
    if (state.battle !== nextBattle) {
      return;
    }
    nextBattle.turnTransition = null;
    render();
  }, TURN_HANDOFF_MS);
}

function playOnlineBattleEffects(effects = []) {
  if (!Array.isArray(effects) || !effects.length || state.screen !== "battle") {
    return;
  }
  const freshEffects = effects
    .filter((effect) => Number(effect.serial) > (state.online.lastEffectSerial || 0))
    .sort((left, right) => Number(left.serial || 0) - Number(right.serial || 0));
  if (!freshEffects.length) {
    return;
  }
  state.online.lastEffectSerial = Math.max(state.online.lastEffectSerial || 0, ...freshEffects.map((effect) => Number(effect.serial || 0)));
  state.online.effectPlayback = (state.online.effectPlayback || Promise.resolve())
    .then(async () => {
      const videoKeys = new Set();
      for (const effect of freshEffects) {
        await playOnlineBattleEffect(effect, videoKeys);
      }
    })
    .catch(() => {});
  return;
  freshEffects.forEach((effect) => {
    const sourceCard = getCard(effect.sourceCardId) || getCard(effect.targetCardId) || getCard("us_marine_rifle");
    if (effect.type === "damage") {
      const targetRef = findBoardInstance(state.battle, effect.targetSide, effect.targetUid) || {
        side: effect.targetSide,
        lineId: effect.lineId || "frontline",
        uid: effect.targetUid,
        instance: { uid: effect.targetUid, cardId: effect.targetCardId, damage: 0 },
      };
      playCombatVfx({
        attackerSide: effect.attackerSide || "player",
        sourceCard,
        targetRef,
        amount: effect.amount || 1,
      });
    } else if (effect.type === "destroyed") {
      const targetCard = getCard(effect.targetCardId) || sourceCard;
      const fromPoint = getElementCenter(getBoardCardElement(effect.targetSide, effect.targetUid)) || getFallbackVfxPoint(effect.targetSide, effect.lineId || "frontline");
      playCardFlightFromPoint(targetCard, effect.targetSide, fromPoint, getPileElement(effect.targetSide, "grave"), { back: true, duration: 760 });
      playDestroyedVfx(effect.targetSide, effect.targetUid);
      playImpactVfx(fromPoint, "destroyed", 4);
    } else if (effect.type === "intercept") {
      const interceptorRef = findBoardInstance(state.battle, effect.targetSide, effect.interceptorUid);
      const targetRef = interceptorRef || findBoardInstance(state.battle, effect.targetSide, effect.targetUid) || {
        side: effect.targetSide,
        lineId: effect.lineId || "support",
        uid: effect.targetUid,
        instance: { uid: effect.targetUid, cardId: effect.targetCardId || "us_marine_rifle", damage: 0 },
      };
      playBlockedVfx(targetRef, "拦截");
    } else if (effect.type === "draw") {
      const side = effect.targetSide || "player";
      const amount = Math.max(1, Number(effect.amount) || 1);
      const cardBack = getCard("us_marine_rifle");
      for (let index = 0; index < amount; index += 1) {
        window.setTimeout(() => {
          playCardFlightBetweenElements(cardBack, side, getPileElement(side, "deck"), getHandDestinationElement(side), { back: true, duration: 660 });
        }, index * 90);
      }
    } else if (effect.type === "discard") {
      const side = effect.targetSide || "player";
      const discardCard = getCard(effect.targetCardId) || getCard("us_marine_rifle");
      playCardFlightFromPoint(discardCard, side, getFallbackHandPoint(side), getPileElement(side, "grave"), { back: false, duration: 680 });
    }
  });
  state.online.lastEffectSerial = Math.max(state.online.lastEffectSerial || 0, ...freshEffects.map((effect) => Number(effect.serial || 0)));
}

async function playOnlineBattleEffect(effect, videoKeys) {
  const sourceCard = getCard(effect.sourceCardId) || getCard(effect.targetCardId) || getCard("us_marine_rifle");
  if (effect.type === "damage") {
    await playOnlineFireVideoForEffect(effect, sourceCard, videoKeys);
    const targetRef = findBoardInstance(state.battle, effect.targetSide, effect.targetUid) || {
      side: effect.targetSide,
      lineId: effect.lineId || "frontline",
      uid: effect.targetUid,
      instance: { uid: effect.targetUid, cardId: effect.targetCardId, damage: 0 },
    };
    playCombatVfx({
      attackerSide: effect.attackerSide || "player",
      sourceCard,
      targetRef,
      amount: effect.amount || 1,
    });
  } else if (effect.type === "destroyed") {
    const targetCard = getCard(effect.targetCardId) || sourceCard;
    const fromPoint = getElementCenter(getBoardCardElement(effect.targetSide, effect.targetUid)) || getFallbackVfxPoint(effect.targetSide, effect.lineId || "frontline");
    playCardFlightFromPoint(targetCard, effect.targetSide, fromPoint, getPileElement(effect.targetSide, "grave"), { back: true, duration: 760 });
    playDestroyedVfx(effect.targetSide, effect.targetUid);
    playImpactVfx(fromPoint, "destroyed", 4);
  } else if (effect.type === "intercept") {
    await playOnlineFireVideoForEffect(effect, sourceCard, videoKeys);
    const interceptorRef = findBoardInstance(state.battle, effect.targetSide, effect.interceptorUid);
    const targetRef = interceptorRef || findBoardInstance(state.battle, effect.targetSide, effect.targetUid) || {
      side: effect.targetSide,
      lineId: effect.lineId || "support",
      uid: effect.targetUid,
      instance: { uid: effect.targetUid, cardId: effect.targetCardId || "us_marine_rifle", damage: 0 },
    };
    playBlockedVfx(targetRef);
  } else if (effect.type === "deploy") {
    playOnlineDeployEffect(effect, sourceCard);
  } else if (effect.type === "expose") {
    playOnlineStatusEffect(effect, "暴露");
  } else if (effect.type === "shield") {
    playOnlineStatusEffect(effect, "烟幕");
  } else if (effect.type === "repair") {
    playOnlineStatusEffect(effect, `维修${effect.amount ? ` +${effect.amount}` : ""}`);
  } else if (effect.type === "suppress") {
    playOnlineStatusEffect(effect, "压制");
  } else if (effect.type === "supply") {
    playOnlineDrawEffect(effect);
  } else if (effect.type === "draw") {
    playOnlineDrawEffect(effect);
  } else if (effect.type === "discard") {
    const side = effect.targetSide || "player";
    const discardCard = getCard(effect.targetCardId) || getCard("us_marine_rifle");
    playCardFlightFromPoint(discardCard, side, getFallbackHandPoint(side), getPileElement(side, "grave"), { back: false, duration: 680 });
  }
}

function playOnlineDeployEffect(effect, sourceCard) {
  const side = effect.sourceSide || effect.targetSide || "player";
  const uid = effect.sourceUid || effect.targetUid;
  const lineId = effect.sourceLineId || effect.lineId || effect.targetLineId || "frontline";
  const destination = uid ? getBoardCardElement(side, uid) : null;
  const card = getCard(effect.sourceCardId) || getCard(effect.targetCardId) || sourceCard || getCard("us_marine_rifle");
  if (destination) {
    playCardFlightFromPoint(card, side, getFallbackHandPoint(side), destination, {
      back: !effect.sourceCardId && !effect.targetCardId,
      duration: 660,
    });
    pulseElement(destination, "is-contact-impact", 520);
    return;
  }

  playOnlineStatusEffect({ ...effect, targetSide: side, targetUid: uid, lineId }, "部署");
}

function playOnlineStatusEffect(effect, label) {
  const targetRef = getOnlineEffectTargetRef(effect);
  playBlockedVfx(targetRef, label);
  const element = getBoardCardElement(targetRef.side, targetRef.uid);
  if (element) {
    pulseElement(element, "is-contact-impact", 520);
  }
}

function playOnlineDrawEffect(effect) {
  const side = effect.targetSide || effect.attackerSide || "player";
  const amount = Math.max(1, Number(effect.amount) || 1);
  const cardBack = getCard("us_marine_rifle");
  for (let index = 0; index < amount; index += 1) {
    window.setTimeout(() => {
      playCardFlightBetweenElements(cardBack, side, getPileElement(side, "deck"), getHandDestinationElement(side), { back: true, duration: 660 });
    }, index * 90);
  }
}

function getOnlineEffectTargetRef(effect) {
  const side = effect.targetSide || effect.sourceSide || effect.attackerSide || "player";
  const uid = effect.targetUid || effect.sourceUid || "";
  const lineId = effect.lineId || effect.targetLineId || effect.sourceLineId || "frontline";
  return findBoardInstance(state.battle, side, uid) || {
    side,
    lineId,
    uid,
    instance: {
      uid,
      cardId: effect.targetCardId || effect.sourceCardId || "us_marine_rifle",
      damage: 0,
    },
  };
}

async function playOnlineFireVideoForEffect(effect, sourceCard, videoKeys) {
  if (!["damage", "intercept"].includes(effect.type) || !sourceCard || !getCardFireVideoPath(sourceCard)) {
    return;
  }
  const sourceRef = getOnlineEffectSourceRef(effect);
  if (!sourceRef || sourceRef.instance.hidden || sourceRef.instance.masked) {
    return;
  }
  const videoKey = `${effect.atAction || ""}:${effect.sourceSide || effect.attackerSide || ""}:${effect.sourceUid || ""}:${sourceCard.id}`;
  if (videoKeys.has(videoKey)) {
    return;
  }
  videoKeys.add(videoKey);

  const battle = state.battle;
  battle.actionAnimation = {
    kind: "cardFireVideo",
    side: sourceRef.side,
    sourceUid: sourceRef.instance.uid,
    cardId: sourceCard.id,
  };
  render();
  await playCardFireVideo(sourceRef, sourceCard);
  if (state.battle === battle) {
    battle.actionAnimation = null;
    render();
  }
}

function getOnlineEffectSourceRef(effect) {
  const sourceSide = effect.sourceSide || effect.attackerSide || "player";
  const sourceUid = effect.sourceUid;
  if (!sourceUid) {
    return null;
  }
  return findBoardInstance(state.battle, sourceSide, sourceUid);
}

function leaveOnlineRoom() {
  if (state.online.socket?.readyState === WebSocket.OPEN && state.online.roomCode) {
    sendOnlineMessage({ type: "leave_room" });
  }
  state.online.socket?.close();
  state.online.socket = null;
  Object.assign(state.online, {
    status: "idle",
    roomCode: "",
    side: null,
    players: [],
    ready: false,
    matchReady: false,
    match: null,
    battleSnapshot: null,
    lastEffectSerial: 0,
    effectPlayback: Promise.resolve(),
    lastEvent: "已离开线上房间。",
  });
  renderOnlinePanel();
}

async function copyOnlineRoomCode() {
  if (!state.online.roomCode) {
    return;
  }
  const inviteUrl = getOnlineInviteUrl(state.online.roomCode);
  try {
    await navigator.clipboard.writeText(inviteUrl);
    state.online.lastEvent = `邀请链接已复制，房间码 ${state.online.roomCode}。`;
  } catch {
    state.online.lastEvent = `邀请链接：${inviteUrl}`;
  }
  renderOnlinePanel();
}

function ensureOnlineSocket() {
  const existing = state.online.socket;
  if (existing?.readyState === WebSocket.OPEN) {
    return Promise.resolve(existing);
  }
  if (existing?.readyState === WebSocket.CONNECTING) {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (socket) => {
        if (settled) {
          return;
        }
        settled = true;
        window.clearTimeout(timer);
        resolve(socket);
      };
      const timer = window.setTimeout(() => {
        existing.close();
        if (state.online.socket === existing) {
          state.online.socket = null;
          state.online.status = "error";
          state.online.error = "连接线上房间服务超时，请重新尝试。";
          state.online.lastEvent = "";
          renderOnlinePanel();
        }
        finish(null);
      }, ONLINE_SOCKET_TIMEOUT_MS);
      existing.addEventListener("open", () => finish(existing), { once: true });
      existing.addEventListener("error", () => finish(null), { once: true });
      existing.addEventListener("close", () => finish(null), { once: true });
    });
  }

  state.online.status = "connecting";
  state.online.error = "";
  state.online.lastEvent = "正在连接线上房间服务...";
  renderOnlinePanel();

  return new Promise((resolve) => {
    const socket = new WebSocket(getOnlineSocketUrl());
    state.online.socket = socket;
    let settled = false;
    const finish = (value) => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(connectTimer);
      resolve(value);
    };
    const connectTimer = window.setTimeout(() => {
      if (state.online.socket === socket) {
        socket.close();
        state.online.socket = null;
        state.online.status = "error";
        state.online.error = "连接线上房间服务超时，请检查网络后重试。";
        state.online.lastEvent = "";
        renderOnlinePanel();
      }
      finish(null);
    }, ONLINE_SOCKET_TIMEOUT_MS);

    socket.addEventListener("open", () => {
      state.online.status = "connected";
      state.online.error = "";
      state.online.lastEvent = "已连接线上房间服务。";
      renderOnlinePanel();
      finish(socket);
    }, { once: true });

    socket.addEventListener("message", (event) => {
      handleOnlineMessage(event.data);
    });

    socket.addEventListener("error", () => {
      state.online.status = "error";
      state.online.error = "无法连接线上房间服务。确认当前页面由 Node 服务启动，而不是直接打开 HTML 文件。";
      state.online.lastEvent = "";
      renderOnlinePanel();
      finish(null);
    }, { once: true });

    socket.addEventListener("close", () => {
      if (state.online.socket === socket) {
        state.online.socket = null;
        if (state.online.status !== "idle") {
          state.online.status = "disconnected";
          state.online.lastEvent = "线上连接已断开。";
        }
        state.online.roomCode = "";
        state.online.side = null;
        state.online.players = [];
        state.online.ready = false;
        state.online.matchReady = false;
        state.online.match = null;
        state.online.battleSnapshot = null;
        renderOnlinePanel();
      }
    });
  });
}

function handleOnlineMessage(raw) {
  let message;
  try {
    message = JSON.parse(String(raw));
  } catch {
    state.online.error = "收到无法解析的房间消息。";
    renderOnlinePanel();
    return;
  }

  if (message.type === "connected") {
    state.online.clientId = message.clientId || null;
    state.online.status = "connected";
    return;
  }

  if (message.type === "room_created" || message.type === "room_joined") {
    state.online.roomCode = message.roomCode || "";
    state.online.side = message.side || null;
    state.online.ready = false;
    state.online.matchReady = false;
    state.online.match = null;
    state.online.battleSnapshot = null;
    state.online.status = "connected";
    warmOnlineRoomAssets();
    state.online.lastEvent = message.type === "room_created" ? "房间已创建，复制房间码发给朋友。" : "已加入房间。";
    renderOnlinePanel();
    return;
  }

  if (message.type === "room_state") {
    state.online.roomCode = message.roomCode || state.online.roomCode;
    state.online.side = message.ownSide || state.online.side;
    state.online.players = Array.isArray(message.players) ? message.players : [];
    state.online.match = message.match || state.online.match;
    const self = state.online.players.find((player) => player.id === state.online.clientId);
    state.online.ready = Boolean(self?.ready);
    state.online.status = "connected";
    warmOnlineRoomAssets();
    renderOnlinePanel();
    return;
  }

  if (message.type === "match_ready") {
    state.online.matchReady = true;
    state.online.match = message.match || state.online.match;
    const seed = state.online.match?.seed ? ` Seed ${state.online.match.seed}` : "";
    warmOnlineRoomAssets();
    state.online.lastEvent = `双方已准备，服务器已创建权威对局。${seed} 点击进入战场。`;
    renderOnlinePanel();
    return;
  }

  if (message.type === "match_start") {
    state.online.matchReady = true;
    state.online.match = message.match || state.online.match;
    const seed = state.online.match?.seed ? ` Seed ${state.online.match.seed}` : "";
    warmOnlineRoomAssets();
    state.online.lastEvent = `真人对局房间已就绪。${seed} 点击进入战场接入服务器快照。`;
    renderOnlinePanel();
    return;
  }

  if (message.type === "battle_snapshot") {
    warmBattleSnapshotAssets(message);
    applyOnlineBattleSnapshot(message);
    return;
  }

  if (message.type === "room_closed") {
    state.online.roomCode = "";
    state.online.players = [];
    state.online.ready = false;
    state.online.matchReady = false;
    state.online.match = null;
    state.online.lastEvent = "房间已关闭。";
    renderOnlinePanel();
    return;
  }

  if (message.type === "left_room") {
    resetOnlineRoomState();
    state.online.lastEvent = "已离开房间。";
    renderOnlinePanel();
    return;
  }

  if (message.type === "error") {
    state.online.error = message.message || "线上房间发生错误。";
    if (isOnlineAuthoritativeBattle()) {
      state.battle.log.push(state.online.error);
      render();
      return;
    }
    renderOnlinePanel();
  }
}

function sendOnlineMessage(message) {
  if (state.online.socket?.readyState !== WebSocket.OPEN) {
    state.online.error = "线上连接尚未建立。";
    renderOnlinePanel();
    return false;
  }
  state.online.socket.send(JSON.stringify(message));
  return true;
}

function resetOnlineRoomState() {
  Object.assign(state.online, {
    roomCode: "",
    side: null,
    players: [],
    ready: false,
    matchReady: false,
    match: null,
    battleSnapshot: null,
    error: "",
  });
}

function getOnlineLoadout() {
  return {
    faction: state.playerFaction,
    deck: state.playerDeck.slice(0, DECK_RULES.size),
  };
}

function getOnlineSocketUrl() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

function getOnlineInviteUrl(roomCode) {
  const url = new URL(window.location.href);
  url.searchParams.set("room", roomCode);
  return url.toString();
}

function getInitialOnlineRoomCode() {
  try {
    return new URL(window.location.href).searchParams.get("room")?.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "";
  } catch {
    return "";
  }
}

function getOnlineStatusText() {
  if (state.online.matchReady) {
    return "可进入战场";
  }
  if (state.online.roomCode) {
    return `房间 ${state.online.roomCode}`;
  }
  if (state.online.status === "connecting") {
    return "连接中";
  }
  if (state.online.status === "connected") {
    return "已连接";
  }
  if (state.online.status === "error") {
    return "连接失败";
  }
  if (state.online.status === "disconnected") {
    return "已断开";
  }
  return "未连接";
}

function loadOnlineName() {
  try {
    return localStorage.getItem("warzone.onlineName") || "Michael";
  } catch {
    return "Michael";
  }
}

function saveOnlineName(name) {
  try {
    localStorage.setItem("warzone.onlineName", name || "Player");
  } catch {
    // Local storage can be unavailable in restricted browser contexts.
  }
}

function toggleLogPanel() {
  state.logCollapsed = !state.logCollapsed;
  renderLog();
}

function toggleBgm() {
  state.bgmOn = !state.bgmOn;
  if (state.bgmOn) {
    playBgm();
  } else {
    refs.bgm?.pause();
  }
  refs.app.dataset.bgm = state.bgmOn ? "on" : "off";
  renderBgmToggle();
  renderScore();
}

function playBgm(forceNext = false) {
  if (!refs.bgm || !state.bgmOn) {
    return;
  }
  if (forceNext || !state.currentBgmTrack || refs.bgm.src !== new URL(state.currentBgmTrack, window.location.href).href) {
    const nextTrack = pickRandomBgmTrack(state.currentBgmTrack);
    state.currentBgmTrack = nextTrack;
    refs.bgm.src = nextTrack;
    refs.bgm.currentTime = 0;
  }
  refs.bgm.volume = 0.34;
  refs.bgm.play().catch(() => {
    state.bgmOn = false;
    refs.app.dataset.bgm = "off";
    renderBgmToggle();
    renderScore();
  });
}

function handleBgmEnded() {
  if (!state.bgmOn) {
    return;
  }
  playBgm(true);
}

function pickRandomBgmTrack(previousTrack = null) {
  const pool = BGM_PLAYLIST.filter((track) => track !== previousTrack);
  const choices = pool.length ? pool : BGM_PLAYLIST;
  return choices[Math.floor(Math.random() * choices.length)];
}

function cancelIntent() {
  if (state.pending?.kind === "supplyChoice" || state.pending?.kind === "interceptChoice") {
    gameAudio.play("ui.error");
    return;
  }
  state.pending = null;
  state.selectedHandUid = null;
  clearSpotlight();
  clearDragState();
  render();
}

function handleDragStart(event) {
  const cardElement = event.target.closest("[data-hand-card]");
  if (!cardElement) {
    return;
  }
  if (!canPlayerAct() || state.pending) {
    event.preventDefault();
    return;
  }
  const uid = cardElement.dataset.handCard;
  const instance = state.battle.hands.player.find((item) => item.uid === uid);
  if (!instance) {
    event.preventDefault();
    return;
  }
  const card = getCard(instance.cardId);
  const rect = cardElement.getBoundingClientRect();
  state.draggingUid = uid;
  state.selectedHandUid = uid;
  state.dragMode = card.type === "unit" ? "unit" : "effect";
  state.dragStart = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
  state.dragTargets = card.type === "unit" ? [] : getValidEffectTargets(state.battle, "player", card.ability, card);
  if (card.type !== "unit" && !state.dragTargets.length) {
    clearDragState({ render: false });
    event.preventDefault();
    return;
  }
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", uid);
  event.dataTransfer.setData("application/x-war-card-uid", uid);
  updateTargetingLine(state.dragStart);
  renderBoard();
}

function handleDragMove(event) {
  if (!state.draggingUid || !hasPointerPosition(event)) {
    return;
  }
  updateTargetingLine(event, false);
}

function handleDragOver(event) {
  if (!state.draggingUid) {
    return;
  }
  const row = event.target.closest("[data-row]");
  const boardTarget = event.target.closest("[data-board-card]");
  clearDragHover();

  let valid = false;
  if (state.dragMode === "unit" && row && isSelectedUnitAllowedOn(row.dataset.side, row.dataset.row)) {
    valid = true;
    row.classList.add("is-drag-over");
  } else if (state.dragMode === "effect" && boardTarget && isDragTarget(boardTarget.dataset.side, boardTarget.dataset.boardCard)) {
    valid = true;
    boardTarget.classList.add("is-drag-over");
  }

  if (valid) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }
  updateTargetingLine(event, valid);
}

function handleDragLeave(event) {
  const target = event.target.closest("[data-row],[data-board-card]");
  if (target && !target.contains(event.relatedTarget)) {
    target.classList.remove("is-drag-over");
  }
}

function handleDrop(event) {
  const row = event.target.closest("[data-row]");
  const boardTarget = event.target.closest("[data-board-card]");
  const uid = state.draggingUid;
  if (!uid) {
    clearDragState();
    return;
  }

  if (state.dragMode === "unit" && row && isSelectedUnitAllowedOn(row.dataset.side, row.dataset.row)) {
    event.preventDefault();
    clearDragState({ render: false, preserveSelection: true });
    state.selectedHandUid = uid;
    playSelectedUnitToRow(row.dataset.side, row.dataset.row);
    return;
  }

  if (state.dragMode === "effect" && boardTarget && isDragTarget(boardTarget.dataset.side, boardTarget.dataset.boardCard)) {
    event.preventDefault();
    const payload = createDraggedEffectPayload(uid, boardTarget.dataset.side, boardTarget.dataset.boardCard);
    clearDragState({ render: false });
    if (payload) {
      const result = resolveEffectOnTarget(state.battle, payload);
      if (result === "pending-animation" || result === "pending") {
        return;
      }
      finishAction("player");
    } else {
      render();
    }
    return;
  }

  clearDragState();
}

function clearDragState(options = {}) {
  const hadDrag = Boolean(state.draggingUid || state.dragMode || state.dragTargets.length || state.dragStart);
  const shouldRender = options.render ?? true;
  const preserveSelection = options.preserveSelection ?? false;
  state.draggingUid = null;
  state.dragMode = null;
  state.dragTargets = [];
  state.dragStart = null;
  if (hadDrag && !preserveSelection) {
    state.selectedHandUid = null;
  }
  clearDragHover();
  hideTargetingLine();
  if (hadDrag && shouldRender && state.screen === "battle") {
    render();
  }
}

function clearDragHover() {
  refs.board?.querySelectorAll(".is-drag-over").forEach((item) => item.classList.remove("is-drag-over"));
}

function isDragTarget(side, uid) {
  return state.dragTargets.some((target) => target.side === side && target.uid === uid);
}

function createDraggedEffectPayload(uid, targetSide, targetUid) {
  const battle = state.battle;
  if (!battle || !isDragTarget(targetSide, targetUid)) {
    return null;
  }
  const instance = battle.hands.player.find((item) => item.uid === uid);
  if (!instance) {
    return null;
  }
  const card = getCard(instance.cardId);
  if (card.type === "unit") {
    return null;
  }
  return {
    side: "player",
    handUid: uid,
    cardId: card.id,
    ability: card.ability,
    target: { side: targetSide, uid: targetUid },
  };
}

function updateTargetingLine(point, valid = false) {
  if (!refs.targetingLine || !refs.targetingPath || !state.dragStart) {
    return;
  }
  const end = normalizePointerPoint(point);
  refs.targetingLine.hidden = false;
  refs.targetingLine.classList.toggle("is-valid", valid);
  refs.targetingLine.classList.toggle("is-invalid", !valid);
  const start = state.dragStart;
  const dx = end.x - start.x;
  const lift = state.dragMode === "effect" ? -54 : -34;
  const c1x = start.x + dx * 0.34;
  const c2x = start.x + dx * 0.72;
  const c1y = start.y + lift;
  const c2y = end.y + lift;
  refs.targetingPath.setAttribute("d", `M ${start.x} ${start.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${end.x} ${end.y}`);
}

function hideTargetingLine() {
  refs.targetingLine?.classList.remove("is-valid", "is-invalid");
  if (refs.targetingPath) {
    refs.targetingPath.setAttribute("d", "");
  }
  if (refs.targetingLine) {
    refs.targetingLine.hidden = true;
  }
}

function normalizePointerPoint(point) {
  if (typeof point?.x === "number" && typeof point?.y === "number") {
    return point;
  }
  if (hasPointerPosition(point)) {
    return { x: point.clientX, y: point.clientY };
  }
  return state.dragStart;
}

function hasPointerPosition(event) {
  return Number.isFinite(event?.clientX) && Number.isFinite(event?.clientY) && (event.clientX !== 0 || event.clientY !== 0);
}

function getIntentCopy(card, pending = null) {
  if (pending?.kind === "interceptChoice") {
    return "选择一个合法防空单位执行拦截；当前规则没有放弃拦截。";
  }
  if (pending?.kind === "callFireChoice") {
    return "选择一个本回合未行动的榴弹炮或火箭炮，立即打击已标定目标。";
  }
  if (card.ability?.kind === "expose" || card.ability?.kind === "exposeOrDamage") {
    return "选择一个合法目标；若其处于【隐蔽】，令其【暴露】。";
  }
  if (card.ability?.kind === "smoke") {
    return "选择己方已暴露单位，移除暴露并重新进入【隐蔽】。";
  }
  if (card.ability?.kind === "callFire") {
    return "选择敌方目标，调用己方远火单位开火；被调用单位会暴露。";
  }
  if (card.ability?.kind === "suppress") {
    return "选择敌方合法目标；目标下回合不能行动。";
  }
  if (card.ability?.kind === "decoy") {
    return "旧版诱饵效果已停用。";
  }
  if (card.ability?.kind === "camouflage") {
    return "选择己方未暴露单位，使其进入【隐蔽】。";
  }
  if (card.ability?.kind === "counterBattery") {
    return "选择敌方暴露的支援区单位，调用远火进行反炮兵打击。";
  }
  if (card.ability?.kind === "damageBoost") {
    return "旧版火力指示效果已停用。";
  }
  return "选择一个合法目标结算伤害。支援区通常需要暴露、失去掩护或牌面允许才可被指定。";
}

function getPrimaryGlyph(card) {
  const tags = card.tags;
  if (tags.includes("装甲")) return "甲";
  if (tags.includes("直升机")) return "旋";
  if (tags.includes("无人机")) return "侦";
  if (tags.includes("榴弹炮")) return "炮";
  if (tags.includes("火箭炮")) return "箭";
  if (tags.includes("重型防空") || tags.includes("伴随防空")) return "防";
  if (tags.includes("战斗机")) return "空";
  if (tags.includes("空战")) return "空";
  if (tags.includes("远火")) return "火";
  if (tags.includes("步兵")) return "兵";
  if (tags.includes("战机")) return "空";
  if (tags.includes("导弹")) return "弹";
  if (tags.includes("烟幕") || tags.includes("电子战")) return "扰";
  if (tags.includes("轰炸机")) return "轰";
  return "兵";
}

function getSideName(battle, side) {
  return getFaction(battle.factions[side]).shortName;
}

function getLineIconPath(lineId) {
  return `./assets/cards/lane-${lineId === "support" ? "firesupport" : "frontline"}.png`;
}

function getFactionEmblemPath(factionId) {
  return factionId === "usa" ? "./assets/cards/emblem-anchor.png" : "./assets/cards/emblem-star.png";
}

function getCardArtPosition(cardId) {
  const tunedPositions = {
    us_tomahawk: "center 48%",
    us_b2_bombing: "center 48%",
    ru_iskander: "center 45%",
    ru_tu22m3: "center 47%",
  };
  return tunedPositions[cardId] || "center";
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen?.();
  } else {
    document.documentElement.requestFullscreen?.();
  }
}

function exposeDebugHooks() {
  window.render_game_to_text = () => {
    const battle = state.battle;
    if (!battle) {
      return JSON.stringify({ screen: state.screen, source: "/Users/michaelwu/Documents/战区卡牌游戏项目/战争卡牌游戏" });
    }
    return JSON.stringify({
      screen: state.screen,
      phase: battle.phase,
      mode: battle.mode,
      onlineMatch: battle.onlineMatch,
      round: battle.round,
      activeSide: battle.activeSide,
      scores: {
        player: getTotalScore(battle, "player"),
        enemy: getTotalScore(battle, "enemy"),
      },
      hands: {
        player: battle.hands.player.length,
        enemy: battle.hands.enemy.length,
      },
      intel: battle.intel,
      supplyExhausted: battle.supplyExhausted,
      finalActions: battle.finalActions,
      mulliganActive: state.mulligan.active,
      pending: state.pending?.kind || null,
      rows: LINES.map((line) => ({
        line: line.id,
        player: battle.board.player[line.id].map((item) => serializeBoardInstance(item, "player")),
        enemy: battle.board.enemy[line.id].map((item) => serializeBoardInstance(item, "enemy")),
      })),
    });
  };

  window.advanceTime = () => {
    render();
  };
}

function serializeBoardInstance(instance, side = "player") {
  const card = getVisibleCardForInstance(instance, side);
  return {
    name: card.name,
    attack: getCardBaseAttack(card),
    health: getCurrentPower(instance),
    value: getCardTargetValue(card),
    attribute: getCardUnitAttribute(card),
    bonus: instance.bonus || 0,
    damage: instance.damage,
    hidden: instance.hidden,
    exposed: instance.exposed,
    fortified: instance.fortified,
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
