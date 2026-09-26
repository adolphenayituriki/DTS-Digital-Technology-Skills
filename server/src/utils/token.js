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

const resolveSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  // Never let a production deploy run on a secret that is public in git.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET is not set. Refusing to sign or verify tokens in production."
    );
  }
  return DEV_FALLBACK;
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
