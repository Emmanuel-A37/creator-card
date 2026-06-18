module.exports = {
  // POST /creator-cards — business rule errors
  SLUG_ALREADY_TAKEN: 'The provided slug is already in use',
  ACCESS_CODE_REQUIRED_FOR_PRIVATE: 'An access_code is required when access_type is private',
  ACCESS_CODE_NOT_ALLOWED_FOR_PUBLIC: 'access_code cannot be set when access_type is public',

  // GET /creator-cards/:slug — not found
  CARD_NOT_FOUND: 'No creator card found with the provided slug',
  CARD_IS_DRAFT: 'This creator card is not yet published',

  // GET /creator-cards/:slug — access control
  ACCESS_CODE_REQUIRED: 'This card is private. Provide an access_code as a query parameter',
  INVALID_ACCESS_CODE: 'The provided access_code is incorrect',
};
