import { OverlayConfigApp } from "./config-app.js";

export const MODULE_ID = "pc-stats-obs-overlay";

// Display fields in their default order. Keys are referenced by the renderer.
export const FIELD_DEFS = {
  portrait: "PCSTATS.FieldPortrait",
  name: "PCSTATS.FieldName",
  hp: "PCSTATS.FieldHP",
  ac: "PCSTATS.FieldAC",
  abilities: "PCSTATS.FieldAbilities",
  classLevel: "PCSTATS.FieldClassLevel",
  conditions: "PCSTATS.FieldConditions"
};

export function defaultFieldConfig() {
  return Object.keys(FIELD_DEFS).map((key, i) => ({
    key,
    enabled: true,
    fontSize: key === "name" ? 28 : 18,
    order: i
  }));
}

export function registerSettings() {
  game.settings.register(MODULE_ID, "selectedActors", {
    scope: "world",
    config: false,
    type: Array,
    default: []
  });

  game.settings.register(MODULE_ID, "fieldConfig", {
    scope: "world",
    config: false,
    type: Array,
    default: defaultFieldConfig()
  });

  game.settings.register(MODULE_ID, "rotateInterval", {
    scope: "world",
    config: false,
    type: Number,
    default: 8
  });

  game.settings.register(MODULE_ID, "bgColor", {
    scope: "world",
    config: false,
    type: String,
    default: "#00ff00"
  });

  game.settings.register(MODULE_ID, "bannerHeight", {
    scope: "world",
    config: false,
    type: Number,
    default: 220
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
