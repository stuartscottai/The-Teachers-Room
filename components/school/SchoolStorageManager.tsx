import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, FileText, Folder, HardDrive, Plus, RefreshCw, Trash2, Upload } from 'lucide-react';
import {
  calculateSchoolStorageUsage,
  ensureSchoolStorageCapacity,
  formatSchoolStorageBytes,
  SchoolStorageFile,
  SchoolStorageFolder,
  SCHOOL_STORAGE_LIMIT_LABEL,
  createSchoolStorageFolder,
  createSchoolStorageFileViewUrl,
  deleteSchoolStorageFile,
  deleteSchoolStorageFolder,
  loadSchoolStorageSnapshot,
  moveSchoolStorageFile,
  uploadSchoolStorageFile,
} from '../../services/schoolStorage';

const SOURCE_ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp';

interface SchoolStorageManagerProps {
  schoolId: string;
}

export const SchoolStorageManager: React.FC<SchoolStorageManagerProps> = ({ schoolId }) => {
  const [folders, setFolders] = useState<SchoolStorageFolder[]>([]);
  const [files, setFiles] = useState<SchoolStorageFile[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<string[]>([]);
  const [hasInitializedFolderTree, setHasInitializedFolderTree] = useState(false);
  const [openingFileId, setOpeningFileId] = useState<string | null>(null);

  const folderById = useMemo(
    () => new Map<string, SchoolStorageFolder>(folders.map((folder) => [folder.id, folder])),
    [folders]
  );

  const childFoldersByParent = useMemo(() => {
    const map = new Map<string | null, SchoolStorageFolder[]>();
    folders.forEach((folder) => {
      const key = folder.parentId || null;
      const next = map.get(key) || [];
      next.push(folder);
      map.set(key, next);
    });
    map.forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name)));
    return map;
  }, [folders]);

  const fileCountByFolder = useMemo(() => {
    const counts = new Map<string | null, number>();
    files.forEach((file) => {
      const key = file.folderId || null;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [files]);

  const folderIdsWithChildren = useMemo(() => {
    const ids = new Set<string>();
    childFoldersByParent.forEach((items, parentId) => {
      if (parentId && items.length > 0) ids.add(parentId);
    });
    return ids;
  }, [childFoldersByParent]);

  const storageUsage = useMemo(() => calculateSchoolStorageUsage(files), [files]);

  const buildFolderPathIds = (folderId: string | null, folderMap: Map<string, SchoolStorageFolder>) => {
    const path: string[] = [];
    const visited = new Set<string>();
    let cursor = folderId;
    while (cursor && folderMap.has(cursor) && !visited.has(cursor)) {
      visited.add(cursor);
      path.push(cursor);
      cursor = folderMap.get(cursor)?.parentId || null;
    }
    return path.reverse();
  };

  const loadSnapshot = async () => {
    if (!schoolId) return;
    setLoading(true);
    setFeedback(null);
    try {
      const snapshot = await loadSchoolStorageSnapshot(schoolId);
      setFolders(snapshot.folders);
      setFiles(snapshot.files);
      const nextFolderMap = new Map<string, SchoolStorageFolder>(
        snapshot.folders.map((folder) => [folder.id, folder])
      );
      const nextFoldersWithChildren = new Set<string>();
      snapshot.folders.forEach((folder) => {
        if (folder.parentId) {
          nextFoldersWithChildren.add(folder.parentId);
        }
      });
      setExpandedFolderIds((prev) => {
        const filtered = prev.filter((folderId) => nextFolderMap.has(folderId) && nextFoldersWithChildren.has(folderId));
        if (hasInitializedFolderTree) return filtered;
        return Array.from(nextFoldersWithChildren);
      });
      if (!hasInitializedFolderTree) {
        setHasInitializedFolderTree(true);
      }
      setCurrentFolderId((prev) => {
        if (!prev) return prev;
        return snapshot.folders.some((folder) => folder.id === prev) ? prev : null;
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not load school storage.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!schoolId) return;
    void loadSnapshot();
  }, [hasInitializedFolderTree, schoolId]);

  useEffect(() => {
    if (!currentFolderId) return;
    const pathIds = buildFolderPathIds(currentFolderId, folderById);
    if (!pathIds.length) return;

    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      pathIds
        .filter((folderId) => folderIdsWithChildren.has(folderId))
        .forEach((folderId) => next.add(folderId));
      return Array.from(next);
    });
  }, [currentFolderId, folderById, folderIdsWithChildren]);

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

  const currentChildFolders = useMemo(
    () => childFoldersByParent.get(currentFolderId || null) || [],
    [childFoldersByParent, currentFolderId]
  );

  const currentFiles = useMemo(
    () =>
      files
        .filter((file) => (file.folderId || null) === (currentFolderId || null))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [currentFolderId, files]
  );

  const folderPathLabel = (folderId: string | null) => {
    if (!folderId) return 'Root';
    const parts: string[] = [];
    const visited = new Set<string>();
    let cursor: string | null = folderId;
    while (cursor && folderById.has(cursor) && !visited.has(cursor)) {
      visited.add(cursor);
      const folder = folderById.get(cursor)!;
      parts.push(folder.name);
      cursor = folder.parentId;
    }
    return parts.reverse().join(' / ') || 'Root';
  };

  const folderOptions = useMemo(
    () => [
      { id: '', label: 'Root' },
      ...folders
        .slice()
        .sort((a, b) => folderPathLabel(a.id).localeCompare(folderPathLabel(b.id)))
        .map((folder) => ({ id: folder.id, label: folderPathLabel(folder.id) })),
    ],
    [folders, folderById]
  );

  const toggleFolderExpanded = (folderId: string) => {
    setExpandedFolderIds((prev) =>
      prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId]
    );
  };

  const renderFolderTree = (parentId: string | null, depth: number = 0): React.ReactNode => {
    const items = childFoldersByParent.get(parentId || null) || [];
    if (!items.length) return null;

    return items.map((folder) => {
      const childFolderCount = (childFoldersByParent.get(folder.id) || []).length;
      const fileCount = fileCountByFolder.get(folder.id) || 0;
      const isActive = folder.id === currentFolderId;
      const hasChildren = childFolderCount > 0;
      const isExpanded = expandedFolderIds.includes(folder.id);

      return (
        <div key={folder.id}>
          <div
            className={`flex items-center gap-1 rounded-lg pr-3 text-sm ${
              isActive
                ? 'bg-sky-50 text-brand-blue'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
            }`}
            style={{ paddingLeft: `${8 + depth * 18}px` }}
          >
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleFolderExpanded(folder.id)}
                className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-700"
                aria-label={isExpanded ? `Collapse ${folder.name}` : `Expand ${folder.name}`}
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <span className="w-6 shrink-0" />
            )}
            <button
              type="button"
              onClick={() => setCurrentFolderId(folder.id)}
              className="flex min-w-0 flex-1 items-center justify-between py-2 text-left"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Folder size={15} className="shrink-0" />
                <span className="truncate font-medium">{folder.name}</span>
              </span>
              <span className="text-[11px] text-slate-400">
                {fileCount}
                {childFolderCount ? ` / ${childFolderCount}` : ''}
              </span>
            </button>
          </div>
          {hasChildren && isExpanded ? renderFolderTree(folder.id, depth + 1) : null}
        </div>
      );
    });
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      setFeedback({ type: 'error', text: 'Enter a folder name.' });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      await createSchoolStorageFolder({
        schoolId,
        name: newFolderName,
        parentId: currentFolderId,
      });
      setNewFolderName('');
      setFeedback({ type: 'success', text: 'Folder created.' });
      await loadSnapshot();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not create folder.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleUploadFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = '';
    if (!fileList.length) return;

    setBusy(true);
    setFeedback(null);
    try {
      const totalUploadBytes = fileList.reduce(
        (sum, file) => sum + Math.max(0, Number(file.size || 0)),
        0
      );
      await ensureSchoolStorageCapacity({
        schoolId,
        additionalBytes: totalUploadBytes,
        currentUsageBytes: storageUsage.totalBytes,
      });

      const results = await Promise.allSettled(
        fileList.map((file) =>
          uploadSchoolStorageFile({
            schoolId,
            folderId: currentFolderId,
            file,
          })
        )
      );

      const rejected = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
      if (rejected.length) {
        throw new Error(
          rejected[0].reason instanceof Error
            ? rejected[0].reason.message
            : 'Some files could not be uploaded.'
        );
      }

      setFeedback({
        type: 'success',
        text: `${fileList.length} file${fileList.length === 1 ? '' : 's'} uploaded to school storage.`,
      });
      await loadSnapshot();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not upload files.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleMoveFile = async (fileId: string, folderId: string) => {
    setBusy(true);
    setFeedback(null);
    try {
      await moveSchoolStorageFile({
        fileId,
        folderId: folderId || null,
      });
      setFeedback({ type: 'success', text: 'File moved.' });
      await loadSnapshot();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not move file.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteFile = async (file: SchoolStorageFile) => {
    const confirmed = window.confirm(`Delete "${file.name}" from school storage?`);
    if (!confirmed) return;

    setBusy(true);
    setFeedback(null);
    try {
      await deleteSchoolStorageFile(file);
      setFeedback({ type: 'success', text: 'File deleted.' });
      await loadSnapshot();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not delete file.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleOpenFile = async (file: SchoolStorageFile) => {
    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.write('<!doctype html><title>Opening file...</title><p style="font-family: system-ui, sans-serif;">Opening file...</p>');
      previewWindow.document.close();
    }
    setOpeningFileId(file.id);
    setFeedback(null);
    try {
      const url = await createSchoolStorageFileViewUrl(file);
      if (previewWindow) {
        previewWindow.opener = null;
        previewWindow.location.href = url;
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
    } catch (err) {
      if (previewWindow) previewWindow.close();
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not open this file.',
      });
    } finally {
      setOpeningFileId(null);
    }
  };

  const handleDeleteFolder = async (folder: SchoolStorageFolder) => {
    const childFolders = childFoldersByParent.get(folder.id) || [];
    const fileCount = fileCountByFolder.get(folder.id) || 0;
    if (childFolders.length || fileCount) {
      setFeedback({
        type: 'error',
        text: 'Folder must be empty before it can be deleted.',
      });
      return;
    }

    const confirmed = window.confirm(`Delete folder "${folder.name}"?`);
    if (!confirmed) return;

    setBusy(true);
    setFeedback(null);
    try {
      await deleteSchoolStorageFolder(folder.id);
      setFeedback({ type: 'success', text: 'Folder deleted.' });
      await loadSnapshot();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not delete folder.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-blue mb-3">
            <HardDrive size={13} /> School Storage
          </div>
          <h2 className="text-xl font-bold text-slate-800">Shared File Library</h2>
          <p className="text-sm text-slate-500 mt-1">
            Teachers can save files here. Admins organise folders and file placement.
          </p>
        </div>
        <div className="min-w-[260px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-slate-700">Storage Used</span>
            <span className="text-slate-500">
              {formatSchoolStorageBytes(storageUsage.totalBytes)} / {SCHOOL_STORAGE_LIMIT_LABEL}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-all ${
                storageUsage.percentUsed >= 100
                  ? 'bg-red-500'
                  : storageUsage.percentUsed >= 80
                    ? 'bg-amber-500'
                    : 'bg-brand-blue'
              }`}
              style={{ width: `${storageUsage.percentUsed}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {formatSchoolStorageBytes(storageUsage.remainingBytes)} remaining across the whole school account.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadSnapshot()}
          disabled={loading || busy}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {feedback && (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="mt-5 grid gap-6 xl:grid-cols-[280px,1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <button
            type="button"
            onClick={() => setCurrentFolderId(null)}
            className={`mb-3 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
              currentFolderId === null
                ? 'bg-sky-50 text-brand-blue'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <span className="flex items-center gap-2 font-medium">
              <Folder size={15} /> Root
            </span>
            <span className="text-[11px] text-slate-400">{fileCountByFolder.get(null) || 0}</span>
          </button>
          <div className="max-h-[420px] overflow-y-auto pr-1">
            {renderFolderTree(null)}
          </div>
        </aside>

        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-4">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.id || 'root'}>
                  <button
                    type="button"
                    onClick={() => setCurrentFolderId(crumb.id)}
                    className={`rounded-lg px-2.5 py-1.5 ${
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
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.1fr,1fr]">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
                  Create Folder Here
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(event) => setNewFolderName(event.target.value)}
                    placeholder={currentFolderId ? 'Subfolder name' : 'Root folder name'}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-blue"
                  />
                  <button
                    type="button"
                    onClick={() => void handleCreateFolder()}
                    disabled={busy || loading}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Plus size={15} /> Create
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
                  Upload Files To Current Folder
                </label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600 hover:border-brand-blue hover:bg-sky-50">
                  <Upload size={16} />
                  <span>Upload PDFs, Word docs, or images</span>
                  <input
                    type="file"
                    multiple
                    accept={SOURCE_ACCEPT}
                    onChange={handleUploadFiles}
                    className="hidden"
                  />
                </label>
                <p className="mt-2 text-xs text-slate-500">
                  No separate per-file limit is applied here. Shared school storage is capped at {SCHOOL_STORAGE_LIMIT_LABEL} in total.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-slate-800 mb-3">Subfolders</h3>
              {currentChildFolders.length ? (
                <div className="space-y-2">
                  {currentChildFolders.map((folder) => {
                    const childCount = (childFoldersByParent.get(folder.id) || []).length;
                    const fileCount = fileCountByFolder.get(folder.id) || 0;
                    return (
                      <div
                        key={folder.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <button
                          type="button"
                          onClick={() => setCurrentFolderId(folder.id)}
                          className="flex min-w-0 items-center gap-2 text-left"
                        >
                          <Folder size={16} className="text-brand-blue shrink-0" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-slate-700">{folder.name}</span>
                            <span className="block text-xs text-slate-500">
                              {fileCount} file{fileCount === 1 ? '' : 's'}
                              {childCount ? ` Â· ${childCount} folder${childCount === 1 ? '' : 's'}` : ''}
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteFolder(folder)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          title="Delete empty folder"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No subfolders here yet.</p>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-slate-800 mb-3">Files In This Folder</h3>
              {currentFiles.length ? (
                <div className="space-y-2">
                  {currentFiles.map((file) => (
                    <div
                      key={file.id}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-2">
                          <FileText size={16} className="text-slate-400 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-slate-700">{file.name}</div>
                            <div className="text-xs text-slate-500">
                              {formatSchoolStorageBytes(file.sizeBytes)}
                            </div>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void handleOpenFile(file)}
                            disabled={openingFileId === file.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            title="Open file"
                          >
                            <ExternalLink size={13} />
                            {openingFileId === file.id ? 'Opening...' : 'Open'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteFile(file)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            title="Delete file"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Move to
                        </label>
                        <select
                          value={file.folderId || ''}
                          onChange={(event) => void handleMoveFile(file.id, event.target.value)}
                          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-blue"
                        >
                          {folderOptions.map((option) => (
                            <option key={option.id || 'root'} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No files in this folder.</p>
              )}
            </section>
          </div>
        </div>
      </div>
    </section>
  );
};
