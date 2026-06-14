import { MODULE_ID, OVERLAY_KEYS } from "./constants.js";
import { registerSettings } from "./settings.js";
import { OverlayController } from "./overlay.js";

Hooks.once("init", () => {
  registerSettings();
});

Hooks.once("ready", () => {
  const controllers = {};
  for (const key of OVERLAY_KEYS) {
    const controller = new OverlayController(key);
    controller.registerHooks();
    controllers[key] = controller;
  }

  const mod = game.modules.get(MODULE_ID);
  mod.api = {
    controllers,
    controller: controllers.horizontalBanner, // back-compat
    open: (key) => controllers[key]?.open(),
    close: (key) => controllers[key]?.close(),
    test: (key) => controllers[key]?.runTest(),
    openOverlay: () => controllers.horizontalBanner?.open(),
    closeOverlay: () => controllers.horizontalBanner?.close()
  };

  console.log(`${MODULE_ID} | ready`);
});

Hooks.on("getSceneControlButtons", (controls) => {
  const minRole = Number(game.settings.get(MODULE_ID, "accessRole") ?? CONST.USER_ROLES.GAMEMASTER);
  if (game.user.role < minRole) return;

  const api = () => game.modules.get(MODULE_ID).api;
  // Toggle tools: clicking opens/closes the overlay; `active` reflects state.
  // (Using toggles avoids button auto-fire when the group is activated.)
  const tool = (name, title, icon, key, order) => ({
    name, title, icon, order,
    toggle: true,
    active: !!api()?.controllers?.[key]?.isOpen,
    onChange: (event, active) => { if (active) api()?.open(key); else api()?.close(key); }
  });

  // Single top-level control group so the four overlays don't clutter the
  // token controls. Tools are ordered to match the config tabs.
  controls.pcStats = {
    name: "pcStats",
    title: "PCSTATS.MenuTitle",
    icon: "fa-solid fa-clapperboard",
    order: 100,
    tools: {
      pcStatsHorizontalBanner: tool("pcStatsHorizontalBanner", "PCSTATS.OpenBanner", "fa-solid fa-tv", "horizontalBanner", 1),
      pcStatsVerticalBanner: tool("pcStatsVerticalBanner", "PCSTATS.OpenVerticalCard", "fa-solid fa-id-card", "verticalBanner", 2),
      pcStatsPartyRow: tool("pcStatsPartyRow", "PCSTATS.OpenParty", "fa-solid fa-users", "partyRow", 3),
      pcStatsPartyColumn: tool("pcStatsPartyColumn", "PCSTATS.OpenVertical", "fa-solid fa-grip-lines-vertical", "partyColumn", 4)
    },
    activeTool: "pcStatsHorizontalBanner"
  };
});
