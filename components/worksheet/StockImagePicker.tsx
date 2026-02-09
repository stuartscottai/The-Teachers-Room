import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { searchStockImages, StockImageResult } from '../../services/stockImageService';
import { toCoepSafeStockImageUrl } from '../../utils/stockImageUrl';

export type StockImageSelection = {
  id: string;
  url: string;
  thumbUrl: string;
  label: string;
};

export const StockImagePicker: React.FC<{
  isOpen: boolean;
  mode?: 'single' | 'multi';
  initialQuery?: string;
  initialSelection?: StockImageSelection[];
  onClose: () => void;
  onConfirm: (selection: StockImageSelection[]) => void;
  onUpload?: () => void;
}> = ({
  isOpen,
  mode = 'single',
  initialQuery = '',
  initialSelection = [],
  onClose,
  onConfirm,
  onUpload,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<StockImageResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<StockImageSelection[]>(initialSelection);
  const [page, setPage] = useState(1);
  const [totalHits, setTotalHits] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const proxyUrl = (value: string) => toCoepSafeStockImageUrl(value, !import.meta.env.DEV);

  useEffect(() => {
    if (!isOpen) return;
    setQuery(initialQuery);
    setSelected(initialSelection);
    setResults([]);
    setError(null);
    setPage(1);
    setTotalHits(0);
  }, [initialQuery, initialSelection, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const trimmed = initialQuery.trim();
    if (!trimmed) return;
    runSearch();
  }, [initialQuery, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  const selectedMap = useMemo(() => {
    const map = new Map<string, StockImageSelection>();
    for (const item of selected) {
      map.set(item.id, item);
    }
    return map;
  }, [selected]);

  const runSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const data = await searchStockImages(trimmed, { page: 1, perPage: 24, signal: controller.signal, strict: true });
      setResults(data.items);
      setTotalHits(data.totalHits);
      setPage(1);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const nextPage = page + 1;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const data = await searchStockImages(trimmed, { page: nextPage, perPage: 24, signal: controller.signal, strict: true });
      setResults((prev) => [...prev, ...data.items]);
      setTotalHits(data.totalHits);
      setPage(nextPage);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (item: StockImageResult) => {
    const safeAlt = (item.alt || '').trim();
    const trimmedQuery = query.trim();
    const defaultLabel = (() => {
      if (!trimmedQuery) return safeAlt;
      const queryLower = trimmedQuery.toLowerCase();
      const altLower = safeAlt.toLowerCase();
      if (altLower.includes(queryLower)) return trimmedQuery;
      if (trimmedQuery.split(/\s+/).length === 1) return trimmedQuery;
      return safeAlt || trimmedQuery;
    })();
    if (mode === 'single') {
      setSelected([
        {
          id: item.id,
          url: item.url,
          thumbUrl: item.thumbUrl,
          label: defaultLabel,
        },
      ]);
      return;
    }
    const existing = selectedMap.get(item.id);
    if (existing) {
      setSelected((prev) => prev.filter((sel) => sel.id !== item.id));
      return;
    }
    setSelected((prev) => [
      ...prev,
      {
        id: item.id,
        url: item.url,
        thumbUrl: item.thumbUrl,
        label: defaultLabel,
      },
    ]);
  };

  const updateLabel = (id: string, label: string) => {
    setSelected((prev) => prev.map((item) => (item.id === id ? { ...item, label } : item)));
  };

  const handleConfirm = () => {
    onConfirm(selected);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div>
            <div className="text-sm font-extrabold text-slate-800">Stock Image Bank</div>
            <div className="text-[11px] text-slate-500">Search and select images to use.</div>
          </div>
          <div className="flex items-center gap-2">
            {onUpload && (
              <button
                type="button"
                onClick={onUpload}
                className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
              >
                Upload
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-200"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row min-h-[520px]">
          <div className="flex-1 p-4 border-b md:border-b-0 md:border-r border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') runSearch();
                  }}
                  placeholder="Search images (e.g., animals, classroom, nouns)"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={runSearch}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white"
                disabled={loading}
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2 mb-3">
                {error.includes('PIXABAY_API_KEY')
                  ? 'Stock image search is not configured. Set PIXABAY_API_KEY on the server (and/or VITE_PIXABAY_API_KEY for local fallback).'
                  : error}
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[420px] overflow-y-auto pr-1">
              {results.map((item) => {
                const isSelected = selectedMap.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleSelect(item)}
                    className={`relative rounded-xl overflow-hidden border ${
                      isSelected ? 'border-teal-500 ring-2 ring-teal-200' : 'border-slate-200'
                    }`}
                    title={item.alt}
                  >
                    <img
                      src={proxyUrl(item.thumbUrl || item.url)}
                      alt={item.alt}
                      loading="lazy"
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (img.dataset.fallback === '1') return;
                        img.dataset.fallback = '1';
                        img.src = item.url || item.thumbUrl;
                      }}
                      className="w-full h-28 object-cover"
                    />
                    <div className="px-2 py-1 text-[10px] text-slate-600 truncate bg-white" title={item.alt}>
                      {item.alt}
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-teal-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                        Selected
                      </div>
                    )}
                  </button>
                );
              })}
              {!results.length && !loading && (
                <div className="col-span-full text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
                  Search to load images.
                </div>
              )}
            </div>
            {results.length > 0 && (
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  Showing {results.length}
                  {totalHits ? ` of ${totalHits}` : ''}
                </span>
                {totalHits === 0 || results.length < totalHits ? (
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                  >
                    {loading ? 'Loading...' : 'Load more'}
                  </button>
                ) : (
                  <span>All results loaded</span>
                )}
              </div>
            )}
          </div>

          <div className="w-full md:w-72 p-4 bg-slate-50">
            <div className="text-xs font-bold text-slate-700 mb-2">
              Selected ({selected.length})
            </div>
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {selected.map((item) => (
                <div key={item.id} className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg">
                  <img
                    src={proxyUrl(item.thumbUrl || item.url)}
                    alt=""
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (img.dataset.fallback === '1') return;
                      img.dataset.fallback = '1';
                      img.src = item.url || item.thumbUrl;
                    }}
                    className="w-10 h-10 object-cover rounded"
                  />
                  <input
                    value={item.label}
                    onChange={(e) => updateLabel(item.id, e.target.value)}
                    className="flex-1 text-[11px] p-1 rounded border border-slate-200"
                    placeholder="Label"
                  />
                  <button
                    type="button"
                    onClick={() => setSelected((prev) => prev.filter((sel) => sel.id !== item.id))}
                    className="text-slate-300 hover:text-red-500 p-1 rounded hover:bg-red-50"
                    aria-label="Remove image"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {selected.length === 0 && (
                <div className="text-xs text-slate-500">No images selected yet.</div>
              )}
            </div>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={selected.length === 0}
              className="w-full mt-3 py-2 rounded-xl text-xs font-extrabold text-white bg-teal-500 hover:bg-teal-600 disabled:bg-slate-300"
            >
              {mode === 'single' ? 'Use Image' : 'Use Selected Images'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
