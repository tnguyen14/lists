const firestore = require("@tridnguyen/firestore");

const listsRef = firestore.collection("lists");

const {
  getLists,
  getList,
  createList,
  updateList,
  deleteList,
  getItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
} = require("./lists");

module.exports = async function (fastify, opts) {
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
      return data;
    })
  );

  fastify.post(
    "/:type/:name",
    handleRequest(async (request) => {
      const { user, params } = request;
      const { type, name } = params;
      return await createItem(user, type, name, request.body);
    })
  );

  fastify.get(
    "/:type/:name/items",
    handleRequest(async (request) => {
      const { user, params } = request;
      const { type, name } = params;

      const { data } = await getItems(user, type, name);
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