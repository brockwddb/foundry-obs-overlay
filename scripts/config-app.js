import { MODULE_ID, FIELD_DEFS, OVERLAYS, CARD_ANIMATIONS, defaultOverlayConfig } from "./constants.js";

const TAB_LABELS = {
  banner: { label: "PCSTATS.TabBanner", hint: "PCSTATS.TabBannerHint" },
  verticalcard: { label: "PCSTATS.TabVerticalCard", hint: "PCSTATS.TabVerticalCardHint" },
  party: { label: "PCSTATS.TabParty", hint: "PCSTATS.TabPartyHint" },
  vertical: { label: "PCSTATS.TabVertical", hint: "PCSTATS.TabVerticalHint" }
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

    const selected = new Set(cfg.selectedActors ?? []);
    const actors = game.actors
      .filter(a => a.type === "character")
      .map(a => ({ id: a.id, name: a.name, img: a.img, selected: selected.has(a.id) }))
      .sort((a, b) => a.name.localeCompare(b.name));

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

    const messages = (cfg.customMessages ?? [])
      .map((m, i) => ({ index: i, text: m.text ?? "", enabled: m.enabled !== false }));

    const fontFamilies = [
      { value: "serif", label: "PCSTATS.FontSerif", selected: cfg.fontFamily !== "default" },
      { value: "default", label: "PCSTATS.FontDefault", selected: cfg.fontFamily === "default" }
    ];
    const portraitShapes = [
      { value: "rounded", label: "PCSTATS.ShapeRounded", selected: cfg.portraitShape === "rounded" },
      { value: "circle", label: "PCSTATS.ShapeCircle", selected: cfg.portraitShape === "circle" },
      { value: "square", label: "PCSTATS.ShapeSquare", selected: cfg.portraitShape === "square" }
    ];

    const cardAnimations = CARD_ANIMATIONS.map(v => ({
      value: v, label: ANIM_LABELS[v], selected: (cfg.cardAnimation || "fade") === v
    }));

    return {
      key,
      mode,
      isBanner: mode === "carousel",
      label: TAB_LABELS[key].label,
      hint: TAB_LABELS[key].hint,
      cfg,
      actors,
      fields,
      messages,
      fontFamilies,
      portraitShapes,
      cardAnimations
    };
  }

  async _prepareContext() {
    return {
      panes: [
        this.#preparePane("banner"),
        this.#preparePane("verticalcard"),
        this.#preparePane("party"),
        this.#preparePane("vertical")
      ],
      buttons: [
        { type: "submit", icon: "fa-solid fa-floppy-disk", label: "PCSTATS.Save" }
      ]
    };
  }

  static #parsePane(paneData, key) {
    const data = paneData ?? {};
    const cfg = defaultOverlayConfig(key);

    cfg.selectedActors = Object.entries(data.actor ?? {})
      .filter(([, v]) => v)
      .map(([id]) => id);

    cfg.fieldConfig = Object.entries(data.field ?? {}).map(([key, v]) => ({
      key,
      enabled: !!v.enabled,
      fontSize: Number(v.fontSize) || 18,
      order: Number(v.order) || 0,
      colorEnabled: !!v.colorEnabled,
      color: v.color || ""
    }));

    cfg.fontFamily = data.fontFamily === "default" ? "default" : "serif";
    cfg.bgColor = data.bgColor || "#00ff00";
    cfg.textColor = data.textColor || "#3a2a14";
    cfg.showHpBar = !!data.showHpBar;
    cfg.hpBarLow = data.hpBarLow || "#9b2d20";
    cfg.hpBarHigh = data.hpBarHigh || "#6f9b3a";
    cfg.hpBarBg = data.hpBarBg || "#2a2018";
    cfg.cardEnabled = !!data.cardEnabled;
    cfg.cardColor = data.cardColor || "#ecdcb4";
    cfg.cardOpacity = Math.clamp(Number(data.cardOpacity ?? 1), 0, 1);
    cfg.cardRadius = Number(data.cardRadius) || 0;
    cfg.borderEnabled = !!data.borderEnabled;
    cfg.borderColor = data.borderColor || "#b08d3c";
    cfg.borderWidth = Number(data.borderWidth) || 0;
    cfg.portraitSize = Number(data.portraitSize) || 90;
    cfg.portraitShape = data.portraitShape || "rounded";
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

    // Carousel/banner-only options.
    cfg.rotateInterval = Number(data.rotateInterval) || 0;
    cfg.cardTransition = Math.clamp(Number(data.cardTransition ?? 0.25), 0, 5);
    cfg.cardGap = Math.clamp(Number(data.cardGap) || 0, 0, 600);
    cfg.cardAnimation = CARD_ANIMATIONS.includes(data.cardAnimation) ? data.cardAnimation : "fade";
    cfg.customMessages = Object.values(data.message ?? {})
      .map(m => ({ text: String(m?.text ?? "").trim(), enabled: !!m?.enabled }))
      .filter(m => m.text !== "");
    cfg.messageFrequency = Number(data.messageFrequency) || 0;
    cfg.messageFontSize = Number(data.messageFontSize) || 26;
    cfg.messageColor = data.messageColor || "#5a3a16";

    return cfg;
  }

  static async #onSubmit(event, form, formData) {
    const data = foundry.utils.expandObject(formData.object);

    await game.settings.set(MODULE_ID, "bannerConfig", OverlayConfigApp.#parsePane(data.banner, "banner"));
    await game.settings.set(MODULE_ID, "verticalcardConfig", OverlayConfigApp.#parsePane(data.verticalcard, "verticalcard"));
    await game.settings.set(MODULE_ID, "partyConfig", OverlayConfigApp.#parsePane(data.party, "party"));
    await game.settings.set(MODULE_ID, "verticalConfig", OverlayConfigApp.#parsePane(data.vertical, "vertical"));

    const api = game.modules.get(MODULE_ID).api;
    api?.controllers?.banner?.reload();
    api?.controllers?.verticalcard?.reload();
    api?.controllers?.party?.reload();
    api?.controllers?.vertical?.reload();
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    this.#wireTabs();
    this.#wireResetButtons();

    for (const tbody of this.element.querySelectorAll(".pcs-field-rows")) {
      this.#wireDrag(tbody);
    }
    for (const list of this.element.querySelectorAll(".pcs-msg-rows")) {
      this.#wireMessageList(list);
    }
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
      const row = document.createElement("div");
      row.className = "pcs-msg-row";
      row.innerHTML = `
        <input type="checkbox" name="${paneKey}.message.${idx}.enabled" checked>
        <input type="text" name="${paneKey}.message.${idx}.text" value=""
          placeholder="${game.i18n.localize("PCSTATS.MessagePlaceholder")}">
        <button type="button" class="pcs-msg-remove" title="${game.i18n.localize("PCSTATS.RemoveMessage")}">
          <i class="fa-solid fa-trash"></i>
        </button>`;
      list.appendChild(row);
      row.querySelector('input[type="text"]')?.focus();
    });

    list.addEventListener("click", (ev) => {
      const btn = ev.target.closest(".pcs-msg-remove");
      if (btn) btn.closest(".pcs-msg-row")?.remove();
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
  }
}
