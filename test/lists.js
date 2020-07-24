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

test("lists", (t) => {
  t.tearDown(async () => await server.close());
  t.test("clean up any existing list", async (t) => {
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

  t.test("empty lists at beginning", async (t) => {
    try {
      const resp = await server.inject({
        method: "GET",
        url: "/",
      });
      t.deepEqual(resp.json(), [], "there should be no list at the beginning");
    } catch (e) {
      t.error(e);
    }
  });
  t.end();
});
