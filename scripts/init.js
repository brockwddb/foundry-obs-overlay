import { MODULE_ID } from "./constants.js";
import { registerSettings, migrateSettings } from "./settings.js";
import { OverlayController } from "./overlay.js";

Hooks.once("init", () => {
  registerSettings();
});

Hooks.once("ready", async () => {
  await migrateSettings();

  const banner = new OverlayController("banner");
  const party = new OverlayController("party");
  banner.registerHooks();
  party.registerHooks();

  const mod = game.modules.get(MODULE_ID);
  mod.api = {
    controllers: { banner, party },
    // Back-compat: bare open/close act on the banner.
    controller: banner,
    openBanner: () => banner.open(),
    closeBanner: () => banner.close(),
    openParty: () => party.open(),
    closeParty: () => party.close(),
    openOverlay: () => banner.open(),
    closeOverlay: () => banner.close()
  };

  console.log(`${MODULE_ID} | ready`);
});

Hooks.on("getSceneControlButtons", (controls) => {
  if (!game.user.isGM) return;
  const tokenControl = controls.tokens ?? controls.token;
  if (!tokenControl?.tools) return;

  tokenControl.tools.pcStatsBanner = {
    name: "pcStatsBanner",
    title: "PCSTATS.OpenBanner",
    icon: "fa-solid fa-tv",
    button: true,
    onClick: () => game.modules.get(MODULE_ID).api?.openBanner(),
    onChange: () => game.modules.get(MODULE_ID).api?.openBanner()
  };

  tokenControl.tools.pcStatsParty = {
    name: "pcStatsParty",
    title: "PCSTATS.OpenParty",
    icon: "fa-solid fa-users",
    button: true,
    onClick: () => game.modules.get(MODULE_ID).api?.openParty(),
    onChange: () => game.modules.get(MODULE_ID).api?.openParty()
  };
});
