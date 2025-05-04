import { qsParam, delay } from "./player-script-utils.js";
import initPlayer from "./player-script-player.js";
import initChat from "./player-script-chat.js";
import initSuggest from "./player-script-suggest.js";

(async function bootstrap() {
  while (!window.allArchivedData) await delay(50);

  const mediaId = qsParam("id");
  const mediaType = qsParam("type");
  const apiBase = (window.config && window.config.api_base_url) || "/api";

  let item = [
    ...window.allArchivedData.streams,
    ...window.allArchivedData.vods,
    ...window.allArchivedData.clips,
  ].find(x => x.id === mediaId) || {};

  if (!item.title) {
    try {
      const r = await fetch(`${apiBase}/browse?type=${mediaType}&limit=5`);
      if (r.ok) {
        item = (await r.json()).results.find(x => x.id === mediaId) || item;
      }
    } catch {
      console.warn("Failed to fetch item data:", err);
    }
  }

  initPlayer({ apiBase, mediaType, mediaId });

  const probe = await fetch(`${apiBase}/chat/${mediaId}?limit=1`);
  const hasChat = probe.ok && (await probe.json()).messages.length;
  const chatCol = document.getElementById("chat-col");
  const sugWrap = document.getElementById("suggestions");

  if (hasChat) {
    chatCol.classList.remove("chat-hidden");
    sugWrap.classList.add("suggest-bottom");
    initChat({ apiBase, mediaId });
  } else {
    sugWrap.classList.add("suggest-right");
  }

  await initSuggest({ apiBase, mediaId, mediaType, item });
})();
