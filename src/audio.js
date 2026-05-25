const SAMPLE_ROOT = "./assets/audio/sfx/curated";
const GENERATED_ROOT = "./assets/audio/sfx/generated";
const ENHANCED_ROOT = "./assets/audio/sfx/enhanced";
const FREE_ROOT = "./assets/audio/sfx/free/deadsounds";
const LOCAL_ROOT = "./assets/audio/sfx/local-reference";
const LOCAL_MANIFEST_URL = `${LOCAL_ROOT}/manifest.json`;
const LOCAL_MANIFEST_ENABLED_KEY = "warCardLocalSfx";

const SAMPLE_EVENTS = {
  "ui.hover": [`${SAMPLE_ROOT}/ui/ui_hover_radar.ogg`],
  "ui.click": [`${SAMPLE_ROOT}/ui/ui_click_tight.ogg`],
  "ui.confirm": [`${SAMPLE_ROOT}/ui/ui_confirm_clean.ogg`],
  "ui.error": [`${SAMPLE_ROOT}/ui/ui_error_rejected.ogg`],
  "ui.switch": [`${SAMPLE_ROOT}/ui/ui_select_soft.ogg`],
  "card.draw": [`${GENERATED_ROOT}/card_draw_tactical.wav`, `${SAMPLE_ROOT}/cards/card_flip_switch.ogg`],
  "card.flip": [`${GENERATED_ROOT}/card_flip_physical.wav`, `${SAMPLE_ROOT}/cards/card_flip_switch.ogg`],
  "card.drag": [`${SAMPLE_ROOT}/cards/card_drag_texture.ogg`],
  "card.deploy": [`${SAMPLE_ROOT}/cards/card_deploy_drop.ogg`, `${SAMPLE_ROOT}/tactical/mechanical_deploy_open.ogg`],
  "target.lock": [`${SAMPLE_ROOT}/cards/card_target_lock.ogg`],
  "combat.armor.light": [`${SAMPLE_ROOT}/combat/armor_hit_light.ogg`],
  "combat.armor.medium": [`${ENHANCED_ROOT}/impact_armor_piercing_hit_enhanced.wav`, `${GENERATED_ROOT}/impact_armor_piercing_hit.wav`, `${SAMPLE_ROOT}/combat/armor_hit_medium.ogg`],
  "combat.armor.heavy": [`${ENHANCED_ROOT}/impact_armor_piercing_hit_enhanced.wav`, `${GENERATED_ROOT}/impact_armor_piercing_hit.wav`, `${SAMPLE_ROOT}/combat/armor_hit_heavy.ogg`],
  "combat.explosion": [`${ENHANCED_ROOT}/impact_heavy_explosion_near_enhanced.wav`, `${GENERATED_ROOT}/impact_heavy_explosion_near.wav`, `${SAMPLE_ROOT}/combat/explosion_crunch_short.ogg`, `${SAMPLE_ROOT}/combat/explosion_low_hit.ogg`],
  "impact.heavyExplosion": [`${ENHANCED_ROOT}/impact_heavy_explosion_near_enhanced.wav`, `${GENERATED_ROOT}/impact_heavy_explosion_near.wav`],
  "impact.armorPiercing": [`${ENHANCED_ROOT}/impact_armor_piercing_hit_enhanced.wav`, `${GENERATED_ROOT}/impact_armor_piercing_hit.wav`],
  "impact.airburst": [`${ENHANCED_ROOT}/impact_airburst_missile_enhanced.wav`, `${GENERATED_ROOT}/impact_airburst_missile.wav`],
  "combat.shield": [`${SAMPLE_ROOT}/combat/shield_pulse.ogg`],
  "tactical.radio": [`${SAMPLE_ROOT}/tactical/radio_digital_noise.ogg`],
  "tactical.drone": [`${SAMPLE_ROOT}/tactical/drone_loop_short.ogg`],
  "tactical.aircraft": [`${SAMPLE_ROOT}/tactical/aircraft_pass_soft.ogg`],
  "unit.infantry.fire": [`${FREE_ROOT}/machine_gun_45_short_bursts.mp3`, `${FREE_ROOT}/machine_gun_45_short_bursts.mp3`, `${ENHANCED_ROOT}/unit_infantry_fire_enhanced.wav`],
  "unit.armor.fire": [`${FREE_ROOT}/tank_gun_one_shot.mp3`, `${FREE_ROOT}/tank_gun_one_shot.mp3`, `${FREE_ROOT}/tank_howitzer_inside_one_shot.mp3`, `${ENHANCED_ROOT}/unit_armor_cannon_enhanced.wav`],
  "unit.helicopter.fire": [`${ENHANCED_ROOT}/unit_helicopter_rocket_run_enhanced.wav`, `${GENERATED_ROOT}/unit_helicopter_rocket_run.wav`],
  "unit.artillery.fire": [`${FREE_ROOT}/artillery_105mm_two_shots.mp3`, `${FREE_ROOT}/artillery_105mm_two_shots.mp3`, `${FREE_ROOT}/artillery_distant_shot.mp3`, `${ENHANCED_ROOT}/unit_artillery_howitzer_enhanced.wav`],
  "unit.rocketArtillery.fire": [`${ENHANCED_ROOT}/unit_rocket_artillery_salvo_enhanced.wav`, `${GENERATED_ROOT}/unit_rocket_artillery_salvo.wav`],
  "unit.heavyAa.fire": [`${ENHANCED_ROOT}/unit_heavy_aa_missile_enhanced.wav`, `${GENERATED_ROOT}/unit_heavy_aa_missile.wav`],
  "unit.mobileAa.fire": [`${FREE_ROOT}/machine_gun_45_short_bursts.mp3`, `${FREE_ROOT}/machine_gun_45_short_bursts.mp3`, `${ENHANCED_ROOT}/unit_mobile_aa_burst_enhanced.wav`],
  "unit.drone.fire": [`${ENHANCED_ROOT}/unit_drone_strike_enhanced.wav`, `${GENERATED_ROOT}/unit_drone_strike.wav`],
  "unit.fighter.fire": [`${ENHANCED_ROOT}/unit_fighter_strike_enhanced.wav`, `${GENERATED_ROOT}/unit_fighter_strike.wav`],
  "unit.bomber.fire": [`${ENHANCED_ROOT}/unit_bomber_bomb_run_enhanced.wav`, `${GENERATED_ROOT}/unit_bomber_bomb_run.wav`],
  "system.sting": [`${SAMPLE_ROOT}/system/objective_secured_sting.ogg`],
};

const CATEGORY_PATTERNS = [
  {
    category: "bomber",
    patterns: ["b2", "tu22", "tu-22", "bomber", "轰炸", "杞扮偢"],
  },
  {
    category: "fighter",
    patterns: ["fighter", "f35", "f-35", "su35", "su-35", "fighter_raid", "战斗机", "鎴樻満"],
  },
  {
    category: "heavyAa",
    patterns: ["patriot", "buk", "heavy_aa", "防空导弹", "闃茬┖瀵煎脊"],
  },
  {
    category: "mobileAa",
    patterns: ["avenger", "pantsir", "mshorad", "air_defense", "防空步兵", "近防", "伴随防空"],
  },
  {
    category: "rocketArtillery",
    patterns: ["himars", "m270", "tornado", "tos1a", "tos-1a", "iskander", "rocket", "火箭", "瀵煎脊", "鐏"],
  },
  {
    category: "artillery",
    patterns: ["m109", "2s19", "2s9", "m1064", "mortar", "nona", "bereg", "howitzer", "榴弹", "炮", "鐏鐐"],
  },
  {
    category: "helicopter",
    patterns: ["apache", "little_bird", "ka52", "ka-52", "mi28", "mi-28", "ah1z", "helicopter", "直升机", "鐩村崌"],
  },
  {
    category: "drone",
    patterns: ["reaper", "gray_eagle", "orlan", "forpost", "mq1c", "rq170", "lancet", "drone", "无人机", "鏃犱汉"],
  },
  {
    category: "electronic",
    patterns: ["ew", "krasukha", "electronic", "decoy", "screen", "smoke", "jam", "电", "烟", "鐢靛瓙", "鐑熷箷"],
  },
  {
    category: "armor",
    patterns: ["m1a2", "t90", "t-90", "bmpt", "bradley", "stryker", "lav", "btr", "brdm", "bmp", "bmd", "sprut", "aavp", "dragoon", "kornet", "m88", "tank", "armor", "装甲", "瑁呯敳"],
  },
  {
    category: "infantry",
    patterns: ["marine", "infantry", "airborne", "ranger", "green_beret", "seal", "spetsnaz", "rpg", "javelin", "motostrelki", "vdv", "reservisty", "caat", "ags17", "步兵", "姝ュ叺"],
  },
];

const MASTER_VOLUME = 0.72;
const SAMPLE_VOLUME = 0.54;

class GameAudio {
  constructor() {
    this.context = null;
    this.master = null;
    this.unlocked = false;
    this.lastPlayedAt = new Map();
    this.localEvents = new Map();
    this.activeSamples = new Set();
    this.hoverCooldown = 90;
  }

  preload() {
    this.loadLocalManifest();
    this.preloadUrls(Object.values(SAMPLE_EVENTS).flat());
  }

  preloadUrls(urls = []) {
    urls.forEach((url) => {
      const audio = new Audio(url);
      audio.preload = "auto";
    });
  }

  loadLocalManifest() {
    if (typeof fetch !== "function" || !this.shouldLoadLocalManifest()) {
      return;
    }

    fetch(LOCAL_MANIFEST_URL, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((manifest) => {
        const events = manifest?.events || manifest;
        if (!events || typeof events !== "object") {
          return;
        }

        this.localEvents.clear();
        Object.entries(events).forEach(([eventName, value]) => {
          const rawPaths = Array.isArray(value) ? value : value?.files || value?.variants || [value];
          const urls = rawPaths.map((path) => this.normalizeLocalUrl(path)).filter(Boolean);
          if (urls.length) {
            this.localEvents.set(eventName, urls);
          }
        });
        this.preloadUrls([...this.localEvents.values()].flat());
      })
      .catch(() => {});
  }

  shouldLoadLocalManifest() {
    try {
      const params = new URLSearchParams(window.location.search);
      if (["1", "true", "yes"].includes((params.get("localSfx") || "").toLowerCase())) {
        return true;
      }
      return window.localStorage?.getItem(LOCAL_MANIFEST_ENABLED_KEY) === "1";
    } catch (error) {
      return false;
    }
  }

  normalizeLocalUrl(path) {
    const trimmedPath = String(path || "").trim();
    if (!trimmedPath) {
      return null;
    }
    if (/^(https?:)?\/\//.test(trimmedPath) || trimmedPath.startsWith("/") || trimmedPath.startsWith("./") || trimmedPath.startsWith("../")) {
      return trimmedPath;
    }
    return `${LOCAL_ROOT}/${trimmedPath}`;
  }

  unlock() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return false;
    }
    if (!this.context) {
      this.context = new AudioContextClass();
      this.master = this.context.createGain();
      this.master.gain.value = MASTER_VOLUME;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === "suspended") {
      this.context.resume().catch(() => {});
    }
    this.unlocked = true;
    return true;
  }

  play(eventName, options = {}) {
    if (eventName === "ui.hover" && !this.canPlayNow(eventName, this.hoverCooldown)) {
      return;
    }
    this.unlock();
    this.playSample(eventName, options);

    switch (eventName) {
      case "ui.hover":
        this.radarPing(0.05);
        break;
      case "ui.click":
        this.metalTick(0.08, 1200);
        break;
      case "ui.confirm":
        this.confirmBeep();
        break;
      case "ui.error":
        this.errorBuzz();
        break;
      case "ui.switch":
        this.radioClick();
        break;
      case "card.draw":
        this.cardDraw(options.count || 1);
        break;
      case "card.drawHand":
        this.cardDraw(Math.max(2, options.count || 5));
        break;
      case "card.flip":
        this.cardFlip();
        break;
      case "card.drag":
        this.playSample("card.drag", { volume: 0.26, playbackRate: 0.95 + Math.random() * 0.12 });
        break;
      case "card.conceal":
        this.conceal();
        break;
      case "card.reveal":
        this.reveal();
        break;
      case "target.lock":
        this.targetLock();
        break;
      case "defense.intercept":
        this.intercept(options.sourceCard);
        break;
      case "defense.screen":
        this.screenBlock();
        break;
      case "combat.blocked":
        this.blocked();
        break;
      case "combat.destroyed":
        this.destroyed(options.card);
        break;
      case "system.start":
        this.systemStart();
        break;
      case "system.pass":
        this.radioClick();
        this.softThump(0.1, 95, 0.28);
        break;
      case "system.victory":
        this.victory();
        break;
      case "system.defeat":
        this.defeat();
        break;
      case "system.draw":
        this.neutralEnd();
        break;
      case "system.supplyExhausted":
        this.warningSiren();
        break;
      default:
        break;
    }
  }

  playCard(card, options = {}) {
    if (!card) {
      return;
    }
    const category = classifyCard(card);
    const action = options.action || "effect";
    const abilityKind = options.ability?.kind || card.ability?.kind;

    if (action === "conceal") {
      this.play("card.conceal", { card });
      return;
    }
    if (action === "reveal") {
      this.play("card.reveal", { card });
      this.playCategoryCue(category, "reveal", card);
      return;
    }
    if (action === "deploy") {
      if (options.hidden) {
        return;
      }
      this.playSample("card.deploy", { volume: 0.38, playbackRate: 0.92 + Math.random() * 0.14 });
      this.playCategoryCue(category, "deploy", card);
      return;
    }

    if (abilityKind === "expose" || abilityKind === "exposeOrDamage") {
      this.playCategoryCue(category === "infantry" ? "drone" : category, "recon", card);
      return;
    }
    if (abilityKind === "damageBoost") {
      this.play("target.lock", { card });
      return;
    }
    if (abilityKind === "smoke") {
      this.smoke();
      return;
    }
    if (abilityKind === "repair") {
      this.repair(category);
      return;
    }
    if (abilityKind === "fortify") {
      this.hydraulicArm();
      this.screenBlock();
      return;
    }
    if (abilityKind === "fireBoost") {
      this.droneMark();
      return;
    }
    if (abilityKind === "damageGuard" || abilityKind === "intelDeny") {
      this.electronicWarfare();
      return;
    }
    if (abilityKind === "callFire" || abilityKind === "counterBattery") {
      this.callFire();
      return;
    }

    this.playCategoryCue(category, "attack", card);
  }

  playImpact(sourceCard, targetCard, options = {}) {
    const sourceCategory = classifyCard(sourceCard);
    const targetCategory = classifyCard(targetCard);
    const amount = options.amount || 1;
    const heavy = amount >= 5 || ["rocketArtillery", "artillery", "bomber"].includes(sourceCategory);

    if (targetCategory === "armor" || targetCategory === "heavyAa" || targetCategory === "mobileAa") {
      this.playSample("impact.armorPiercing", { volume: heavy ? 0.82 : 0.72, playbackRate: heavy ? 0.92 : 1.02 });
      return;
    }
    if (targetCategory === "helicopter" || targetCategory === "fighter" || targetCategory === "bomber" || targetCategory === "drone") {
      this.playSample("impact.airburst", { volume: heavy ? 0.78 : 0.64, playbackRate: heavy ? 0.92 : 1.04 });
      return;
    }
    if (heavy) {
      this.playSample("impact.heavyExplosion", { volume: 0.82, playbackRate: 0.94 + Math.random() * 0.08 });
      return;
    }
    this.softImpact();
  }

  playCategoryCue(category, action, card) {
    if (action === "deploy") {
      this.deployByCategory(category);
      return;
    }
    if (action === "recon") {
      this.reconByCategory(category);
      return;
    }
    if (action === "reveal") {
      this.radioClick();
      return;
    }
    this.attackByCategory(category, card);
  }

  deployByCategory(category) {
    switch (category) {
      case "infantry":
        this.radioClick();
        this.gearStep(0.14);
        break;
      case "armor":
        this.softThump(0.16, 64, 0.35);
        this.metalTick(0.1, 220);
        break;
      case "helicopter":
        this.rotorBurst(0.55, 0.22);
        break;
      case "artillery":
      case "rocketArtillery":
        this.hydraulicArm();
        break;
      case "heavyAa":
      case "mobileAa":
        this.radarSweep();
        break;
      case "drone":
        this.droneOnline();
        break;
      case "fighter":
      case "bomber":
        this.jetPass(0.45);
        break;
      case "electronic":
        this.electronicWarfare();
        break;
      default:
        this.radioClick();
        break;
    }
  }

  reconByCategory(category) {
    if (category === "drone") {
      this.droneMark();
      return;
    }
    if (category === "electronic") {
      this.electronicWarfare();
      return;
    }
    this.targetLock();
  }

  attackByCategory(category) {
    switch (category) {
      case "infantry":
        this.infantryBurst();
        break;
      case "armor":
        this.tankCannon();
        break;
      case "helicopter":
        this.helicopterAttack();
        break;
      case "artillery":
        this.artilleryFire();
        break;
      case "rocketArtillery":
        this.rocketSalvo();
        break;
      case "heavyAa":
      case "mobileAa":
        this.aaLaunch(category === "heavyAa");
        break;
      case "drone":
        this.droneStrike();
        break;
      case "fighter":
        this.fighterStrike();
        break;
      case "bomber":
        this.bomberStrike();
        break;
      case "electronic":
        this.electronicWarfare();
        break;
      default:
        this.tacticalPulse();
        break;
    }
  }

  playSample(eventName, options = {}) {
    const localVariants = this.localEvents.get(eventName);
    const variants = localVariants?.length ? localVariants : SAMPLE_EVENTS[eventName];
    if (!variants?.length) {
      return;
    }
    const url = variants[Math.floor(Math.random() * variants.length)];
    this.playAudioUrl(url, options, () => {
      if (!localVariants?.length) {
        return;
      }
      const fallbackVariants = SAMPLE_EVENTS[eventName];
      if (!fallbackVariants?.length) {
        return;
      }
      const fallbackUrl = fallbackVariants[Math.floor(Math.random() * fallbackVariants.length)];
      this.playAudioUrl(fallbackUrl, options);
    });
  }

  playAudioUrl(url, options = {}, onFailure = null) {
    const audio = new Audio(url);
    audio.volume = Math.min(1, Math.max(0, options.volume ?? SAMPLE_VOLUME));
    audio.playbackRate = Math.min(1.45, Math.max(0.65, options.playbackRate ?? 0.96 + Math.random() * 0.08));
    this.activeSamples.add(audio);
    const release = () => {
      audio.removeEventListener("ended", release);
      audio.removeEventListener("error", release);
      this.activeSamples.delete(audio);
    };
    audio.addEventListener("ended", release);
    audio.addEventListener("error", release);
    const playPromise = audio.play();
    if (playPromise?.catch) {
      playPromise.catch(() => {
        release();
        if (typeof onFailure === "function") {
          onFailure();
        }
      });
    }
  }

  canPlayNow(key, cooldownMs) {
    const now = performance.now();
    const previous = this.lastPlayedAt.get(key) || 0;
    if (now - previous < cooldownMs) {
      return false;
    }
    this.lastPlayedAt.set(key, now);
    return true;
  }

  ctx() {
    this.unlock();
    return this.context;
  }

  gain(value = 0.3) {
    const ctx = this.ctx();
    const gain = ctx.createGain();
    gain.gain.value = value;
    gain.connect(this.master);
    return gain;
  }

  tone({ frequency = 440, duration = 0.2, type = "sine", volume = 0.2, start = 0, end = 0.001, detune = 0 }) {
    const ctx = this.ctx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const out = this.gain();
    const now = ctx.currentTime + start;
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    osc.detune.setValueAtTime(detune, now);
    out.gain.setValueAtTime(0.0001, now);
    out.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), now + Math.min(0.025, duration * 0.2));
    out.gain.exponentialRampToValueAtTime(Math.max(0.0001, end), now + duration);
    osc.connect(out);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  sweep({ from = 800, to = 120, duration = 0.35, type = "sawtooth", volume = 0.24, start = 0 }) {
    const ctx = this.ctx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const out = this.gain();
    const now = ctx.currentTime + start;
    osc.type = type;
    osc.frequency.setValueAtTime(from, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), now + duration);
    out.gain.setValueAtTime(0.0001, now);
    out.gain.exponentialRampToValueAtTime(volume, now + 0.02);
    out.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(out);
    osc.start(now);
    osc.stop(now + duration + 0.04);
  }

  noise({ duration = 0.2, volume = 0.25, frequency = 900, bandwidth = 1.2, start = 0, attack = 0.01, type = "bandpass" }) {
    const ctx = this.ctx();
    if (!ctx) return;
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(sampleRate * duration)), sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const out = this.gain();
    const now = ctx.currentTime + start;
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = bandwidth;
    out.gain.setValueAtTime(0.0001, now);
    out.gain.linearRampToValueAtTime(volume, now + attack);
    out.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.buffer = buffer;
    src.connect(filter);
    filter.connect(out);
    src.start(now);
    src.stop(now + duration + 0.02);
  }

  radarPing(volume = 0.08) {
    this.tone({ frequency: 1380, duration: 0.08, type: "sine", volume });
    this.tone({ frequency: 1840, duration: 0.05, type: "triangle", volume: volume * 0.65, start: 0.035 });
  }

  metalTick(duration = 0.08, frequency = 980) {
    this.tone({ frequency, duration, type: "square", volume: 0.1 });
    this.noise({ duration: duration * 0.8, volume: 0.055, frequency: 3200, bandwidth: 7 });
  }

  confirmBeep() {
    this.tone({ frequency: 820, duration: 0.08, type: "triangle", volume: 0.12 });
    this.tone({ frequency: 1240, duration: 0.12, type: "triangle", volume: 0.1, start: 0.07 });
  }

  errorBuzz() {
    this.sweep({ from: 190, to: 105, duration: 0.22, type: "sawtooth", volume: 0.16 });
    this.noise({ duration: 0.18, volume: 0.05, frequency: 520, bandwidth: 2 });
  }

  radioClick() {
    this.noise({ duration: 0.035, volume: 0.09, frequency: 2600, bandwidth: 4 });
    this.tone({ frequency: 520, duration: 0.045, type: "square", volume: 0.055, start: 0.025 });
  }

  cardDraw(count = 1) {
    const max = Math.min(5, count);
    for (let index = 0; index < max; index += 1) {
      this.noise({ duration: 0.08, volume: 0.055, frequency: 1700 + index * 90, bandwidth: 1.2, start: index * 0.045 });
      this.metalTick(0.055, 820 + index * 60);
    }
  }

  cardFlip() {
    this.playSample("card.flip", { volume: 0.42, playbackRate: 1 + Math.random() * 0.1 });
    this.noise({ duration: 0.11, volume: 0.075, frequency: 2200, bandwidth: 1.5 });
    this.tone({ frequency: 340, duration: 0.08, type: "triangle", volume: 0.07, start: 0.05 });
  }

  conceal() {
    this.playSample("tactical.radio", { volume: 0.16, playbackRate: 1.2 });
    this.sweep({ from: 920, to: 230, duration: 0.18, type: "triangle", volume: 0.08 });
    this.noise({ duration: 0.18, volume: 0.045, frequency: 1400, bandwidth: 1.8 });
  }

  reveal() {
    this.playSample("card.flip", { volume: 0.36, playbackRate: 0.92 });
    this.sweep({ from: 260, to: 1180, duration: 0.16, type: "triangle", volume: 0.095 });
    this.targetLock(0.08);
  }

  targetLock(baseStart = 0) {
    this.playSample("target.lock", { volume: 0.34, playbackRate: 1.02 });
    [0, 0.09, 0.18].forEach((offset, index) => {
      this.tone({ frequency: 980 + index * 220, duration: 0.055, type: "sine", volume: 0.09, start: baseStart + offset });
    });
    this.sweep({ from: 1600, to: 440, duration: 0.16, type: "triangle", volume: 0.06, start: baseStart + 0.23 });
  }

  systemStart() {
    this.playSample("system.sting", { volume: 0.28, playbackRate: 0.92 });
    this.radarSweep();
    this.softThump(0.18, 70, 0.28);
  }

  victory() {
    this.playSample("system.sting", { volume: 0.52, playbackRate: 0.98 });
    this.tone({ frequency: 392, duration: 0.18, type: "triangle", volume: 0.13 });
    this.tone({ frequency: 523, duration: 0.22, type: "triangle", volume: 0.13, start: 0.13 });
    this.tone({ frequency: 784, duration: 0.34, type: "triangle", volume: 0.12, start: 0.31 });
  }

  defeat() {
    this.sweep({ from: 180, to: 55, duration: 0.75, type: "sawtooth", volume: 0.21 });
    this.noise({ duration: 0.5, volume: 0.06, frequency: 360, bandwidth: 0.8, type: "lowpass" });
  }

  neutralEnd() {
    this.tone({ frequency: 260, duration: 0.18, type: "triangle", volume: 0.1 });
    this.tone({ frequency: 260, duration: 0.18, type: "triangle", volume: 0.08, start: 0.22 });
  }

  warningSiren() {
    [0, 0.22, 0.44].forEach((start) => {
      this.sweep({ from: 720, to: 1040, duration: 0.16, type: "sine", volume: 0.1, start });
      this.noise({ duration: 0.1, volume: 0.035, frequency: 1800, bandwidth: 2, start });
    });
  }

  gearStep(start = 0) {
    this.metalTick(0.07, 420);
    this.noise({ duration: 0.08, volume: 0.04, frequency: 720, bandwidth: 1.6, start });
  }

  softThump(duration = 0.18, frequency = 76, volume = 0.3, start = 0) {
    this.sweep({ from: frequency * 1.8, to: frequency, duration, type: "sine", volume, start });
  }

  metalImpact(volume = 0.34) {
    this.noise({ duration: 0.16, volume, frequency: 2600, bandwidth: 5 });
    this.sweep({ from: 440, to: 110, duration: 0.24, type: "square", volume: volume * 0.35 });
  }

  softImpact() {
    this.noise({ duration: 0.08, volume: 0.09, frequency: 900, bandwidth: 1.2 });
    this.softThump(0.12, 120, 0.08);
  }

  airImpact(heavy) {
    this.noise({ duration: heavy ? 0.32 : 0.18, volume: heavy ? 0.18 : 0.1, frequency: 1100, bandwidth: 1.3 });
    this.sweep({ from: heavy ? 520 : 700, to: 130, duration: heavy ? 0.45 : 0.25, type: "sawtooth", volume: heavy ? 0.16 : 0.09 });
  }

  explosion(amount = 5, start = 0) {
    const scale = Math.min(1.2, Math.max(0.75, amount / 6));
    this.noise({ duration: 0.38 * scale, volume: 0.26 * scale, frequency: 180, bandwidth: 0.7, type: "lowpass", start });
    this.noise({ duration: 0.22 * scale, volume: 0.16 * scale, frequency: 1800, bandwidth: 0.9, start: start + 0.02 });
    this.softThump(0.38 * scale, 54, 0.42 * scale, start);
  }

  infantryBurst() {
    this.playSample("unit.infantry.fire", { volume: 0.78, playbackRate: 0.98 + Math.random() * 0.04 });
  }

  tankCannon() {
    this.playSample("unit.armor.fire", { volume: 0.84, playbackRate: 0.96 + Math.random() * 0.04 });
  }

  rotorBurst(duration = 0.7, volume = 0.18) {
    for (let index = 0; index < 8; index += 1) {
      this.noise({ duration: 0.055, volume, frequency: 90 + index * 6, bandwidth: 0.7, type: "lowpass", start: index * 0.07 });
    }
  }

  helicopterAttack() {
    this.playSample("unit.helicopter.fire", { volume: 0.76, playbackRate: 0.97 + Math.random() * 0.05 });
  }

  artilleryFire() {
    this.playSample("unit.artillery.fire", { volume: 0.84, playbackRate: 0.95 + Math.random() * 0.04 });
  }

  rocketSalvo() {
    this.playSample("unit.rocketArtillery.fire", { volume: 0.84, playbackRate: 0.95 + Math.random() * 0.04 });
  }

  aaLaunch(heavy = false) {
    this.playSample(heavy ? "unit.heavyAa.fire" : "unit.mobileAa.fire", { volume: heavy ? 0.82 : 0.76, playbackRate: heavy ? 0.96 : 1.02 });
  }

  droneOnline() {
    this.playSample("tactical.drone", { volume: 0.16, playbackRate: 1.12 });
    this.radarPing(0.07);
    this.tone({ frequency: 240, duration: 0.45, type: "triangle", volume: 0.05 });
  }

  droneMark() {
    this.playSample("tactical.drone", { volume: 0.18, playbackRate: 1.24 });
    this.targetLock();
    this.noise({ duration: 0.16, volume: 0.035, frequency: 2600, bandwidth: 2, start: 0.2 });
  }

  droneStrike() {
    this.playSample("unit.drone.fire", { volume: 0.74, playbackRate: 0.98 + Math.random() * 0.04 });
  }

  jetPass(volume = 0.22) {
    this.playSample("tactical.aircraft", { volume: 0.26, playbackRate: 0.95 });
    this.noise({ duration: 0.65, volume, frequency: 620, bandwidth: 0.7, type: "lowpass" });
    this.sweep({ from: 160, to: 820, duration: 0.54, type: "triangle", volume: 0.075 });
  }

  fighterStrike() {
    this.playSample("unit.fighter.fire", { volume: 0.78, playbackRate: 0.98 + Math.random() * 0.04 });
  }

  bomberStrike() {
    this.playSample("unit.bomber.fire", { volume: 0.86, playbackRate: 0.94 + Math.random() * 0.04 });
  }

  intercept() {
    this.playSample("unit.heavyAa.fire", { volume: 0.74, playbackRate: 1 });
    this.playSample("impact.airburst", { volume: 0.52, playbackRate: 1.08 });
  }

  screenBlock() {
    this.playSample("impact.armorPiercing", { volume: 0.52, playbackRate: 0.88 });
  }

  blocked() {
    this.playSample("combat.shield", { volume: 0.2, playbackRate: 0.82 });
    this.sweep({ from: 380, to: 120, duration: 0.2, type: "triangle", volume: 0.08 });
  }

  destroyed(card) {
    const category = classifyCard(card);
    if (category === "infantry") {
      this.softThump(0.18, 80, 0.16);
      this.noise({ duration: 0.16, volume: 0.09, frequency: 600, bandwidth: 0.9 });
      return;
    }
    this.playSample("impact.heavyExplosion", { volume: 0.76, playbackRate: ["fighter", "bomber"].includes(category) ? 1.04 : 0.92 });
  }

  callFire() {
    this.playSample("tactical.radio", { volume: 0.2, playbackRate: 1.05 });
    this.radioClick();
    this.targetLock(0.08);
  }

  tacticalPulse() {
    this.radarPing();
    this.softThump(0.18, 92, 0.18);
  }

  radarSweep() {
    [0, 0.08, 0.16].forEach((start, index) => {
      this.tone({ frequency: 760 + index * 180, duration: 0.07, type: "sine", volume: 0.065, start });
    });
    this.sweep({ from: 1800, to: 520, duration: 0.26, type: "triangle", volume: 0.045 });
  }

  hydraulicArm(start = 0) {
    this.sweep({ from: 150, to: 64, duration: 0.24, type: "sawtooth", volume: 0.11, start });
    this.metalTick(0.09, 360);
    this.noise({ duration: 0.18, volume: 0.05, frequency: 480, bandwidth: 0.9, start: start + 0.07 });
  }

  electronicWarfare() {
    this.playSample("tactical.radio", { volume: 0.2, playbackRate: 1.35 });
    this.noise({ duration: 0.34, volume: 0.12, frequency: 1800, bandwidth: 2.4 });
    this.sweep({ from: 1400, to: 90, duration: 0.32, type: "sawtooth", volume: 0.1 });
    this.sweep({ from: 90, to: 1200, duration: 0.14, type: "square", volume: 0.055, start: 0.18 });
  }

  smoke() {
    this.playSample("tactical.radio", { volume: 0.11, playbackRate: 0.75 });
    this.noise({ duration: 0.5, volume: 0.13, frequency: 420, bandwidth: 0.7, type: "lowpass" });
    this.sweep({ from: 520, to: 130, duration: 0.38, type: "triangle", volume: 0.07 });
  }

  repair(category) {
    this.metalTick(0.12, category === "armor" ? 260 : 520);
    [0.1, 0.2, 0.3].forEach((start) => this.tone({ frequency: 880, duration: 0.055, type: "triangle", volume: 0.055, start }));
  }
}

function classifyCard(card = {}) {
  const signal = `${card.id || ""} ${card.art || ""} ${card.name || ""} ${card.specialization || ""} ${(card.tags || []).join(" ")}`.toLowerCase();
  const match = CATEGORY_PATTERNS.find((entry) => entry.patterns.some((pattern) => signal.includes(pattern.toLowerCase())));
  if (match) {
    return match.category;
  }
  if (card.type === "strategy") {
    return "rocketArtillery";
  }
  if (card.type === "tactic") {
    return "electronic";
  }
  return "infantry";
}

export const gameAudio = new GameAudio();
