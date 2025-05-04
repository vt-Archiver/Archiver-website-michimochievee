export const qsParam = key =>
  new URLSearchParams(location.search).get(key) || "";

export const delay = ms => new Promise(r => setTimeout(r, ms));

export const escapeHtml = str =>
  str.replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const fmtTime = sec => {
  if (!isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = String(Math.floor(sec % 60)).padStart(2, "0");
  return `${m}:${s}`;
};
