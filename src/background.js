// =============================================
// BACKGROUND.JS — Service Worker (Manifest V3)
// Intercept pembuatan tab baru di level browser
// Ini TIDAK BISA di-bypass oleh script halaman
// =============================================

// =============================================
// STATE
// =============================================
let antiTabEnabled = true;
let antiTabMode = "normal"; // "normal" atau "aggressive"
let blockedKeywords = [];
let blockedTLDs = [];
let blockedShorteners = [];

// Track tab terakhir yang aktif (untuk refocus)
let lastActiveTabId = null;
let lastActiveWindowId = null;

// Cooldown: hindari close loop
let recentlyClosed = new Set();

// =============================================
// LOAD CONFIG
// =============================================
async function loadConfig() {
  try {
    const data = await chrome.storage.local.get([
      "antiTabEnabled",
      "antiTabMode",
      "judolConfig",
      "judolEnabled",
    ]);

    antiTabEnabled =
      data.antiTabEnabled !== undefined ? data.antiTabEnabled : true;
    antiTabMode = data.antiTabMode || "normal";

    // Load blocklist dari config
    const cfg = data.judolConfig || {};
    const defaults = {
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

    blockedKeywords = mergeItems(defaults.keywords, cfg.keywords);
    blockedTLDs = mergeItems(defaults.tlds, cfg.tlds);
    blockedShorteners = mergeItems(defaults.shorteners, cfg.shorteners);
  } catch (e) {
    console.log("[Remove Judol BG] Config load error:", e);
  }
}

function mergeItems(defaults, savedCategory) {
  if (!savedCategory) return [...defaults];
  const custom = savedCategory.custom || [];
  const defaultList = savedCategory.defaults || defaults;
  const disabled = savedCategory.disabled || [];
  const merged = [...new Set([...defaultList, ...custom])];
  return merged.filter((item) => !disabled.includes(item));
}

// =============================================
// URL CHECKING
// =============================================
function isBlockedUrl(url) {
  if (!url || url === "" || url === "about:blank" || url.startsWith("chrome")) {
    return false;
  }

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // Cek keyword di hostname
    if (blockedKeywords.some((k) => hostname.includes(k))) return true;

    // Cek TLD
    if (blockedTLDs.some((tld) => hostname.endsWith(tld))) return true;

    // Cek shortener
    if (
      blockedShorteners.some(
        (d) => hostname === d || hostname.endsWith("." + d),
      )
    )
      return true;
  } catch (e) {
    // Fallback
    const lower = url.toLowerCase();
    if (blockedKeywords.some((k) => lower.includes(k))) return true;
  }

  return false;
}

// =============================================
// WHITELIST — domain legal yang TIDAK diblokir di mode agresif
// =============================================
const WHITELISTED_DOMAINS = [
  // Google
  "google.com",
  "google.co.id",
  "googleapis.com",
  "gstatic.com",
  "googlevideo.com",
  "googleusercontent.com",
  // YouTube
  "youtube.com",
  "youtu.be",
  "ytimg.com",
  // Social Media
  "facebook.com",
  "fb.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "linkedin.com",
  "reddit.com",
  "pinterest.com",
  // Messaging
  "whatsapp.com",
  "telegram.org",
  "t.me",
  "discord.com",
  "discord.gg",
  // Microsoft
  "microsoft.com",
  "live.com",
  "outlook.com",
  "bing.com",
  "office.com",
  // Apple
  "apple.com",
  "icloud.com",
  // Amazon & Cloud
  "amazon.com",
  "aws.amazon.com",
  "cloudflare.com",
  // Streaming legal
  "netflix.com",
  "spotify.com",
  "twitch.tv",
  "crunchyroll.com",
  "bilibili.com",
  "viu.com",
  "vidio.com",
  // Indonesian
  "tokopedia.com",
  "shopee.co.id",
  "bukalapak.com",
  "blibli.com",
  "gojek.com",
  "grab.com",
  "dana.id",
  "ovo.id",
  "detik.com",
  "kompas.com",
  "tribunnews.com",
  "cnnindonesia.com",
  // Dev & Tools
  "github.com",
  "stackoverflow.com",
  "wikipedia.org",
  "archive.org",
  // Email
  "gmail.com",
  "yahoo.com",
  "mail.com",
  // Payment
  "paypal.com",
  "stripe.com",
];

function isWhitelistedUrl(url) {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return WHITELISTED_DOMAINS.some(
      (d) => hostname === d || hostname.endsWith("." + d),
    );
  } catch (e) {
    return false;
  }
}

// =============================================
// TAB TRACKING — track tab aktif user
// =============================================
chrome.tabs.onActivated.addListener((activeInfo) => {
  lastActiveTabId = activeInfo.tabId;
  lastActiveWindowId = activeInfo.windowId;
});

// =============================================
// INTI: Intercept tab baru
// =============================================
chrome.tabs.onCreated.addListener(async (tab) => {
  if (!antiTabEnabled) return;

  const openerTabId = tab.openerTabId;

  // Hanya proses tab yang dibuka oleh tab lain (bukan user klik New Tab)
  if (!openerTabId) return;

  // Jangan close tab yang baru saja di-close (hindari loop)
  if (recentlyClosed.has(tab.id)) return;

  const url = tab.pendingUrl || tab.url || "";

  // Whitelist selalu dibolehkan
  if (isWhitelistedUrl(url)) return;

  if (antiTabMode === "aggressive") {
    // MODE AGRESIF: tutup SEMUA tab baru yang dibuka oleh script
    // (kecuali chrome://, extension pages, dan whitelist)
    if (url.startsWith("chrome") || url.startsWith("chrome-extension")) return;

    console.log(
      "[Remove Judol BG] Aggressive: closing new tab:",
      url || "(pending)",
    );
    closeAndRefocus(tab.id, openerTabId);
  } else {
    // MODE NORMAL: tutup hanya jika URL sudah diketahui judol
    if (url && url !== "about:blank" && isBlockedUrl(url)) {
      console.log("[Remove Judol BG] Normal: closing judol tab:", url);
      closeAndRefocus(tab.id, openerTabId);
    } else if (!url || url === "about:blank" || url === "") {
      // URL belum ada (pending) — monitor via webNavigation
      watchPendingTab(tab.id, openerTabId);
    }
  }
});

// =============================================
// Monitor tab yang URL-nya belum siap saat onCreate
// =============================================
function watchPendingTab(tabId, openerTabId) {
  // Gunakan onUpdated untuk menunggu URL final
  const listener = (updatedTabId, changeInfo, tab) => {
    if (updatedTabId !== tabId) return;

    const url = changeInfo.url || tab.url || "";
    if (!url || url === "about:blank") return;

    // URL sudah ada, hapus listener
    chrome.tabs.onUpdated.removeListener(listener);

    // Whitelist selalu dibolehkan
    if (isWhitelistedUrl(url)) return;

    if (antiTabMode === "aggressive") {
      if (!url.startsWith("chrome") && !url.startsWith("chrome-extension")) {
        console.log("[Remove Judol BG] Aggressive (pending): closing:", url);
        closeAndRefocus(tabId, openerTabId);
      }
    } else if (isBlockedUrl(url)) {
      console.log("[Remove Judol BG] Normal (pending): closing judol:", url);
      closeAndRefocus(tabId, openerTabId);
    }
  };

  chrome.tabs.onUpdated.addListener(listener);

  // Timeout: hapus listener setelah 5 detik (jangan leak listener)
  setTimeout(() => {
    chrome.tabs.onUpdated.removeListener(listener);
  }, 5000);
}

// =============================================
// CLOSE TAB & REFOCUS ke tab asal
// =============================================
async function closeAndRefocus(tabIdToClose, openerTabId) {
  try {
    recentlyClosed.add(tabIdToClose);

    // Tutup tab iklan
    await chrome.tabs.remove(tabIdToClose);

    // Refocus ke tab asal
    const focusTabId = openerTabId || lastActiveTabId;
    if (focusTabId) {
      try {
        await chrome.tabs.update(focusTabId, { active: true });
        const tab = await chrome.tabs.get(focusTabId);
        if (tab && tab.windowId) {
          await chrome.windows.update(tab.windowId, { focused: true });
        }
      } catch (e) {
        // Tab asal mungkin sudah ditutup
      }
    }

    // Update counter
    updateBlockedCount();

    // Cleanup recentlyClosed setelah 2 detik
    setTimeout(() => {
      recentlyClosed.delete(tabIdToClose);
    }, 2000);
  } catch (e) {
    recentlyClosed.delete(tabIdToClose);
  }
}

// =============================================
// UPDATE BLOCKED COUNTER
// =============================================
async function updateBlockedCount() {
  try {
    const data = await chrome.storage.local.get("judolBlockedToday");
    const today = new Date().toDateString();
    let obj = data.judolBlockedToday || { date: today, count: 0 };

    // Handle legacy format (angka saja)
    if (typeof obj === "number") {
      obj = { date: today, count: obj };
    }

    if (obj.date !== today) {
      obj.date = today;
      obj.count = 0;
    }
    obj.count += 1;

    await chrome.storage.local.set({ judolBlockedToday: obj });
  } catch (e) {}
}

// =============================================
// LISTEN CONFIG CHANGES
// =============================================
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.antiTabEnabled || changes.antiTabMode || changes.judolConfig) {
    loadConfig();
  }
});

// =============================================
// ANTI REDIRECT DI TAB YANG SAMA
// Deteksi navigasi ke situs judol dan otomatis goBack()
// =============================================

// Track URL sebelumnya per tab (untuk goBack fallback)
const tabPreviousUrl = new Map();

// Track tab yang baru saja di-goBack (hindari loop)
const recentlyRedirected = new Set();

// Simpan URL saat ini setiap kali navigasi berhasil
chrome.webNavigation.onCompleted.addListener((details) => {
  // Hanya frame utama (bukan iframe)
  if (details.frameId !== 0) return;

  const url = details.url || "";
  // Jangan simpan URL judol sebagai "previous"
  if (!isBlockedUrl(url)) {
    tabPreviousUrl.set(details.tabId, url);
  }
});

// Intercept navigasi ke situs judol
chrome.webNavigation.onCommitted.addListener((details) => {
  // Hanya frame utama
  if (details.frameId !== 0) return;
  if (!antiTabEnabled) return;

  const url = details.url || "";
  if (!url || url === "about:blank" || url.startsWith("chrome")) return;

  // Jangan proses jika baru saja di-redirect (hindari loop)
  if (recentlyRedirected.has(details.tabId)) return;

  // Cek apakah URL adalah situs judol
  if (isBlockedUrl(url)) {
    console.log("[Remove Judol BG] Redirect blocked in same tab:", url);

    recentlyRedirected.add(details.tabId);

    // Coba goBack ke halaman sebelumnya
    const previousUrl = tabPreviousUrl.get(details.tabId);

    if (previousUrl) {
      // Navigate ke URL sebelumnya
      chrome.tabs.update(details.tabId, { url: previousUrl }).catch(() => {});
    } else {
      // Fallback: coba goBack
      chrome.tabs.goBack(details.tabId).catch(() => {
        // Jika tidak bisa goBack, navigate ke about:blank
        chrome.tabs
          .update(details.tabId, { url: "about:blank" })
          .catch(() => {});
      });
    }

    updateBlockedCount();

    // Hapus dari recentlyRedirected setelah 3 detik
    setTimeout(() => {
      recentlyRedirected.delete(details.tabId);
    }, 3000);
  }
});

// Cleanup saat tab ditutup
chrome.tabs.onRemoved.addListener((tabId) => {
  tabPreviousUrl.delete(tabId);
  recentlyRedirected.delete(tabId);
});

// =============================================
// INIT
// =============================================
loadConfig();

// Track tab aktif saat startup
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]) {
    lastActiveTabId = tabs[0].id;
    lastActiveWindowId = tabs[0].windowId;
  }
});

console.log("[Remove Judol BG] Background service worker started");
