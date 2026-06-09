import { LINES, getCard } from "./game-data.js";
import { getCardFireVideoPath } from "./card-design.js";

const LINE_IDS = LINES.map((line) => line.id);
const FIRE_EFFECT_TYPES = new Set(["damage", "intercept", "expose"]);

export function buildOnlineEffectAnimationBattle(previousBattle, nextBattle, effects = []) {
  const stagedBattle = cloneBattle(previousBattle);
  if (!stagedBattle || !nextBattle || !Array.isArray(effects) || !effects.length) {
    return stagedBattle;
  }

  effects.forEach((effect) => {
    if (effect.type === "deploy") {
      materializeEffectSource(stagedBattle, nextBattle, effect, { requireVideo: false });
      return;
    }
    if (FIRE_EFFECT_TYPES.has(effect.type)) {
      materializeEffectSource(stagedBattle, nextBattle, effect, { requireVideo: true });
    }
  });

  stagedBattle.actionAnimation = null;
  return stagedBattle;
}

function materializeEffectSource(stagedBattle, nextBattle, effect, options = {}) {
  const sourceSide = effect.sourceSide || effect.attackerSide || effect.targetSide;
  const sourceUid = effect.sourceUid || effect.targetUid;
  const sourceCardId = effect.sourceCardId || effect.targetCardId;
  if (!sourceSide || !sourceUid) {
    return;
  }

  if (!sourceCardId) {
    return;
  }

  const sourceCard = getCard(sourceCardId);
  if (!sourceCard) {
    return;
  }

  if (options.requireVideo && !getCardFireVideoPath(sourceCard)) {
    return;
  }

  const nextRef = findBoardRef(nextBattle, sourceSide, sourceUid);
  if (!nextRef?.instance || nextRef.instance.masked) {
    return;
  }

  const stagedRef = findBoardRef(stagedBattle, sourceSide, sourceUid);
  const stagedInstance = cloneInstance(nextRef.instance);
  if (options.requireVideo) {
    stagedInstance.hidden = false;
    stagedInstance.exposed = true;
  }

  removeInstanceFromHand(stagedBattle, sourceSide, sourceUid);

  if (stagedRef?.instance) {
    Object.assign(stagedRef.instance, stagedInstance);
    return;
  }

  const lineId = nextRef.lineId || effect.sourceLineId || effect.lineId || effect.targetLineId || "frontline";
  const row = getBoardRow(stagedBattle, sourceSide, lineId);
  if (row) {
    row.push(stagedInstance);
  }
}

function findBoardRef(battle, side, uid) {
  if (!battle?.board?.[side] || !uid) {
    return null;
  }
  for (const lineId of LINE_IDS) {
    const row = battle.board[side]?.[lineId] || [];
    const instance = row.find((item) => item.uid === uid);
    if (instance) {
      return { side, lineId, uid, instance };
    }
  }
  return null;
}

function getBoardRow(battle, side, lineId) {
  if (!battle?.board?.[side]) {
    return null;
  }
  battle.board[side][lineId] ||= [];
  return battle.board[side][lineId];
}

function removeInstanceFromHand(battle, side, uid) {
  const hand = battle?.hands?.[side];
  if (!Array.isArray(hand)) {
    return;
  }
  const index = hand.findIndex((instance) => instance.uid === uid);
  if (index >= 0) {
    hand.splice(index, 1);
  }
}

function cloneBattle(battle) {
  if (!battle) {
    return battle;
  }
  if (typeof structuredClone === "function") {
    return structuredClone(battle);
  }
  return JSON.parse(JSON.stringify(battle));
}

function cloneInstance(instance) {
  if (typeof structuredClone === "function") {
    return structuredClone(instance);
  }
  return JSON.parse(JSON.stringify(instance));
}
