// Shared email normalisation and validation.
//
// The previous check was /^[^\s@]+@[^\s@]+\.[^\s@]+$/, which accepts anything
// with an "@" and a dot somewhere after it. That let a pasted URL fragment
// through: "www.nayituriki.com@gmail.com" has a perfectly legal looking local
// part to that regex, so it was stored as a real student email address.
//
// The rules below are deliberately stricter about the local part, which is
// where that class of typo lives.

export const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();

// Reasons a value is rejected, so callers can show something specific.
export const emailProblem = (value) => {
  const email = normalizeEmail(value);

  if (!email) return "Email address is required";
  if (/\s/.test(email)) return "Email address cannot contain spaces";
  if (email.includes("://") || /^(https?|ftp):/i.test(email)) {
    return "That looks like a web address, not an email. Enter just the email, e.g. name@gmail.com";
  }
  if (/^www\./i.test(email)) {
    return "Remove the leading www. from the email address";
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
  // A dotted local part is legal, but "something.com@" almost always means a
  // website was typed where an email was expected.
  if (/\.(com|net|org|edu|gov|co|ac|io|dev|app|info|biz|me|rw)$/i.test(local)) {
    return `It looks like a website was entered before the @. Did you mean ${local.replace(/\.[^.]+$/, "")}@${domain}?`;
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
// Strips a URL scheme and a leading www., then removes a domain-looking label
// from the local part. Returns null when nothing sensible can be salvaged, so
// the caller can leave the record alone rather than guess.
export const repairEmail = (value) => {
  let email = normalizeEmail(value).replace(/^[a-z]+:\/\//i, "").replace(/^www\./i, "");

  const at = email.indexOf("@");
  if (at === -1) return null;

  let local = email.slice(0, at);
  const domain = email.slice(at + 1);

  const trailing = local.match(/\.(com|net|org|edu|gov|co|ac|io|dev|app|info|biz|me|rw)$/i);
  if (trailing) local = local.slice(0, -trailing[0].length);

  if (!local || !domain) return null;

  const candidate = `${local}@${domain}`;
  return isValidEmail(candidate) ? candidate : null;
};
