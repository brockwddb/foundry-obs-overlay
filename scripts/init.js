import { MODULE_ID } from "./constants.js";
import { registerSettings, migrateSettings } from "./settings.js";
import { OverlayController } from "./overlay.js";

Hooks.once("init", () => {
  registerSettings();
});

Hooks.once("ready", async () => {
  await migrateSettings();

  const banner = new OverlayController("banner");
  const verticalcard = new OverlayController("verticalcard");
  const party = new OverlayController("party");
  const vertical = new OverlayController("vertical");
  banner.registerHooks();
  verticalcard.registerHooks();
  party.registerHooks();
  vertical.registerHooks();

  const mod = game.modules.get(MODULE_ID);
  mod.api = {
    controllers: { banner, verticalcard, party, vertical },
    // Back-compat: bare open/close act on the banner.
    controller: banner,
    openBanner: () => banner.open(),
    closeBanner: () => banner.close(),
    openVerticalCard: () => verticalcard.open(),
    closeVerticalCard: () => verticalcard.close(),
    openParty: () => party.open(),
    closeParty: () => party.close(),
    openVertical: () => vertical.open(),
    closeVertical: () => vertical.close(),
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

  tokenControl.tools.pcStatsVerticalCard = {
    name: "pcStatsVerticalCard",
    title: "PCSTATS.OpenVerticalCard",
    icon: "fa-solid fa-id-card",
    button: true,
    onClick: () => game.modules.get(MODULE_ID).api?.openVerticalCard(),
    onChange: () => game.modules.get(MODULE_ID).api?.openVerticalCard()
  };

  tokenControl.tools.pcStatsParty = {
    name: "pcStatsParty",
    title: "PCSTATS.OpenParty",
    icon: "fa-solid fa-users",
    button: true,
    onClick: () => game.modules.get(MODULE_ID).api?.openParty(),
    onChange: () => game.modules.get(MODULE_ID).api?.openParty()
  };

  tokenControl.tools.pcStatsVertical = {
    name: "pcStatsVertical",
    title: "PCSTATS.OpenVertical",
    icon: "fa-solid fa-grip-lines-vertical",
    button: true,
    onClick: () => game.modules.get(MODULE_ID).api?.openVertical(),
    onChange: () => game.modules.get(MODULE_ID).api?.openVertical()
  };
});
