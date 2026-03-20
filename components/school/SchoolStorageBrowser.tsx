import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, FileText, Folder, FolderOpen, HardDrive, RefreshCw, X } from 'lucide-react';
import { UploadedFile } from '../../types';
import {
  SchoolStorageFile,
  SchoolStorageFolder,
  downloadSchoolStorageFilesAsUploads,
  loadSchoolStorageSnapshot,
} from '../../services/schoolStorage';

interface SchoolStorageBrowserProps {
  isOpen: boolean;
  schoolId: string;
  existingCount?: number;
  maxFiles?: number;
  onAttach: (files: UploadedFile[]) => void;
  onClose: () => void;
}

const formatBytes = (value: number) => {
  const bytes = Math.max(0, Number(value || 0));
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const SchoolStorageBrowser: React.FC<SchoolStorageBrowserProps> = ({
  isOpen,
  schoolId,
  existingCount = 0,
  maxFiles = 3,
  onAttach,
  onClose,
}) => {
  const [folders, setFolders] = useState<SchoolStorageFolder[]>([]);
  const [files, setFiles] = useState<SchoolStorageFile[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const folderById = useMemo(
    () => new Map<string, SchoolStorageFolder>(folders.map((folder) => [folder.id, folder])),
    [folders]
  );

  const loadSnapshot = async () => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);
    try {
      const snapshot = await loadSchoolStorageSnapshot(schoolId);
      setFolders(snapshot.folders);
      setFiles(snapshot.files);
      setSelectedFileIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load school storage.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !schoolId) return;
    setCurrentFolderId(null);
    void loadSnapshot();
  }, [isOpen, schoolId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const breadcrumbs = useMemo(() => {
    const items: Array<{ id: string | null; name: string }> = [{ id: null, name: 'Root' }];
    const visited = new Set<string>();
    let cursor = currentFolderId;
    const stack: Array<{ id: string; name: string }> = [];

    while (cursor && folderById.has(cursor) && !visited.has(cursor)) {
      visited.add(cursor);
      const folder = folderById.get(cursor)!;
      stack.push({ id: folder.id, name: folder.name });
      cursor = folder.parentId;
    }

    stack.reverse().forEach((item) => items.push(item));
    return items;
  }, [currentFolderId, folderById]);

  const childFolders = useMemo(
    () =>
      folders
        .filter((folder) => (folder.parentId || null) === (currentFolderId || null))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [currentFolderId, folders]
  );

  const visibleFiles = useMemo(
    () =>
      files
        .filter((file) => (file.folderId || null) === (currentFolderId || null))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [currentFolderId, files]
  );

  const handleToggleFile = (fileId: string) => {
    setSelectedFileIds((prev) => {
      if (prev.includes(fileId)) return prev.filter((id) => id !== fileId);
      return [...prev, fileId];
    });
  };

  const handleAttach = async () => {
    if (!selectedFileIds.length) return;
    const nextTotal = existingCount + selectedFileIds.length;
    if (nextTotal > maxFiles) {
      setError(`You can attach up to ${maxFiles} files total. Remove some existing files first.`);
      return;
    }

    const selectedFiles = files.filter((file) => selectedFileIds.includes(file.id));
    setAttaching(true);
    setError(null);
    try {
      const uploads = await downloadSchoolStorageFilesAsUploads(selectedFiles);
      onAttach(uploads);
      setSelectedFileIds([]);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not attach school files.');
    } finally {
      setAttaching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/55 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[88vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-blue">
              <HardDrive size={13} /> School Storage
            </div>
            <h2 className="mt-2 text-xl font-bold text-slate-800">Attach Shared School Files</h2>
            <p className="text-sm text-slate-500">
              Browse shared school files and attach up to {maxFiles} source documents.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-slate-300 hover:text-slate-700"
            aria-label="Close school storage browser"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-5 py-3">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.id || 'root'}>
              <button
                type="button"
                onClick={() => setCurrentFolderId(crumb.id)}
                className={`rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                  crumb.id === currentFolderId || (crumb.id === null && currentFolderId === null)
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {crumb.name}
              </button>
              {index < breadcrumbs.length - 1 && <span className="text-slate-300">/</span>}
            </React.Fragment>
          ))}

          <div className="ml-auto flex items-center gap-2">
            {currentFolderId && (
              <button
                type="button"
                onClick={() => setCurrentFolderId(folderById.get(currentFolderId)?.parentId || null)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:border-slate-300 hover:text-slate-800"
              >
                <ChevronLeft size={15} /> Up
              </button>
            )}
            <button
              type="button"
              onClick={() => void loadSnapshot()}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:border-slate-300 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: 'calc(88vh - 190px)' }}>
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center text-sm text-slate-500">
              <RefreshCw size={16} className="inline-block mr-2 animate-spin" />
              Loading school storage...
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1.1fr,1.4fr]">
              <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Folders</h3>
                {childFolders.length ? (
                  <div className="space-y-2">
                    {childFolders.map((folder) => (
                      <button
                        key={folder.id}
                        type="button"
                        onClick={() => setCurrentFolderId(folder.id)}
                        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left hover:border-brand-blue hover:bg-sky-50"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          {currentFolderId === folder.id ? (
                            <FolderOpen size={16} className="text-brand-blue shrink-0" />
                          ) : (
                            <Folder size={16} className="text-brand-blue shrink-0" />
                          )}
                          <span className="truncate text-sm font-medium text-slate-700">{folder.name}</span>
                        </span>
                        <span className="text-xs text-slate-400">Open</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No subfolders here.</p>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-800">Files</h3>
                  <span className="text-xs text-slate-500">
                    Selected: {selectedFileIds.length} / Remaining: {Math.max(0, maxFiles - existingCount)}
                  </span>
                </div>

                {visibleFiles.length ? (
                  <div className="space-y-2">
                    {visibleFiles.map((file) => {
                      const checked = selectedFileIds.includes(file.id);
                      const disabled = !checked && existingCount + selectedFileIds.length >= maxFiles;
                      return (
                        <label
                          key={file.id}
                          className={`flex items-center justify-between rounded-xl border px-3 py-2 ${
                            checked
                              ? 'border-brand-blue bg-sky-50'
                              : 'border-slate-200 hover:border-slate-300'
                          } ${disabled ? 'opacity-60' : 'cursor-pointer'}`}
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={disabled}
                              onChange={() => handleToggleFile(file.id)}
                              className="h-4 w-4 rounded border-slate-300 text-brand-blue"
                            />
                            <FileText size={16} className="text-slate-400 shrink-0" />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-slate-700">{file.name}</span>
                              <span className="block text-xs text-slate-500">
                                {formatBytes(file.sizeBytes)}
                              </span>
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No files in this folder yet.</p>
                )}
              </section>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
          <p className="text-xs text-slate-500">
            School files are attached as source material only. They are not copied into the saved game or worksheet.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleAttach()}
              disabled={!selectedFileIds.length || attaching || loading}
              className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {attaching ? 'Attaching...' : `Attach ${selectedFileIds.length || ''}`.trim()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
