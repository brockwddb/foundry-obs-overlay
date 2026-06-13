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
    height: 80%;
    max-height: 160px;
    aspect-ratio: 1 / 1;
    object-fit: cover;
    border-radius: 8px;
    border: 2px solid rgba(255,255,255,0.85);
    box-shadow: 0 2px 8px rgba(0,0,0,0.6);
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

function renderField(key, view, fontSize) {
  const fs = `style="font-size:${Number(fontSize) || 18}px"`;
  switch (key) {
    case "portrait":
      return view.img ? `<img class="pcs-portrait" src="${esc(view.img)}">` : "";
    case "name":
      return `<div class="pcs-field pcs-name" ${fs}>${esc(view.name)}</div>`;
    case "hp": {
      if (view.hp.value === null && view.hp.max === null) return "";
      const temp = view.hp.temp ? ` (+${esc(view.hp.temp)})` : "";
      return `<div class="pcs-field" ${fs}>HP ${esc(view.hp.value)}/${esc(view.hp.max)}${temp}
        <div class="pcs-hpbar"><span style="transform:scaleX(${(view.hp.pct / 100).toFixed(3)})"></span></div>
      </div>`;
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

function buildCardHTML(view, fieldConfig) {
  const ordered = [...fieldConfig]
    .filter(f => f.enabled)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return ordered.map(f => renderField(f.key, view, f.fontSize)).join("");
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
    const doc = this.popup.document;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>PC Stats Overlay</title><style>${OVERLAY_CSS}</style></head>
      <body style="background:${esc(bg)}">
        <div id="pcs-root"><div id="pcs-card"></div></div>
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
    const html = buildCardHTML(view, fieldConfig);

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
