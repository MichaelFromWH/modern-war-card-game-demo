import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = await loadPlaywright();

const outDir = "output/v1-redesign";
const url = process.env.TEST_URL || "http://localhost:3000";
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];

page.on("console", (message) => {
  if (message.type() === "error" && !message.text().includes("Failed to load resource")) {
    errors.push(message.text());
  }
});
page.on("pageerror", (error) => errors.push(String(error)));

await page.goto(url, { waitUntil: "networkidle" });
await page.screenshot({ path: `${outDir}/01-briefing.png`, fullPage: true });

await page.click('[data-action="start"]');
await page.waitForTimeout(200);
await page.screenshot({ path: `${outDir}/02-battle-start.png`, fullPage: true });

await playUnit("Marine 海军陆战队", "frontline", { conceal: true });
await page.waitForTimeout(900);

await playUnit("标枪反甲小组", "frontline");
await clickFirstTargetIfAvailable();
await page.waitForTimeout(900);

await playEffectCard("战机突袭");
await clickFirstTargetIfAvailable();
await page.waitForTimeout(900);

await page.locator(".board-card").first().hover();
await page.waitForTimeout(160);
await page.screenshot({ path: `${outDir}/03-board-hover-spotlight.png`, fullPage: true });

await page.locator('[data-hand-card]').first().hover();
await page.waitForTimeout(160);
await page.screenshot({ path: `${outDir}/04-hand-hover-spotlight.png`, fullPage: true });

const state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
const spotlightVisible = await page.locator("#card-spotlight:not([hidden])").count();
writeFileSync(`${outDir}/state.json`, JSON.stringify({ state, spotlightVisible, errors }, null, 2));

if (errors.length) {
  throw new Error(`Console errors: ${errors.join("\n")}`);
}
if (state.screen !== "battle" || state.phase !== "battle") {
  throw new Error(`Unexpected state: ${JSON.stringify(state)}`);
}
if (!spotlightVisible) {
  throw new Error("Expected hover card spotlight to be visible.");
}

await browser.close();

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    return require("playwright");
  }
}

async function playUnit(name, lineId, options = {}) {
  await page.locator("[data-hand-card]").filter({ hasText: name }).first().click(options.conceal ? { modifiers: ["Shift"] } : undefined);
  await page.locator(`[data-side="player"][data-row="${lineId}"]`).click();
  await page.waitForTimeout(120);
}

async function playEffectCard(name) {
  const card = page.locator("[data-hand-card]").filter({ hasText: name }).first();
  if ((await card.count()) > 0) {
    await card.click();
    await page.waitForTimeout(120);
  }
}

async function clickFirstTargetIfAvailable() {
  const target = page.locator(".board-card.is-targetable").first();
  if ((await target.count()) > 0) {
    await target.click();
    await page.waitForTimeout(120);
  }
}
