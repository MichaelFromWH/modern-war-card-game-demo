import {
  applyBattleAction,
  createAuthoritativeBattle,
} from "../src/online-battle-engine.js";
import {
  buildOnlineEffectAnimationBattle,
} from "../src/online-animation-state.js";
import {
  LINES,
  getCard,
} from "../src/game-data.js";
import fs from "node:fs";

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

function testCase(id, title, fn) {
  const startedAt = Date.now();
  try {
    const evidence = fn() || "";
    RESULTS.push({ id, title, result: "Pass", evidence, durationMs: Date.now() - startedAt });
  } catch (error) {
    RESULTS.push({
      id,
      title,
      result: "Fail",
      evidence: error?.stack || error?.message || String(error),
      durationMs: Date.now() - startedAt,
    });
  }
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
    actionPoints: 1,
    tacticPoints: 1,
    genericPoints: 1,
    spentActionPoints: 0,
    spentTacticPoints: 0,
    spentGenericPoints: 0,
    ...overrides,
  };
}

function createBattle(label = "v053") {
  const battle = createAuthoritativeBattle({
    roomCode: label.toUpperCase().slice(0, 8),
    match: { id: `match-${label}`, seed: `seed-${label}` },
    players: [
      { id: `${label}-p`, side: "player", name: "USA", loadout: { faction: "usa" } },
      { id: `${label}-e`, side: "enemy", name: "RUS", loadout: { faction: "russia" } },
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
    player: turnState(),
    enemy: turnState(),
  };
  battle.log = [`test battle ${label}`];
  battle.actionSerial = 1;
  battle.matchWinner = null;
  battle.supplyExhausted = false;
  return battle;
}

function makeInstance(battle, side, cardId, options = {}) {
  return {
    uid: `${side}-v053-${++battle.uidCounter}`,
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
    deployedAtAction: options.deployedAtAction ?? 0,
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

function addBoard(battle, side, lineId, cardId, options = {}) {
  const instance = makeInstance(battle, side, cardId, options);
  battle.board[side][lineId].push(instance);
  return { side, lineId, uid: instance.uid, instance };
}

function addHand(battle, side, cardId) {
  const instance = makeInstance(battle, side, cardId);
  battle.hands[side].push(instance);
  return instance;
}

function viewerSide(serverSide, viewerSide) {
  return serverSide === viewerSide ? "player" : "enemy";
}

function choosePendingTarget(battle, side, index = 0) {
  assert(battle.pending, "expected pending target selection");
  const target = battle.pending.targets[index];
  assert(target, `expected pending target at ${index}`);
  return applyBattleAction(battle, side, {
    kind: "choose_target",
    targetSide: viewerSide(target.side, side),
    targetUid: target.uid,
  });
}

function activateAndResolve(battle, side, sourceRef) {
  const result = applyBattleAction(battle, side, {
    kind: "activate_unit",
    sourceUid: sourceRef.uid,
  });
  if (battle.pending) {
    return choosePendingTarget(battle, side, 0);
  }
  return result;
}

function playTacticAndChoose(battle, side, handInstance, targetIndex = 0) {
  assertAction(applyBattleAction(battle, side, {
    kind: "play_tactic",
    handUid: handInstance.uid,
  }), "play tactic");
  return choosePendingTarget(battle, side, targetIndex);
}

testCase("V053-RESOURCE-001", "second tactic can spend the generic point", () => {
  const battle = createBattle("res");
  addBoard(battle, "player", "frontline", "us_marine_rifle");
  addBoard(battle, "enemy", "frontline", "ru_motostrelki");
  addBoard(battle, "enemy", "support", "ru_2s19");
  battle.turnActions.player = turnState({
    ownBoardEmptyAtStart: false,
    actionPoints: 1,
    tacticPoints: 1,
    genericPoints: 1,
  });
  const first = addHand(battle, "player", "us_electronic_suppression");
  const second = addHand(battle, "player", "us_electronic_suppression");

  assertAction(playTacticAndChoose(battle, "player", first, 0), "first tactic resolves");
  assertAction(playTacticAndChoose(battle, "player", second, 1), "second tactic resolves through generic point");
  assert(battle.turnActions.player.spentTacticPoints === 1, "first tactic should spend tactic point");
  assert(battle.turnActions.player.spentGenericPoints === 1, "second tactic should spend generic point");

  const unit = addHand(battle, "player", "us_javelin_team");
  assertBlocked(applyBattleAction(battle, "player", {
    kind: "play_unit",
    handUid: unit.uid,
    lineId: "frontline",
  }), "deployment should be blocked after generic point is gone");
  return "1 tactic point plus 1 generic point allow two tactics, then deployment is blocked.";
});

testCase("V053-COUNTER-001", "frontline direct attack triggers simultaneous legal counterattack", () => {
  const battle = createBattle("front");
  const attacker = addBoard(battle, "player", "frontline", "us_marine_rifle");
  const defender = addBoard(battle, "enemy", "frontline", "ru_motostrelki");

  assertAction(activateAndResolve(battle, "player", attacker), "frontline attack resolves");
  assert(attacker.instance.damage === 3, `attacker should take 3 counter damage, got ${attacker.instance.damage}`);
  assert(defender.instance.damage === 3, `defender should take 3 attack damage, got ${defender.instance.damage}`);
  assert(defender.instance.actedAction !== battle.actionSerial, "counterattack must not fatigue the defender");
  return `${getCard(attacker.instance.cardId).name} and ${getCard(defender.instance.cardId).name} both dealt damage.`;
});

testCase("V053-COUNTER-002", "frontline counterattack requires a legal return target", () => {
  const battle = createBattle("frontlegal");
  const attacker = addBoard(battle, "player", "frontline", "us_apache");
  const defender = addBoard(battle, "enemy", "frontline", "ru_t90m");

  assertAction(activateAndResolve(battle, "player", attacker), "helicopter attack resolves");
  assert(defender.instance.damage > 0, "tank should take helicopter damage");
  assert(attacker.instance.damage === 0, "tank should not counter a low-air helicopter without legal high-angle fire");
  return "frontline counter was skipped because the defender could not legally target the source.";
});

testCase("V053-COUNTER-003", "high-air fighter attack triggers high-air counterattack", () => {
  const battle = createBattle("highair");
  const attacker = addBoard(battle, "player", "support", "us_f35");
  const defender = addBoard(battle, "enemy", "support", "ru_su35");

  assertAction(activateAndResolve(battle, "player", attacker), "fighter attack resolves");
  assert(attacker.instance.damage === 4, `fighter should take 4 counter damage, got ${attacker.instance.damage}`);
  assert(defender.instance.damage === 4, `target fighter should take 4 damage, got ${defender.instance.damage}`);
  return "fighter-vs-fighter high-air counterattack resolved.";
});

testCase("V053-COUNTER-004", "suppressed units cannot counterattack", () => {
  const battle = createBattle("suppressed");
  const attacker = addBoard(battle, "player", "frontline", "us_m1a2");
  const defender = addBoard(battle, "enemy", "frontline", "ru_t90m", { suppressed: true });

  assertAction(activateAndResolve(battle, "player", attacker), "tank attack resolves");
  assert(defender.instance.damage > 0, "suppressed defender should still receive attack damage");
  assert(attacker.instance.damage === 0, "suppressed defender must not counterattack");
  return "suppressed defender did not counter.";
});

testCase("V053-HIDDEN-COUNTER-001", "hidden frontline counter damage is simultaneous before destruction cleanup", () => {
  const battle = createBattle("hiddenfront");
  const hiddenTank = addBoard(battle, "enemy", "frontline", "ru_t90m", { hidden: true, exposed: false });
  const marine = addHand(battle, "player", "us_marine_rifle");
  battle.turnActions.player = turnState({
    ownBoardEmptyAtStart: true,
    enemyFrontlineEmptyAtStart: false,
    actionPoints: 0,
    tacticPoints: 1,
    genericPoints: 2,
  });

  assertAction(applyBattleAction(battle, "player", {
    kind: "play_unit",
    handUid: marine.uid,
    lineId: "frontline",
    hidden: false,
  }), "frontline deployment into hidden tank");

  assert(battle.graves.player.some((instance) => instance.cardId === "us_marine_rifle"), "deployed marine should be destroyed by the hidden counter");
  assert(hiddenTank.instance.hidden === false && hiddenTank.instance.exposed === true, "hidden tank should be exposed by contact");
  assert(hiddenTank.instance.damage > 0, "deployed marine should still deal its simultaneous contact damage before being destroyed");
  return "hidden frontline contact keeps both attacks in the damage queue before cleanup.";
});

testCase("V053-HIGH-AIR-001", "local high-air deployment only exposes and does not auto-fight", () => {
  const mainSource = fs.readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
  assert(!mainSource.includes("resolveHighAirEngagement(battle, side, sourceRef)"), "local deployment should not call the old high-air auto-fight handler");
  assert(!mainSource.includes("同时暴露并交战"), "local high-air exposure log should not describe automatic combat");
  return "local high-air deployment has no auto-combat call path.";
});

testCase("V053-INTERCEPT-001", "air defense interception only triggers during the opponent turn", () => {
  const battle = createBattle("interceptturn");
  const attacker = addBoard(battle, "player", "support", "us_f35");
  const ownPatriot = addBoard(battle, "player", "support", "us_patriot");
  const defender = addBoard(battle, "enemy", "support", "ru_su35");
  battle.turnActions.player = turnState({
    ownBoardEmptyAtStart: false,
    enemyFrontlineEmptyAtStart: true,
    actionPoints: 1,
    tacticPoints: 1,
    genericPoints: 1,
  });

  assertAction(activateAndResolve(battle, "player", attacker), "fighter attack resolves");
  assert(defender.instance.damage === 4, `target fighter should take 4 damage, got ${defender.instance.damage}`);
  assert(attacker.instance.damage === 4, `counterattack should hit the attacking fighter because own Patriot cannot intercept during own turn, got ${attacker.instance.damage}`);
  assert(ownPatriot.instance.interceptAction !== battle.actionSerial, "own air defense must not intercept during its own turn");
  return "counterattack damage was not intercepted by same-side air defense during the active side turn.";
});

testCase("V053-ENDTURN-001", "local end turn can be queued during player-side deploy resolution locks", () => {
  const mainSource = fs.readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
  assert(mainSource.includes("function handleEndTurnAction()"), "local UI should route end-turn clicks through a queue-aware handler");
  assert(mainSource.includes("queueEndTurnAfterCurrentAction(battle, \"player\")"), "end-turn clicks during player actionAnimation should queue the pass instead of being ignored");
  assert(mainSource.includes("consumeQueuedEndTurn(battle, side)"), "finishAction should consume queued end-turn after the current deployment/action resolves");
  assert(mainSource.includes("passTurn(side);"), "queued end-turn consumption should reuse the normal passTurn path");
  return "end-turn clicks during deployment resolution locks are queued and consumed after resolution.";
});

testCase("V053-CONTACT-COUNTER-001", "online frontline contact fire into an exposed frontline unit triggers counterattack", () => {
  const battle = createBattle("contactctr");
  const defender = addBoard(battle, "enemy", "frontline", "ru_motostrelki", { hidden: false, exposed: true });
  const marine = addHand(battle, "player", "us_marine_rifle");
  battle.turnActions.player = turnState({
    ownBoardEmptyAtStart: true,
    enemyFrontlineEmptyAtStart: false,
    actionPoints: 0,
    tacticPoints: 1,
    genericPoints: 2,
  });

  assertAction(applyBattleAction(battle, "player", {
    kind: "play_unit",
    handUid: marine.uid,
    lineId: "frontline",
    hidden: false,
  }), "frontline deployment resolves contact fire");
  const deployed = battle.board.player.frontline.find((instance) => instance.cardId === "us_marine_rifle");
  assert(deployed?.damage > 0, `exposed defender should counter the contact fire, got deployed damage ${deployed?.damage || 0}`);
  assert(defender.instance.damage > 0, "deployed unit should still damage the exposed defender");
  return "exposed frontline defenders counterattack contact fire in online authoritative combat.";
});

testCase("V053-DRAW-001", "online pass turn draws for the next active side at turn start", () => {
  const battle = createBattle("drawstart");
  battle.hands.player = [];
  battle.hands.enemy = [];
  battle.decks.player = [makeInstance(battle, "player", "us_marine_rifle")];
  battle.decks.enemy = [makeInstance(battle, "enemy", "ru_motostrelki")];

  assertAction(applyBattleAction(battle, "player", { kind: "pass_turn" }), "player passes turn");
  assert(battle.hands.player.length === 0, `ending side should not draw on pass, got ${battle.hands.player.length}`);
  assert(battle.hands.enemy.length === 1, `next active side should draw at turn start, got ${battle.hands.enemy.length}`);
  assert(battle.activeSide === "enemy", "enemy should be the next active side");
  return "draw timing moved from ending side pass to next side turn start.";
});

testCase("V053-ANIMATION-001", "online expose staging replaces masked target with revealed card art data", () => {
  const previous = createBattle("exposeprev");
  const next = createBattle("exposenext");
  const targetUid = "enemy-mask-1";
  previous.board.enemy.frontline = [{
    uid: targetUid,
    cardId: "us_marine_rifle",
    hidden: true,
    exposed: false,
    masked: true,
    damage: 0,
  }];
  next.board.enemy.frontline = [{
    uid: targetUid,
    cardId: "ru_motostrelki",
    hidden: false,
    exposed: true,
    damage: 0,
  }];
  const staged = buildOnlineEffectAnimationBattle(previous, next, [{
    type: "expose",
    serial: 1,
    attackerSide: "player",
    sourceSide: "player",
    sourceUid: "player-scout",
    sourceCardId: "us_rangers_target",
    targetSide: "enemy",
    lineId: "frontline",
    targetUid,
    targetCardId: "ru_motostrelki",
    playSourceVideo: true,
  }]);
  const revealed = staged.board.enemy.frontline.find((instance) => instance.uid === targetUid);
  assert(revealed?.cardId === "ru_motostrelki", `staged reveal should show the real card id, got ${revealed?.cardId}`);
  assert(revealed.hidden === false && revealed.exposed === true, "staged reveal should flip the target face up");
  return "forced reveal animation can render the newly exposed card art before final snapshot applies.";
});

testCase("V053-CANCEL-001", "online cancel target selection releases server pending without spending the tactic card", () => {
  const battle = createBattle("cancel");
  addBoard(battle, "enemy", "frontline", "ru_motostrelki", { hidden: false, exposed: true });
  const tactic = addHand(battle, "player", "us_electronic_suppression");

  assertAction(applyBattleAction(battle, "player", { kind: "play_tactic", handUid: tactic.uid }), "play tactic opens target selection");
  assert(battle.pending?.kind === "handEffect", "tactic should be waiting for target selection");
  assertAction(applyBattleAction(battle, "player", { kind: "cancel_pending" }), "cancel target selection");
  assert(!battle.pending, "server pending should be cleared");
  assert(battle.hands.player.some((instance) => instance.uid === tactic.uid), "cancelled tactic should remain in hand");
  assert(battle.turnActions.player.spentTacticPoints === 0 && battle.turnActions.player.spentGenericPoints === 0, "cancel should not spend resources");
  assertAction(applyBattleAction(battle, "player", { kind: "pass_turn" }), "player can pass after cancelling target selection");

  const mainSource = fs.readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
  assert(mainSource.includes("cancel_pending"), "online client cancel button should send cancel_pending to the server");
  return "online target cancellation is server-authoritative and does not lock the turn.";
});

const failures = RESULTS.filter((result) => result.result !== "Pass");
console.table(RESULTS);
if (failures.length) {
  process.exitCode = 1;
}
