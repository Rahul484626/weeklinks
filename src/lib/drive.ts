import { google, drive_v3 } from "googleapis";
import {
  getGoogleAccount,
  updateGoogleAccountTokens,
} from "@/lib/accounts";

const FOLDER_MIME = "application/vnd.google-apps.folder";

async function requireGoogleAccount(userId: string) {
  const account = await getGoogleAccount(userId);

  if (!account?.refresh_token && !account?.access_token) {
    throw new Error(
      "Google account is not linked with Drive access. Please sign out and sign in again.",
    );
  }

  return account;
}

export async function getDriveClient(userId: string) {
  const account = await requireGoogleAccount(userId);

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );

  oauth2Client.setCredentials({
    access_token: account.access_token ?? undefined,
    refresh_token: account.refresh_token ?? undefined,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  oauth2Client.on("tokens", async (tokens) => {
    const data: {
      access_token?: string;
      expires_at?: number;
      refresh_token?: string;
    } = {};

    if (tokens.access_token) {
      data.access_token = tokens.access_token;
    }
    if (tokens.expiry_date) {
      data.expires_at = Math.floor(tokens.expiry_date / 1000);
    }
    if (tokens.refresh_token) {
      data.refresh_token = tokens.refresh_token;
    }

    if (Object.keys(data).length > 0) {
      await updateGoogleAccountTokens(account.id, data);
    }
  });

  return google.drive({ version: "v3", auth: oauth2Client });
}

export type DriveFolder = {
  id: string;
  name: string;
};

export async function listTopicFolders(
  userId: string,
): Promise<DriveFolder[]> {
  const drive = await getDriveClient(userId);
  const rootId = process.env.DRIVE_ROOT_FOLDER_ID?.trim();
  const parentClause = rootId
    ? `'${rootId}' in parents`
    : `'root' in parents`;

  const folders: DriveFolder[] = [];
  let pageToken: string | undefined;

  do {
    const res = await drive.files.list({
      q: `${parentClause} and mimeType = '${FOLDER_MIME}' and trashed = false`,
      fields: "nextPageToken, files(id, name)",
      pageSize: 100,
      pageToken,
      orderBy: "name",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    for (const file of res.data.files ?? []) {
      if (file.id && file.name) {
        folders.push({ id: file.id, name: file.name });
      }
    }

    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return folders;
}

export type DriveFileItem = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string | null;
  size: number | null;
  webViewLink: string | null;
};

export async function listFolderFiles(
  userId: string,
  folderId: string,
): Promise<DriveFileItem[]> {
  const drive = await getDriveClient(userId);
  const files: DriveFileItem[] = [];
  let pageToken: string | undefined;

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields:
        "nextPageToken, files(id, name, mimeType, modifiedTime, size, webViewLink)",
      pageSize: 100,
      pageToken,
      orderBy: "name",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    for (const file of res.data.files ?? []) {
      if (!file.id || !file.name) continue;
      files.push({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType ?? "application/octet-stream",
        modifiedTime: file.modifiedTime ?? null,
        size: file.size ? Number(file.size) : null,
        webViewLink: file.webViewLink ?? null,
      });
    }

    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return files;
}

export async function downloadFile(userId: string, fileId: string) {
  const drive = await getDriveClient(userId);
  const meta = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, size",
    supportsAllDrives: true,
  });

  const mimeType = meta.data.mimeType ?? "application/octet-stream";

  // Google Docs-like files need export
  if (mimeType.startsWith("application/vnd.google-apps.")) {
    const exportMime =
      mimeType === "application/vnd.google-apps.document"
        ? "text/plain"
        : mimeType === "application/vnd.google-apps.spreadsheet"
          ? "text/csv"
          : "application/pdf";

    const res = await drive.files.export(
      { fileId, mimeType: exportMime },
      { responseType: "arraybuffer" },
    );

    const buffer = Buffer.from(res.data as ArrayBuffer);
    return {
      name: meta.data.name ?? "download",
      mimeType: exportMime,
      buffer,
    };
  }

  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "arraybuffer" },
  );

  return {
    name: meta.data.name ?? "download",
    mimeType,
    buffer: Buffer.from(res.data as ArrayBuffer),
  };
}

export async function getFileTextContent(userId: string, fileId: string) {
  const { name, mimeType, buffer } = await downloadFile(userId, fileId);
  return {
    name,
    mimeType,
    content: buffer.toString("utf-8"),
  };
}

export async function updateFileTextContent(
  userId: string,
  fileId: string,
  content: string,
) {
  const drive = await getDriveClient(userId);
  const meta = await drive.files.get({
    fileId,
    fields: "id, name, mimeType",
    supportsAllDrives: true,
  });

  const mimeType = meta.data.mimeType ?? "text/plain";

  if (mimeType.startsWith("application/vnd.google-apps.")) {
    throw new Error(
      "Native Google Docs editing is not supported. Download or convert the file to plain text.",
    );
  }

  await drive.files.update({
    fileId,
    media: {
      mimeType,
      body: content,
    },
    supportsAllDrives: true,
  });

  return { id: fileId, name: meta.data.name ?? "file" };
}

export async function replaceFileContent(
  userId: string,
  fileId: string,
  file: {
    mimeType: string;
    buffer: Buffer;
  },
) {
  const drive = await getDriveClient(userId);
  const { Readable } = await import("stream");
  const stream = Readable.from(file.buffer);

  const res = await drive.files.update({
    fileId,
    media: {
      mimeType: file.mimeType || "application/octet-stream",
      body: stream,
    },
    fields: "id, name, mimeType, modifiedTime, size, webViewLink",
    supportsAllDrives: true,
  });

  return res.data as drive_v3.Schema$File;
}

export async function uploadFileToFolder(
  userId: string,
  folderId: string,
  file: {
    name: string;
    mimeType: string;
    buffer: Buffer;
  },
) {
  const drive = await getDriveClient(userId);
  const { Readable } = await import("stream");
  const stream = Readable.from(file.buffer);

  const res = await drive.files.create({
    requestBody: {
      name: file.name,
      parents: [folderId],
    },
    media: {
      mimeType: file.mimeType || "application/octet-stream",
      body: stream,
    },
    fields: "id, name, mimeType, modifiedTime, size, webViewLink",
    supportsAllDrives: true,
  });

  return res.data as drive_v3.Schema$File;
}

export async function deleteDriveFile(userId: string, fileId: string) {
  const drive = await getDriveClient(userId);
  await drive.files.delete({
    fileId,
    supportsAllDrives: true,
  });
}
