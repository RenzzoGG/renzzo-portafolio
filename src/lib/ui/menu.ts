/** The native dialog provides Escape, focus containment and focus return. */
const dialog = document.querySelector<HTMLDialogElement>("[data-menu]");
const open = document.querySelector<HTMLButtonElement>("[data-menu-open]");

if (dialog && open) {
  open.addEventListener("click", () => {
    open.setAttribute("aria-expanded", "true");
    dialog.showModal();
  });
  dialog.addEventListener("close", () => {
    open.setAttribute("aria-expanded", "false");
  });
  dialog.addEventListener("click", (event) => {
    const target = event.target as Element;
    if (target.closest("[data-menu-close], a")) dialog.close();
  });
}

export {};
