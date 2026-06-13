// Reads a dnd5e (v5.x) actor into a normalized view model for the overlay.
// Written defensively so missing fields never throw — they just render blank.

function getClassLabel(actor) {
  const classes = actor.itemTypes?.class ?? [];
  if (classes.length) {
    return classes
      .map(c => `${c.name} ${c.system?.levels ?? ""}`.trim())
      .join(" / ");
  }
  const level = actor.system?.details?.level;
  return level ? `Level ${level}` : "";
}

function getAbilities(actor) {
  const abilities = actor.system?.abilities ?? {};
  return Object.entries(abilities).map(([key, a]) => {
    const mod = Number(a?.mod ?? 0);
    return {
      key,
      label: (CONFIG.DND5E?.abilities?.[key]?.abbreviation ?? key).toUpperCase(),
      value: a?.value ?? null,
      mod,
      modStr: `${mod >= 0 ? "+" : ""}${mod}`
    };
  });
}

function getConditions(actor) {
  const statuses = actor.statuses ?? new Set();
  const out = [];
  for (const id of statuses) {
    const cfg = (CONFIG.statusEffects ?? []).find(s => s.id === id);
    const rawLabel = cfg?.name ?? cfg?.label ?? id;
    out.push({
      id,
      label: game.i18n.localize(rawLabel),
      img: cfg?.img ?? cfg?.icon ?? null
    });
  }
  return out;
}

export function getActorViewData(actor) {
  const sys = actor.system ?? {};
  const hp = sys.attributes?.hp ?? {};
  const ac = sys.attributes?.ac ?? {};

  return {
    id: actor.id,
    name: actor.name ?? "",
    img: actor.img ?? "",
    hp: {
      value: hp.value ?? null,
      max: hp.max ?? null,
      temp: hp.temp ?? 0,
      pct: hp.max ? Math.clamp((hp.value ?? 0) / hp.max * 100, 0, 100) : 0
    },
    ac: ac.value ?? null,
    level: sys.details?.level ?? null,
    classLabel: getClassLabel(actor),
    abilities: getAbilities(actor),
    conditions: getConditions(actor)
  };
}
