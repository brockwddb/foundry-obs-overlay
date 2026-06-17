import { MODULE_ID } from "./constants.js";
import { getActorViewData } from "./data.js";

// Curated fonts. `body`/`display` are CSS stacks; `google` lists Google Fonts
// css2 family specs to load into the popout (empty = system fonts only).
const FONTS = {
  serif: { body: `"IM Fell English", Georgia, serif`, display: `"Cinzel", Georgia, serif`, google: ["Cinzel:wght@600;700", "IM+Fell+English"] },
  default: { body: `"Signika", "Helvetica Neue", Arial, sans-serif`, display: null, google: [] },
  medieval: { body: `"MedievalSharp", Georgia, serif`, display: `"MedievalSharp", Georgia, serif`, google: ["MedievalSharp"] },
  uncial: { body: `"Cinzel", Georgia, serif`, display: `"Uncial Antiqua", Georgia, serif`, google: ["Cinzel:wght@600;700", "Uncial+Antiqua"] },
  modern: { body: `system-ui, "Segoe UI", Roboto, Arial, sans-serif`, display: null, google: [] }
};

function fontDef(key) {
  return FONTS[key] ?? FONTS.serif;
}

export function fontLinks(key) {
  const families = fontDef(key).google;
  if (!families.length) return "";
  const q = families.map(f => `family=${f}`).join("&");
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${q}&display=swap">`;
}

// Base CSS injected into the popout document. Colors/fonts/backgrounds are NOT
// set here — those come from the per-overlay config via the dynamic style block,
// so every visual is editable in the config window.
export const BASE_CSS = `
  html, body {
    margin: 0;
    padding: 0;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
  }
  #pcs-root {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    perspective: 1200px;
  }
  /* Scale wrapper carries the fit-to-box transform so the card itself is free
     to run transition/flash animations on its own transform. */
  #pcs-scale {
    display: inline-flex;
    transform-origin: center center;
    perspective: 1200px;
  }
  #pcs-card {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 18px;
    padding: 12px 22px;
    max-width: calc(100vw - 10px);
    box-sizing: border-box;
  }
  /* Vertical card: same rotating card, fields stacked in a column. Fills the
     window width so long fields wrap instead of clipping. */
  #pcs-card.pcs-card-col {
    flex-direction: column;
    flex-wrap: nowrap;
    align-items: center;
    text-align: center;
    width: calc(100vw - 10px);
    box-sizing: border-box;
  }
  #pcs-card.pcs-card-col .pcs-divider {
    width: auto;
    height: 2px;
    min-height: 0;
    align-self: stretch;
  }
  /* Party-row layout: one plate per character, sitting along the bottom. */
  #pcs-root.pcs-party-root { align-items: flex-end; }
  #pcs-party {
    width: 100%;
    display: flex;
    justify-content: space-evenly;
    align-items: flex-end;
    gap: 14px;
    padding: 6px 12px 10px;
    box-sizing: border-box;
    transform-origin: center bottom;
  }
  /* Vertical-bar layout: plates stacked in a column. */
  #pcs-root.pcs-vertical-root { align-items: center; justify-content: center; }
  #pcs-party.pcs-vertical {
    width: auto;
    height: 100%;
    flex-direction: column;
    justify-content: space-evenly;
    align-items: center;
    transform-origin: center center;
  }
  .pcs-plate {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 8px 12px;
    max-width: 100%;
    box-sizing: border-box;
  }
  .pcs-plate .pcs-field { text-align: center; }
  .pcs-plate .pcs-hpbar { min-width: 90px; }
  /* Square frame (explicit px size set inline) that carries the border/shape
     and clips the (optionally zoomed) portrait. border-radius rounds the border;
     clip-path (set inline per shape) clips the transformed <img> inside, since
     border-radius + overflow:hidden alone won't clip a transformed child. */
  .pcs-portrait-frame {
    overflow: hidden;
    background: rgba(0,0,0,0.15);
    box-shadow: 0 2px 8px rgba(0,0,0,0.45);
    flex: 0 0 auto;
  }
  .pcs-portrait {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
    object-position: center top;
  }
  .pcs-divider {
    width: 2px;
    align-self: stretch;
    min-height: 1.5em;
    border-radius: 2px;
    opacity: 0.6;
  }
  .pcs-field { line-height: 1.15; white-space: nowrap; min-width: 0; max-width: 100%; }
  .pcs-name { font-weight: 700; white-space: normal; overflow-wrap: anywhere; }
  .pcs-message { font-weight: 700; text-align: center; white-space: normal; overflow-wrap: anywhere; letter-spacing: 0.5px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .pcs-message-img { max-width: 100%; object-fit: contain; }
  @keyframes pcs-plate-in { from { opacity: 0; transform: translateY(14px) scale(0.96); } to { opacity: 1; transform: none; } }
  .pcs-plate-enter { animation: pcs-plate-in 0.5s ease-out both; }
  .pcs-hpbar {
    position: relative;
    width: 100%;
    min-width: 120px;
    height: 0.55em;
    margin-top: 4px;
    border-radius: 4px;
    overflow: hidden;
    background: #2a2018; /* solid fallback so the empty track is never transparent */
  }
  .pcs-hpbar > span {
    position: absolute;
    inset: 0;
    transform-origin: left center;
  }
  .pcs-abilities { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
  .pcs-ability { text-align: center; }
  .pcs-ability b { display: block; font-size: 0.7em; opacity: 0.85; }
  .pcs-conditions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .pcs-condition { display: flex; align-items: center; gap: 4px; }
  .pcs-condition img { height: 1.1em; width: 1.1em; }
  .pcs-deathsaves { display: flex; align-items: center; gap: 6px; }
  .pcs-ds-row { display: inline-flex; gap: 3px; }
  .pcs-pip { width: 0.6em; height: 0.6em; border-radius: 50%; display: inline-block; border: 1px solid rgba(0,0,0,0.4); }
  .pcs-pip-empty { background: rgba(0,0,0,0.15); }
  .pcs-pip-success { background: #4a7a3a; }
  .pcs-pip-failure { background: #a01e12; }
  .pcs-slots { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
  .pcs-slot b { opacity: 0.8; }
  .pcs-currency { letter-spacing: 0.5px; }

  /* Down / dead and active-turn states */
  .pcs-down {
    filter: grayscale(1) brightness(0.6);
    animation: pcs-down-pulse 1.7s ease-in-out infinite;
  }
  .pcs-down::after {
    content: "";
    position: absolute;
    inset: 0;
    background: rgba(40,0,0,0.4);
    border-radius: inherit;
    pointer-events: none;
    z-index: 2;
  }
  @keyframes pcs-down-pulse {
    0%, 100% { box-shadow: 0 0 0 rgba(170,20,20,0); }
    50% { box-shadow: 0 0 16px 2px rgba(170,20,20,0.55); }
  }
  .pcs-down-badge {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-7deg);
    font-weight: 900;
    font-size: 1.05em;
    letter-spacing: 2px;
    color: #fff;
    background: rgba(155,20,20,0.94);
    padding: 2px 14px;
    border-radius: 4px;
    border: 2px solid rgba(255,255,255,0.85);
    box-shadow: 0 2px 6px rgba(0,0,0,0.5);
    z-index: 5;
    /* not affected by the parent grayscale: filter is applied on the parent,
       but the stamp reads clearly over the darkened card */
  }
  .pcs-active-turn {
    outline: 3px solid var(--pcs-turn, #ffd700);
    outline-offset: 2px;
    animation: pcs-turn-pulse 1.6s ease-in-out infinite;
  }
  @keyframes pcs-turn-pulse {
    0%, 100% { box-shadow: 0 0 8px var(--pcs-turn, #ffd700); }
    50% { box-shadow: 0 0 22px var(--pcs-turn, #ffd700); }
  }

  /* Combat hit / heal animation */
  .pcs-hit {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    font-size: 2.4em;
    font-weight: 900;
    pointer-events: none;
    text-shadow: 0 2px 6px rgba(0,0,0,0.6), 0 0 4px rgba(255,255,255,0.5);
    animation: pcs-hit-float 1.4s ease-out forwards;
    z-index: 5;
  }
  /* .pcs-hit colors are set inline from config (damageColor / healColor). */
  @keyframes pcs-hit-float {
    0%   { opacity: 0; transform: translate(-50%, 0) scale(0.5); }
    15%  { opacity: 1; transform: translate(-50%, -18px) scale(1.15); }
    70%  { opacity: 1; transform: translate(-50%, -34px) scale(1); }
    100% { opacity: 0; transform: translate(-50%, -60px) scale(0.95); }
  }
  @keyframes pcs-shake {
    0%, 100% { transform: translateX(0); }
    15% { transform: translateX(-7px); }
    30% { transform: translateX(7px); }
    45% { transform: translateX(-5px); }
    60% { transform: translateX(5px); }
    75% { transform: translateX(-3px); }
    90% { transform: translateX(3px); }
  }
  @keyframes pcs-flash {
    0%   { filter: drop-shadow(0 0 0 transparent); }
    25%  { filter: drop-shadow(0 0 14px var(--pcs-flash, rgba(220,40,40,0.9))); }
    100% { filter: drop-shadow(0 0 0 transparent); }
  }
  .pcs-flash-damage { animation: pcs-flash 0.9s ease-out, pcs-shake 0.5s ease-in-out; }
  .pcs-flash-heal { animation: pcs-flash 0.9s ease-out; }
  @keyframes pcs-pop { 0% { transform: scale(1); } 30% { transform: scale(1.06); } 100% { transform: scale(1); } }
  .pcs-flair-crit { animation: pcs-flash 1.2s ease-out, pcs-pop 0.5s ease-out; }
  .pcs-flair-fumble { animation: pcs-flash 1.2s ease-out, pcs-shake 0.5s ease-in-out; }
  .pcs-flair-text { font-size: 2.9em; font-weight: 900; letter-spacing: 1px; }

  /* Featured-character intro */
  .pcs-featured {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    text-align: center;
  }
  .pcs-featured-text {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }
  /* Portrait-on-left layout: portrait beside the text instead of above it. */
  .pcs-featured.pcs-featured-left {
    flex-direction: row;
    align-items: center;
    gap: 16px;
    text-align: left;
  }
  .pcs-featured.pcs-featured-left .pcs-featured-text { align-items: flex-start; }
  /* The featured portrait is a .pcs-portrait-frame; this just adds the entrance
     animation. clip-path coexists with the animation transform. */
  .pcs-featured-portrait {
    opacity: 0.95;
    animation: pcs-featured-portrait 0.7s ease-out;
  }
  .pcs-featured-label {
    font-size: 0.72em;
    letter-spacing: 5px;
    text-transform: uppercase;
    opacity: 0.85;
    animation: pcs-featured-label 0.8s ease-out both;
  }
  .pcs-featured-name {
    font-weight: 900;
    font-size: 1.7em;
    line-height: 1.1;
    animation: pcs-featured-name 0.8s cubic-bezier(0.2, 0.9, 0.3, 1.2) both;
  }
  .pcs-featured-bio {
    font-style: italic;
    opacity: 0.9;
    max-width: 32em;
    line-height: 1.35;
    white-space: pre-line;
    overflow-wrap: anywhere;
    animation: pcs-featured-name 0.9s ease-out both;
    animation-delay: 0.12s;
  }
  @keyframes pcs-featured-portrait { 0% { opacity: 0; transform: scale(0.5); } 100% { opacity: 0.95; transform: none; } }
  @keyframes pcs-featured-label { 0% { opacity: 0; letter-spacing: 14px; } 100% { opacity: 0.85; letter-spacing: 5px; } }
  @keyframes pcs-featured-name { 0% { opacity: 0; transform: translateY(10px) scale(0.92); } 100% { opacity: 1; transform: none; } }

  /* Card transition animations (banner) */
  @keyframes pcs-fade-out { to { opacity: 0; } }
  @keyframes pcs-fade-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pcs-slide-out { to { opacity: 0; transform: translateX(-45px); } }
  @keyframes pcs-slide-in { from { opacity: 0; transform: translateX(45px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes pcs-slidev-out { to { opacity: 0; transform: translateY(-40px); } }
  @keyframes pcs-slidev-in { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pcs-wipe-out { from { clip-path: inset(0 0 0 0); } to { clip-path: inset(0 0 0 100%); } }
  @keyframes pcs-wipe-in { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
  @keyframes pcs-zoom-out { to { opacity: 0; transform: scale(0.7); } }
  @keyframes pcs-zoom-in { from { opacity: 0; transform: scale(0.7); } to { opacity: 1; transform: scale(1); } }
  @keyframes pcs-flip-out { to { opacity: 0; transform: rotateY(90deg); } }
  @keyframes pcs-flip-in { from { opacity: 0; transform: rotateY(-90deg); } to { opacity: 1; transform: rotateY(0); } }
`;

export function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

export function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }
export function lcm(a, b) { return (a && b) ? Math.abs(a * b) / gcd(a, b) : 0; }

// Mix a hex color toward white (255) or black (0) by amt, returning rgba.
function mix(hex, target, amt, alpha) {
  const h = String(hex ?? "").replace("#", "");
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return `rgba(0,0,0,${Math.clamp(Number(alpha) || 0, 0, 1)})`;
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.round(r + (target - r) * amt);
  g = Math.round(g + (target - g) * amt);
  b = Math.round(b + (target - b) * amt);
  return `rgba(${r},${g},${b},${Math.clamp(Number(alpha) ?? 1, 0, 1)})`;
}
const lighten = (hex, amt, a) => mix(hex, 255, amt, a);
const darken = (hex, amt, a) => mix(hex, 0, amt, a);

export function hexToRgba(hex, alpha) {
  const h = String(hex ?? "").replace("#", "");
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return `rgba(0,0,0,${Math.clamp(Number(alpha) || 0, 0, 1)})`;
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${Math.clamp(Number(alpha) ?? 1, 0, 1)})`;
}

function fieldStyle(f) {
  let s = `font-size:${num(f.fontSize, 18)}px;`;
  if (f.colorEnabled && f.color) s += `color:${f.color};`;
  return s;
}

// When "color HP by health" is on, pick the threshold color for the current %.
function hpHealthColor(view, cfg) {
  if (!cfg.hpColorByHealth) return "";
  const pct = view.hp.pct;
  if (pct <= num(cfg.hpLowThreshold, 25)) return cfg.hpLowColor || "";
  if (pct <= num(cfg.hpMidThreshold, 50)) return cfg.hpMidColor || "";
  return cfg.hpHighColor || "";
}

function renderField(f, view, cfg) {
  const fs = `style="${fieldStyle(f)}"`;
  switch (f.key) {
    case "portrait": {
      const style = characterStyle(view.id);
      const useToken = style.portrait === "token";
      const src = (useToken && view.tokenImg) ? view.tokenImg : view.img;
      if (!src) return "";
      const size = num(cfg.portraitSize, 120);
      return `<div class="pcs-portrait-frame" style="height:${size}px;width:${size}px;${portraitShapeCss(cfg.portraitShape)}${portraitBorderCss(cfg)}">` +
        `<img class="pcs-portrait" src="${esc(src)}" style="${portraitImgStyle(style)}"></div>`;
    }
    case "name":
      return `<div class="pcs-field pcs-name" ${fs}>${esc(view.name)}</div>`;
    case "hp": {
      if (view.hp.value === null && view.hp.max === null) return "";
      const temp = view.hp.temp ? ` (+${esc(view.hp.temp)})` : "";
      const fill = `background:linear-gradient(90deg, ${esc(cfg.hpBarLow)}, ${esc(cfg.hpBarHigh)});transform:scaleX(${(view.hp.pct / 100).toFixed(3)})`;
      const trackBg = cfg.hpBarBg ? `background:${esc(cfg.hpBarBg)};` : "";
      const bar = cfg.showHpBar
        ? `<div class="pcs-hpbar" style="${trackBg}"><span style="${fill}"></span></div>`
        : "";
      const healthColor = hpHealthColor(view, cfg);
      const hpStyle = fieldStyle(f) + (healthColor ? `color:${healthColor};` : "");
      return `<div class="pcs-field" style="${hpStyle}">HP <span class="pcs-hp-value">${esc(view.hp.value)}</span>/${esc(view.hp.max)}${temp}${bar}</div>`;
    }
    case "ac":
      return view.ac === null ? "" : `<div class="pcs-field" ${fs}>AC ${esc(view.ac)}</div>`;
    case "abilities": {
      if (!view.abilities.length) return "";
      const cells = view.abilities.map(a =>
        `<div class="pcs-ability"><b>${esc(a.label)}</b>${esc(a.value)} <small>${esc(a.modStr)}</small></div>`
      ).join("");
      return `<div class="pcs-field pcs-abilities" ${fs}>${cells}</div>`;
    }
    case "classLevel":
      return view.classLabel ? `<div class="pcs-field" ${fs}>${esc(view.classLabel)}</div>` : "";
    case "race":
      return view.race ? `<div class="pcs-field" ${fs}>${esc(view.race)}</div>` : "";
    case "conditions": {
      if (!view.conditions.length) return "";
      const items = view.conditions.map(c =>
        `<span class="pcs-condition">${c.img ? `<img src="${esc(c.img)}">` : ""}${esc(c.label)}</span>`
      ).join("");
      return `<div class="pcs-field pcs-conditions" ${fs}>${items}</div>`;
    }
    case "deathSaves": {
      if (!view.deathSaves.relevant) return "";
      const pips = (n, filledClass) =>
        [0, 1, 2].map(i => `<span class="pcs-pip ${i < n ? filledClass : "pcs-pip-empty"}"></span>`).join("");
      return `<div class="pcs-field pcs-deathsaves" ${fs}>` +
        `<span class="pcs-ds-label">Death</span>` +
        `<span class="pcs-ds-row" title="Successes">${pips(view.deathSaves.success, "pcs-pip-success")}</span>` +
        `<span class="pcs-ds-row" title="Failures">${pips(view.deathSaves.failure, "pcs-pip-failure")}</span>` +
        `</div>`;
    }
    case "initiative": {
      const init = actorInitiative(view.id);
      return init === null ? "" : `<div class="pcs-field" ${fs}>Init ${esc(init)}</div>`;
    }
    case "concentration":
      return view.concentration ? `<div class="pcs-field pcs-conc" ${fs}>✦ Conc.</div>` : "";
    case "inspiration":
      return view.inspiration ? `<div class="pcs-field pcs-insp" ${fs}>★ Insp.</div>` : "";
    case "exhaustion":
      return view.exhaustion > 0 ? `<div class="pcs-field" ${fs}>Exh. ${esc(view.exhaustion)}</div>` : "";
    case "spellSlots": {
      if (!view.spellSlots.length) return "";
      const cells = view.spellSlots.map(s =>
        `<span class="pcs-slot"><b>${esc(s.label)}</b> ${esc(s.value)}/${esc(s.max)}</span>`
      ).join("");
      return `<div class="pcs-field pcs-slots" ${fs}>${cells}</div>`;
    }
    case "passivePerception":
      return view.passivePerception === null ? "" : `<div class="pcs-field" ${fs}>PP ${esc(view.passivePerception)}</div>`;
    case "profBonus": {
      if (view.profBonus === null) return "";
      const p = Number(view.profBonus);
      return `<div class="pcs-field" ${fs}>Prof ${p >= 0 ? "+" : ""}${esc(p)}</div>`;
    }
    case "currency": {
      if (!view.currency.length) return "";
      const cells = view.currency.map(c => `${esc(c.value)}${esc(c.key)}`).join(" ");
      return `<div class="pcs-field pcs-currency" ${fs}>${cells}</div>`;
    }
    default:
      return "";
  }
}

// Current initiative for an actor from the active combat, or null.
function actorInitiative(actorId) {
  const combat = game.combat;
  if (!combat || !combat.started) return null;
  const c = combat.combatants.find(cb => cb.actorId === actorId);
  return c && c.initiative !== null && c.initiative !== undefined ? c.initiative : null;
}

// Actor id whose turn it currently is, or null.
export function activeCombatantActorId() {
  const combat = game.combat;
  if (!combat || !combat.started) return null;
  return combat.combatant?.actorId ?? null;
}

// Inspect a chat message's rolls for a natural 20 / natural 1 on a d20.
export function rollFlairType(message) {
  for (const roll of message.rolls ?? []) {
    for (const die of roll.dice ?? []) {
      if (die.faces !== 20) continue;
      for (const r of die.results ?? []) {
        if (r.active === false) continue;
        if (r.result === 20) return "crit";
        if (r.result === 1) return "fumble";
      }
    }
  }
  return null;
}

// Per-character identity (accent color / portrait source), shared across overlays.
export function characterStyle(actorId) {
  return (game.settings.get(MODULE_ID, "characterStyles") ?? {})[actorId] ?? {};
}

// Per-character portrait crop: focal point (x/y as %) + zoom (>= 1 tightens the
// crop). Defaults reproduce the historical "center top" framing at no zoom.
function portraitCrop(style) {
  const c = style?.crop ?? {};
  return {
    x: Math.clamp(num(c.x, 50), 0, 100),
    y: Math.clamp(num(c.y, 0), 0, 100),
    zoom: Math.clamp(num(c.zoom, 1), 1, 5)
  };
}

// Inline style for a portrait <img>: anchor the focal point and zoom around it.
function portraitImgStyle(style) {
  const c = portraitCrop(style);
  return `object-position:${c.x}% ${c.y}%;transform:scale(${c.zoom});transform-origin:${c.x}% ${c.y}%;`;
}

// Border for the portrait frame, driven by the per-overlay config.
function portraitBorderCss(cfg) {
  if (cfg.portraitBorderEnabled === false) return "border:none;";
  const w = num(cfg.portraitBorderWidth, 2);
  return `border:${w}px solid ${esc(cfg.portraitBorderColor || "#ffffff")};`;
}

// border-radius (rounds the frame/border) and a matching clip-path (clips the
// zoomed image, which border-radius alone can't do for a transformed child).
function portraitShapeCss(shape) {
  if (shape === "circle") return "border-radius:50%;clip-path:circle(50%);";
  if (shape === "square") return "border-radius:0;";
  return "border-radius:8px;clip-path:inset(0 round 8px);";
}

export function buildFieldParts(view, cfg) {
  return [...(cfg.fieldConfig ?? [])]
    .filter(f => f.enabled)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(f => renderField(f, view, cfg))
    .filter(html => html !== "");
}

export function downBadge(view, cfg) {
  if (!cfg.showDownState || !view.down) return "";
  return `<div class="pcs-down-badge">${esc(game.i18n.localize("PCSTATS.Down"))}</div>`;
}

// Per-character accent frame, if set. Falls back to "" (use the configured border).
export function accentBorderCss(actorId, cfg) {
  const accent = characterStyle(actorId).accent;
  return accent ? `border:${num(cfg.borderWidth, 2) || 2}px solid ${accent};` : "";
}

export function buildCardHTML(view, cfg) {
  const parts = buildFieldParts(view, cfg);
  const divider = `<div class="pcs-divider" style="background:${esc(cfg.dividerColor)}"></div>`;
  const body = (cfg.showDividers && parts.length > 1) ? parts.join(divider) : parts.join("");
  return downBadge(view, cfg) + body;
}

export function dynamicCss(cfg) {
  const font = fontDef(cfg.fontFamily);
  const bodyFont = font.body;
  const dispFont = font.display ?? font.body;

  const a = Math.clamp(num(cfg.cardOpacity, 1), 0, 1);
  const texture = String(cfg.textureUrl ?? "").replace(/["'()\\]/g, "");
  let bg = "transparent";
  if (cfg.cardEnabled) {
    bg = texture
      ? `url("${texture}") center/cover no-repeat`
      : `linear-gradient(180deg, ${lighten(cfg.cardColor, 0.14, a)} 0%, ${hexToRgba(cfg.cardColor, a)} 55%, ${darken(cfg.cardColor, 0.10, a)} 100%)`;
  }
  const border = cfg.borderEnabled ? `${num(cfg.borderWidth, 2)}px solid ${cfg.borderColor}` : "none";
  const shadow = (cfg.cardEnabled && cfg.plateShadow !== false)
    ? "box-shadow: 0 4px 12px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.25);"
    : "";
  const textShadow = cfg.cardEnabled ? "none" : "0 2px 4px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.9)";

  const gap = num(cfg.fieldGap, 18);
  const padX = num(cfg.paddingX, 22);
  const padY = num(cfg.paddingY, 12);

  return `
    body { font-family: ${bodyFont}; text-shadow: ${textShadow}; }
    .pcs-name, .pcs-message { font-family: ${dispFont}; }
    #pcs-card { gap: ${gap}px; padding: ${padY}px ${padX}px; }
    .pcs-plate { gap: ${gap}px; padding: ${padY}px ${padX}px; }
    .pcs-card-bg {
      background: ${bg};
      border: ${border};
      border-radius: ${num(cfg.cardRadius, 8)}px;
      ${shadow}
    }
  `;
}

// A sample character used by the config live preview when no real actor is
// selected (so the preview always shows something).
const SAMPLE_VIEW = {
  id: "__sample__",
  name: "Sample Hero",
  img: "icons/svg/mystery-man.svg",
  tokenImg: "icons/svg/mystery-man.svg",
  hp: { value: 22, max: 30, temp: 0, pct: 73 },
  down: false,
  ac: 16,
  level: 5,
  classLabel: "Fighter 5",
  race: "Half-Elf",
  abilities: ["STR", "DEX", "CON", "INT", "WIS", "CHA"].map((label, i) => ({
    key: label.toLowerCase(), label, value: 14 + i % 3, mod: 2, modStr: "+2"
  })),
  conditions: [],
  deathSaves: { success: 0, failure: 0, relevant: false },
  concentration: false,
  inspiration: false,
  exhaustion: 0,
  spellSlots: [],
  passivePerception: 14,
  profBonus: 3,
  currency: []
};

function previewViews(cfg, count, start = 0) {
  const actors = (cfg.selectedActors ?? []).map(id => game.actors?.get(id)).filter(a => a);
  if (!actors.length) return Array.from({ length: Math.min(count, 3) }, () => SAMPLE_VIEW);
  const n = Math.min(count, actors.length);
  const out = [];
  for (let i = 0; i < n; i++) out.push(getActorViewData(actors[(start + i) % actors.length]));
  return out;
}

// Bake a damage/heal/crit/fumble animation into a static element so it replays
// when the preview iframe reloads. Returns extra class, CSS var, and overlay.
function stateDecoration(cfg, state) {
  const make = (cls, color, text, textCls) => ({
    cls,
    varStyle: `--pcs-flash:${hexToRgba(color, 0.92)};`,
    overlay: `<div class="pcs-hit ${textCls}" style="color:${esc(color)}">${esc(text)}</div>`
  });
  switch (state) {
    case "damage": return make("pcs-flash-damage", cfg.damageColor || "#a01e12", "−7", "pcs-hit-damage");
    case "heal": return make("pcs-flash-heal", cfg.healColor || "#3f7d28", "+5", "pcs-hit-heal");
    case "crit": return make("pcs-flair-crit", cfg.critColor || "#ffd700", "NAT 20!", "pcs-flair-text");
    case "fumble": return make("pcs-flair-fumble", cfg.fumbleColor || "#7a2230", "NAT 1!", "pcs-flair-text");
    default: return { cls: "", varStyle: "", overlay: "" };
  }
}

function sampleMessage(cfg) {
  return (cfg.customMessages ?? []).find(m => m.enabled && (String(m.text ?? "").trim() || m.image))
    ?? { text: "Tonight's stream sponsored by Acme Dice!" };
}

function previewPlateHTML(view, cfg, deco) {
  const parts = buildFieldParts(view, cfg);
  const cls = ["pcs-plate", "pcs-card-bg"];
  if (cfg.showDownState && view.down) cls.push("pcs-down");
  if (deco?.cls) cls.push(deco.cls);
  const style = `--pcs-turn:${esc(cfg.turnColor || "#ffd700")};${accentBorderCss(view.id, cfg)}${deco?.varStyle ?? ""}`;
  return `<div class="${cls.join(" ")}" style="${style}">${downBadge(view, cfg)}${parts.join("")}${deco?.overlay ?? ""}</div>`;
}

// Extra CSS for the preview only: a simple centered wrapper that we scale to
// fit, instead of the real overlay's bottom-aligned / full-width roots.
const PREVIEW_CSS = `
  #pcs-root.pcs-preview-root { align-items: center; justify-content: center; }
  #pcs-fit { transform-origin: center center; display: inline-flex; }
  .pcs-prev-row { display: flex; align-items: stretch; gap: 14px; }
  .pcs-prev-col { display: flex; flex-direction: column; align-items: center; gap: 10px; }
`;

// Build a self-contained HTML document for the live preview iframe.
// state: null | "message" | "damage" | "heal" | "crit" | "fumble".
export function buildPreviewDocument(cfg, mode, column, state = null, start = 0) {
  const css = BASE_CSS + dynamicCss(cfg) + PREVIEW_CSS;
  const fonts = fontLinks(cfg.fontFamily);
  const deco = stateDecoration(cfg, state);

  let content;
  if (mode === "carousel") {
    const cardClass = column ? "pcs-card-bg pcs-card-col" : "pcs-card-bg";
    const view = previewViews(cfg, 1, start)[0];
    const downCls = (state !== "message" && cfg.showDownState && view.down) ? " pcs-down" : "";
    let inner;
    if (state === "message") inner = buildMessageHTML(sampleMessage(cfg), cfg);
    else if (state === "intro") inner = buildIntroHTML(view, cfg);
    else inner = buildCardHTML(view, cfg) + deco.overlay;
    content = `<div id="pcs-card" class="${cardClass} ${deco.cls}${downCls}" style="${deco.varStyle}">${inner}</div>`;
  } else {
    const limit = mode === "vertical" ? 2 : 3; // column is taller, show fewer
    const plates = previewViews(cfg, limit, start).map((v, i) => previewPlateHTML(v, cfg, i === 0 ? deco : null)).join("");
    const dir = mode === "vertical" ? "pcs-prev-col" : "pcs-prev-row";
    content = `<div class="${dir}">${plates}</div>`;
  }

  const body = `<div id="pcs-root" class="pcs-preview-root"><div id="pcs-fit">${content}</div></div>`;

  // Even out plate sizes, then scale the wrapper to fit the preview iframe.
  const fitScript = `<script>(function(){
    function equalize(){
      var ps=[].slice.call(document.querySelectorAll('.pcs-plate'));
      if(ps.length<2)return;
      ps.forEach(function(p){p.style.width='';p.style.minHeight='';});
      var mw=0,mh=0;
      ps.forEach(function(p){mw=Math.max(mw,p.offsetWidth);mh=Math.max(mh,p.offsetHeight);});
      ps.forEach(function(p){p.style.width=mw+'px';p.style.minHeight=mh+'px';});
    }
    function fit(){
      var el=document.getElementById('pcs-fit');
      if(!el)return;
      equalize();
      el.style.transform='none';
      var w=el.scrollWidth||el.offsetWidth, h=el.scrollHeight||el.offsetHeight;
      if(!w||!h)return;
      var s=Math.min((window.innerWidth-12)/w,(window.innerHeight-12)/h,1);
      el.style.transform='scale('+s.toFixed(4)+')';
    }
    fit(); window.addEventListener('resize',fit); setTimeout(fit,60);
  })();<\/script>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8">${fonts}<style>${css}</style></head>
    <body style="background:${esc(cfg.bgColor)};color:${esc(cfg.textColor)}">${body}${fitScript}</body></html>`;
}

// Animated "Featured Character" lead-in shown before each banner card.
export function buildIntroHTML(view, cfg) {
  const style = characterStyle(view.id);
  const useToken = style.portrait === "token";
  const src = (useToken && view.tokenImg) ? view.tokenImg : view.img;
  const pSize = num(cfg.introPortraitSize, 48);
  const portrait = (src && pSize > 0)
    ? `<div class="pcs-portrait-frame pcs-featured-portrait" style="height:${pSize}px;width:${pSize}px;${portraitShapeCss(cfg.portraitShape)}${portraitBorderCss(cfg)}">` +
        `<img class="pcs-portrait" src="${esc(src)}" style="${portraitImgStyle(style)}"></div>`
    : "";
  const label = esc(style.intro || cfg.featuredText || "Featured Character");
  const bioText = String(style.bio ?? "").trim();
  const bio = bioText
    ? `<div class="pcs-featured-bio" style="font-size:${num(cfg.introBioSize, 16)}px">${esc(bioText)}</div>`
    : "";
  const layoutCls = cfg.introLayout === "left" ? " pcs-featured-left" : "";
  return `<div class="pcs-featured${layoutCls}">${portrait}` +
    `<div class="pcs-featured-text">` +
      `<div class="pcs-featured-label">${label}</div>` +
      `<div class="pcs-featured-name pcs-name" style="font-size:${num(cfg.introNameSize, 28)}px">${esc(view.name)}</div>` +
      `${bio}` +
    `</div></div>`;
}

export function buildMessageHTML(message, cfg) {
  let s = `font-size:${num(cfg.messageFontSize, 26)}px;`;
  if (cfg.messageColor) s += `color:${cfg.messageColor};`;
  const img = message.image
    ? `<img class="pcs-message-img" src="${esc(message.image)}" style="max-height:${num(cfg.messageImageHeight, 80)}px">`
    : "";
  const text = String(message.text ?? "").trim() ? `<div>${esc(message.text)}</div>` : "";
  return `<div class="pcs-field pcs-message" style="${s}">${img}${text}</div>`;
}
