import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || Number.isNaN(bytes)) return "—";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "markdown",
  "json",
  "js",
  "ts",
  "tsx",
  "jsx",
  "css",
  "html",
  "htm",
  "csv",
  "tsv",
  "xml",
  "yaml",
  "yml",
  "py",
  "sh",
  "env",
  "log",
  "srt",
  "vtt",
]);

const TEXT_MIME_PREFIXES = ["text/", "application/json", "application/xml"];

export function isPlainTextFile(name: string, mimeType?: string | null): boolean {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (TEXT_EXTENSIONS.has(ext)) return true;
  if (!mimeType) return false;
  return TEXT_MIME_PREFIXES.some(
    (prefix) => mimeType === prefix || mimeType.startsWith(prefix),
  );
}

export function topicDisplayName(topic: {
  displayName?: string | null;
  driveFolderName: string;
}): string {
  return topic.displayName?.trim() || topic.driveFolderName;
}

export function splitFileName(name: string): { stem: string; ext: string } {
  const lastDot = name.lastIndexOf(".");
  if (lastDot <= 0) {
    return { stem: name, ext: "" };
  }
  return { stem: name.slice(0, lastDot), ext: name.slice(lastDot) };
}

export function getNextAvailableFileName(
  name: string,
  existingNames: Iterable<string>,
): string {
  const taken = new Set(
    Array.from(existingNames, (existing) => existing.toLowerCase()),
  );
  if (!taken.has(name.toLowerCase())) {
    return name;
  }

  const { stem, ext } = splitFileName(name);
  let version = 1;
  while (taken.has(`${stem} (${version})${ext}`.toLowerCase())) {
    version += 1;
  }
  return `${stem} (${version})${ext}`;
}
