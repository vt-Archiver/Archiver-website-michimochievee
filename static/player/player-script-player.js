import { fmtTime } from "./player-script-utils.js";

export default function initPlayer({ apiBase, mediaType, mediaId }) {

  const $ = s => document.querySelector(s);
  const id = s => document.getElementById(s);

  const shell = $(".player-shell");
  const video = id("video-player");
  if (!shell || !video) { console.error("player: missing elements"); return; }

  /* ───────── DOM refs ───────── */
  const bar = id("progress-wrap");
  const fill = id("progress-fill");
  const buf = id("progress-buffer");
  const bigT = id("time-display");
  const curT = id("current-time");
  const setBtn = id("btn-set");
  const panel = id("settings-panel");
  const speedBtns = panel?.querySelectorAll(".speed-btn") || [];

  /* helpers -------------------------------------------------------- */
  const FRAME = 1 / 30;
  const fmtHMS = sec => {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };
  const fmtAMPM = d => {
    let h = d.getHours(); const m = String(d.getMinutes()).padStart(2, "0");
    const am = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${m} ${am}`;
  };

  const tip = document.createElement("div");
  tip.className = "progress-tooltip"; tip.textContent = "0:00";
  bar?.appendChild(tip);

  const volR = id("vol-range");
  const volW = $(".vol-wrap");
  const volLbl = document.createElement("span");
  volLbl.className = "vol-percent"; volLbl.textContent = "100%";
  volW?.appendChild(volLbl);

  /* ───────── timer pill toggle ───────── */
  let timerMode = 0;
  const toggleTimer = () => { timerMode ^= 1; paint(); };
  bigT?.addEventListener("click", toggleTimer);
  curT?.addEventListener("click", toggleTimer);

  /* ───────── paint routine ───────── */
  const paint = () => {
    if (!video.duration) return;

    fill && (fill.style.width = 100 * (video.currentTime / video.duration) + "%");
    if (buf && video.buffered.length)
      buf.style.width = 100 * (video.buffered.end(video.buffered.length - 1) / video.duration) + "%";

    if (timerMode === 0) {
      const txt = `${fmtHMS(video.currentTime)} / ${fmtHMS(video.duration)}`;
      bigT && (bigT.textContent = txt);
      curT && (curT.textContent = fmtHMS(video.currentTime));
    } else {
      const left = video.duration - video.currentTime;
      const finish = new Date(Date.now() + left * 1000);
      const txt = `${fmtHMS(left)} left • Finish at ${fmtAMPM(finish)}`;
      bigT && (bigT.textContent = txt);
      curT && (curT.textContent = txt);
    }
  };

  /* ───────── tiny helpers ───────── */
  const togglePlay = () => (video.paused ? video.play() : video.pause());
  const seekBy = s => {
    video.currentTime = Math.max(0, Math.min(video.currentTime + s, video.duration));
    paint();
  };
  const setVolume = v => {
    video.volume = Math.min(Math.max(v, 0), 1);
    video.muted = video.volume === 0;
    drawVol(); updateVolIcon();
  };

  /* ───────── auto-hide bar ───────── */
  let hideT = null;
  const showControls = () => {
    shell.classList.remove("controls-hidden");
    clearTimeout(hideT);
    if (!video.paused)
      hideT = setTimeout(() => shell.classList.add("controls-hidden"), 2000);
  };
  ["mousemove", "touchstart"].forEach(e =>
    shell.addEventListener(e, showControls, { passive: true }));
  video.addEventListener("pause", () =>
    shell.classList.remove("controls-hidden", "playing"));
  video.addEventListener("play", () => { shell.classList.add("playing"); showControls(); });
  shell.classList.add("controls-hidden");

  /* ───────── scrubbing ───────── */
  if (bar) {
    let drag = false;
    const rect = () => bar.getBoundingClientRect();
    const tipAt = x => {
      const r = rect(); const pos = Math.max(0, Math.min(x - r.left, r.width));
      const t = (pos / r.width) * video.duration;
      tip.style.left = `${pos}px`; tip.textContent = fmtTime(t);
      return t;
    };
    bar.addEventListener("mousemove", e => {
      if (!video.duration) return;
      tip.classList.add("show");
      const t = tipAt(e.clientX);
      if (drag) { video.currentTime = t; paint(); }
    });
    bar.addEventListener("mouseleave", () => { if (!drag) tip.classList.remove("show"); });
    bar.onpointerdown = e => {
      drag = true; shell.classList.add("scrubbing"); showControls();
      bar.setPointerCapture(e.pointerId);
      video.currentTime = tipAt(e.clientX); paint();
    };
    const stop = () => {
      if (!drag) return;
      drag = false; shell.classList.remove("scrubbing"); tip.classList.remove("show");
    };
    bar.onpointermove = e => drag && (video.currentTime = tipAt(e.clientX), paint());
    bar.onpointerup = stop;
    bar.onpointercancel = stop;
  }

  /* ───────── volume logic ───────── */
  const drawVol = () => {
    const pct = Math.round(video.volume * 100);
    volLbl.textContent = `${pct}%`;
    volR && volR.style.setProperty("--fill", pct + "%");
  };
  if (volR) {
    volR.min = "0"; volR.max = "1"; volR.step = "0.01";
    volR.value = video.volume; drawVol();
    volR.oninput = () => setVolume(+volR.value);
  }
  const volIcon = id("btn-vol")?.firstElementChild;
  const updateVolIcon = () =>
    volIcon?.setAttribute("opacity", (video.muted || video.volume === 0) ? "0.5" : "1");
  id("btn-vol")?.addEventListener("click", () => { video.muted = !video.muted; updateVolIcon(); });

  /* ───────── control buttons ───────── */
  id("btn-play")?.addEventListener("click", togglePlay);
  id("btn-back")?.addEventListener("click", () => seekBy(-10));
  id("btn-fwd")?.addEventListener("click", () => seekBy(+10));
  id("btn-theatre")?.addEventListener("click",
    () => document.body.classList.toggle("theatre"));
  id("btn-full")?.addEventListener("click", () =>
    !document.fullscreenElement
      ? shell.requestFullscreen().catch(() => { })
      : document.exitFullscreen().catch(() => { }));
  document.addEventListener("fullscreenchange", showControls);

  /* ───────── click-to-toggle play ───────── */
  video.addEventListener("click", ev => {
    if (ev.target.closest("#ctrl-bar") || ev.target.closest("#settings-panel")) return;
    togglePlay();
  });

  /* ───────── SETTINGS PANEL ───────── */
  const openPanel = state => {
    if (!panel) return;
    panel.classList.toggle("open", state);
    setBtn.classList.toggle("toggled", state);
  };
  setBtn?.addEventListener("click", e => {
    e.stopPropagation();
    openPanel(!panel.classList.contains("open"));
    showControls();
  });
  document.addEventListener("click", e => {
    if (panel.classList.contains("open") &&
      !e.target.closest("#settings-panel") &&
      e.target !== setBtn) openPanel(false);
  });

  const updateSpeedUI = () =>
    speedBtns.forEach(b =>
      b.classList.toggle("selected", +b.dataset.speed === video.playbackRate));
  speedBtns.forEach(b => {
    b.addEventListener("click", () => {
      video.playbackRate = +b.dataset.speed;
      updateSpeedUI();
    });
  });
  updateSpeedUI();

  /* ───────── keyboard shortcuts ───────── */
  const isEditable = el =>
    el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);

  window.addEventListener("keydown", e => {
    if (isEditable(e.target)) return;

    switch (e.key) {
      /* play / pause */
      case " ":
      case "k": e.preventDefault(); togglePlay(); break;

      /* small seek */
      case "ArrowLeft": e.preventDefault(); seekBy(-5); break;
      case "ArrowRight": e.preventDefault(); seekBy(+5); break;

      /* big seek */
      case "j": seekBy(-10); break;
      case "l": seekBy(+10); break;

      /* volume */
      case "ArrowUp": e.preventDefault(); setVolume(video.volume + 0.05); break;
      case "ArrowDown": e.preventDefault(); setVolume(video.volume - 0.05); break;
      case "m": video.muted = !video.muted; updateVolIcon(); break;

      /* full-screen */
      case "f":
        !document.fullscreenElement
          ? shell.requestFullscreen().catch(() => { })
          : document.exitFullscreen().catch(() => { });
        break;

      /* frame-step */
      case ",":
        e.preventDefault();
        if (!video.paused) video.pause();
        seekBy(-FRAME); break;
      case ".":
        e.preventDefault();
        if (!video.paused) video.pause();
        seekBy(FRAME); break;

      /* digit seek */
      default:
        if ("0123456789".includes(e.key)) {
          const pct = Number(e.key) / 10;
          video.currentTime = video.duration * pct;
          paint();
        }
    }
  });

  /* ───────── chat sync (unchanged) ───────── */
  const dispatch = (n, t) => window.dispatchEvent(new CustomEvent(n, { detail: Math.floor(t) }));
  video.addEventListener("timeupdate", () => dispatch("timeupdate:player", video.currentTime));
  video.addEventListener("seeked", () => dispatch("seeked:player", video.currentTime));

  /* ───────── load media (HLS or MP4) ───────── */
  (async () => {
    const url = `${apiBase}/media/${mediaType}/${mediaId}`;
    let hls = url.endsWith(".m3u8");
    try {
      const h = await fetch(url, { method: "HEAD" });
      hls = h.headers.get("content-type")?.includes("mpegurl") || hls;
    } catch { }
    const native = video.canPlayType("application/vnd.apple.mpegurl") !== "";
    if (hls && !native && window.Hls) {
      const h = new Hls(); h.loadSource(url); h.attachMedia(video);
      h.on(Hls.Events.MANIFEST_PARSED, paint);
    } else {
      video.src = url; video.onloadedmetadata = paint;
    }
  })();

  video.addEventListener("timeupdate", paint);
  video.addEventListener("durationchange", paint);
}
