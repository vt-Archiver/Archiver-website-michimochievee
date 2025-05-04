/* =================================================================
   BOOTSTRAP
   ================================================================= */
document.addEventListener("DOMContentLoaded", () => {
  waitForHeaderAndInit();
  handleBreakpoint();
  window.addEventListener("resize", debounce(handleBreakpoint, 120));
});

function waitForHeaderAndInit() {
  if (!document.getElementById("site-header")) {
    setTimeout(waitForHeaderAndInit, 50);
    return;
  }
  initNavVisibility();
  initBurger();
  initThemeToggle();
  initDropdownHoverDelay();

  waitForData(() => !!window.themes).then(initThemesMenu);
  waitForData(() => !!window.config?.streamer?.socials).then(initSocialsMenu);
  waitForData(() => !!window.config?.resources).then(initResourcesMenu);
}

function waitForData(pred, timeout = 1e4, interval = 100) {
  return new Promise((res, rej) => {
    const t0 = Date.now();
    (function loop() {
      if (pred()) return res();
      if (Date.now() - t0 > timeout) return rej("timeout");
      setTimeout(loop, interval);
    })();
  });
}

/* =================================================================
   BURGER / MOBILE PANEL
   ================================================================= */
function initBurger() {
  const btn = document.getElementById("burgerBtn");
  const pnl = document.getElementById("navPanel");
  if (!btn || !pnl) return;

  btn.addEventListener("click", () => {
    if (pnl.classList.toggle("mobile-open")) return;
    closeMobilePanel();
  });
  pnl.querySelectorAll("a").forEach(a =>
    a.addEventListener("click", closeMobilePanel)
  );
}
function closeMobilePanel() {
  const pnl = document.getElementById("navPanel");
  if (!pnl) return;
  pnl.classList.remove("mobile-open");
  pnl.querySelectorAll(".dropdown.forced-open").forEach(d =>
    d.classList.remove("forced-open")
  );
}

/* =================================================================
   THEME TOGGLE
   ================================================================= */
function initThemeToggle() {
  const t = document.getElementById("themeToggle");
  if (!t) return;
  t.onclick = () => {
    window.toggleDarkLight?.();
    t.classList.toggle("toggled");
  };
}

/* =================================================================
   BREAKPOINT HELPERS
   ================================================================= */
function handleBreakpoint() {
  const isMobile = window.innerWidth <= 980;
  document.body.classList.toggle("breakpoint", isMobile);
  if (!isMobile) closeMobilePanel();
}
function debounce(fn, ms) { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; }

/* =================================================================
   MAIN NAV-VISIBILITY CONTROLLER
   ================================================================= */
const NEAR_TOP = 20;
const TOP_ZONE = 0.10;
const GRACE_MS = 0;

function initNavVisibility() {
  const hdr = document.getElementById("site-header");
  const hero = document.getElementById("hero");
  const optIn = document.body.classList.contains("nav-hide-on-load");
  if (!hdr) return;

  hdr.classList.add("pfp-active");
  let heroH = hero ? hero.offsetHeight : 0;
  if (hero) window.addEventListener("resize",
    () => { heroH = hero.offsetHeight; }, { passive: true });

  let pointerInZone = false;
  let navHover = false;
  let hideTimer = null;

  function needVisible() {
    if (!optIn) return true;
    return (window.scrollY > NEAR_TOP) || pointerInZone || navHover;
  }

  function update() {
    const belowHero = hero ? window.scrollY > heroH : true;
    hdr.classList.toggle("pfp-active", belowHero);

    if (needVisible()) {
      clearTimeout(hideTimer);
      hideTimer = null;
      hdr.classList.add("visible");
    } else if (!hideTimer) {
      hideTimer = setTimeout(() => hdr.classList.remove("visible"), GRACE_MS);
    }
  }

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("mousemove", e => {
    pointerInZone = e.clientY <= window.innerHeight * TOP_ZONE;
    update();
  }, { passive: true });

  hdr.addEventListener("mouseenter", () => { navHover = true; update(); });
  hdr.addEventListener("mouseleave", () => { navHover = false; update(); });

  update();
}

/* =================================================================
   MENU FILLERS  (themes / socials / resources)
   ================================================================= */
function fillBoth(dID, mID, html) {
  const d = document.getElementById(dID);
  const m = document.getElementById(mID);
  if (d) d.innerHTML = html;
  if (m) m.innerHTML = html;
}

/* Themes */
function initThemesMenu() {
  const list = window.themes || [];
  const html = list.map((t, i) =>
    `<li class="dropdown-item"><a href="#" data-idx="${i}">${t.name}` +
    (i === window.currentThemeIndex ? " ✓" : "") +
    `</a></li>`
  ).join("");
  fillBoth("themes-desktop", "themes-mobile", html || "<li>No themes</li>");

  document.querySelectorAll("[data-idx]").forEach(a => {
    a.onclick = e => {
      e.preventDefault();
      window.applyThemeIndex?.(+a.dataset.idx);
      initThemesMenu();
    };
  });
}

/* Socials */
function initSocialsMenu() {
  const soc = window.config?.streamer?.socials || {};
  const arr = [];
  const add = (l, u) => u && arr.push({ l, u });
  add("Twitch", soc.twitch);
  add("Twitter", soc.twitter);
  add("Bluesky", soc.bluesky);
  add("Mastodon", soc.mastodon);
  if (typeof soc.youtube === "object") add("YouTube", soc.youtube.url_name || soc.youtube.url_id);
  add("Discord", soc.discord);
  add("TikTok", soc.tiktok);

  const html = arr.length
    ? arr.map(i => `<li class="dropdown-item"><a href="${i.u}" target="_blank">${i.l}</a></li>`).join("")
    : '<li class="dropdown-item">No socials</li>';
  fillBoth("socials-desktop", "socials-mobile", html);
}

/* Resources */
function initResourcesMenu() {
  const res = window.config?.resources || {};
  const arr = [];
  for (const [k, v] of Object.entries(res)) {
    const o = typeof v === "object" ? v : { url: v };
    if (!o.url) continue;
    arr.push({ l: o.label || k.replace(/_/g, " "), u: o.url, t: o.target ?? "_blank" });
  }
  const html = arr.length
    ? arr.map(i => `<li class="dropdown-item"><a href="${i.u}" target="${i.t}">${i.l}</a></li>`).join("")
    : '<li class="dropdown-item">No resources</li>';
  fillBoth("resources-desktop", "resources-mobile", html);
}

/* =================================================================
   HOVER-DELAY FOR DROPDOWNS
   ================================================================= */
function initDropdownHoverDelay() {
  document.querySelectorAll(".dropdown").forEach(d => {
    let t = null;
    d.onmouseenter = () => { clearTimeout(t); d.classList.add("forced-open"); };
    d.onmouseleave = () => { t = setTimeout(() => d.classList.remove("forced-open"), 10); };
  });
}
