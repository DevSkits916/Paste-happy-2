import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { useAppStore } from '../store/useAppStore';

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
