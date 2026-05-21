import {
  CARD_LIBRARY,
  LINES,
  STARTER_DECKS,
  VICTORY_SCORE,
  getCard,
  getFaction,
} from "./game-data.js";

const SIDES = ["player", "enemy"];
const MASK_CARD_ID = "us_marine_rifle";
const MULLIGAN_LIMIT = 2;

export function createAuthoritativeBattle({ roomCode, match, players }) {
  const battle = {
    id: match.id,
    seed: match.seed,
    roomCode,
    status: "mulligan",
    round: 1,
    actionSerial: 1,
    uidCounter: 0,
    activeSide: "player",
    sides: {},
    factions: {},
    passed: createSideMap(false),
    turnActions: {
      player: createTurnActionState(),
      enemy: createTurnActionState(),
    },
    scores: createSideMap(0),
    decks: {},
    hands: createSideMap(() => []),
    board: {
      player: createEmptyLines(() => []),
      enemy: createEmptyLines(() => []),
    },
    graves: createSideMap(() => []),
    pending: null,
    mulligan: {
      player: { done: false },
      enemy: { done: false },
    },
    log: [
      "服务器权威对局已创建：洗牌、发牌、调度、部署、目标和回合移交均由服务器统一裁决。",
      "当前权威版先覆盖核心回合与主要技能；复杂演出仍由客户端本地表现。",
    ],
    matchWinner: null,
    supplyExhausted: false,
    finalActions: null,
  };

  SIDES.forEach((side) => {
    const player = players.find((item) => item.side === side);
    const loadout = player?.loadout || {};
    const faction = getFaction(loadout.faction) ? loadout.faction : side === "player" ? "usa" : "russia";
    battle.sides[side] = {
      clientId: player?.id || "",
      name: player?.name || (side === "player" ? "房主" : "挑战者"),
      faction,
    };
    battle.factions[side] = faction;
    battle.decks[side] = createDeckForSide(battle, side, faction, loadout.deck);
    drawCards(battle, side, 7, { silent: true, triggerExhaustion: false });
  });

  return battle;
}

export function applyBattleAction(battle, side, action = {}) {
  if (!battle || !SIDES.includes(side)) {
    return { ok: false, error: "Battle was not found." };
  }
  if (battle.status === "match-over") {
    return { ok: false, error: "对局已经结束。" };
  }

  switch (action.kind) {
    case "mulligan":
      return applyMulligan(battle, side, action.selectedUids);
    case "play_unit":
      return applyPlayUnit(battle, side, action);
    case "play_tactic":
      return applyPlayTactic(battle, side, action);
    case "activate_unit":
      return applyActivateUnit(battle, side, action);
    case "choose_target":
      return applyChooseTarget(battle, side, action);
    case "pass_turn":
      return applyPassTurn(battle, side);
    case "surrender":
      return applySurrender(battle, side);
    default:
      return { ok: false, error: "未知的对战动作。" };
  }
}

export function createBattleSnapshot(battle, viewerSide) {
  const opponentSide = getOpponentSide(viewerSide);
  const ownPending = battle.pending?.side === viewerSide ? normalizePendingForViewer(battle.pending, viewerSide) : null;
  const ownMulliganActive = battle.status === "mulligan" && !battle.mulligan[viewerSide]?.done;

  return {
    roomCode: battle.roomCode,
    serverSide: viewerSide,
    pending: ownPending,
    mulligan: {
      active: ownMulliganActive,
      selectedUids: [],
    },
    battle: {
      round: battle.round,
      actionSerial: battle.actionSerial,
      phase: battle.status === "match-over" ? "match-over" : "battle",
      mode: "online-authoritative",
      onlineMatch: {
        id: battle.id,
        seed: battle.seed,
        roomCode: battle.roomCode,
        side: viewerSide,
      },
      activeSide: mapSideForViewer(battle.activeSide, viewerSide),
      factions: {
        player: battle.factions[viewerSide],
        enemy: battle.factions[opponentSide],
      },
      passed: mapSideObject(battle.passed, viewerSide),
      turnActions: mapSideObject(battle.turnActions, viewerSide),
      intel: { player: 0, enemy: 0 },
      scores: mapSideObject(battle.scores, viewerSide),
      decks: {
        player: createHiddenPile(battle.decks[viewerSide].length),
        enemy: createHiddenPile(battle.decks[opponentSide].length),
      },
      hands: {
        player: battle.hands[viewerSide].map(cloneInstance),
        enemy: createHiddenPile(battle.hands[opponentSide].length),
      },
      board: {
        player: normalizeBoardForViewer(battle, viewerSide, viewerSide),
        enemy: normalizeBoardForViewer(battle, opponentSide, viewerSide),
      },
      graves: {
        player: createHiddenPile(battle.graves[viewerSide].length),
        enemy: createHiddenPile(battle.graves[opponentSide].length),
      },
      guards: { player: [], enemy: [] },
      intelDenials: { player: [], enemy: [] },
      fireBoost: { player: 0, enemy: 0 },
      log: battle.log.slice(-80),
      aiTimer: null,
      turnTimer: null,
      turnTransition: null,
      aiThinking: false,
      actionAnimation: null,
      matchWinner: battle.matchWinner ? mapSideForViewer(battle.matchWinner, viewerSide) : null,
      supplyExhausted: battle.supplyExhausted,
      finalActions: battle.finalActions ? mapSideObject(battle.finalActions, viewerSide) : null,
      finalTriggeredAtAction: null,
    },
  };
}

function applyMulligan(battle, side, selectedUids = []) {
  if (battle.status !== "mulligan") {
    return { ok: false, error: "当前不能调度手牌。" };
  }
  if (battle.mulligan[side]?.done) {
    return { ok: false, error: "你已经完成开局调度。" };
  }

  const selected = Array.isArray(selectedUids) ? selectedUids.slice(0, MULLIGAN_LIMIT) : [];
  const returned = [];
  selected.forEach((uid) => {
    const index = battle.hands[side].findIndex((item) => item.uid === uid);
    if (index === -1) {
      return;
    }
    const [instance] = battle.hands[side].splice(index, 1);
    returned.push(instance);
  });

  if (returned.length) {
    battle.decks[side].push(...returned);
    shuffleInstances(battle.decks[side], createSeededRandom(`${battle.seed}:mulligan:${side}:${battle.actionSerial}`));
    drawCards(battle, side, returned.length, { triggerExhaustion: false });
  }

  battle.mulligan[side].done = true;
  battle.log.push(`${getSideName(battle, side)}完成开局调度，置换 ${returned.length} 张手牌。`);

  if (SIDES.every((item) => battle.mulligan[item].done)) {
    battle.status = "battle";
    resetTurnActions(battle, battle.activeSide);
    battle.log.push("双方调度完成，房主获得先手。");
  }
  return { ok: true };
}

function applyPlayUnit(battle, side, action) {
  const ready = assertCanAct(battle, side);
  if (!ready.ok) return ready;
  if (battle.pending) {
    return { ok: false, error: "请先完成当前目标选择。" };
  }
  if (getTurnActions(battle, side).handPlayed) {
    return { ok: false, error: "本回合已经打出过一张手牌。" };
  }

  const handIndex = battle.hands[side].findIndex((item) => item.uid === action.handUid);
  if (handIndex === -1) {
    return { ok: false, error: "手牌不存在。" };
  }

  const instance = battle.hands[side][handIndex];
  const card = getCard(instance.cardId);
  if (!card || card.type !== "unit") {
    return { ok: false, error: "请选择单位牌部署。" };
  }

  const lineId = String(action.lineId || card.line || "frontline");
  if (!getDeployLines(card).includes(lineId)) {
    return { ok: false, error: "该单位不能部署到这个战线。" };
  }

  battle.hands[side].splice(handIndex, 1);
  instance.hidden = Boolean(action.hidden);
  instance.exposed = !instance.hidden;
  instance.deployedAtAction = battle.actionSerial;
  instance.actedAction = null;
  battle.board[side][lineId].push(instance);
  markHandActionUsed(battle, side);
  battle.log.push(instance.hidden
    ? `${getSideName(battle, side)}在${getLineName(lineId)}隐蔽部署了一个单位。`
    : `${getSideName(battle, side)}部署 ${card.name} 到${getLineName(lineId)}。`);

  if (!instance.hidden) {
    maybeOpenPendingOrResolve(battle, side, instance.uid, card.ability, "boardEffect");
  }
  resolveBattleEndIfReady(battle);
  return { ok: true };
}

function applyPlayTactic(battle, side, action) {
  const ready = assertCanAct(battle, side);
  if (!ready.ok) return ready;
  if (battle.pending) {
    return { ok: false, error: "请先完成当前目标选择。" };
  }
  if (getTurnActions(battle, side).handPlayed) {
    return { ok: false, error: "本回合已经打出过一张手牌。" };
  }

  const handIndex = battle.hands[side].findIndex((item) => item.uid === action.handUid);
  if (handIndex === -1) {
    return { ok: false, error: "手牌不存在。" };
  }

  const instance = battle.hands[side][handIndex];
  const card = getCard(instance.cardId);
  if (!card || card.type === "unit") {
    return { ok: false, error: "请选择战术牌。" };
  }

  if (card.ability?.noTarget || card.ability?.kind === "supply") {
    battle.hands[side].splice(handIndex, 1);
    battle.graves[side].push(instance);
    markHandActionUsed(battle, side);
    resolveNoTargetAbility(battle, side, card.ability, card);
    battle.log.push(`${getSideName(battle, side)}打出 ${card.name}。`);
    resolveBattleEndIfReady(battle);
    return { ok: true };
  }

  const targets = getValidEffectTargets(battle, side, card.ability, card);
  if (!targets.length) {
    return { ok: false, error: `${card.name} 当前没有合法目标。` };
  }

  battle.pending = {
    side,
    kind: "handEffect",
    handUid: instance.uid,
    cardId: card.id,
    ability: card.ability,
    targets,
  };
  return { ok: true };
}

function applyActivateUnit(battle, side, action) {
  const ready = assertCanAct(battle, side);
  if (!ready.ok) return ready;
  if (battle.pending) {
    return { ok: false, error: "请先完成当前目标选择。" };
  }
  if (getTurnActions(battle, side).hiddenActivated) {
    return { ok: false, error: "本回合已经执行过一次场上单位行动。" };
  }

  const source = findBoardInstance(battle, side, action.sourceUid);
  if (!source) {
    return { ok: false, error: "场上单位不存在。" };
  }
  if (source.instance.deployedAtAction === battle.actionSerial) {
    return { ok: false, error: "本回合新部署单位不能再次行动。" };
  }
  if (source.instance.actedAction === battle.actionSerial) {
    return { ok: false, error: "该单位本回合已经行动过。" };
  }
  if (source.instance.suppressed) {
    return { ok: false, error: "该单位受到电子压制，本回合不能主动发动技能。" };
  }

  const card = getCard(source.instance.cardId);
  if (!card?.ability) {
    return { ok: false, error: "该单位没有可主动发动的技能。" };
  }

  markBoardActionUsed(battle, side);
  markUnitActed(battle, source.instance);
  if (source.instance.hidden) {
    source.instance.hidden = false;
    source.instance.exposed = true;
    battle.log.push(`${getSideName(battle, side)}主动翻开 ${card.name}。`);
  } else {
    battle.log.push(`${getSideName(battle, side)}命令 ${card.name} 发动技能。`);
  }

  if (card.ability.noTarget || ["supply"].includes(card.ability.kind)) {
    resolveNoTargetAbility(battle, side, card.ability, card);
    resolveBattleEndIfReady(battle);
    return { ok: true };
  }

  maybeOpenPendingOrResolve(battle, side, source.instance.uid, card.ability, "boardEffect");
  resolveBattleEndIfReady(battle);
  return { ok: true };
}

function applyChooseTarget(battle, side, action) {
  if (!battle.pending || battle.pending.side !== side) {
    return { ok: false, error: "当前没有等待你选择的目标。" };
  }
  const targetSide = mapViewerSideToServer(action.targetSide, side);
  const target = battle.pending.targets.find((item) => item.side === targetSide && item.uid === action.targetUid);
  if (!target) {
    return { ok: false, error: "目标已失效。" };
  }

  const pending = battle.pending;
  battle.pending = null;

  if (pending.kind === "handEffect") {
    const handIndex = battle.hands[side].findIndex((item) => item.uid === pending.handUid);
    if (handIndex === -1) {
      return { ok: false, error: "手牌已不在手中。" };
    }
    const [instance] = battle.hands[side].splice(handIndex, 1);
    battle.graves[side].push(instance);
    markHandActionUsed(battle, side);
    battle.log.push(`${getSideName(battle, side)}打出 ${getCard(pending.cardId).name}。`);
  }

  resolveEffectOnTarget(battle, side, pending, target);
  resolveBattleEndIfReady(battle);
  return { ok: true };
}

function applyPassTurn(battle, side) {
  const ready = assertCanAct(battle, side);
  if (!ready.ok) return ready;
  if (battle.pending) {
    return { ok: false, error: "请先完成当前目标选择。" };
  }

  clearSuppressionForSide(battle, side);
  drawCards(battle, side, 1);
  battle.passed[side] = true;
  battle.log.push(`${getSideName(battle, side)}结束回合，移交指挥权。`);
  if (resolveBattleEndIfReady(battle)) {
    return { ok: true };
  }

  const nextSide = getOpponentSide(side);
  battle.activeSide = nextSide;
  battle.round += nextSide === "player" ? 1 : 0;
  battle.actionSerial += 1;
  battle.passed[nextSide] = false;
  resetTurnActions(battle, nextSide);
  battle.log.push(`${getSideName(battle, nextSide)}进入行动阶段。`);
  return { ok: true };
}

function applySurrender(battle, side) {
  battle.status = "match-over";
  battle.matchWinner = getOpponentSide(side);
  battle.log.push(`${getSideName(battle, side)}认输，${getSideName(battle, battle.matchWinner)}获胜。`);
  return { ok: true };
}

function maybeOpenPendingOrResolve(battle, side, sourceUid, ability, kind) {
  if (!ability) {
    return;
  }
  const source = findBoardInstance(battle, side, sourceUid);
  const sourceCard = source ? getCard(source.instance.cardId) : null;
  const targets = getValidEffectTargets(battle, side, ability, sourceCard, { sourceRef: source });
  if (!targets.length) {
    if (ability.kind === "supply") {
      resolveNoTargetAbility(battle, side, ability, sourceCard);
    }
    return;
  }
  if (targets.length === 1) {
    resolveEffectOnTarget(battle, side, {
      kind,
      sourceUid,
      cardId: sourceCard.id,
      ability,
    }, targets[0]);
    return;
  }
  battle.pending = {
    side,
    kind,
    sourceUid,
    cardId: sourceCard.id,
    ability,
    targets,
  };
}

function resolveEffectOnTarget(battle, side, pending, targetRef) {
  const sourceCard = getCard(pending.cardId);
  const ability = pending.ability || {};
  const sourceRef = pending.sourceUid ? findBoardInstance(battle, side, pending.sourceUid) : null;

  if (ability.sourceExposes && sourceRef) {
    sourceRef.instance.hidden = false;
    sourceRef.instance.exposed = true;
  }

  if (ability.kind === "damage") {
    if (targetRef.instance.hidden && canRevealHiddenTargetForAbility(ability, targetRef.instance)) {
      exposeTarget(battle, targetRef, sourceCard.name);
    }
    dealDamage(battle, side, targetRef, getDamageAmount(battle, side, ability, targetRef, sourceCard), sourceCard);
    cleanupDestroyed(battle, side);
    return;
  }

  if (ability.kind === "areaDamage") {
    const targets = getAreaDamageTargets(battle, side, ability, targetRef);
    targets.forEach((item, index) => {
      const amount = index === 0
        ? getDamageAmount(battle, side, ability, item, sourceCard)
        : getSecondaryDamageAmount(ability, item);
      dealDamage(battle, side, item, amount, sourceCard);
    });
    cleanupDestroyed(battle, side);
    return;
  }

  if (ability.kind === "exposeAndCallFire") {
    const freshExpose = targetRef.instance.hidden;
    exposeTarget(battle, targetRef, sourceCard.name);
    const caller = findCallableUnit(battle, side, ability.callerTags);
    if (caller && (!ability.callFireRequiresFreshExpose || freshExpose)) {
      caller.instance.actedAction = battle.actionSerial;
      const callerCard = getCard(caller.instance.cardId);
      const fire = callerCard.fire || { amount: 2 };
      const amount = getDamageAmount(battle, side, fire, targetRef, callerCard) + (ability.calledFireBonus || 0);
      dealDamage(battle, side, targetRef, amount, callerCard);
      battle.log.push(`${sourceCard.name} 引导 ${callerCard.name} 校射。`);
      cleanupDestroyed(battle, side);
    } else if (ability.noCallerFallback === "draw") {
      drawCards(battle, side, ability.fallbackDraw || 1);
      battle.log.push(`${sourceCard.name} 完成侦察，但没有可调用火力，改为补给 ${ability.fallbackDraw || 1} 张。`);
    }
    return;
  }

  if (ability.kind === "smoke") {
    targetRef.instance.hidden = ability.hide !== false;
    targetRef.instance.exposed = false;
    targetRef.instance.shield = true;
    applyLineRepair(targetRef, ability);
    battle.log.push(`${sourceCard.name} 令 ${getCard(targetRef.instance.cardId).name} 重新进入隐蔽。`);
    return;
  }

  if (ability.kind === "repair") {
    const amount = ability.amount || 1;
    const before = targetRef.instance.damage || 0;
    targetRef.instance.damage = Math.max(0, before - amount);
    battle.log.push(`${sourceCard.name} 修复 ${getCard(targetRef.instance.cardId).name} ${before - targetRef.instance.damage} 点伤害。`);
    return;
  }

  if (ability.kind === "suppress") {
    targetRef.instance.suppressed = true;
    battle.log.push(`${sourceCard.name} 压制 ${getCard(targetRef.instance.cardId).name}，其下一回合不能主动发动技能。`);
  }
}

function resolveNoTargetAbility(battle, side, ability = {}, sourceCard = null) {
  if (ability.kind === "supply") {
    const drawn = drawCards(battle, side, ability.draw || 1);
    const keep = ability.keep || drawn;
    if (drawn > keep) {
      const overflow = battle.hands[side].splice(-Math.max(0, drawn - keep));
      battle.decks[side].push(...overflow);
    }
    battle.log.push(`${sourceCard?.name || "补给"} 为 ${getSideName(battle, side)}调度 ${drawn} 张，保留 ${Math.min(keep, drawn)} 张。`);
  }
}

function getValidEffectTargets(battle, side, ability = {}, sourceCard = null, options = {}) {
  if (!ability || ability.noTarget) {
    return [];
  }
  const targetSide = ["smoke", "repair"].includes(ability.kind) ? side : getOpponentSide(side);
  const rows = ability.rows || ["frontline", "support"];
  const targets = [];
  rows.forEach((lineId) => {
    const row = battle.board[targetSide]?.[lineId] || [];
    row.forEach((instance) => {
      const ref = { side: targetSide, lineId, uid: instance.uid, instance };
      if (canTargetForAbility(battle, side, ref, ability, sourceCard, options)) {
        targets.push(ref);
      }
    });
  });
  return targets;
}

function canTargetForAbility(battle, side, targetRef, ability = {}, sourceCard = null) {
  const targetCard = getCard(targetRef.instance.cardId);
  if (!targetCard || getCurrentPower(targetRef.instance) <= 0) {
    return false;
  }

  if (ability.kind === "repair") {
    if ((targetRef.instance.damage || 0) <= 0 && !ability.drawAlternative) {
      return false;
    }
    return true;
  }
  if (ability.kind === "smoke") {
    return true;
  }

  if (ability.hiddenOnly && !targetRef.instance.hidden) {
    return false;
  }

  const canRevealHidden = ability.kind === "suppress" || ability.canRevealHidden || canRevealHiddenTargetForAbility(ability, targetRef.instance);
  if (targetRef.instance.hidden && !canRevealHidden) {
    return false;
  }

  if (ability.requiresAnyTag?.length && !ability.requiresAnyTag.some((tag) => targetCard.tags.includes(tag))) {
    return false;
  }

  const preferred = ability.preferredTargetProfile;
  if (preferred?.requiresAnyTag?.length) {
    const preferredTargets = collectTargetsByProfile(battle, side, preferred);
    if (preferredTargets.length) {
      return preferred.requiresAnyTag.some((tag) => targetCard.tags.includes(tag));
    }
  }

  return true;
}

function collectTargetsByProfile(battle, side, profile = {}) {
  const opponent = getOpponentSide(side);
  return LINES.flatMap((line) => battle.board[opponent][line.id].map((instance) => ({ side: opponent, lineId: line.id, uid: instance.uid, instance })))
    .filter((target) => {
      const card = getCard(target.instance.cardId);
      if (!card || getCurrentPower(target.instance) <= 0) return false;
      if (profile.requiresAnyTag?.length && !profile.requiresAnyTag.some((tag) => card.tags.includes(tag))) return false;
      if (profile.requiresExposed && target.instance.hidden) return false;
      return true;
    });
}

function getAreaDamageTargets(battle, side, ability, primaryTarget) {
  const row = battle.board[primaryTarget.side][primaryTarget.lineId]
    .filter((instance) => getCurrentPower(instance) > 0)
    .map((instance) => ({ side: primaryTarget.side, lineId: primaryTarget.lineId, uid: instance.uid, instance }))
    .filter((target) => canTargetForAbility(battle, side, target, { ...ability, hiddenOnly: false }));
  const ordered = [
    primaryTarget,
    ...row.filter((item) => item.uid !== primaryTarget.uid),
  ];
  return ordered.slice(0, ability.maxTargets || 2);
}

function getDamageAmount(battle, side, ability = {}, targetRef, sourceCard) {
  let amount = ability.lineAmounts?.[targetRef.lineId] || ability.amount || sourceCard?.power || 1;
  const targetCard = getCard(targetRef.instance.cardId);
  (ability.bonuses || []).forEach((bonus) => {
    if (targetCard.tags.includes(bonus.tag)) {
      amount = Math.max(amount, bonus.amount);
    }
  });
  if (ability.ownTagBonus && battle.board[side]?.[ability.ownTagBonus.line]?.some((instance) => getCard(instance.cardId).tags.includes(ability.ownTagBonus.tag))) {
    amount += ability.ownTagBonus.amount || 0;
  }
  return Math.max(0, amount - (targetRef.instance.shield ? 1 : 0));
}

function getSecondaryDamageAmount(ability = {}, targetRef) {
  let amount = ability.secondaryAmount || Math.max(1, Math.floor((ability.amount || 2) / 2));
  const targetCard = getCard(targetRef.instance.cardId);
  (ability.secondaryBonuses || []).forEach((bonus) => {
    if (targetCard.tags.includes(bonus.tag)) {
      amount = Math.max(amount, bonus.amount);
    }
  });
  return amount;
}

function dealDamage(battle, attackerSide, targetRef, amount, sourceCard) {
  if (!targetRef?.instance || amount <= 0) {
    return;
  }
  targetRef.instance.hidden = false;
  targetRef.instance.exposed = true;
  targetRef.instance.damage = (targetRef.instance.damage || 0) + amount;
  targetRef.instance.lastDamagedBy = attackerSide;
  targetRef.instance.shield = false;
  battle.log.push(`${sourceCard.name} 对 ${getCard(targetRef.instance.cardId).name} 造成 ${amount} 点伤害。`);
}

function cleanupDestroyed(battle, attackerSide) {
  SIDES.forEach((side) => {
    LINES.forEach((line) => {
      const row = battle.board[side][line.id];
      for (let index = row.length - 1; index >= 0; index -= 1) {
        const instance = row[index];
        if (getCurrentPower(instance) > 0) {
          continue;
        }
        const [destroyed] = row.splice(index, 1);
        battle.graves[side].push(destroyed);
        const value = getCardTargetValue(getCard(destroyed.cardId));
        battle.scores[attackerSide] += value;
        battle.log.push(`${getSideName(battle, attackerSide)}摧毁 ${getCard(destroyed.cardId).name}，获得 ${value} 分。`);
      }
    });
  });
}

function exposeTarget(battle, targetRef, sourceName) {
  targetRef.instance.hidden = false;
  targetRef.instance.exposed = true;
  battle.log.push(`${sourceName} 暴露 ${getCard(targetRef.instance.cardId).name}。`);
}

function applyLineRepair(targetRef, ability = {}) {
  const repair = ability.repairIfLine;
  if (!repair || repair.line !== targetRef.lineId) {
    return;
  }
  targetRef.instance.damage = Math.max(0, (targetRef.instance.damage || 0) - (repair.amount || 0));
}

function findCallableUnit(battle, side, callerTags = []) {
  return LINES.flatMap((line) => battle.board[side][line.id].map((instance) => ({ side, lineId: line.id, uid: instance.uid, instance })))
    .find((ref) => {
      const card = getCard(ref.instance.cardId);
      return getCurrentPower(ref.instance) > 0 &&
        !ref.instance.hidden &&
        ref.instance.actedAction !== battle.actionSerial &&
        callerTags.some((tag) => card.tags.includes(tag));
    });
}

function assertCanAct(battle, side) {
  if (battle.status === "mulligan") {
    return { ok: false, error: "请先完成开局调度。" };
  }
  if (battle.status !== "battle") {
    return { ok: false, error: "对局尚未开始。" };
  }
  if (battle.activeSide !== side) {
    return { ok: false, error: "还没有轮到你行动。" };
  }
  return { ok: true };
}

function resolveBattleEndIfReady(battle) {
  if (battle.scores.player >= VICTORY_SCORE || battle.scores.enemy >= VICTORY_SCORE) {
    battle.status = "match-over";
    battle.matchWinner = battle.scores.player === battle.scores.enemy ? "draw" : battle.scores.player > battle.scores.enemy ? "player" : "enemy";
    battle.log.push(`对局结束：${battle.matchWinner === "draw" ? "平局" : `${getSideName(battle, battle.matchWinner)}获胜`}。`);
    return true;
  }
  return false;
}

function drawCards(battle, side, amount, options = {}) {
  let drawn = 0;
  for (let index = 0; index < amount; index += 1) {
    const card = battle.decks[side].shift();
    if (!card) {
      if (options.triggerExhaustion !== false) {
        battle.supplyExhausted = true;
        battle.log.push(`${getSideName(battle, side)}补给耗尽。`);
      }
      return drawn;
    }
    battle.hands[side].push(card);
    drawn += 1;
  }
  return drawn;
}

function createDeckForSide(battle, side, faction, rawDeck = []) {
  const sanitized = Array.isArray(rawDeck)
    ? rawDeck.filter((cardId) => CARD_LIBRARY[cardId]?.faction === faction)
    : [];
  const deckIds = sanitized.length >= 20 ? sanitized.slice(0, 30) : getStarterDeckForFaction(faction);
  return shuffleInstances(deckIds.map((cardId) => createInstance(battle, side, cardId)), createSeededRandom(`${battle.seed}:${side}:${faction}`));
}

function getStarterDeckForFaction(factionId) {
  return (factionId === "russia" ? STARTER_DECKS.enemy : STARTER_DECKS.player).slice();
}

function createInstance(battle, side, cardId) {
  return {
    uid: `${side}-${++battle.uidCounter}`,
    cardId,
    damage: 0,
    exposed: false,
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

function shuffleInstances(items, rng) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function normalizeBoardForViewer(battle, side, viewerSide) {
  return LINES.reduce((acc, line) => {
    acc[line.id] = battle.board[side][line.id].map((instance) => normalizeInstanceForViewer(instance, side, viewerSide));
    return acc;
  }, {});
}

function normalizeInstanceForViewer(instance, side, viewerSide) {
  if (side !== viewerSide && instance.hidden) {
    return {
      uid: instance.uid,
      cardId: MASK_CARD_ID,
      masked: true,
      hidden: true,
      exposed: false,
      damage: 0,
      shield: false,
      bonus: 0,
    };
  }
  return cloneInstance(instance);
}

function normalizePendingForViewer(pending, viewerSide) {
  return {
    kind: pending.kind,
    side: "player",
    handUid: pending.handUid || null,
    sourceUid: pending.sourceUid || null,
    cardId: pending.cardId,
    ability: pending.ability,
    targets: pending.targets.map((target) => ({
      side: mapSideForViewer(target.side, viewerSide),
      lineId: target.lineId,
      uid: target.uid,
      instance: normalizeInstanceForViewer(target.instance, target.side, viewerSide),
    })),
  };
}

function cloneInstance(instance) {
  return { ...instance };
}

function createHiddenPile(count) {
  return Array.from({ length: count }, (_, index) => ({
    uid: `hidden-${index}`,
    cardId: MASK_CARD_ID,
    hidden: true,
    masked: true,
  }));
}

function createTurnActionState() {
  return {
    handPlayed: false,
    hiddenActivated: false,
    breakthroughUsed: false,
    enemyFrontlineEmptyAtStart: false,
  };
}

function resetTurnActions(battle, side) {
  const opponent = getOpponentSide(side);
  battle.turnActions[side] = {
    ...createTurnActionState(),
    enemyFrontlineEmptyAtStart: battle.board[opponent].frontline.length === 0,
  };
}

function getTurnActions(battle, side) {
  battle.turnActions[side] ||= createTurnActionState();
  return battle.turnActions[side];
}

function markHandActionUsed(battle, side) {
  getTurnActions(battle, side).handPlayed = true;
}

function markBoardActionUsed(battle, side) {
  getTurnActions(battle, side).hiddenActivated = true;
}

function markUnitActed(battle, instance) {
  instance.actedAction = battle.actionSerial;
}

function clearSuppressionForSide(battle, side) {
  LINES.forEach((line) => {
    battle.board[side][line.id].forEach((instance) => {
      instance.suppressed = false;
      instance.damageDebuff = 0;
    });
  });
}

function canRevealHiddenTargetForAbility(ability = {}, instance) {
  const card = getCard(instance.cardId);
  return Boolean(
    ability.canRevealHidden ||
      ability.canRevealHiddenForTags?.some((tag) => card.tags.includes(tag)) ||
      ability.preferredTargetProfile?.canRevealHiddenForTags?.some((tag) => card.tags.includes(tag)),
  );
}

function getCurrentPower(instance) {
  if (instance.masked) {
    return 0;
  }
  const card = getCard(instance.cardId);
  return Math.max(0, getCardHealth(card) + (instance.bonus || 0) - (instance.damage || 0));
}

function getCardHealth(card) {
  return Number.isFinite(card?.health) ? card.health : card?.power || 0;
}

function getCardTargetValue(card) {
  return Number.isFinite(card?.targetValue) ? card.targetValue : Number.isFinite(card?.value) ? card.value : getCardHealth(card);
}

function findBoardInstance(battle, side, uid) {
  for (const line of LINES) {
    const instance = battle.board[side][line.id].find((item) => item.uid === uid);
    if (instance) {
      return { side, lineId: line.id, uid: instance.uid, instance };
    }
  }
  return null;
}

function getDeployLines(card) {
  return card.lines || [card.line];
}

function getOpponentSide(side) {
  return side === "player" ? "enemy" : "player";
}

function mapSideForViewer(side, viewerSide) {
  if (side === "draw" || side === null) {
    return side;
  }
  return side === viewerSide ? "player" : "enemy";
}

function mapViewerSideToServer(side, viewerSide) {
  if (side === "player") {
    return viewerSide;
  }
  if (side === "enemy") {
    return getOpponentSide(viewerSide);
  }
  return side;
}

function mapSideObject(value, viewerSide) {
  return {
    player: value[viewerSide],
    enemy: value[getOpponentSide(viewerSide)],
  };
}

function createSideMap(value) {
  return {
    player: typeof value === "function" ? value("player") : value,
    enemy: typeof value === "function" ? value("enemy") : value,
  };
}

function createEmptyLines(factory) {
  return LINES.reduce((acc, line) => {
    acc[line.id] = factory(line.id);
    return acc;
  }, {});
}

function getSideName(battle, side) {
  return battle.sides[side]?.name || (side === "player" ? "房主" : "挑战者");
}

function getLineName(lineId) {
  return LINES.find((line) => line.id === lineId)?.name || lineId;
}
