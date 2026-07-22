const STORAGE_KEY = "cruise-countdown-v4";
const ACCESS_KEY = "cruise-countdown-access-v1";
const PASSWORD_HASH = "88d327bc7d7bb7877ece6b31cad3481dab2dcf3fb71724a9cbe8e8160071c0bb";

const defaultState = {
  tripName: "Utopia",
  shipName: "Utopia of the Seas",
  departurePort: "Orlando (Port Canaveral), FL",
  departureDate: "2026-09-14",
  allAboardTime: "3:30 pm",
  note: "We are going on a cruise with our neighbors!",
  checklist: [
    { text: "Pack passports", done: false },
    { text: "Pack matching shirts", done: false },
    { text: "Bring magnetic hooks", done: false },
    { text: "Buy sunscreen", done: false },
    { text: "Pack refillable bottles", done: false },
    { text: "Prep door decorations", done: false },
  ],
};

const portCards = [
  ["Day 1", "Orlando (Port Canaveral)", "All aboard 3:30 pm"],
  ["Day 2", "Nassau, Bahamas", "Gangway 9:30 am"],
  ["Day 3", "Perfect Day CocoCay", "Gangway 7:30 am"],
  ["Day 4", "Cruising", "At sea"],
  ["Day 5", "Port Canaveral", "Departure 6:30 am"],
];

let state = loadState();
let newItem = "";
let unlocked = localStorage.getItem(ACCESS_KEY) === "unlocked";
const app = document.getElementById("app");

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!stored) return structuredClone(defaultState);
    return {
      ...defaultState,
      ...stored,
      checklist: Array.isArray(stored.checklist) ? stored.checklist : defaultState.checklist,
    };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function hashPassword(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timeLeft() {
  const end = new Date(`${state.departureDate}T15:30:00`).getTime();
  const total = Number.isNaN(end) ? 0 : end - Date.now();
  const clamped = Math.max(total, 0);
  return {
    total,
    days: Math.floor(clamped / 86_400_000),
    hours: Math.floor((clamped / 3_600_000) % 24),
    minutes: Math.floor((clamped / 60_000) % 60),
    seconds: Math.floor((clamped / 1_000) % 60),
    milliseconds: Math.floor(clamped % 1_000),
  };
}

function progress() {
  const now = Date.now();
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  const start = startDate.getTime();
  const end = new Date(`${state.departureDate}T15:30:00`).getTime();
  if (Number.isNaN(end) || end <= start) return 100;
  return Math.min(Math.max(((now - start) / (end - start)) * 100, 0), 100);
}

function tripDate() {
  const date = new Date(`${state.departureDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Choose a date";
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function shipTime() {
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date());
}

function pad(value, length) {
  return String(value).padStart(length, "0");
}

function composite() {
  return `
    <div class="photo-composite">
      <img class="island" alt="Perfect Day island" src="./perfect-day-island.jpeg" />
      <img class="family" alt="Cruise group" src="./utopia-family-cutout.png" />
    </div>
  `;
}

function escapeAttr(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function renderLock(error = "") {
  app.innerHTML = `
    <section class="lock-screen">
      <img class="hero-bg" alt="Utopia of the Seas at sea" src="./utopia-ship-header.jpg" />
      <div class="hero-shade"></div>
      <form class="card lock-card" id="unlock-form">
        ${composite()}
        <p class="blue-kicker">family access</p>
        <h1 class="lock-title">Utopia countdown</h1>
        <p class="lock-copy">Enter the trip password to open the cruise countdown.</p>
        <label class="password-label">
          Password
          <input id="password" class="password-input" autocomplete="current-password" placeholder="Enter password" type="password" />
        </label>
        ${error ? `<p class="error">${error}</p>` : ""}
        <button class="unlock-btn" type="submit">Unlock trip</button>
      </form>
    </section>
  `;
  document.getElementById("unlock-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = document.getElementById("password").value.trim();
    if ((await hashPassword(value)) !== PASSWORD_HASH) {
      renderLock("That password did not match. Try again.");
      return;
    }
    localStorage.setItem(ACCESS_KEY, "unlocked");
    unlocked = true;
    renderApp();
    requestAnimationFrame(updateClock);
  });
}

function renderApp() {
  const t = timeLeft();
  const arrived = t.total <= 0;
  const percent = progress();
  const completed = state.checklist.filter((item) => item.done).length;

  app.innerHTML = `
    <section class="hero">
      <img class="hero-bg" alt="Utopia of the Seas at sea" src="./utopia-ship-header.jpg" />
      <div class="hero-shade"></div>
      <header class="topbar">
        <div>
          <p class="ship-label">Ship Time</p>
          <p class="ship-time" id="ship-time">${shipTime()}</p>
        </div>
        <button class="bubble" type="button" aria-label="Trip messages">...</button>
      </header>
      <div class="hero-center">
        <div class="card countdown-card">
          ${composite()}
          <p class="eyebrow">counting down to</p>
          <h1 class="days" id="days-main">${arrived ? "Welcome aboard!" : t.days}</h1>
          <p class="subtitle">${arrived ? state.shipName : `days until ${state.tripName}`}</p>
          <p class="one-line">${state.shipName} · ${state.departurePort}</p>
          <div class="digits">
            <div><div class="digit-value" id="days">${pad(t.days, 2)}</div><div class="digit-label">Days</div></div>
            <div><div class="digit-value" id="hours">${pad(t.hours, 2)}</div><div class="digit-label">Hours</div></div>
            <div><div class="digit-value" id="minutes">${pad(t.minutes, 2)}</div><div class="digit-label">Minutes</div></div>
            <div><div class="digit-value" id="seconds">${pad(t.seconds, 2)}</div><div class="digit-label">Seconds</div></div>
            <div><div class="digit-value" id="millis">${pad(t.milliseconds, 3)}</div><div class="digit-label">Millis</div></div>
          </div>
          <div class="info">
            <p class="blue-kicker">Boarding</p>
            <p class="date">${tripDate()}</p>
            <p class="aboard">All aboard by ${state.allAboardTime}</p>
            <div class="note">
              <p class="note-label">Trip note</p>
              <p class="note-text">${state.note}</p>
            </div>
            <div class="progress-row"><span>Today</span><span id="progress-text">${Math.round(percent)}%</span><span>Boarding</span></div>
            <div class="bar"><div class="bar-fill" id="bar-fill" style="width: ${percent}%"></div></div>
          </div>
        </div>
      </div>
    </section>
    <section class="content">
      <figure class="panel">
        <div class="map"><img alt="Road trip map to Port Canaveral" src="./roadtrip-map-clean.png" /></div>
        <figcaption class="caption">
          <p class="blue-kicker">Road trip</p>
          <h2>Drive to Port Canaveral</h2>
          <p class="muted">16 hr 18 min · 8 stops · 999 mi</p>
        </figcaption>
      </figure>
      <div class="panel">
        <div class="tab"><button type="button">Checklist</button></div>
        <div class="check-inner">
          <h2 class="check-title">Trip checklist</h2>
          <p class="muted">${completed} of ${state.checklist.length} complete</p>
          <div class="checklist">
            ${state.checklist
              .map(
                (item, index) => `
                  <button class="check-item ${item.done ? "done" : ""}" data-index="${index}" type="button">
                    <span class="circle">${item.done ? "✓" : ""}</span>
                    <span class="check-text">${item.text}</span>
                  </button>
                `,
              )
              .join("")}
          </div>
          <div class="add-row">
            <input id="new-item" placeholder="Add item" value="${escapeAttr(newItem)}" />
            <button id="add-item" type="button">Add</button>
          </div>
          <div class="ports">
            <p class="blue-kicker">Quick ports</p>
            <div class="port-grid">
              ${portCards
                .map(
                  ([day, port, detail]) => `
                    <div class="port">
                      <p class="day">${day}</p>
                      <p class="port-name">${port}</p>
                      <p class="port-detail">${detail}</p>
                    </div>
                  `,
                )
                .join("")}
            </div>
          </div>
        </div>
      </div>
      <aside class="panel ship-card">
        <div class="ship-img"><img alt="Utopia of the Seas at sea" src="./utopia-ship-header.jpg" /></div>
        <figcaption class="caption"><h2>${state.shipName}</h2></figcaption>
      </aside>
      <div class="panel settings">
        <p class="blue-kicker">Trip setup</p>
        <label class="field"><span>Countdown name</span><input id="trip-name" value="${escapeAttr(state.tripName)}" /></label>
        <label class="field"><span>Departure date</span><input id="date" type="date" value="${escapeAttr(state.departureDate)}" /></label>
        <label class="field"><span>All aboard time</span><input id="aboard-time" value="${escapeAttr(state.allAboardTime)}" /></label>
        <button class="reset" id="reset" type="button">Reset Utopia trip</button>
      </div>
    </section>
  `;
  bindEvents();
}

function bindEvents() {
  document.querySelectorAll(".check-item").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.index);
      state.checklist[index].done = !state.checklist[index].done;
      saveState();
      renderApp();
    });
  });
  const itemInput = document.getElementById("new-item");
  itemInput.addEventListener("input", (event) => {
    newItem = event.target.value;
  });
  itemInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addItem();
    }
  });
  document.getElementById("add-item").addEventListener("click", addItem);
  document.getElementById("trip-name").addEventListener("input", (event) => {
    state.tripName = event.target.value;
    saveState();
  });
  document.getElementById("date").addEventListener("change", (event) => {
    state.departureDate = event.target.value;
    saveState();
    renderApp();
  });
  document.getElementById("aboard-time").addEventListener("input", (event) => {
    state.allAboardTime = event.target.value;
    saveState();
  });
  document.getElementById("reset").addEventListener("click", () => {
    state = structuredClone(defaultState);
    saveState();
    renderApp();
  });
}

function addItem() {
  const text = newItem.trim();
  if (!text) return;
  state.checklist.push({ text, done: false });
  newItem = "";
  saveState();
  renderApp();
}

function updateClock() {
  if (!unlocked) return;
  const t = timeLeft();
  const percent = progress();
  const set = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };
  set("ship-time", shipTime());
  set("days-main", t.total <= 0 ? "Welcome aboard!" : String(t.days));
  set("days", pad(t.days, 2));
  set("hours", pad(t.hours, 2));
  set("minutes", pad(t.minutes, 2));
  set("seconds", pad(t.seconds, 2));
  set("millis", pad(t.milliseconds, 3));
  set("progress-text", `${Math.round(percent)}%`);
  const fill = document.getElementById("bar-fill");
  if (fill) fill.style.width = `${percent}%`;
  requestAnimationFrame(updateClock);
}

if (unlocked) {
  renderApp();
  requestAnimationFrame(updateClock);
} else {
  renderLock();
}
