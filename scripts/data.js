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

function getSpellSlots(actor) {
  const spells = actor.system?.spells ?? {};
  const out = [];
  for (let lvl = 1; lvl <= 9; lvl++) {
    const s = spells[`spell${lvl}`];
    if (s && Number(s.max) > 0) out.push({ label: String(lvl), value: s.value ?? 0, max: s.max ?? 0 });
  }
  const pact = spells.pact;
  if (pact && Number(pact.max) > 0) {
    out.push({ label: `P${pact.level ?? ""}`.trim(), value: pact.value ?? 0, max: pact.max ?? 0 });
  }
  return out;
}

function getCurrency(actor) {
  const c = actor.system?.currency ?? {};
  return ["pp", "gp", "ep", "sp", "cp"]
    .map(k => ({ key: k, value: Number(c[k] ?? 0) }))
    .filter(x => x.value > 0);
}

function isConcentrating(actor) {
  if (actor.statuses?.has?.("concentrating")) return true;
  // dnd5e v3+ also exposes a concentration effects collection.
  const conc = actor.concentration?.effects;
  if (conc && conc.size > 0) return true;
  return false;
}

export function getActorViewData(actor) {
  const sys = actor.system ?? {};
  const hp = sys.attributes?.hp ?? {};
  const ac = sys.attributes?.ac ?? {};
  const death = sys.attributes?.death ?? {};
  const hpValue = hp.value ?? null;
  const hpMax = hp.max ?? null;
  const down = hpValue != null && hpMax ? hpValue <= 0 : false;

  return {
    id: actor.id,
    name: actor.name ?? "",
    img: actor.img ?? "",
    tokenImg: actor.prototypeToken?.texture?.src ?? actor.img ?? "",
    hp: {
      value: hpValue,
      max: hpMax,
      temp: hp.temp ?? 0,
      pct: hpMax ? Math.clamp((hpValue ?? 0) / hpMax * 100, 0, 100) : 0
    },
    down,
    ac: ac.value ?? null,
    level: sys.details?.level ?? null,
    classLabel: getClassLabel(actor),
    abilities: getAbilities(actor),
    conditions: getConditions(actor),
    deathSaves: {
      success: Number(death.success ?? 0),
      failure: Number(death.failure ?? 0),
      relevant: down || Number(death.success ?? 0) > 0 || Number(death.failure ?? 0) > 0
    },
    concentration: isConcentrating(actor),
    inspiration: !!sys.attributes?.inspiration,
    exhaustion: Number(sys.attributes?.exhaustion ?? 0),
    spellSlots: getSpellSlots(actor),
    passivePerception: sys.skills?.prc?.passive ?? null,
    profBonus: sys.attributes?.prof ?? null,
    currency: getCurrency(actor)
  };
}
