let mediacardTemplate = "";

/* -------------------------------------------------- load HTML partial */
export async function loadMediacardTemplate(retry = 2) {
  try {
    const resp = await fetch("/partials/mediacard");
    if (!resp.ok) throw new Error(resp.status);
    mediacardTemplate = await resp.text();
  } catch (err) {
    if (retry) {
      await new Promise(r => setTimeout(r, 600));
      return loadMediacardTemplate(retry - 1);
    }
    console.error("Failed to load mediacard partial:", err);
    mediacardTemplate = `<div class="stream-item">{{title}}</div>`;
  }
}

const FALLBACK_THUMB = "/static/assets/placeholder.thumbnail.png";

/* --------------------------------------------------- build element */
export function createMediacardElement(item, orientation = "vertical") {
  if (!mediacardTemplate) {
    const div = document.createElement("div");
    div.className = "stream-item";
    div.textContent = item.title || "Untitled";
    return div;
  }

  let html = mediacardTemplate
    .replaceAll("{{id}}", item.id || "")
    .replaceAll("{{type}}", item.type || "")
    .replaceAll("{{title}}", item.title || "Untitled")
    .replaceAll("{{thumbnail}}", item.thumbnail || FALLBACK_THUMB)
    .replaceAll("{{view_count}}", (item.view_count ?? 0).toString())
    .replaceAll("{{duration}}", (item.duration ?? 0).toString())
    .replaceAll("{{date}}", item.date || "")
    .replaceAll("{{description}}", item.description || "");

  const wrap = document.createElement("div");
  wrap.innerHTML = html.trim();
  const el = wrap.firstElementChild;

  if (orientation === "horizontal") el.classList.add("horizontal");

  const img = el.querySelector(".stream-thumbnail");
  if (img) {
    img.onerror = function () {
      if (this.dataset.fallbackApplied) return;
      this.dataset.fallbackApplied = "1";
      this.src = FALLBACK_THUMB;
    };
  }

  const desc = el.querySelector(".stream-description");
  if (desc && !item.description) desc.remove();

  el.addEventListener("click", (ev) => {
    if (ev.target.closest(".menu-button") || ev.target.closest(".menu-dropdown"))
      return;
    if (!item.type || !item.id) return;
    window.location.href =
      `/player.html?type=${encodeURIComponent(item.type)}&id=${encodeURIComponent(item.id)}`;
  });

  return el;
}
