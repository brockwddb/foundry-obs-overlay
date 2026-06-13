import { MODULE_ID } from "./constants.js";
import { getActorViewData } from "./data.js";

const FADE_MS = 250;

// CSS injected directly into the popout document (the popout doesn't share the
// main page's stylesheet, so everything the banner needs lives here).
const OVERLAY_CSS = `
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
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 12px 22px;
    transition: opacity ${FADE_MS}ms ease-in-out;
    text-shadow: 0 2px 4px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.9);
  }
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
      return `<div class="pcs-field" ${fs}>HP ${esc(view.hp.value)}/${esc(view.hp.max)}${temp}${bar}</div>`;
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

function buildCardHTML(view, fieldConfig, opts) {
  const ordered = [...fieldConfig]
    .filter(f => f.enabled)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const parts = ordered.map(f => renderField(f, view, opts)).filter(html => html !== "");
  if (opts.showDividers && parts.length > 1) {
    const divider = `<div class="pcs-divider" style="background:${esc(opts.dividerColor)}"></div>`;
    return parts.join(divider);
  }
  return parts.join("");
}

export class OverlayController {
  constructor() {
    this.popup = null;
    this.index = 0;
    this.rotateTimer = null;
    this._hookIds = [];
  }

  get isOpen() {
    return this.popup && !this.popup.closed;
  }

  getActors() {
    const ids = game.settings.get(MODULE_ID, "selectedActors") ?? [];
    return ids.map(id => game.actors.get(id)).filter(a => a);
  }

  open() {
    if (this.isOpen) {
      this.popup.focus();
      return;
    }
    const height = game.settings.get(MODULE_ID, "bannerHeight") ?? 220;
    this.popup = window.open("", "pcstats-overlay", `width=960,height=${height},menubar=no,toolbar=no,location=no,status=no`);
    if (!this.popup) {
      ui.notifications.error(game.i18n.localize("PCSTATS.PopupBlocked"));
      return;
    }
    this._writeSkeleton();
    this.index = 0;
    this.render();
    this.startRotation();
  }

  close() {
    this.stopRotation();
    if (this.isOpen) this.popup.close();
    this.popup = null;
  }

  _writeSkeleton() {
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
    if (cardEnabled) {
      cardStyle += `background:${hexToRgba(cardColor, cardOpacity)};border-radius:${Number(cardRadius) || 0}px;`;
    }

    const doc = this.popup.document;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>PC Stats Overlay</title><style>${OVERLAY_CSS}</style></head>
      <body style="background:${esc(bg)};color:${esc(textColor)}">
        <div id="pcs-root"><div id="pcs-card" style="${cardStyle}"></div></div>
      </body></html>`);
    doc.close();
  }

  render() {
    if (!this.isOpen) return;
    const actors = this.getActors();
    const card = this.popup.document.getElementById("pcs-card");
    if (!card) return;

    if (!actors.length) {
      card.innerHTML = `<div class="pcs-field" style="font-size:20px">${game.i18n.localize("PCSTATS.NoCharacters")}</div>`;
      return;
    }

    if (this.index >= actors.length) this.index = 0;
    const view = getActorViewData(actors[this.index]);
    const fieldConfig = game.settings.get(MODULE_ID, "fieldConfig") ?? [];
    const opts = {
      showHpBar: game.settings.get(MODULE_ID, "showHpBar") ?? true,
      showDividers: game.settings.get(MODULE_ID, "showDividers") ?? false,
      dividerColor: game.settings.get(MODULE_ID, "dividerColor") ?? "#ffffff",
      portraitSize: game.settings.get(MODULE_ID, "portraitSize") ?? 120,
      portraitShape: game.settings.get(MODULE_ID, "portraitShape") ?? "rounded"
    };
    const html = buildCardHTML(view, fieldConfig, opts);

    card.style.opacity = "0";
    this.popup.setTimeout(() => {
      const c = this.isOpen ? this.popup.document.getElementById("pcs-card") : null;
      if (!c) return;
      c.innerHTML = html;
      c.style.opacity = "1";
    }, FADE_MS);
  }

  advance() {
    const actors = this.getActors();
    if (actors.length <= 1) return;
    this.index = (this.index + 1) % actors.length;
    this.render();
  }

  startRotation() {
    this.stopRotation();
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

  // Re-read settings and reapply everything (called after config changes).
  reload() {
    if (!this.isOpen) return;
    this._writeSkeleton();
    if (this.index >= this.getActors().length) this.index = 0;
    this.render();
    this.startRotation();
  }

  registerHooks() {
    const refresh = () => { if (this.isOpen) this.render(); };
    for (const hook of ["updateActor", "updateToken", "deleteActor",
      "createActiveEffect", "deleteActiveEffect", "updateActiveEffect", "updateCombat"]) {
      this._hookIds.push([hook, Hooks.on(hook, refresh)]);
    }
  }
}
