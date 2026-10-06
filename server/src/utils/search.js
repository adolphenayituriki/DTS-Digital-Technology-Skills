// Shared search-filter builder.
//
// Every list route in this API filtered its own text box with a bare unanchored
// regex, e.g. new RegExp(term, "i"). That cannot use an index, so each keystroke
// cost a full collection scan. The escaping was also copy-pasted into three
// separate files, which is how unescaped user input usually ends up in a regex.
//
// Anchoring the pattern at the start is what makes it index-eligible: MongoDB
// turns /^abc/i into a bounded index scan over name / email / regNumber instead
// of reading every document. That is the difference between a search that stays
// fast as the student collection grows and one that does not.
//
// The tradeoff, stated plainly: this is prefix matching, so "mith" no longer
// finds "Smith". Typing the beginning of a name or a registration number is the
// overwhelmingly common case and is what these boxes are for. If mid-string
// search is genuinely required later, that needs a text index or a maintained
// n-gram field, not a regex - both are a larger change than this one.

export const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Escaped, anchored, case-insensitive. Anchoring is the part that matters.
export const prefixRegex = (term) => new RegExp(`^${escapeRegex(String(term).trim())}`, "i");

// Builds `{ $or: [...] }` across the named fields, or undefined when there is
// nothing to search for - so callers can spread it into a filter without having
// to check for an empty term first.
//
// Fields that are already lowercased at the schema level (email) still match
// case-insensitively, so passing them changes nothing for correctness.
export const searchFilter = (term, fields) => {
  const query = String(term ?? "").trim();
  if (!query || !fields?.length) return undefined;
  return { $or: fields.map((field) => ({ [field]: prefixRegex(query) })) };
};

export default searchFilter;