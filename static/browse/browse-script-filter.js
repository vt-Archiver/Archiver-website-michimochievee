import { getQuery, setQuery } from "./browse-script-utils.js";

export default function initFilterBar(onChange) {
  const input = document.getElementById("browseSearchInput");
  const btn = document.getElementById("browseSearchBtn");

  btn?.addEventListener("click", () => {
    const q = getQuery();
    q.include = input.value.trim();
    setQuery(q);
    onChange();
  });

  document.querySelectorAll(".browse-filter-btn").forEach(b =>
    b.addEventListener("click", () => {
      const q = getQuery();
      q.type = b.dataset.type;
      setQuery(q);
      onChange();
    }));
}
