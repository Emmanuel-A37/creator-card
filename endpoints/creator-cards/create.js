const { createHandler } = require('@app-core/server');
const { appLogger } = require('@app-core/logger');
const createCreatorCardService = require('@app/services/creator-cards/create-creator-card');

module.exports = createHandler({
  path: '/creator-cards',
  method: 'post',
  middlewares: [],
  async onResponseEnd(rc, rs) {
    appLogger.info({ response: rs }, 'create-creator-card-completed');
  },
  async handler(rc, helpers) {
    const payload = rc.body;

    const responseData = await createCreatorCardService(payload);

    return {
      // Spec explicitly specifies 200 for creation, not 201
      status: helpers.http_statuses.HTTP_200_OK,
      message: 'Creator card created successfully',
      data: responseData,
    };
  },
});
