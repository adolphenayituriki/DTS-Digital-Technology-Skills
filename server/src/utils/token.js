import jwt from "jsonwebtoken";

// Single source of truth for the signing secret. Signing and verification MUST
// import from here, otherwise a deploy without JWT_SECRET set will sign tokens
// with the dev fallback while another module verifies with `undefined`, and
// every authenticated request from that token silently fails.
//
// IMPORTANT: the secret is resolved lazily on every call, never captured at
// module-evaluation time. ESM hoists imports, so a `dotenv.config()` further
// down the entry file runs *after* this module is already evaluated; reading
// process.env here would capture "undefined" and silently fall back to the dev
// secret while the real one sits in .env.
const DEV_FALLBACK = "dts-dev-secret-change-in-production-2026";

export const SECRET_MISSING_MESSAGE =
  "Server configuration error: JWT_SECRET is not set on the API. " +
  "Add it to the deployed service's environment variables and redeploy.";

const resolveSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  // Never let a production deploy run on a secret that is public in git.
  if (process.env.NODE_ENV === "production") {
    throw new Error(SECRET_MISSING_MESSAGE);
  }
  return DEV_FALLBACK;
};

// Called once at boot from index.js. A missing secret must not take the public
// site down, but every sign-in will fail, so shout about it in the deploy
// logs instead of letting it surface weeks later as a 500 in the browser.
export const logSecretStatus = () => {
  if (process.env.JWT_SECRET) {
    console.log("[auth] JWT_SECRET is set");
    return true;
  }
  console.warn(
    "[auth] " + SECRET_MISSING_MESSAGE +
    (process.env.NODE_ENV === "production"
      ? " Sign-in is currently broken."
      : " Falling back to the dev-only secret.")
  );
  return false;
};

export const USER_TOKEN_TTL = "7d";
export const STUDENT_TOKEN_TTL = "7d";

export const signUserToken = (id) =>
  jwt.sign({ id, kind: "user" }, resolveSecret(), { expiresIn: USER_TOKEN_TTL });

export const signStudentToken = (id) =>
  jwt.sign({ id, kind: "student" }, resolveSecret(), {
    expiresIn: STUDENT_TOKEN_TTL,
  });

export const verifyToken = (token) => jwt.verify(token, resolveSecret());

export const getJwtSecret = resolveSecret;
