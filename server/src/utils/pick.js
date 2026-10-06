// Copies only the named keys out of a request body, and only when the key is
// genuinely present. A missing key is left out of the result entirely, so
// Mongoose treats it as "do not touch this field" and a partial update works.
//
// The alternative - handing `req.body` straight to findByIdAndUpdate - lets a
// caller set any field in the schema, including the ones no UI ever sends and
// some of which are load-bearing elsewhere: the user account an application is
// attached to, the Drive file id its certificate is served from (that route is
// unauthenticated), or the createdAt that report ordering sorts by.
//
// Enumerating the writable fields per route also makes the editable surface of
// each resource readable in one place, which the raw-body version did not.
export const pick = (body, keys) => {
  const out = {};
  if (!body || typeof body !== "object") return out;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(body, key)) out[key] = body[key];
  }
  return out;
};

export default pick;