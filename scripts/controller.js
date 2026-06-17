import { MODULE_ID, OVERLAYS, defaultOverlayConfig } from "./constants.js";
import { getActorViewData } from "./data.js";
import {
  BASE_CSS, dynamicCss, fontLinks, esc, num, hexToRgba, characterStyle,
  buildCardHTML, buildMessageHTML, buildIntroHTML, buildFieldParts, downBadge,
  accentBorderCss, activeCombatantActorId, lcm, rollFlairType, damageRollTotal
} from "./render.js";

const DEFAULT_TRANSITION_S = 0.25;

export class OverlayController {
  constructor(key) {
    this.key = key;                       // horizontalBanner | verticalBanner | partyRow | partyColumn
    this.mode = OVERLAYS[key].mode;       // "carousel" | "party" | "vertical"
    this.column = !!OVERLAYS[key].column; // carousel laid out as a vertical card
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
    return foundry.utils.mergeObject(defaultOverlayConfig(this.key), stored, { inplace: false });
  }

  // Selected characters are global (shared by all overlays).
  _selectedIds() {
    return game.settings.get(MODULE_ID, "selectedActors") ?? [];
  }

  getActors() {
    let actors = this._selectedIds().map(id => game.actors.get(id)).filter(a => a);
    const f = game.settings.get(MODULE_ID, "rosterFilters") ?? {};

    if (f.online) {
      actors = actors.filter(a =>
        game.users.some(u => !u.isGM && u.active && a.testUserPermission?.(u, "OWNER")));
    }
    if (f.scene) {
      const scene = game.scenes?.active ?? canvas?.scene;
      const ids = new Set([...(scene?.tokens ?? [])].map(t => t.actorId).filter(Boolean));
      actors = actors.filter(a => ids.has(a.id));
    }
    if (f.combat && game.combat?.started) {
      const ids = new Set(game.combat.combatants.map(c => c.actorId));
      actors = actors.filter(a => ids.has(a.id));
    }
    return actors;
  }

  getMessages(cfg = this.cfg()) {
    return (cfg.customMessages ?? [])
      .filter(m => m && m.enabled && (String(m.text ?? "").trim() !== "" || m.image));
  }

  // Build the carousel queue: character slides with sponsor/custom messages
  // sprinkled in after every `messageFrequency` characters. The sequence spans
  // whole rotation cycles (LCM of character count and frequency) so a message
  // shows once per N characters even when N > the number of characters — and it
  // loops seamlessly. Messages are repeated by weight so heavier ones recur.
  getSlides(cfg = this.cfg()) {
    const actors = this.getActors().map(a => ({ type: "actor", actor: a }));
    const messages = this.getMessages(cfg).flatMap(m => {
      const weight = Math.max(1, Math.min(10, Math.round(num(m.weight, 1))));
      return Array.from({ length: weight }, () => ({ type: "message", message: m }));
    });
    if (!messages.length) return actors;
    if (!actors.length) return messages;

    const freq = num(cfg.messageFrequency, 0);
    if (freq <= 0) return actors;

    const total = lcm(actors.length, freq);
    const out = [];
    let mi = 0;
    for (let i = 0; i < total; i++) {
      out.push(actors[i % actors.length]);
      if ((i + 1) % freq === 0) {
        out.push(messages[mi % messages.length]);
        mi++;
      }
    }
    return out;
  }

  _initHpCache() {
    this.hpCache = new Map();
    this.stateCache = new Map();
    for (const a of this.getActors()) {
      const v = a.system?.attributes?.hp?.value;
      if (v != null) this.hpCache.set(a.id, v);
      this.stateCache.set(a.id, {
        insp: !!a.system?.attributes?.inspiration,
        exh: Number(a.system?.attributes?.exhaustion ?? 0),
        level: Number(a.system?.details?.level ?? 0)
      });
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
    const nonce = foundry.utils.randomID();
    const url = this._skeletonUrl(cfg, nonce);
    this.popup = window.open(url, OVERLAYS[this.key].windowName,
      `width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no`);
    if (!this.popup) {
      ui.notifications.error(game.i18n.localize("PCSTATS.PopupBlocked"));
      try { URL.revokeObjectURL(url); } catch (_e) { /* */ }
      return;
    }
    this.index = 0;
    this.animating = false;
    this.eventQueue = [];
    this._animateNextParty = true;
    this._initHpCache();
    this._whenReady(nonce, url, () => {
      this.render();
      this.startRotation();
    });
  }

  close() {
    this.stopRotation();
    if (this.isOpen) this.popup.close();
    this.popup = null;
  }

  // Full HTML for the popout. Loaded as a real document (blob URL) so the
  // browser honours <title> as the OS window title (about:blank popups don't,
  // e.g. Vivaldi shows just "Vivaldi" — which breaks OBS window capture).
  _skeletonHtml(cfg = this.cfg(), nonce = "") {
    const fonts = fontLinks(cfg.fontFamily);
    const css = BASE_CSS + dynamicCss(cfg);

    let body;
    if (this.mode === "carousel") {
      const cardClass = this.column ? "pcs-card-bg pcs-card-col" : "pcs-card-bg";
      body = `<div id="pcs-root"><div id="pcs-scale"><div id="pcs-card" class="${cardClass}"></div></div></div>`;
    } else if (this.mode === "vertical" || this.mode === "initiative") {
      const cls = this.mode === "initiative" ? "pcs-vertical pcs-initiative" : "pcs-vertical";
      body = `<div id="pcs-root" class="pcs-vertical-root"><div id="pcs-party" class="${cls}"></div></div>`;
    } else {
      body = `<div id="pcs-root" class="pcs-party-root"><div id="pcs-party"></div></div>`;
    }

    const title = OVERLAYS[this.key].windowTitle ?? "PC Stats Overlay";
    return `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>${esc(title)}</title>${fonts}<style>${css}</style></head>
      <body data-pcs-nonce="${esc(nonce)}" style="background:${esc(cfg.bgColor)};color:${esc(cfg.textColor)}">
        ${body}
      </body></html>`;
  }

  _skeletonUrl(cfg, nonce) {
    return URL.createObjectURL(new Blob([this._skeletonHtml(cfg, nonce)], { type: "text/html" }));
  }

  // Poll until the popout has finished loading the document for `nonce`, then
  // run cb (and force the title once more for good measure).
  _whenReady(nonce, url, cb) {
    let tries = 0;
    const check = () => {
      if (!this.isOpen) { try { URL.revokeObjectURL(url); } catch (_e) { /* */ } return; }
      const doc = this.popup.document;
      const ready = doc?.body?.dataset?.pcsNonce === String(nonce) && doc.getElementById("pcs-root");
      if (ready || tries++ > 100) {
        try { URL.revokeObjectURL(url); } catch (_e) { /* */ }
        try { this.popup.document.title = OVERLAYS[this.key].windowTitle ?? "PC Stats Overlay"; } catch (_e) { /* */ }
        cb();
        return;
      }
      setTimeout(check, 50);
    };
    check();
  }

  render() {
    if (!this.isOpen || this.animating) return;
    if (this.mode === "carousel") this._renderCarousel();
    else if (this.mode === "initiative") this._renderInitiative();
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
    const view = slide.type === "actor" ? getActorViewData(slide.actor) : null;
    const html = view ? buildCardHTML(view, cfg) : buildMessageHTML(slide.message, cfg);

    const activeId = activeCombatantActorId();
    const isDown = !!(view && cfg.showDownState && view.down);
    const isActiveTurn = !!(view && cfg.highlightActiveTurn && view.id === activeId);

    const anim = cfg.cardAnimation || "fade";
    const dur = Math.round(num(cfg.cardTransition, DEFAULT_TRANSITION_S) * 1000);

    const swap = () => {
      const c = this.isOpen ? this.popup.document.getElementById("pcs-card") : null;
      if (!c || this.animating) return;
      c.innerHTML = html;
      c.classList.toggle("pcs-down", isDown);
      c.classList.toggle("pcs-active-turn", isActiveTurn);
      c.style.setProperty("--pcs-turn", cfg.turnColor || "#ffd700");
      const accent = view ? characterStyle(view.id).accent : null;
      c.style.border = accent ? `${num(cfg.borderWidth, 2) || 2}px solid ${accent}` : "";
      this._applyScale(this._scaleEl(), cfg);
      this._animateCardIn(c, anim, dur);
    };

    // Featured-character lead-in: show the animated intro, then transition into
    // the real card. Only for actor slides on a banner with the option enabled.
    const showIntro = () => {
      const c = this.isOpen ? this.popup.document.getElementById("pcs-card") : null;
      if (!c || this.animating) return;
      c.classList.remove("pcs-down", "pcs-active-turn");
      c.style.border = "";
      c.innerHTML = buildIntroHTML(view, cfg);
      this._applyScale(this._scaleEl(), cfg);
      this._animateCardIn(c, anim, dur);
      const introMs = Math.round(num(cfg.introDuration, 1.8) * 1000);
      this.popup.setTimeout(() => {
        const c2 = this.isOpen ? this.popup.document.getElementById("pcs-card") : null;
        if (!c2 || this.animating) return;
        if (anim === "none" || dur <= 0) { swap(); return; }
        this._animateCardOut(c2, anim, dur);
        this.popup.setTimeout(swap, dur);
      }, introMs);
    };

    const first = (view && cfg.featuredIntro) ? showIntro : swap;

    if (skipOut || anim === "none" || dur <= 0) {
      first();
      return;
    }
    this._animateCardOut(card, anim, dur);
    this.popup.setTimeout(first, dur);
  }

  _renderParty() {
    const party = this.popup.document.getElementById("pcs-party");
    if (!party) return;

    const cfg = this.cfg();
    const actors = this.getActors();
    if (!actors.length) {
      party.innerHTML = `<div class="pcs-field" style="font-size:20px">${game.i18n.localize("PCSTATS.NoCharacters")}</div>`;
      return;
    }

    const activeId = activeCombatantActorId();
    const entrance = this._animateNextParty && cfg.plateEntrance !== false;
    this._animateNextParty = false;
    party.innerHTML = actors.map((a, i) => {
      const view = getActorViewData(a);
      const parts = buildFieldParts(view, cfg);
      const cls = ["pcs-plate", "pcs-card-bg"];
      if (cfg.showDownState && view.down) cls.push("pcs-down");
      if (cfg.highlightActiveTurn && view.id === activeId) cls.push("pcs-active-turn");
      if (entrance) cls.push("pcs-plate-enter");
      let style = `--pcs-turn:${esc(cfg.turnColor || "#ffd700")};${accentBorderCss(a.id, cfg)}`;
      if (entrance) style += `animation-delay:${(i * 0.08).toFixed(2)}s;`;
      return `<div class="${cls.join(" ")}" data-actor-id="${esc(a.id)}" style="${style}">${downBadge(view, cfg)}${parts.join("")}</div>`;
    }).join("");
    this._equalizePlates(party);
    this._applyScale(party, cfg);
  }

  // Combatants in initiative order (optionally only player characters).
  _combatViews(cfg) {
    const combat = game.combat;
    if (!combat) return [];
    const out = [];
    for (const t of combat.turns ?? []) {
      const actor = t.actor;
      if (!actor) continue;
      if (cfg.turnOrderPlayersOnly && actor.type !== "character") continue;
      out.push({ actor, active: combat.combatant?.id === t.id });
    }
    return out;
  }

  // Turn-order overlay: combatants stacked in initiative order, current marked.
  _renderInitiative() {
    const party = this.popup.document.getElementById("pcs-party");
    if (!party) return;

    const cfg = this.cfg();
    const combat = game.combat;
    const views = (combat && combat.started) ? this._combatViews(cfg) : [];
    if (!views.length) {
      party.innerHTML = `<div class="pcs-field" style="font-size:20px">${esc(game.i18n.localize("PCSTATS.NoCombat"))}</div>`;
      this._applyScale(party, cfg);
      return;
    }

    party.innerHTML = views.map(({ actor, active }) => {
      const view = getActorViewData(actor);
      const parts = buildFieldParts(view, cfg);
      const cls = ["pcs-plate", "pcs-card-bg"];
      if (cfg.showDownState && view.down) cls.push("pcs-down");
      if (active && cfg.highlightActiveTurn !== false) cls.push("pcs-active-turn");
      const style = `--pcs-turn:${esc(cfg.turnColor || "#ffd700")};${accentBorderCss(actor.id, cfg)}`;
      return `<div class="${cls.join(" ")}" data-actor-id="${esc(actor.id)}" style="${style}">${downBadge(view, cfg)}${parts.join("")}</div>`;
    }).join("");
    this._equalizePlates(party);
    this._applyScale(party, cfg);
  }

  // Size every plate to the largest one so the row/column looks even.
  _equalizePlates(party) {
    const plates = [...party.querySelectorAll(".pcs-plate")];
    if (plates.length < 2) return;
    plates.forEach(p => { p.style.width = ""; p.style.minHeight = ""; });
    let maxW = 0, maxH = 0;
    plates.forEach(p => { maxW = Math.max(maxW, p.offsetWidth); maxH = Math.max(maxH, p.offsetHeight); });
    plates.forEach(p => { p.style.width = `${maxW}px`; p.style.minHeight = `${maxH}px`; });
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
    const selected = this._selectedIds().includes(actor.id);

    if (hpChanged && cfg.combatAnimations && (!combatOnly || inCombat) && selected
      && oldVal != null && newVal != null && newVal !== oldVal) {
      const event = { kind: "hp", actorId: actor.id, delta: newVal - oldVal, oldHp: oldVal, newHp: newVal, max };
      if (this.animating) this.eventQueue.push(event);
      else this.playEvent(event);
      return;
    }

    // Reaction callouts (inspiration / exhaustion / level up) — not combat-gated.
    if (cfg.reactionCallouts && selected) this._checkReactions(actor, cfg);

    if (!this.animating) this.render();
  }

  // Compare cached state to fire inspiration / exhaustion / level-up callouts.
  _checkReactions(actor, cfg) {
    const st = this.stateCache.get(actor.id) ?? {};
    const insp = !!actor.system?.attributes?.inspiration;
    const exh = Number(actor.system?.attributes?.exhaustion ?? 0);
    const level = Number(actor.system?.details?.level ?? 0);
    const L = (k) => game.i18n.localize(k);

    if (st.insp === false && insp === true) this._queueCallout(actor.id, L("PCSTATS.CalloutInspiration"), cfg.reactionColor);
    if (st.exh != null && exh !== st.exh) {
      this._queueCallout(actor.id, exh > 0 ? `${L("PCSTATS.FieldExhaustion")} ${exh}` : L("PCSTATS.CalloutExhaustionClear"), cfg.reactionColor);
    }
    if (st.level != null && level > st.level) this._queueCallout(actor.id, L("PCSTATS.CalloutLevelUp"), cfg.reactionColor);

    this.stateCache.set(actor.id, { insp, exh, level });
  }

  _queueCallout(actorId, text, color) {
    const event = { kind: "callout", actorId, text, color: color || "#ffd700" };
    if (this.animating) this.eventQueue.push(event);
    else this.playEvent(event);
  }

  _queueFlair(actorId, flair) {
    const event = { kind: "flair", actorId, flair };
    if (this.animating) this.eventQueue.push(event);
    else this.playEvent(event);
  }

  // A condition/status effect was applied → callout with its name.
  onEffectCreate(effect) {
    if (!this.isOpen) return;
    const cfg = this.cfg();
    const actor = effect?.parent;
    if (cfg.reactionCallouts && actor?.documentName === "Actor"
      && this._selectedIds().includes(actor.id) && effect.statuses?.size > 0) {
      this._queueCallout(actor.id, effect.name || game.i18n.localize("PCSTATS.CalloutCondition"), cfg.reactionColor);
      return;
    }
    if (!this.animating) this.render();
  }

  // Concentration effect removed → "Concentration broken" callout.
  onEffectDelete(effect) {
    if (!this.isOpen) return;
    const cfg = this.cfg();
    const actor = effect?.parent;
    if (cfg.reactionCallouts && actor?.documentName === "Actor"
      && this._selectedIds().includes(actor.id) && effect.statuses?.has?.("concentrating")) {
      this._queueCallout(actor.id, game.i18n.localize("PCSTATS.CalloutConcentration"), cfg.reactionColor);
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
    if (event.kind === "flair") this._flairTarget(card, event.flair, cfg);
    else if (event.kind === "callout") this._calloutTarget(card, event, cfg);
    else this._flashTarget(card, event, cfg);

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

    const cfg = this.cfg();
    if (event.kind === "flair") this._flairTarget(plate, event.flair, cfg);
    else if (event.kind === "callout") this._calloutTarget(plate, event, cfg);
    else this._flashTarget(plate, event, cfg);

    const dur = num(cfg.combatAnimDuration, 3) * 1000;
    this.popup.setTimeout(() => this.finishEvent(), dur);
  }

  // Generic floating callout (condition, inspiration, level up, damage dealt).
  _calloutTarget(el, event, cfg) {
    const color = event.color || "#ffd700";
    el.style.animation = "";
    el.classList.remove("pcs-flash-damage", "pcs-flash-heal", "pcs-flair-crit", "pcs-flair-fumble", "pcs-flash-callout");
    el.style.setProperty("--pcs-flash", hexToRgba(color, 0.9));
    void el.offsetWidth;
    el.classList.add("pcs-flash-callout");

    const text = this.popup.document.createElement("div");
    text.className = "pcs-hit pcs-callout-text";
    text.style.color = color;
    text.textContent = event.text;
    el.appendChild(text);
  }

  // Crit (nat 20) / fumble (nat 1) burst on one element.
  _flairTarget(el, flair, cfg) {
    const isCrit = flair === "crit";
    const color = isCrit ? (cfg.critColor || "#ffd700") : (cfg.fumbleColor || "#7a2230");

    el.style.animation = "";
    el.classList.remove("pcs-flash-damage", "pcs-flash-heal", "pcs-flair-crit", "pcs-flair-fumble");
    el.style.setProperty("--pcs-flash", hexToRgba(color, 0.95));
    void el.offsetWidth;
    el.classList.add(isCrit ? "pcs-flair-crit" : "pcs-flair-fumble");

    const text = this.popup.document.createElement("div");
    text.className = "pcs-hit pcs-flair-text";
    text.style.color = color;
    text.textContent = isCrit ? "NAT 20!" : "NAT 1!";
    el.appendChild(text);
  }

  // Apply the flash/shake, floating number, and HP count-up/down to one element.
  _flashTarget(el, event, cfg) {
    const isHeal = event.delta > 0;
    const color = isHeal ? (cfg.healColor || "#3f7d28") : (cfg.damageColor || "#a01e12");

    el.style.animation = ""; // let the class-based flash animation take over
    el.classList.remove("pcs-flash-damage", "pcs-flash-heal");
    el.style.setProperty("--pcs-flash", hexToRgba(color, 0.9));
    void el.offsetWidth; // restart the CSS animation
    el.classList.add(isHeal ? "pcs-flash-heal" : "pcs-flash-damage");

    const hit = this.popup.document.createElement("div");
    hit.className = "pcs-hit " + (isHeal ? "pcs-hit-heal" : "pcs-hit-damage");
    hit.style.color = color;
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
      if (card) card.classList.remove("pcs-flash-damage", "pcs-flash-heal", "pcs-flair-crit", "pcs-flair-fumble", "pcs-flash-callout");
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

  // Fire a synthetic damage → heal → crit sequence so OBS can be set up
  // without a live session. Uses the first selected character.
  runTest() {
    if (!this.isOpen) { ui.notifications?.warn(game.i18n.localize("PCSTATS.TestNotOpen")); return; }
    const actors = this.getActors();
    if (!actors.length) { ui.notifications?.warn(game.i18n.localize("PCSTATS.TestNoActor")); return; }
    const actor = actors[0];
    const v = getActorViewData(actor);
    const max = v.hp.max ?? 20;
    const cur = v.hp.value ?? max;
    const dmg = Math.max(1, Math.round(max * 0.25));
    const low = Math.max(0, cur - dmg);
    const events = [
      { kind: "hp", actorId: actor.id, delta: -dmg, oldHp: cur, newHp: low, max },
      { kind: "hp", actorId: actor.id, delta: dmg, oldHp: low, newHp: cur, max },
      { kind: "flair", actorId: actor.id, flair: "crit" }
    ];
    this.eventQueue.push(...events.slice(1));
    if (this.animating) this.eventQueue.unshift(events[0]);
    else this.playEvent(events[0]);
  }

  // Re-read config and reapply everything (called after the config window saves).
  reload() {
    if (!this.isOpen) return;
    this.stopRotation();
    this.animating = false;
    this.eventQueue = [];
    this._animateNextParty = true;
    const cfg = this.cfg();
    const nonce = foundry.utils.randomID();
    const url = this._skeletonUrl(cfg, nonce);
    this.popup.location.replace(url);
    this._whenReady(nonce, url, () => {
      this._initHpCache();
      if (this.index >= this.getSlides().length) this.index = 0;
      this.render();
      this.startRotation();
    });
  }

  // Combat changed (turn/round/start/end). Refresh the active-turn highlight,
  // and for the carousel optionally spotlight the current combatant.
  onUpdateCombat() {
    if (!this.isOpen || this.animating) return;

    if (this.mode === "carousel" && this.cfg().spotlightCurrentTurn) {
      const activeId = activeCombatantActorId();
      if (activeId) {
        const slides = this.getSlides();
        const idx = slides.findIndex(s => s.type === "actor" && s.actor?.id === activeId);
        if (idx >= 0) {
          this.index = idx;
          this.stopRotation();        // hold on the current combatant
          this._renderCarousel();
          return;
        }
      }
      this.startRotation();           // combat ended / no combatant → resume
    }
    this.render();
  }

  // A chat message landed — check it for a nat 20 / nat 1 (flair) or a damage
  // roll (callout) by a selected actor.
  onCreateChatMessage(message) {
    if (!this.isOpen) return;
    const cfg = this.cfg();
    const actorId = message.speaker?.actor;
    if (!actorId || !this._selectedIds().includes(actorId)) return;

    if (cfg.diceFlair) {
      const flair = rollFlairType(message);
      if (flair) { this._queueFlair(actorId, flair); return; }
    }
    if (cfg.damageCallouts) {
      const dmg = damageRollTotal(message);
      if (dmg != null) this._queueCallout(actorId, `${dmg} ${game.i18n.localize("PCSTATS.DamageUnit")}`, cfg.damageColor || "#a01e12");
    }
  }

  registerHooks() {
    this._hookIds.push(["updateActor",
      Hooks.on("updateActor", (actor, changes) => this.onUpdateActor(actor, changes))]);
    this._hookIds.push(["createChatMessage",
      Hooks.on("createChatMessage", (message) => this.onCreateChatMessage(message))]);

    const onCombat = () => this.onUpdateCombat();
    for (const hook of ["updateCombat", "combatStart", "combatTurn", "combatRound", "deleteCombat",
      "createCombatant", "updateCombatant", "deleteCombatant"]) {
      this._hookIds.push([hook, Hooks.on(hook, onCombat)]);
    }

    this._hookIds.push(["createActiveEffect",
      Hooks.on("createActiveEffect", (effect) => this.onEffectCreate(effect))]);
    this._hookIds.push(["deleteActiveEffect",
      Hooks.on("deleteActiveEffect", (effect) => this.onEffectDelete(effect))]);

    const refresh = () => { if (this.isOpen && !this.animating) this.render(); };
    for (const hook of ["updateToken", "deleteActor", "createToken", "deleteToken",
      "userConnected", "updateActiveEffect"]) {
      this._hookIds.push([hook, Hooks.on(hook, refresh)]);
    }
  }
}
