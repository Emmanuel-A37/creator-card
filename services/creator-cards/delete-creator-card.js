const validator = require('@app-core/validator');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const { appLogger } = require('@app-core/logger');
const { CreatorCardMessages } = require('@app/messages');
const CreatorCard = require('@app/repository/creator-cards');
const { serializeCard } = require('./helpers/serialize-card');

// ---------------------------------------------------------------------------
// VSL Spec
// ---------------------------------------------------------------------------
const spec = `root { // Creator card deletion
  slug string<trim>
  creator_reference string<trim|length:20>
}`;

const parsedSpec = validator.parse(spec);

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

async function deleteCreatorCard(serviceData) {
  const data = validator.validate(serviceData, parsedSpec);
  let result;

  try {
    // Step 1: Find the active card — only records where deleted is null
    const card = await CreatorCard.findOne({ query: { slug: data.slug, deleted: null } });

    if (!card) {
      throwAppError(CreatorCardMessages.CARD_NOT_FOUND, ERROR_CODE.NOTFOUND, {
        context: { code: 'NF01' },
      });
    }

    // Step 2: Soft-delete by setting deleted = now, updated = now via updateOne
    // We use updateOne (not deleteOne) since we're managing deleted manually as null | timestamp
    // updateOne auto-sets updated = Date.now() as well
    const now = Date.now();
    await CreatorCard.updateOne({
      query: { slug: data.slug, deleted: null },
      updateValues: { deleted: now },
    });

    // Step 3: Build response from pre-fetched card + deletion timestamps
    // updateOne only returns { acknowledged, modifiedCount }, so we reconstruct from step 1
    // updateOne auto-sets updated, so we mirror that here
    const deletedCardData = {
      ...card,
      deleted: now,
      updated: now,
    };

    // Response uses creation serializer — access_code IS included (not omitted)
    result = serializeCard(deletedCardData);
  } catch (error) {
    appLogger.errorX(error, 'delete-creator-card-error');
    throw error;
  }

  return result;
}

module.exports = deleteCreatorCard;
