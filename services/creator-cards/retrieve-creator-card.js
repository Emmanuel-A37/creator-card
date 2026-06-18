const validator = require('@app-core/validator');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const { appLogger } = require('@app-core/logger');
const { CreatorCardMessages } = require('@app/messages');
const CreatorCard = require('@app/repository/creator-cards');
const { serializeCardPublic } = require('./helpers/serialize-card');

// ---------------------------------------------------------------------------
// VSL Spec
// ---------------------------------------------------------------------------
const spec = `root { // Creator card retrieval
  slug string<trim>
  access_code? string<trim>
}`;

const parsedSpec = validator.parse(spec);

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

async function retrieveCreatorCard(serviceData) {
  const data = validator.validate(serviceData, parsedSpec);
  let result;

  try {
    // Step 1: Find card by slug where deleted is null (active records only)
    // A deleted card has deleted = Unix ms, so { deleted: null } returns null for it → NF01
    const card = await CreatorCard.findOne({ query: { slug: data.slug, deleted: null } });

    if (!card) {
      throwAppError(CreatorCardMessages.CARD_NOT_FOUND, ERROR_CODE.NOTFOUND, {
        context: { code: 'NF01' },
      });
    }

    // Step 2: Draft cards are treated as non-existent to the public
    if (card.status === 'draft') {
      throwAppError(CreatorCardMessages.CARD_IS_DRAFT, ERROR_CODE.NOTFOUND, {
        context: { code: 'NF02' },
      });
    }

    // Step 3: Private card — access_code query param must be present
    if (card.access_type === 'private' && !data.access_code) {
      throwAppError(CreatorCardMessages.ACCESS_CODE_REQUIRED, ERROR_CODE.INVLDREQ, {
        context: { code: 'AC03' },
      });
    }

    // Step 4: Private card — access_code must match stored value exactly
    if (card.access_type === 'private' && data.access_code !== card.access_code) {
      throwAppError(CreatorCardMessages.INVALID_ACCESS_CODE, ERROR_CODE.INVLDREQ, {
        context: { code: 'AC04' },
      });
    }

    // access_code is omitted entirely from GET responses (not returned as null — absent)
    result = serializeCardPublic(card);
  } catch (error) {
    appLogger.errorX(error, 'retrieve-creator-card-error');
    throw error;
  }

  return result;
}

module.exports = retrieveCreatorCard;
