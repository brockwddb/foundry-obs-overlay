import { registerSettings, MODULE_ID } from "./settings.js";
import { OverlayController } from "./overlay.js";

Hooks.once("init", () => {
  registerSettings();
});

Hooks.once("ready", () => {
  const controller = new OverlayController();
  controller.registerHooks();

  const mod = game.modules.get(MODULE_ID);
  mod.api = {
    controller,
    openOverlay: () => controller.open(),
    closeOverlay: () => controller.close()
  };

  console.log(`${MODULE_ID} | ready`);
});

Hooks.on("getSceneControlButtons", (controls) => {
  if (!game.user.isGM) return;
  const tokenControl = controls.tokens ?? controls.token;
  if (!tokenControl?.tools) return;

  tokenControl.tools.pcStatsOverlay = {
    name: "pcStatsOverlay",
    title: "PCSTATS.OpenOverlay",
    icon: "fa-solid fa-tv",
    button: true,
    onClick: () => game.modules.get(MODULE_ID).api?.openOverlay(),
    onChange: () => game.modules.get(MODULE_ID).api?.openOverlay()
  };
});
