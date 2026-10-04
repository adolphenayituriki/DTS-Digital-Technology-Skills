// One-time Google authorisation. Produces the refresh token the server uses to
// act as the DTS staff account, and writes it into server/.env.
//
// Run: npm run drive:auth --prefix server
//
// You need an OAuth client id first, from the same Google Cloud project that has
// the Drive API enabled:
//   APIs & Services -> Credentials -> Create Credentials -> OAuth client ID
//   Application type: Desktop app
//   Download the JSON, then put its client_id and client_secret in server/.env
//   as GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET.
//
// Why OAuth and not the service account already configured: a service account has
// a storage quota of 0, so Drive refuses every upload. Authorising as the staff
// account uses that account's real storage. See utils/googleDrive.js.
import fs from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, "../../.env");

dotenv.config({ path: ENV_PATH });

const clientId = (process.env.GOOGLE_OAUTH_CLIENT_ID || "").trim();
const clientSecret = (process.env.GOOGLE_OAUTH_CLIENT_SECRET || "").trim();

// A desktop-app client may omit the redirect_uri and Google will send the code to
// http://localhost, which fails to load a page but still puts the code in the
// address bar. Passing it explicitly keeps the consent screen's redirect list
// honest when one was configured.
const REDIRECT_URI = "http://localhost";

const ask = (question) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

const run = async () => {
  if (!clientId || !clientSecret) {
    console.error("Set these in server/.env first:");
    console.error("  GOOGLE_OAUTH_CLIENT_ID");
    console.error("  GOOGLE_OAUTH_CLIENT_SECRET");
    console.error("");
    console.error("Create them at Google Cloud -> APIs & Services -> Credentials ->");
    console.error("Create Credentials -> OAuth client ID -> Application type: Desktop app.");
    process.exit(1);
  }

  const url =
    "https://accounts.google.com/o/oauth2/v2/auth" +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    "&response_type=code" +
    `&scope=${encodeURIComponent("https://www.googleapis.com/auth/drive")}` +
    "&access_type=offline" + // without this there is no refresh token at all
    "&prompt=consent"; // force a fresh grant so a re-auth actually issues one

  console.log("Open this URL in a browser and sign in as the DTS Google account:\n");
  console.log(url);
  console.log("\nApprove the access, then paste the code Google puts in the address bar.");
  console.log("(The page will say the site cannot be reached - that is expected. The\n code is the whole `code=...` value at the end of the URL.)\n");

  const code = await ask("Paste the code here: ");
  if (!code) {
    console.error("No code entered - nothing was changed.");
    process.exit(1);
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.refresh_token) {
    console.error(`Token exchange failed (${response.status}):`);
    console.error(payload.error_description || payload.error || "no refresh_token returned");
    console.error("");
    console.error("If this says 'invalid_grant', the code was already used or expired.");
    console.error("Run the script again and paste a fresh code.");
    process.exit(1);
  }

  // Written in place rather than appended, so re-running replaces an expiring
  // token instead of accumulating duplicates for dotenv to pick up.
  const existing = fs.readFileSync(ENV_PATH, "utf8").split(/\r?\n/);
  const line = `GOOGLE_OAUTH_REFRESH_TOKEN=${payload.refresh_token}`;
  const index = existing.findIndex((l) => l.startsWith("GOOGLE_OAUTH_REFRESH_TOKEN="));
  if (index === -1) existing.push(line);
  else existing[index] = line;
  fs.writeFileSync(ENV_PATH, existing.join("\n"));

  const hours = payload.expires_in ? Math.round(payload.expires_in / 3600) : null;
  console.log(`\nRefresh token saved to server/.env${hours ? ` (first access token valid ${hours}h)` : ""}.`);
  console.log("Restart the server, then submit an Advanced application to confirm.");
  console.log("");
  console.log("While the consent screen is in 'Testing' status this token is revoked");
  console.log("after 7 days. Switch it to 'In production' to make it permanent.");
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});