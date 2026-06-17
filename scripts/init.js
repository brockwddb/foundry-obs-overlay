import { MODULE_ID, OVERLAY_KEYS } from "./constants.js";
import { registerSettings } from "./settings.js";
import { OverlayController } from "./controller.js";

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
    open: (key) => controllers[key]?.open(),
    close: (key) => controllers[key]?.close(),
    test: (key) => controllers[key]?.runTest(),
    // Feature a character on every open banner overlay.
    feature: (actorId) => { for (const key of OVERLAY_KEYS) controllers[key]?.feature(actorId); },
    // Float a manual callout on every open overlay (actorId/color optional).
    callout: (text, actorId = null, color = null) => {
      for (const key of OVERLAY_KEYS) controllers[key]?.calloutManual(text, actorId, color);
    }
  };

  console.log(`${MODULE_ID} | ready`);
});

// Token HUD button: feature the token's actor on the banner overlays on click.
Hooks.on("renderTokenHUD", (hud, html) => {
  const minRole = Number(game.settings.get(MODULE_ID, "accessRole") ?? CONST.USER_ROLES.GAMEMASTER);
  if (game.user.role < minRole) return;
  const actorId = hud.object?.actor?.id ?? hud.document?.actorId;
  if (!actorId) return;

  const root = html instanceof HTMLElement ? html : html?.[0];
  const col = root?.querySelector?.(".col.left") ?? root?.querySelector?.(".col.right");
  if (!col) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "control-icon pcs-hud-feature";
  btn.title = game.i18n.localize("PCSTATS.FeatureOnOverlay");
  btn.innerHTML = `<i class="fa-solid fa-star"></i>`;
  btn.addEventListener("click", (ev) => {
    ev.preventDefault();
    game.modules.get(MODULE_ID).api?.feature(actorId);
  });
  col.appendChild(btn);
});

Hooks.on("getSceneControlButtons", (controls) => {
  const minRole = Number(game.settings.get(MODULE_ID, "accessRole") ?? CONST.USER_ROLES.GAMEMASTER);
  if (game.user.role < minRole) return;

  const api = () => game.modules.get(MODULE_ID).api;
  // Plain action buttons: clicking opens that overlay. onChange fires on click.
  const tool = (name, title, icon, key, order) => ({
    name, title, icon, order,
    button: true,
    onChange: () => api()?.open(key)
  });

  // Single top-level control group so the four overlays don't clutter the
  // token controls. The activeTool points at a no-op "menu" tool so that
  // *activating the group* never triggers an overlay (only direct tool clicks
  // do). Tools are ordered to match the config tabs.
  controls.pcStats = {
    name: "pcStats",
    title: "PCSTATS.MenuTitle",
    icon: "fa-solid fa-clapperboard",
    order: 100,
    activeTool: "pcStatsMenu",
    tools: {
      pcStatsMenu: {
        name: "pcStatsMenu",
        title: "PCSTATS.MenuTitle",
        icon: "fa-solid fa-clapperboard",
        order: 0,
        toggle: true,
        active: true,
        onChange: () => {}
      },
      pcStatsHorizontalBanner: tool("pcStatsHorizontalBanner", "PCSTATS.OpenBanner", "fa-solid fa-tv", "horizontalBanner", 1),
      pcStatsVerticalBanner: tool("pcStatsVerticalBanner", "PCSTATS.OpenVerticalCard", "fa-solid fa-id-card", "verticalBanner", 2),
      pcStatsPartyRow: tool("pcStatsPartyRow", "PCSTATS.OpenParty", "fa-solid fa-users", "partyRow", 3),
      pcStatsPartyColumn: tool("pcStatsPartyColumn", "PCSTATS.OpenVertical", "fa-solid fa-grip-lines-vertical", "partyColumn", 4),
      pcStatsTurnOrder: tool("pcStatsTurnOrder", "PCSTATS.OpenTurnOrder", "fa-solid fa-list-ol", "turnOrder", 5)
    }
  };
});
