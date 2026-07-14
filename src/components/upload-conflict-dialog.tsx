"use client";

import { FileWarning } from "lucide-react";

type Props = {
  fileName: string;
  versionedName: string;
  canReplace: boolean;
  onReplace: () => void;
  onRename: () => void;
  onCancel: () => void;
  busy?: boolean;
};

export function UploadConflictDialog({
  fileName,
  versionedName,
  canReplace,
  onReplace,
  onRename,
  onCancel,
  busy,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 px-4">
      <div
        role="dialog"
        aria-labelledby="upload-conflict-title"
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-full bg-amber-100 p-2 text-amber-700">
            <FileWarning className="h-5 w-5" />
          </div>
          <div>
            <h2
              id="upload-conflict-title"
              className="text-lg font-semibold text-zinc-900"
            >
              File already exists
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              <span className="font-medium text-zinc-900">{fileName}</span> is
              already in this folder. What would you like to do?
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {canReplace && (
            <button
              type="button"
              onClick={onReplace}
              disabled={busy}
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm transition hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-60"
            >
              <span className="font-medium text-zinc-900">Replace existing file</span>
              <span className="mt-0.5 block text-zinc-500">
                Overwrite {fileName} with the new upload
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onRename}
            disabled={busy}
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm transition hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-60"
          >
            <span className="font-medium text-zinc-900">Keep both</span>
            <span className="mt-0.5 block text-zinc-500">
              Upload as {versionedName}
            </span>
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="w-full rounded-xl px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-60"
          >
            Cancel upload
          </button>
        </div>
      </div>
    </div>
  );
}
