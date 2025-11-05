import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api/client';

export type Template = {
  id: string;
  name: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

const placeholders = {
  group_name: 'Kind Hearts Community',
  city: 'Seattle',
  gofundme_url: 'https://gofundme.com/example'
};

function renderPreview(body: string) {
  return body.replace(/{{(.*?)}}/g, (_, key: string) => placeholders[key.trim() as keyof typeof placeholders] ?? `{{${key}}}`);
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', body: '' });
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate = useMemo(() => templates.find((template) => template.id === selectedId) ?? null, [templates, selectedId]);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch<Template[]>('/templates');
        setTemplates(data);
        if (data.length > 0) {
          setSelectedId(data[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load templates');
      }
    }

    load();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      setForm({ name: selectedTemplate.name, body: selectedTemplate.body });
    } else {
      setForm({ name: '', body: '' });
    }
  }, [selectedTemplate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      if (selectedTemplate) {
        const updated = await apiFetch<Template>(`/templates/${selectedTemplate.id}`, {
          method: 'PUT',
          body: JSON.stringify(form)
        });
        setTemplates((prev) => prev.map((template) => (template.id === updated.id ? updated : template)));
      } else {
        const created = await apiFetch<Template>('/templates', {
          method: 'POST',
          body: JSON.stringify(form)
        });
        setTemplates((prev) => [created, ...prev]);
        setSelectedId(created.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this template?')) return;
    try {
      await apiFetch<void>(`/templates/${id}`, { method: 'DELETE' });
      setTemplates((prev) => prev.filter((template) => template.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    }
  }

  return (
    <section className="panel">
      <h2>Templates</h2>
      <p className="muted">Draft, preview, and reuse your outreach copy.</p>

      <div className="form-grid" style={{ gap: '1.5rem', marginTop: '1rem' }}>
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button type="button" onClick={() => setSelectedId(null)}>
            New template
          </button>
          <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem', display: 'grid', gap: '0.5rem' }}>
            {templates.map((template) => (
              <li key={template.id}>
                <button
                  type="button"
                  className={selectedId === template.id ? '' : 'secondary'}
                  onClick={() => setSelectedId(template.id)}
                  style={{ width: '100%' }}
                >
                  {template.name}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <form onSubmit={handleSubmit} className="form-grid" style={{ gap: '1rem' }}>
          <div>
            <label htmlFor="template-name">Name</label>
            <input
              id="template-name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </div>
          <div>
            <label htmlFor="template-body">Body</label>
            <textarea
              id="template-body"
              value={form.body}
              onChange={(event) => setForm((prev) => ({ ...prev, body: event.target.value }))}
              required
            />
            <small className="muted small">
              Supports placeholders like {'{{group_name}}'}, {'{{city}}'}, {'{{gofundme_url}}'}.
            </small>
          </div>
          <div className="button-row">
            <button type="submit">{selectedTemplate ? 'Update' : 'Create'}</button>
            {selectedTemplate && (
              <button type="button" className="danger" onClick={() => handleDelete(selectedTemplate.id)}>
                Delete
              </button>
            )}
          </div>
          <div className="panel" style={{ background: '#f8fafc' }}>
            <h3>Preview</h3>
            <p>{renderPreview(form.body)}</p>
          </div>
        </form>
      </div>

      {error && <p className="error">{error}</p>}
    </section>
  );
}
