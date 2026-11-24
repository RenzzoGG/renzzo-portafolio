/**
 * Opens a project's real route in place, so the WebGL canvas persists.
 * Back, Escape and the back link all return to the same project.
 */
const dialog = document.querySelector<HTMLDialogElement>(
  "[data-detail-dialog]",
);
const homeTitle = document.title;
let opening = false;
let returnTo: number | null = null;

/** Traversal would otherwise jump to a hash the reader has already left. */
const restoreScroll = () => {
  if (returnTo === null) return;
  scrollTo({ top: returnTo, behavior: "instant" });
  returnTo = null;
  // Back to auto only after the traversal, or it scrolls to the old hash.
  setTimeout(() => {
    history.scrollRestoration = "auto";
  }, 400);
};
const isDetailPath = () => /^\/work\/[^/]+\/?$/.test(location.pathname);

async function show(url: string) {
  if (!dialog) return;
  const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
  if (!response.ok) throw new Error("Project page unavailable");
  const page = new DOMParser().parseFromString(
    await response.text(),
    "text/html",
  );
  const detail = page.querySelector("[data-detail]");
  if (!detail) throw new Error("Project content missing");
  dialog.replaceChildren(document.importNode(detail, true));
  document.title = page.title;
  dialog.showModal();
}

if (dialog) {
  document.addEventListener("click", (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    const target = event.target as Element;
    if (dialog.open && target.closest("[data-detail-back]")) {
      event.preventDefault();
      dialog.close();
      return;
    }
    const link = target.closest<HTMLAnchorElement>("[data-detail-link]");
    if (!link) return;
    event.preventDefault();
    // A double click must not stack two history entries.
    if (opening) return;
    opening = true;
    returnTo = scrollY;
    history.scrollRestoration = "manual";
    show(link.href)
      .then(() => {
        history.pushState({ detail: true }, "", link.href);
      })
      .catch(() => {
        history.scrollRestoration = "auto";
        location.href = link.href; // The static route always works.
      })
      .finally(() => {
        opening = false;
      });
  });

  // Escape or the back link closed it, so the URL still has to go back.
  dialog.addEventListener("close", () => {
    document.title = homeTitle;
    if (isDetailPath()) history.back();
  });

  addEventListener("popstate", () => {
    if (isDetailPath()) {
      if (!dialog.open) {
        show(location.href).catch(() => {
          location.reload();
        });
      }
    } else {
      if (dialog.open) dialog.close();
      restoreScroll();
    }
  });
}

export {};
