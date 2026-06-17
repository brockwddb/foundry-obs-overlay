import { MODULE_ID, FIELD_DEFS, OVERLAYS, OVERLAY_KEYS, CARD_ANIMATIONS, defaultOverlayConfig } from "./constants.js";
import { buildPreviewDocument } from "./render.js";

const TAB_LABELS = {
  horizontalBanner: { label: "PCSTATS.TabBanner", hint: "PCSTATS.TabBannerHint" },
  verticalBanner: { label: "PCSTATS.TabVerticalCard", hint: "PCSTATS.TabVerticalCardHint" },
  partyRow: { label: "PCSTATS.TabParty", hint: "PCSTATS.TabPartyHint" },
  partyColumn: { label: "PCSTATS.TabVertical", hint: "PCSTATS.TabVerticalHint" }
};

const ANIM_LABELS = {
  fade: "PCSTATS.AnimFade",
  slide: "PCSTATS.AnimSlide",
  slidev: "PCSTATS.AnimSlideV",
  wipe: "PCSTATS.AnimWipe",
  zoom: "PCSTATS.AnimZoom",
  flip: "PCSTATS.AnimFlip",
  none: "PCSTATS.AnimNone"
};

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class OverlayConfigApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "pcstats-overlay-config",
    tag: "form",
    window: {
      title: "PCSTATS.ConfigMenuName",
      icon: "fa-solid fa-sliders",
      resizable: true
    },
    position: { width: 680, height: "auto" },
    form: {
      handler: OverlayConfigApp.#onSubmit,
      closeOnSubmit: true
    },
    actions: {
      apply: OverlayConfigApp.#onApply
    }
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/config.hbs`, scrollable: [""] },
    footer: { template: "templates/generic/form-footer.hbs" }
  };

  #preparePane(key) {
    const mode = OVERLAYS[key].mode;
    const stored = game.settings.get(MODULE_ID, `${key}Config`) ?? {};
    const cfg = foundry.utils.mergeObject(defaultOverlayConfig(key), stored, { inplace: false });

    const byKey = Object.fromEntries((cfg.fieldConfig ?? []).map(f => [f.key, f]));
    const fields = Object.entries(FIELD_DEFS)
      .map(([fkey, label], i) => {
        const f = byKey[fkey] ?? { enabled: true, fontSize: 18, order: i, colorEnabled: false, color: "" };
        return {
          key: fkey,
          label,
          enabled: f.enabled,
          fontSize: f.fontSize,
          order: f.order,
          colorEnabled: !!f.colorEnabled,
          color: f.color ?? "",
          colorValue: f.color || "#ffffff",
          isPortrait: fkey === "portrait"
        };
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const messages = (cfg.customMessages ?? []).map((m, i) => ({
      index: i,
      text: m.text ?? "",
      image: m.image ?? "",
      weight: m.weight ?? 1,
      enabled: m.enabled !== false
    }));

    const fontFamilies = [
      { value: "serif", label: "PCSTATS.FontSerif" },
      { value: "default", label: "PCSTATS.FontDefault" },
      { value: "medieval", label: "PCSTATS.FontMedieval" },
      { value: "uncial", label: "PCSTATS.FontUncial" },
      { value: "modern", label: "PCSTATS.FontModern" }
    ].map(o => ({ ...o, selected: (cfg.fontFamily || "serif") === o.value }));
    const portraitShapes = [
      { value: "rounded", label: "PCSTATS.ShapeRounded", selected: cfg.portraitShape === "rounded" },
      { value: "circle", label: "PCSTATS.ShapeCircle", selected: cfg.portraitShape === "circle" },
      { value: "square", label: "PCSTATS.ShapeSquare", selected: cfg.portraitShape === "square" }
    ];

    const cardAnimations = CARD_ANIMATIONS.map(v => ({
      value: v, label: ANIM_LABELS[v], selected: (cfg.cardAnimation || "fade") === v
    }));
    const introLayouts = [
      { value: "top", label: "PCSTATS.IntroLayoutTop", selected: (cfg.introLayout || "top") !== "left" },
      { value: "left", label: "PCSTATS.IntroLayoutLeft", selected: cfg.introLayout === "left" }
    ];

    return {
      key,
      mode,
      isBanner: mode === "carousel",
      label: TAB_LABELS[key].label,
      hint: TAB_LABELS[key].hint,
      cfg,
      fields,
      messages,
      fontFamilies,
      portraitShapes,
      cardAnimations,
      introLayouts
    };
  }

  #prepareCharacters() {
    const styles = game.settings.get(MODULE_ID, "characterStyles") ?? {};
    const selected = new Set(game.settings.get(MODULE_ID, "selectedActors") ?? []);
    return game.actors
      .filter(a => a.type === "character")
      .map(a => ({
        id: a.id,
        name: a.name,
        img: a.img,
        selected: selected.has(a.id),
        intro: styles[a.id]?.intro || "",
        bio: styles[a.id]?.bio || "",
        pronouns: styles[a.id]?.pronouns || "",
        accentOn: !!styles[a.id]?.accent,
        accent: styles[a.id]?.accent || "#b08d3c",
        portraitToken: styles[a.id]?.portrait === "token",
        cropX: styles[a.id]?.crop?.x ?? 50,
        cropY: styles[a.id]?.crop?.y ?? 0,
        cropZoom: styles[a.id]?.crop?.zoom ?? 1
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async _prepareContext() {
    const roster = game.settings.get(MODULE_ID, "rosterFilters") ?? {};
    return {
      panes: OVERLAY_KEYS.map(key => this.#preparePane(key)),
      characters: this.#prepareCharacters(),
      roster: { online: !!roster.online, scene: !!roster.scene, combat: !!roster.combat },
      buttons: [
        { type: "button", action: "apply", icon: "fa-solid fa-check", label: "PCSTATS.Apply" },
        { type: "submit", icon: "fa-solid fa-floppy-disk", label: "PCSTATS.Save" }
      ]
    };
  }

  static #parsePane(paneData, key) {
    const data = paneData ?? {};
    const cfg = defaultOverlayConfig(key);

    cfg.fieldConfig = Object.entries(data.field ?? {}).map(([key, v]) => ({
      key,
      enabled: !!v.enabled,
      fontSize: Number(v.fontSize) || 18,
      order: Number(v.order) || 0,
      colorEnabled: !!v.colorEnabled,
      color: v.color || ""
    }));

    cfg.fontFamily = ["serif", "default", "medieval", "uncial", "modern"].includes(data.fontFamily)
      ? data.fontFamily : "serif";
    cfg.bgColor = data.bgColor || "#00ff00";
    cfg.textColor = data.textColor || "#3a2a14";
    cfg.showHpBar = !!data.showHpBar;
    cfg.hpBarLow = data.hpBarLow || "#9b2d20";
    cfg.hpBarHigh = data.hpBarHigh || "#6f9b3a";
    cfg.hpBarBg = data.hpBarBg || "#2a2018";
    cfg.hpColorByHealth = !!data.hpColorByHealth;
    cfg.hpHighColor = data.hpHighColor || "#4a7a3a";
    cfg.hpMidColor = data.hpMidColor || "#b8860b";
    cfg.hpLowColor = data.hpLowColor || "#a01e12";
    cfg.hpMidThreshold = Math.clamp(Number(data.hpMidThreshold ?? 50), 0, 100);
    cfg.hpLowThreshold = Math.clamp(Number(data.hpLowThreshold ?? 25), 0, 100);
    cfg.cardEnabled = !!data.cardEnabled;
    cfg.cardColor = data.cardColor || "#ecdcb4";
    cfg.cardOpacity = Math.clamp(Number(data.cardOpacity ?? 1), 0, 1);
    cfg.cardRadius = Number(data.cardRadius) || 0;
    cfg.plateShadow = !!data.plateShadow;
    cfg.plateEntrance = !!data.plateEntrance;
    cfg.textureUrl = String(data.textureUrl ?? "").trim();
    cfg.borderEnabled = !!data.borderEnabled;
    cfg.borderColor = data.borderColor || "#b08d3c";
    cfg.borderWidth = Number(data.borderWidth) || 0;
    cfg.portraitSize = Number(data.portraitSize) || 90;
    cfg.portraitShape = data.portraitShape || "rounded";
    cfg.portraitBorderEnabled = !!data.portraitBorderEnabled;
    cfg.portraitBorderColor = data.portraitBorderColor || "#ffffff";
    cfg.portraitBorderWidth = Math.max(0, Number(data.portraitBorderWidth) || 0);
    cfg.fieldGap = Number(data.fieldGap) || 0;
    cfg.paddingX = Number(data.paddingX) || 0;
    cfg.paddingY = Number(data.paddingY) || 0;
    cfg.showDividers = !!data.showDividers;
    cfg.dividerColor = data.dividerColor || "#b08d3c";
    cfg.maxWidth = Math.max(0, Number(data.maxWidth) || 0);
    cfg.maxHeight = Math.max(0, Number(data.maxHeight) || 0);
    cfg.bannerWidth = Number(data.bannerWidth) || 960;
    cfg.bannerHeight = Number(data.bannerHeight) || 120;
    cfg.combatAnimations = !!data.combatAnimations;
    cfg.animationsCombatOnly = !!data.animationsCombatOnly;
    cfg.combatAnimDuration = Math.clamp(Number(data.combatAnimDuration) || 3, 1, 15);
    cfg.damageColor = data.damageColor || "#a01e12";
    cfg.healColor = data.healColor || "#3f7d28";
    cfg.showDownState = !!data.showDownState;
    cfg.highlightActiveTurn = !!data.highlightActiveTurn;
    cfg.turnColor = data.turnColor || "#ffd700";
    cfg.spotlightCurrentTurn = !!data.spotlightCurrentTurn;
    cfg.diceFlair = !!data.diceFlair;
    cfg.critColor = data.critColor || "#ffd700";
    cfg.fumbleColor = data.fumbleColor || "#7a2230";

    // Carousel/banner-only options.
    cfg.rotateInterval = Number(data.rotateInterval) || 0;
    cfg.cardTransition = Math.clamp(Number(data.cardTransition ?? 0.25), 0, 5);
    cfg.cardGap = Math.clamp(Number(data.cardGap) || 0, 0, 600);
    cfg.cardAnimation = CARD_ANIMATIONS.includes(data.cardAnimation) ? data.cardAnimation : "fade";
    cfg.featuredIntro = !!data.featuredIntro;
    cfg.featuredText = String(data.featuredText ?? "").trim() || "Featured Character";
    cfg.introLayout = data.introLayout === "left" ? "left" : "top";
    cfg.introDuration = Math.clamp(Number(data.introDuration ?? 1.8), 0.3, 10);
    cfg.introPortraitSize = Math.max(0, Number(data.introPortraitSize) || 48);
    cfg.introNameSize = Math.max(6, Number(data.introNameSize) || 28);
    cfg.introBioSize = Math.max(6, Number(data.introBioSize) || 16);
    cfg.customMessages = Object.values(data.message ?? {})
      .map(m => ({
        text: String(m?.text ?? "").trim(),
        image: String(m?.image ?? "").trim(),
        weight: Math.clamp(Number(m?.weight) || 1, 1, 10),
        enabled: !!m?.enabled
      }))
      .filter(m => m.text !== "" || m.image !== "");
    cfg.messageFrequency = Number(data.messageFrequency) || 0;
    cfg.messageFontSize = Number(data.messageFontSize) || 26;
    cfg.messageColor = data.messageColor || "#5a3a16";
    cfg.messageImageHeight = Math.clamp(Number(data.messageImageHeight) || 80, 10, 600);

    return cfg;
  }

  static async #onSubmit(event, form, formData) {
    const data = foundry.utils.expandObject(formData.object);
    await OverlayConfigApp.#persist(data);
  }

  // Save + apply without closing the window. Reads the live form values, so the
  // user can preview changes on the real overlay and keep editing.
  static async #onApply() {
    const FDE = foundry.applications?.ux?.FormDataExtended ?? globalThis.FormDataExtended;
    const data = foundry.utils.expandObject(new FDE(this.element).object);
    await OverlayConfigApp.#persist(data);
    ui.notifications?.info(game.i18n.localize("PCSTATS.Applied"));
  }

  // Persist everything and reload the open overlays. Shared by Save and Apply.
  static async #persist(data) {
    // Global (shared by all overlays): selected characters + per-character styling.
    const selectedActors = Object.entries(data.actor ?? {})
      .filter(([, v]) => v)
      .map(([id]) => id);
    await game.settings.set(MODULE_ID, "selectedActors", selectedActors);

    const roster = data.roster ?? {};
    await game.settings.set(MODULE_ID, "rosterFilters", {
      online: !!roster.online, scene: !!roster.scene, combat: !!roster.combat
    });

    const characterStyles = {};
    for (const [id, v] of Object.entries(data.characters ?? {})) {
      const style = {};
      if (v?.accentOn) style.accent = v.accent || "#b08d3c";
      if (v?.useToken) style.portrait = "token";
      const intro = String(v?.intro ?? "").trim();
      if (intro) style.intro = intro;
      const bio = String(v?.bio ?? "").trim();
      if (bio) style.bio = bio;
      const pronouns = String(v?.pronouns ?? "").trim();
      if (pronouns) style.pronouns = pronouns;
      // Portrait crop: only persist when it differs from the default framing.
      const cropX = Math.clamp(Number(v?.cropX ?? 50), 0, 100);
      const cropY = Math.clamp(Number(v?.cropY ?? 0), 0, 100);
      const cropZoom = Math.clamp(Number(v?.cropZoom ?? 1), 1, 5);
      if (cropX !== 50 || cropY !== 0 || cropZoom !== 1) {
        style.crop = { x: cropX, y: cropY, zoom: cropZoom };
      }
      if (Object.keys(style).length) characterStyles[id] = style;
    }
    await game.settings.set(MODULE_ID, "characterStyles", characterStyles);

    const api = game.modules.get(MODULE_ID).api;
    for (const key of OVERLAY_KEYS) {
      await game.settings.set(MODULE_ID, `${key}Config`, OverlayConfigApp.#parsePane(data[key], key));
      api?.controllers?.[key]?.reload();
    }
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    this.#wireTabs();
    this.#wireResetButtons();
    this.#wireTools();

    for (const tbody of this.element.querySelectorAll(".pcs-field-rows")) {
      this.#wireDrag(tbody);
    }
    for (const list of this.element.querySelectorAll(".pcs-msg-rows")) {
      this.#wireMessageList(list);
    }
    for (const btn of this.element.querySelectorAll(".pcs-test")) {
      btn.addEventListener("click", () => game.modules.get(MODULE_ID).api?.test(btn.dataset.test));
    }
    for (const btn of this.element.querySelectorAll(".pcs-texture-browse")) {
      btn.addEventListener("click", () => {
        OverlayConfigApp.#pickImage(btn.parentElement?.querySelector(".pcs-texture-input"));
      });
    }
    this.#wireCharacterStyles();
    this.#wireCropPreviews();
    this.#wireSubTabs();
    this.#wireCopyAll();
    this.#wirePreviews();
  }

  // Secondary tab strip inside each overlay pane: show one section at a time.
  #wireSubTabs() {
    for (const pane of this.element.querySelectorAll(".pcs-pane[data-pane]")) {
      const tabs = [...pane.querySelectorAll(".pcs-subtab")];
      const subpanes = [...pane.querySelectorAll(".pcs-subpane")];
      if (!tabs.length) continue;
      for (const tab of tabs) {
        tab.addEventListener("click", () => {
          const key = tab.dataset.subtab;
          tabs.forEach(t => t.classList.toggle("active", t === tab));
          subpanes.forEach(p => p.classList.toggle("active", p.dataset.subpane === key));
        });
      }
    }
  }

  // Per-overlay "Copy to all overlays": save the live form first, then copy this
  // overlay's config onto the others (keeping each target's own window size).
  #wireCopyAll() {
    const L = (k) => game.i18n.localize(k);
    for (const btn of this.element.querySelectorAll(".pcs-copy-all")) {
      btn.addEventListener("click", async () => {
        const src = btn.dataset.src;
        if (!src) return;
        const ok = await foundry.applications.api.DialogV2.confirm({
          window: { title: L("PCSTATS.CopyToAll") },
          content: `<p>${L("PCSTATS.CopyAllConfirm")}</p>`
        });
        if (!ok) return;
        const FDE = foundry.applications?.ux?.FormDataExtended ?? globalThis.FormDataExtended;
        const data = foundry.utils.expandObject(new FDE(this.element).object);
        await OverlayConfigApp.#persist(data);
        const srcCfg = game.settings.get(MODULE_ID, `${src}Config`) ?? {};
        const api = game.modules.get(MODULE_ID).api;
        for (const key of OVERLAY_KEYS) {
          if (key === src) continue;
          const tgtCfg = game.settings.get(MODULE_ID, `${key}Config`) ?? {};
          const merged = foundry.utils.mergeObject(srcCfg, {
            bannerWidth: tgtCfg.bannerWidth, bannerHeight: tgtCfg.bannerHeight
          }, { inplace: false });
          await game.settings.set(MODULE_ID, `${key}Config`, merged);
          api?.controllers?.[key]?.reload();
        }
        ui.notifications?.info(L("PCSTATS.CopyAllDone"));
      });
    }
  }

  // Live-update each character row's thumbnail as its crop fields change, so the
  // focal point / zoom can be dialed in without saving.
  #wireCropPreviews() {
    for (const row of this.element.querySelectorAll(".pcs-char-row[data-style-id]")) {
      const img = row.querySelector(".pcs-char-thumb-img");
      if (!img) continue;
      const x = row.querySelector('input[name$=".cropX"]');
      const y = row.querySelector('input[name$=".cropY"]');
      const z = row.querySelector('input[name$=".cropZoom"]');
      const apply = () => {
        const cx = x?.value ?? 50, cy = y?.value ?? 0, cz = z?.value ?? 1;
        img.style.objectPosition = `${cx}% ${cy}%`;
        img.style.transformOrigin = `${cx}% ${cy}%`;
        img.style.transform = `scale(${cz})`;
      };
      for (const el of [x, y, z]) el?.addEventListener("input", apply);
      apply();
    }
  }

  // Show per-character styling rows only for characters that are selected.
  #wireCharacterStyles() {
    const boxes = [...this.element.querySelectorAll('.pcs-actor-list input[name^="actor."]')];
    if (!boxes.length) return;
    const sync = () => {
      const on = new Set();
      for (const cb of boxes) if (cb.checked) on.add(cb.name.slice("actor.".length));
      for (const row of this.element.querySelectorAll(".pcs-char-row[data-style-id]")) {
        row.style.display = on.has(row.dataset.styleId) ? "" : "none";
      }
    };
    for (const cb of boxes) cb.addEventListener("change", sync);
    sync();
  }

  #wirePreviews() {
    for (const key of OVERLAY_KEYS) {
      const pane = this.element.querySelector(`.pcs-pane[data-pane="${key}"]`);
      if (!pane) continue;
      this.#updatePreview(key);
      let timer = null;
      const schedule = () => {
        clearTimeout(timer);
        timer = setTimeout(() => this.#updatePreview(key), 200);
      };
      pane.addEventListener("input", schedule);
      pane.addEventListener("change", schedule);

      for (const btn of pane.querySelectorAll(".pcs-prev-btn")) {
        btn.addEventListener("click", () => this.#updatePreview(key, btn.dataset.prev));
      }
      const cycle = pane.querySelector(".pcs-prev-cycle");
      cycle?.addEventListener("click", () => {
        this._previewIndex ??= {};
        this._previewIndex[key] = (this._previewIndex[key] || 0) + 1;
        this.#updatePreview(key);
      });
    }
  }

  #paneConfig(key) {
    const FDE = foundry.applications?.ux?.FormDataExtended ?? globalThis.FormDataExtended;
    const formData = new FDE(this.element).object;
    const data = foundry.utils.expandObject(formData);
    const cfg = OverlayConfigApp.#parsePane(data[key], key);
    // Character selection is global — inject the live form value for the preview.
    cfg.selectedActors = Object.entries(data.actor ?? {})
      .filter(([, v]) => v)
      .map(([id]) => id);
    return cfg;
  }

  #updatePreview(key, state = null) {
    const frame = this.element.querySelector(`.pcs-preview-frame[data-preview="${key}"]`);
    if (!frame) return;
    try {
      const cfg = this.#paneConfig(key);
      const { mode, column } = OVERLAYS[key];
      const start = this._previewIndex?.[key] || 0;
      frame.srcdoc = buildPreviewDocument(cfg, mode, !!column, state, start);
    } catch (err) {
      console.warn(`${MODULE_ID} | preview render failed`, err);
    }
  }

  static #pickImage(input) {
    const FP = foundry.applications?.apps?.FilePicker?.implementation ?? globalThis.FilePicker;
    if (!input || !FP) return;
    new FP({ type: "image", current: input.value, callback: (path) => { input.value = path; } }).render(true);
  }

  #wireTools() {
    const root = this.element;
    const L = (k) => game.i18n.localize(k);

    root.querySelector(".pcs-copy-apply")?.addEventListener("click", async () => {
      const src = root.querySelector(".pcs-copy-source")?.value;
      const tgt = root.querySelector(".pcs-copy-target")?.value;
      if (!src || !tgt || src === tgt) return;
      const ok = await foundry.applications.api.DialogV2.confirm({
        window: { title: L("PCSTATS.CopyApply") },
        content: `<p>${L("PCSTATS.CopyConfirm")}</p>`
      });
      if (!ok) return;
      const srcCfg = game.settings.get(MODULE_ID, `${src}Config`) ?? {};
      const tgtCfg = foundry.utils.mergeObject(defaultOverlayConfig(tgt),
        game.settings.get(MODULE_ID, `${tgt}Config`) ?? {}, { inplace: false });
      const merged = foundry.utils.mergeObject(tgtCfg, srcCfg, { inplace: false });
      // Keep the target's own window dimensions.
      merged.bannerWidth = tgtCfg.bannerWidth;
      merged.bannerHeight = tgtCfg.bannerHeight;
      await game.settings.set(MODULE_ID, `${tgt}Config`, merged);
      game.modules.get(MODULE_ID).api?.controllers?.[tgt]?.reload();
      this.render();
    });

    root.querySelector(".pcs-export")?.addEventListener("click", () => {
      const data = {
        module: MODULE_ID,
        version: game.modules.get(MODULE_ID)?.version ?? "",
        configs: {},
        characterStyles: game.settings.get(MODULE_ID, "characterStyles") ?? {},
        rosterFilters: game.settings.get(MODULE_ID, "rosterFilters") ?? {},
        accessRole: game.settings.get(MODULE_ID, "accessRole")
      };
      for (const key of OVERLAY_KEYS) data.configs[key] = game.settings.get(MODULE_ID, `${key}Config`);
      const save = foundry.utils.saveDataToFile ?? globalThis.saveDataToFile;
      save(JSON.stringify(data, null, 2), "application/json", "pcstats-overlay-config.json");
    });

    const fileInput = root.querySelector(".pcs-import-file");
    root.querySelector(".pcs-import")?.addEventListener("click", () => fileInput?.click());
    fileInput?.addEventListener("change", async (ev) => {
      const file = ev.target.files?.[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        for (const key of OVERLAY_KEYS) {
          if (data.configs?.[key]) await game.settings.set(MODULE_ID, `${key}Config`, data.configs[key]);
        }
        if (data.characterStyles) await game.settings.set(MODULE_ID, "characterStyles", data.characterStyles);
        if (data.rosterFilters) await game.settings.set(MODULE_ID, "rosterFilters", data.rosterFilters);
        if (typeof data.accessRole === "number") await game.settings.set(MODULE_ID, "accessRole", data.accessRole);
        for (const key of OVERLAY_KEYS) game.modules.get(MODULE_ID).api?.controllers?.[key]?.reload();
        ui.notifications?.info(L("PCSTATS.ImportDone"));
        this.render();
      } catch (err) {
        ui.notifications?.error(L("PCSTATS.ImportFailed"));
        console.error(`${MODULE_ID} | import failed`, err);
      } finally {
        ev.target.value = "";
      }
    });
  }

  #wireTabs() {
    const tabs = [...this.element.querySelectorAll(".pcs-tab")];
    const panes = [...this.element.querySelectorAll(".pcs-pane")];
    for (const tab of tabs) {
      tab.addEventListener("click", () => {
        const key = tab.dataset.tab;
        tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === key));
        panes.forEach(p => p.classList.toggle("active", p.dataset.pane === key));
      });
    }
  }

  #wireResetButtons() {
    for (const btn of this.element.querySelectorAll(".pcs-reset")) {
      btn.addEventListener("click", async () => {
        const key = btn.dataset.reset;
        const confirmed = await foundry.applications.api.DialogV2.confirm({
          window: { title: game.i18n.localize("PCSTATS.ResetTitle") },
          content: `<p>${game.i18n.localize("PCSTATS.ResetConfirm")}</p>`
        });
        if (!confirmed) return;
        await game.settings.set(MODULE_ID, `${key}Config`, defaultOverlayConfig(key));
        game.modules.get(MODULE_ID).api?.controllers?.[key]?.reload();
        this.render();
      });
    }
  }

  #wireMessageList(list) {
    const pane = list.closest(".pcs-pane");
    const paneKey = pane?.dataset.pane ?? "banner";
    const addBtn = pane?.querySelector(".pcs-msg-add");
    let counter = list.querySelectorAll(".pcs-msg-row").length;

    addBtn?.addEventListener("click", () => {
      const idx = counter++;
      const L = (k) => game.i18n.localize(k);
      const row = document.createElement("div");
      row.className = "pcs-msg-row";
      row.innerHTML = `
        <input type="checkbox" name="${paneKey}.message.${idx}.enabled" checked>
        <input type="text" class="pcs-msg-text" name="${paneKey}.message.${idx}.text" value="" placeholder="${L("PCSTATS.MessagePlaceholder")}">
        <input type="text" class="pcs-msg-image" name="${paneKey}.message.${idx}.image" value="" placeholder="${L("PCSTATS.MessageImage")}">
        <button type="button" class="pcs-msg-browse" title="${L("PCSTATS.Browse")}"><i class="fa-solid fa-image"></i></button>
        <input type="number" class="pcs-msg-weight" name="${paneKey}.message.${idx}.weight" value="1" min="1" max="10" step="1" title="${L("PCSTATS.MessageWeight")}">
        <button type="button" class="pcs-msg-remove" title="${L("PCSTATS.RemoveMessage")}"><i class="fa-solid fa-trash"></i></button>`;
      list.appendChild(row);
      row.querySelector(".pcs-msg-text")?.focus();
    });

    list.addEventListener("click", (ev) => {
      const remove = ev.target.closest(".pcs-msg-remove");
      if (remove) { remove.closest(".pcs-msg-row")?.remove(); return; }

      const browse = ev.target.closest(".pcs-msg-browse");
      if (browse) {
        OverlayConfigApp.#pickImage(browse.closest(".pcs-msg-row")?.querySelector(".pcs-msg-image"));
      }
    });
  }

  #wireDrag(tbody) {
    let dragRow = null;

    for (const row of tbody.querySelectorAll(".pcs-field-row")) {
      row.addEventListener("dragstart", (ev) => {
        dragRow = row;
        row.classList.add("dragging");
        ev.dataTransfer.effectAllowed = "move";
        ev.dataTransfer.setData("text/plain", row.dataset.key ?? "");
      });
      row.addEventListener("dragend", () => {
        row.classList.remove("dragging");
        dragRow = null;
        this.#renumber(tbody);
      });
    }

    tbody.addEventListener("dragover", (ev) => {
      ev.preventDefault();
      if (!dragRow) return;
      const after = this.#rowAfter(tbody, ev.clientY);
      if (after === null) tbody.appendChild(dragRow);
      else tbody.insertBefore(dragRow, after);
    });
  }

  #rowAfter(tbody, y) {
    const rows = [...tbody.querySelectorAll(".pcs-field-row:not(.dragging)")];
    return rows.find(row => {
      const box = row.getBoundingClientRect();
      return y < box.top + box.height / 2;
    }) ?? null;
  }

  #renumber(tbody) {
    [...tbody.querySelectorAll(".pcs-field-row")].forEach((row, i) => {
      const input = row.querySelector(".pcs-order-input");
      if (input) input.value = String(i);
    });
    // Setting .value in JS doesn't fire input events, so nudge the preview.
    tbody.dispatchEvent(new Event("input", { bubbles: true }));
  }
}
