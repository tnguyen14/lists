require("dotenv").config();
const test = require("tap").test;
const qs = require("qs");
const server = require("@tridnguyen/fastify-server")({
  shouldPerformJwtCheck: false,
});

server.register(require("../src/routes"));

server.addHook("preHandler", (request, reply, done) => {
  const user = (request.headers && request.headers.authorization) || "testuser";
  request.user = {
    sub: user,
  };
  done();
});

async function del(url, headers) {
  const resp = await server.inject({
    method: "DELETE",
    url,
    headers,
  });
  return resp.json();
}

async function get(url, query, headers) {
  const resp = await server.inject({
    method: "GET",
    url,
    query,
    headers,
  });
  return resp.json();
}

async function post(url, payload, headers) {
  const resp = await server.inject({
    method: "POST",
    url,
    payload,
    headers,
  });
  return resp.json();
}

async function patch(url, payload, headers) {
  const resp = await server.inject({
    method: "PATCH",
    url,
    payload,
    headers,
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
      t.same(resp, { success: true });
    } catch (e) {
      t.error(e);
    }
  });

  t.test("empty lists at beginning", async (t) => {
    try {
      const resp = await get("/");
      t.same(resp, [], "there should be no list at the beginning");
    } catch (e) {
      t.error(e);
    }
  });

  t.test("create a list", async (t) => {
    t.test("create list without being lists admin", async (t) => {
      try {
        const resp = await post(
          "/",
          {
            type: "testType",
            name: "listName2",
          },
          {
            authorization: "unauthorizedUser",
          }
        );
        t.match(resp, {
          statusCode: 401,
          error: "Unauthorized",
          message: /user is not authorized to create list/,
        });
      } catch (e) {
        t.error(e);
      }
    });

    t.test("expected good", async (t) => {
      try {
        const resp = await post("/", {
          type: "testType",
          name: "listName",
        });
        t.same(resp, { success: true });
        const publicResp = await post("/", {
          type: "testType",
          name: "publicList",
          viewers: ["public"],
        });
        t.same(publicResp, { success: true });
        const getPublic = await get("/testType/publicList");
        t.match(getPublic, {
          admins: ["testuser"],
          editors: [],
          viewers: ["public"],
        });
      } catch (e) {
        t.error(e);
      }
    });

    t.test("duplicate", async (t) => {
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
  });

  t.test("modify a list", async (t) => {
    t.test("update admins and meta", async (t) => {
      try {
        const resp = await patch("/testType/listName", {
          meta: {
            prop1: "value1",
            prop2: "value2",
          },
          admins: ["testuser", "testuser2"],
        });
        t.match(resp, { success: true });
      } catch (e) {
        t.error(e);
      }
    });
    t.test("update viewers/ editors", async (t) => {
      try {
        const resp = await patch("/testType/publicList", {
          viewers: ["public", "testuser2"],
          editors: ["editor"],
        });
        t.match(resp, { success: true });
      } catch (e) {
        t.error(e);
      }
    });
    t.test("not a list admin", async (t) => {
      try {
        const resp = await patch(
          "/testType/listName",
          {
            meta: {
              prop1: "differentValue",
            },
          },
          {
            authorization: "unauthorizedUser",
          }
        );
        t.match(resp, { statusCode: 401, error: "Unauthorized" });
      } catch (e) {
        t.error(e);
      }
    });
  });

  t.test("get list", async (t) => {
    t.test("expected good - updated admins and meta", async (t) => {
      try {
        const resp = await get("/testType/listName");
        t.match(resp, {
          meta: { prop1: "value1", prop2: "value2" },
          admins: ["testuser", "testuser2"],
          editors: [],
          viewers: [],
        });
      } catch (e) {
        t.error(e);
      }
    });
    t.test("expected good - updated viewers and editors", async (t) => {
      try {
        const resp = await get("/testType/publicList");
        t.match(resp, {
          editors: ["editor"],
          viewers: ["public", "testuser2"],
        });
      } catch (e) {
        t.error(e);
      }
    });
    t.test("doesn't exist", async (t) => {
      try {
        const resp = await get("/testType/unknownList");
        t.same(resp, {
          statusCode: 404,
          error: "Not Found",
          message: "Not Found",
        });
      } catch (e) {
        t.error(e);
      }
    });
    t.test("not an admin", async (t) => {
      try {
        const resp = await get("/testType/listName", undefined, {
          authorization: "unauthorizedUser",
        });
        t.match(resp, { statusCode: 401, error: "Unauthorized" });
      } catch (e) {
        t.error(e);
      }
    });
  });

  t.test("get list meta", async (t) => {
    t.test("expected good", async (t) => {
      try {
        const resp = await get("/testType/listName/meta");
        t.match(resp, {
          prop1: "value1",
          prop2: "value2",
        });
      } catch (e) {
        t.error(e);
      }
    });
    t.test("not an admin", async (t) => {
      try {
        const resp = await get("/testType/listName/meta", undefined, {
          authorization: "testUser2",
        });
        t.match(resp, { statusCode: 401, error: "Unauthorized" });
      } catch (e) {
        t.error(e);
      }
    });
  });

  t.test("update list meta", async (t) => {
    t.test("expected good", async (t) => {
      try {
        const resp = await patch("/testType/listName/meta", {
          prop1: "differentValue",
          newArray: ["one", "two"],
        });
        t.same(resp, { success: true });
        const getResp = await get("/testType/listName/meta");
        t.same(getResp, {
          prop1: "differentValue",
          prop2: "value2",
          newArray: ["one", "two"],
        });
      } catch (e) {
        t.error(e);
      }
    });
    t.test("not an admin", async (t) => {
      try {
        const resp = await patch(
          "/testType/listName/meta",
          {},
          {
            authorization: "testUser2",
          }
        );
        t.match(resp, { statusCode: 401, error: "Unauthorized" });
      } catch (e) {
        t.error(e);
      }
    });
  });

  t.test("add item to list", async (t) => {
    t.test("expected good", async (t) => {
      try {
        const resp = await post("/testType/listName/items", {
          id: "testItem",
          prop: "testProp",
        });
        t.same(resp, { success: true });
      } catch (e) {
        t.error(e);
      }
    });
    t.test("add in bulk", async (t) => {
      try {
        const resp = await post("/testType/listName/items/bulk", [
          {
            id: "bulkItem1",
            prop: "bulkProp1",
            search: "found",
          },
          {
            id: "bulkItem2",
            prop: "aProp",
            search: "found",
          },
          {
            id: "bulkItem3",
            prop: "zProp",
            search: "found",
          },
        ]);
        t.same(resp, { success: true });
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
        t.same(resp, {
          statusCode: 409,
          error: "Conflict",
          message: 'Item "testItem" already exists',
        });
      } catch (e) {
        t.error(e);
      }
    });
    t.test("not an editor", async (t) => {
      try {
        const resp = await post(
          "/testType/listName",
          {
            id: "testItem",
            prop: "testProp",
          },
          {
            authorization: "unauthorizedUser",
          }
        );
        t.match(resp, { statusCode: 401, error: "Unauthorized" });
      } catch (e) {
        t.error(e);
      }
    });
    t.test("editor, not admin", async (t) => {
      try {
        const resp = await post(
          "/testType/publicList",
          {
            id: "testItem",
            prop: "testProp",
          },
          {
            authorization: "editor",
          }
        );
        t.same(resp, { success: true });
      } catch (e) {
        t.error(e);
      }
    });
  });

  t.test("get items from list", async (t) => {
    t.test("expected good", async (t) => {
      try {
        const resp = await get("/testType/listName/items");
        t.equal(resp.length, 4);
        t.ok(resp.some((item) => item.id == "testItem"));
      } catch (e) {
        t.error(e);
      }
    });

    t.test("get with limit", async (t) => {
      try {
        const resp = await get("/testType/listName/items", {
          limit: 2,
        });
        t.equal(resp.length, 2);
      } catch (e) {
        t.error(e);
      }
    });

    t.test("get with orderBy", async (t) => {
      try {
        const resp = await get("/testType/listName/items", {
          orderBy: "prop",
          order: "desc",
        });
        t.match(resp, [{ id: "bulkItem3", prop: "zProp" }]);
      } catch (e) {
        t.error(e);
      }
    });

    t.test("get with where query", async (t) => {
      try {
        const resp = await get(
          `/testType/listName/items?${qs.stringify({
            where: [
              {
                field: "search",
                op: "==",
                value: "found",
              },
            ],
          })}`
        );
        t.equal(resp.length, 3);
      } catch (e) {
        t.error(e);
      }
    });
    t.test("list doesn't exist", async (t) => {
      try {
        const resp = await get("/test/unknown/items");
        t.same(resp, {
          statusCode: 404,
          error: "Not Found",
          message: "Not Found",
        });
      } catch (e) {
        t.error(e);
      }
    });

    t.test("not a viewer", async (t) => {
      try {
        const resp = await get("/testType/listName/items", undefined, {
          authorization: "unauthorizedUser",
        });
        t.match(resp, { statusCode: 401, error: "Unauthorized" });
      } catch (e) {
        t.error(e);
      }
    });

    t.test("not a viewer - public list", async (t) => {
      try {
        const resp = await get("/testType/publicList/items", undefined, {
          authorization: "unauthorizedUser",
        });
        t.same(resp, [{ id: "testItem", prop: "testProp" }]);
      } catch (e) {
        t.error(e);
      }
    });
  });

  t.test("retrieve item from list", async (t) => {
    t.test("expected good", async (t) => {
      try {
        const resp = await get("/testType/listName/items/testItem");
        t.same(resp, {
          id: "testItem",
          prop: "testProp",
        });
      } catch (e) {
        t.error(e);
      }
    });
    t.test("not a viewer", async (t) => {
      try {
        const resp = await get("/testType/listName/items/testItem", undefined, {
          authorization: "unauthorizedUser",
        });
        t.match(resp, { statusCode: 401, error: "Unauthorized" });
      } catch (e) {
        t.error(e);
      }
    });

    t.test("not a viewer - public list", async (t) => {
      try {
        const resp = await get(
          "/testType/publicList/items/testItem",
          undefined,
          {
            authorization: "unauthorizedUser",
          }
        );
        t.same(resp, { id: "testItem", prop: "testProp" });
      } catch (e) {
        t.error(e);
      }
    });
  });

  t.test("update item", async (t) => {
    t.test("expected good", async (t) => {
      try {
        const resp = await patch("/testType/listName/items/testItem", {
          prop: "testProp2",
          newProp: "anotherProp",
        });
        t.same(resp, { success: true });
        const getResp = await get("/testType/listName/items/testItem");
        t.same(getResp, {
          id: "testItem",
          prop: "testProp2",
          newProp: "anotherProp",
        });
      } catch (e) {
        t.error(e);
      }
    });
    t.test("not an editor", async (t) => {
      try {
        const resp = await patch(
          "/testType/publicList/items/testItem",
          {
            prop: "testProp2",
            newProp: "anotherProp",
          },
          {
            authorization: "unauthorizedUser",
          }
        );
        t.match(resp, { statusCode: 401, error: "Unauthorized" });
      } catch (e) {
        t.error(e);
      }
    });
    t.test("editor, not admin", async (t) => {
      try {
        const resp = await patch(
          "/testType/publicList/items/testItem",
          {
            prop: "testProp2",
            newProp: "anotherProp",
          },
          {
            authorization: "editor",
          }
        );
        t.same(resp, { success: true });
      } catch (e) {
        t.error(e);
      }
    });
  });

  t.test("delete item", async (t) => {
    t.test("expected good", async (t) => {
      try {
        const resp = await del("/testType/listName/items/testItem");
        t.same(resp, { success: true });

        const getResp = await get("/testType/listName/items/testItem");
        t.same(getResp, {
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
        t.same(resp, {
          statusCode: 404,
          error: "Not Found",
          message: '"testItem2" is not found.',
        });
      } catch (e) {
        t.error(e);
      }
    });
    t.test("not an editor", async (t) => {
      try {
        const resp = await del("/testType/publicList/items/testItem", {
          authorization: "unauthorizedUser",
        });
        t.match(resp, { statusCode: 401, error: "Unauthorized" });
      } catch (e) {
        t.error(e);
      }
    });
    t.test("editor, not admin", async (t) => {
      try {
        const resp = await del("/testType/publicList/items/testItem", {
          authorization: "editor",
        });
        t.same(resp, { success: true });
      } catch (e) {
        t.error(e);
      }
    });
  });

  t.test("delete a list", async (t) => {
    t.test("list not found", async (t) => {
      try {
        const resp = await del("/testType/listNam");
        t.same(resp, {
          statusCode: 404,
          error: "Not Found",
          message: '"listNam" is not found.',
        });
      } catch (e) {
        t.error(e);
      }
    });
    t.test("not a list admin", async (t) => {
      try {
        const resp = await del("/testType/listName", {
          authorization: "unauthorizedUser",
        });
        t.match(resp, { statusCode: 401, error: "Unauthorized" });
      } catch (e) {
        t.error(e);
      }
    });
    t.test("expected good", async (t) => {
      try {
        const resp = await del("/testType/listName");
        t.same(resp, { success: true });
        const publicResp = await del("/testType/publicList");
        t.same(publicResp, { success: true });
        const getResp = await get("/");
        t.same(getResp, []);
      } catch (e) {
        t.error(e);
      }
    });
  });

  t.end();
});
