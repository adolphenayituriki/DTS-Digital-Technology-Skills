// Mirror of the server's email rules in server/src/utils/email.js.
//
// This exists to give immediate feedback in the browser; the server remains the
// authority and re-checks everything. Keep the two in sync when changing rules.
//
// `emailProblem(value, { requireGmail: true })` is the public application rule:
// the address must end in @gmail.com, while anything before the @ is taken as
// typed - so `www.nayituriki.com@gmail.com` is valid. Accounts and staff keep
// the looser shape-only rule so an existing address on another domain can
// still be saved.

export const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();

export const APPLICATION_EMAIL_DOMAINS = ['gmail.com'];

export const GMAIL_EXAMPLE = 'name@gmail.com';

export const emailProblem = (value, options = {}) => {
  const email = normalizeEmail(value);
  const requireGmail = options.requireGmail === true;

  if (!email) return 'Email address is required';
  if (/\s/.test(email)) return 'Email address cannot contain spaces';
  if (email.includes('://') || /^(https?|ftp):/i.test(email)) {
    return 'That looks like a web address, not an email. Enter just the email, e.g. name@gmail.com';
  }

  const parts = email.split('@');
  if (parts.length !== 2) return 'Enter an email address in the form name@example.com';

  const [local, domain] = parts;

  if (!local) return 'Enter the part before the @ sign';
  if (!/^[a-z0-9._%+-]+$/i.test(local)) {
    return 'The part before the @ sign contains an invalid character';
  }
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) {
    return 'The part before the @ sign is not a valid email name';
  }

  if (!domain) return 'Enter the domain after the @ sign';
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(domain)) return 'That email domain is not valid';
  if (!/\.[a-z]{2,}$/i.test(domain)) return 'That email domain needs a proper ending, e.g. .com';

  if (requireGmail && !APPLICATION_EMAIL_DOMAINS.includes(domain)) {
    return `Use your Gmail address so DTS can email you your registration number and PIN, e.g. ${GMAIL_EXAMPLE}`;
  }

  return null;
};

export const isValidEmail = (value, options = {}) => emailProblem(value, options) === null;
