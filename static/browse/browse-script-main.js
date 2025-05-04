import { getQuery, setQuery } from "./browse-script-utils.js";
import initFilterBar from "./browse-script-filter.js";
import {
  loadMediacardTemplate,
  createMediacardElement
} from "../mediacard/mediacard-script.js";

const PAGE_SIZE = 20;
let offset = 0;
let finished = false;
let loading = false;

let grid = null;
let sentinel = null;

/* ---------------------------------------------------------------- */
(async function bootstrap() {
  await loadMediacardTemplate();
  initFilterBar(resetAndLoad);

  grid = document.getElementById("browseGrid");
  sentinel = document.getElementById("scrollSentinel");

  const io = new IntersectionObserver(
    e => { if (e[0].isIntersecting) loadNextBatch(); },
    { rootMargin: "0px", threshold: 1.0 }
  );
  io.observe(sentinel);

  resetAndLoad();
  window.addEventListener("popstate", resetAndLoad);
})();

/* ---------------------------------------------------------------- */
function resetAndLoad() {
  offset = 0;
  finished = false;
  grid.innerHTML = "";
  loadNextBatch();
}

async function loadNextBatch() {
  if (loading || finished) return;
  loading = true;

  const { type = "all", include = "", exclude = "" } = getQuery();

  const apiType = (() => {
    switch (type) {
      case "livestreams": return "streams";
      case "videos": return "vods";
      case "clips": return "clips";
      default: return "streams,vods,clips";
    }
  })();

  const qs = new URLSearchParams({
    type: apiType,
    limit: PAGE_SIZE,
    offset: offset
  });
  if (include) qs.append("include", include);
  if (exclude) qs.append("exclude", exclude);

  try {
    const resp = await fetch(`/api/browse?${qs}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const { results, total } = await resp.json();

    results.forEach(item => grid.appendChild(createMediacardElement(item)));
    offset += results.length;
    finished = offset >= total;

    if (!results.length && offset === 0) {
      grid.textContent = "Nothing matches your filter.";
    }
  } catch (err) {
    console.error("Browse lazy-load failed:", err);
  } finally {
    loading = false;
  }
}
