/* eslint-disable camelcase */
/**
 * Serializes a creator card document for creation/deletion responses.
 * Includes access_code — used by POST and DELETE endpoints.
 *
 * @param {Object} doc - Plain JS object from repository (lean query result or ._doc)
 * @returns {Object}
 */
function serializeCard(doc) {
  if (!doc) return doc;
  const plain = JSON.parse(JSON.stringify(doc));
  const { _id, __v, ...rest } = plain;
  return { id: _id, ...rest };
}

/**
 * Serializes a creator card document for retrieval responses.
 * Omits access_code entirely — used by GET endpoint.
 *
 * @param {Object} doc - Plain JS object from repository (lean query result or ._doc)
 * @returns {Object}
 */
function serializeCardPublic(doc) {
  if (!doc) return doc;
  const plain = JSON.parse(JSON.stringify(doc));
  // eslint-disable-next-line no-unused-vars
  const { _id, __v, access_code, ...rest } = plain;
  return { id: _id, ...rest };
}

module.exports = { serializeCard, serializeCardPublic };
