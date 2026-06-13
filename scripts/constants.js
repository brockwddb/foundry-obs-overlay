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
    order: i
  }));
}
