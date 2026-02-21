// =============================================
// INJECT.JS — Berjalan di page context (main world)
// Blokir popup, popunder, redirect, dan anti pindah tab
// =============================================
(function () {
  // Config yang bisa di-update
  let BLOCKED_KEYWORDS = [];
  let BLOCKED_TLDS = [];
  let BLOCKED_SHORTENERS = [];
  let ANTI_TAB_ENABLED = true;
  let ANTI_TAB_MODE = "normal"; // "normal" atau "aggressive"

  // Load config awal dari hidden element
  function loadInitialConfig() {
    try {
      const configEl = document.getElementById("__judol_config__");
      if (configEl) {
        const data = JSON.parse(configEl.textContent);
        BLOCKED_KEYWORDS = data.keywords || [];
        BLOCKED_TLDS = data.tlds || [];
        BLOCKED_SHORTENERS = data.shorteners || [];
        ANTI_TAB_ENABLED =
          data.antiTabEnabled !== undefined ? data.antiTabEnabled : true;
        ANTI_TAB_MODE = data.antiTabMode || "normal";
        configEl.remove();
      }
    } catch (e) {}
  }

  loadInitialConfig();

  // Listen untuk config update dari content.js via custom event
  document.addEventListener("__judol_config_update__", function (e) {
    try {
      const data = e.detail;
      BLOCKED_KEYWORDS = data.keywords || [];
      BLOCKED_TLDS = data.tlds || [];
      BLOCKED_SHORTENERS = data.shorteners || [];
      ANTI_TAB_ENABLED =
        data.antiTabEnabled !== undefined ? data.antiTabEnabled : true;
      ANTI_TAB_MODE = data.antiTabMode || "normal";
      console.log("[Remove Judol] Config updated:", {
        keywords: BLOCKED_KEYWORDS.length,
        tlds: BLOCKED_TLDS.length,
        shorteners: BLOCKED_SHORTENERS.length,
        antiTab: ANTI_TAB_ENABLED,
        antiTabMode: ANTI_TAB_MODE,
      });
    } catch (e) {}
  });

  function isBlockedUrl(url) {
    if (!url) return false;

    try {
      const hostname = new URL(url, location.origin).hostname.toLowerCase();

      // SKIP jika link ke domain yang sama (internal link, bukan iklan)
      if (hostname === location.hostname) return false;

      // Cek keyword hanya di hostname (bukan full URL path)
      if (BLOCKED_KEYWORDS.some((k) => hostname.includes(k))) return true;

      // Cek TLD
      if (BLOCKED_TLDS.some((tld) => hostname.endsWith(tld))) return true;

      // Cek shortener
      if (
        BLOCKED_SHORTENERS.some(
          (d) => hostname === d || hostname.endsWith("." + d),
        )
      )
        return true;
    } catch (e) {
      // Fallback: jika URL tidak bisa di-parse, cek di seluruh string
      const lower = url.toLowerCase();
      if (BLOCKED_KEYWORDS.some((k) => lower.includes(k))) return true;
    }

    return false;
  }

  // Cek apakah URL adalah domain external (bukan domain situs saat ini)
  function isExternalUrl(url) {
    if (!url) return false;
    try {
      const hostname = new URL(url, location.origin).hostname.toLowerCase();
      return hostname !== location.hostname;
    } catch (e) {
      return false;
    }
  }

  // Whitelist domain legal — TIDAK diblokir meskipun mode agresif
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
      const hostname = new URL(url, location.origin).hostname.toLowerCase();
      return WHITELISTED_DOMAINS.some(
        (d) => hostname === d || hostname.endsWith("." + d),
      );
    } catch (e) {
      return false;
    }
  }

  // Cek apakah aksi tab baru harus diblokir berdasarkan mode
  function shouldBlockNewTab(url) {
    if (!ANTI_TAB_ENABLED) return false;

    // Whitelist selalu dibolehkan
    if (isWhitelistedUrl(url)) return false;

    if (ANTI_TAB_MODE === "aggressive") {
      // Mode agresif: blokir SEMUA tab baru ke domain external (kecuali whitelist)
      return isExternalUrl(url);
    }
    // Mode normal: blokir hanya URL yang masuk blocklist
    return isBlockedUrl(url);
  }

  // =============================================
  // 1. Override window.open — block popup & popunder
  // =============================================
  const originalOpen = window.open;
  window.open = function (url, ...args) {
    // Cek blocklist judol (selalu aktif)
    if (isBlockedUrl(url)) {
      console.log("[Remove Judol] Blocked popup:", url);
      return null;
    }

    // Anti-tab: blokir buka tab baru
    if (shouldBlockNewTab(url)) {
      console.log("[Remove Judol] Anti-tab blocked popup:", url);
      return null;
    }

    return originalOpen.call(this, url, ...args);
  };

  // =============================================
  // 2. Intercept ALL click-like events
  //    Popunder scripts sering pakai mousedown/pointerdown, bukan click biasa
  // =============================================
  const clickEvents = [
    "click",
    "mousedown",
    "mouseup",
    "pointerdown",
    "pointerup",
    "auxclick",
  ];

  clickEvents.forEach((eventType) => {
    document.addEventListener(
      eventType,
      function (e) {
        // Cek elemen dengan onclick handler
        const el = e.target.closest("[onclick]");
        if (el) {
          const onclick = el.getAttribute("onclick") || "";
          const urlMatch = onclick.match(/https?:\/\/[^'"\s)]+/gi);
          if (urlMatch) {
            const blocked = urlMatch.some(
              (u) => isBlockedUrl(u) || shouldBlockNewTab(u),
            );
            if (blocked) {
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();
              console.log(
                `[Remove Judol] Blocked ${eventType} redirect:`,
                urlMatch,
              );
              return;
            }
          }
        }

        // Cek <a> link
        const link = e.target.closest("a[href]");
        if (link) {
          const href = link.getAttribute("href") || "";

          // Blokir link judol
          if (isBlockedUrl(href)) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            console.log(`[Remove Judol] Blocked ${eventType} link:`, href);
            return;
          }

          // Anti-tab: blokir <a target="_blank"> yang buka tab baru
          const target = link.getAttribute("target") || "";
          if (target === "_blank" && shouldBlockNewTab(href)) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            console.log(
              `[Remove Judol] Anti-tab blocked ${eventType} target=_blank:`,
              href,
            );
            return;
          }
        }
      },
      true, // capture phase — intercept SEBELUM handler asli
    );
  });

  // =============================================
  // 3. Override createElement untuk intercept dynamic <a> click()
  //    Popunder script sering buat <a> element, set href, lalu panggil .click()
  // =============================================
  const origCreateElement = document.createElement.bind(document);
  document.createElement = function (tagName, ...args) {
    const el = origCreateElement(tagName, ...args);

    if (tagName.toLowerCase() === "a") {
      const origClick = el.click.bind(el);
      el.click = function () {
        const href = el.href || el.getAttribute("href") || "";
        if (isBlockedUrl(href) || shouldBlockNewTab(href)) {
          console.log("[Remove Judol] Blocked dynamic a.click():", href);
          return;
        }
        return origClick();
      };
    }

    return el;
  };

  // =============================================
  // 4. Override location.assign / location.replace
  //    (window.location setter tidak bisa di-override)
  // =============================================
  try {
    const origAssign = location.assign.bind(location);
    const origReplace = location.replace.bind(location);

    location.assign = function (url) {
      if (isBlockedUrl(url)) {
        console.log("[Remove Judol] Blocked assign:", url);
        return;
      }
      origAssign(url);
    };
    location.replace = function (url) {
      if (isBlockedUrl(url)) {
        console.log("[Remove Judol] Blocked replace:", url);
        return;
      }
      origReplace(url);
    };
  } catch (e) {}

  // =============================================
  // 5. Monitor & kill suspicious <a> elements dari popunder script
  //    (hidden links yang di-click programmatically)
  // =============================================
  const bodyObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;

        // Cek <a> yang baru ditambahkan
        const links =
          node.tagName === "A"
            ? [node]
            : node.querySelectorAll
              ? [...node.querySelectorAll("a")]
              : [];
        links.forEach((link) => {
          const href = link.href || link.getAttribute("href") || "";
          if (isBlockedUrl(href)) {
            link.removeAttribute("href");
            link.onclick = null;
            link.style.pointerEvents = "none";
            console.log("[Remove Judol] Neutralized dynamic link:", href);
          }

          // Anti-tab: hapus target="_blank" dari link mencurigakan
          if (ANTI_TAB_ENABLED) {
            const target = link.getAttribute("target") || "";
            if (target === "_blank" && shouldBlockNewTab(href)) {
              link.removeAttribute("target");
              console.log(
                "[Remove Judol] Anti-tab removed target=_blank:",
                href,
              );
            }
          }
        });

        // Anti-tab: intercept <form target="_blank"> yang baru ditambahkan
        if (ANTI_TAB_ENABLED) {
          const forms =
            node.tagName === "FORM"
              ? [node]
              : node.querySelectorAll
                ? [...node.querySelectorAll('form[target="_blank"]')]
                : [];
          forms.forEach((form) => {
            const action = form.getAttribute("action") || "";
            if (shouldBlockNewTab(action)) {
              form.removeAttribute("target");
              console.log(
                "[Remove Judol] Anti-tab removed form target=_blank:",
                action,
              );
            }
          });
        }
      });
    });
  });

  // Observe segera kalau body sudah ada
  if (document.body) {
    bodyObserver.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      bodyObserver.observe(document.body, { childList: true, subtree: true });
    });
  }

  // =============================================
  // 6. ANTI PINDAH TAB — Fitur tambahan
  // =============================================

  // 6a. Intercept <form> submit dengan target="_blank"
  document.addEventListener(
    "submit",
    function (e) {
      if (!ANTI_TAB_ENABLED) return;
      const form = e.target;
      if (form.tagName !== "FORM") return;

      const target = form.getAttribute("target") || "";
      const action = form.getAttribute("action") || "";

      if (target === "_blank") {
        if (isBlockedUrl(action) || shouldBlockNewTab(action)) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          console.log("[Remove Judol] Anti-tab blocked form submit:", action);
        }
      }
    },
    true,
  );

  // 6b. Netralkan target="_blank" pada link yang sudah ada di halaman
  function neutralizeExistingTargetBlank() {
    if (!ANTI_TAB_ENABLED) return;

    document.querySelectorAll('a[target="_blank"]').forEach((link) => {
      const href = link.href || link.getAttribute("href") || "";
      if (shouldBlockNewTab(href)) {
        link.removeAttribute("target");
      }
    });
  }

  // Jalankan saat DOM siap
  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      neutralizeExistingTargetBlank,
    );
  } else {
    neutralizeExistingTargetBlank();
  }

  // 6c. Override window.blur() — anti-popunder trick
  // Popunder script sering panggil window.blur() untuk menyembunyikan tab iklan
  // di belakang tab user, membuat seolah-olah tab user pindah
  try {
    const origBlur = window.blur.bind(window);
    window.blur = function () {
      if (ANTI_TAB_ENABLED && ANTI_TAB_MODE === "aggressive") {
        console.log("[Remove Judol] Anti-tab blocked window.blur()");
        return;
      }
      origBlur();
    };
  } catch (e) {}

  // 6d. Override HTMLAnchorElement.prototype — intercept target="_blank" set
  // Beberapa script set target="_blank" via property setelah createElement
  try {
    const origTargetDescriptor = Object.getOwnPropertyDescriptor(
      HTMLAnchorElement.prototype,
      "target",
    );
    if (origTargetDescriptor && origTargetDescriptor.set) {
      const origTargetSet = origTargetDescriptor.set;
      Object.defineProperty(HTMLAnchorElement.prototype, "target", {
        get: origTargetDescriptor.get,
        set: function (value) {
          if (ANTI_TAB_ENABLED && value === "_blank") {
            const href = this.href || this.getAttribute("href") || "";
            if (shouldBlockNewTab(href)) {
              console.log(
                "[Remove Judol] Anti-tab blocked set target=_blank:",
                href,
              );
              return; // Jangan set target
            }
          }
          origTargetSet.call(this, value);
        },
        configurable: true,
        enumerable: true,
      });
    }
  } catch (e) {}

  console.log(
    "[Remove Judol] Popup/popunder/redirect blocker active | Anti-tab:",
    ANTI_TAB_ENABLED ? `ON (${ANTI_TAB_MODE})` : "OFF",
  );
})();
