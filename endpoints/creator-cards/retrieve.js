const { createHandler } = require('@app-core/server');
const { appLogger } = require('@app-core/logger');
const retrieveCreatorCardService = require('@app/services/creator-cards/retrieve-creator-card');

module.exports = createHandler({
  path: '/creator-cards/:slug',
  method: 'get',
  middlewares: [],
  async onResponseEnd(rc, rs) {
    appLogger.info({ response: rs }, 'retrieve-creator-card-completed');
  },
  async handler(rc, helpers) {
    const payload = {
      slug: rc.params.slug,
      // access_code is passed as a query parameter for private cards
      access_code: rc.query.access_code,
    };

    const responseData = await retrieveCreatorCardService(payload);

    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: 'Creator card retrieved successfully',
      data: responseData,
    };
  },
});
