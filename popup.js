// =============================================
// DEFAULT CONFIG (sama dengan content.js)
// =============================================
const DEFAULTS = {
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

// =============================================
// STATE
// =============================================
let config = {};
let activeTab = "keywords";

// =============================================
// STORAGE HELPERS
// =============================================
async function loadConfig() {
  const data = await chrome.storage.local.get("judolConfig");
  config = data.judolConfig || {};
  // Ensure each key has defaults merged
  for (const key of Object.keys(DEFAULTS)) {
    if (!config[key]) {
      config[key] = { defaults: [...DEFAULTS[key]], custom: [], disabled: [] };
    } else if (!config[key].disabled) {
      config[key].disabled = [];
    }
  }
  // Load enabled state
  const enabledData = await chrome.storage.local.get("judolEnabled");
  const enabled =
    enabledData.judolEnabled !== undefined ? enabledData.judolEnabled : true;
  document.getElementById("masterToggle").checked = enabled;

  // Load anti-tab settings
  const antiTabData = await chrome.storage.local.get([
    "antiTabEnabled",
    "antiTabMode",
  ]);
  const antiTabOn =
    antiTabData.antiTabEnabled !== undefined
      ? antiTabData.antiTabEnabled
      : true;
  const antiTabMode = antiTabData.antiTabMode || "normal";

  document.getElementById("antiTabToggle").checked = antiTabOn;
  updateModeSelector(antiTabMode, antiTabOn);
}

async function saveConfig() {
  await chrome.storage.local.set({ judolConfig: config });
  updateStats();
  // Notify content scripts to reload config
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs
        .sendMessage(tab.id, { type: "configUpdated" })
        .catch(() => {});
    });
  });
}

async function saveEnabled(enabled) {
  await chrome.storage.local.set({ judolEnabled: enabled });
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs
        .sendMessage(tab.id, { type: "toggleEnabled", enabled })
        .catch(() => {});
    });
  });
}

// Anti-tab helpers
function updateModeSelector(mode, enabled) {
  const selector = document.getElementById("modeSelector");
  if (enabled) {
    selector.classList.remove("disabled");
  } else {
    selector.classList.add("disabled");
  }
  document.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });
}

async function saveAntiTab(enabled, mode) {
  await chrome.storage.local.set({
    antiTabEnabled: enabled,
    antiTabMode: mode,
  });
  // Notify content scripts
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs
        .sendMessage(tab.id, {
          type: "antiTabUpdated",
          antiTabEnabled: enabled,
          antiTabMode: mode,
        })
        .catch(() => {});
    });
  });
}

// =============================================
// RENDER
// =============================================
function renderList(category) {
  const listEl = document.getElementById(`list-${category}`);
  if (!listEl) return;

  const data = config[category];
  if (!data) return;

  listEl.innerHTML = "";

  // Custom items first
  data.custom.forEach((item, index) => {
    listEl.appendChild(createItemEl(item, "custom", category, index));
  });

  // Then default items
  data.defaults.forEach((item) => {
    listEl.appendChild(createItemEl(item, "default", category));
  });
}

function createItemEl(text, type, category, index) {
  const isDisabled = config[category].disabled.includes(text);
  const item = document.createElement("div");
  item.className = `item ${type === "default" ? "is-default" : ""}${isDisabled ? " is-disabled" : ""}`;

  // Mini toggle switch
  const toggleLabel = document.createElement("label");
  toggleLabel.className = "item-toggle";
  const toggleInput = document.createElement("input");
  toggleInput.type = "checkbox";
  toggleInput.checked = !isDisabled;
  toggleInput.addEventListener("change", () => toggleItem(category, text));
  const toggleSlider = document.createElement("span");
  toggleSlider.className = "item-toggle-slider";
  toggleLabel.appendChild(toggleInput);
  toggleLabel.appendChild(toggleSlider);

  const itemText = document.createElement("span");
  itemText.className = "item-text";
  itemText.textContent = text;

  const itemRight = document.createElement("div");
  itemRight.className = "item-right";

  const badge = document.createElement("span");
  badge.className = `item-badge ${type}`;
  badge.textContent = type === "default" ? "default" : "custom";
  itemRight.appendChild(badge);

  if (type === "custom") {
    const removeBtn = document.createElement("button");
    removeBtn.className = "btn-remove";
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", () => removeItem(category, index));
    itemRight.appendChild(removeBtn);
  }

  item.appendChild(toggleLabel);
  item.appendChild(itemText);
  item.appendChild(itemRight);
  return item;
}

function updateStats() {
  let totalRules = 0;
  for (const key of Object.keys(DEFAULTS)) {
    if (config[key]) {
      const allCount = config[key].defaults.length + config[key].custom.length;
      const disabledCount = config[key].disabled
        ? config[key].disabled.length
        : 0;
      totalRules += allCount - disabledCount;
    }
  }
  document.getElementById("totalRules").textContent = totalRules;

  // Load blocked count
  chrome.storage.local.get("judolBlockedToday", (data) => {
    const stored = data.judolBlockedToday;
    let count = 0;
    if (typeof stored === "object" && stored !== null) {
      const today = new Date().toDateString();
      count = stored.date === today ? stored.count || 0 : 0;
    } else if (typeof stored === "number") {
      count = stored;
    }
    document.getElementById("blockedCount").textContent = count;
  });
}

// =============================================
// ACTIONS
// =============================================
function addItem(category) {
  const input = document.getElementById(`input-${category}`);
  let value = input.value.trim().toLowerCase();
  if (!value) return;

  // Auto-add dot for TLDs
  if (category === "tlds" && !value.startsWith(".")) {
    value = "." + value;
  }

  // Check duplicates
  const allItems = [...config[category].defaults, ...config[category].custom];
  if (allItems.includes(value)) {
    showToast("Item sudah ada!", true);
    return;
  }

  config[category].custom.push(value);
  input.value = "";
  saveConfig();
  renderList(category);
  showToast("Berhasil ditambahkan ✓");
}

function removeItem(category, index) {
  const removed = config[category].custom.splice(index, 1)[0];
  // Also remove from disabled list if present
  const disIdx = config[category].disabled.indexOf(removed);
  if (disIdx !== -1) config[category].disabled.splice(disIdx, 1);
  saveConfig();
  renderList(category);
  showToast("Item dihapus");
}

function toggleItem(category, itemText) {
  const disabled = config[category].disabled;
  const idx = disabled.indexOf(itemText);
  if (idx !== -1) {
    disabled.splice(idx, 1);
    showToast(`${itemText} diaktifkan ✓`);
  } else {
    disabled.push(itemText);
    showToast(`${itemText} dinonaktifkan`);
  }
  saveConfig();
  renderList(category);
}

async function resetToDefaults() {
  config = {};
  for (const key of Object.keys(DEFAULTS)) {
    config[key] = { defaults: [...DEFAULTS[key]], custom: [], disabled: [] };
  }
  await saveConfig();
  renderAll();
  showToast("Reset ke default ✓");
}

function renderAll() {
  for (const key of Object.keys(DEFAULTS)) {
    renderList(key);
  }
  updateStats();
}

// =============================================
// TOAST
// =============================================
function showToast(message, isError = false) {
  // Remove existing toast
  document.querySelectorAll(".toast").forEach((t) => t.remove());

  const toast = document.createElement("div");
  toast.className = `toast ${isError ? "error" : ""}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 1500);
}

// =============================================
// EVENT LISTENERS
// =============================================
document.addEventListener("DOMContentLoaded", async () => {
  await loadConfig();
  renderAll();

  // Tab switching
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document
        .querySelectorAll(".tab")
        .forEach((t) => t.classList.remove("active"));
      document
        .querySelectorAll(".tab-content")
        .forEach((tc) => tc.classList.remove("active"));

      tab.classList.add("active");
      activeTab = tab.dataset.tab;
      document.getElementById(`tab-${activeTab}`).classList.add("active");
    });
  });

  // Add buttons
  document.querySelectorAll(".btn-add").forEach((btn) => {
    btn.addEventListener("click", () => addItem(btn.dataset.target));
  });

  // Enter key to add
  document.querySelectorAll(".input-group input").forEach((input) => {
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        const category = input.id.replace("input-", "");
        addItem(category);
      }
    });
  });

  // Master toggle
  document.getElementById("masterToggle").addEventListener("change", (e) => {
    saveEnabled(e.target.checked);
  });

  // Reset button
  document.getElementById("resetBtn").addEventListener("click", () => {
    if (confirm("Reset semua ke default? Item custom akan dihapus.")) {
      resetToDefaults();
    }
  });

  // Anti-tab toggle
  document.getElementById("antiTabToggle").addEventListener("change", (e) => {
    const enabled = e.target.checked;
    const mode = document.querySelector(".mode-btn.active").dataset.mode;
    updateModeSelector(mode, enabled);
    saveAntiTab(enabled, mode);
    showToast(enabled ? "Anti pindah tab aktif ✓" : "Anti pindah tab nonaktif");
  });

  // Mode selector buttons
  document.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.mode;
      const enabled = document.getElementById("antiTabToggle").checked;
      updateModeSelector(mode, enabled);
      saveAntiTab(enabled, mode);
      showToast(
        mode === "aggressive"
          ? "Mode agresif aktif ⚡"
          : "Mode normal aktif 🛡️",
      );
    });
  });

  // Picker button
  document.getElementById("pickerBtn").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab) {
      chrome.tabs.sendMessage(tab.id, { type: "startPicker" });
      window.close(); // Tutup popup agar user bisa interaksi dengan halaman
    }
  });
});
