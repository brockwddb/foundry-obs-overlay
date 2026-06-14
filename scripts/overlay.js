import { MODULE_ID } from "./constants.js";
import { getActorViewData } from "./data.js";

const FADE_MS = 250;

// Thematic fonts for the parchment theme (loaded into the popout head only when
// that theme is active). Falls back to serif if the popout can't reach Google.
const FONT_LINKS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=IM+Fell+English&display=swap">`;

// Base CSS injected into the popout document (the popout doesn't share the main
// page's stylesheet, so everything the banner needs lives here).
const BASE_CSS = `
  html, body {
    margin: 0;
    padding: 0;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    font-family: "Signika", "Helvetica Neue", Arial, sans-serif;
    color: #ffffff;
  }
  #pcs-root {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  #pcs-card {
    position: relative;
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 12px 22px;
    transition: opacity ${FADE_MS}ms ease-in-out;
    text-shadow: 0 2px 4px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.9);
  }
  /* Party-row layout: one plate per character, sitting along the bottom. */
  #pcs-root.pcs-party-root { align-items: flex-end; }
  #pcs-party {
    width: 100%;
    display: flex;
    justify-content: space-evenly;
    align-items: flex-end;
    gap: 12px;
    padding: 6px 12px 10px;
    box-sizing: border-box;
  }
  .pcs-plate {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 8px 12px;
    border-radius: 8px;
    background: rgba(0,0,0,0.5);
    text-shadow: 0 2px 4px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.9);
  }
  .pcs-plate .pcs-field { text-align: center; }
  .pcs-plate .pcs-hpbar { min-width: 90px; }
  .pcs-portrait {
    aspect-ratio: 1 / 1;
    object-fit: cover;
    border: 2px solid rgba(255,255,255,0.85);
    box-shadow: 0 2px 8px rgba(0,0,0,0.6);
  }
  .pcs-divider {
    width: 2px;
    align-self: stretch;
    min-height: 1.5em;
    border-radius: 2px;
    opacity: 0.55;
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
    background: rgba(0,0,0,0.55);
    overflow: hidden;
  }
  .pcs-hpbar > span {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, #c0392b, #2ecc71);
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
    text-shadow: 0 2px 6px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.9);
    animation: pcs-hit-float 1.4s ease-out forwards;
    z-index: 5;
  }
  .pcs-hit-damage { color: #ff4d4d; }
  .pcs-hit-heal { color: #56e06a; }
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
    25%  { filter: drop-shadow(0 0 14px rgba(255,40,40,0.95)); }
    100% { filter: drop-shadow(0 0 0 rgba(255,0,0,0)); }
  }
  @keyframes pcs-flash-heal {
    0%   { filter: drop-shadow(0 0 0 rgba(0,255,0,0)); }
    25%  { filter: drop-shadow(0 0 14px rgba(60,220,90,0.95)); }
    100% { filter: drop-shadow(0 0 0 rgba(0,255,0,0)); }
  }
  .pcs-flash-damage { animation: pcs-flash-damage 0.9s ease-out, pcs-shake 0.5s ease-in-out; }
  .pcs-flash-heal { animation: pcs-flash-heal 0.9s ease-out; }
`;

// Parchment & ink theme — layered over BASE_CSS, scoped to a body class so the
// base styles stay untouched.
const PARCHMENT_CSS = `
  body.pcs-theme-parchment { font-family: "IM Fell English", Georgia, "Times New Roman", serif; color: #3a2a14; }
  body.pcs-theme-parchment #pcs-card,
  body.pcs-theme-parchment .pcs-plate {
    background: radial-gradient(120% 140% at 50% 0%, #f7eed6 0%, #ecdcb4 65%, #ddc795 100%);
    border: 2px solid #b08d3c;
    box-shadow: 0 0 0 2px #6f5a2a, 0 4px 12px rgba(0,0,0,0.5), inset 0 0 22px rgba(120,90,40,0.22);
    color: #3a2a14;
    text-shadow: none;
  }
  body.pcs-theme-parchment .pcs-field { color: #3a2a14; text-shadow: none; }
  body.pcs-theme-parchment .pcs-name,
  body.pcs-theme-parchment .pcs-message {
    font-family: "Cinzel", Georgia, serif;
    font-weight: 700;
    color: #5a3a16;
    letter-spacing: 1px;
  }
  body.pcs-theme-parchment .pcs-portrait { border-color: #b08d3c; box-shadow: 0 2px 6px rgba(0,0,0,0.5); }
  body.pcs-theme-parchment .pcs-hpbar { background: rgba(58,42,20,0.28); }
  body.pcs-theme-parchment .pcs-hpbar > span { background: linear-gradient(90deg, #9b2d20, #6f9b3a); }
  body.pcs-theme-parchment .pcs-divider { background: #b08d3c !important; opacity: 0.75; }
  body.pcs-theme-parchment .pcs-ability b { color: #6f5a2a; opacity: 1; }
  body.pcs-theme-parchment .pcs-hit-damage { color: #a01e12; }
  body.pcs-theme-parchment .pcs-hit-heal { color: #3f7d28; }
`;

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function hexToRgba(hex, alpha) {
  const h = String(hex ?? "").replace("#", "");
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return `rgba(0,0,0,${Math.clamp(Number(alpha) || 0, 0, 1)})`;
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${Math.clamp(Number(alpha) ?? 1, 0, 1)})`;
}

function fieldStyle(f) {
  let s = `font-size:${Number(f.fontSize) || 18}px;`;
  if (f.colorEnabled && f.color) s += `color:${f.color};`;
  return s;
}

function renderField(f, view, opts) {
  const fs = `style="${fieldStyle(f)}"`;
  switch (f.key) {
    case "portrait": {
      if (!view.img) return "";
      const size = Number(opts.portraitSize) || 120;
      const radius = opts.portraitShape === "circle" ? "50%"
        : opts.portraitShape === "square" ? "0" : "8px";
      return `<img class="pcs-portrait" src="${esc(view.img)}" style="height:${size}px;border-radius:${radius}">`;
    }
    case "name":
      return `<div class="pcs-field pcs-name" ${fs}>${esc(view.name)}</div>`;
    case "hp": {
      if (view.hp.value === null && view.hp.max === null) return "";
      const temp = view.hp.temp ? ` (+${esc(view.hp.temp)})` : "";
      const bar = opts.showHpBar
        ? `<div class="pcs-hpbar"><span style="transform:scaleX(${(view.hp.pct / 100).toFixed(3)})"></span></div>`
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

function buildFieldParts(view, fieldConfig, opts) {
  return [...fieldConfig]
    .filter(f => f.enabled)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(f => renderField(f, view, opts))
    .filter(html => html !== "");
}

function buildCardHTML(view, fieldConfig, opts) {
  const parts = buildFieldParts(view, fieldConfig, opts);
  if (opts.showDividers && parts.length > 1) {
    const divider = `<div class="pcs-divider" style="background:${esc(opts.dividerColor)}"></div>`;
    return parts.join(divider);
  }
  return parts.join("");
}

function buildMessageHTML(message, opts) {
  let s = `font-size:${Number(opts.messageFontSize) || 26}px;`;
  if (opts.messageColor) s += `color:${opts.messageColor};`;
  return `<div class="pcs-field pcs-message" style="${s}">${esc(message.text)}</div>`;
}

export class OverlayController {
  constructor() {
    this.popup = null;
    this.index = 0;
    this.rotateTimer = null;
    this._hookIds = [];
    this.animating = false;
    this.eventQueue = [];
    this.hpCache = new Map();
  }

  get isOpen() {
    return this.popup && !this.popup.closed;
  }

  get layoutMode() {
    return game.settings.get(MODULE_ID, "layoutMode") ?? "carousel";
  }

  getActors() {
    const ids = game.settings.get(MODULE_ID, "selectedActors") ?? [];
    return ids.map(id => game.actors.get(id)).filter(a => a);
  }

  getMessages() {
    const msgs = game.settings.get(MODULE_ID, "customMessages") ?? [];
    return msgs.filter(m => m && m.enabled && String(m.text ?? "").trim() !== "");
  }

  // Build the carousel queue: character slides with sponsor/custom messages
  // sprinkled in at the configured frequency.
  getSlides() {
    const actors = this.getActors().map(a => ({ type: "actor", actor: a }));
    const messages = this.getMessages().map(m => ({ type: "message", message: m }));
    if (!messages.length) return actors;
    if (!actors.length) return messages;

    const freq = Number(game.settings.get(MODULE_ID, "messageFrequency")) || 0;
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
    // Fewer characters than the frequency: still show the messages once per cycle.
    if (mi === 0) out.push(...messages);
    return out;
  }

  _readOpts() {
    return {
      showHpBar: game.settings.get(MODULE_ID, "showHpBar") ?? true,
      showDividers: game.settings.get(MODULE_ID, "showDividers") ?? false,
      dividerColor: game.settings.get(MODULE_ID, "dividerColor") ?? "#ffffff",
      portraitSize: game.settings.get(MODULE_ID, "portraitSize") ?? 120,
      portraitShape: game.settings.get(MODULE_ID, "portraitShape") ?? "rounded",
      messageFontSize: game.settings.get(MODULE_ID, "messageFontSize") ?? 26,
      messageColor: game.settings.get(MODULE_ID, "messageColor") ?? "#ffd700"
    };
  }

  _slideHTML(slide, opts) {
    if (slide.type === "message") return buildMessageHTML(slide.message, opts);
    const view = getActorViewData(slide.actor);
    const fieldConfig = game.settings.get(MODULE_ID, "fieldConfig") ?? [];
    return buildCardHTML(view, fieldConfig, opts);
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
    const width = game.settings.get(MODULE_ID, "bannerWidth") ?? 960;
    const height = game.settings.get(MODULE_ID, "bannerHeight") ?? 120;
    this.popup = window.open("", "pcstats-overlay", `width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no`);
    if (!this.popup) {
      ui.notifications.error(game.i18n.localize("PCSTATS.PopupBlocked"));
      return;
    }
    this._writeSkeleton();
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

  _writeSkeleton() {
    const theme = game.settings.get(MODULE_ID, "theme") ?? "plain";
    const parchment = theme === "parchment";
    const bg = game.settings.get(MODULE_ID, "bgColor") ?? "#00ff00";
    const textColor = game.settings.get(MODULE_ID, "textColor") ?? "#ffffff";
    const cardEnabled = game.settings.get(MODULE_ID, "cardEnabled") ?? false;
    const cardColor = game.settings.get(MODULE_ID, "cardColor") ?? "#000000";
    const cardOpacity = game.settings.get(MODULE_ID, "cardOpacity") ?? 0.6;
    const cardRadius = game.settings.get(MODULE_ID, "cardRadius") ?? 16;

    const fieldGap = game.settings.get(MODULE_ID, "fieldGap") ?? 18;
    const padX = game.settings.get(MODULE_ID, "paddingX") ?? 22;
    const padY = game.settings.get(MODULE_ID, "paddingY") ?? 12;

    let cardStyle = `gap:${Number(fieldGap) || 0}px;padding:${Number(padY) || 0}px ${Number(padX) || 0}px;`;
    // The parchment theme draws its own plate; only the plain theme honours the
    // solid-background-bar setting via inline styles.
    if (cardEnabled && !parchment) {
      cardStyle += `background:${hexToRgba(cardColor, cardOpacity)};border-radius:${Number(cardRadius) || 0}px;`;
    }

    const body = this.layoutMode === "party"
      ? `<div id="pcs-root" class="pcs-party-root"><div id="pcs-party"></div></div>`
      : `<div id="pcs-root"><div id="pcs-card" style="${cardStyle}"></div></div>`;

    const fonts = parchment ? FONT_LINKS : "";
    const css = BASE_CSS + (parchment ? PARCHMENT_CSS : "");
    const bodyClass = parchment ? "pcs-theme-parchment" : "";

    const doc = this.popup.document;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>PC Stats Overlay</title>${fonts}<style>${css}</style></head>
      <body class="${bodyClass}" style="background:${esc(bg)};color:${esc(textColor)}">
        ${body}
      </body></html>`);
    doc.close();
  }

  render() {
    if (!this.isOpen || this.animating) return;
    if (this.layoutMode === "party") this._renderParty();
    else this._renderCarousel();
  }

  _renderCarousel() {
    const card = this.popup.document.getElementById("pcs-card");
    if (!card) return;

    const slides = this.getSlides();
    if (!slides.length) {
      card.innerHTML = `<div class="pcs-field" style="font-size:20px">${game.i18n.localize("PCSTATS.NoCharacters")}</div>`;
      return;
    }

    if (this.index >= slides.length) this.index = 0;
    const html = this._slideHTML(slides[this.index], this._readOpts());

    card.style.opacity = "0";
    this.popup.setTimeout(() => {
      const c = this.isOpen ? this.popup.document.getElementById("pcs-card") : null;
      if (!c || this.animating) return;
      c.innerHTML = html;
      c.style.opacity = "1";
    }, FADE_MS);
  }

  _renderParty() {
    const party = this.popup.document.getElementById("pcs-party");
    if (!party) return;

    const actors = this.getActors();
    if (!actors.length) {
      party.innerHTML = `<div class="pcs-field" style="font-size:20px">${game.i18n.localize("PCSTATS.NoCharacters")}</div>`;
      return;
    }

    const opts = this._readOpts();
    const fieldConfig = game.settings.get(MODULE_ID, "fieldConfig") ?? [];
    party.innerHTML = actors.map(a => {
      const parts = buildFieldParts(getActorViewData(a), fieldConfig, opts);
      return `<div class="pcs-plate" data-actor-id="${esc(a.id)}">${parts.join("")}</div>`;
    }).join("");
  }

  advance() {
    if (this.animating || this.layoutMode === "party") return;
    const slides = this.getSlides();
    if (slides.length <= 1) return;
    this.index = (this.index + 1) % slides.length;
    this.render();
  }

  startRotation() {
    this.stopRotation();
    if (this.layoutMode === "party") return;
    const interval = Number(game.settings.get(MODULE_ID, "rotateInterval")) || 0;
    if (interval > 0) {
      this.rotateTimer = setInterval(() => this.advance(), interval * 1000);
    }
  }

  stopRotation() {
    if (this.rotateTimer) {
      clearInterval(this.rotateTimer);
      this.rotateTimer = null;
    }
  }

  // --- Combat damage / heal animation -------------------------------------

  onUpdateActor(actor, changes) {
    if (!this.isOpen) return;

    const hpChanged = foundry.utils.hasProperty(changes, "system.attributes.hp.value");
    const newVal = actor.system?.attributes?.hp?.value ?? null;
    const oldVal = this.hpCache.get(actor.id);
    const max = actor.system?.attributes?.hp?.max ?? null;
    if (newVal != null) this.hpCache.set(actor.id, newVal);

    const animEnabled = game.settings.get(MODULE_ID, "combatAnimations") ?? true;
    const inCombat = !!(game.combat && game.combat.started);
    const selected = this.getActors().some(a => a.id === actor.id);

    if (hpChanged && animEnabled && inCombat && selected
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
    if (this.layoutMode === "party") this._playEventParty(event);
    else this._playEventCarousel(event);
  }

  _playEventCarousel(event) {
    this.animating = true;
    this.stopRotation();

    const card = this.popup.document.getElementById("pcs-card");
    const actor = game.actors.get(event.actorId);
    if (!card || !actor) { this.finishEvent(); return; }

    // Snap straight to the hit character (no fade) and render their current card.
    const view = getActorViewData(actor);
    const fieldConfig = game.settings.get(MODULE_ID, "fieldConfig") ?? [];
    card.style.opacity = "1";
    card.innerHTML = buildCardHTML(view, fieldConfig, this._readOpts());

    this._flashTarget(card, event);

    const dur = (Number(game.settings.get(MODULE_ID, "combatAnimDuration")) || 3) * 1000;
    this.popup.setTimeout(() => this.finishEvent(), dur);
  }

  _playEventParty(event) {
    this.animating = true;

    const party = this.popup.document.getElementById("pcs-party");
    const plate = party
      ? [...party.querySelectorAll(".pcs-plate")].find(p => p.dataset.actorId === event.actorId)
      : null;
    if (!plate) { this.finishEvent(); return; }

    // The plate is already on screen showing the old HP — flash it in place.
    this._flashTarget(plate, event);

    const dur = (Number(game.settings.get(MODULE_ID, "combatAnimDuration")) || 3) * 1000;
    this.popup.setTimeout(() => this.finishEvent(), dur);
  }

  // Apply the flash/shake, floating number, and HP count-up/down to one element.
  _flashTarget(el, event) {
    const isHeal = event.delta > 0;
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
    if (this.eventQueue.length) {
      this.playEvent(this.eventQueue.shift());
      return;
    }
    this.animating = false;
    this.render();
    this.startRotation();
  }

  // Re-read settings and reapply everything (called after config changes).
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
