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

  // get all lists
  fastify.get(
    "/",
    handleRequest(async (request, user) => {
      const listsSnapshot = await listsRef
        .where("admins", "array-contains", user.sub)
        .get();
      return listsSnapshot.docs.map((listDoc) => listDoc.data());
    })
  );

  fastify.post(
    "/",
    handleRequest(async (request, user) => {
      for (const requiredParam of requiredParams) {
        if (!request.body[requiredParam]) {
          throw fastify.httpErrors.badRequest(`"${requiredParam}" is required`);
        }
      }
      const { type, name } = request.body;
      const listRef = listsRef.doc(`${type}!${name}`);
      const listSnapshot = await listRef.get();
      if (listSnapshot.exists) {
        throw fastify.httpErrors.conflict(
          `List "${name}" of type "${type}" already exists`
        );
      }
      await listRef.create({
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
      const listRef = listsRef.doc(`${type}!${name}`);
      // @TODO use firestore.deleteCollection to delete the items collection
      await listRef.delete();
      // this method will return {success: true} even if
      // the list does not exist
      return { success: true };
    })
  );
};
