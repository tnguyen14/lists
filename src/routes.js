const {
  getLists,
  getList,
  createList,
  updateList,
  updateListMeta,
  deleteList,
  getItems,
  getItem,
  createItem,
  updateItem,
  addItemsBulk,
  deleteItem,
} = require("./firestore");

const { isUserEditor, isUserSuperAdmin } = require("./authorization");

module.exports = async function (fastify) {
  function handleRequest(fn) {
    return async (request, reply) => {
      try {
        const response = await fn(request);
        reply.send(response);
      } catch (e) {
        console.error(e);
        reply.send(e);
      }
    };
  }

  // get all lists
  fastify.get(
    "/",
    handleRequest(async (request) => {
      const { user } = request;
      const { data } = await getLists(user);
      return data;
    })
  );

  // delete all lists of user
  fastify.delete(
    "/",
    handleRequest(async (request) => {
      const { user } = request;
      const { snapshot } = await getLists(user);
      await Promise.all(
        snapshot.docs.map(async (doc) => {
          await doc.ref.delete();
        })
      );
      return { success: true };
    })
  );

  // get current user's profile and permissions
  fastify.get(
    "/me",
    handleRequest(async (request) => {
      const { user } = request;
      return {
        id: user.sub,
        permissions: {
          isSuperAdmin: isUserSuperAdmin(user)
        }
      };
    })
  );

  const requiredParams = ["type", "name"];

  /*
   * Create list API payload
   * {
   *   type: <string>,
   *   name: <string>,
   *   editors: [],
   *   viewers: [],
   *   meta: {...}
   * }
   */

  fastify.post(
    "/",
    handleRequest(async (request) => {
      const { user, body } = request;
      for (const requiredParam of requiredParams) {
        if (!request.body[requiredParam]) {
          throw fastify.httpErrors.badRequest(`"${requiredParam}" is required`);
        }
      }
      const { type, name } = body;

      return await createList(user, type, name, body);
    })
  );

  // Update list API payload
  // {
  //   meta: {...stuff.to.update},
  //   admins: [all-admins],
  //   editors: [],
  //   viewers: [],
  // }
  fastify.patch(
    "/:type/:name",
    handleRequest(async (request) => {
      const { user, params, body } = request;
      const { type, name } = params;
      return await updateList(user, type, name, body);
    })
  );

  fastify.delete(
    "/:type/:name",
    handleRequest(async (request) => {
      const { user, params } = request;
      const { type, name } = params;

      return await deleteList(user, type, name);
    })
  );

  fastify.get(
    "/:type/:name",
    handleRequest(async (request) => {
      const { user, params } = request;
      const { type, name } = params;
      const { snapshot, data } = await getList(user, type, name);
      if (!snapshot.exists) {
        throw fastify.httpErrors.notFound();
      }
      if (!isUserEditor(user, data)) {
        throw fastify.httpErrors.unauthorized(
          "user is not authorized for list"
        );
      }
      return data;
    })
  );

  fastify.post(
    "/:type/:name",
    handleRequest(async (request) => {
      const { user, params } = request;
      const { type, name } = params;
      console.log(`deprecated - add items ${type} ${name}`);
      return await createItem(user, type, name, request.body);
    })
  );

  fastify.post(
    "/:type/:name/bulk",
    handleRequest(async (request) => {
      const { user, params } = request;
      const { type, name } = params;
      console.log(`deprecated - add bulk items ${type} ${name}`);
      return await addItemsBulk(user, type, name, request.body);
    })
  );

  fastify.get(
    "/:type/:name/meta",
    handleRequest(async (request) => {
      const { user, params } = request;
      const { type, name } = params;
      const { snapshot, data } = await getList(user, type, name);
      if (!snapshot.exists) {
        throw fastify.httpErrors.notFound();
      }
      if (!isUserEditor(user, data)) {
        throw fastify.httpErrors.unauthorized(
          "user is not authorized for list"
        );
      }
      return data.meta;
    })
  );

  fastify.patch(
    "/:type/:name/meta",
    handleRequest(async (request) => {
      const { user, params, body } = request;
      const { type, name } = params;
      return await updateListMeta(user, type, name, body);
    })
  );

  fastify.get(
    "/:type/:name/items",
    handleRequest(async (request) => {
      const { user, params, query } = request;
      const { type, name } = params;

      const { data } = await getItems(user, type, name, query);
      return data;
    })
  );

  fastify.get(
    "/:type/:name/items/:id",
    handleRequest(async (request) => {
      const { user, params } = request;
      const { type, name, id } = params;

      const { snapshot, data } = await getItem(user, type, name, id);
      if (!snapshot.exists) {
        throw fastify.httpErrors.notFound(`"${id}" is not found.`);
      }
      return data;
    })
  );

  fastify.post(
    "/:type/:name/items",
    handleRequest(async (request) => {
      const { user, params } = request;
      const { type, name } = params;
      return await createItem(user, type, name, request.body);
    })
  );

  fastify.post(
    "/:type/:name/items/bulk",
    handleRequest(async (request) => {
      const { user, params } = request;
      const { type, name } = params;
      return await addItemsBulk(user, type, name, request.body);
    })
  );

  fastify.patch(
    "/:type/:name/items/:id",
    handleRequest(async (request) => {
      const { user, params } = request;
      const { type, name, id } = params;

      return await updateItem(user, type, name, id, request.body);
    })
  );

  fastify.delete(
    "/:type/:name/items/:id",
    handleRequest(async (request) => {
      const { user, params } = request;
      const { type, name, id } = params;

      return await deleteItem(user, type, name, id);
    })
  );
};
