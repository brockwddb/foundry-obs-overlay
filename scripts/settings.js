import { MODULE_ID, OVERLAY_KEYS, defaultOverlayConfig } from "./constants.js";
import { OverlayConfigApp } from "./config-app.js";

export function registerSettings() {
  for (const key of OVERLAY_KEYS) {
    game.settings.register(MODULE_ID, `${key}Config`, {
      scope: "world",
      config: false,
      type: Object,
      default: defaultOverlayConfig(key)
    });
  }

  game.settings.register(MODULE_ID, "accessRole", {
    name: "PCSTATS.AccessRole",
    hint: "PCSTATS.AccessRoleHint",
    scope: "world",
    config: true,
    type: Number,
    default: CONST.USER_ROLES.GAMEMASTER,
    choices: {
      [CONST.USER_ROLES.PLAYER]: "PCSTATS.RolePlayer",
      [CONST.USER_ROLES.TRUSTED]: "PCSTATS.RoleTrusted",
      [CONST.USER_ROLES.ASSISTANT]: "PCSTATS.RoleAssistant",
      [CONST.USER_ROLES.GAMEMASTER]: "PCSTATS.RoleGamemaster"
    },
    onChange: () => ui.controls?.render()
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
