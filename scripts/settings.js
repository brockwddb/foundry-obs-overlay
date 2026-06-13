import { MODULE_ID, defaultFieldConfig } from "./constants.js";
import { OverlayConfigApp } from "./config-app.js";

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

  game.settings.register(MODULE_ID, "textColor", {
    scope: "world",
    config: false,
    type: String,
    default: "#ffffff"
  });

  game.settings.register(MODULE_ID, "showHpBar", {
    scope: "world",
    config: false,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "cardEnabled", {
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  game.settings.register(MODULE_ID, "cardColor", {
    scope: "world",
    config: false,
    type: String,
    default: "#000000"
  });

  game.settings.register(MODULE_ID, "cardOpacity", {
    scope: "world",
    config: false,
    type: Number,
    default: 0.6
  });

  game.settings.register(MODULE_ID, "cardRadius", {
    scope: "world",
    config: false,
    type: Number,
    default: 16
  });

  game.settings.register(MODULE_ID, "portraitSize", {
    scope: "world",
    config: false,
    type: Number,
    default: 120
  });

  game.settings.register(MODULE_ID, "portraitShape", {
    scope: "world",
    config: false,
    type: String,
    default: "rounded"
  });

  game.settings.register(MODULE_ID, "fieldGap", {
    scope: "world",
    config: false,
    type: Number,
    default: 18
  });

  game.settings.register(MODULE_ID, "paddingX", {
    scope: "world",
    config: false,
    type: Number,
    default: 22
  });

  game.settings.register(MODULE_ID, "paddingY", {
    scope: "world",
    config: false,
    type: Number,
    default: 12
  });

  game.settings.register(MODULE_ID, "showDividers", {
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  game.settings.register(MODULE_ID, "dividerColor", {
    scope: "world",
    config: false,
    type: String,
    default: "#ffffff"
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
