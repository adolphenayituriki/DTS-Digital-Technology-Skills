// Shared email normalisation and validation.
//
// The rules are shape rules only: one @, a legal local part, a dotted domain
// with a real TLD. An earlier version also rejected a "www." prefix and any
// local part ending in a domain-looking label, on the assumption that those
// were pasted URLs. Real applicants do have such addresses, so those two
// checks are gone - a person who typed it is the authority on it. A pasted URL
// is still caught, because "://" and a scheme prefix are never legal in an
// address.

export const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();

// Reasons a value is rejected, so callers can show something specific.
export const emailProblem = (value) => {
  const email = normalizeEmail(value);

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

  return null;
};

export const isValidEmail = (value) => emailProblem(value) === null;

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
