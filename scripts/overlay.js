import { MODULE_ID, OVERLAYS, defaultOverlayConfig } from "./constants.js";
import { getActorViewData } from "./data.js";

const DEFAULT_TRANSITION_S = 0.25;

// Thematic fonts for the serif font option (loaded into the popout head only
// when that option is active). Falls back to serif if Google can't be reached.
const FONT_LINKS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=IM+Fell+English&display=swap">`;

// Base CSS injected into the popout document. Colors/fonts/backgrounds are NOT
// set here — those come from the per-overlay config via the dynamic style block,
// so every visual is editable in the config window.
const BASE_CSS = `
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
    gap: 18px;
    padding: 12px 22px;
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
  }
  .pcs-plate .pcs-field { text-align: center; }
  .pcs-plate .pcs-hpbar { min-width: 90px; }
  .pcs-portrait {
    aspect-ratio: 1 / 1;
    object-fit: cover;
    border: 2px solid rgba(255,255,255,0.55);
    box-shadow: 0 2px 8px rgba(0,0,0,0.45);
  }
  .pcs-divider {
    width: 2px;
    align-self: stretch;
    min-height: 1.5em;
    border-radius: 2px;
    opacity: 0.6;
  }
  .pcs-field { line-height: 1.15; white-space: nowrap; }
  .pcs-name { font-weight: 700; }
  .pcs-message { font-weight: 700; text-align: center; white-space: nowrap; letter-spacing: 0.5px; }
  .pcs-hpbar {
    position: relative;
    width: 100%;
    min-width: 120px;
    height: 0.55em;
    margin-top: 4px;
    border-radius: 4px;
    overflow: hidden;
  }
  .pcs-hpbar > span {
    position: absolute;
    inset: 0;
    transform-origin: left center;
  }
  .pcs-abilities { display: flex; gap: 12px; }
  .pcs-ability { text-align: center; }
  .pcs-ability b { display: block; font-size: 0.7em; opacity: 0.85; }
  .pcs-conditions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .pcs-condition { display: flex; align-items: center; gap: 4px; }
  .pcs-condition img { height: 1.1em; width: 1.1em; }

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
  .pcs-hit-damage { color: #a01e12; }
  .pcs-hit-heal { color: #3f7d28; }
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
  @keyframes pcs-flash-damage {
    0%   { filter: drop-shadow(0 0 0 rgba(255,0,0,0)); }
    25%  { filter: drop-shadow(0 0 14px rgba(220,40,40,0.9)); }
    100% { filter: drop-shadow(0 0 0 rgba(255,0,0,0)); }
  }
  @keyframes pcs-flash-heal {
    0%   { filter: drop-shadow(0 0 0 rgba(0,255,0,0)); }
    25%  { filter: drop-shadow(0 0 14px rgba(60,180,90,0.9)); }
    100% { filter: drop-shadow(0 0 0 rgba(0,255,0,0)); }
  }
  .pcs-flash-damage { animation: pcs-flash-damage 0.9s ease-out, pcs-shake 0.5s ease-in-out; }
  .pcs-flash-heal { animation: pcs-flash-heal 0.9s ease-out; }

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

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

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

function hexToRgba(hex, alpha) {
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

function renderField(f, view, cfg) {
  const fs = `style="${fieldStyle(f)}"`;
  switch (f.key) {
    case "portrait": {
      if (!view.img) return "";
      const size = num(cfg.portraitSize, 120);
      const radius = cfg.portraitShape === "circle" ? "50%"
        : cfg.portraitShape === "square" ? "0" : "8px";
      return `<img class="pcs-portrait" src="${esc(view.img)}" style="height:${size}px;border-radius:${radius}">`;
    }
    case "name":
      return `<div class="pcs-field pcs-name" ${fs}>${esc(view.name)}</div>`;
    case "hp": {
      if (view.hp.value === null && view.hp.max === null) return "";
      const temp = view.hp.temp ? ` (+${esc(view.hp.temp)})` : "";
      const fill = `background:linear-gradient(90deg, ${esc(cfg.hpBarLow)}, ${esc(cfg.hpBarHigh)});transform:scaleX(${(view.hp.pct / 100).toFixed(3)})`;
      const bar = cfg.showHpBar
        ? `<div class="pcs-hpbar" style="background:${esc(cfg.hpBarBg)}"><span style="${fill}"></span></div>`
        : "";
      return `<div class="pcs-field" ${fs}>HP <span class="pcs-hp-value">${esc(view.hp.value)}</span>/${esc(view.hp.max)}${temp}${bar}</div>`;
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
    case "conditions": {
      if (!view.conditions.length) return "";
      const items = view.conditions.map(c =>
        `<span class="pcs-condition">${c.img ? `<img src="${esc(c.img)}">` : ""}${esc(c.label)}</span>`
      ).join("");
      return `<div class="pcs-field pcs-conditions" ${fs}>${items}</div>`;
    }
    default:
      return "";
  }
}

function buildFieldParts(view, cfg) {
  return [...(cfg.fieldConfig ?? [])]
    .filter(f => f.enabled)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(f => renderField(f, view, cfg))
    .filter(html => html !== "");
}

function buildCardHTML(view, cfg) {
  const parts = buildFieldParts(view, cfg);
  if (cfg.showDividers && parts.length > 1) {
    const divider = `<div class="pcs-divider" style="background:${esc(cfg.dividerColor)}"></div>`;
    return parts.join(divider);
  }
  return parts.join("");
}

function buildMessageHTML(message, cfg) {
  let s = `font-size:${num(cfg.messageFontSize, 26)}px;`;
  if (cfg.messageColor) s += `color:${cfg.messageColor};`;
  return `<div class="pcs-field pcs-message" style="${s}">${esc(message.text)}</div>`;
}

export class OverlayController {
  constructor(key) {
    this.key = key;                       // "banner" | "party"
    this.mode = OVERLAYS[key].mode;       // "carousel" | "party"
    this.popup = null;
    this.index = 0;
    this.rotateTimer = null;
    this._hookIds = [];
    this.animating = false;
    this.eventQueue = [];
    this.hpCache = new Map();
    this._lastEventActorId = null;
  }

  get isOpen() {
    return this.popup && !this.popup.closed;
  }

  cfg() {
    const stored = game.settings.get(MODULE_ID, `${this.key}Config`) ?? {};
    return foundry.utils.mergeObject(defaultOverlayConfig(this.mode), stored, { inplace: false });
  }

  getActors(cfg = this.cfg()) {
    return (cfg.selectedActors ?? []).map(id => game.actors.get(id)).filter(a => a);
  }

  getMessages(cfg = this.cfg()) {
    return (cfg.customMessages ?? []).filter(m => m && m.enabled && String(m.text ?? "").trim() !== "");
  }

  // Build the carousel queue: character slides with sponsor/custom messages
  // sprinkled in at the configured frequency.
  getSlides(cfg = this.cfg()) {
    const actors = this.getActors(cfg).map(a => ({ type: "actor", actor: a }));
    const messages = this.getMessages(cfg).map(m => ({ type: "message", message: m }));
    if (!messages.length) return actors;
    if (!actors.length) return messages;

    const freq = num(cfg.messageFrequency, 0);
    if (freq <= 0) return actors;

    const out = [];
    let mi = 0;
    actors.forEach((slide, i) => {
      out.push(slide);
      if ((i + 1) % freq === 0) {
        out.push(messages[mi % messages.length]);
        mi++;
      }
    });
    if (mi === 0) out.push(...messages);
    return out;
  }

  _initHpCache() {
    this.hpCache = new Map();
    for (const a of this.getActors()) {
      const v = a.system?.attributes?.hp?.value;
      if (v != null) this.hpCache.set(a.id, v);
    }
  }

  open() {
    if (this.isOpen) {
      this.popup.focus();
      return;
    }
    const cfg = this.cfg();
    const width = num(cfg.bannerWidth, 960);
    const height = num(cfg.bannerHeight, 120);
    this.popup = window.open("", OVERLAYS[this.key].windowName,
      `width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no`);
    if (!this.popup) {
      ui.notifications.error(game.i18n.localize("PCSTATS.PopupBlocked"));
      return;
    }
    this._writeSkeleton(cfg);
    this.index = 0;
    this.animating = false;
    this.eventQueue = [];
    this._initHpCache();
    this.render();
    this.startRotation();
  }

  close() {
    this.stopRotation();
    if (this.isOpen) this.popup.close();
    this.popup = null;
  }

  _dynamicCss(cfg) {
    const serif = cfg.fontFamily === "serif";
    const bodyFont = serif
      ? `"IM Fell English", Georgia, "Times New Roman", serif`
      : `"Signika", "Helvetica Neue", Arial, sans-serif`;
    const dispFont = serif ? `"Cinzel", Georgia, serif` : bodyFont;

    const a = Math.clamp(num(cfg.cardOpacity, 1), 0, 1);
    const bg = cfg.cardEnabled
      ? `linear-gradient(180deg, ${lighten(cfg.cardColor, 0.14, a)} 0%, ${hexToRgba(cfg.cardColor, a)} 55%, ${darken(cfg.cardColor, 0.10, a)} 100%)`
      : "transparent";
    const border = cfg.borderEnabled ? `${num(cfg.borderWidth, 2)}px solid ${cfg.borderColor}` : "none";
    const shadow = cfg.cardEnabled
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

  _writeSkeleton(cfg = this.cfg()) {
    const serif = cfg.fontFamily === "serif";
    const fonts = serif ? FONT_LINKS : "";
    const css = BASE_CSS + this._dynamicCss(cfg);

    let body;
    if (this.mode === "carousel") {
      body = `<div id="pcs-root"><div id="pcs-scale"><div id="pcs-card" class="pcs-card-bg"></div></div></div>`;
    } else if (this.mode === "vertical") {
      body = `<div id="pcs-root" class="pcs-vertical-root"><div id="pcs-party" class="pcs-vertical"></div></div>`;
    } else {
      body = `<div id="pcs-root" class="pcs-party-root"><div id="pcs-party"></div></div>`;
    }

    const doc = this.popup.document;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>PC Stats Overlay</title>${fonts}<style>${css}</style></head>
      <body style="background:${esc(cfg.bgColor)};color:${esc(cfg.textColor)}">
        ${body}
      </body></html>`);
    doc.close();
  }

  render() {
    if (!this.isOpen || this.animating) return;
    if (this.mode === "carousel") this._renderCarousel();
    else this._renderParty();
  }

  // When maxWidth/maxHeight are set, scale the whole composition (fonts,
  // portraits, bars — everything) to fit within that box, preserving the
  // relative font sizes the user chose. When unset, content renders at the
  // configured sizes.
  _applyScale(el, cfg) {
    if (!el) return;
    const maxW = num(cfg.maxWidth, 0);
    const maxH = num(cfg.maxHeight, 0);
    el.style.transform = "none";
    if (maxW <= 0 && maxH <= 0) return;
    const w = el.scrollWidth || el.offsetWidth;
    const h = el.scrollHeight || el.offsetHeight;
    if (!w || !h) return;
    let factor = Infinity;
    if (maxW > 0) factor = Math.min(factor, maxW / w);
    if (maxH > 0) factor = Math.min(factor, maxH / h);
    if (!Number.isFinite(factor)) return;
    factor = Math.max(0.05, Math.min(factor, 10));
    el.style.transform = `scale(${factor.toFixed(4)})`;
  }

  _scaleEl() {
    return this.popup.document.getElementById("pcs-scale");
  }

  _animateCardOut(card, anim, dur) {
    if (anim === "none" || dur <= 0) { card.style.opacity = "0"; return; }
    card.style.animation = `pcs-${anim}-out ${dur}ms ease forwards`;
  }

  _animateCardIn(card, anim, dur) {
    if (anim === "none" || dur <= 0) { card.style.animation = ""; card.style.opacity = "1"; return; }
    card.style.animation = `pcs-${anim}-in ${dur}ms ease forwards`;
  }

  // skipOut: the card is already hidden (e.g. coming out of a blank gap), so
  // just swap content and animate the new card in.
  _renderCarousel(skipOut = false) {
    const card = this.popup.document.getElementById("pcs-card");
    if (!card) return;

    const cfg = this.cfg();
    const slides = this.getSlides(cfg);
    if (!slides.length) {
      card.innerHTML = `<div class="pcs-field" style="font-size:20px">${game.i18n.localize("PCSTATS.NoCharacters")}</div>`;
      this._applyScale(this._scaleEl(), cfg);
      return;
    }

    if (this.index >= slides.length) this.index = 0;
    const slide = slides[this.index];
    const html = slide.type === "message"
      ? buildMessageHTML(slide.message, cfg)
      : buildCardHTML(getActorViewData(slide.actor), cfg);

    const anim = cfg.cardAnimation || "fade";
    const dur = Math.round(num(cfg.cardTransition, DEFAULT_TRANSITION_S) * 1000);

    const swap = () => {
      const c = this.isOpen ? this.popup.document.getElementById("pcs-card") : null;
      if (!c || this.animating) return;
      c.innerHTML = html;
      this._applyScale(this._scaleEl(), cfg);
      this._animateCardIn(c, anim, dur);
    };

    if (skipOut || anim === "none" || dur <= 0) {
      swap();
      return;
    }
    this._animateCardOut(card, anim, dur);
    this.popup.setTimeout(swap, dur);
  }

  _renderParty() {
    const party = this.popup.document.getElementById("pcs-party");
    if (!party) return;

    const cfg = this.cfg();
    const actors = this.getActors(cfg);
    if (!actors.length) {
      party.innerHTML = `<div class="pcs-field" style="font-size:20px">${game.i18n.localize("PCSTATS.NoCharacters")}</div>`;
      return;
    }

    party.innerHTML = actors.map(a => {
      const parts = buildFieldParts(getActorViewData(a), cfg);
      return `<div class="pcs-plate pcs-card-bg" data-actor-id="${esc(a.id)}">${parts.join("")}</div>`;
    }).join("");
    this._applyScale(party, cfg);
  }

  _advanceIndex() {
    const slides = this.getSlides();
    if (slides.length <= 1) return false;
    this.index = (this.index + 1) % slides.length;
    return true;
  }

  advance() {
    if (this.animating || this.mode !== "carousel") return;
    if (this._advanceIndex()) this._renderCarousel();
  }

  // Rotation runs as a self-rescheduling chain so we can insert an optional
  // blank gap (the banner goes empty) between cards: display -> [blank gap] ->
  // next card -> display -> ...
  startRotation() {
    this.stopRotation();
    if (this.mode !== "carousel") return;
    const cfg = this.cfg();
    const display = num(cfg.rotateInterval, 0);
    if (display <= 0) return;
    if (this.getSlides(cfg).length <= 1) return;
    this.rotateTimer = setTimeout(() => this._rotateTick(), display * 1000);
  }

  _rotateTick() {
    if (!this.isOpen || this.animating) return;
    const cfg = this.cfg();
    const display = num(cfg.rotateInterval, 0);
    if (display <= 0) return;

    const gap = num(cfg.cardGap, 0);
    if (gap > 0) {
      const card = this.popup.document.getElementById("pcs-card");
      const anim = cfg.cardAnimation || "fade";
      const dur = Math.round(num(cfg.cardTransition, DEFAULT_TRANSITION_S) * 1000);
      if (card) this._animateCardOut(card, anim, dur); // animate out, then blank during the gap
      this.rotateTimer = setTimeout(() => {
        if (!this.isOpen || this.animating) return;
        if (this._advanceIndex()) this._renderCarousel(true); // card already hidden
        this.rotateTimer = setTimeout(() => this._rotateTick(), num(this.cfg().rotateInterval, 0) * 1000);
      }, gap * 1000);
    } else {
      this.advance();
      this.rotateTimer = setTimeout(() => this._rotateTick(), display * 1000);
    }
  }

  stopRotation() {
    if (this.rotateTimer) {
      clearTimeout(this.rotateTimer);
      this.rotateTimer = null;
    }
  }

  // --- Combat damage / heal animation -------------------------------------

  onUpdateActor(actor, changes) {
    if (!this.isOpen) return;

    const cfg = this.cfg();
    const hpChanged = foundry.utils.hasProperty(changes, "system.attributes.hp.value");
    const newVal = actor.system?.attributes?.hp?.value ?? null;
    const oldVal = this.hpCache.get(actor.id);
    const max = actor.system?.attributes?.hp?.max ?? null;
    if (newVal != null) this.hpCache.set(actor.id, newVal);

    const inCombat = !!(game.combat && game.combat.started);
    const combatOnly = cfg.animationsCombatOnly !== false;
    const selected = (cfg.selectedActors ?? []).includes(actor.id);

    if (hpChanged && cfg.combatAnimations && (!combatOnly || inCombat) && selected
      && oldVal != null && newVal != null && newVal !== oldVal) {
      const event = { actorId: actor.id, delta: newVal - oldVal, oldHp: oldVal, newHp: newVal, max };
      if (this.animating) this.eventQueue.push(event);
      else this.playEvent(event);
      return;
    }

    if (!this.animating) this.render();
  }

  playEvent(event) {
    if (!this.isOpen) return;
    this._lastEventActorId = event.actorId;
    if (this.mode === "carousel") this._playEventCarousel(event);
    else this._playEventParty(event);
  }

  _playEventCarousel(event) {
    this.animating = true;
    this.stopRotation();

    const card = this.popup.document.getElementById("pcs-card");
    const actor = game.actors.get(event.actorId);
    if (!card || !actor) { this.finishEvent(); return; }

    const cfg = this.cfg();
    card.style.animation = ""; // drop any lingering transition animation
    card.style.opacity = "1";
    card.innerHTML = buildCardHTML(getActorViewData(actor), cfg);
    this._applyScale(this._scaleEl(), cfg);
    this._flashTarget(card, event);

    const dur = num(cfg.combatAnimDuration, 3) * 1000;
    this.popup.setTimeout(() => this.finishEvent(), dur);
  }

  _playEventParty(event) {
    this.animating = true;

    const party = this.popup.document.getElementById("pcs-party");
    const plate = party
      ? [...party.querySelectorAll(".pcs-plate")].find(p => p.dataset.actorId === event.actorId)
      : null;
    if (!plate) { this.finishEvent(); return; }

    this._flashTarget(plate, event);

    const dur = num(this.cfg().combatAnimDuration, 3) * 1000;
    this.popup.setTimeout(() => this.finishEvent(), dur);
  }

  // Apply the flash/shake, floating number, and HP count-up/down to one element.
  _flashTarget(el, event) {
    const isHeal = event.delta > 0;
    el.style.animation = ""; // let the class-based flash animation take over
    el.classList.remove("pcs-flash-damage", "pcs-flash-heal");
    void el.offsetWidth; // restart the CSS animation
    el.classList.add(isHeal ? "pcs-flash-heal" : "pcs-flash-damage");

    const hit = this.popup.document.createElement("div");
    hit.className = "pcs-hit " + (isHeal ? "pcs-hit-heal" : "pcs-hit-damage");
    hit.textContent = (isHeal ? "+" : "−") + Math.abs(event.delta);
    el.appendChild(hit);

    this._animateHp(el, event.oldHp, event.newHp, event.max, 900);
  }

  _animateHp(root, from, to, max, duration) {
    const win = this.popup;
    const valueEl = root.querySelector(".pcs-hp-value");
    const barEl = root.querySelector(".pcs-hpbar > span");
    const setFrame = (cur) => {
      if (valueEl) valueEl.textContent = String(cur);
      if (barEl && max) barEl.style.transform = `scaleX(${Math.max(0, Math.min(1, cur / max)).toFixed(3)})`;
    };
    setFrame(from);
    if (from === to) return;
    const start = win.performance.now();
    const tick = (now) => {
      if (!this.isOpen) return;
      const t = Math.min(1, (now - start) / duration);
      setFrame(Math.round(from + (to - from) * t));
      if (t < 1) win.requestAnimationFrame(tick);
    };
    win.requestAnimationFrame(tick);
  }

  finishEvent() {
    // Another hit waiting? Play it straight away (no delay between hits).
    if (this.eventQueue.length) {
      this.playEvent(this.eventQueue.shift());
      return;
    }
    this.animating = false;

    if (this.mode === "carousel") {
      // Keep the hit character on screen and make the loop resume FROM that
      // character, then wait the normal display time before advancing — don't
      // snap to another card or restart the loop from the beginning.
      const card = this.isOpen ? this.popup.document.getElementById("pcs-card") : null;
      if (card) card.classList.remove("pcs-flash-damage", "pcs-flash-heal");
      const slides = this.getSlides();
      const idx = slides.findIndex(s => s.type === "actor" && s.actor?.id === this._lastEventActorId);
      if (idx >= 0) this.index = idx;
      this.startRotation();
    } else {
      // Party row: rebuild to clear the flash artifacts and sync values.
      this.render();
      this.startRotation();
    }
  }

  // Re-read config and reapply everything (called after the config window saves).
  reload() {
    if (!this.isOpen) return;
    this.animating = false;
    this.eventQueue = [];
    this._writeSkeleton();
    this._initHpCache();
    if (this.index >= this.getSlides().length) this.index = 0;
    this.render();
    this.startRotation();
  }

  registerHooks() {
    this._hookIds.push(["updateActor",
      Hooks.on("updateActor", (actor, changes) => this.onUpdateActor(actor, changes))]);

    const refresh = () => { if (this.isOpen && !this.animating) this.render(); };
    for (const hook of ["updateToken", "deleteActor",
      "createActiveEffect", "deleteActiveEffect", "updateActiveEffect", "updateCombat"]) {
      this._hookIds.push([hook, Hooks.on(hook, refresh)]);
    }
  }
}
