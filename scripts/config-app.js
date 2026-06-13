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
        const f = byKey[key] ?? { enabled: true, fontSize: 18, order: i };
        return { key, label, enabled: f.enabled, fontSize: f.fontSize, order: f.order };
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    return {
      actors,
      fields,
      rotateInterval: game.settings.get(MODULE_ID, "rotateInterval"),
      bgColor: game.settings.get(MODULE_ID, "bgColor"),
      bannerHeight: game.settings.get(MODULE_ID, "bannerHeight"),
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
      order: Number(v.order) || 0
    }));

    await game.settings.set(MODULE_ID, "selectedActors", selectedActors);
    await game.settings.set(MODULE_ID, "fieldConfig", fieldConfig);
    await game.settings.set(MODULE_ID, "rotateInterval", Number(data.rotateInterval) || 0);
    await game.settings.set(MODULE_ID, "bgColor", data.bgColor || "#00ff00");
    await game.settings.set(MODULE_ID, "bannerHeight", Number(data.bannerHeight) || 220);

    game.modules.get(MODULE_ID).api?.controller?.reload();
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
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
