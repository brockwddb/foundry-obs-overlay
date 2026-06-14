import { MODULE_ID, defaultOverlayConfig } from "./constants.js";
import { OverlayConfigApp } from "./config-app.js";

export function registerSettings() {
  game.settings.register(MODULE_ID, "bannerConfig", {
    scope: "world",
    config: false,
    type: Object,
    default: defaultOverlayConfig("banner")
  });

  game.settings.register(MODULE_ID, "verticalcardConfig", {
    scope: "world",
    config: false,
    type: Object,
    default: defaultOverlayConfig("verticalcard")
  });

  game.settings.register(MODULE_ID, "partyConfig", {
    scope: "world",
    config: false,
    type: Object,
    default: defaultOverlayConfig("party")
  });

  game.settings.register(MODULE_ID, "verticalConfig", {
    scope: "world",
    config: false,
    type: Object,
    default: defaultOverlayConfig("vertical")
  });

  game.settings.register(MODULE_ID, "configMigrated", {
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  game.settings.registerMenu(MODULE_ID, "configMenu", {
    name: "PCSTATS.ConfigMenuName",
    label: "PCSTATS.ConfigMenuLabel",
    hint: "PCSTATS.ConfigMenuHint",
    icon: "fa-solid fa-sliders",
    type: OverlayConfigApp,
    restricted: true
  });
}

// One-time migration from the old flat (single-overlay) settings into the two
// independent config objects. Content/structure (actors, fields, messages,
// combat) carries over; appearance colors take the new parchment defaults so the
// migrated overlays match the look the theme used to force at runtime.
export async function migrateSettings() {
  if (game.settings.get(MODULE_ID, "configMigrated")) return;

  const old = readRawSettings();
  const banner = defaultOverlayConfig("banner");
  const verticalcard = defaultOverlayConfig("verticalcard");
  const party = defaultOverlayConfig("party");
  const vertical = defaultOverlayConfig("vertical");

  const carryBoth = ["selectedActors", "fieldConfig", "showHpBar",
    "portraitShape", "bgColor", "combatAnimations", "combatAnimDuration"];
  for (const k of carryBoth) {
    if (old[k] === undefined) continue;
    banner[k] = old[k]; verticalcard[k] = old[k]; party[k] = old[k]; vertical[k] = old[k];
  }

  // Sizing, rotation, and sponsor messages only carry to the banner; the other
  // layouts keep their own defaults.
  const carryBanner = ["portraitSize", "fieldGap", "paddingX", "paddingY",
    "bannerWidth", "bannerHeight", "rotateInterval", "customMessages",
    "messageFrequency", "messageFontSize"];
  for (const k of carryBanner) {
    if (old[k] !== undefined) banner[k] = old[k];
  }

  await game.settings.set(MODULE_ID, "bannerConfig", banner);
  await game.settings.set(MODULE_ID, "verticalcardConfig", verticalcard);
  await game.settings.set(MODULE_ID, "partyConfig", party);
  await game.settings.set(MODULE_ID, "verticalConfig", vertical);
  await game.settings.set(MODULE_ID, "configMigrated", true);
  console.log(`${MODULE_ID} | migrated old settings into overlay configs`);
}

// Read the old flat settings straight from world storage (they are no longer
// registered, so game.settings.get would throw). Defensive: any failure just
// yields an empty object and the configs fall back to defaults.
function readRawSettings() {
  const out = {};
  try {
    const world = game.settings.storage.get("world");
    const prefix = `${MODULE_ID}.`;
    for (const setting of world) {
      const key = setting.key ?? "";
      if (!key.startsWith(prefix)) continue;
      const short = key.slice(prefix.length);
      const raw = setting.value;
      try {
        out[short] = typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch {
        out[short] = raw;
      }
    }
  } catch (err) {
    console.warn(`${MODULE_ID} | could not read old settings for migration`, err);
  }
  return out;
}
