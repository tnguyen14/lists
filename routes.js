const firestore = require("@tridnguyen/firestore");

const listsRef = firestore.collection("lists");

const { getLists, getList, getItems, getItem } = require("./lists");

/*
 * example user
 *
{
  given_name: 'Tri D.',
  family_name: 'Nguyen',
  nickname: 'tringuyenduy',
  name: 'Tri D. Nguyen',
  picture: 'https://lh3.googleusercontent.com/a-/AOh14GiTfUMRmBg2yLYEhrBBjXRIJPT5UBP94QmWroXvJQ',
  locale: 'en',
  updated_at: '2020-07-19T16:27:14.736Z',
  email: 'tringuyenduy@gmail.com',
  email_verified: true,
  iss: 'https://tridnguyen.auth0.com/',
  sub: 'google-oauth2|102956012089794272878',
  aud: 'IxcfVZqCVF9b5FS2NVVnElOeBnoNG02Z',
  iat: 1595388637,
  exp: 1595475037,
  at_hash: 'ssDYjGXWsj-zGXr6tMgJ5A',
  nonce: 'w0b5xKhP0all8p0471MmV~YfztqpYQyw'
}
 */
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
   * list interface
   * {
   *   "type": <string>,
   *   "name": <string>,
   *   "admins": <array>,
   *   "read": "private" | "public"
   * }
   */

  fastify.post(
    "/",
    handleRequest(async (request) => {
      const { user } = request;
      for (const requiredParam of requiredParams) {
        if (!request.body[requiredParam]) {
          throw fastify.httpErrors.badRequest(`"${requiredParam}" is required`);
        }
      }
      const { type, name, read } = request.body;
      const { ref, data } = await getList(user, type, name);
      if (data) {
        throw fastify.httpErrors.conflict(
          `List "${name}" of type "${type}" already exists`
        );
      }
      await ref.create({
        type,
        name,
        admins: [user.sub],
        read: read || "private",
        meta: request.body.meta || {},
      });
      return { success: true };
    })
  );

  // update list meta
  // request.body = {
  //   meta: {...stuff.to.update}
  // }
  fastify.patch(
    "/:type/:name",
    handleRequest(async (request) => {
      const { user, params } = request;
      const { type, name } = params;
      const { ref, data } = await getList(user, type, name);
      if (!data) {
        throw fastify.httpErrors.notFound(`"${name}" is not found.`);
      }
      if (!data.admins.includes(user.sub)) {
        throw fastify.httpErrors.unauthorized(
          "user is not authorized to perform modification of list"
        );
      }
      const updatedList = {};
      if (request.body.meta) {
        updatedList.meta = request.body.meta;
      }
      if (request.body.admins) {
        updatedList.admins = request.body.admins;
      }
      await ref.set(updatedList, { merge: true });
      return { success: true };
    })
  );

  async function deleteList() {}
  fastify.delete(
    "/:type/:name",
    handleRequest(async (request) => {
      const { user, params } = request;
      const { type, name } = params;
      const { ref, data } = await getList(user, type, name);
      if (!data) {
        throw fastify.httpErrors.notFound(`"${name}" is not found.`);
      }
      if (!data.admins.includes(user.sub)) {
        throw fastify.httpErrors.unauthorized(
          "user is not authorized to perform deletion of list"
        );
      }
      await firestore.deleteCollection(`lists/${type}!${name}/items`);
      await ref.delete();
      return { success: true };
    })
  );

  fastify.get(
    "/:type/:name",
    handleRequest(async (request) => {
      const { user, params } = request;
      const { type, name } = params;
      const { ref, data } = await getList(user, type, name);
      if (!data) {
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
      const item = request.body;
      if (!item.id) {
        throw fastify.httpErrors.badRequest(`"item.id" is required`);
      }
      const { ref: itemRef, data: itemData } = await getItem(
        user,
        type,
        name,
        item.id
      );
      if (itemData) {
        throw fastify.httpErrors.conflict(`Item "${item.id}" already exists`);
      }
      await itemRef.create({
        ...item,
      });
      return { success: true };
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

      const { ref, data } = await getItem(user, type, name, id);
      if (!data) {
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

      const { ref, data } = await getItem(user, type, name, id);
      if (!data) {
        throw fastify.httpErrors.notFound(`"${id}" is not found.`);
      }
      await ref.set(
        {
          ...request.body,
        },
        { merge: true }
      );
      return { success: true };
    })
  );

  fastify.delete(
    "/:type/:name/items/:id",
    handleRequest(async (request) => {
      const { user, params } = request;
      const { type, name, id } = params;
      const { ref, data } = await getItem(user, type, name, id);
      if (!data) {
        throw fastify.httpErrors.notFound(`"${id}" is not found.`);
      }
      await ref.delete();
      return { success: true };
    })
  );
};
