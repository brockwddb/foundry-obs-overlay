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
    order: i,
    colorEnabled: false,
    color: ""
  }));
}

// The independent overlays the module can run at once.
// mode drives rendering: "carousel" = single rotating card (row of fields, or a
// column when `column` is set), "party"/"vertical" = all characters as plates.
export const OVERLAYS = {
  banner: { mode: "carousel", windowName: "pcstats-banner" },
  verticalcard: { mode: "carousel", windowName: "pcstats-verticalcard", column: true },
  party: { mode: "party", windowName: "pcstats-party" },
  vertical: { mode: "vertical", windowName: "pcstats-vertical" }
};

// Selectable card transition animations (banner/carousel only).
export const CARD_ANIMATIONS = ["fade", "slide", "slidev", "wipe", "zoom", "flip", "none"];

// One self-contained config object per overlay. The defaults ARE the parchment
// "default theme" — rendering reads these values directly, so everything here is
// editable in the config window and "Reset to defaults" restores this object.
export function defaultOverlayConfig(keyOrMode = "banner") {
  const entry = OVERLAYS[keyOrMode];
  const mode = entry ? entry.mode : keyOrMode;
  const column = entry ? !!entry.column : false;
  const plates = mode === "party" || mode === "vertical"; // multi-character layouts
  const vcard = mode === "carousel" && column;            // single vertical card

  let bannerWidth, bannerHeight, portraitSize, fieldGap, paddingX;
  if (plates) {
    portraitSize = 64; fieldGap = 6; paddingX = 12;
    bannerWidth = mode === "vertical" ? 360 : 1600;
    bannerHeight = mode === "vertical" ? 900 : 150;
  } else if (vcard) {
    portraitSize = 110; fieldGap = 8; paddingX = 18;
    bannerWidth = 360; bannerHeight = 600;
  } else { // horizontal banner
    portraitSize = 90; fieldGap = 18; paddingX = 22;
    bannerWidth = 960; bannerHeight = 120;
  }

  return {
    selectedActors: [],
    fieldConfig: defaultFieldConfig(),
    fontFamily: "serif",              // "serif" (parchment) | "default" (Signika)
    bgColor: "#00ff00",
    textColor: "#3a2a14",
    showHpBar: true,
    hpBarLow: "#9b2d20",
    hpBarHigh: "#6f9b3a",
    hpBarBg: "#2a2018",
    cardEnabled: true,
    cardColor: "#ecdcb4",
    cardOpacity: 1,
    cardRadius: 8,
    borderEnabled: true,
    borderColor: "#b08d3c",
    borderWidth: 2,
    portraitSize,
    portraitShape: "rounded",
    fieldGap,
    paddingX,
    paddingY: 8,
    showDividers: false,
    dividerColor: "#b08d3c",
    maxWidth: 0,
    maxHeight: 0,
    bannerWidth,
    bannerHeight,
    combatAnimations: true,
    animationsCombatOnly: true,
    combatAnimDuration: 3,
    // Carousel/banner only:
    rotateInterval: 8,
    cardTransition: 0.25,
    cardGap: 0,
    cardAnimation: "fade",
    customMessages: [],
    messageFrequency: 3,
    messageFontSize: 26,
    messageColor: "#5a3a16"
  };
}
