const firestore = require("@tridnguyen/firestore");

const listsRef = firestore.collection("lists");

function getUser(request, reply) {
  const user = request.user && request.user.sub;

  if (!user) {
    throw reply.badRequest("No user supplied");
  }

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

module.exports = async function (fastify, opts) {
  // get all lists
  fastify.get(
    "/",
    handleRequest(async (request, user) => {
      const listsSnapshot = await listsRef
        .where("admins", "array-contains", user)
        .get();
      return listsSnapshot.docs.map((listDoc) => listDoc.data());
    })
  );
};
