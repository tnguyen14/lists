require("dotenv").config();
const test = require("tap").test;
const server = require("@tridnguyen/fastify-server")({
  shouldPerformJwtCheck: false,
});

server.register(require("../lists"));

// is preHandler the right hook for this?
// https://www.fastify.io/docs/latest/Hooks
server.addHook("preHandler", (request, reply, done) => {
  request.user = {
    sub: "testuser",
  };
  done();
});

test("clean up any existing list", async (t) => {
  t.tearDown(async () => await server.close());

  try {
    const resp = await server.inject({
      method: "DELETE",
      url: "/",
    });
    t.deepEqual(resp.json(), { success: true });
  } catch (e) {
    t.error(e);
  }
});
