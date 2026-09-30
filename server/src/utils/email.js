// Shared email normalisation and validation.
//
// Two levels of strictness, because DTS has two different jobs here:
//
//   1. Shape only (accounts, staff, anything already stored). One @, a legal
//      local part, a dotted domain with a real TLD. A leading "www." and a
//      dotted local part are both fine - real people use addresses like
//      www.nayituriki.com@gmail.com. A pasted URL is still caught, because
//      "://" and a scheme prefix are never legal in an address.
//
//   2. Shape + Gmail-only (`requireGmail`), used by the public application form.
//      DTS is a student-led programme where every applicant is issued a Gmail
//      address for their student profile, so an application has to be reachable
//      on one. Applying that rule only to new applications means an existing
//      account on another domain can still save its own profile.
//
// Note the local part is deliberately permissive, so `www.nayituriki.com` before
// the @ is accepted exactly as the person typed it.

export const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();

// The only mailbox domain DTS accepts on a new application. Overridable so a
// deployment can add another without a code change.
export const APPLICATION_EMAIL_DOMAINS = String(
  process.env.APPLICATION_EMAIL_DOMAINS || "gmail.com"
)
  .split(",")
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean);

export const GMAIL_EXAMPLE = "name@gmail.com";

// Reasons a value is rejected, so callers can show something specific.
// `options.requireGmail` tightens the domain check to APPLICATION_EMAIL_DOMAINS.
export const emailProblem = (value, options = {}) => {
  const email = normalizeEmail(value);
  const requireGmail = options.requireGmail === true;

  if (!email) return "Email address is required";
  if (/\s/.test(email)) return "Email address cannot contain spaces";
  if (email.includes("://") || /^(https?|ftp):/i.test(email)) {
    return "That looks like a web address, not an email. Enter just the email, e.g. name@gmail.com";
  }

  const parts = email.split("@");
  if (parts.length !== 2) {
    return "Enter an email address in the form name@example.com";
  }

  const [local, domain] = parts;

  if (!local) return "Enter the part before the @ sign";
  if (!/^[a-z0-9._%+-]+$/i.test(local)) {
    return "The part before the @ sign contains an invalid character";
  }
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) {
    return "The part before the @ sign is not a valid email name";
  }

  if (!domain) return "Enter the domain after the @ sign";
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(domain)) {
    return "That email domain is not valid";
  }
  if (!/\.[a-z]{2,}$/i.test(domain)) {
    return "That email domain needs a proper ending, e.g. .com";
  }

  if (requireGmail && !APPLICATION_EMAIL_DOMAINS.includes(domain)) {
    return `Use your Gmail address so DTS can email you your registration number and PIN, e.g. ${GMAIL_EXAMPLE}`;
  }

  return null;
};

export const isValidEmail = (value, options = {}) => emailProblem(value, options) === null;

// Best-effort repair for values already stored before the stricter rule existed.
// Strips a URL scheme only; a leading www. or a dotted local part is kept as-is
// because real applicants do have such addresses (e.g. www.name@host.com).
// Returns null when nothing sensible can be salvaged, so the caller can leave
// the record alone rather than guess.
export const repairEmail = (value) => {
  let email = normalizeEmail(value).replace(/^[a-z]+:\/\//i, "");

  const at = email.indexOf("@");
  if (at === -1) return null;

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);

  if (!local || !domain) return null;

  const candidate = `${local}@${domain}`;
  return isValidEmail(candidate) ? candidate : null;
};
