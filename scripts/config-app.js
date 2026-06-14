import { MODULE_ID, FIELD_DEFS } from "./constants.js";

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
    position: { width: 660, height: "auto" },
    form: {
      handler: OverlayConfigApp.#onSubmit,
      closeOnSubmit: true
    }
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/config.hbs`, scrollable: [""] },
    footer: { template: "templates/generic/form-footer.hbs" }
  };

  async _prepareContext() {
    const selected = new Set(game.settings.get(MODULE_ID, "selectedActors"));
    const actors = game.actors
      .filter(a => a.type === "character")
      .map(a => ({ id: a.id, name: a.name, img: a.img, selected: selected.has(a.id) }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const saved = game.settings.get(MODULE_ID, "fieldConfig") ?? [];
    const byKey = Object.fromEntries(saved.map(f => [f.key, f]));
    const fields = Object.entries(FIELD_DEFS)
      .map(([key, label], i) => {
        const f = byKey[key] ?? { enabled: true, fontSize: 18, order: i, colorEnabled: false, color: "" };
        return {
          key,
          label,
          enabled: f.enabled,
          fontSize: f.fontSize,
          order: f.order,
          colorEnabled: !!f.colorEnabled,
          color: f.color ?? "",
          colorValue: f.color || "#ffffff",
          isPortrait: key === "portrait"
        };
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const messages = (game.settings.get(MODULE_ID, "customMessages") ?? [])
      .map((m, i) => ({ index: i, text: m.text ?? "", enabled: m.enabled !== false }));

    const layoutMode = game.settings.get(MODULE_ID, "layoutMode");
    const layoutModes = [
      { value: "carousel", label: "PCSTATS.LayoutCarousel", selected: layoutMode === "carousel" },
      { value: "party", label: "PCSTATS.LayoutParty", selected: layoutMode === "party" }
    ];

    const theme = game.settings.get(MODULE_ID, "theme");
    const themes = [
      { value: "parchment", label: "PCSTATS.ThemeParchment", selected: theme === "parchment" },
      { value: "plain", label: "PCSTATS.ThemePlain", selected: theme === "plain" }
    ];

    const portraitShape = game.settings.get(MODULE_ID, "portraitShape");
    const portraitShapes = [
      { value: "rounded", label: "PCSTATS.ShapeRounded", selected: portraitShape === "rounded" },
      { value: "circle", label: "PCSTATS.ShapeCircle", selected: portraitShape === "circle" },
      { value: "square", label: "PCSTATS.ShapeSquare", selected: portraitShape === "square" }
    ];

    return {
      actors,
      fields,
      layoutModes,
      themes,
      rotateInterval: game.settings.get(MODULE_ID, "rotateInterval"),
      bgColor: game.settings.get(MODULE_ID, "bgColor"),
      bannerWidth: game.settings.get(MODULE_ID, "bannerWidth"),
      bannerHeight: game.settings.get(MODULE_ID, "bannerHeight"),
      textColor: game.settings.get(MODULE_ID, "textColor"),
      showHpBar: game.settings.get(MODULE_ID, "showHpBar"),
      cardEnabled: game.settings.get(MODULE_ID, "cardEnabled"),
      cardColor: game.settings.get(MODULE_ID, "cardColor"),
      cardOpacity: game.settings.get(MODULE_ID, "cardOpacity"),
      cardRadius: game.settings.get(MODULE_ID, "cardRadius"),
      portraitSize: game.settings.get(MODULE_ID, "portraitSize"),
      portraitShapes,
      fieldGap: game.settings.get(MODULE_ID, "fieldGap"),
      paddingX: game.settings.get(MODULE_ID, "paddingX"),
      paddingY: game.settings.get(MODULE_ID, "paddingY"),
      showDividers: game.settings.get(MODULE_ID, "showDividers"),
      dividerColor: game.settings.get(MODULE_ID, "dividerColor"),
      messages,
      messageFrequency: game.settings.get(MODULE_ID, "messageFrequency"),
      messageFontSize: game.settings.get(MODULE_ID, "messageFontSize"),
      messageColor: game.settings.get(MODULE_ID, "messageColor"),
      combatAnimations: game.settings.get(MODULE_ID, "combatAnimations"),
      combatAnimDuration: game.settings.get(MODULE_ID, "combatAnimDuration"),
      buttons: [
        { type: "submit", icon: "fa-solid fa-floppy-disk", label: "PCSTATS.Save" }
      ]
    };
  }

  static async #onSubmit(event, form, formData) {
    const data = foundry.utils.expandObject(formData.object);

    const selectedActors = Object.entries(data.actor ?? {})
      .filter(([, v]) => v)
      .map(([id]) => id);

    const fieldConfig = Object.entries(data.field ?? {}).map(([key, v]) => ({
      key,
      enabled: !!v.enabled,
      fontSize: Number(v.fontSize) || 18,
      order: Number(v.order) || 0,
      colorEnabled: !!v.colorEnabled,
      color: v.color || ""
    }));

    await game.settings.set(MODULE_ID, "selectedActors", selectedActors);
    await game.settings.set(MODULE_ID, "fieldConfig", fieldConfig);
    await game.settings.set(MODULE_ID, "layoutMode", data.layoutMode === "party" ? "party" : "carousel");
    await game.settings.set(MODULE_ID, "theme", data.theme === "plain" ? "plain" : "parchment");
    await game.settings.set(MODULE_ID, "rotateInterval", Number(data.rotateInterval) || 0);
    await game.settings.set(MODULE_ID, "bgColor", data.bgColor || "#00ff00");
    await game.settings.set(MODULE_ID, "bannerWidth", Number(data.bannerWidth) || 960);
    await game.settings.set(MODULE_ID, "bannerHeight", Number(data.bannerHeight) || 120);
    await game.settings.set(MODULE_ID, "textColor", data.textColor || "#ffffff");
    await game.settings.set(MODULE_ID, "showHpBar", !!data.showHpBar);
    await game.settings.set(MODULE_ID, "cardEnabled", !!data.cardEnabled);
    await game.settings.set(MODULE_ID, "cardColor", data.cardColor || "#000000");
    await game.settings.set(MODULE_ID, "cardOpacity", Math.clamp(Number(data.cardOpacity ?? 0.6), 0, 1));
    await game.settings.set(MODULE_ID, "cardRadius", Number(data.cardRadius) || 0);
    await game.settings.set(MODULE_ID, "portraitSize", Number(data.portraitSize) || 120);
    await game.settings.set(MODULE_ID, "portraitShape", data.portraitShape || "rounded");
    await game.settings.set(MODULE_ID, "fieldGap", Number(data.fieldGap) || 0);
    await game.settings.set(MODULE_ID, "paddingX", Number(data.paddingX) || 0);
    await game.settings.set(MODULE_ID, "paddingY", Number(data.paddingY) || 0);
    await game.settings.set(MODULE_ID, "showDividers", !!data.showDividers);
    await game.settings.set(MODULE_ID, "dividerColor", data.dividerColor || "#ffffff");

    const customMessages = Object.values(data.message ?? {})
      .map(m => ({ text: String(m?.text ?? "").trim(), enabled: !!m?.enabled }))
      .filter(m => m.text !== "");
    await game.settings.set(MODULE_ID, "customMessages", customMessages);
    await game.settings.set(MODULE_ID, "messageFrequency", Number(data.messageFrequency) || 0);
    await game.settings.set(MODULE_ID, "messageFontSize", Number(data.messageFontSize) || 26);
    await game.settings.set(MODULE_ID, "messageColor", data.messageColor || "#ffd700");
    await game.settings.set(MODULE_ID, "combatAnimations", !!data.combatAnimations);
    await game.settings.set(MODULE_ID, "combatAnimDuration", Math.clamp(Number(data.combatAnimDuration) || 3, 1, 15));

    game.modules.get(MODULE_ID).api?.controller?.reload();
  }

  _onRender(context, options) {
    super._onRender?.(context, options);

    this.#wireMessageList();

    const tbody = this.element.querySelector(".pcs-field-rows");
    if (!tbody) return;

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

  #wireMessageList() {
    const list = this.element.querySelector(".pcs-msg-rows");
    const addBtn = this.element.querySelector(".pcs-msg-add");
    if (!list) return;

    // Continue numbering past whatever rows already exist so names stay unique.
    let counter = list.querySelectorAll(".pcs-msg-row").length;

    addBtn?.addEventListener("click", () => {
      const idx = counter++;
      const row = document.createElement("div");
      row.className = "pcs-msg-row";
      row.innerHTML = `
        <input type="checkbox" name="message.${idx}.enabled" checked>
        <input type="text" name="message.${idx}.text" value=""
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
