import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api/client';
import { useAppStore } from '../store/useAppStore';

type QueueRow = {
  id: string;
  groupName: string;
  groupUrl: string;
  adText: string;
  status: 'queued' | 'done' | 'skipped';
  attempts: number;
  lastPostedAt: string | null;
  notes: string | null;
};

export default function QueuePage() {
  const { statusFilter, setStatusFilter } = useAppStore();
  const [items, setItems] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadQueue() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<QueueRow[]>('/queue');
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load queue');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQueue();
  }, []);

  const filteredItems = useMemo(() => {
    if (statusFilter === 'all') {
      return items;
    }
    return items.filter((item) => item.status === statusFilter);
  }, [items, statusFilter]);

  async function handleStatusChange(id: string, status: QueueRow['status']) {
    try {
      const updated = await apiFetch<QueueRow>(`/queue/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update row');
    }
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
  }

  function handleOpen(url: string) {
    window.open(url, '_blank', 'noopener');
  }

  async function handleCopyAndOpen(item: QueueRow) {
    await handleCopy(item.adText);
    handleOpen(item.groupUrl);
  }

  async function handleImportCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(1);

    for (const row of rows) {
      const [groupName, groupUrl, adText] = row.split(',').map((value) => value?.trim() ?? '');
      if (!groupName || !groupUrl || !adText) continue;
      try {
        const created = await apiFetch<QueueRow>('/queue', {
          method: 'POST',
          body: JSON.stringify({ groupName, groupUrl, adText })
        });
        setItems((prev) => [created, ...prev]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to import row');
      }
    }

    event.target.value = '';
  }

  return (
    <section className="panel">
      <div className="button-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Queue</h2>
          <p className="muted">Manage your group posting queue.</p>
        </div>
        <label className="file-upload">
          <span>Import CSV</span>
          <input type="file" accept=".csv" onChange={handleImportCsv} />
        </label>
      </div>

      <div className="form-grid two-col" style={{ marginTop: '1rem' }}>
        <div>
          <label htmlFor="status-filter">Status filter</label>
          <select id="status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
            <option value="all">All</option>
            <option value="queued">Queued</option>
            <option value="done">Done</option>
            <option value="skipped">Skipped</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button type="button" className="secondary" onClick={loadQueue} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {loading && <p className="muted">Loading queue…</p>}

      <div className="table-wrapper" style={{ overflowX: 'auto', marginTop: '1rem' }}>
        <table>
          <thead>
            <tr>
              <th>Group</th>
              <th>Status</th>
              <th>Attempts</th>
              <th>Last Posted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="queue-group">
                    <strong>{item.groupName}</strong>
                    <p className="muted small">{item.groupUrl}</p>
                  </div>
                </td>
                <td>
                  <select value={item.status} onChange={(event) => handleStatusChange(item.id, event.target.value as QueueRow['status'])}>
                    <option value="queued">Queued</option>
                    <option value="done">Done</option>
                    <option value="skipped">Skipped</option>
                  </select>
                </td>
                <td>{item.attempts}</td>
                <td>{item.lastPostedAt ? new Date(item.lastPostedAt).toLocaleString() : '—'}</td>
                <td>
                  <div className="button-row">
                    <button type="button" onClick={() => handleCopy(item.adText)}>
                      Copy
                    </button>
                    <button type="button" className="secondary" onClick={() => handleOpen(item.groupUrl)}>
                      Open
                    </button>
                    <button type="button" onClick={() => handleCopyAndOpen(item)}>
                      Copy &amp; Open
                    </button>
                    <button type="button" className="secondary" onClick={() => handleStatusChange(item.id, 'done')}>
                      Mark Done
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && filteredItems.length === 0 && <p>No queue items yet.</p>}
    </section>
  );
}
