import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
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

type ImportPreviewRow = {
  index: number;
  groupName: string;
  groupUrl: string;
  adText: string;
  errors: string[];
};

const COLUMN_KEYS = [
  'groupName',
  'groupUrl',
  'adText',
  'status',
  'attempts',
  'lastPostedAt',
  'notes',
  'actions'
] as const;

type ColumnKey = (typeof COLUMN_KEYS)[number];

const COLUMN_LABELS: Record<ColumnKey, string> = {
  groupName: 'Group Name',
  groupUrl: 'Group URL',
  adText: 'Ad Copy',
  status: 'Status',
  attempts: 'Attempts',
  lastPostedAt: 'Last Posted',
  notes: 'Notes',
  actions: 'Actions'
};

const DEFAULT_COLUMN_WIDTHS: Record<ColumnKey, number> = {
  groupName: 220,
  groupUrl: 240,
  adText: 320,
  status: 150,
  attempts: 120,
  lastPostedAt: 190,
  notes: 220,
  actions: 260
};

const STORAGE_KEY = 'queuePageSettings';

type StoredSettings = {
  statusFilter?: QueueRow['status'] | 'all';
  searchQuery?: string;
  onlyErrors?: boolean;
  onlyIncomplete?: boolean;
  columnWidths?: Partial<Record<ColumnKey, number>>;
};

function normalizeHeaderName(header: string) {
  return header.replace(/[\s_]+/g, '').toLowerCase();
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let value = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '\r') {
      continue;
    }

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      current.push(value);
      value = '';
      continue;
    }

    if ((char === '\n' || char === '\u2028' || char === '\u2029') && !inQuotes) {
      current.push(value);
      rows.push(current);
      current = [];
      value = '';
      continue;
    }

    value += char;
  }

  if (value.length > 0 || current.length > 0) {
    current.push(value);
    rows.push(current);
  }

  return rows
    .map((row) => row.map((cell) => cell.trim()))
    .filter((row) => row.some((cell) => cell.length > 0));
}

function validateGroupUrl(url: string): string | null {
  if (!url) {
    return 'Group URL is required';
  }
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) {
      return 'URL must start with http or https';
    }
    if (parsed.hostname.endsWith('facebook.com')) {
      if (parsed.protocol !== 'https:') {
        return 'Facebook URLs must use HTTPS';
      }
      if (!/\/groups\//.test(parsed.pathname)) {
        return 'Facebook group URLs must contain /groups/';
      }
    }
    return null;
  } catch (error) {
    return 'Invalid URL';
  }
}

function validateAdText(adText: string): string | null {
  if (!adText) {
    return 'Ad copy is required';
  }
  if (adText.trim().length < 20) {
    return 'Ad copy must be at least 20 characters';
  }
  return null;
}

export default function QueuePage() {
  const { statusFilter, setStatusFilter } = useAppStore();
  const [items, setItems] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(DEFAULT_COLUMN_WIDTHS);
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[] | null>(null);
  const [previewFileName, setPreviewFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastCopyOpenAt, setLastCopyOpenAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const resizingColumn = useRef<{ key: ColumnKey; startX: number; startWidth: number } | null>(null);

  const loadQueue = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as StoredSettings;
        if (parsed.statusFilter) {
          setStatusFilter(parsed.statusFilter as typeof statusFilter);
        }
        if (parsed.searchQuery) {
          setSearchQuery(parsed.searchQuery);
        }
        if (typeof parsed.onlyErrors === 'boolean') {
          setOnlyErrors(parsed.onlyErrors);
        }
        if (typeof parsed.onlyIncomplete === 'boolean') {
          setOnlyIncomplete(parsed.onlyIncomplete);
        }
        if (parsed.columnWidths) {
          setColumnWidths((prev) => ({ ...prev, ...parsed.columnWidths }));
        }
      } catch (err) {
        console.warn('Failed to parse queue settings', err);
      }
    }
    setSettingsLoaded(true);
  }, [setStatusFilter]);

  useEffect(() => {
    if (!settingsLoaded || typeof window === 'undefined') {
      return;
    }
    const settings: StoredSettings = {
      statusFilter,
      searchQuery,
      onlyErrors,
      onlyIncomplete,
      columnWidths
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [columnWidths, onlyErrors, onlyIncomplete, searchQuery, settingsLoaded, statusFilter]);

  useEffect(() => {
    if (!lastCopyOpenAt) {
      setElapsedSeconds(null);
      return;
    }
    setElapsedSeconds(Math.floor((Date.now() - lastCopyOpenAt) / 1000));
    const interval = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - lastCopyOpenAt) / 1000));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [lastCopyOpenAt]);

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => (statusFilter === 'all' ? true : item.status === statusFilter))
      .filter((item) =>
        searchQuery ? item.groupName.toLowerCase().includes(searchQuery.toLowerCase()) : true
      )
      .filter((item) => (onlyErrors ? item.status === 'skipped' || !!item.notes : true))
      .filter((item) => (onlyIncomplete ? item.status !== 'done' : true));
  }, [items, onlyErrors, onlyIncomplete, searchQuery, statusFilter]);

  useEffect(() => {
    if (!filteredItems.length) {
      setSelectedId(null);
      return;
    }
    if (selectedId && filteredItems.some((item) => item.id === selectedId)) {
      return;
    }
    setSelectedId(filteredItems[0].id);
  }, [filteredItems, selectedId]);

  const handleStatusChange = useCallback(
    async (id: string, status: QueueRow['status']) => {
      try {
        const updated = await apiFetch<QueueRow>(`/queue/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ status })
        });
        setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update row');
      }
    },
    []
  );

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to copy to clipboard');
      return false;
    }
  }, []);

  const handleOpen = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener');
  }, []);

  const handleCopyAndOpen = useCallback(
    async (item: QueueRow) => {
      const copied = await handleCopy(item.adText);
      if (!copied) {
        return;
      }
      handleOpen(item.groupUrl);
      const nowIso = new Date().toISOString();
      setLastCopyOpenAt(Date.now());
      setItems((prev) =>
        prev.map((row) =>
          row.id === item.id
            ? {
                ...row,
                attempts: row.attempts + 1,
                lastPostedAt: nowIso
              }
            : row
        )
      );
      void apiFetch<QueueRow>(`/queue/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ attempts: item.attempts + 1, lastPostedAt: nowIso })
      }).catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to update attempts');
        void loadQueue();
      });
    },
    [handleCopy, handleOpen, loadQueue]
  );

  const handleMarkDone = useCallback(
    async (item: QueueRow) => {
      await handleStatusChange(item.id, 'done');
    },
    [handleStatusChange]
  );

  const toggleExpanded = useCallback((id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const parseImportFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const rows = parseCsv(text);
    if (!rows.length) {
      setError('CSV file is empty');
      setPreviewRows(null);
      event.target.value = '';
      return;
    }

    const headers = rows[0];
    const normalizedHeaders = headers.map(normalizeHeaderName);
    const groupNameIndex = normalizedHeaders.findIndex((header) => header === 'groupname');
    const groupUrlIndex = normalizedHeaders.findIndex((header) => header === 'groupurl');
    const adIndex = normalizedHeaders.findIndex((header) => header === 'ad' || header === 'adtext');

    if (groupNameIndex === -1 || groupUrlIndex === -1 || adIndex === -1) {
      setError('CSV must include Group Name, Group URL, and Ad columns');
      setPreviewRows(null);
      event.target.value = '';
      return;
    }

    const previews: ImportPreviewRow[] = rows.slice(1).map((row, index) => {
      const groupName = row[groupNameIndex] ?? '';
      const groupUrl = row[groupUrlIndex] ?? '';
      const adText = row[adIndex] ?? '';
      const errors: string[] = [];

      if (!groupName) {
        errors.push('Group name is required');
      }
      const groupUrlError = validateGroupUrl(groupUrl);
      if (groupUrlError) {
        errors.push(groupUrlError);
      }
      const adError = validateAdText(adText);
      if (adError) {
        errors.push(adError);
      }

      return {
        index: index + 1,
        groupName,
        groupUrl,
        adText,
        errors
      };
    });

    setPreviewRows(previews);
    setPreviewFileName(file.name);
    event.target.value = '';
  }, []);

  const confirmImport = useCallback(async () => {
    if (!previewRows) return;
    const validRows = previewRows.filter((row) => row.errors.length === 0);
    if (!validRows.length) {
      setError('No valid rows to import');
      return;
    }
    setImporting(true);
    setError(null);
    try {
      const created = await apiFetch<QueueRow[]>('/queue/import', {
        method: 'POST',
        body: JSON.stringify({
          rows: validRows.map((row) => ({
            groupName: row.groupName,
            groupUrl: row.groupUrl,
            adText: row.adText
          }))
        })
      });
      setItems((prev) => [...created, ...prev]);
      setPreviewRows(null);
      setPreviewFileName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import CSV');
    } finally {
      setImporting(false);
    }
  }, [previewRows]);

  const cancelImport = useCallback(() => {
    setPreviewRows(null);
    setPreviewFileName('');
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.tagName && /(input|textarea|select)/i.test((event.target as HTMLElement).tagName)) {
        return;
      }
      if (previewRows) {
        return;
      }
      if (!filteredItems.length) {
        return;
      }
      const currentIndex = selectedId ? filteredItems.findIndex((item) => item.id === selectedId) : -1;
      if (event.key === 'j') {
        event.preventDefault();
        const nextIndex = currentIndex === -1 ? 0 : Math.min(filteredItems.length - 1, currentIndex + 1);
        setSelectedId(filteredItems[nextIndex].id);
      }
      if (event.key === 'k') {
        event.preventDefault();
        const previousIndex = currentIndex <= 0 ? 0 : currentIndex - 1;
        setSelectedId(filteredItems[previousIndex].id);
      }
      if (event.key === 'c' && currentIndex !== -1) {
        event.preventDefault();
        void handleCopyAndOpen(filteredItems[currentIndex]);
      }
      if (event.key === 'm' && currentIndex !== -1) {
        event.preventDefault();
        void handleMarkDone(filteredItems[currentIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredItems, handleCopyAndOpen, handleMarkDone, previewRows, selectedId]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!resizingColumn.current) return;
      const delta = event.clientX - resizingColumn.current.startX;
      const nextWidth = Math.max(120, resizingColumn.current.startWidth + delta);
      setColumnWidths((prev) => ({ ...prev, [resizingColumn.current!.key]: nextWidth }));
    };
    const handlePointerUp = () => {
      resizingColumn.current = null;
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  const startResizing = (key: ColumnKey, event: ReactPointerEvent<HTMLSpanElement>) => {
    event.preventDefault();
    resizingColumn.current = {
      key,
      startX: event.clientX,
      startWidth: columnWidths[key]
    };
  };

  return (
    <section className="panel queue-panel">
      <div className="panel-header">
        <div>
          <h2>Queue</h2>
          <p className="muted">Manage your group posting queue.</p>
        </div>
        <div className="panel-tools">
          <div className={`pacing-timer${elapsedSeconds !== null && elapsedSeconds < 30 ? ' warn' : ''}`}>
            <strong>{elapsedSeconds !== null ? `${elapsedSeconds}s` : '—'}</strong>
            <span className="muted small"> since last Copy &amp; Open</span>
          </div>
          <label className="file-upload">
            <span>Import CSV</span>
            <input type="file" accept=".csv" onChange={parseImportFile} />
          </label>
        </div>
      </div>

      <div className="filters">
        <div className="form-group">
          <label htmlFor="status-filter">Status</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
          >
            <option value="all">All</option>
            <option value="queued">Queued</option>
            <option value="done">Done</option>
            <option value="skipped">Skipped</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="search-filter">Search</label>
          <input
            id="search-filter"
            type="search"
            placeholder="Search group name"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={onlyErrors}
            onChange={(event) => setOnlyErrors(event.target.checked)}
          />
          <span>Only errors</span>
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={onlyIncomplete}
            onChange={(event) => setOnlyIncomplete(event.target.checked)}
          />
          <span>Only incomplete</span>
        </label>
        <button type="button" className="secondary" onClick={loadQueue} disabled={loading}>
          Refresh
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {previewRows && (
        <div className="import-preview">
          <div className="import-preview-header">
            <div>
              <h3>Preview: {previewFileName}</h3>
              <p className="muted small">
                {previewRows.length} rows — {previewRows.filter((row) => row.errors.length === 0).length} ready /{' '}
                {previewRows.filter((row) => row.errors.length > 0).length} need attention
              </p>
            </div>
            <div className="button-row">
              <button type="button" onClick={confirmImport} disabled={importing}>
                {importing ? 'Importing…' : 'Confirm Import'}
              </button>
              <button type="button" className="secondary" onClick={cancelImport} disabled={importing}>
                Cancel
              </button>
            </div>
          </div>
          <div className="table-wrapper">
            <table className="queue-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Group Name</th>
                  <th>Group URL</th>
                  <th>Ad Copy</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr key={row.index}>
                    <td>{row.index}</td>
                    <td>{row.groupName}</td>
                    <td>{row.groupUrl}</td>
                    <td className="preview-ad">{row.adText}</td>
                    <td>
                      {row.errors.length > 0 ? (
                        <span className="badge badge-error" title={row.errors.join('\n')}>
                          Needs fix
                        </span>
                      ) : (
                        <span className="badge badge-success">Ready</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loading && <p className="muted">Loading queue…</p>}

      <div className="table-wrapper queue-table-wrapper">
        <table className="queue-table">
          <colgroup>
            {COLUMN_KEYS.map((key) => (
              <col key={key} style={{ width: `${columnWidths[key]}px` }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {COLUMN_KEYS.map((key) => (
                <th key={key}>
                  <div className="th-content">
                    <span>{COLUMN_LABELS[key]}</span>
                    <span
                      role="presentation"
                      className="resize-handle"
                      onPointerDown={(event) => startResizing(key, event)}
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => {
              const isSelected = item.id === selectedId;
              const isExpanded = expandedRows.has(item.id);
              const displayAd = isExpanded || item.adText.length <= 120;
              const adPreview = displayAd ? item.adText : `${item.adText.slice(0, 120)}…`;
              return (
                <tr
                  key={item.id}
                  className={isSelected ? 'selected' : undefined}
                  onClick={() => setSelectedId(item.id)}
                >
                  <td>
                    <strong>{item.groupName}</strong>
                  </td>
                  <td>
                    <a href={item.groupUrl} target="_blank" rel="noopener noreferrer">
                      {item.groupUrl}
                    </a>
                  </td>
                  <td>
                    <p className="ad-preview">{adPreview}</p>
                    {item.adText.length > 120 && (
                      <button
                        type="button"
                        className="link-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleExpanded(item.id);
                        }}
                      >
                        {isExpanded ? 'Collapse' : 'Expand'}
                      </button>
                    )}
                  </td>
                  <td>
                    <select
                      value={item.status}
                      onChange={(event) => handleStatusChange(item.id, event.target.value as QueueRow['status'])}
                    >
                      <option value="queued">Queued</option>
                      <option value="done">Done</option>
                      <option value="skipped">Skipped</option>
                    </select>
                  </td>
                  <td>{item.attempts}</td>
                  <td>{item.lastPostedAt ? new Date(item.lastPostedAt).toLocaleString() : '—'}</td>
                  <td>{item.notes ?? '—'}</td>
                  <td>
                    <div className="queue-actions">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleCopy(item.adText);
                        }}
                      >
                        Copy
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleOpen(item.groupUrl);
                        }}
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleCopyAndOpen(item);
                        }}
                      >
                        Copy &amp; Open
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleMarkDone(item);
                        }}
                      >
                        Mark Done
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!loading && filteredItems.length === 0 && <p>No queue items yet.</p>}
    </section>
  );
}
