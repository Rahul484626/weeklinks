"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  FileText,
  Loader2,
  Pencil,
  RefreshCw,
  Upload,
  Folder,
} from "lucide-react";
import { UploadConflictDialog } from "@/components/upload-conflict-dialog";
import {
  cn,
  formatBytes,
  formatDate,
  getNextAvailableFileName,
  isPlainTextFile,
} from "@/lib/utils";

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string | null;
  size: number | null;
  webViewLink: string | null;
};

type UploadConflict = {
  file: File;
  existing: DriveFile;
  versionedName: string;
};

type Props = {
  topicId: string;
};

export function FileManager({ topicId }: Props) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    id: string;
    name: string;
    content: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<UploadConflict | null>(null);
  const [pendingUploads, setPendingUploads] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const reservedNamesRef = useRef<Set<string>>(new Set());

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderHistory, setFolderHistory] = useState<{ id: string; name: string }[]>([]);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = currentFolderId
        ? `/api/drive/${topicId}/files?folderId=${currentFolderId}`
        : `/api/drive/${topicId}/files`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load files");
      setFiles(data.files ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
    } finally {
      setLoading(false);
    }
  }, [topicId, currentFolderId]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  function handleFolderClick(folder: DriveFile) {
    setFolderHistory((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setCurrentFolderId(folder.id);
  }

  function handleBreadcrumbClick(index: number, folderId: string | null) {
    if (folderId === null) {
      setFolderHistory([]);
      setCurrentFolderId(null);
    } else {
      setFolderHistory((prev) => prev.slice(0, index + 1));
      setCurrentFolderId(folderId);
    }
  }

  function findExistingByName(name: string): DriveFile | undefined {
    const lower = name.toLowerCase();
    return files.find((file) => file.name.toLowerCase() === lower);
  }

  async function uploadFile(
    file: File,
    options?: {
      conflictAction?: "replace" | "rename";
      replaceFileId?: string;
      targetName?: string;
    },
  ) {
    const form = new FormData();
    form.append("file", file);
    if (currentFolderId) {
      form.append("folderId", currentFolderId);
    }
    if (options?.conflictAction) {
      form.append("conflictAction", options.conflictAction);
    }
    if (options?.replaceFileId) {
      form.append("replaceFileId", options.replaceFileId);
    }
    if (options?.targetName) {
      form.append("targetName", options.targetName);
    }

    const res = await fetch(`/api/drive/${topicId}/upload`, {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `Failed to upload ${file.name}`);
    }

    const uploaded = data.file as DriveFile | undefined;
    if (uploaded?.name) {
      reservedNamesRef.current.add(uploaded.name);
      if (options?.conflictAction === "replace") {
        setFiles((current) =>
          current.map((item) =>
            item.id === uploaded.id ? { ...item, ...uploaded } : item,
          ),
        );
      } else {
        setFiles((current) => [...current, uploaded]);
      }
    }
  }

  function isNameTaken(name: string): boolean {
    const lower = name.toLowerCase();
    return Array.from(reservedNamesRef.current).some(
      (reserved) => reserved.toLowerCase() === lower,
    );
  }

  async function processUploadQueue(queue: File[], resetReserved = true) {
    if (queue.length === 0) return;

    setUploading(true);
    setError(null);
    if (resetReserved) {
      reservedNamesRef.current = new Set(files.map((file) => file.name));
    }

    try {
      let index = 0;
      while (index < queue.length) {
        const file = queue[index];
        const existing = findExistingByName(file.name);
        const taken = isNameTaken(file.name);

        if (existing || taken) {
          const versionedName = getNextAvailableFileName(
            file.name,
            reservedNamesRef.current,
          );
          setConflict({
            file,
            existing: existing ?? {
              id: "",
              name: file.name,
              mimeType: file.type || "application/octet-stream",
              modifiedTime: null,
              size: null,
              webViewLink: null,
            },
            versionedName,
          });
          setPendingUploads(queue.slice(index + 1));
          return;
        }

        await uploadFile(file);
        reservedNamesRef.current.add(file.name);
        index += 1;
      }

      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setPendingUploads([]);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    await processUploadQueue(Array.from(fileList), true);
  }

  async function resolveConflict(action: "replace" | "rename") {
    if (!conflict) return;

    setUploading(true);
    setError(null);

    try {
      if (action === "replace") {
        if (!conflict.existing.id) {
          throw new Error("Could not find the existing file to replace.");
        }
        await uploadFile(conflict.file, {
          conflictAction: "replace",
          replaceFileId: conflict.existing.id,
        });
      } else {
        await uploadFile(conflict.file, {
          conflictAction: "rename",
          targetName: conflict.versionedName,
        });
      }

      const nextQueue = pendingUploads;
      setConflict(null);
      setPendingUploads([]);

      if (nextQueue.length > 0) {
        await processUploadQueue(nextQueue, false);
      } else {
        await loadFiles();
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
      setConflict(null);
      setPendingUploads([]);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function cancelConflict() {
    setConflict(null);
    setPendingUploads([]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function openEditor(file: DriveFile) {
    setError(null);
    try {
      const res = await fetch(`/api/drive/files/${file.id}/content`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to open file");
      setEditing({
        id: file.id,
        name: data.name ?? file.name,
        content: data.content ?? "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open file");
    }
  }

  async function saveEditor() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/drive/files/${editing.id}/content`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editing.content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setEditing(null);
      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {conflict && (
        <UploadConflictDialog
          fileName={conflict.file.name}
          versionedName={conflict.versionedName}
          canReplace={!!conflict.existing.id}
          busy={uploading}
          onReplace={() => void resolveConflict("replace")}
          onRename={() => void resolveConflict("rename")}
          onCancel={cancelConflict}
        />
      )}

      {/* Breadcrumbs Navigation */}
      <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 bg-white px-3 py-2 rounded-xl border border-zinc-200 shadow-xs max-w-full overflow-x-auto scrollbar-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
        <button
          type="button"
          onClick={() => handleBreadcrumbClick(-1, null)}
          className="text-indigo-600 hover:text-indigo-805 hover:underline transition cursor-pointer font-bold shrink-0"
        >
          Root Folder
        </button>
        {folderHistory.map((item, idx) => (
          <div key={item.id} className="flex items-center gap-1.5 min-w-0 shrink-0">
            <span className="text-zinc-300">/</span>
            <button
              type="button"
              onClick={() => handleBreadcrumbClick(idx, item.id)}
              className={cn(
                "hover:underline transition cursor-pointer max-w-[120px] truncate",
                idx === folderHistory.length - 1
                  ? "text-zinc-800 font-bold pointer-events-none cursor-default dark:text-zinc-200"
                  : "text-indigo-600 hover:text-indigo-805 dark:text-indigo-400 dark:hover:text-indigo-300"
              )}
            >
              {item.name}
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {loading ? "Fetching files from Google Drive…" : `${files.length} file${files.length === 1 ? "" : "s"}`}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadFiles()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Upload
          </button>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            multiple
            onChange={(e) => void handleUpload(e.target.files)}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {editing ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-600" />
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{editing.name}</h3>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveEditor()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save to Drive
              </button>
            </div>
          </div>
          <textarea
            value={editing.content}
            onChange={(e) =>
              setEditing({ ...editing, content: e.target.value })
            }
            className="h-[420px] w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 p-3 font-mono text-sm text-zinc-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:ring-indigo-900"
            spellCheck={false}
          />
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-zinc-200 bg-white py-16 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Fetching folder contents…
        </div>
      ) : files.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-950">
          <p className="font-medium text-zinc-900 dark:text-zinc-100">This folder is empty</p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Upload scripts or videos to get started.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <table className="min-w-full divide-y divide-zinc-100 text-sm dark:divide-zinc-800/50">
            <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="hidden px-4 py-3 sm:table-cell">Modified</th>
                <th className="hidden px-4 py-3 md:table-cell">Size</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {files.map((file) => {
                const isFolder = file.mimeType === "application/vnd.google-apps.folder";
                const editable = isPlainTextFile(file.name, file.mimeType);
                return (
                  <tr key={file.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50">
                    <td className="max-w-[220px] truncate px-4 py-3 font-medium text-zinc-900 sm:max-w-none dark:text-zinc-200">
                      <div className="flex items-center gap-2">
                        {isFolder ? (
                          <Folder className="h-4 w-4 text-amber-500 shrink-0" />
                        ) : (
                          <FileText className="h-4 w-4 text-zinc-400 shrink-0" />
                        )}
                        {isFolder ? (
                          <button
                            type="button"
                            onClick={() => handleFolderClick(file)}
                            className="text-left font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer truncate"
                          >
                            {file.name}
                          </button>
                        ) : (
                          <span className="truncate">{file.name}</span>
                        )}
                      </div>
                      <p className="pl-6 truncate text-xs font-normal text-zinc-400">
                        {isFolder ? "Folder" : file.mimeType}
                      </p>
                    </td>
                    <td className="hidden px-4 py-3 text-zinc-600 sm:table-cell">
                      {formatDate(file.modifiedTime)}
                    </td>
                    <td className="hidden px-4 py-3 text-zinc-600 md:table-cell">
                      {formatBytes(file.size)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {editable && (
                          <button
                            type="button"
                            onClick={() => void openEditor(file)}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-indigo-700"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="hidden lg:inline">Edit</span>
                          </button>
                        )}
                        {!isFolder && (
                          <a
                            href={`/api/drive/files/${file.id}/download`}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-indigo-700"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                            <span className="hidden lg:inline">Download</span>
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
