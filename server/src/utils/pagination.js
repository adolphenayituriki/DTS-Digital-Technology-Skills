// Page and size parsing for the list endpoints.
//
// Every list route in this API used to return its whole collection: the admin
// applications list, the student list, the finance ledger. That is fine at a few
// hundred rows and stops being fine at a few thousand - the server reads and
// serialises everything, ships it all, and the browser renders it all, on a
// request the operator triggers by opening a page.
//
// This parses `?page` and `?limit` into a Mongoose-friendly shape and keeps both
// inside sane bounds. A caller that sends neither gets the default page size
// rather than everything, which is the point: the safe behaviour is the default
// one.
//
// The caps matter as much as the parsing. An unclamped `limit` is a way for one
// request to ask for the entire database, so MAX_LIMIT is enforced regardless of
// what was asked for.

export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 200;

// `page` is 1-based in the query string and 0-based in Mongo's .skip().
export const parsePage = (query = {}) => {
  const raw = Number(query.page);
  const page = Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
  const rawLimit = Number(query.limit);
  const limit =
    Number.isFinite(rawLimit) && rawLimit >= 1
      ? Math.min(Math.floor(rawLimit), MAX_LIMIT)
      : DEFAULT_LIMIT;
  return { page, limit, skip: (page - 1) * limit };
};

// Applied to a Mongoose query: skip/limit plus the total, which the UI needs to
// render page controls.
export const paginate = async (query, { page, limit, skip }) => {
  const [items, total] = await Promise.all([
    query.skip(skip).limit(limit).lean(),
    query.model.countDocuments(query.getFilter()),
  ]);
  return {
    items,
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
};

// The response shape the client unpacks. `items` rather than a bare array so a
// page can tell "there is nothing more" from "this is the only page".
export const pageResponse = ({ items, total, page, limit, pages }, extra = {}) => ({
  items,
  total,
  page,
  limit,
  pages,
  ...extra,
});

export default parsePage;
