import { useState } from 'react';
import { Shell } from '../components/Shell';
import { getCache, getSettings, saveCache, saveSettings } from '../lib/storage';

export function SettingsPage() {
  const [apiKey, setApiKey] = useState(() => getSettings().apiKey || '');
  const [cache, setCache] = useState(() => getCache<{ data: unknown[]; fetchedAt: string }>());

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    saveSettings({ apiKey: apiKey.trim() });
  }

  function handleClearCache() {
    saveCache({});
    setCache({});
  }

  const cacheEntries = Object.entries(cache);

  return (
    <Shell active="settings" title="Settings">
      <div className="two-col">
        <section className="card">
          <h2>Football API</h2>
          <form id="settingsForm" className="list" onSubmit={handleSubmit}>
            <div className="field">
              <label>API key</label>
              <input name="apiKey" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="x-apisports-key" />
            </div>
            <button className="btn primary" type="submit">
              Save settings
            </button>
          </form>
        </section>
        <section className="card">
          <h2>Club cache</h2>
          {cacheEntries.length ? (
            <>
              <div className="list">
                {cacheEntries.map(([competition, entry]) => (
                  <div className="list-row" key={competition}>
                    <div>
                      <strong>{competition}</strong>
                      <div className="muted">
                        {entry.data.length} clubs · fetched {new Date(entry.fetchedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button id="clearCache" className="btn danger" type="button" onClick={handleClearCache}>
                Refresh cache
              </button>
            </>
          ) : (
            <div className="empty">Cache is empty.</div>
          )}
        </section>
      </div>
    </Shell>
  );
}
