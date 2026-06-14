export const MODULE_ID = "pc-stats-obs-overlay";

// Display fields in their default order. Keys are referenced by the renderer.
export const FIELD_DEFS = {
  portrait: "PCSTATS.FieldPortrait",
  name: "PCSTATS.FieldName",
  hp: "PCSTATS.FieldHP",
  ac: "PCSTATS.FieldAC",
  abilities: "PCSTATS.FieldAbilities",
  classLevel: "PCSTATS.FieldClassLevel",
  conditions: "PCSTATS.FieldConditions",
  deathSaves: "PCSTATS.FieldDeathSaves",
  initiative: "PCSTATS.FieldInitiative",
  concentration: "PCSTATS.FieldConcentration",
  inspiration: "PCSTATS.FieldInspiration",
  exhaustion: "PCSTATS.FieldExhaustion",
  spellSlots: "PCSTATS.FieldSpellSlots",
  passivePerception: "PCSTATS.FieldPassivePerception",
  profBonus: "PCSTATS.FieldProfBonus",
  currency: "PCSTATS.FieldCurrency"
};

// Fields shown by default; everything else starts disabled to avoid clutter.
const DEFAULT_ON_FIELDS = new Set([
  "portrait", "name", "hp", "ac", "abilities", "classLevel", "conditions"
]);

export function defaultFieldConfig() {
  return Object.keys(FIELD_DEFS).map((key, i) => ({
    key,
    enabled: DEFAULT_ON_FIELDS.has(key),
    fontSize: key === "name" ? 28 : 18,
    order: i,
    colorEnabled: false,
    color: ""
  }));
}

// The independent overlays the module can run at once.
// mode drives rendering: "carousel" = single rotating card (row of fields, or a
// column when `column` is set), "party"/"vertical" = all characters as plates
// (a horizontal row or a vertical column respectively).
export const OVERLAYS = {
  horizontalBanner: { mode: "carousel", windowName: "pcstats-horizontal-banner", windowTitle: "PC Stats — Horizontal Banner" },
  verticalBanner: { mode: "carousel", column: true, windowName: "pcstats-vertical-banner", windowTitle: "PC Stats — Vertical Banner" },
  partyRow: { mode: "party", windowName: "pcstats-party-row", windowTitle: "PC Stats — Party Row" },
  partyColumn: { mode: "vertical", windowName: "pcstats-party-column", windowTitle: "PC Stats — Party Column" }
};

// Overlay keys in display order (shared by the menu and the config tabs).
export const OVERLAY_KEYS = ["horizontalBanner", "verticalBanner", "partyRow", "partyColumn"];

// Selectable card transition animations (banner/carousel only).
export const CARD_ANIMATIONS = ["fade", "slide", "slidev", "wipe", "zoom", "flip", "none"];

// One self-contained config object per overlay. The defaults ARE the parchment
// "default theme" — rendering reads these values directly, so everything here is
// editable in the config window and "Reset to defaults" restores this object.
export function defaultOverlayConfig(keyOrMode = "horizontalBanner") {
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
    hpColorByHealth: false,
    hpHighColor: "#4a7a3a",
    hpMidColor: "#b8860b",
    hpLowColor: "#a01e12",
    hpMidThreshold: 50,
    hpLowThreshold: 25,
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
    damageColor: "#a01e12",
    healColor: "#3f7d28",
    showDownState: true,
    highlightActiveTurn: true,
    turnColor: "#ffd700",
    spotlightCurrentTurn: false,
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
