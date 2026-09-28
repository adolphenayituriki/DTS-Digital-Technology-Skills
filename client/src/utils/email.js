// Mirror of the server's email rules in server/src/utils/email.js.
//
// This exists to give immediate feedback in the browser; the server remains the
// authority and re-checks everything. Keep the two in sync when changing rules.
//
// Shape rules only. A "www." prefix or a dotted local part is accepted, because
// real applicants use addresses like that. A pasted URL is still rejected.

export const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();

export const emailProblem = (value) => {
  const email = normalizeEmail(value);

  if (!email) return "Email address is required";
  if (/\s/.test(email)) return "Email address cannot contain spaces";
  if (email.includes("://") || /^(https?|ftp):/i.test(email)) {
    return "That looks like a web address, not an email. Enter just the email, e.g. name@gmail.com";
  }

  const parts = email.split("@");
  if (parts.length !== 2) return "Enter an email address in the form name@example.com";

  const [local, domain] = parts;

  if (!local) return "Enter the part before the @ sign";
  if (!/^[a-z0-9._%+-]+$/i.test(local)) {
    return "The part before the @ sign contains an invalid character";
  }
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) {
    return "The part before the @ sign is not a valid email name";
  }

  if (!domain) return "Enter the domain after the @ sign";
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(domain)) return "That email domain is not valid";
  if (!/\.[a-z]{2,}$/i.test(domain)) return "That email domain needs a proper ending, e.g. .com";

  return null;
};

export const isValidEmail = (value) => emailProblem(value) === null;
