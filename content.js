// =============================================
// DEFAULT CONFIG
// =============================================
const DEFAULT_CONFIG = {
  keywords: [
    "stake",
    "slot",
    "casino",
    "777",
    "judi",
    "bet",
    "togel",
    "terbangrusia",
    "goratu",
    "menujupenta",
    "injd",
    "akseskaiko",
    "kegz",
    "goid",
    "bergurukecina",
    "attirecideryeah",
    "orangarab",
    "388hero",
    "bandarxl",
    "emas5000",
    "qqsawer",
    "stkawaii",
    "slot7000",
    "papa303",
    "dorawin",
    "sabangbet",
    "setiatoto",
    "ketuaslot",
    "ketuagacor",
    "vitatoto",
    "lancar138",
    "hokijp168",
    "erigo4d",
    "gacor",
    "maxwin",
    "cuan",
    "wede",
    "jp168",
    "toto",
    "scatter",
    "jackpot",
  ],
  tlds: [
    ".space",
    ".click",
    ".xyz",
    ".top",
    ".fun",
    ".site",
    ".online",
    ".live",
    ".store",
    ".buzz",
    ".quest",
    ".icu",
    ".rest",
    ".bio",
    ".surf",
    ".money",
    ".sbs",
    ".cc",
    ".cam",
    ".biz",
    ".ink",
    ".vip",
    ".onl",
  ],
  domains: ["blogger.googleusercontent.com"],
  shorteners: [
    "cutt.ly",
    "bit.ly",
    "tinyurl.com",
    "s.id",
    "shorturl.at",
    "rb.gy",
    "t.ly",
    "rebrand.ly",
    "cepaturl.com",
    "pastibagus.com",
    "linkmasuk.vip",
    "lae.onl",
    "williamcgordon.com",
  ],
};

// Container iklan yang sudah diketahui
const AD_CONTAINER_SELECTORS = [
  ".adsx",
  ".player-iklan",
  "[class^='teaser']",
  "[id^='teaser']",
  "[id^='playerIklan']",
  // WordPress Popup Builder plugin
  "[class*='sgpb-popup-dialog-main-div-theme-wrapper']",
  "[class*='sgpb-popup-overlay']",
  // Oploverz-style ad containers
  ".kln",
  "#overplay",
  "#shadow",
  ".blox.mlb",
];

// =============================================
// INSTANT CSS HIDE — dijalankan SEBELUM halaman render
// CSS diterapkan synchronously, jadi elemen iklan
// langsung disembunyikan tanpa sempat muncul
// =============================================
(function injectHideCSS() {
  const style = document.createElement("style");
  style.textContent = `
    /* Hide known ad containers */
    ${AD_CONTAINER_SELECTORS.join(",\n    ")} {
      display: none !important;
    }
    /* Hide common overlay popups dari plugin iklan */
    [class*="sgpb-popup-overlay"],
    [class*="sgpb-popup-dialog-main-div"] {
      display: none !important;
    }
  `;
  (document.head || document.documentElement).appendChild(style);
})();

// =============================================
// ACTIVE CONFIG (di-load dari storage)
// =============================================
let CONFIG = {
  keywords: [...DEFAULT_CONFIG.keywords],
  suspiciousTLDs: [...DEFAULT_CONFIG.tlds],
  suspiciousImageDomains: [...DEFAULT_CONFIG.domains],
  shortenerDomains: [...DEFAULT_CONFIG.shorteners],
};
let isEnabled = true;
let antiTabEnabled = true;
let antiTabMode = "normal"; // "normal" atau "aggressive"

// =============================================
// LOAD CONFIG DARI CHROME STORAGE
// =============================================
async function loadConfig() {
  try {
    const data = await chrome.storage.local.get([
      "judolConfig",
      "judolEnabled",
      "antiTabEnabled",
      "antiTabMode",
    ]);

    // Enabled state
    isEnabled = data.judolEnabled !== undefined ? data.judolEnabled : true;

    // Anti-tab settings
    antiTabEnabled =
      data.antiTabEnabled !== undefined ? data.antiTabEnabled : true;
    antiTabMode = data.antiTabMode || "normal";

    // Merge default + custom items
    const saved = data.judolConfig || {};

    CONFIG.keywords = mergeItems(DEFAULT_CONFIG.keywords, saved.keywords);
    CONFIG.suspiciousTLDs = mergeItems(DEFAULT_CONFIG.tlds, saved.tlds);
    CONFIG.suspiciousImageDomains = mergeItems(
      DEFAULT_CONFIG.domains,
      saved.domains,
    );
    CONFIG.shortenerDomains = mergeItems(
      DEFAULT_CONFIG.shorteners,
      saved.shorteners,
    );
  } catch (e) {
    // Fallback to defaults if storage fails
    console.log("[Remove Judol] Using default config");
  }
}

function mergeItems(defaults, savedCategory) {
  if (!savedCategory) return [...defaults];
  const custom = savedCategory.custom || [];
  const defaultList = savedCategory.defaults || defaults;
  const disabled = savedCategory.disabled || [];
  // Combine, deduplicate, then filter out disabled items
  const merged = [...new Set([...defaultList, ...custom])];
  return merged.filter((item) => !disabled.includes(item));
}

// =============================================
// HELPER: cek apakah URL mencurigakan
// =============================================
function isSuspiciousUrl(url) {
  if (!url) return false;

  try {
    const parsed = new URL(url, window.location.origin);
    const hostname = parsed.hostname.toLowerCase();

    // SKIP jika link ke domain yang sama (bukan iklan)
    if (hostname === window.location.hostname) return false;

    // Cek keyword hanya di hostname (bukan full URL path)
    // Ini mencegah false positive seperti "betsu" match "bet"
    if (CONFIG.keywords.some((k) => hostname.includes(k))) return true;

    // Cek TLD mencurigakan
    if (CONFIG.suspiciousTLDs.some((tld) => hostname.endsWith(tld)))
      return true;

    // Cek shortener
    if (
      CONFIG.shortenerDomains.some(
        (d) => hostname === d || hostname.endsWith("." + d),
      )
    )
      return true;
  } catch (e) {
    // Fallback: jika URL tidak bisa di-parse, cek keyword di seluruh string
    const urlLower = url.toLowerCase();
    if (CONFIG.keywords.some((k) => urlLower.includes(k))) return true;
  }

  return false;
}

// =============================================
// HELPER: cek apakah gambar dari domain mencurigakan
// =============================================
function isSuspiciousImage(imgSrc) {
  if (!imgSrc) return false;
  return CONFIG.suspiciousImageDomains.some((d) =>
    imgSrc.toLowerCase().includes(d),
  );
}

// =============================================
// COUNTER: hitung elemen yang diblokir
// =============================================
let blockedInSession = 0;

function incrementBlocked(count = 1) {
  blockedInSession += count;
  // Update storage counter (per hari)
  chrome.storage.local.get("judolBlockedToday", (data) => {
    const today = new Date().toDateString();
    const stored = data.judolBlockedToday || { date: today, count: 0 };

    // Jika stored adalah angka (dari bug lama), konversi ke objek
    const obj =
      typeof stored === "number" ? { date: today, count: stored } : stored;

    if (obj.date !== today) {
      obj.date = today;
      obj.count = 0;
    }
    obj.count += count;

    chrome.storage.local.set({ judolBlockedToday: obj });
  });
}

// =============================================
// STRATEGI 1-3: Hapus <a> yang berisi <img> iklan
// =============================================
// Helper: ambil src gambar dari berbagai atribut (termasuk lazy-load)
function getImgSrc(img) {
  return (
    img.getAttribute("src") ||
    img.getAttribute("data-lazy-src") ||
    img.getAttribute("data-src") ||
    img.getAttribute("data-original") ||
    ""
  );
}

function removeJudolLinks() {
  const links = document.querySelectorAll("a");

  links.forEach((link) => {
    const href = link.getAttribute("href") || "";
    const img = link.querySelector("img");

    // syarat utama: <a> harus berisi <img>
    if (!img) return;

    const imgSrc = getImgSrc(img);

    // Cek URL mencurigakan di href
    const suspiciousLink = isSuspiciousUrl(href);

    // Cek gambar dari domain mencurigakan + link external
    let suspiciousImg = false;
    if (isSuspiciousImage(imgSrc)) {
      try {
        const linkUrl = new URL(href, window.location.origin);
        suspiciousImg = linkUrl.hostname !== window.location.hostname;
      } catch (e) {}
    }

    if (suspiciousLink || suspiciousImg) {
      link.remove();
      incrementBlocked();
    }
  });
}

// =============================================
// STRATEGI 4-5: Hapus overlay/popup/container iklan
// =============================================
function removeOverlayAds() {
  // --- Cara 1: Hapus container iklan yang sudah diketahui ---
  const knownSelectors = AD_CONTAINER_SELECTORS.join(", ");
  document.querySelectorAll(knownSelectors).forEach((el) => {
    el.remove();
    incrementBlocked();
  });

  // --- Cara 2: Hapus div fixed/z-index tinggi yang isinya iklan ---
  document.querySelectorAll("div").forEach((div) => {
    const style = window.getComputedStyle(div);
    const isFixed = style.position === "fixed";
    const zIndex = parseInt(style.zIndex) || 0;

    if (!isFixed || zIndex < 999) return;

    const links = div.querySelectorAll("a");
    let hasSuspiciousContent = false;

    links.forEach((link) => {
      const href = link.getAttribute("href") || "";
      const img = link.querySelector("img");
      const imgSrc = img ? img.getAttribute("src") || "" : "";

      if (isSuspiciousUrl(href) || isSuspiciousImage(imgSrc)) {
        hasSuspiciousContent = true;
      }
    });

    if (hasSuspiciousContent) {
      div.remove();
      incrementBlocked();
    }
  });

  // --- Cara 3: Hapus div[onclick] yang berisi gambar iklan ---
  document.querySelectorAll("div[onclick]").forEach((div) => {
    const onclick = div.getAttribute("onclick") || "";
    const img = div.querySelector("img");
    if (!img) return;

    const imgSrc = getImgSrc(img);
    if (isSuspiciousUrl(onclick) || isSuspiciousImage(imgSrc)) {
      div.remove();
      incrementBlocked();
    }
  });
}
// =============================================
// STRATEGI 6: Blokir popup/redirect ke situs judol
// =============================================
let popupBlockerInjected = false;

function blockJudolPopups() {
  if (popupBlockerInjected) return;
  popupBlockerInjected = true;

  // Pass config ke inject.js via hidden JSON element
  const configEl = document.createElement("script");
  configEl.type = "application/json";
  configEl.id = "__judol_config__";
  configEl.textContent = JSON.stringify({
    keywords: CONFIG.keywords,
    tlds: CONFIG.suspiciousTLDs,
    shorteners: CONFIG.shortenerDomains,
    antiTabEnabled: antiTabEnabled,
    antiTabMode: antiTabMode,
  });
  document.documentElement.prepend(configEl);

  // Inject script sebagai file external (CSP-compliant)
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("inject.js");
  document.documentElement.prepend(script);
  script.onload = () => script.remove();
}

// Update config di inject.js yang sudah jalan via custom event
function updateInjectedConfig() {
  document.dispatchEvent(
    new CustomEvent("__judol_config_update__", {
      detail: {
        keywords: CONFIG.keywords,
        tlds: CONFIG.suspiciousTLDs,
        shorteners: CONFIG.shortenerDomains,
        antiTabEnabled: antiTabEnabled,
        antiTabMode: antiTabMode,
      },
    }),
  );
}

// =============================================
// MAIN
// =============================================
function removeAllAds() {
  if (!isEnabled) return;
  removeJudolLinks();
  removeOverlayAds();
}

// Listen for config updates from popup
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "configUpdated") {
    loadConfig().then(() => {
      removeAllAds();
      // Update config di inject.js yang sudah jalan
      updateInjectedConfig();
    });
  }
  if (msg.type === "toggleEnabled") {
    isEnabled = msg.enabled;
    if (isEnabled) removeAllAds();
  }
  if (msg.type === "antiTabUpdated") {
    antiTabEnabled = msg.antiTabEnabled;
    antiTabMode = msg.antiTabMode;
    updateInjectedConfig();
  }
  if (msg.type === "startPicker") {
    startElementPicker();
  }
});

// =============================================
// ELEMENT PICKER
// =============================================
function startElementPicker() {
  // Inject picker.js ke halaman
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("picker.js");
  document.documentElement.appendChild(script);
  script.onload = () => script.remove();
}

// Listen hasil dari picker
window.addEventListener("__judol_picker_result__", async (e) => {
  const items = e.detail;
  if (!items) return;

  // Load config terbaru
  const data = await chrome.storage.local.get("judolConfig");
  const cfg = data.judolConfig || {};

  // Ensure structure
  const categories = ["keywords", "tlds", "domains", "shorteners"];
  categories.forEach((key) => {
    if (!cfg[key]) cfg[key] = { defaults: [], custom: [], disabled: [] };
    if (!cfg[key].custom) cfg[key].custom = [];
    if (!cfg[key].disabled) cfg[key].disabled = [];
  });

  let totalAdded = 0;

  // Tambah ke masing-masing kategori
  categories.forEach((key) => {
    const newItems = items[key] || [];
    const allExisting = [...(cfg[key].defaults || []), ...cfg[key].custom];
    newItems.forEach((item) => {
      const lower = item.toLowerCase();
      if (!allExisting.includes(lower)) {
        cfg[key].custom.push(lower);
        totalAdded++;
      }
    });
  });

  if (totalAdded > 0) {
    await chrome.storage.local.set({ judolConfig: cfg });
    // Reload config
    await loadConfig();
    removeAllAds();
    updateInjectedConfig();
  }
});

// Init — jalan di document_start, jadi body mungkin belum ada
(async () => {
  await loadConfig();

  // Inject popup blocker SEGERA (sebelum popunder scripts load)
  if (isEnabled) blockJudolPopups();

  // Tunggu DOM siap baru jalankan ad removal
  function onReady() {
    removeAllAds();
    const observer = new MutationObserver(removeAllAds);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "data-lazy-src", "data-src"],
    });
  }

  if (document.body) {
    onReady();
  } else {
    document.addEventListener("DOMContentLoaded", onReady);
  }
})();
