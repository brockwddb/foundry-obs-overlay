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

// The two independent overlays the module can run at once.
export const OVERLAYS = {
  banner: { mode: "carousel", windowName: "pcstats-banner" },
  party: { mode: "party", windowName: "pcstats-party" }
};

// One self-contained config object per overlay. The defaults ARE the parchment
// "default theme" — rendering reads these values directly, so everything here is
// editable in the config window and "Reset to defaults" restores this object.
export function defaultOverlayConfig(mode = "carousel") {
  const party = mode === "party";
  return {
    selectedActors: [],
    fieldConfig: defaultFieldConfig(),
    fontFamily: "serif",              // "serif" (parchment) | "default" (Signika)
    bgColor: "#00ff00",
    textColor: "#3a2a14",
    showHpBar: true,
    cardEnabled: true,
    cardColor: "#ecdcb4",
    cardOpacity: 1,
    cardRadius: 8,
    borderEnabled: true,
    borderColor: "#b08d3c",
    borderWidth: 2,
    portraitSize: party ? 64 : 90,
    portraitShape: "rounded",
    fieldGap: party ? 6 : 18,
    paddingX: party ? 12 : 22,
    paddingY: 8,
    showDividers: false,
    dividerColor: "#b08d3c",
    maxWidth: 0,
    maxHeight: 0,
    bannerWidth: party ? 1600 : 960,
    bannerHeight: party ? 150 : 120,
    combatAnimations: true,
    animationsCombatOnly: true,
    combatAnimDuration: 3,
    // Carousel/banner only:
    rotateInterval: 8,
    cardTransition: 0.25,
    cardGap: 0,
    customMessages: [],
    messageFrequency: 3,
    messageFontSize: 26,
    messageColor: "#5a3a16"
  };
}
