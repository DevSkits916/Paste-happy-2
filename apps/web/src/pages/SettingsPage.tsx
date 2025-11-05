import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { useAppStore } from '../store/useAppStore';

const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:4000';

function normalizeBaseUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) {
    return DEFAULT_API_BASE;
  }
  return trimmed.replace(/\/+$/, '');
}

export default function SettingsPage() {
  const { apiBaseUrl, apiToken, setApiBaseUrl, setApiToken } = useAppStore();
  const [status, setStatus] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState(apiBaseUrl);
  const [token, setToken] = useState(apiToken);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginStatus, setLoginStatus] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

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
    setLoginStatus(null);
  }

  async function handleDevLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = loginEmail.trim();
    if (!email) {
      setLoginError('Enter an email to request a token.');
      return;
    }

    setLoginError(null);
    setLoginStatus(null);
    setLoginLoading(true);

    try {
      const result = await apiFetch<{ token: string; user: { email: string } }>(
        '/auth/dev-login',
        {
          method: 'POST',
          body: JSON.stringify({ email }),
          skipAuth: true
        }
      );
      setApiToken(result.token);
      setToken(result.token);
      setLoginStatus(`Signed in as ${result.user.email}. Token saved locally.`);
      setStatus(null);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Unable to login');
    } finally {
      setLoginLoading(false);
    }
  }

  const normalizedApiBase = normalizeBaseUrl(baseUrl);
  const userscriptUrl = `${normalizedApiBase}/assist/userscript`;

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

      <hr style={{ margin: '2rem 0' }} />

      <section>
        <h3>Facebook Group Helper (Userscript)</h3>
        <p className="muted">
          The Facebook Groups API no longer allows automated posting. This helper script fills
          your ad text automatically when you open a group link from your queue. You still click
          Post yourself — this keeps it safe and compliant.
        </p>

        <div className="button-row" style={{ marginTop: '1rem', gap: '0.5rem' }}>
          <a
            className="button"
            href={userscriptUrl}
            target="_blank"
            rel="noreferrer"
            download="paste-happy-fb-helper.user.js"
          >
            Download Userscript
          </a>
          <a
            className="button secondary"
            href="https://www.facebook.com/groups/test?ph=1"
            target="_blank"
            rel="noreferrer"
          >
            Test Script
          </a>
        </div>

        <ol style={{ marginTop: '1.5rem', paddingLeft: '1.25rem' }}>
          <li>Install a userscript manager such as Tampermonkey.</li>
          <li>Click “Download Userscript” and approve installation.</li>
          <li>In Paste-Happy, use the “Copy &amp; Open” button — the helper will paste your ad automatically.</li>
          <li>Press Enter or click Post.</li>
        </ol>

        <p className="muted" style={{ marginTop: '1rem' }}>
          Need a direct link? Copy and share this install URL: <code>{userscriptUrl}</code>
        </p>
      </section>

      <section>
        <h3>Dev Login</h3>
        <p className="muted">Request a development token for quick testing.</p>
        <form onSubmit={handleDevLogin} className="form-grid" style={{ gap: '1rem', marginTop: '1rem' }}>
          <div>
            <label htmlFor="dev-login-email">Email</label>
            <input
              id="dev-login-email"
              name="email"
              type="email"
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="button-row">
            <button type="submit" disabled={loginLoading}>
              {loginLoading ? 'Requesting…' : 'Get Token'}
            </button>
          </div>
        </form>

        {loginStatus && <p className="muted">{loginStatus}</p>}
        {loginError && (
          <p role="alert" style={{ color: 'var(--red-500)', marginTop: '0.5rem' }}>
            {loginError}
          </p>
        )}
      </section>
    </section>
  );
}
