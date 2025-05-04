import {
  loadMediacardTemplate,
  createMediacardElement
} from "../mediacard/mediacard-script.js";
import { fmtTime } from "./player-script-utils.js";


/* ------------------------------------------------------------------ helpers */

const delay = ms => new Promise(r => setTimeout(r, ms));

async function waitForNonEmptyArchive(maxMs = 10000) {
  const t0 = Date.now();
  while (true) {
    const A = window.allArchivedData;
    if (A &&
        ((A.streams?.length ?? 0) +
         (A.vods?.length    ?? 0) +
         (A.clips?.length   ?? 0)) > 0) {
      return;
    }
    if (Date.now() - t0 > maxMs) return;   // give up – we’ll just show nothing
    await delay(100);
  }
}


/* ------------------------------------------------------------------ main  */

async function initSuggest({ apiBase, mediaId, mediaType, item }) {

  const metaAv    = document.getElementById("meta-avatar");
  const metaTit   = document.getElementById("meta-title-text");
  const metaDate  = document.getElementById("meta-date");
  const metaViews = document.getElementById("meta-views");
  const metaDur   = document.getElementById("meta-duration");
  const sugWrap   = document.getElementById("suggestions");
  const sugScroll = document.getElementById("sug-scroll");

  /* ------------- fill META header --------------------------------- */
  metaAv.src            = window.config?.streamer?.pfp_url || "";
  metaTit.textContent   = item.title || "(untitled)";
  metaDate.textContent  = item.date || "";
  metaViews.textContent = item.view_count != null
    ? `${item.view_count.toLocaleString()} views` : "";
  if (item.duration)    metaDur.textContent = fmtTime(item.duration);

  /* ------------- action buttons ----------------------------------- */
  document.getElementById("btn-share")
    .onclick = () => navigator.clipboard.writeText(location.href);
  document.getElementById("btn-download")
    .onclick = () => window.open(
      `${apiBase}/media/${mediaType}/${mediaId}?download=true`);
  document.getElementById("btn-save")
    .onclick = () => alert("Save feature coming soon 😊");

  window.addEventListener("scroll", () =>
    document.body.classList.toggle("show-extras", window.scrollY > 0));

  await waitForNonEmptyArchive();
  await loadMediacardTemplate();

  const orient =
    sugWrap.classList.contains("suggest-right") ? "horizontal" : "vertical";

  /* ------------- populate the rail -------------------------------- */
  [
    ...window.allArchivedData.streams,
    ...window.allArchivedData.vods,
    ...window.allArchivedData.clips,
  ]
    .filter(x => x.id !== mediaId)
    .slice(0, 10)
    .forEach(o => sugScroll.appendChild(createMediacardElement(o, orient)));
}

/* ------------------------------------------------------------------ */
export default initSuggest;
