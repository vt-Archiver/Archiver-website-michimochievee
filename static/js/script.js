(async function () {
  console.log("[script.js] Starting main IIFE...");
  window.config = null;
  window.themes = [];
  window.currentThemeIndex = 0;
  window.currentMode = "dark";

  window.allArchivedData = {
    streams: [],
    vods: [],
    clips: []
  };

  async function loadConfig() {
    console.log("[script.js] Loading config.json...");
    try {
      const resp = await fetch('config.json');
      if (!resp.ok) throw new Error(`HTTP error! Status: ${resp.status}`);
      window.config = await resp.json();
      console.log("[script.js] config.json loaded:", window.config);

      if (window.config && window.config.themes) {
        window.themes = window.config.themes;
      } else {
        console.warn("[script.js] No 'themes' array found in config.json.");
      }
    } catch (err) {
      console.error("[script.js] Failed to load config.json:", err);
    }
  }

  async function fetchAllArchivedData() {
    let baseUrl = "/api";
    if (window.config && window.config.api_base_url) {
      baseUrl = window.config.api_base_url;
    }
    const url = `${baseUrl}/browse?type=streams,vods,clips&limit=20`;
    console.log("[script.js] Fetching archived data from =>", url);

    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        throw new Error(`Failed to fetch data. Status: ${resp.status}`);
      }
      const json = await resp.json();
      console.log("[script.js] Got response from /browse =>", json);

      const allItems = json.results || [];
      window.allArchivedData.streams = allItems.filter(i => i.type === 'stream');
      window.allArchivedData.vods = allItems.filter(i => i.type === 'vod');
      window.allArchivedData.clips = allItems.filter(i => i.type === 'clip');

      console.log("[script.js] window.allArchivedData updated =>", window.allArchivedData);
    } catch (err) {
      console.error("[script.js] Error fetching archived data:", err);
    }
  }

  function clearColorVars(prefix, maxCount) {
    for (let i = 0; i < maxCount; i++) {
      document.documentElement.style.removeProperty(`--${prefix}-${i}`);
    }
  }

  function applyColorArray(prefix, arr, maxCount) {
    clearColorVars(prefix, maxCount);
    arr.forEach((c, i) => {
      if (i < maxCount) {
        document.documentElement.style.setProperty(`--${prefix}-${i}`, c);
      }
    });
  }

  function applyThemeWithMode(theme, mode) {
    if (!theme) return;
    const colorSets = theme[mode] || theme.dark;
    if (!colorSets) return;

    const MAX_PRIMARY = 4, MAX_SECONDARY = 4, MAX_HIGHLIGHT = 4;
    if (colorSets.primary) applyColorArray('primary', colorSets.primary, MAX_PRIMARY);
    if (colorSets.secondary) applyColorArray('secondary', colorSets.secondary, MAX_SECONDARY);
    if (colorSets.highlight) applyColorArray('highlight', colorSets.highlight, MAX_HIGHLIGHT);

    const textColor = (colorSets.highlight && colorSets.highlight[0])
      ? colorSets.highlight[0]
      : '#ffffff';
    document.documentElement.style.setProperty('--text-color', textColor);

    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
      themeIcon.textContent = (window.currentMode === "dark") ? "☀" : "🌙";
    }
  }

  window.toggleDarkLight = function () {
    window.currentMode = (window.currentMode === "dark") ? "light" : "dark";
    const activeTheme = window.themes[window.currentThemeIndex];
    applyThemeWithMode(activeTheme, window.currentMode);
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
      toggleBtn.classList.toggle('toggled');
    }
  };

  window.applyThemeIndex = function (i) {
    if (!window.themes || i < 0 || i >= window.themes.length) return;
    window.currentThemeIndex = i;
    applyThemeWithMode(window.themes[i], window.currentMode);
  };

  function pickActiveThemeByDate() {
    if (!window.themes.length) return 0;
    const now = Math.floor(Date.now() / 1000);
    let chosenIndex = 0;
    window.themes.forEach((t, i) => {
      if (t.start_time <= now) {
        chosenIndex = i;
      }
    });
    return chosenIndex;
  }

  console.log("[script.js] main flow start...");
  await loadConfig();

  if (window.themes.length) {
    window.currentThemeIndex = pickActiveThemeByDate();
    applyThemeWithMode(window.themes[window.currentThemeIndex], window.currentMode);
  }

  await fetchAllArchivedData();

  if (window.config && window.config.streamer) {
    const st = window.config.streamer;
    const pfpImg = document.getElementById('streamer-pfp');
    if (pfpImg && st.pfp_url) {
      pfpImg.src = st.pfp_url;
      pfpImg.alt = st.name ? `${st.name} PFP` : "PFP";
    }
    const heroTitle = document.getElementById('hero-title');
    if (heroTitle && st.name) {
      heroTitle.textContent = `Welcome to ${st.name}'s Archive`;
    }
    const navPfpHome = document.getElementById('nav-pfp-home');
    if (navPfpHome && st.pfp_url) {
      navPfpHome.src = st.pfp_url;
      navPfpHome.alt = "Home";
    }
  }

  console.log("[script.js] ...done main flow.");
})();
