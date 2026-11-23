/**
 * Skills tabs (WAI-ARIA pattern, automatic activation). Without this script
 * every category stays visible as a plain list. It ignores the motion gate.
 */
import { createMatrix } from "../sets/matrix.ts";

const board = document.querySelector<HTMLElement>("[data-board]");

if (board) {
  const tablist = board.querySelector<HTMLElement>("[role='tablist']");
  const display = board.querySelector<HTMLElement>("[data-board-display]");
  const canvas = board.querySelector<HTMLCanvasElement>("canvas");
  const tabs = [...board.querySelectorAll<HTMLButtonElement>("[role='tab']")];
  const panels = tabs.map((tab) =>
    document.getElementById(tab.getAttribute("aria-controls") ?? ""),
  );

  panels.forEach((panel, index) => {
    if (!panel) return;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", tabs[index]?.id ?? "");
    panel.tabIndex = 0;
  });
  if (tablist) tablist.hidden = false;
  if (display) display.hidden = false;
  board.dataset.ready = "";

  const matrix = canvas
    ? createMatrix(
        canvas,
        panels.map((panel) =>
          [...(panel?.querySelectorAll("li") ?? [])].map((item) =>
            item.textContent.trim(),
          ),
        ),
      )
    : null;

  const select = (active: number, focus: boolean) => {
    tabs.forEach((tab, index) => {
      const selected = index === active;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      panels[index]?.toggleAttribute("data-inactive", !selected);
    });
    matrix?.show(active);
    if (focus) tabs[active]?.focus();
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      select(index, false);
    });
    tab.addEventListener("keydown", (event) => {
      const last = tabs.length - 1;
      const next = {
        ArrowRight: index === last ? 0 : index + 1,
        ArrowLeft: index === 0 ? last : index - 1,
        Home: 0,
        End: last,
      }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      select(next, true);
    });
  });

  select(0, false);
}
