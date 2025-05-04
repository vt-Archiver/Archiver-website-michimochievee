export const delay = ms => new Promise(r => setTimeout(r, ms));

export async function waitForNonEmptyArchive(maxMs = 10000) {
  const t0 = Date.now();
  while (true) {
    if (window.allArchivedData &&
      ((window.allArchivedData.streams?.length ?? 0) +
        (window.allArchivedData.vods?.length ?? 0) +
        (window.allArchivedData.clips?.length ?? 0)) > 0) return;
    if (Date.now() - t0 > maxMs) return;
    await delay(100);
  }
}

export function getQuery() { return Object.fromEntries(new URLSearchParams(location.search)); }
export function setQuery(q) {
  const p = new URLSearchParams(q);
  history.pushState({}, "", location.pathname + "?" + p.toString());
}
