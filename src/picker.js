// =============================================
// PICKER.JS — Element Picker Mode
// Mirip DevTools inspect: hover highlight + click to extract URLs
// Dikelola oleh content.js, berjalan di content script context
// =============================================

(function () {
  // Cegah double-init
  if (window.__judolPickerActive) return;
  window.__judolPickerActive = true;

  // =============================================
  // UI ELEMENTS
  // =============================================

  // Overlay full-screen
  const overlay = document.createElement("div");
  overlay.id = "__judol-picker-overlay";
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 2147483646;
    cursor: crosshair;
    background: rgba(0, 0, 0, 0.08);
    pointer-events: none;
  `;

  // Highlight box
  const highlight = document.createElement("div");
  highlight.id = "__judol-picker-highlight";
  highlight.style.cssText = `
    position: fixed;
    z-index: 2147483646;
    pointer-events: none;
    border: 2px solid #6c5ce7;
    background: rgba(108, 92, 231, 0.12);
    border-radius: 4px;
    transition: all 0.1s ease;
    display: none;
  `;

  // Tooltip
  const tooltip = document.createElement("div");
  tooltip.id = "__judol-picker-tooltip";
  tooltip.style.cssText = `
    position: fixed;
    z-index: 2147483647;
    pointer-events: none;
    background: #1a1d27;
    color: #e8e8f0;
    font-family: 'Segoe UI', 'Inter', -apple-system, sans-serif;
    font-size: 12px;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid #6c5ce7;
    box-shadow: 0 4px 20px rgba(108, 92, 231, 0.3);
    max-width: 360px;
    word-break: break-all;
    display: none;
    line-height: 1.5;
  `;

  // Banner instruksi
  const banner = document.createElement("div");
  banner.id = "__judol-picker-banner";
  banner.style.cssText = `
    position: fixed;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2147483647;
    background: linear-gradient(135deg, #1a1040, #1e1145);
    color: #e8e8f0;
    font-family: 'Segoe UI', 'Inter', -apple-system, sans-serif;
    font-size: 13px;
    font-weight: 600;
    padding: 10px 24px;
    border-radius: 24px;
    border: 1px solid #6c5ce7;
    box-shadow: 0 4px 24px rgba(108, 92, 231, 0.4);
    pointer-events: none;
    animation: __judol-banner-in 0.3s ease;
  `;
  banner.textContent =
    "🎯 Klik elemen iklan untuk menambahkan ke blocklist • Esc untuk batal";

  // Banner animation
  const bannerStyle = document.createElement("style");
  bannerStyle.textContent = `
    @keyframes __judol-banner-in {
      from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes __judol-toast-in {
      from { opacity: 0; transform: translateX(-50%) translateY(20px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes __judol-toast-out {
      from { opacity: 1; transform: translateX(-50%) translateY(0); }
      to { opacity: 0; transform: translateX(-50%) translateY(20px); }
    }
  `;
  document.head.appendChild(bannerStyle);

  // Append UI
  document.documentElement.appendChild(overlay);
  document.documentElement.appendChild(highlight);
  document.documentElement.appendChild(tooltip);
  document.documentElement.appendChild(banner);

  // =============================================
  // EXTRACT URLs dari elemen
  // =============================================
  function extractUrlsFromElement(el) {
    const results = { hrefs: [], imgDomains: [], keywords: [], tlds: [] };

    // Kumpulkan semua <a> (termasuk el sendiri)
    const anchors = [];
    if (el.tagName === "A") anchors.push(el);
    anchors.push(...el.querySelectorAll("a[href]"));

    // Juga cek parent <a> jika el bukan <a>
    if (el.tagName !== "A") {
      const parentA = el.closest("a[href]");
      if (parentA) anchors.push(parentA);
    }

    anchors.forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (!href || href === "#" || href.startsWith("javascript:")) return;
      try {
        const url = new URL(href, location.origin);
        if (url.hostname === location.hostname) return;
        results.hrefs.push({
          full: href,
          hostname: url.hostname,
          tld: extractTLD(url.hostname),
        });
      } catch (e) {}
    });

    // Kumpulkan semua <img>
    const imgs = [];
    if (el.tagName === "IMG") imgs.push(el);
    imgs.push(...el.querySelectorAll("img"));

    imgs.forEach((img) => {
      const src =
        img.getAttribute("src") ||
        img.getAttribute("data-lazy-src") ||
        img.getAttribute("data-src") ||
        img.getAttribute("data-original") ||
        "";
      if (!src) return;
      try {
        const url = new URL(src, location.origin);
        if (url.hostname !== location.hostname) {
          results.imgDomains.push(url.hostname);
        }
      } catch (e) {}
    });

    // Deduplicate
    results.hrefs = results.hrefs.filter(
      (v, i, a) => a.findIndex((x) => x.hostname === v.hostname) === i,
    );
    results.imgDomains = [...new Set(results.imgDomains)];

    return results;
  }

  function extractTLD(hostname) {
    // Extract TLD like .xyz, .top, .com etc
    const parts = hostname.split(".");
    if (parts.length >= 2) {
      return "." + parts[parts.length - 1];
    }
    return "";
  }

  // =============================================
  // TOOLTIP CONTENT
  // =============================================
  function buildTooltipContent(urls) {
    const lines = [];

    if (urls.hrefs.length > 0) {
      lines.push("🔗 <b>Link:</b>");
      urls.hrefs.forEach((h) => {
        lines.push(`  → ${h.hostname}`);
      });
    }

    if (urls.imgDomains.length > 0) {
      lines.push("🖼️ <b>Image domain:</b>");
      urls.imgDomains.forEach((d) => {
        lines.push(`  → ${d}`);
      });
    }

    if (lines.length === 0) {
      lines.push("⚠️ Tidak ada URL external ditemukan");
    }

    return lines.join("<br>");
  }

  // =============================================
  // EVENT HANDLERS
  // =============================================
  let currentTarget = null;

  function onMouseMove(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (
      !el ||
      el === overlay ||
      el === highlight ||
      el === tooltip ||
      el === banner
    )
      return;

    // Naik ke parent yang lebih bermakna (cari <a> atau container iklan)
    let target = el;
    const parentA = el.closest("a");
    if (parentA) target = parentA;

    currentTarget = target;

    // Update highlight position
    const rect = target.getBoundingClientRect();
    highlight.style.display = "block";
    highlight.style.top = rect.top + "px";
    highlight.style.left = rect.left + "px";
    highlight.style.width = rect.width + "px";
    highlight.style.height = rect.height + "px";

    // Update tooltip
    const urls = extractUrlsFromElement(target);
    tooltip.innerHTML = buildTooltipContent(urls);
    tooltip.style.display = "block";

    // Position tooltip
    let tooltipTop = rect.bottom + 8;
    let tooltipLeft = rect.left;

    // Jika tooltip melebihi viewport bawah, taruh di atas elemen
    if (tooltipTop + 80 > window.innerHeight) {
      tooltipTop = rect.top - tooltip.offsetHeight - 8;
    }
    // Jika melebihi kanan
    if (tooltipLeft + 360 > window.innerWidth) {
      tooltipLeft = window.innerWidth - 370;
    }
    if (tooltipLeft < 10) tooltipLeft = 10;

    tooltip.style.top = tooltipTop + "px";
    tooltip.style.left = tooltipLeft + "px";
  }

  function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    if (!currentTarget) return;

    const urls = extractUrlsFromElement(currentTarget);
    const added = [];

    // Auto-categorize dan kirim ke content.js untuk disimpan
    const itemsToAdd = { keywords: [], tlds: [], domains: [], shorteners: [] };

    // Tambah hostname sebagai keyword (bagian utama sebelum TLD)
    urls.hrefs.forEach((h) => {
      const parts = h.hostname.split(".");
      // Ambil nama domain utama (tanpa TLD) sebagai keyword
      if (parts.length >= 2) {
        const domainName = parts.slice(0, -1).join(".");
        itemsToAdd.keywords.push(domainName);
        added.push(`keyword: ${domainName}`);
      }

      // Tambah TLD jika bukan TLD umum
      const commonTLDs = [
        ".com",
        ".net",
        ".org",
        ".edu",
        ".gov",
        ".co",
        ".id",
        ".io",
      ];
      if (h.tld && !commonTLDs.includes(h.tld)) {
        itemsToAdd.tlds.push(h.tld);
        added.push(`TLD: ${h.tld}`);
      }
    });

    // Tambah domain gambar
    urls.imgDomains.forEach((d) => {
      itemsToAdd.domains.push(d);
      added.push(`domain img: ${d}`);
    });

    if (added.length === 0) {
      showPickerToast("⚠️ Tidak ada URL untuk ditambahkan", true);
      return;
    }

    // Kirim ke content.js via custom event
    window.dispatchEvent(
      new CustomEvent("__judol_picker_result__", {
        detail: itemsToAdd,
      }),
    );

    showPickerToast(`✅ Ditambahkan: ${added.join(", ")}`);

    // Remove elemen yang dipilih dari halaman
    try {
      currentTarget.remove();
    } catch (e) {}
  }

  function onKeyDown(e) {
    if (e.key === "Escape") {
      cleanup();
    }
  }

  function onContextMenu(e) {
    e.preventDefault();
    cleanup();
  }

  // =============================================
  // TOAST di halaman
  // =============================================
  function showPickerToast(message, isError = false) {
    const toast = document.createElement("div");
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2147483647;
      background: ${isError ? "#ff6b6b" : "#6c5ce7"};
      color: white;
      font-family: 'Segoe UI', 'Inter', -apple-system, sans-serif;
      font-size: 13px;
      font-weight: 600;
      padding: 12px 24px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      max-width: 400px;
      word-break: break-all;
      animation: __judol-toast-in 0.3s ease;
    `;
    toast.textContent = message;
    document.documentElement.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = "__judol-toast-out 0.3s ease forwards";
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // =============================================
  // CLEANUP — hapus semua UI picker
  // =============================================
  function cleanup() {
    document.removeEventListener("mousemove", onMouseMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKeyDown, true);
    document.removeEventListener("contextmenu", onContextMenu, true);

    overlay.remove();
    highlight.remove();
    tooltip.remove();
    banner.remove();
    bannerStyle.remove();

    window.__judolPickerActive = false;
  }

  // =============================================
  // START — pasang event listeners
  // =============================================
  document.addEventListener("mousemove", onMouseMove, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("contextmenu", onContextMenu, true);
})();
