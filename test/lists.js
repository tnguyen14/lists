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
  t.tearDown(async () => {
    await server.inject({
      method: "DELETE",
      url: "/",
    });
    await server.close();
  });
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

  t.test("create a list", async (t) => {
    try {
      const resp = await server.inject({
        method: "POST",
        url: "/",
        payload: {
          type: "testType",
          name: "listName",
        },
      });
      t.deepEqual(resp.json(), { success: true });
      const get = await server.inject({
        method: "GET",
        url: "/testType/listName",
      });
      t.match(get.json(), { admins: ["testuser"] });
    } catch (e) {
      t.error(e);
    }
  });

  t.test("create a duplicate", async (t) => {
    try {
      const resp = await server.inject({
        method: "POST",
        url: "/",
        payload: {
          type: "testType",
          name: "listName",
        },
      });
      t.match(resp.json(), {
        statusCode: 409,
        error: "Conflict",
        message: /List "listName" of type "testType" already exists/,
      });
    } catch (e) {
      t.error(e);
    }
  });

  t.test("check getting a list by a different user");

  t.test("add item to list", async (t) => {
    try {
      const resp = await server.inject({
        method: "POST",
        url: "/testType/listName",
        payload: {
          id: "testItem",
          prop: "testProp",
        },
      });
      t.deepEqual(resp.json(), { success: true });
      const getList = await server.inject({
        method: "GET",
        url: "/testType/listName/items",
      });
      t.deepEqual(getList.json(), [{ id: "testItem", prop: "testProp" }]);
    } catch (e) {
      t.error(e);
    }
  });
  t.test("delete a list", async (t) => {
    try {
      const resp = await server.inject({
        method: "DELETE",
        url: "/testType/listName",
      });
      t.deepEqual(resp.json(), { success: true });
      const lists = await server.inject({
        method: "GET",
        url: "/",
      });
      t.deepEqual(lists.json(), []);
    } catch (e) {
      t.error(e);
    }
  });

  t.end();
});
