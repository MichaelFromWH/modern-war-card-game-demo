import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyBattleAction,
  createAuthoritativeBattle,
  createBattleSnapshot,
} from "../src/online-battle-engine.js";
import {
  CARD_LIBRARY,
  LINES,
  VICTORY_SCORE,
  getCard,
} from "../src/game-data.js";
import {
  buildOnlineEffectAnimationBattle,
} from "../src/online-animation-state.js";

const SIDES = ["player", "enemy"];
const LINE_IDS = LINES.map((line) => line.id);
const RESULTS = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertAction(result, message) {
  assert(result?.ok, `${message}: ${result?.error || "action failed"}`);
}

function assertBlocked(result, message) {
  assert(!result?.ok, `${message}: expected action to be blocked`);
}

function testCase(id, priority, title, fn) {
  const startedAt = Date.now();
  try {
    const evidence = fn() || "";
    RESULTS.push({
      id,
      priority,
      title,
      result: "Pass",
      evidence: String(evidence),
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    RESULTS.push({
      id,
      priority,
      title,
      result: "Fail",
      evidence: error?.stack || error?.message || String(error),
      durationMs: Date.now() - startedAt,
    });
  }
}

function createBattle(label = "test") {
  const battle = createAuthoritativeBattle({
    roomCode: label.toUpperCase().slice(0, 8),
    match: { id: `match-${label}`, seed: `seed-${label}` },
    players: [
      { id: `${label}-p`, side: "player", name: "美国", loadout: { faction: "usa" } },
      { id: `${label}-e`, side: "enemy", name: "俄罗斯", loadout: { faction: "russia" } },
    ],
  });
  battle.status = "battle";
  battle.activeSide = "player";
  battle.pending = null;
  battle.scores = { player: 0, enemy: 0 };
  battle.hands = { player: [], enemy: [] };
  battle.decks = { player: [], enemy: [] };
  battle.graves = { player: [], enemy: [] };
  battle.board = {
    player: Object.fromEntries(LINE_IDS.map((lineId) => [lineId, []])),
    enemy: Object.fromEntries(LINE_IDS.map((lineId) => [lineId, []])),
  };
  battle.turnActions = {
    player: turnState({ ownBoardEmptyAtStart: true, enemyFrontlineEmptyAtStart: true }),
    enemy: turnState({ ownBoardEmptyAtStart: true, enemyFrontlineEmptyAtStart: true }),
  };
  battle.log = [`测试对局 ${label} 已重置。`];
  battle.actionSerial = 1;
  battle.matchWinner = null;
  battle.supplyExhausted = false;
  return battle;
}

function turnState(overrides = {}) {
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
    ...overrides,
  };
}

function makeInstance(battle, side, cardId, options = {}) {
  return {
    uid: `${side}-reg-${++battle.uidCounter}`,
    cardId,
    damage: options.damage || 0,
    exposed: options.exposed ?? !options.hidden,
    hidden: Boolean(options.hidden),
    shield: Boolean(options.shield),
    fortified: false,
    decoy: false,
    suppressed: Boolean(options.suppressed),
    airspaceControl: false,
    bonus: 0,
    deployedAtAction: options.deployedAtAction ?? null,
    actedAction: options.actedAction ?? null,
    damageDebuff: 0,
    calledAction: null,
    assistAction: null,
    interceptAction: null,
    lastDamagedBy: null,
    flipAnimation: null,
    flipAnimationId: 0,
  };
}

function addHand(battle, side, cardId, options = {}) {
  const instance = makeInstance(battle, side, cardId, options);
  battle.hands[side].push(instance);
  return instance;
}

function addDeck(battle, side, cardIds) {
  cardIds.forEach((cardId) => battle.decks[side].push(makeInstance(battle, side, cardId)));
}

function addBoard(battle, side, lineId, cardId, options = {}) {
  const instance = makeInstance(battle, side, cardId, {
    deployedAtAction: 0,
    exposed: true,
    ...options,
  });
  battle.board[side][lineId].push(instance);
  return { side, lineId, uid: instance.uid, instance };
}

function findBoard(battle, side, uid) {
  for (const lineId of LINE_IDS) {
    const instance = battle.board[side][lineId].find((item) => item.uid === uid);
    if (instance) {
      return { side, lineId, uid, instance };
    }
  }
  return null;
}

function currentHealth(cardId, instance) {
  return (getCard(cardId).health || 1) - (instance.damage || 0);
}

function viewerSide(serverSide, viewerSide) {
  if (serverSide === viewerSide) return "player";
  return "enemy";
}

function choosePendingTarget(battle, side, index = 0) {
  assert(battle.pending, "expected pending target selection");
  const target = battle.pending.targets[index];
  assert(target, `expected pending target at index ${index}`);
  return applyBattleAction(battle, side, {
    kind: "choose_target",
    targetSide: viewerSide(target.side, side),
    targetUid: target.uid,
  });
}

function choosePendingTargets(battle, side, targetRefs = []) {
  assert(battle.pending, "expected pending target selection");
  assert(targetRefs.length, "expected at least one selected target");
  const selectedTargets = targetRefs.map((targetRef) => {
    const target = battle.pending.targets.find((item) => item.uid === targetRef.uid && item.side === targetRef.side);
    assert(target, `expected target ${targetRef.uid} in pending list`);
    return {
      side: viewerSide(target.side, side),
      uid: target.uid,
    };
  });
  return applyBattleAction(battle, side, {
    kind: "choose_target",
    targetSide: selectedTargets[0].side,
    targetUid: selectedTargets[0].uid,
    selectedTargets,
  });
}

function activateAndChoose(battle, side, sourceRef, targetRef = null) {
  const result = applyBattleAction(battle, side, {
    kind: "activate_unit",
    sourceUid: sourceRef.uid,
  });
  if (battle.pending && targetRef) {
    const index = battle.pending.targets.findIndex((item) => item.uid === targetRef.uid && item.side === targetRef.side);
    assert(index >= 0, `expected target ${targetRef.uid} in pending list`);
    return choosePendingTarget(battle, side, index);
  }
  return result;
}

function hasLog(battle, pattern) {
  return battle.log.some((line) => pattern.test(line));
}

testCase("TC-DATA-001", "P0", "V0.5.2 关键卡牌数据口径一致", () => {
  const missileIds = ["us_tomahawk", "us_atacms", "ru_kalibr", "ru_iskander"];
  missileIds.forEach((id) => {
    const card = getCard(id);
    assert(card.ability.requiresAnyTag.includes("无人机"), `${id} must be able to target UAVs`);
    assert(!card.ability.requiresAnyTag.includes("轰炸机"), `${id} must not target high-air bombers`);
  });
  ["us_patriot", "ru_buk_m3"].forEach((id) => {
    const tags = getCard(id).continuous.interceptTags;
    assert(tags.includes("战斗机"), `${id} must intercept fighters`);
    assert(tags.includes("巡航导弹") && tags.includes("弹道导弹"), `${id} must intercept missiles`);
    assert(!tags.includes("轰炸机"), `${id} must not intercept bombers`);
  });
  ["us_f35a_sead", "ru_su57_sead"].forEach((id) => {
    const card = getCard(id);
    assert(!card.tags.includes("SEAD"), `${id} must not keep SEAD tag`);
    assert(!/SEAD|反辐射|隐蔽防空/.test(`${card.name}${card.effect}${card.ruleNote}`), `${id} visible text must not expose old SEAD wording`);
  });
  ["us_smoke_screen", "us_battlefield_repair", "us_reposition", "ru_smoke_decoys", "ru_battlefield_repair", "ru_reposition"].forEach((id) => {
    assert(!getCard(id).effect.includes("战力"), `${id} must use life-repair wording`);
  });
  ["us_marine_rifle", "us_m1a2", "ru_motostrelki", "ru_t90m"].forEach((id) => {
    assert(getCard(id).ability.ownTagBonus?.exposedOnly === true, `${id} own-line bonus must require an exposed unit`);
  });
  ["us_reaper", "ru_orlan10"].forEach((id) => {
    const ability = getCard(id).ability;
    assert(ability.callFireRequiresFreshExpose === false, `${id} should call fire against an already exposed valid target`);
    assert(ability.callerTags.includes("榴弹炮") && ability.callerTags.includes("火箭炮"), `${id} should offer howitzer and rocket artillery call-fire units`);
  });
  return "关键数据字段符合 V0.5.2。";
});

testCase("TC-DATA-002", "P0", "Rocket artillery targeting uses ordered selected targets across rows", () => {
  const himars = getCard("us_himars");
  assert(himars.effect === "选择最多两个目标，对次要目标攻击力为1，若目标为步兵，伤害+1。", "HIMARS visible effect must match the V0.5.2 docx");
  assert(himars.ability.allowSupport === true, "HIMARS must be able to choose support targets directly");
  assert(himars.ability.sameLineOnly !== true, "HIMARS must not be locked to the primary target row");
  assert(himars.ability.maxTargets === 2, "HIMARS must select up to two targets");
  assert(himars.fire.allowSupport === true, "HIMARS callable fire must be able to choose support targets directly");
  assert(himars.fire.sameLineOnly !== true, "HIMARS callable fire must not be locked to the primary target row");
  assert(himars.fire.maxTargets === 2, "HIMARS callable fire must select up to two targets");

  const tornado = getCard("ru_tornado_s");
  assert(tornado.effect === "选择最多三个地面目标造成伤害，对2个次要目标攻击力为1。", "Tornado-S visible effect must match the V0.5.2 docx");
  assert(tornado.ability.allowSupport === true, "Tornado-S must be able to choose support targets directly");
  assert(tornado.ability.sameLineOnly !== true, "Tornado-S must not be locked to the primary target row");
  assert(tornado.ability.maxTargets === 3, "Tornado-S must select up to three targets per the V0.5.2 docx");
  assert(tornado.fire.allowSupport === true, "Tornado-S callable fire must be able to choose support targets directly");
  assert(tornado.fire.sameLineOnly !== true, "Tornado-S callable fire must not be locked to the primary target row");
  assert(tornado.fire.maxTargets === 3, "Tornado-S callable fire must select up to three targets per the V0.5.2 docx");
  return "rocket artillery data allows ordered cross-row multi-target selection.";
});

testCase("TC-DATA-003", "P0", "前线协同伤害只计算暴露单位", () => {
  const hiddenAssist = createBattle("hidden-assist");
  const marineHidden = addBoard(hiddenAssist, "player", "frontline", "us_marine_rifle");
  addBoard(hiddenAssist, "player", "frontline", "us_bradley", { hidden: true, exposed: false });
  const infantryHidden = addBoard(hiddenAssist, "enemy", "frontline", "ru_motostrelki");
  assertAction(activateAndChoose(hiddenAssist, "player", marineHidden, infantryHidden), "marine with hidden armor assist");
  assert(infantryHidden.instance.damage === 3, "hidden armor should not provide the exposed-assist bonus");

  const exposedAssist = createBattle("exposed-assist");
  const marineExposed = addBoard(exposedAssist, "player", "frontline", "us_marine_rifle");
  addBoard(exposedAssist, "player", "frontline", "us_bradley", { exposed: true });
  const infantryExposed = addBoard(exposedAssist, "enemy", "frontline", "ru_motostrelki");
  assertAction(activateAndChoose(exposedAssist, "player", marineExposed, infantryExposed), "marine with exposed armor assist");
  assert(infantryExposed.instance.damage === 4, "exposed armor should provide the assist bonus");
  return "暴露协同伤害结算正常。";
});

testCase("TC-V052-015/016", "P0", "前线隐蔽部署口径：敌前线为空可隐蔽，敌前线有单位必须正面", () => {
  const open = createBattle("front-open");
  const apache = addHand(open, "player", "us_apache");
  assertAction(applyBattleAction(open, "player", { kind: "play_unit", handUid: apache.uid, lineId: "frontline", hidden: true }), "apache hidden deployment with empty enemy frontline");
  const openRef = open.board.player.frontline[0];
  assert(openRef.hidden === true && openRef.exposed === false, "Apache should stay hidden when enemy frontline is empty");

  const contested = createBattle("front-contested");
  addBoard(contested, "enemy", "frontline", "ru_motostrelki", { exposed: true });
  const contestedApache = addHand(contested, "player", "us_apache");
  assertAction(applyBattleAction(contested, "player", { kind: "play_unit", handUid: contestedApache.uid, lineId: "frontline", hidden: true }), "apache deployment into contested frontline");
  const contestedRef = contested.board.player.frontline[0];
  assert(contestedRef.hidden === false && contestedRef.exposed === true, "Apache must be face-up/exposed when enemy frontline is occupied");
  assert(!hasLog(contested, /低空前线支援|保持隐蔽/), "old helicopter exception log must not appear");
  return "直升机旧例外已取消。";
});

testCase("TC-V052-015A", "P0", "Infiltration units can deploy hidden into a contested frontline", () => {
  const infiltrate = createBattle("infiltrate-hidden");
  addBoard(infiltrate, "enemy", "frontline", "ru_motostrelki", { exposed: true });
  const ranger = addHand(infiltrate, "player", "us_rangers_target");
  assertAction(applyBattleAction(infiltrate, "player", { kind: "play_unit", handUid: ranger.uid, lineId: "frontline", hidden: true }), "ranger hidden deployment into contested frontline");
  const rangerRef = findBoard(infiltrate, "player", ranger.uid);
  assert(rangerRef?.instance.hidden === true && rangerRef.instance.exposed === false, "infiltration unit should stay hidden despite enemy frontline contact");

  const normal = createBattle("normal-contested");
  addBoard(normal, "enemy", "frontline", "ru_motostrelki", { exposed: true });
  const marine = addHand(normal, "player", "us_marine_rifle");
  assertAction(applyBattleAction(normal, "player", { kind: "play_unit", handUid: marine.uid, lineId: "frontline", hidden: true }), "normal infantry deployment into contested frontline");
  const marineRef = findBoard(normal, "player", marine.uid);
  assert(marineRef?.instance.hidden === false && marineRef.instance.exposed === true, "normal frontline unit should still be forced face-up");
  return "infiltration concealment exception is limited to contactException units.";
});

testCase("TC-V052-005/006", "P0", "前线 7 张与支援 6 张容量上限", () => {
  const front = createBattle("capacity-front");
  front.turnActions.player.ownBoardEmptyAtStart = true;
  for (let i = 0; i < 7; i += 1) addBoard(front, "player", "frontline", "us_marine_rifle");
  const extraFront = addHand(front, "player", "us_marine_rifle");
  assertBlocked(applyBattleAction(front, "player", { kind: "play_unit", handUid: extraFront.uid, lineId: "frontline" }), "frontline eighth card");

  const support = createBattle("capacity-support");
  support.turnActions.player.ownBoardEmptyAtStart = true;
  for (let i = 0; i < 6; i += 1) addBoard(support, "player", "support", "us_reaper");
  const extraSupport = addHand(support, "player", "us_reaper");
  assertBlocked(applyBattleAction(support, "player", { kind: "play_unit", handUid: extraSupport.uid, lineId: "support" }), "support seventh card");
  return "战线容量限制生效。";
});

testCase("TC-V052-008/057", "P0", "线上快照不泄露敌方隐蔽单位信息", () => {
  const battle = createBattle("hidden-info");
  const hidden = addBoard(battle, "player", "frontline", "us_stinger_team", { hidden: true, exposed: false });
  const enemyView = createBattleSnapshot(battle, "enemy");
  const masked = enemyView.battle.board.enemy.frontline.find((item) => item.uid === hidden.uid);
  assert(masked?.masked === true, "opponent snapshot should mask hidden unit");
  assert(masked.cardId !== "us_stinger_team", "opponent snapshot must not reveal real card id");
  assert(enemyView.battle.hands.enemy.every((item) => item.masked), "opponent should only see hidden hand pile");
  return "敌方视角隐蔽信息已遮蔽。";
});

testCase("TC-V052-012/014", "P0", "前线遮蔽与隐蔽支援区目标保护", () => {
  const battle = createBattle("screening");
  const m1 = addBoard(battle, "player", "frontline", "us_m1a2");
  const enemyFront = addBoard(battle, "enemy", "frontline", "ru_motostrelki");
  const enemySupport = addBoard(battle, "enemy", "support", "ru_2s19");
  const supportDamageBefore = enemySupport.instance.damage || 0;
  assertAction(applyBattleAction(battle, "player", { kind: "activate_unit", sourceUid: m1.uid }), "M1 activation");
  if (battle.pending) {
    assert(battle.pending.targets.some((target) => target.uid === enemyFront.uid), "enemy frontline target should be legal");
    assert(!battle.pending.targets.some((target) => target.uid === enemySupport.uid), "support target should be screened by enemy frontline");
    assertAction(choosePendingTarget(battle, "player", battle.pending.targets.findIndex((target) => target.uid === enemyFront.uid)), "choose screened frontline target");
  }
  assert(enemySupport.instance.damage === supportDamageBefore, "support target should not be damaged while enemy frontline screens it");
  assert(enemyFront.instance.damage > 0 || battle.graves.enemy.some((item) => item.uid === enemyFront.uid), "frontline target should absorb the direct attack");

  const hiddenSupport = createBattle("hidden-support");
  const fighter = addBoard(hiddenSupport, "player", "support", "us_f35");
  addBoard(hiddenSupport, "enemy", "support", "ru_buk_m3", { hidden: true, exposed: false });
  assertBlocked(applyBattleAction(hiddenSupport, "player", { kind: "activate_unit", sourceUid: fighter.uid }), "hidden support target without reveal");
  return "前线遮蔽和隐蔽目标保护正常。";
});

testCase("TC-V052-023/026/027", "P0", "前线突破前提、新部署限制与每回合一次限制", () => {
  const battle = createBattle("breakthrough");
  battle.turnActions.player.enemyFrontlineEmptyAtStart = true;
  battle.turnActions.player.ownBoardEmptyAtStart = false;
  const bradley = addBoard(battle, "player", "frontline", "us_bradley", { deployedAtAction: 0 });
  const hiddenSupport = addBoard(battle, "enemy", "support", "ru_2s19", { hidden: true, exposed: false });
  assertAction(activateAndChoose(battle, "player", bradley, hiddenSupport), "breakthrough to hidden support");
  assert(hiddenSupport.instance.hidden === false, "breakthrough should expose hidden support target");
  assert(battle.turnActions.player.breakthroughUsed === true, "breakthrough should consume once-per-turn flag");

  const second = addBoard(battle, "player", "frontline", "us_m1a2", { deployedAtAction: 0 });
  assertBlocked(applyBattleAction(battle, "player", { kind: "activate_unit", sourceUid: second.uid }), "second breakthrough/action after limit");

  const fresh = createBattle("breakthrough-fresh");
  fresh.turnActions.player.enemyFrontlineEmptyAtStart = true;
  const newUnit = addBoard(fresh, "player", "frontline", "us_bradley", { deployedAtAction: fresh.actionSerial });
  addBoard(fresh, "enemy", "support", "ru_2s19", { hidden: true, exposed: false });
  assertBlocked(applyBattleAction(fresh, "player", { kind: "activate_unit", sourceUid: newUnit.uid }), "newly deployed breakthrough source");
  return "突破门槛、次数和新部署限制正常。";
});

testCase("TC-V052-028/029/030/031", "P0", "回合行动经济、部署限制与单位每回合一次行动", () => {
  const nonEmpty = createBattle("deploy-limit");
  nonEmpty.turnActions.player.ownBoardEmptyAtStart = false;
  addBoard(nonEmpty, "player", "frontline", "us_marine_rifle");
  const first = addHand(nonEmpty, "player", "us_stinger_team");
  const second = addHand(nonEmpty, "player", "us_bradley");
  assertAction(applyBattleAction(nonEmpty, "player", { kind: "play_unit", handUid: first.uid, lineId: "frontline", hidden: true }), "first normal deployment");
  assertBlocked(applyBattleAction(nonEmpty, "player", { kind: "play_unit", handUid: second.uid, lineId: "frontline", hidden: true }), "second normal deployment");

  const empty = createBattle("empty-double-deploy");
  const a = addHand(empty, "player", "us_stinger_team");
  const b = addHand(empty, "player", "us_avenger");
  const c = addHand(empty, "player", "us_reaper");
  assertAction(applyBattleAction(empty, "player", { kind: "play_unit", handUid: a.uid, lineId: "frontline", hidden: true }), "empty board first deployment");
  assertAction(applyBattleAction(empty, "player", { kind: "play_unit", handUid: b.uid, lineId: "support", hidden: true }), "empty board second deployment");
  assertBlocked(applyBattleAction(empty, "player", { kind: "play_unit", handUid: c.uid, lineId: "support", hidden: true }), "empty board third non-tactic action");

  const once = createBattle("once-per-unit");
  const fighter = addBoard(once, "player", "support", "us_f35");
  addBoard(once, "enemy", "frontline", "ru_motostrelki");
  assertAction(activateAndChoose(once, "player", fighter), "fighter first activation");
  assertBlocked(applyBattleAction(once, "player", { kind: "activate_unit", sourceUid: fighter.uid }), "fighter second activation same turn");
  return "行动经济核心约束正常。";
});

testCase("TC-V052-032/006", "P0", "多目标必须打开选择窗口并可交互完成", () => {
  const battle = createBattle("multi-target");
  const fighter = addBoard(battle, "player", "support", "us_f35");
  const t1 = addBoard(battle, "enemy", "frontline", "ru_motostrelki");
  const t2 = addBoard(battle, "enemy", "frontline", "ru_kornet_team");
  assertAction(applyBattleAction(battle, "player", { kind: "activate_unit", sourceUid: fighter.uid }), "fighter multi-target activation");
  assert(battle.pending?.targets?.length === 2, "expected exactly two legal targets");
  assertAction(choosePendingTarget(battle, "player", 1), "choosing second target");
  assert(t2.instance.damage > 0, "chosen target should receive damage");
  assert(t1.instance.damage === 0, "unchosen target should not receive damage");
  return "选择窗口可完成，并非默认打第一个目标。";
});

testCase("TC-V052-033", "P0", "补给抽 3 选 1 且线上对手不可见候选", () => {
  const battle = createBattle("supply");
  const supply = addHand(battle, "player", "us_emergency_supply");
  addDeck(battle, "player", ["us_m1a2", "us_f35", "us_b2", "us_reaper"]);
  assertAction(applyBattleAction(battle, "player", { kind: "play_tactic", handUid: supply.uid }), "play supply");
  assert(battle.pending?.kind === "supplyChoice", "supply should create choice pending");
  assert(battle.pending.drawn.length === 3, "supply should reveal three candidates to acting side");
  const enemyView = createBattleSnapshot(battle, "enemy");
  assert(enemyView.pending === null, "opponent snapshot must not include supply candidates");
  assertAction(applyBattleAction(battle, "player", { kind: "choose_supply", selectedUids: [battle.pending.drawn[1].uid] }), "choose supply card");
  assert(battle.hands.player.length === 1, "acting player keeps exactly one supply card");
  assert(battle.decks.player.length === 3, "two returned candidates plus untouched deck remain");
  return "补给隐私与选择流程通过。";
});

testCase("TC-V052-034/035/036", "P1", "维修、烟幕、阵地转移修复生命且不超过上限", () => {
  const repair = createBattle("repair");
  const damaged = addBoard(repair, "player", "frontline", "us_m1a2", { damage: 3 });
  const card = addHand(repair, "player", "us_battlefield_repair");
  assert(getCard("us_battlefield_repair").ability.full === true, "battlefield repair should be marked as full repair");
  assert(getCard("ru_battlefield_repair").ability.full === true, "russian battlefield repair should be marked as full repair");
  assertAction(applyBattleAction(repair, "player", { kind: "play_tactic", handUid: card.uid }), "play repair");
  assertAction(choosePendingTarget(repair, "player", 0), "choose damaged unit");
  assert(damaged.instance.damage === 0, "battlefield repair should restore the target to full life");

  const smoke = createBattle("smoke");
  const front = addBoard(smoke, "player", "frontline", "us_marine_rifle", { damage: 1, exposed: true });
  const smokeCard = addHand(smoke, "player", "us_smoke_screen");
  assertAction(applyBattleAction(smoke, "player", { kind: "play_tactic", handUid: smokeCard.uid }), "play smoke");
  assertAction(choosePendingTarget(smoke, "player", 0), "choose frontline for smoke");
  assert(front.instance.hidden === true && front.instance.damage === 0, "frontline smoke should hide and repair one life");

  const reposition = createBattle("reposition");
  const support = addBoard(reposition, "player", "support", "us_m109", { damage: 1, exposed: true });
  const repositionCard = addHand(reposition, "player", "us_reposition");
  assertAction(applyBattleAction(reposition, "player", { kind: "play_tactic", handUid: repositionCard.uid }), "play reposition");
  assertAction(choosePendingTarget(reposition, "player", 0), "choose support for reposition");
  assert(support.instance.hidden === true && support.instance.damage === 0, "support reposition should hide and repair one life");
  return "维修类效果按生命修复。";
});

testCase("TC-V052-037", "P0", "电子压制持续到目标下一回合并禁止行动型被动", () => {
  const battle = createBattle("suppression");
  const target = addBoard(battle, "enemy", "support", "ru_tornado_s");
  const suppress = addHand(battle, "player", "us_electronic_suppression");
  assertAction(applyBattleAction(battle, "player", { kind: "play_tactic", handUid: suppress.uid }), "play electronic suppression");
  assertAction(choosePendingTarget(battle, "player", 0), "choose suppression target");
  assert(target.instance.suppressed === true, "target should be suppressed");
  assertAction(applyBattleAction(battle, "player", { kind: "pass_turn" }), "pass to enemy");
  assertBlocked(applyBattleAction(battle, "enemy", { kind: "activate_unit", sourceUid: target.uid }), "suppressed target activation");

  const intercept = createBattle("suppressed-intercept");
  const buk = addBoard(intercept, "enemy", "support", "ru_buk_m3", { suppressed: true });
  const missile = addBoard(intercept, "player", "support", "us_atacms");
  const missileTarget = addBoard(intercept, "enemy", "frontline", "ru_motostrelki");
  assertAction(activateAndChoose(intercept, "player", missile, missileTarget), "suppressed Buk should not intercept");
  assert(missileTarget.instance.damage > 0, "suppressed air defense should not cancel missile damage");
  assert(buk.instance.interceptAction !== intercept.actionSerial, "suppressed air defense must not spend intercept action");

  const recon = createBattle("suppressed-call-fire");
  const scout = addBoard(recon, "player", "frontline", "us_rangers_target");
  const artillery = addBoard(recon, "player", "support", "us_m109", { suppressed: true });
  addDeck(recon, "player", ["us_m1a2"]);
  const hiddenTarget = addBoard(recon, "enemy", "frontline", "ru_motostrelki", { hidden: true, exposed: false });
  assertAction(activateAndChoose(recon, "player", scout, hiddenTarget), "suppressed artillery should not be called");
  assert(recon.hands.player.length === 1, "suppressed callable unit should trigger recon draw fallback");
  assert(artillery.instance.actedAction !== recon.actionSerial, "suppressed artillery must not act through call fire");
  return "电子压制阻止主动行动、拦截和侦察校射。";
});

testCase("TC-V052-038/039/040", "P0", "侦察暴露并调用未行动远火；无可调用远火时抽牌", () => {
  const call = createBattle("recon-call");
  const scout = addBoard(call, "player", "frontline", "us_rangers_target");
  addBoard(call, "player", "support", "us_m109");
  const hiddenTarget = addBoard(call, "enemy", "frontline", "ru_motostrelki", { hidden: true, exposed: false });
  assertAction(activateAndChoose(call, "player", scout, hiddenTarget), "recon with callable artillery");
  assert(hiddenTarget.instance.hidden === false, "recon should expose hidden target");
  assert(hiddenTarget.instance.damage > 0, "callable artillery should damage target");

  const choice = createBattle("uav-call-choice");
  const reaper = addBoard(choice, "player", "support", "us_reaper");
  const howitzer = addBoard(choice, "player", "support", "us_m109");
  const rocket = addBoard(choice, "player", "support", "us_himars");
  const exposedTarget = addBoard(choice, "enemy", "frontline", "ru_t90m");
  assertAction(applyBattleAction(choice, "player", { kind: "activate_unit", sourceUid: reaper.uid }), "Reaper should open call-fire choice");
  assert(choice.pending?.kind === "callFireChoice", "multiple callable fire units should open a call-fire choice");
  assert(choice.pending.targets.length === 2, "howitzer and rocket artillery should both be offered");
  const rocketChoiceIndex = choice.pending.targets.findIndex((target) => target.uid === rocket.uid);
  assert(rocketChoiceIndex >= 0, "HIMARS should be available as the selected call-fire unit");
  assertAction(choosePendingTarget(choice, "player", rocketChoiceIndex), "choose HIMARS for Reaper call-fire");
  assert(exposedTarget.instance.damage === 3, "Reaper-selected HIMARS should apply primary rocket damage to the marked target");
  assert(rocket.instance.actedAction === choice.actionSerial, "chosen rocket artillery should spend its action");
  assert(howitzer.instance.actedAction !== choice.actionSerial, "unchosen howitzer should remain unused");

  const fallback = createBattle("recon-fallback");
  const fallbackScout = addBoard(fallback, "player", "frontline", "us_rangers_target");
  addDeck(fallback, "player", ["us_m1a2"]);
  const highTarget = addBoard(fallback, "enemy", "support", "ru_su35");
  assertAction(activateAndChoose(fallback, "player", fallbackScout, highTarget), "recon high target fallback");
  assert(fallback.hands.player.length === 1, "recon against unsuitable target should draw one card");

  const acted = createBattle("recon-acted-fire");
  const actedScout = addBoard(acted, "player", "frontline", "us_rangers_target");
  addBoard(acted, "player", "support", "us_m109", { actedAction: acted.actionSerial });
  addDeck(acted, "player", ["us_m1a2"]);
  const actedTarget = addBoard(acted, "enemy", "frontline", "ru_motostrelki", { hidden: true, exposed: false });
  assertAction(activateAndChoose(acted, "player", actedScout, actedTarget), "recon with already acted artillery");
  assert(acted.hands.player.length === 1, "already acted artillery should not be called and should trigger draw fallback");
  return "侦察链符合 V0.5.2。";
});

testCase("TC-V052-041/042", "P0", "榴弹炮/火箭炮可打地面和低空，不能打高空", () => {
  const arty = createBattle("artillery");
  const m109 = addBoard(arty, "player", "support", "us_m109");
  const low = addBoard(arty, "enemy", "support", "ru_orlan10");
  assertAction(activateAndChoose(arty, "player", m109, low), "M109 low-air target");
  assert(low.instance.damage > 0, "M109 should hit low-air target");

  const highOnly = createBattle("artillery-high");
  const m109b = addBoard(highOnly, "player", "support", "us_m109");
  addBoard(highOnly, "enemy", "support", "ru_su35");
  assertBlocked(applyBattleAction(highOnly, "player", { kind: "activate_unit", sourceUid: m109b.uid }), "M109 high-air target");

  const rocket = createBattle("rocket");
  const himars = addBoard(rocket, "player", "support", "us_himars");
  const frontSecondary = addBoard(rocket, "enemy", "frontline", "ru_motostrelki");
  const supportPrimary = addBoard(rocket, "enemy", "support", "ru_tornado_s");
  const supportSecondary = addBoard(rocket, "enemy", "support", "ru_2s19");
  assertAction(applyBattleAction(rocket, "player", { kind: "activate_unit", sourceUid: himars.uid }), "HIMARS activation");
  assert(rocket.pending?.targets?.some((target) => target.uid === supportPrimary.uid), "HIMARS should present support targets even while frontline is occupied");
  assertAction(choosePendingTargets(rocket, "player", [supportPrimary, frontSecondary]), "choose HIMARS support primary and frontline secondary");
  assert(supportPrimary.instance.damage === 3, "HIMARS should apply primary damage to the chosen support target");
  assert(frontSecondary.instance.damage === 2, "HIMARS should apply infantry secondary damage to the explicitly selected frontline target");
  assert(supportSecondary.instance.damage === 0, "HIMARS should not auto-splash an unselected support target");
  return "远火目标范围和多目标数量正常。";
});

testCase("TC-V052-043/044/045", "P0", "导弹可打无人机/直升机，不能打高空，前线 +1 且导弹可被摧毁得分", () => {
  const cruise = createBattle("missile-uav");
  const tomahawk = addBoard(cruise, "player", "support", "us_tomahawk");
  const uav = addBoard(cruise, "enemy", "support", "ru_orlan10");
  assertAction(activateAndChoose(cruise, "player", tomahawk, uav), "Tomahawk UAV target");
  assert(uav.instance.damage > 0, "cruise missile should hit UAV");

  const high = createBattle("missile-high");
  const tomahawkHigh = addBoard(high, "player", "support", "us_tomahawk");
  addBoard(high, "enemy", "support", "ru_su35");
  assertBlocked(applyBattleAction(high, "player", { kind: "activate_unit", sourceUid: tomahawkHigh.uid }), "Tomahawk high-air target");

  const frontline = createBattle("missile-frontline");
  const atacms = addBoard(frontline, "player", "support", "us_atacms");
  const frontTarget = addBoard(frontline, "enemy", "frontline", "ru_bmp3m");
  assertAction(activateAndChoose(frontline, "player", atacms, frontTarget), "ATACMS frontline target");
  assert(frontTarget.instance.damage === 6, "ballistic missile should receive +1 against frontline");

  const score = createBattle("missile-score");
  const shooter = addBoard(score, "player", "support", "us_f35a_sead");
  const enemyMissile = addBoard(score, "enemy", "support", "ru_kalibr", { damage: 2 });
  assertAction(activateAndChoose(score, "player", shooter, enemyMissile), "destroy enemy missile");
  assert(score.graves.enemy.some((item) => item.uid === enemyMissile.uid), "destroyed missile should enter grave");
  assert(score.scores.player === getCard("ru_kalibr").targetValue, "destroyed missile should score target value");
  return "导弹口径通过。";
});

testCase("TC-V052-046/047/048/049", "P0", "防空主动打击与拦截口径", () => {
  const avenger = createBattle("avenger-active");
  const avengerRef = addBoard(avenger, "player", "support", "us_avenger");
  const low = addBoard(avenger, "enemy", "support", "ru_orlan10");
  assertAction(activateAndChoose(avenger, "player", avengerRef, low), "Avenger low-air active attack");
  assert(low.instance.damage > 0, "Avenger should hit low-air target");

  const patriotLow = createBattle("patriot-low");
  const patriot = addBoard(patriotLow, "player", "support", "us_patriot");
  addBoard(patriotLow, "enemy", "support", "ru_orlan10");
  assertBlocked(applyBattleAction(patriotLow, "player", { kind: "activate_unit", sourceUid: patriot.uid }), "Patriot low-air active attack");

  const patriotHigh = createBattle("patriot-high");
  const patriot2 = addBoard(patriotHigh, "player", "support", "us_patriot");
  const high = addBoard(patriotHigh, "enemy", "support", "ru_su35");
  assertAction(activateAndChoose(patriotHigh, "player", patriot2, high), "Patriot high-air active attack");
  assert(high.instance.damage > 0, "Patriot should hit high-air target");

  const cruiseIntercept = createBattle("cruise-intercept");
  addBoard(cruiseIntercept, "enemy", "support", "ru_pantsir", { hidden: true, exposed: false });
  const cruiseSource = addBoard(cruiseIntercept, "player", "support", "us_tomahawk");
  const cruiseTarget = addBoard(cruiseIntercept, "enemy", "frontline", "ru_motostrelki");
  assertAction(activateAndChoose(cruiseIntercept, "player", cruiseSource, cruiseTarget), "cruise intercepted by accompanying air defense");
  assert(cruiseTarget.instance.damage === 0, "cruise damage should be cancelled by accompanying air defense");
  assert(cruiseIntercept.board.enemy.support[0].hidden === false, "hidden air defense should expose after interception");

  const ballisticNoAvenger = createBattle("ballistic-no-avenger");
  addBoard(ballisticNoAvenger, "enemy", "support", "ru_pantsir");
  const ballistic = addBoard(ballisticNoAvenger, "player", "support", "us_atacms");
  const ballisticTarget = addBoard(ballisticNoAvenger, "enemy", "frontline", "ru_motostrelki");
  assertAction(activateAndChoose(ballisticNoAvenger, "player", ballistic, ballisticTarget), "ballistic not intercepted by accompanying air defense");
  assert(ballisticTarget.instance.damage > 0, "ballistic should not be intercepted by accompanying air defense");

  const fighterIntercept = createBattle("fighter-intercept");
  const buk = addBoard(fighterIntercept, "enemy", "support", "ru_buk_m3");
  const fighter = addBoard(fighterIntercept, "player", "support", "us_f35");
  const fighterTarget = addBoard(fighterIntercept, "enemy", "frontline", "ru_motostrelki");
  assertAction(activateAndChoose(fighterIntercept, "player", fighter, fighterTarget), "fighter intercepted by heavy air defense");
  assert(fighterTarget.instance.damage === 0 && buk.instance.interceptAction === fighterIntercept.actionSerial, "heavy air defense should cancel fighter damage");

  const multipleInterceptors = createBattle("multi-interceptor");
  const pantsir = addBoard(multipleInterceptors, "enemy", "support", "ru_pantsir");
  const bukChoice = addBoard(multipleInterceptors, "enemy", "support", "ru_buk_m3");
  const choiceMissile = addBoard(multipleInterceptors, "player", "support", "us_tomahawk");
  const choiceTarget = addBoard(multipleInterceptors, "enemy", "frontline", "ru_motostrelki");
  assertAction(activateAndChoose(multipleInterceptors, "player", choiceMissile, choiceTarget), "Tomahawk target selection before interception");
  assert(multipleInterceptors.pending?.kind === "interceptChoice", "multiple legal interceptors should open intercept choice");
  assert(multipleInterceptors.pending.side === "enemy", "intercept choice should be assigned to defender");
  assert(multipleInterceptors.pending.targets.length === 2, "both Pantsir and Buk should be offered");
  const bukIndex = multipleInterceptors.pending.targets.findIndex((item) => item.uid === bukChoice.uid);
  assert(bukIndex >= 0, "Buk should be available as interceptor");
  assertAction(choosePendingTarget(multipleInterceptors, "enemy", bukIndex), "choose Buk interceptor");
  assert(choiceTarget.instance.damage === 0, "chosen interceptor should cancel missile damage");
  assert(bukChoice.instance.interceptAction === multipleInterceptors.actionSerial, "chosen interceptor should spend intercept action");
  assert(pantsir.instance.interceptAction !== multipleInterceptors.actionSerial, "unchosen interceptor should remain unused");

  const priorAction = createBattle("prior-action-intercept");
  const priorBuk = addBoard(priorAction, "enemy", "support", "ru_buk_m3", { actedAction: 1 });
  priorAction.actionSerial = 2;
  const priorMissile = addBoard(priorAction, "player", "support", "us_atacms");
  const priorTarget = addBoard(priorAction, "enemy", "frontline", "ru_motostrelki");
  assertAction(activateAndChoose(priorAction, "player", priorMissile, priorTarget), "Buk acted in previous action sequence can intercept");
  assert(priorTarget.instance.damage === 0 && priorBuk.instance.interceptAction === priorAction.actionSerial, "previous sequence action should not block new sequence intercept");

  const sameAction = createBattle("same-action-no-intercept");
  const actedBuk = addBoard(sameAction, "enemy", "support", "ru_buk_m3", { actedAction: sameAction.actionSerial });
  const sameMissile = addBoard(sameAction, "player", "support", "us_atacms");
  const sameTarget = addBoard(sameAction, "enemy", "frontline", "ru_motostrelki");
  assertAction(activateAndChoose(sameAction, "player", sameMissile, sameTarget), "Buk acted in same action sequence should not intercept");
  assert(sameTarget.instance.damage > 0, "same sequence action should block passive intercept");
  assert(actedBuk.instance.interceptAction !== sameAction.actionSerial, "same sequence acted Buk must not intercept");

  const bomberNoIntercept = createBattle("bomber-no-intercept");
  const heavy = addBoard(bomberNoIntercept, "enemy", "support", "ru_buk_m3");
  const bomber = addBoard(bomberNoIntercept, "player", "support", "us_b2");
  const bomberTarget = addBoard(bomberNoIntercept, "enemy", "frontline", "ru_motostrelki");
  assertAction(activateAndChoose(bomberNoIntercept, "player", bomber, bomberTarget), "bomber should not be intercepted by heavy air defense");
  assert(bomberTarget.instance.damage > 0, "bomber should deal damage through heavy air defense");
  assert(heavy.instance.interceptAction !== bomberNoIntercept.actionSerial, "heavy air defense must not spend intercept on bomber");
  return "防空主动/拦截核心口径通过。";
});

testCase("TC-V052-050/051/052", "P0", "战斗机、F-35A/Su-57 取消 SEAD、轰炸机双目标", () => {
  const fighter = createBattle("fighter-damage");
  const f22 = addBoard(fighter, "player", "support", "us_f35");
  const low = addBoard(fighter, "enemy", "support", "ru_orlan10");
  assertAction(activateAndChoose(fighter, "player", f22, low), "F-22 low-air attack");
  assert(low.instance.damage === 4, "F-22 should deal 4 to low/high air targets");

  const f35 = createBattle("f35-no-sead");
  const f35a = addBoard(f35, "player", "support", "us_f35a_sead");
  addBoard(f35, "enemy", "support", "ru_buk_m3", { hidden: true, exposed: false });
  assertBlocked(applyBattleAction(f35, "player", { kind: "activate_unit", sourceUid: f35a.uid }), "F-35A hidden air-defense SEAD lock");

  const f35Ground = createBattle("f35-ground");
  const f35a2 = addBoard(f35Ground, "player", "support", "us_f35a_sead");
  const ground = addBoard(f35Ground, "enemy", "frontline", "ru_motostrelki");
  assertAction(activateAndChoose(f35Ground, "player", f35a2, ground), "F-35A ground attack");
  assert(ground.instance.damage === 4, "F-35A should deal 4 to ground targets");

  const bomber = createBattle("bomber-two-targets");
  const b2 = addBoard(bomber, "player", "support", "us_b2");
  const supportPrimary = addBoard(bomber, "enemy", "support", "ru_buk_m3");
  const frontSecondary = addBoard(bomber, "enemy", "frontline", "ru_t90m");
  const unselectedFront = addBoard(bomber, "enemy", "frontline", "ru_bmpt");
  assertAction(applyBattleAction(bomber, "player", { kind: "activate_unit", sourceUid: b2.uid }), "B-2 activation");
  assertAction(choosePendingTargets(bomber, "player", [supportPrimary, frontSecondary]), "B-2 choose support primary and frontline secondary");
  assert(supportPrimary.instance.damage === 5, "B-2 should apply primary damage to the first selected support target");
  assert(frontSecondary.instance.damage === 3, "B-2 should apply secondary damage to the second selected frontline target");
  assert(unselectedFront.instance.damage === 0, "B-2 should not auto-pick an unselected target");
  return "航空兵口径通过。";
});

testCase("TC-V052-052A", "P0", "Smoke shield clears on hit but does not reduce documented damage", () => {
  const f35Shield = createBattle("f35-shield");
  const f35a = addBoard(f35Shield, "player", "support", "us_f35a_sead");
  const infantry = addBoard(f35Shield, "enemy", "frontline", "ru_motostrelki", { shield: true, exposed: true });
  assertAction(activateAndChoose(f35Shield, "player", f35a, infantry), "F-35A attacks shielded infantry");
  assert(infantry.instance.damage === 4, "F-35A should still deal 4 damage to a shielded ground unit");
  assert(infantry.instance.shield === false, "shield should be cleared by the hit");

  const himarsShield = createBattle("himars-shield");
  const himars = addBoard(himarsShield, "player", "support", "us_himars");
  const patriot = addBoard(himarsShield, "enemy", "support", "ru_buk_m3", { shield: true, exposed: true });
  assertAction(activateAndChoose(himarsShield, "player", himars, patriot), "HIMARS attacks shielded heavy AD");
  assert(patriot.instance.damage === 3, "HIMARS should still deal 3 primary damage to a shielded heavy AD");
  assert(patriot.instance.shield === false, "shield should be cleared by rocket damage");
  return "shield no longer subtracts one point from documented damage.";
});

testCase("TC-V052-015B", "P0", "Hidden infiltration deploy reveals enemy frontline non-infiltration units without exposing itself", () => {
  const battle = createBattle("infiltration-front-reveal");
  const hiddenEnemy = addBoard(battle, "enemy", "frontline", "ru_motostrelki", { hidden: true, exposed: false });
  const enemyScout = addBoard(battle, "enemy", "frontline", "ru_spetsnaz_target", { hidden: true, exposed: false });
  const ranger = addHand(battle, "player", "us_rangers_target");
  assertAction(applyBattleAction(battle, "player", { kind: "play_unit", handUid: ranger.uid, lineId: "frontline", hidden: true }), "hidden Ranger deploys into contested frontline");
  const rangerRef = findBoard(battle, "player", ranger.uid);
  assert(rangerRef?.instance.hidden === true && rangerRef.instance.exposed === false, "infiltration unit should remain hidden");
  assert(hiddenEnemy.instance.hidden === false && hiddenEnemy.instance.exposed === true, "enemy non-infiltration frontline unit should be forced exposed");
  assert(enemyScout.instance.hidden === true && enemyScout.instance.exposed === false, "enemy infiltration unit should not be forced exposed");
  assert(battle.effects.some((effect) => effect.type === "expose" && effect.targetUid === hiddenEnemy.uid), "forced reveal should emit an expose effect");
  return "infiltration frontline reveal is asymmetric and preserves infiltrator concealment.";
});

testCase("TC-V052-023A", "P0", "Frontline breakthrough is an explicit expose-first support-zone action", () => {
  const exposeOnly = createBattle("breakthrough-explicit-expose");
  exposeOnly.turnActions.player.enemyFrontlineEmptyAtStart = true;
  exposeOnly.turnActions.player.ownBoardEmptyAtStart = false;
  const bradley = addBoard(exposeOnly, "player", "frontline", "us_bradley", { deployedAtAction: 0 });
  const hiddenFighter = addBoard(exposeOnly, "enemy", "support", "ru_su35", { hidden: true, exposed: false });
  assertAction(applyBattleAction(exposeOnly, "player", {
    kind: "frontline_breakthrough",
    sourceUid: bradley.uid,
    targetSide: "enemy",
    targetUid: hiddenFighter.uid,
  }), "Bradley breakthrough exposes an unsupported high-air target");
  assert(hiddenFighter.instance.hidden === false && hiddenFighter.instance.exposed === true, "breakthrough should reveal the support target");
  assert(hiddenFighter.instance.damage === 0, "Bradley should not damage a target its normal ability cannot legally hit");
  assert(exposeOnly.turnActions.player.breakthroughUsed === true, "explicit breakthrough should consume the once-per-turn flag");

  const damageCase = createBattle("breakthrough-explicit-damage");
  damageCase.turnActions.player.enemyFrontlineEmptyAtStart = true;
  damageCase.turnActions.player.ownBoardEmptyAtStart = false;
  const tank = addBoard(damageCase, "player", "frontline", "us_m1a2", { deployedAtAction: 0 });
  const hiddenArmor = addBoard(damageCase, "enemy", "support", "ru_bmpt", { hidden: true, exposed: false });
  assertAction(applyBattleAction(damageCase, "player", {
    kind: "frontline_breakthrough",
    sourceUid: tank.uid,
    targetSide: "enemy",
    targetUid: hiddenArmor.uid,
  }), "M1A2 breakthrough exposes and damages a support armor target");
  assert(hiddenArmor.instance.hidden === false && hiddenArmor.instance.damage === 5, "legal breakthrough strike should use the source ability damage");
  return "explicit breakthrough separates reveal-only and reveal-plus-damage cases.";
});

testCase("TC-V052-023B", "P0", "Frontline breakthrough treats support artillery, air defense, and ballistic missile cards as ground platforms", () => {
  const groundPlatformIds = ["ru_2s19", "ru_tornado_s", "ru_pantsir", "ru_buk_m3", "ru_iskander"];
  groundPlatformIds.forEach((targetCardId) => {
    const battle = createBattle(`breakthrough-ground-platform-${targetCardId}`);
    battle.turnActions.player.enemyFrontlineEmptyAtStart = true;
    battle.turnActions.player.ownBoardEmptyAtStart = false;
    const tank = addBoard(battle, "player", "frontline", "us_m1a2", { deployedAtAction: 0 });
    const target = addBoard(battle, "enemy", "support", targetCardId, { hidden: true, exposed: false });
    assertAction(applyBattleAction(battle, "player", {
      kind: "frontline_breakthrough",
      sourceUid: tank.uid,
      targetSide: "enemy",
      targetUid: target.uid,
    }), `M1A2 breakthrough damages ${targetCardId} as a ground platform`);
    assert(target.instance.hidden === false && target.instance.exposed === true, `${targetCardId} should be exposed by breakthrough`);
    assert(target.instance.damage >= 4, `${targetCardId} should take ground-platform breakthrough damage`);
  });
  return "frontline breakthrough can damage support-zone ground platforms, including vehicle-mounted ballistic missiles.";
});

testCase("TC-V052-023C", "P0", "Frontline breakthrough does not treat cruise missiles as ground platforms", () => {
  const battle = createBattle("breakthrough-cruise-missile-expose-only");
  battle.turnActions.player.enemyFrontlineEmptyAtStart = true;
  battle.turnActions.player.ownBoardEmptyAtStart = false;
  const tank = addBoard(battle, "player", "frontline", "us_m1a2", { deployedAtAction: 0 });
  const cruiseMissile = addBoard(battle, "enemy", "support", "ru_kalibr", { hidden: true, exposed: false });
  assertAction(applyBattleAction(battle, "player", {
    kind: "frontline_breakthrough",
    sourceUid: tank.uid,
    targetSide: "enemy",
    targetUid: cruiseMissile.uid,
  }), "M1A2 breakthrough exposes but does not damage a cruise missile card");
  assert(cruiseMissile.instance.hidden === false && cruiseMissile.instance.exposed === true, "cruise missile should be exposed by breakthrough");
  assert(cruiseMissile.instance.damage === 0, "cruise missile should not take ground-platform breakthrough damage");
  return "cruise missiles remain non-ground breakthrough targets.";
});

testCase("TC-V052-038A", "P0", "Recon call-fire effects order plays scout mark before reveal before called-fire damage", () => {
  const battle = createBattle("recon-effect-order");
  const scout = addBoard(battle, "player", "frontline", "us_rangers_target");
  const howitzer = addBoard(battle, "player", "support", "us_m109");
  const hiddenTarget = addBoard(battle, "enemy", "frontline", "ru_motostrelki", { hidden: true, exposed: false });
  assertAction(activateAndChoose(battle, "player", scout, hiddenTarget), "Ranger marks a hidden target for howitzer fire");
  const targetExpose = battle.effects.find((effect) => effect.type === "expose" && effect.targetUid === hiddenTarget.uid);
  const calledDamage = battle.effects.find((effect) => effect.type === "damage" && effect.sourceUid === howitzer.uid && effect.targetUid === hiddenTarget.uid);
  assert(targetExpose, "target reveal effect should be emitted");
  assert(calledDamage, "called-fire damage effect should be emitted");
  assert(targetExpose.playSourceVideo === true, "target reveal effect should request scout source video playback");
  assert(targetExpose.serial < calledDamage.serial, "target reveal must precede called-fire damage");
  return "recon effects carry the sequencing metadata needed by online playback.";
});

testCase("TC-V052-060A", "P0", "Heavy air defense visible card text matches the docx wording without bomber caveat", () => {
  ["us_patriot", "ru_buk_m3"].forEach((id) => {
    const card = getCard(id);
    const visible = `${card.effect || ""}\n${card.ruleNote || ""}`;
    assert(!/轰炸机/.test(visible), `${id} visible text must not mention bombers`);
    assert(/拦截敌方战斗机、导弹的攻击，一回合一次/.test(visible), `${id} must keep the docx intercept wording`);
  });
  return "heavy air defense text is docx-aligned.";
});

testCase("TC-V052-060B", "P0", "Active card visible text does not expose old-version combat wording", () => {
  const legacyPattern = /减伤|不提供减伤|隐身突防|SEAD|反辐射|布兰杰|轰炸机不被/;
  Object.values(CARD_LIBRARY).forEach((card) => {
    const visible = [
      card.name,
      card.unitAttribute,
      card.ruleNote,
      card.effect,
      ...(card.displayTags || []),
    ].filter(Boolean).join("\n");
    assert(!legacyPattern.test(visible), `${card.id} visible text contains old-version wording: ${visible}`);
  });
  return "active visible card text is free of known V0.5.2 legacy wording.";
});

testCase("TC-V052-061", "P0", "Online staged playback materializes newly deployed firing source before applying damage snapshot", () => {
  const previous = createBattle("online-animation-previous");
  const himars = addHand(previous, "player", "us_himars");
  const target = addBoard(previous, "enemy", "support", "ru_buk_m3", { exposed: true });

  const next = structuredClone(previous);
  next.hands.player = next.hands.player.filter((instance) => instance.uid !== himars.uid);
  next.board.player.support.push({
    ...himars,
    hidden: false,
    exposed: true,
    deployedAtAction: 1,
  });
  const nextTarget = next.board.enemy.support.find((instance) => instance.uid === target.uid);
  nextTarget.damage = 3;

  const staged = buildOnlineEffectAnimationBattle(previous, next, [
    {
      type: "deploy",
      serial: 1,
      sourceSide: "player",
      sourceLineId: "support",
      sourceUid: himars.uid,
      sourceCardId: "us_himars",
      targetSide: "player",
      lineId: "support",
      targetUid: himars.uid,
      targetCardId: "us_himars",
    },
    {
      type: "damage",
      serial: 2,
      sourceSide: "player",
      sourceLineId: "support",
      sourceUid: himars.uid,
      sourceCardId: "us_himars",
      targetSide: "enemy",
      lineId: "support",
      targetUid: target.uid,
      targetCardId: "ru_buk_m3",
      amount: 3,
    },
  ]);

  assert(staged.board.player.support.some((instance) => instance.uid === himars.uid), "staged battle should contain newly deployed firing source");
  assert(!staged.hands.player.some((instance) => instance.uid === himars.uid), "staged battle should remove deployed source from hand to avoid duplicates");
  const stagedTarget = staged.board.enemy.support.find((instance) => instance.uid === target.uid);
  assert(stagedTarget.damage === 0, "staged battle must not apply final damage before the video resolves");
  assert(previous.board.player.support.length === 0, "previous battle should not be mutated");
  assert(previous.hands.player.some((instance) => instance.uid === himars.uid), "previous hand should not be mutated");
  return "online animation middle state can render a deployed firing source without pre-applying damage.";
});

testCase("TC-V052-061A", "P0", "Online animation middle state does not reveal hidden deployments just because a deploy effect exists", () => {
  const previous = createBattle("online-hidden-deploy-previous");
  const scout = addHand(previous, "player", "us_rangers_target");
  const next = structuredClone(previous);
  next.hands.player = next.hands.player.filter((instance) => instance.uid !== scout.uid);
  next.board.player.frontline.push({
    ...scout,
    hidden: true,
    exposed: false,
    deployedAtAction: 1,
  });

  const staged = buildOnlineEffectAnimationBattle(previous, next, [
    {
      type: "deploy",
      serial: 1,
      sourceSide: "player",
      sourceLineId: "frontline",
      sourceUid: scout.uid,
      sourceCardId: null,
      targetSide: "player",
      lineId: "frontline",
      targetUid: scout.uid,
      targetCardId: null,
    },
  ]);

  assert(!staged.board.player.frontline.some((instance) => instance.uid === scout.uid), "hidden deployment should not be materialized as a visible animation source");
  assert(staged.hands.player.some((instance) => instance.uid === scout.uid), "previous hidden hand state should remain until the final snapshot applies");
  return "hidden deploy effects do not leak concealed units in the animation middle state.";
});

testCase("TC-V052-001/002/004/015", "P0", "摧毁得分、50 分胜利、牌库耗尽不直接判负", () => {
  const scoring = createBattle("scoring");
  const shooter = addBoard(scoring, "player", "support", "us_f35a_sead");
  const target = addBoard(scoring, "enemy", "frontline", "ru_motostrelki", { damage: 3 });
  assertAction(activateAndChoose(scoring, "player", shooter, target), "destroy target for score");
  assert(scoring.graves.enemy.some((item) => item.uid === target.uid), "destroyed target should enter grave");
  assert(scoring.scores.player === getCard("ru_motostrelki").targetValue, "score should equal target value");

  const victory = createBattle("victory");
  victory.scores.player = VICTORY_SCORE - 1;
  const finisher = addBoard(victory, "player", "support", "us_f35a_sead");
  const victim = addBoard(victory, "enemy", "frontline", "ru_motostrelki", { damage: 3 });
  assertAction(activateAndChoose(victory, "player", finisher, victim), "trigger victory");
  assert(victory.status === "match-over" && victory.matchWinner === "player", "reaching 50 should immediately end match");
  assertBlocked(applyBattleAction(victory, "player", { kind: "pass_turn" }), "normal action after match over");

  const exhausted = createBattle("deck-exhausted");
  exhausted.decks.player = [];
  assertAction(applyBattleAction(exhausted, "player", { kind: "pass_turn" }), "pass with empty deck");
  assert(exhausted.supplyExhausted === true, "empty draw should mark supply exhausted");
  assert(exhausted.status !== "match-over", "deck exhaustion should not directly lose the game");
  return "得分、胜利和牌库耗尽通过。";
});

testCase("TC-V052-060", "P1", "玩法与卡牌可见文本不含 V0.5.2 冲突口径", () => {
  const activeCards = Object.values(CARD_LIBRARY).filter((card) => card.faction === "usa" || card.faction === "russia");
  const visibleText = activeCards.map((card) => `${card.name}\n${card.ruleNote || ""}\n${card.effect || ""}`).join("\n");
  assert(!/前线支援.*隐蔽|低空前线支援/.test(visibleText), "visible card text must not keep helicopter conceal exception");
  assert(!/SEAD反辐射|隐蔽防空/.test(visibleText), "visible card text must not keep old SEAD targeting wording");
  assert(!/修复[^。\n]*战力/.test(visibleText), "visible repair text must not use power repair wording");
  return `扫描 ${activeCards.length} 张现役卡牌可见文本。`;
});

const outputPathArg = process.argv.find((arg) => arg.startsWith("--output="));
const outputPath = outputPathArg ? outputPathArg.slice("--output=".length) : null;
const summary = {
  generatedAt: new Date().toISOString(),
  total: RESULTS.length,
  passed: RESULTS.filter((item) => item.result === "Pass").length,
  failed: RESULTS.filter((item) => item.result === "Fail").length,
  results: RESULTS,
};

if (outputPath) {
  const resolved = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", outputPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
}

console.log(JSON.stringify(summary, null, 2));
if (summary.failed > 0) {
  process.exitCode = 1;
}
