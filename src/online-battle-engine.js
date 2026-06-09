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
const LINE_CAPACITY = {
  frontline: 7,
  support: 6,
};
const BREAKTHROUGH_GROUND_PLATFORM_TAGS = [
  "步兵",
  "装甲",
  "榴弹炮",
  "火箭炮",
  "伴随防空",
  "重型防空",
  "弹道导弹",
];
const BREAKTHROUGH_GROUND_ATTACK_TAGS = new Set(["步兵", "装甲"]);

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
    effectSerial: 0,
    effects: [],
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
      "当前权威版覆盖核心回合、主要技能、防空拦截、高空暴露、前线接敌和前线突破；复杂演出仍由客户端本地表现。",
    ],
    matchWinner: null,
    supplyExhausted: false,
    finalActions: null,
    finalTriggeredAtAction: null,
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
    case "frontline_breakthrough":
      return applyFrontlineBreakthrough(battle, side, action);
    case "choose_supply":
      return applyChooseSupply(battle, side, action);
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
      players: {
        player: normalizePlayerForViewer(battle, viewerSide),
        enemy: normalizePlayerForViewer(battle, opponentSide),
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
      pendingSide: battle.pending ? mapSideForViewer(battle.pending.side, viewerSide) : null,
      pendingKind: battle.pending?.kind || null,
      effects: normalizeEffectsForViewer(battle, battle.effects.slice(-24), viewerSide),
      matchWinner: battle.matchWinner ? mapSideForViewer(battle.matchWinner, viewerSide) : null,
      supplyExhausted: battle.supplyExhausted,
      finalActions: battle.finalActions ? mapSideObject(battle.finalActions, viewerSide) : null,
      finalTriggeredAtAction: battle.finalTriggeredAtAction,
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
  if (!canUseUnitDeployment(battle, side)) {
    return { ok: false, error: "本回合单位部署额度已经用完。" };
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
  if (isLineAtCapacity(battle, side, lineId)) {
    return { ok: false, error: `${getLineName(lineId)}已满，不能继续部署。` };
  }

  const concealedDeploy = Boolean(action.hidden && canConcealCardForSide(battle, side, card, lineId));
  battle.hands[side].splice(handIndex, 1);
  instance.hidden = concealedDeploy;
  instance.exposed = !instance.hidden;
  instance.deployedAtAction = battle.actionSerial;
  instance.actedAction = null;
  battle.board[side][lineId].push(instance);
  markUnitDeploymentUsed(battle, side);
  battle.log.push(instance.hidden
    ? `${getSideName(battle, side)}在${getLineName(lineId)}隐蔽部署了一个单位。`
    : `${getSideName(battle, side)}部署 ${card.name} 到${getLineName(lineId)}。`);

  const sourceRef = { side, lineId, uid: instance.uid, instance };
  pushBoardEffect(battle, "deploy", side, sourceRef, instance.hidden ? null : card.id, 1, sourceRef, {
    targetCardId: instance.hidden ? null : card.id,
  });
  resolveFrontlineContact(battle, side, sourceRef);
  resolveInfiltrationFrontlineReveal(battle, side, sourceRef);
  enforceHighAirExposure(battle);
  if (battle.pending) {
    finishActionAfterResolved(battle, side);
    return { ok: true };
  }

  if (!concealedDeploy && !instance.hidden && instance.actedAction !== battle.actionSerial && findBoardInstance(battle, side, instance.uid)) {
    maybeOpenPendingOrResolve(battle, side, instance.uid, card.ability, "boardEffect");
  }
  finishActionAfterResolved(battle, side);
  return { ok: true };
}

function applyPlayTactic(battle, side, action) {
  const ready = assertCanAct(battle, side);
  if (!ready.ok) return ready;
  if (battle.pending) {
    return { ok: false, error: "请先完成当前目标选择。" };
  }
  if (getTurnActions(battle, side).tacticPlayed) {
    return { ok: false, error: "本回合已经打出过一张战术牌。" };
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
    markTacticActionUsed(battle, side);
    battle.log.push(`${getSideName(battle, side)}打出 ${card.name}。`);
    pushEffect(battle, {
      type: "discard",
      targetSide: side,
      targetCardId: card.id,
      amount: 1,
    });
    resolveNoTargetAbility(battle, side, card.ability, card);
    finishActionAfterResolved(battle, side);
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
  if (!canUseBoardAction(battle, side)) {
    return { ok: false, error: "本回合场上单位行动额度已经用完。" };
  }

  const source = findBoardInstance(battle, side, action.sourceUid);
  if (!source) {
    return { ok: false, error: "场上单位不存在。" };
  }
  if (source.instance.deployedAtAction === battle.actionSerial) {
    return { ok: false, error: "本回合新部署单位不能再次行动。" };
  }
  if (hasUnitActedInActionSequence(battle, source.instance)) {
    return { ok: false, error: "该单位本回合已经行动过。" };
  }
  if (source.instance.suppressed) {
    return { ok: false, error: "该单位受到电子压制，本回合不能行动。" };
  }

  const card = getCard(source.instance.cardId);
  if (!card?.ability) {
    return { ok: false, error: "该单位没有可主动发动的技能。" };
  }
  if (!isNoTargetAbility(card.ability)) {
    const previewTargets = getValidEffectTargets(battle, side, card.ability, card, { sourceRef: source, asActingSource: true });
    if (!previewTargets.length) {
      return { ok: false, error: `${card.name} 当前没有合法目标。` };
    }
  }

  markBoardActionUsed(battle, side);
  markUnitActed(battle, source.instance);
  if (source.instance.hidden) {
    source.instance.hidden = false;
    source.instance.exposed = true;
    pushBoardEffect(battle, "expose", side, source, card.id, 1, source);
    battle.log.push(`${getSideName(battle, side)}主动翻开 ${card.name}。`);
  } else {
    battle.log.push(`${getSideName(battle, side)}命令 ${card.name} 发动技能。`);
  }

  if (card.ability.noTarget || ["supply"].includes(card.ability.kind)) {
    resolveNoTargetAbility(battle, side, card.ability, card);
    finishActionAfterResolved(battle, side);
    return { ok: true };
  }

  maybeOpenPendingOrResolve(battle, side, source.instance.uid, card.ability, "boardEffect");
  finishActionAfterResolved(battle, side);
  return { ok: true };
}

function applyChooseTarget(battle, side, action) {
  if (!battle.pending || battle.pending.side !== side) {
    return { ok: false, error: "当前没有等待你选择的目标。" };
  }
  if (battle.pending.kind === "supplyChoice") {
    return applyChooseSupply(battle, side, action);
  }
  const selectedTargets = getSelectedPendingTargets(battle.pending, action, side);
  const target = selectedTargets[0] || null;
  if (!target) {
    return { ok: false, error: "目标已失效。" };
  }

  const pending = battle.pending;
  battle.pending = null;

  if (pending.kind === "interceptChoice") {
    return resolveInterceptChoice(battle, side, pending, target);
  }

  if (pending.kind === "callFireChoice") {
    const result = resolveCallFireChoice(battle, side, pending, target);
    if (result === "pending") {
      return { ok: true };
    }
    finishActionAfterResolved(battle, side);
    return { ok: true };
  }

  if (pending.kind === "handEffect") {
    const handIndex = battle.hands[side].findIndex((item) => item.uid === pending.handUid);
    if (handIndex === -1) {
      return { ok: false, error: "手牌已不在手中。" };
    }
    const [instance] = battle.hands[side].splice(handIndex, 1);
    battle.graves[side].push(instance);
    markTacticActionUsed(battle, side);
    battle.log.push(`${getSideName(battle, side)}打出 ${getCard(pending.cardId).name}。`);
    pushEffect(battle, {
      type: "discard",
      targetSide: side,
      targetCardId: pending.cardId,
      amount: 1,
    });
  }

  if (pending.kind === "frontlineContact") {
    const sourceRef = findBoardInstance(battle, side, pending.sourceUid);
    if (sourceRef) {
      resolveFrontlineContactFire(battle, side, sourceRef, target.side, target);
      cleanupDestroyed(battle, side);
      enforceHighAirExposure(battle);
    }
    finishActionAfterResolved(battle, side);
    return { ok: true };
  }

  const result = resolveEffectOnTarget(battle, side, pending, target, { selectedTargets });
  if (result === "pending") {
    return { ok: true };
  }
  finishActionAfterResolved(battle, side);
  return { ok: true };
}

function getSelectedPendingTargets(pending, action, viewerSide) {
  if (!pending?.targets?.length) {
    return [];
  }
  const rawTargets = Array.isArray(action.selectedTargets) && action.selectedTargets.length
    ? action.selectedTargets
    : [{ side: action.targetSide, uid: action.targetUid }];
  const selected = [];
  const seen = new Set();
  const limit = pending.ability?.kind === "areaDamage"
    ? Math.max(1, pending.ability.maxTargets || 1)
    : 1;
  rawTargets.forEach((raw) => {
    if (!raw?.uid || selected.length >= limit) {
      return;
    }
    const serverSide = mapViewerSideToServer(raw.side || action.targetSide, viewerSide);
    const key = `${serverSide}:${raw.uid}`;
    if (seen.has(key)) {
      return;
    }
    const target = pending.targets.find((item) => item.side === serverSide && item.uid === raw.uid);
    if (target) {
      seen.add(key);
      selected.push(target);
    }
  });
  return selected;
}

function applyFrontlineBreakthrough(battle, side, action) {
  const ready = assertCanAct(battle, side);
  if (!ready.ok) return ready;
  if (battle.pending) {
    return { ok: false, error: "请先完成当前目标选择。" };
  }
  const sourceRef = findBoardInstance(battle, side, action.sourceUid);
  if (!canSourceUseBreakthrough(battle, side, sourceRef)) {
    return { ok: false, error: "当前没有可执行前线突破的单位。" };
  }
  const targetSide = mapViewerSideToServer(action.targetSide, side);
  const opponent = getOpponentSide(side);
  if (targetSide !== opponent) {
    return { ok: false, error: "前线突破只能选择敌方支援区目标。" };
  }
  const targetRef = findBoardInstance(battle, targetSide, action.targetUid);
  if (!targetRef || targetRef.lineId !== "support" || getCurrentPower(targetRef.instance) <= 0) {
    return { ok: false, error: "请选择一个敌方支援区目标。" };
  }

  const sourceCard = getCard(sourceRef.instance.cardId);
  markBoardActionUsed(battle, side);
  markUnitActed(battle, sourceRef.instance);
  const result = resolveBreakthroughOnTarget(battle, side, sourceRef, sourceCard.ability, targetRef);
  if (result === "pending") {
    return { ok: true };
  }
  cleanupDestroyed(battle, side);
  enforceHighAirExposure(battle);
  finishActionAfterResolved(battle, side);
  return { ok: true };
}

function applyChooseSupply(battle, side, action) {
  const pending = battle.pending;
  const selectedUids = Array.isArray(action.selectedUids)
    ? action.selectedUids
    : action.targetUid
      ? [action.targetUid]
      : [];
  const keepAmount = Math.max(1, pending.keepAmount || pending.ability?.keep || 1);
  const selected = selectedUids
    .map((uid) => pending.drawn.find((instance) => instance.uid === uid))
    .filter(Boolean)
    .slice(0, keepAmount);
  if (!selected.length) {
    return { ok: false, error: "请选择要保留的补给牌。" };
  }
  battle.pending = null;
  completeSupplyChoice(battle, side, getCard(pending.cardId), pending.drawn, selected);
  finishActionAfterResolved(battle, side);
  return { ok: true };
}

function applyPassTurn(battle, side) {
  const ready = assertCanAct(battle, side);
  if (!ready.ok) return ready;
  if (battle.pending) {
    if (canClearStalePending(battle, battle.pending)) {
      battle.pending = null;
    } else {
      return { ok: false, error: "请先完成当前目标选择。" };
    }
  }

  clearSuppressionForSide(battle, side);
  if (!battle.finalActions) {
    drawCards(battle, side, 1);
  }
  battle.passed[side] = true;
  battle.log.push(`${getSideName(battle, side)}结束回合，移交指挥权。`);
  if (battle.finalActions) {
    finishFinalAction(battle, side);
    return { ok: true };
  }

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
  const targets = getValidEffectTargets(battle, side, ability, sourceCard, { sourceRef: source, asActingSource: true });
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

function resolveEffectOnTarget(battle, side, pending, targetRef, options = {}) {
  const sourceCard = getCard(pending.cardId);
  const ability = pending.ability || {};
  const sourceRef = pending.sourceUid ? findBoardInstance(battle, side, pending.sourceUid) : null;

  if (targetRef.breakthrough && sourceRef) {
    const result = resolveBreakthroughOnTarget(battle, side, sourceRef, ability, targetRef);
    if (result === "pending") {
      return "pending";
    }
    cleanupDestroyed(battle, side);
    return;
  }

  if (ability.sourceExposes && sourceRef) {
    const sourceChanged = sourceRef.instance.hidden || !sourceRef.instance.exposed;
    sourceRef.instance.hidden = false;
    sourceRef.instance.exposed = true;
    if (sourceChanged) {
      pushBoardEffect(battle, "expose", side, sourceRef, sourceCard.id, 1, sourceRef);
    }
  }

  if (ability.kind === "damage") {
    if (targetRef.instance.hidden && canRevealHiddenTargetForAbility(ability, targetRef.instance)) {
      exposeTarget(battle, targetRef, sourceCard.name, { attackerSide: side, sourceCardId: sourceCard.id, sourceRef });
    }
    const result = dealDamage(battle, side, targetRef, getDamageAmount(battle, side, ability, targetRef, sourceCard), sourceCard, ability, sourceRef);
    if (result === "pending") {
      return "pending";
    }
    cleanupDestroyed(battle, side);
    return;
  }

  if (ability.kind === "areaDamage") {
    const targets = getAreaDamageTargets(battle, side, ability, targetRef, { selectedTargets: options.selectedTargets });
    for (const [index, item] of targets.entries()) {
      const amount = index === 0
        ? getDamageAmount(battle, side, ability, item, sourceCard)
        : getSecondaryDamageAmount(ability, item);
      const result = dealDamage(battle, side, item, amount, sourceCard, ability, sourceRef);
      if (result === "pending") {
        return "pending";
      }
    }
    cleanupDestroyed(battle, side);
    return;
  }

  if (ability.kind === "exposeAndCallFire") {
    const freshExpose = targetRef.instance.hidden;
    exposeTarget(battle, targetRef, sourceCard.name, { attackerSide: side, sourceCardId: sourceCard.id, sourceRef, playSourceVideo: true });
    const callFireOptions = getCallableFireOptions(battle, side, ability, targetRef, { freshExpose });
    if (callFireOptions.length > 1) {
      battle.pending = {
        side,
        kind: "callFireChoice",
        originKind: pending.kind,
        handUid: pending.handUid || null,
        sourceUid: pending.sourceUid || null,
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
      return "pending";
    }
    if (callFireOptions.length) {
      const { caller, fire } = callFireOptions[0];
      const result = resolveCalledFire(battle, side, sourceCard, caller, targetRef, fire);
      if (result === "pending") {
        return "pending";
      }
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
    const lineRepaired = applyLineRepair(targetRef, ability);
    pushBoardEffect(battle, "shield", side, targetRef, sourceCard.id, 1, sourceRef);
    if (lineRepaired > 0) {
      pushBoardEffect(battle, "repair", side, targetRef, sourceCard.id, lineRepaired, sourceRef);
    }
    battle.log.push(`${sourceCard.name} 令 ${getCard(targetRef.instance.cardId).name} 重新进入隐蔽。`);
    enforceHighAirExposure(battle);
    return;
  }

  if (ability.kind === "repair") {
    const before = targetRef.instance.damage || 0;
    const amount = ability.full ? before : ability.amount || 1;
    targetRef.instance.damage = Math.max(0, before - amount);
    const repaired = before - targetRef.instance.damage;
    if (repaired > 0) {
      pushBoardEffect(battle, "repair", side, targetRef, sourceCard.id, repaired, sourceRef);
    }
    battle.log.push(`${sourceCard.name} 修复 ${getCard(targetRef.instance.cardId).name} ${before - targetRef.instance.damage} 点伤害。`);
    return;
  }

  if (ability.kind === "suppress") {
    targetRef.instance.suppressed = true;
    pushBoardEffect(battle, "suppress", side, targetRef, sourceCard.id, 1, sourceRef);
    battle.log.push(`${sourceCard.name} 压制 ${getCard(targetRef.instance.cardId).name}，其下一回合不能行动。`);
  }
}

function resolveNoTargetAbility(battle, side, ability = {}, sourceCard = null) {
  if (ability.kind === "supply") {
    return startSupplyChoice(battle, side, ability, sourceCard);
  }
}

function isNoTargetAbility(ability = {}) {
  return Boolean(ability.noTarget || ability.kind === "supply");
}

function startSupplyChoice(battle, side, ability = {}, sourceCard = null) {
  const drawAmount = ability.draw || 1;
  const keepAmount = ability.keep || drawAmount;
  const drawn = [];
  for (let index = 0; index < drawAmount; index += 1) {
    const card = battle.decks[side].shift();
    if (!card) {
      triggerSupplyExhaustion(battle, side);
      break;
    }
    card.supplyCandidate = true;
    drawn.push(card);
  }
  if (!drawn.length) {
    battle.log.push(`${sourceCard?.name || "补给"} 未能完成补给，牌库为空。`);
    return "resolved";
  }
  if (drawn.length > keepAmount) {
    battle.pending = {
      side,
      kind: "supplyChoice",
      cardId: sourceCard?.id || null,
      ability,
      drawn,
      keepAmount,
      targets: [],
    };
    battle.log.push(`${sourceCard?.name || "补给"} 展示 ${drawn.length} 张补给候选，等待 ${getSideName(battle, side)}选择 ${keepAmount} 张。`);
    pushEffect(battle, {
      type: "supply",
      attackerSide: side,
      sourceCardId: sourceCard?.id || null,
      amount: drawn.length,
    });
    return "pending";
  }
  completeSupplyChoice(battle, side, sourceCard, drawn, drawn);
  return "resolved";
}

function completeSupplyChoice(battle, side, sourceCard, drawn, kept) {
  const keptIds = new Set(kept.map((instance) => instance.uid));
  const returned = drawn.filter((instance) => !keptIds.has(instance.uid));
  drawn.forEach((instance) => {
    instance.supplyCandidate = false;
  });
  battle.hands[side].push(...kept);
  battle.decks[side].push(...returned);
  battle.log.push(`${sourceCard?.name || "补给"} 为 ${getSideName(battle, side)}保留 ${kept.length} 张，${returned.length} 张放回牌库底。`);
  if (kept.length) {
    pushEffect(battle, {
      type: "draw",
      targetSide: side,
      sourceCardId: sourceCard?.id || null,
      amount: kept.length,
    });
  }
}

function canClearStalePending(battle, pending) {
  if (!pending || pending.kind === "supplyChoice") {
    return false;
  }
  if (pending.kind === "callFireChoice" && (!pending.target || !findBoardInstance(battle, pending.target.side, pending.target.uid))) {
    return true;
  }
  return !pending.targets?.some((target) => {
    const live = findBoardInstance(battle, target.side, target.uid);
    return live && getCurrentPower(live.instance) > 0;
  });
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
  return withBreakthroughTargets(battle, side, ability, sourceCard, targets, options);
}

function canTargetForAbility(battle, side, targetRef, ability = {}, sourceCard = null, options = {}) {
  const targetCard = getCard(targetRef.instance.cardId);
  if (!targetCard || getCurrentPower(targetRef.instance) <= 0) {
    return false;
  }

  if (isBlockedByEnemyFrontlineScreen(battle, side, targetRef, ability, { sourceRef: options.sourceRef, sourceCard, ignoreFrontlineSupportBlock: options.ignoreFrontlineSupportBlock })) {
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

  const canRevealHidden =
    ability.kind === "suppress" ||
    ability.canRevealHidden ||
    canRevealHiddenTargetForAbility(ability, targetRef.instance) ||
    (isAirDefenseUnit(sourceCard) && isAirUnit(targetCard));
  if (targetRef.instance.hidden && !canRevealHidden) {
    return false;
  }
  if (ability.publicOnly && targetRef.instance.hidden) {
    return false;
  }
  if (ability.requiresExposed && !targetRef.instance.exposed && !canRevealHidden) {
    return false;
  }
  if (ability.requiresExposedOrAnyTag?.length && !targetRef.instance.exposed && !ability.requiresExposedOrAnyTag.some((tag) => targetCard.tags.includes(tag))) {
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

function withBreakthroughTargets(battle, side, ability, sourceCard, targets, options = {}) {
  const sourceRef = options.sourceRef;
  if (!canSourceUseBreakthrough(battle, side, sourceRef, { ignoreActed: Boolean(options.asActingSource) })) {
    return targets;
  }
  const opponent = getOpponentSide(side);
  const hiddenSupportTargets = getAllBoardTargets(battle, opponent)
    .filter((target) => target.lineId === "support" && target.instance.hidden && getCurrentPower(target.instance) > 0)
    .map((target) => ({ ...target, breakthrough: true }));
  if (!hiddenSupportTargets.length) {
    return targets;
  }
  const existingIds = new Set(targets.map((target) => target.uid));
  return [
    ...targets.map((target) => hiddenSupportTargets.some((item) => item.uid === target.uid) ? { ...target, breakthrough: true } : target),
    ...hiddenSupportTargets.filter((target) => !existingIds.has(target.uid))
  ];
}

function canSourceUseBreakthrough(battle, side, sourceRef, options = {}) {
  if (!sourceRef?.instance || sourceRef.lineId !== "frontline" || getCurrentPower(sourceRef.instance) <= 0) {
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
  if (sourceRef.instance.deployedAtAction === battle.actionSerial || sourceRef.instance.suppressed) {
    return false;
  }
  return options.ignoreActed || !hasUnitActedInActionSequence(battle, sourceRef.instance);
}

function getBreakthroughStrikeAbility(ability) {
  if (!ability || !["damage", "areaDamage"].includes(ability.kind)) {
    return null;
  }
  return {
    ...ability,
    kind: ability.kind === "areaDamage" ? "damage" : ability.kind,
    rows: [...new Set([...(ability.rows || []), "support"])],
    requiresAnyTag: getBreakthroughRequiresAnyTag(ability),
    canRevealHidden: true,
    requiresExposed: false
  };
}

function getBreakthroughRequiresAnyTag(ability = {}) {
  if (!Array.isArray(ability.requiresAnyTag)) {
    return ability.requiresAnyTag;
  }
  const canHitGround = ability.requiresAnyTag.some((tag) => BREAKTHROUGH_GROUND_ATTACK_TAGS.has(tag));
  if (!canHitGround) {
    return ability.requiresAnyTag;
  }
  return [...new Set([...ability.requiresAnyTag, ...BREAKTHROUGH_GROUND_PLATFORM_TAGS])];
}

function resolveBreakthroughOnTarget(battle, side, sourceRef, ability, targetRef) {
  const sourceCard = getCard(sourceRef.instance.cardId);
  getTurnActions(battle, side).breakthroughUsed = true;
  exposeTarget(battle, targetRef, "前线突破", { attackerSide: side, sourceCardId: sourceCard.id, sourceRef });
  const breakthroughAbility = getBreakthroughStrikeAbility(ability);
  const canStrike = Boolean(
    breakthroughAbility &&
      canTargetForAbility(battle, side, targetRef, breakthroughAbility, sourceCard, { sourceRef, ignoreFrontlineSupportBlock: true }) &&
      matchesTargetRequirements(targetRef.instance, breakthroughAbility)
  );
  if (!canStrike) {
    battle.log.push(`${sourceCard.name} 执行前线突破，只暴露目标，未造成伤害。`);
    return;
  }
  const amount = getDamageAmount(battle, side, breakthroughAbility, targetRef, sourceCard);
  battle.log.push(`${sourceCard.name} 执行前线突破并开火。`);
  return dealDamage(battle, side, targetRef, amount, sourceCard, breakthroughAbility, sourceRef);
}

function isDirectAttackAbility(ability) {
  return ["damage", "areaDamage"].includes(ability?.kind);
}

function isFrontlineSourceContext(context) {
  if (context.sourceRef?.lineId) {
    return context.sourceRef.lineId === "frontline";
  }
  return Boolean(context.sourceCard?.type === "unit" && context.sourceCard.line === "frontline");
}

function isBlockedByEnemyFrontlineScreen(battle, actingSide, targetRef, ability, context = {}) {
  if (context.ignoreFrontlineSupportBlock || targetRef.breakthrough || !isDirectAttackAbility(ability)) {
    return false;
  }
  if (targetRef.side === actingSide || targetRef.lineId !== "support" || !isFrontlineSourceContext(context)) {
    return false;
  }
  return countAliveUnitsOnLine(battle, targetRef.side, "frontline") > 0;
}

function matchesTargetRequirements(instance, ability = {}) {
  const card = getCard(instance.cardId);
  if (ability.requiresAnyTag?.length && !ability.requiresAnyTag.some((tag) => card.tags.includes(tag))) {
    return false;
  }
  if (ability.requiresExposedForTags?.some((tag) => card.tags.includes(tag)) && !instance.exposed) {
    return false;
  }
  return true;
}

function getAreaDamageTargets(battle, side, ability, primaryTarget, options = {}) {
  const maxTargets = Math.max(1, ability.maxTargets || 2);
  if (Array.isArray(options.selectedTargets) && options.selectedTargets.length) {
    return options.selectedTargets
      .map((target) => findBoardInstance(battle, target.side, target.uid))
      .filter(Boolean)
      .filter((target) => canTargetForAbility(battle, side, target, { ...ability, hiddenOnly: false }) && matchesTargetRequirements(target.instance, ability))
      .slice(0, maxTargets);
  }

  const rows = ability.sameLineOnly ? [primaryTarget.lineId] : ability.rows || [primaryTarget.lineId];
  const candidates = getAllBoardTargets(battle, primaryTarget.side)
    .filter((target) => rows.includes(target.lineId))
    .filter((target) => getCurrentPower(target.instance) > 0)
    .filter((target) => canTargetForAbility(battle, side, target, { ...ability, hiddenOnly: false }) && matchesTargetRequirements(target.instance, ability));
  const ordered = [
    primaryTarget,
    ...candidates
      .filter((item) => item.uid !== primaryTarget.uid)
      .sort((left, right) => getCurrentPower(right.instance) - getCurrentPower(left.instance)),
  ];
  return ordered.slice(0, maxTargets);
}

function getDamageAmount(battle, side, ability = {}, targetRef, sourceCard) {
  let amount = ability.lineAmounts?.[targetRef.lineId] || ability.amount || sourceCard?.power || 1;
  const targetCard = getCard(targetRef.instance.cardId);
  (ability.bonuses || []).forEach((bonus) => {
    if (targetCard.tags.includes(bonus.tag)) {
      amount = Math.max(amount, bonus.amount);
    }
  });
  if (ability.ownTagBonus && battle.board[side]?.[ability.ownTagBonus.line]?.some((instance) =>
    getCurrentPower(instance) > 0 &&
      !instance.hidden &&
      (!ability.ownTagBonus.exposedOnly || instance.exposed) &&
      getCard(instance.cardId).tags.includes(ability.ownTagBonus.tag)
  )) {
    amount += ability.ownTagBonus.amount || 0;
  }
  if (ability.ownAnyTagBonus && battle.board[side]?.[ability.ownAnyTagBonus.line]?.some((instance) => {
    const card = getCard(instance.cardId);
    return getCurrentPower(instance) > 0 && ability.ownAnyTagBonus.tags?.some((tag) => card.tags.includes(tag));
  })) {
    amount += ability.ownAnyTagBonus.amount || 0;
  }
  if (Number.isFinite(ability.ownTagBonus?.cap)) {
    amount = Math.min(amount, ability.ownTagBonus.cap);
  }
  if (ability.flatBonus) {
    amount += ability.flatBonus;
  }
  return Math.max(0, amount);
}

function getSecondaryDamageAmount(ability = {}, targetRef) {
  let amount = ability.secondaryAmount || Math.max(1, Math.floor((ability.amount || 2) / 2));
  const targetCard = getCard(targetRef.instance.cardId);
  (ability.secondaryBonuses || []).forEach((bonus) => {
    if (targetCard.tags.includes(bonus.tag)) {
      amount = Math.max(amount, bonus.amount);
    }
  });
  if (ability.flatBonus) {
    amount += ability.flatBonus;
  }
  return amount;
}

function applyInterception(battle, attackerSide, targetRef, amount, sourceCard, ability = {}, sourceRef = null) {
  const defenderSide = targetRef.side;
  const targetCard = getCard(targetRef.instance.cardId);
  if (ability.ignoreInterceptionForTargetTags?.some((tag) => targetCard.tags.includes(tag))) {
    return amount;
  }
  const allowedInterceptorTags = ability.interceptByTags || [];
  if (!allowedInterceptorTags.length) {
    return amount;
  }
  const interceptors = getInterceptionCandidates(battle, defenderSide, allowedInterceptorTags, sourceCard, targetRef);
  if (!interceptors.length) {
    return amount;
  }
  if (interceptors.length > 1) {
    battle.pending = {
      side: defenderSide,
      kind: "interceptChoice",
      cardId: sourceCard.id,
      ability,
      attackerSide,
      sourceSide: sourceRef?.side || attackerSide,
      sourceLineId: sourceRef?.lineId || null,
      sourceUid: sourceRef?.uid || sourceRef?.instance?.uid || null,
      targetSide: targetRef.side,
      targetLineId: targetRef.lineId,
      targetUid: targetRef.uid,
      targetCardId: targetRef.instance.cardId,
      amount,
      targets: interceptors,
    };
    battle.log.push(`${sourceCard.name} 触发多个防空拦截窗口，等待 ${getSideName(battle, defenderSide)}选择拦截单位。`);
    return "pending";
  }
  return applyInterceptorToDamage(battle, attackerSide, targetRef, amount, sourceCard, interceptors[0], sourceRef);
}

function getInterceptionCandidates(battle, defenderSide, allowedInterceptorTags, sourceCard, targetRef) {
  return getAllBoardTargets(battle, defenderSide).filter((ref) => {
    if (!canUseActionLikePassive(battle, ref.instance)) {
      return false;
    }
    const card = getCard(ref.instance.cardId);
    const intercept = card.continuous;
    if (!intercept || !allowedInterceptorTags.some((tag) => card.tags.includes(tag))) {
      return false;
    }
    if (intercept.protectLines?.length && !intercept.protectLines.includes(targetRef.lineId)) {
      return false;
    }
    return intercept.interceptTags?.some((tag) => sourceCard.tags.includes(tag));
  });
}

function applyInterceptorToDamage(battle, attackerSide, targetRef, amount, sourceCard, interceptor, sourceRef = null) {
  const defenderSide = targetRef.side;
  const interceptorCard = getCard(interceptor.instance.cardId);
  const intercept = interceptorCard.continuous || {};
  interceptor.instance.interceptAction = battle.actionSerial;
  if (intercept.sourceExposes) {
    const interceptorChanged = interceptor.instance.hidden || !interceptor.instance.exposed;
    interceptor.instance.hidden = false;
    interceptor.instance.exposed = true;
    if (interceptorChanged) {
      pushBoardEffect(battle, "expose", defenderSide, interceptor, interceptorCard.id, 1, interceptor);
    }
  }
  if (intercept.interceptCancelsDamage) {
    battle.log.push(`${interceptorCard.name} 拦截 ${sourceCard.name}，本次伤害无效。`);
    pushEffect(battle, {
      type: "intercept",
      attackerSide,
      sourceSide: sourceRef?.side || attackerSide,
      sourceLineId: sourceRef?.lineId || null,
      sourceUid: sourceRef?.uid || sourceRef?.instance?.uid || null,
      targetSide: defenderSide,
      lineId: targetRef.lineId,
      targetUid: targetRef.uid,
      targetCardId: targetRef.instance.cardId,
      sourceCardId: sourceCard.id,
      interceptorUid: interceptor.uid,
      interceptorLineId: interceptor.lineId,
      interceptorCardId: interceptorCard.id,
      amount,
    });
    return 0;
  }
  const nextAmount = Math.max(0, amount - (intercept.intercept || 0));
  battle.log.push(`${interceptorCard.name} 拦截 ${sourceCard.name}，伤害 -${amount - nextAmount}。`);
  pushEffect(battle, {
    type: "intercept",
    attackerSide,
    sourceSide: sourceRef?.side || attackerSide,
    sourceLineId: sourceRef?.lineId || null,
    sourceUid: sourceRef?.uid || sourceRef?.instance?.uid || null,
    targetSide: defenderSide,
    lineId: targetRef.lineId,
    targetUid: targetRef.uid,
    targetCardId: targetRef.instance.cardId,
    sourceCardId: sourceCard.id,
    interceptorUid: interceptor.uid,
    interceptorLineId: interceptor.lineId,
    interceptorCardId: interceptorCard.id,
    amount: amount - nextAmount,
  });
  return nextAmount;
}

function resolveInterceptChoice(battle, side, pending, interceptorRef) {
  const targetRef = findBoardInstance(battle, pending.targetSide, pending.targetUid);
  if (!targetRef) {
    finishActionAfterResolved(battle, pending.attackerSide);
    return { ok: true };
  }
  const sourceCard = getCard(pending.cardId);
  const sourceRef = pending.sourceUid ? findBoardInstance(battle, pending.sourceSide || pending.attackerSide, pending.sourceUid) : null;
  const liveInterceptor = findBoardInstance(battle, side, interceptorRef.uid);
  if (!liveInterceptor || !canUseActionLikePassive(battle, liveInterceptor.instance)) {
    battle.pending = pending;
    return { ok: false, error: "该防空单位已不能拦截。" };
  }
  const finalAmount = applyInterceptorToDamage(battle, pending.attackerSide, targetRef, pending.amount, sourceCard, liveInterceptor, sourceRef);
  applyDamageAfterInterception(battle, pending.attackerSide, targetRef, finalAmount, sourceCard, sourceRef);
  cleanupDestroyed(battle, pending.attackerSide);
  enforceHighAirExposure(battle);
  finishActionAfterResolved(battle, pending.attackerSide);
  return { ok: true };
}

function canPassiveRevealFromHidden(rule) {
  return Boolean(rule?.canReveal || rule?.sourceExposes);
}

function dealDamage(battle, attackerSide, targetRef, amount, sourceCard, ability = {}, sourceRef = null) {
  if (!targetRef?.instance || amount <= 0) {
    return "resolved";
  }
  let finalAmount = applyInterception(battle, attackerSide, targetRef, amount, sourceCard, ability, sourceRef);
  if (finalAmount === "pending") {
    return "pending";
  }
  return applyDamageAfterInterception(battle, attackerSide, targetRef, finalAmount, sourceCard, sourceRef);
}

function applyDamageAfterInterception(battle, attackerSide, targetRef, amount, sourceCard, sourceRef = null) {
  let finalAmount = amount;
  if (finalAmount <= 0) {
    return "resolved";
  }
  targetRef.instance.hidden = false;
  targetRef.instance.exposed = true;
  targetRef.instance.damage = (targetRef.instance.damage || 0) + finalAmount;
  targetRef.instance.lastDamagedBy = attackerSide;
  targetRef.instance.shield = false;
  battle.log.push(`${sourceCard.name} 对 ${getCard(targetRef.instance.cardId).name} 造成 ${finalAmount} 点伤害。`);
  pushEffect(battle, {
    type: "damage",
    attackerSide,
    sourceSide: sourceRef?.side || attackerSide,
    sourceLineId: sourceRef?.lineId || null,
    sourceUid: sourceRef?.uid || sourceRef?.instance?.uid || null,
    targetSide: targetRef.side,
    lineId: targetRef.lineId,
    targetUid: targetRef.uid,
    targetCardId: targetRef.instance.cardId,
    sourceCardId: sourceCard.id,
    amount: finalAmount,
  });
  return "resolved";
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
        pushEffect(battle, {
          type: "destroyed",
          attackerSide,
          targetSide: side,
          lineId: line.id,
          targetUid: destroyed.uid,
          targetCardId: destroyed.cardId,
          amount: value,
        });
      }
    });
  });
}

function exposeTarget(battle, targetRef, sourceName, options = {}) {
  if (!targetRef?.instance) {
    return false;
  }
  const changed = targetRef.instance.hidden || !targetRef.instance.exposed;
  targetRef.instance.hidden = false;
  targetRef.instance.exposed = true;
  if (changed || options.forceEffect) {
    const { attackerSide, sourceCardId, sourceRef, forceEffect, ...effectExtra } = options;
    pushBoardEffect(battle, "expose", attackerSide || targetRef.side, targetRef, sourceCardId || null, 1, sourceRef || null, effectExtra);
  }
  battle.log.push(`${sourceName} 暴露 ${getCard(targetRef.instance.cardId).name}。`);
  return changed;
}

function exposeInstanceRef(battle, ref, sourceName, options = {}) {
  if (!ref?.instance || !ref.instance.hidden) {
    return false;
  }
  ref.instance.hidden = false;
  ref.instance.exposed = true;
  pushBoardEffect(battle, "expose", options.attackerSide || ref.side, ref, options.sourceCardId || null, 1, options.sourceRef || null);
  battle.log.push(`${sourceName} 暴露 ${getCard(ref.instance.cardId).name}。`);
  return true;
}

function pushEffect(battle, effect) {
  battle.effectSerial = (battle.effectSerial || 0) + 1;
  battle.effects ||= [];
  battle.effects.push({
    id: `${battle.id || battle.roomCode || "battle"}-${battle.effectSerial}`,
    serial: battle.effectSerial,
    atAction: battle.actionSerial,
    ...effect,
  });
  battle.effects = battle.effects.slice(-80);
}

function pushBoardEffect(battle, type, attackerSide, targetRef, sourceCardId = null, amount = 1, sourceRef = null, extra = {}) {
  if (!targetRef?.instance) {
    return;
  }
  pushEffect(battle, {
    type,
    attackerSide: attackerSide || sourceRef?.side || targetRef.side,
    sourceSide: sourceRef?.side || attackerSide || targetRef.side,
    sourceLineId: sourceRef?.lineId || null,
    sourceUid: sourceRef?.uid || sourceRef?.instance?.uid || null,
    sourceCardId,
    targetSide: targetRef.side,
    lineId: targetRef.lineId,
    targetUid: targetRef.uid,
    targetCardId: targetRef.instance.cardId,
    amount,
    ...extra,
  });
}

function resolveFrontlineContact(battle, side, deployedRef) {
  const deployedCard = getCard(deployedRef.instance.cardId);
  if (deployedRef.lineId !== "frontline" || !isFrontlineContactUnit(deployedCard) || deployedCard.contactException) {
    return;
  }
  const opponent = getOpponentSide(side);
  const opponentFrontline = getAllBoardTargets(battle, opponent)
    .filter((target) => target.lineId === "frontline" && getCurrentPower(target.instance) > 0);
  if (!opponentFrontline.length) {
    return;
  }
  exposeInstanceRef(battle, deployedRef, "前线接敌");
  const ambushers = opponentFrontline.filter((target) => {
    const card = getCard(target.instance.cardId);
    return target.instance.hidden && !target.instance.suppressed && isFrontlineContactUnit(card) && !card.contactException;
  });

  ambushers.forEach((ambusher) => {
    exposeInstanceRef(battle, ambusher, "前线接敌");
    if (findBoardInstance(battle, side, deployedRef.uid)) {
      resolveFrontlineContactFire(battle, opponent, ambusher, side, deployedRef, { includeAmbushBonus: true });
      cleanupDestroyed(battle, opponent);
    }
  });

  const liveDeployed = findBoardInstance(battle, side, deployedRef.uid);
  if (!liveDeployed) {
    return;
  }
  const responseTargets = opponentFrontline
    .map((target) => findBoardInstance(battle, opponent, target.uid))
    .filter(Boolean)
    .filter((target) => canTargetForAbility(battle, side, target, deployedCard.ability, deployedCard, { sourceRef: liveDeployed }) && matchesTargetRequirements(target.instance, deployedCard.ability || {}));
  if (responseTargets.length > 1) {
    battle.pending = {
      side,
      kind: "frontlineContact",
      sourceUid: liveDeployed.uid,
      cardId: deployedCard.id,
      ability: deployedCard.ability,
      targets: responseTargets,
    };
    battle.log.push(`${deployedCard.name} 前线接敌，需要选择反击目标。`);
  } else if (responseTargets.length === 1) {
    resolveFrontlineContactFire(battle, side, liveDeployed, opponent, responseTargets[0]);
    cleanupDestroyed(battle, side);
  }
}

function resolveInfiltrationFrontlineReveal(battle, side, deployedRef) {
  const deployedCard = getCard(deployedRef.instance.cardId);
  if (deployedRef.lineId !== "frontline" || !deployedCard?.contactException || !deployedRef.instance.hidden) {
    return false;
  }
  const opponent = getOpponentSide(side);
  const revealed = getAllBoardTargets(battle, opponent)
    .filter((target) => target.lineId === "frontline" && target.instance.hidden && getCurrentPower(target.instance) > 0)
    .filter((target) => {
      const card = getCard(target.instance.cardId);
      return !card.contactException;
    });
  revealed.forEach((target) => {
    exposeTarget(battle, target, deployedCard.name, {
      attackerSide: side,
      sourceCardId: deployedCard.id,
      sourceRef: deployedRef,
      playSourceVideo: true,
    });
  });
  if (revealed.length) {
    battle.log.push(`${deployedCard.name} 渗透进入前线，迫使 ${revealed.length} 个敌方前线单位暴露。`);
  }
  return revealed.length > 0;
}

function resolveFrontlineContactFire(battle, attackerSide, sourceRef, defenderSide, targetRef, options = {}) {
  if (!canUseActionLikePassive(battle, sourceRef.instance)) {
    return false;
  }
  const sourceCard = getCard(sourceRef.instance.cardId);
  const ability = sourceCard.ability;
  if (!ability || !["damage", "areaDamage"].includes(ability.kind)) {
    return false;
  }
  if (!canTargetForAbility(battle, attackerSide, targetRef, ability, sourceCard, { sourceRef }) || !matchesTargetRequirements(targetRef.instance, ability)) {
    return false;
  }
  const amount = getDamageAmount(battle, attackerSide, ability, targetRef, sourceCard) + (options.includeAmbushBonus ? sourceCard.ambushBonus || 0 : 0);
  if (options.includeAmbushBonus && sourceCard.ambushBonus) {
    battle.log.push(`${sourceCard.name} 触发【前线伏击】，本次伤害 +${sourceCard.ambushBonus}。`);
  }
  markUnitActed(battle, sourceRef.instance);
  dealDamage(battle, attackerSide, targetRef, amount, sourceCard, ability, sourceRef);
  return true;
}

function enforceHighAirExposure(battle) {
  const sidesWithHighAir = SIDES.filter((side) => getAllBoardTargets(battle, side).some((target) => {
    const card = getCard(target.instance.cardId);
    return getCurrentPower(target.instance) > 0 && isHighAirUnit(card);
  }));
  if (sidesWithHighAir.length < 2) {
    return;
  }
  SIDES.forEach((side) => {
    getAllBoardTargets(battle, side).forEach((target) => {
      const card = getCard(target.instance.cardId);
      if (getCurrentPower(target.instance) > 0 && isHighAirUnit(card)) {
        exposeInstanceRef(battle, target, "高空接敌");
      }
    });
  });
}

function getAllBoardTargets(battle, side) {
  return LINES.flatMap((line) =>
    battle.board[side][line.id].map((instance) => ({ side, lineId: line.id, uid: instance.uid, instance }))
  );
}

function countAliveUnitsOnLine(battle, side, lineId) {
  return (battle.board[side]?.[lineId] || []).filter((instance) => getCurrentPower(instance) > 0).length;
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

function isGroundContactUnit(card) {
  return card.tags.includes("步兵") || card.tags.includes("装甲");
}

function isFrontlineContactUnit(card) {
  return isGroundContactUnit(card) || card.tags.includes("直升机");
}

function isHighAirUnit(card) {
  return card.tags.includes("战斗机") || card.tags.includes("轰炸机");
}

function isLowAirUnit(card) {
  return card.tags.includes("直升机") || card.tags.includes("无人机");
}

function isAirUnit(card) {
  return Boolean(card && (isLowAirUnit(card) || isHighAirUnit(card)));
}

function isAirDefenseUnit(card) {
  return Boolean(card?.tags?.includes("伴随防空") || card?.tags?.includes("重型防空"));
}

function canStayHiddenDuringFrontlineDeploy(card) {
  return Boolean(card?.contactException);
}

function canConcealCardForSide(battle, side, card, lineId = card?.line) {
  if (!battle || card?.type !== "unit") {
    return false;
  }
  if (lineId === "frontline" && isFrontlineContactUnit(card) && !canStayHiddenDuringFrontlineDeploy(card) && countAliveUnitsOnLine(battle, getOpponentSide(side), "frontline") > 0) {
    return false;
  }
  if (isHighAirUnit(card) && opponentHasExposedHighAir(battle, side)) {
    return false;
  }
  return true;
}

function opponentHasExposedHighAir(battle, side) {
  const opponent = getOpponentSide(side);
  return getAllBoardTargets(battle, opponent).some((target) => {
    const card = getCard(target.instance.cardId);
    return getCurrentPower(target.instance) > 0 && target.instance.exposed && !target.instance.hidden && isHighAirUnit(card);
  });
}

function applyLineRepair(targetRef, ability = {}) {
  const repair = ability.repairIfLine;
  if (!repair || repair.line !== targetRef.lineId) {
    return 0;
  }
  const before = targetRef.instance.damage || 0;
  targetRef.instance.damage = Math.max(0, before - (repair.amount || 0));
  return before - targetRef.instance.damage;
}

function getCallableUnits(battle, side, callerTags = []) {
  return LINES.flatMap((line) => battle.board[side][line.id].map((instance) => ({ side, lineId: line.id, uid: instance.uid, instance })))
    .filter((ref) => {
      const card = getCard(ref.instance.cardId);
      return getCurrentPower(ref.instance) > 0 &&
        card.fire &&
        !ref.instance.suppressed &&
        !hasUnitActedInActionSequence(battle, ref.instance) &&
        callerTags.some((tag) => card.tags.includes(tag));
    })
    .sort((left, right) => getCurrentPower(right.instance) - getCurrentPower(left.instance));
}

function findCallableUnit(battle, side, callerTags = []) {
  return getCallableUnits(battle, side, callerTags)[0] || null;
}

function getCalledFireProfile(caller, ability = {}) {
  const callerCard = caller?.card || getCard(caller?.instance?.cardId);
  const baseFire = callerCard?.fire || callerCard?.ability || {};
  const bonus = ability.calledFireBonus || 0;
  return bonus
    ? { ...baseFire, flatBonus: (baseFire.flatBonus || 0) + bonus }
    : baseFire;
}

function getCallableFireOptions(battle, side, ability, targetRef, context = {}) {
  if (targetRef.instance.hidden || (ability.callFireRequiresFreshExpose && !context.freshExpose)) {
    return [];
  }
  return getCallableUnits(battle, side, ability.callerTags)
    .map((caller) => {
      const callerCard = getCard(caller.instance.cardId);
      return {
        caller: { ...caller, card: callerCard },
        callerCard,
        fire: getCalledFireProfile({ ...caller, card: callerCard }, ability),
      };
    })
    .filter(({ caller, callerCard, fire }) => fire && canCallFireAtTarget(battle, side, targetRef, ability, caller, callerCard, fire));
}

function resolveCallFireChoice(battle, side, pending, selectedCaller) {
  const sourceCard = getCard(pending.cardId);
  const targetRef = pending.target ? findBoardInstance(battle, pending.target.side, pending.target.uid) : null;
  const callerRef = selectedCaller ? findBoardInstance(battle, side, selectedCaller.uid) : null;
  if (!targetRef || !callerRef) {
    battle.log.push(`${sourceCard.name} 的校射目标已失效。`);
    return "resolved";
  }
  const callerCard = getCard(callerRef.instance.cardId);
  const caller = { ...callerRef, card: callerCard };
  const fire = getCalledFireProfile(caller, pending.ability);
  if (!getCallableUnits(battle, side, pending.ability.callerTags).some((item) => item.uid === caller.uid) ||
      !canCallFireAtTarget(battle, side, targetRef, pending.ability, caller, callerCard, fire)) {
    battle.log.push(`${sourceCard.name} 的校射单位已不能执行本次打击。`);
    if (pending.ability.noCallerFallback === "draw") {
      drawCards(battle, side, pending.ability.fallbackDraw || 1);
    }
    return "resolved";
  }
  const result = resolveCalledFire(battle, side, sourceCard, caller, targetRef, fire);
  if (result === "pending") {
    return "pending";
  }
  cleanupDestroyed(battle, side);
  return "resolved";
}

function resolveCalledFire(battle, side, sourceCard, caller, targetRef, fire = {}) {
  if (!caller?.instance || getCurrentPower(caller.instance) <= 0 || caller.instance.suppressed || hasUnitActedInActionSequence(battle, caller.instance)) {
    return "resolved";
  }
  caller.instance.calledAction = battle.actionSerial;
  markUnitActed(battle, caller.instance);
  const callerCard = getCard(caller.instance.cardId);
  if (fire.kind === "areaDamage") {
    const targets = getAreaDamageTargets(battle, side, fire, targetRef);
    for (const [index, item] of targets.entries()) {
      if (item.instance.hidden && canRevealHiddenTargetForAbility(fire, item.instance)) {
        exposeTarget(battle, item, callerCard.name, { attackerSide: side, sourceCardId: callerCard.id, sourceRef: caller });
      }
      const amount = index === 0
        ? getDamageAmount(battle, side, fire, item, callerCard)
        : getSecondaryDamageAmount(fire, item);
      const result = dealDamage(battle, side, item, amount, callerCard, fire, caller);
      if (result === "pending") {
        return "pending";
      }
    }
  } else {
    if (targetRef.instance.hidden && canRevealHiddenTargetForAbility(fire, targetRef.instance)) {
      exposeTarget(battle, targetRef, callerCard.name, { attackerSide: side, sourceCardId: callerCard.id, sourceRef: caller });
    }
    const amount = getDamageAmount(battle, side, fire, targetRef, callerCard);
    const result = dealDamage(battle, side, targetRef, amount, callerCard, fire, caller);
    if (result === "pending") {
      return "pending";
    }
  }
  if (fire.sourceExposes !== false) {
    exposeInstanceRef(battle, caller, sourceCard.name, { attackerSide: side, sourceCardId: callerCard.id, sourceRef: caller });
  }
  battle.log.push(`${sourceCard.name} 引导 ${callerCard.name} 校射。`);
  return "resolved";
}

function canCallFireAtTarget(battle, side, targetRef, ability = {}, caller, callerCard, fire = {}) {
  const targetCard = getCard(targetRef.instance.cardId);
  if (ability.callFireTargetTags?.length && !ability.callFireTargetTags.some((tag) => targetCard.tags.includes(tag))) {
    return false;
  }
  if (!caller || !callerCard) {
    return false;
  }
  return canTargetForAbility(battle, side, targetRef, fire, callerCard, { sourceRef: caller }) && matchesTargetRequirements(targetRef.instance, fire);
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

function finishActionAfterResolved(battle, side) {
  if (battle.pending) {
    return resolveBattleEndIfReady(battle);
  }

  if (battle.finalActions) {
    return finishFinalAction(battle, side);
  }

  return resolveBattleEndIfReady(battle);
}

function finishFinalAction(battle, side) {
  if (!battle.finalActions) {
    return resolveBattleEndIfReady(battle);
  }

  if (battle.finalTriggeredAtAction !== battle.actionSerial) {
    battle.finalActions[side] = Math.max(0, (battle.finalActions[side] || 0) - 1);
  }

  if (resolveBattleEndIfReady(battle)) {
    return true;
  }

  const other = getOpponentSide(side);
  const nextSide = (battle.finalActions[other] || 0) > 0
    ? other
    : (battle.finalActions[side] || 0) > 0
      ? side
      : null;
  if (!nextSide) {
    return resolveBattleEndIfReady(battle);
  }

  battle.activeSide = nextSide;
  battle.round += nextSide === "player" ? 1 : 0;
  battle.actionSerial += 1;
  battle.passed[nextSide] = false;
  resetTurnActions(battle, nextSide);
  battle.log.push(`${getSideName(battle, nextSide)}进入最终行动。`);
  return false;
}

function resolveBattleEndIfReady(battle) {
  if (battle.scores.player >= VICTORY_SCORE || battle.scores.enemy >= VICTORY_SCORE) {
    battle.status = "match-over";
    battle.activeSide = null;
    battle.matchWinner = battle.scores.player === battle.scores.enemy ? "draw" : battle.scores.player > battle.scores.enemy ? "player" : "enemy";
    battle.log.push(`对局结束：${battle.matchWinner === "draw" ? "平局" : `${getSideName(battle, battle.matchWinner)}获胜`}。`);
    return true;
  }

  if (!battle.finalActions) {
    return false;
  }

  if ((battle.finalActions.player || 0) > 0 || (battle.finalActions.enemy || 0) > 0) {
    return false;
  }

  revealAllHidden(battle);
  const playerBoardPower = getBoardPowerTotal(battle, "player");
  const enemyBoardPower = getBoardPowerTotal(battle, "enemy");
  battle.status = "match-over";
  battle.activeSide = null;
  battle.matchWinner =
    battle.scores.player === battle.scores.enemy
      ? playerBoardPower === enemyBoardPower
        ? "draw"
        : playerBoardPower > enemyBoardPower
          ? "player"
          : "enemy"
      : battle.scores.player > battle.scores.enemy
        ? "player"
        : "enemy";
  battle.log.push(`补给耗尽最终结算：得分 ${battle.scores.player}:${battle.scores.enemy}，场上生命 ${playerBoardPower}:${enemyBoardPower}，${battle.matchWinner === "draw" ? "平局" : `${getSideName(battle, battle.matchWinner)}获胜`}。`);
  return true;
}

function triggerSupplyExhaustion(battle, side) {
  if (battle.supplyExhausted) {
    return;
  }

  battle.supplyExhausted = true;
  battle.finalActions = { player: 1, enemy: 1 };
  battle.finalTriggeredAtAction = battle.actionSerial;
  battle.log.push(`${getSideName(battle, side)}补给耗尽，双方各获得 1 次最终行动。`);
}

function revealAllHidden(battle) {
  SIDES.forEach((side) => {
    LINES.forEach((line) => {
      battle.board[side][line.id].forEach((instance) => {
        instance.hidden = false;
        instance.exposed = true;
      });
    });
  });
}

function getBoardPowerTotal(battle, side) {
  let total = 0;
  LINES.forEach((line) => {
    battle.board[side][line.id].forEach((instance) => {
      total += getCurrentPower(instance);
    });
  });
  return total;
}

function drawCards(battle, side, amount, options = {}) {
  let drawn = 0;
  for (let index = 0; index < amount; index += 1) {
    const card = battle.decks[side].shift();
    if (!card) {
      if (drawn && !options.silent) {
        pushEffect(battle, {
          type: "draw",
          targetSide: side,
          amount: drawn,
        });
      }
      if (options.triggerExhaustion !== false) {
        triggerSupplyExhaustion(battle, side);
      }
      return drawn;
    }
    battle.hands[side].push(card);
    drawn += 1;
  }
  if (drawn && !options.silent) {
    pushEffect(battle, {
      type: "draw",
      targetSide: side,
      amount: drawn,
    });
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

function normalizePlayerForViewer(battle, side) {
  const player = battle.sides[side] || {};
  return {
    name: player.name || getSideName(battle, side),
    faction: player.faction || battle.factions[side],
  };
}

function normalizeEffectsForViewer(battle, effects, viewerSide) {
  return effects.map((effect) => {
    const normalized = {
      ...effect,
      attackerSide: effect.attackerSide ? mapSideForViewer(effect.attackerSide, viewerSide) : null,
      sourceSide: effect.sourceSide ? mapSideForViewer(effect.sourceSide, viewerSide) : null,
      targetSide: effect.targetSide ? mapSideForViewer(effect.targetSide, viewerSide) : null,
    };
    if (effect.sourceSide && effect.sourceSide !== viewerSide && effect.sourceUid) {
      const source = findBoardInstance(battle, effect.sourceSide, effect.sourceUid);
      if (source?.instance?.hidden) {
        normalized.sourceCardId = MASK_CARD_ID;
      }
    }
    if (effect.targetSide && effect.targetSide !== viewerSide && effect.targetUid) {
      const target = findBoardInstance(battle, effect.targetSide, effect.targetUid);
      if (target?.instance?.hidden) {
        normalized.targetCardId = MASK_CARD_ID;
      }
    }
    return normalized;
  });
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
  const normalized = cloneInstance(instance);
  if (normalized.lastDamagedBy) {
    normalized.lastDamagedBy = mapSideForViewer(normalized.lastDamagedBy, viewerSide);
  }
  return normalized;
}

function normalizePendingForViewer(pending, viewerSide) {
  if (pending.kind === "supplyChoice") {
    return {
      kind: "supplyChoice",
      side: "player",
      cardId: pending.cardId,
      ability: pending.ability,
      drawn: pending.drawn.map(cloneInstance),
      keepAmount: pending.keepAmount || pending.ability?.keep || 1,
      targets: [],
    };
  }
  return {
    kind: pending.kind,
    side: "player",
    handUid: pending.handUid || null,
    sourceUid: pending.sourceUid || null,
    cardId: pending.cardId,
    ability: pending.ability,
    target: pending.target
      ? {
          side: mapSideForViewer(pending.target.side, viewerSide),
          lineId: pending.target.lineId,
          uid: pending.target.uid,
        }
      : null,
    targets: pending.targets.map((target) => ({
      side: mapSideForViewer(target.side, viewerSide),
      lineId: target.lineId,
      uid: target.uid,
      breakthrough: Boolean(target.breakthrough),
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

function resetTurnActions(battle, side) {
  const opponent = getOpponentSide(side);
  battle.turnActions[side] = {
    ...createTurnActionState(),
    enemyFrontlineEmptyAtStart: countAliveUnitsOnLine(battle, opponent, "frontline") === 0,
    ownBoardEmptyAtStart: countAliveUnitsForSide(battle, side) === 0,
  };
}

function getTurnActions(battle, side) {
  battle.turnActions[side] ||= createTurnActionState();
  return battle.turnActions[side];
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

function canUseBoardAction(battle, side) {
  const actions = getTurnActions(battle, side);
  return (actions.nonTacticActionsUsed || 0) < 2 && (actions.boardActions || 0) < 2;
}

function markUnitDeploymentUsed(battle, side) {
  const actions = getTurnActions(battle, side);
  actions.unitDeployments = (actions.unitDeployments || 0) + 1;
  actions.nonTacticActionsUsed = (actions.nonTacticActionsUsed || 0) + 1;
  actions.unitPlayed = actions.unitDeployments > 0;
  actions.handPlayed = actions.unitDeployments > 0;
}

function markTacticActionUsed(battle, side) {
  getTurnActions(battle, side).tacticPlayed = true;
}

function markBoardActionUsed(battle, side) {
  const actions = getTurnActions(battle, side);
  actions.boardActions = (actions.boardActions || 0) + 1;
  actions.nonTacticActionsUsed = (actions.nonTacticActionsUsed || 0) + 1;
  actions.hiddenActivated = actions.boardActions > 0;
}

function markUnitActed(battle, instance) {
  instance.actedAction = battle.actionSerial;
}

function hasUnitActedInActionSequence(battle, instance) {
  return Boolean(
    instance?.actedAction === battle.actionSerial ||
      instance?.calledAction === battle.actionSerial ||
      instance?.assistAction === battle.actionSerial ||
      instance?.interceptAction === battle.actionSerial
  );
}

function canUseActionLikePassive(battle, instance) {
  return Boolean(instance && getCurrentPower(instance) > 0 && !instance.suppressed && !hasUnitActedInActionSequence(battle, instance));
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
