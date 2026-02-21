// =============================================
// INJECT.JS — Berjalan di page context (main world)
// Blokir popup, popunder, dan redirect ke situs judol
// =============================================
(function () {
  // Config yang bisa di-update
  let BLOCKED_KEYWORDS = [];
  let BLOCKED_TLDS = [];
  let BLOCKED_SHORTENERS = [];

  // Load config awal dari hidden element
  function loadInitialConfig() {
    try {
      const configEl = document.getElementById("__judol_config__");
      if (configEl) {
        const data = JSON.parse(configEl.textContent);
        BLOCKED_KEYWORDS = data.keywords || [];
        BLOCKED_TLDS = data.tlds || [];
        BLOCKED_SHORTENERS = data.shorteners || [];
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
      console.log("[Remove Judol] Config updated:", {
        keywords: BLOCKED_KEYWORDS.length,
        tlds: BLOCKED_TLDS.length,
        shorteners: BLOCKED_SHORTENERS.length,
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

  // =============================================
  // 1. Override window.open — block popup & popunder
  // =============================================
  const originalOpen = window.open;
  window.open = function (url, ...args) {
    if (isBlockedUrl(url)) {
      console.log("[Remove Judol] Blocked popup:", url);
      return null;
    }
    return originalOpen.call(this, url, ...args);
  };

  // =============================================
  // 2. Intercept ALL click-like events (click, mousedown, mouseup, pointerdown, pointerup, auxclick)
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
          if (urlMatch && urlMatch.some((u) => isBlockedUrl(u))) {
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

        // Cek <a> link
        const link = e.target.closest("a[href]");
        if (link) {
          const href = link.getAttribute("href") || "";
          if (isBlockedUrl(href)) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            console.log(`[Remove Judol] Blocked ${eventType} link:`, href);
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
        if (isBlockedUrl(href)) {
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
  // 5. Monitor & kill suspicious <a> elements yang dibuat oleh popunder script
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
        });
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

  console.log("[Remove Judol] Popup/popunder/redirect blocker active");
})();
