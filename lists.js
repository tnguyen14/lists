const firestore = require("@tridnguyen/firestore");

const listsRef = firestore.collection("lists");

const requiredParams = ["type", "name"];

module.exports = async function (fastify, opts) {
  function getUser(request) {
    const user = request.user;

    if (!user) {
      throw fastify.httpErrors.badRequest("No user supplied");
    }

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
    return user;
  }

  function handleRequest(fn) {
    return async (request, reply) => {
      try {
        const user = getUser(request, reply);
        const response = await fn(request, user);
        reply.send(response);
      } catch (e) {
        console.error(e);
        reply.send(e);
      }
    };
  }

  // get lists that belongs to a user
  async function getLists(user) {
    const ref = listsRef.where("admins", "array-contains", user);
    const snapshot = await ref.get();
    return {
      ref,
      snapshot,
      data: snapshot.docs.map((doc) => doc.data()),
    };
  }
  // get all lists
  fastify.get(
    "/",
    handleRequest(async (request, user) => {
      const { data } = await getLists(user.sub);
      return data;
    })
  );

  // delete all lists of user
  fastify.delete(
    "/",
    handleRequest(async (request, user) => {
      const { snapshot } = await getLists(user.sub);
      await Promise.all(
        snapshot.docs.map(async (doc) => {
          await doc.ref.delete();
        })
      );

      return { success: true };
    })
  );

  // if list does not exist, data would be `undefined`
  // if list is empty, data would be `{}`, or check `snapshot.exists`
  async function getList(type, name) {
    const listRef = listsRef.doc(`${type}!${name}`);
    const listSnapshot = await listRef.get();
    return {
      ref: listRef,
      snapshot: listSnapshot,
      data: listSnapshot.data(),
    };
  }

  fastify.post(
    "/",
    handleRequest(async (request, user) => {
      for (const requiredParam of requiredParams) {
        if (!request.body[requiredParam]) {
          throw fastify.httpErrors.badRequest(`"${requiredParam}" is required`);
        }
      }
      const { type, name } = request.body;
      const { ref, data } = await getList(type, name);
      if (data) {
        throw fastify.httpErrors.conflict(
          `List "${name}" of type "${type}" already exists`
        );
      }
      await ref.create({
        type,
        name,
        admins: [user.sub],
      });
      return { success: true };
    })
  );

  fastify.delete(
    "/:type/:name",
    handleRequest(async (request, user) => {
      const { type, name } = request.params;
      const { ref, data } = await getList(type, name);
      if (!data) {
        throw fastify.httpErrors.notFound(`"${name}" is not found.`);
      }
      if (!data.admins.includes(user.sub)) {
        throw fastify.httpErrors.unauthorized(
          "user is not authorized to perform deletion of list"
        );
      }
      // @TODO use firestore.deleteCollection to delete the items collection
      await ref.delete();
      return { success: true };
    })
  );

  fastify.get(
    "/:type/:name",
    handleRequest(async (request, user) => {
      const { type, name } = request.params;
      const { ref, data } = await getList(type, name);
      return data;
    })
  );
};
