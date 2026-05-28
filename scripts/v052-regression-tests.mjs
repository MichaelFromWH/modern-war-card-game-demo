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
    shield: false,
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
  return "关键数据字段符合 V0.5.2。";
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
  assertAction(applyBattleAction(repair, "player", { kind: "play_tactic", handUid: card.uid }), "play repair");
  assertAction(choosePendingTarget(repair, "player", 0), "choose damaged unit");
  assert(damaged.instance.damage === 1, "repair amount should reduce damage without overheal");

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

testCase("TC-V052-037", "P0", "电子压制持续到目标下一回合并限制主动技能", () => {
  const battle = createBattle("suppression");
  const target = addBoard(battle, "enemy", "support", "ru_tornado_s");
  const suppress = addHand(battle, "player", "us_electronic_suppression");
  assertAction(applyBattleAction(battle, "player", { kind: "play_tactic", handUid: suppress.uid }), "play electronic suppression");
  assertAction(choosePendingTarget(battle, "player", 0), "choose suppression target");
  assert(target.instance.suppressed === true, "target should be suppressed");
  assertAction(applyBattleAction(battle, "player", { kind: "pass_turn" }), "pass to enemy");
  assertBlocked(applyBattleAction(battle, "enemy", { kind: "activate_unit", sourceUid: target.uid }), "suppressed target activation");
  return "电子压制阻止目标主动行动。";
});

testCase("TC-V052-038/039/040", "P0", "侦察暴露并调用未行动远火；无可调用远火时抽牌", () => {
  const call = createBattle("recon-call");
  const scout = addBoard(call, "player", "frontline", "us_rangers_target");
  addBoard(call, "player", "support", "us_m109");
  const hiddenTarget = addBoard(call, "enemy", "frontline", "ru_motostrelki", { hidden: true, exposed: false });
  assertAction(activateAndChoose(call, "player", scout, hiddenTarget), "recon with callable artillery");
  assert(hiddenTarget.instance.hidden === false, "recon should expose hidden target");
  assert(hiddenTarget.instance.damage > 0, "callable artillery should damage target");

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
  addBoard(rocket, "enemy", "frontline", "ru_t90m");
  addBoard(rocket, "enemy", "frontline", "ru_bmpt");
  addBoard(rocket, "enemy", "frontline", "ru_bmp3m");
  assertAction(applyBattleAction(rocket, "player", { kind: "activate_unit", sourceUid: himars.uid }), "HIMARS activation");
  assert(rocket.pending?.targets?.length === 3, "HIMARS should present legal targets before choosing primary");
  assertAction(choosePendingTarget(rocket, "player", 0), "choose HIMARS primary");
  const damaged = rocket.board.enemy.frontline.filter((instance) => instance.damage > 0);
  assert(damaged.length === 2, "HIMARS should damage at most two targets");
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
  addBoard(bomber, "enemy", "frontline", "ru_t90m");
  addBoard(bomber, "enemy", "frontline", "ru_bmpt");
  addBoard(bomber, "enemy", "frontline", "ru_bmp3m");
  assertAction(applyBattleAction(bomber, "player", { kind: "activate_unit", sourceUid: b2.uid }), "B-2 activation");
  assertAction(choosePendingTarget(bomber, "player", 0), "B-2 choose primary");
  const damaged = bomber.board.enemy.frontline.filter((instance) => instance.damage > 0);
  assert(damaged.length === 2, "B-2 should damage at most two targets");
  assert(damaged.some((instance) => instance.damage === 5) && damaged.some((instance) => instance.damage === 3), "B-2 should use 5 primary / 3 secondary damage");
  return "航空兵口径通过。";
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
