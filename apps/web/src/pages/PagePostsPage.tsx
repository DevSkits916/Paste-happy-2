import { FormEvent, useState } from 'react';
import { apiFetch } from '../api/client';

type Draft = {
  pageId: string;
  message: string;
  scheduledAt: string;
};

export default function PagePostsPage() {
  const [draft, setDraft] = useState<Draft>({ pageId: '', message: '', scheduledAt: '' });
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('Preview only — connect API to post.');

    try {
      await apiFetch('/logs', { method: 'GET' });
    } catch (error) {
      console.debug('Logs check', error);
    }
  }

  return (
    <section className="panel">
      <h2>Page Posts</h2>
      <p className="muted">Compose and schedule page posts. API integration coming soon.</p>

      <form onSubmit={handleSubmit} className="form-grid" style={{ gap: '1rem', marginTop: '1rem' }}>
        <div>
          <label htmlFor="page-id">Facebook Page</label>
          <input
            id="page-id"
            placeholder="Paste page ID or name"
            value={draft.pageId}
            onChange={(event) => setDraft((prev) => ({ ...prev, pageId: event.target.value }))}
          />
        </div>
        <div>
          <label htmlFor="scheduled-at">Schedule (optional)</label>
          <input
            type="datetime-local"
            id="scheduled-at"
            value={draft.scheduledAt}
            onChange={(event) => setDraft((prev) => ({ ...prev, scheduledAt: event.target.value }))}
          />
        </div>
        <div>
          <label htmlFor="message">Message</label>
          <textarea
            id="message"
            placeholder="Write your post content here..."
            value={draft.message}
            onChange={(event) => setDraft((prev) => ({ ...prev, message: event.target.value }))}
          />
        </div>
        <div className="button-row">
          <button type="submit">Preview workflow</button>
        </div>
      </form>

      <div className="panel" style={{ background: '#f8fafc' }}>
        <h3>Live Preview</h3>
        <p className="muted small">Page: {draft.pageId || '—'}</p>
        <p>{draft.message || 'Your message preview will appear here.'}</p>
        {draft.scheduledAt && <p className="muted small">Scheduled for {new Date(draft.scheduledAt).toLocaleString()}</p>}
      </div>

      {status && <p className="muted">{status}</p>}
    </section>
  );
}
