import { getCache, getSettings, saveCache, saveSettings } from "./storage.js";
import { escapeHtml, renderShell } from "./ui.js";

renderShell("settings", "Settings");

const app = document.getElementById("app");

function render() {
  const settings = getSettings();
  const cache = getCache();
  const cacheEntries = Object.entries(cache);

  app.innerHTML = `
    <div class="two-col">
      <section class="card">
        <h2>Football API</h2>
        <form id="settingsForm" class="list">
          <div class="field">
            <label>API key</label>
            <input name="apiKey" value="${escapeHtml(settings.apiKey)}" placeholder="x-apisports-key">
          </div>
          <button class="btn primary" type="submit">Save settings</button>
        </form>
      </section>
      <section class="card">
        <h2>Club cache</h2>
        ${cacheEntries.length ? `
          <div class="list">
            ${cacheEntries.map(([competition, entry]) => `
              <div class="list-row">
                <div>
                  <strong>${escapeHtml(competition)}</strong>
                  <div class="muted">${entry.data.length} clubs · fetched ${new Date(entry.fetchedAt).toLocaleString()}</div>
                </div>
              </div>
            `).join("")}
          </div>
          <button id="clearCache" class="btn danger" type="button">Refresh cache</button>
        ` : `<div class="empty">Cache is empty.</div>`}
      </section>
    </div>
  `;

  document.getElementById("settingsForm").addEventListener("submit", (event) => {
    event.preventDefault();
    saveSettings({ apiKey: new FormData(event.currentTarget).get("apiKey").trim() });
    render();
  });

  document.getElementById("clearCache")?.addEventListener("click", () => {
    saveCache({});
    render();
  });
}

render();
