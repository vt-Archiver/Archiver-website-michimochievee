import { escapeHtml } from "./player-script-utils.js";

const EMOTE_SRC = id => `/api/media/emotes/${id}`;
const EMOTE_CSS = "chat-emote";

let EMOTE_MAP = new Map();
const LOAD_STAT = new Map();

/* ---------- token → HTML ------------------------------------ */
function tokenToHTML(tok) {
  if (/^\s+$/.test(tok)) return tok;

  const stripped = tok.replace(/^:|:$/g, "");
  const id = EMOTE_MAP.get(stripped.toLowerCase());
  if (!id) return escapeHtml(tok);

  const st = LOAD_STAT.get(id);
  if (st === "fail") return escapeHtml(tok);
  if (!st) LOAD_STAT.set(id, "pending");

  return `<img src="${EMOTE_SRC(id)}" class="${EMOTE_CSS}"
                  alt="${escapeHtml(tok)}" data-eid="${id}" loading="lazy">`;
}

function renderEmotes(text) {
  return text.split(/(\s+)/).map(tokenToHTML).join("");
}

/* mark failures on first 404 --------------------------------- */
function watchImgErrors(container) {
  container.addEventListener("error", e => {
    const t = e.target;
    if (t.tagName !== "IMG" || !t.dataset.eid) return;
    const id = t.dataset.eid;
    if (LOAD_STAT.get(id) !== "fail") {
      LOAD_STAT.set(id, "fail");
    }
    const span = document.createElement("span");
    span.textContent = t.alt || "";
    t.replaceWith(span);
  }, true);
}

/* ------------------------------------------------------------ */
export default async function initChat({ apiBase, mediaId }) {
  const chatCol = document.getElementById("chat-col");
  const chatScroll = document.getElementById("chat-scroll");
  const chatToggle = document.getElementById("chat-toggle");
  const videoEl = document.getElementById("video-player");

  function syncH() {
    if (videoEl) chatCol.style.height =
      videoEl.getBoundingClientRect().height + "px";
  }
  syncH();
  if (window.ResizeObserver)
    new ResizeObserver(syncH).observe(videoEl);
  else
    window.addEventListener("resize", syncH, { passive: true });

  try {
    const r = await fetch("/api/emotes");
    if (r.ok) {
      const list = await r.json();
      EMOTE_MAP = new Map(list.map(e =>
        [e.name.toLowerCase(), e.id.toLowerCase()]));
    }
  } catch (err) {
    console.warn("emote list fetch failed:", err);
  }

  const bottomBtn = (() => {
    const b = document.createElement("button");
    b.id = "chat-bottom-btn";
    b.textContent = "▼";
    chatCol.appendChild(b);
    return b;
  })();

  watchImgErrors(chatCol);

  /* ───────── runtime state ───────── */
  let bufPtr = 0, chatBuffer = [], nextAfter = null, chatLoading = false;
  let offsetShift = 0, autoScroll = true, pendingLines = [], scheduled = new Set();

  const makeNode = m => {
    const d = document.createElement("div");
    d.className = "chat-item";
    d.innerHTML =
      `<span class="chat-author" style="color:${m.user.color}">
             ${escapeHtml(m.user.name)}</span>
           <span class="chat-message">${renderEmotes(m.body)}</span>`;
    return d;
  };

  const append = n => {
    chatScroll.appendChild(n);
    if (autoScroll && chatScroll.children.length > 500)
      chatScroll.removeChild(chatScroll.firstElementChild);
  };

  /* ---------------- fetchPage ---------------- */
  async function fetchPage() {
    if (chatLoading || nextAfter === false) return;
    chatLoading = true;
    try {
      const qs = [`limit=600`];
      if (nextAfter !== null) qs.push(`after=${nextAfter}`);
      const r = await fetch(`${apiBase}/chat/${mediaId}?${qs.join("&")}`);
      if (!r.ok) throw r.statusText;
      const { messages, next_after } = await r.json();
      if (messages.length && chatBuffer.length === 0)
        offsetShift = messages[0].t;
      messages.forEach(m => (m.t -= offsetShift));
      chatBuffer.push(...messages);
      nextAfter = next_after ?? false;
    } catch (err) {
      console.warn("chat fetch failed:", err);
    } finally {
      chatLoading = false;
    }
  }

  /* ---------------- showGroup ---------------- */
  function showGroup(group) {
    if (!group.length) return;
    const step = 1000 / group.length;
    group.forEach((m, i) => {
      const id = setTimeout(() => {
        if (autoScroll) append(makeNode(m));
        else pendingLines.push(makeNode(m));
        scheduled.delete(id);
        if (autoScroll) chatScroll.scrollTop = chatScroll.scrollHeight;
      }, i * step);
      scheduled.add(id);
    });
  }

  /* flush ----------------------------------------------------- */
  function flush(sec) {
    while (bufPtr < chatBuffer.length && chatBuffer[bufPtr].t <= sec) {
      const batchT = chatBuffer[bufPtr].t;
      const batch = [];
      while (bufPtr < chatBuffer.length && chatBuffer[bufPtr].t === batchT)
        batch.push(chatBuffer[bufPtr++]);
      showGroup(batch);
    }
    if (nextAfter !== false) {
      const last = chatBuffer.at(-1);
      if (!last || sec + 60 > last.t) fetchPage();
    }
  }

  /* rebuild (after big seek) ---------------------------------- */
  function rebuild(sec) {
    scheduled.forEach(clearTimeout); scheduled.clear();
    chatScroll.innerHTML = "";
    pendingLines.length = 0;
    bufPtr = 0; autoScroll = true;

    if (chatBuffer.length && sec < chatBuffer[0].t) {
      chatBuffer = []; nextAfter = null;
    }
    (async function loop() {
      while (chatBuffer.length === 0 || chatBuffer.at(-1).t < sec) {
        await fetchPage();
        if (nextAfter === false) break;
      }
      flush(sec);
    })();
  }

  /* scroll logic ---------------------------------------------- */
  chatScroll.addEventListener("scroll", () => {
    const atBottom =
      chatScroll.scrollTop + chatScroll.clientHeight >=
      chatScroll.scrollHeight - 10;

    if (atBottom && !autoScroll) {
      autoScroll = true;
      chatCol.classList.remove("chat-paused");
      pendingLines.forEach(append);
      pendingLines.length = 0;
      chatScroll.scrollTop = chatScroll.scrollHeight;
    } else if (!atBottom && autoScroll) {
      autoScroll = false;
      chatCol.classList.add("chat-paused");
    }
  });

  bottomBtn.onclick = () => (chatScroll.scrollTop = chatScroll.scrollHeight);
  chatToggle.onclick = () => chatCol.classList.toggle("chat-collapsed");

  /* video events ---------------------------------------------- */
  window.addEventListener("timeupdate:player", e => flush(e.detail));
  window.addEventListener("seeked:player", e => {
    const sec = e.detail;
    if (sec < (chatBuffer[bufPtr - 1]?.t || 0)) rebuild(sec); else flush(sec);
  });

  /* bootstrap -------------------------------------------------- */
  const probe = await fetch(`${apiBase}/chat/${mediaId}?limit=1`);
  if (!(probe.ok && (await probe.json()).messages.length)) return;

  chatCol.classList.remove("chat-hidden");
  await fetchPage();
  flush(0);
}
