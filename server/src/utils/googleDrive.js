// Google Drive access for applicant certificates.
//
// No SDK: `googleapis` could not be installed here (the npm registry is not
// reachable from this machine) and it is a very large dependency for what is a
// handful of REST calls. Both supported flows are plain `fetch` plus Node's
// built-in crypto, matching how Brevo is already called in utils/mailer.js.
//
// Two ways in, tried in this order:
//
//   1. OAuth as a staff account (GOOGLE_OAUTH_*). The server acts as
//      digitaltechnologyskills1yahoo@gmail.com, so uploaded files are owned by
//      that account and count against its real Drive storage.
//   2. A service-account key (GOOGLE_SERVICE_ACCOUNT_*).
//
// Why OAuth is the default rather than the service account: a service account
// has a storage quota of exactly 0, so Drive refuses every upload with
// "Service Accounts do not have storage quota". Sharing the folder with it
// grants permission but not storage. Uploading as a real account sidesteps that
// entirely, which is what made it the only workable option on a personal Gmail
// (no Workspace, therefore no shared drive to hold the bytes).
//
// The service-account path is kept because it is the correct choice the moment
// this project is on Workspace and the folder moves to a shared drive - then
// switch by clearing the GOOGLE_OAUTH_* values, no code change.
//
// Refresh-token lifetime: while the OAuth consent screen is in "Testing"
// status Google expires the refresh token after 7 days, which the boot log
// warns about. Moving the consent screen to "In production" makes the refresh
// token indefinite and the warning stops. Nothing else has to change.
//
// Nothing here is required for the site to run: with no credentials configured,
// isDriveConfigured() returns false and uploads keep using local disk.
import crypto from "crypto";
import fs from "fs";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_API = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
// Full drive scope, not the narrower drive.file. Every certificate here is a file
// this app created, so drive.file would in principle be enough - but it also
// restricts which folders the app may target, and that behaviour could not be
// verified against a real token from this machine. drive.file is worth revisiting
// once an upload has been confirmed working end to end.
const SCOPE = "https://www.googleapis.com/auth/drive";

let cachedToken = null;

// ---------------------------------------------------------------- OAuth flow

const oauthEnv = () => ({
  clientId: (process.env.GOOGLE_OAUTH_CLIENT_ID || "").trim(),
  clientSecret: (process.env.GOOGLE_OAUTH_CLIENT_SECRET || "").trim(),
  refreshToken: (process.env.GOOGLE_OAUTH_REFRESH_TOKEN || "").trim(),
});

const oauthReady = () => {
  const { clientId, clientSecret, refreshToken } = oauthEnv();
  return Boolean(clientId && clientSecret && refreshToken);
};

// A refresh token does not expire on its own, but the *consent grant* behind it
// can be revoked, and while the consent screen is in Testing Google expires it
// after 7 days. Either way the server stops being able to mint tokens, so the
// failure has to be a readable message naming the fix rather than a raw 400.
const mintFromRefreshToken = async ({ clientId, clientSecret, refreshToken }) => {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    const reason = payload.error || "no access_token";
    const hint =
      reason === "invalid_grant"
        ? " - the refresh token was revoked or expired. Re-run: npm run drive:auth --prefix server"
        : "";
    throw new Error(`Google sign-in failed (${response.status}): ${reason}${hint}`);
  }
  cachedToken = {
    value: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in - 60) * 1000,
  };
  return cachedToken.value;
};

// ------------------------------------------------------- Service-account flow

let serviceCredentials = null;
let serviceCredentialsError = null;

// Read once. Re-reading per request would let a half-written .env or a rotated
// key file break every in-flight upload rather than one.
const readServiceCredentials = () => {
  if (serviceCredentials || serviceCredentialsError) return serviceCredentials;
  let raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "";
  const file = process.env.GOOGLE_SERVICE_ACCOUNT_FILE || "";
  if (!raw && file) {
    try {
      raw = fs.readFileSync(file, "utf8");
    } catch (error) {
      serviceCredentialsError = new Error(
        `GOOGLE_SERVICE_ACCOUNT_FILE could not be read (${file}): ${error.message}`
      );
      return null;
    }
  }
  if (!raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    // A downloaded key uses "private_key"; both spellings are accepted so the
    // value can be pasted from either the JSON file or a secret manager.
    const privateKey = (parsed.private_key || parsed.privateKey || "").replace(/\\n/g, "\n");
    const clientEmail = parsed.client_email || parsed.clientEmail || "";
    if (!privateKey || !clientEmail) throw new Error("missing client_email or private_key");
    serviceCredentials = { privateKey, clientEmail };
  } catch (error) {
    serviceCredentialsError = new Error(`GOOGLE_SERVICE_ACCOUNT_JSON is not valid: ${error.message}`);
  }
  return serviceCredentials;
};

const base64url = (input) =>
  Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const mintFromServiceAccount = async (creds) => {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: creds.clientEmail,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: issuedAt,
      exp: issuedAt + 3600,
    })
  );
  const signature = crypto
    .sign("RSA-SHA256", Buffer.from(`${header}.${claims}`), creds.privateKey)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${signature}`,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    throw new Error(
      `Google sign-in failed (${response.status}): ${payload.error_description || payload.error || "no access_token returned"}`
    );
  }
  cachedToken = {
    value: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in - 60) * 1000,
  };
  return cachedToken.value;
};

const accessToken = async () => {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  if (oauthReady()) return mintFromRefreshToken(oauthEnv());
  const creds = readServiceCredentials();
  if (creds) return mintFromServiceAccount(creds);
  throw new Error(serviceCredentialsError?.message || "Google Drive credentials are not configured");
};

// Drive rejects a request carrying a stale token with 401 even though the token
// is structurally fine, so the one retry re-mints and drops the cache.
const driveFetch = async (url, init = {}, retry = true) => {
  const token = await accessToken();
  const response = await fetch(url, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` },
  });
  if (response.status === 401 && retry) {
    cachedToken = null;
    return driveFetch(url, init, false);
  }
  return response;
};

// ------------------------------------------------------------ Configuration

export const DRIVE_FOLDER_ID = () => (process.env.GOOGLE_DRIVE_FOLDER_ID || "").trim();

export const authMode = () => {
  if (oauthReady()) return "oauth";
  if (readServiceCredentials()) return "service-account";
  return "none";
};

// True only when a credential and a folder id are both present: a credential
// without a folder id has nowhere to write, and a folder id without one cannot
// be reached.
export const isDriveConfigured = () => authMode() !== "none" && Boolean(DRIVE_FOLDER_ID());

// A partial OAuth setup is worth reporting separately from "not configured",
// because it looks like a working deployment that silently writes to local disk.
export const driveStatus = () => {
  const { clientId, clientSecret, refreshToken } = oauthEnv();
  const partial =
    [clientId, clientSecret, refreshToken].filter(Boolean).length > 0 &&
    !(clientId && clientSecret && refreshToken);
  return {
    configured: isDriveConfigured(),
    mode: authMode(),
    folderId: DRIVE_FOLDER_ID() || null,
    problem: serviceCredentialsError?.message || null,
    partialOAuth: partial,
  };
};

// ----------------------------------------------------------------- Drive I/O

// Uploads one buffer into the certificates folder and returns its Drive id.
//
// The name is built here rather than taken from the applicant: their filename is
// attacker-controlled and the folder is browsable by DTS staff, so what lands
// there has to be safe to open. The reg number prefix is the only part carrying
// meaning, sanitised first. The original name is kept in the database instead.
const safeFileName = (hint, fallbackName) => {
  const label = String(hint || "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 60);
  const stamp = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
  return `${label ? `${label}-` : ""}${fallbackName}-${stamp}`;
};

export const uploadToDrive = async ({ buffer, mimeType, originalName, hint }) => {
  const folderId = DRIVE_FOLDER_ID();
  if (!folderId) throw new Error("GOOGLE_DRIVE_FOLDER_ID is not set");

  const metadata = { name: safeFileName(hint, originalName), parents: [folderId], mimeType };
  // uploadType=multipart carries the metadata and the bytes in one request, so the
  // file is created in a single call rather than created-then-uploaded, which
  // would leave an empty placeholder behind if the second request failed.
  const boundary = `dts-${crypto.randomBytes(12).toString("hex")}`;
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`
    ),
    Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    buffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const response = await driveFetch(`${DRIVE_UPLOAD}?uploadType=multipart&fields=id,name,mimeType,size`, {
    method: "POST",
    headers: {
      "Content-Type": `multipart/related; boundary=${boundary}`,
      "Content-Length": String(body.length),
    },
    body,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.error?.message || response.statusText;
    // The quota wording is specific enough to be worth calling out: it is the one
    // failure that looks like a permissions problem but is not fixable by sharing.
    const hint = /storage quota/i.test(detail)
      ? " - the credential has 0 bytes of storage. Switch to OAuth (npm run drive:auth) or move the folder to a shared drive."
      : "";
    throw new Error(`Drive upload failed (${response.status}): ${detail}${hint}`);
  }
  return { id: payload.id, name: payload.name };
};

// Renames a stored file in place.
//
// Needed because the identifier that matters is not known at upload time: the
// certificate is uploaded while the application is being written, but the DTS
// registration number is assigned to the student profile a moment later. The
// file is uploaded under a temporary name and renamed once that number exists.
export const renameInDrive = async (fileId, name) => {
  const response = await driveFetch(`${DRIVE_API}/${encodeURIComponent(fileId)}?fields=id,name`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    const detail = (await response.json().catch(() => ({})))?.error?.message || response.statusText;
    throw new Error(`Drive rename failed (${response.status}): ${detail}`);
  }
  return response.json();
};

// Metadata is a separate call from the bytes because the caller needs the
// Content-Type before it starts writing to the response.
export const getDriveFileMeta = async (fileId) => {
  const response = await driveFetch(
    `${DRIVE_API}/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size`
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    const detail = (await response.json().catch(() => ({})))?.error?.message || response.statusText;
    throw new Error(`Drive lookup failed (${response.status}): ${detail}`);
  }
  return response.json();
};

// The body is handed straight to Express without being buffered, so a large PDF
// does not sit in this process's memory.
export const downloadFromDrive = async (fileId) => {
  const response = await driveFetch(`${DRIVE_API}/${encodeURIComponent(fileId)}?alt=media`);
  if (response.status === 404) return null;
  if (!response.ok) {
    const detail = (await response.json().catch(() => ({})))?.error?.message || response.statusText;
    throw new Error(`Drive download failed (${response.status}): ${detail}`);
  }
  return response.body;
};

export const deleteFromDrive = async (fileId) => {
  const response = await driveFetch(`${DRIVE_API}/${encodeURIComponent(fileId)}`, { method: "DELETE" });
  if (response.status === 404) return false;
  if (!response.ok) {
    const detail = (await response.json().catch(() => ({})))?.error?.message || response.statusText;
    throw new Error(`Drive delete failed (${response.status}): ${detail}`);
  }
  return true;
};

// Reported once at boot. A misconfigured Drive must not take the server down at
// import time, and an upload that fails later surfaces its own error.
export const logDriveStatus = () => {
  const status = driveStatus();
  if (!status.configured) {
    if (status.partialOAuth) {
      console.warn("[drive] GOOGLE_OAUTH_* is only partly set - certificates are on local disk.");
      console.warn("[drive] Finish with: npm run drive:auth --prefix server");
    } else if (status.problem) {
      console.warn(`[drive] ${status.problem}`);
      console.warn("[drive] Falling back to local disk for certificates.");
    } else {
      console.log("[drive] Not configured - certificates are stored on local disk.");
    }
    return;
  }
  console.log(`[drive] Certificates go to Drive folder ${status.folderId} (${status.mode})`);
  if (status.mode === "oauth") {
    // Not an error: the 7-day Testing-mode expiry is expected until the consent
    // screen is switched to In production, and it is the single most likely
    // thing to be forgotten.
    console.warn(
      "[drive] OAuth refresh tokens expire after 7 days while the consent screen is in Testing status."
    );
    console.warn("[drive] Set the consent screen to 'In production' to remove that weekly re-auth.");
  }
  if (status.mode === "service-account") {
    console.warn(
      "[drive] Service accounts have 0 bytes of storage quota; uploads will fail unless this folder is on a shared drive."
    );
  }
};