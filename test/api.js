require("dotenv").config();
const test = require("tap").test;
const server = require("@tridnguyen/fastify-server")({
  shouldPerformJwtCheck: false,
});

server.register(require("../routes"));

server.addHook("preHandler", (request, reply, done) => {
  const user = (request.body && request.body.fakeUser) || "testuser";
  request.user = {
    sub: user,
  };
  done();
});

async function del(url) {
  const resp = await server.inject({
    method: "DELETE",
    url,
  });
  return resp.json();
}

async function get(url) {
  const resp = await server.inject({
    method: "GET",
    url,
  });
  return resp.json();
}

async function post(url, payload) {
  const resp = await server.inject({
    method: "POST",
    url,
    payload,
  });
  return resp.json();
}

async function patch(url, payload) {
  const resp = await server.inject({
    method: "PATCH",
    url,
    payload,
  });
  return resp.json();
}

test("lists", (t) => {
  t.tearDown(async () => {
    await del("/");
    await server.close();
  });
  t.test("clean up any existing list", async (t) => {
    try {
      const resp = await del("/");
      t.deepEqual(resp, { success: true });
    } catch (e) {
      t.error(e);
    }
  });

  t.test("empty lists at beginning", async (t) => {
    try {
      const resp = await get("/");
      t.deepEqual(resp, [], "there should be no list at the beginning");
    } catch (e) {
      t.error(e);
    }
  });

  t.test("get list that doesn't exist", async (t) => {
    try {
      const resp = await get("/testType/unknownList");
      t.deepEqual(resp, {
        statusCode: 404,
        error: "Not Found",
        message: "Not Found",
      });
    } catch (e) {
      t.error(e);
    }
  });

  t.test("get items from list that doesn't exist", async (t) => {
    try {
      const resp = await get("/test/unknown/items");
      t.deepEqual(resp, {
        statusCode: 404,
        error: "Not Found",
        message: "Not Found",
      });
    } catch (e) {
      t.error(e);
    }
  });

  t.test("create a list", async (t) => {
    try {
      const resp = await post("/", {
        type: "testType",
        name: "listName",
      });
      t.deepEqual(resp, { success: true });
      const getResp = await get("/testType/listName");
      console.log(getResp);
      t.match(getResp, { admins: ["testuser"] });
    } catch (e) {
      t.error(e);
    }
  });

  t.test("create list without being lists admin", async (t) => {
    try {
      const resp = await post("/", {
        type: "testType",
        name: "listName2",
        fakeUser: "unauthorizedUser",
      });
      t.match(resp, {
        statusCode: 401,
        error: "Unauthorized",
        message: /user is not authorized to create list/,
      });
    } catch (e) {
      t.error(e);
    }
  });

  t.test("create a duplicate", async (t) => {
    try {
      const resp = await post("/", {
        type: "testType",
        name: "listName",
      });
      t.match(resp, {
        statusCode: 409,
        error: "Conflict",
        message: /List "listName" of type "testType" already exists/,
      });
    } catch (e) {
      t.error(e);
    }
  });

  t.test("modify a list", async (t) => {
    t.test("update list", async (t) => {
      try {
        const resp = await patch("/testType/listName", {
          meta: {
            foo: "bar",
          },
          admins: ["testuser", "testuser2"],
        });
        t.match(resp, { success: true });
        const getResp = await get("/testType/listName");
        t.match(getResp, {
          admins: ["testuser", "testuser2"],
          meta: { foo: "bar" },
        });
      } catch (e) {
        t.error(e);
      }
    });
  });

  t.test("check getting a list by a different user", async (t) => {
    try {
      // the list testType!preExisting is already created
      // and owned by a different user
      const resp = await get("/testType/preExisting");
      t.match(resp, { statusCode: 401, error: "Unauthorized" });
    } catch (e) {
      t.error(e);
    }
  });

  t.test("add item to list", async (t) => {
    t.test("expected good", async (t) => {
      try {
        const resp = await post("/testType/listName", {
          id: "testItem",
          prop: "testProp",
        });
        t.deepEqual(resp, { success: true });
        const getResp = await get("/testType/listName/items");
        t.deepEqual(getResp, [{ id: "testItem", prop: "testProp" }]);
      } catch (e) {
        t.error(e);
      }
    });
    t.test("missing id", async (t) => {
      try {
        const resp = await post("/testType/listName", {
          prop: "testProp",
        });
        t.match(resp, { statusCode: 400, error: "Bad Request" });
      } catch (e) {
        t.error(e);
      }
    });
    t.test("existing item", async (t) => {
      try {
        const resp = await post("/testType/listName", {
          id: "testItem",
          prop: "testProp",
        });
        t.deepEqual(resp, {
          statusCode: 409,
          error: "Conflict",
          message: 'Item "testItem" already exists',
        });
      } catch (e) {
        t.error(e);
      }
    });
  });

  t.test("retrieve item from list", async (t) => {
    try {
      const resp = await get("/testType/listName/items/testItem");
      t.deepEqual(resp, {
        id: "testItem",
        prop: "testProp",
      });
    } catch (e) {
      t.error(e);
    }
  });

  t.test("update item", async (t) => {
    t.test("expected good", async (t) => {
      try {
        const resp = await patch("/testType/listName/items/testItem", {
          prop: "testProp2",
          newProp: "anotherProp",
        });
        t.deepEqual(resp, { success: true });
        const getResp = await get("/testType/listName/items/testItem");
        t.deepEqual(getResp, {
          id: "testItem",
          prop: "testProp2",
          newProp: "anotherProp",
        });
      } catch (e) {
        t.error(e);
      }
    });
  });

  t.test("delete item", async (t) => {
    t.test("expected good", async (t) => {
      try {
        const resp = await del("/testType/listName/items/testItem");
        t.deepEqual(resp, { success: true });

        const getResp = await get("/testType/listName/items/testItem");
        t.deepEqual(getResp, {
          statusCode: 404,
          error: "Not Found",
          message: '"testItem" is not found.',
        });
      } catch (e) {
        t.error(e);
      }
    });
    t.test("not found item", async (t) => {
      try {
        const resp = await del("/testType/listName/items/testItem2");
        t.deepEqual(resp, {
          statusCode: 404,
          error: "Not Found",
          message: '"testItem2" is not found.',
        });
      } catch (e) {
        t.error(e);
      }
    });
  });

  t.test("delete a list", async (t) => {
    t.test("list not found", async (t) => {
      try {
        const resp = await del("/testType/listNam");
        t.deepEqual(resp, {
          statusCode: 404,
          error: "Not Found",
          message: '"listNam" is not found.',
        });
      } catch (e) {
        t.error(e);
      }
    });
    t.test("expected good", async (t) => {
      try {
        const resp = await del("/testType/listName");
        t.deepEqual(resp, { success: true });
        const getResp = await get("/");
        t.deepEqual(getResp, []);
      } catch (e) {
        t.error(e);
      }
    });
  });

  t.end();
});
