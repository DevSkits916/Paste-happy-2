import { FormEvent, useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';

export default function SettingsPage() {
  const { apiBaseUrl, apiToken, setApiBaseUrl, setApiToken } = useAppStore();
  const [status, setStatus] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState(apiBaseUrl);
  const [token, setToken] = useState(apiToken);

  useEffect(() => {
    setBaseUrl(apiBaseUrl);
  }, [apiBaseUrl]);

  useEffect(() => {
    setToken(apiToken);
  }, [apiToken]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApiBaseUrl(baseUrl);
    setApiToken(token);
    setStatus('Settings saved locally.');
  }

  return (
    <section className="panel">
      <h2>Settings</h2>
      <p className="muted">Configure API access for your workspace.</p>

      <form onSubmit={handleSubmit} className="form-grid" style={{ gap: '1rem', marginTop: '1rem' }}>
        <div>
          <label htmlFor="api-base-url">API base URL</label>
          <input
            id="api-base-url"
            name="apiBaseUrl"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder="http://localhost:4000"
          />
        </div>
        <div>
          <label htmlFor="api-token">API token</label>
          <input
            id="api-token"
            name="apiToken"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Paste your JWT token"
          />
        </div>
        <div className="button-row">
          <button type="submit">Save</button>
        </div>
      </form>

      {status && <p className="muted">{status}</p>}
    </section>
  );
}
