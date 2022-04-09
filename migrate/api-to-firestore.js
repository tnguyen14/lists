require("dotenv").config();

const { getJson } = require("simple-fetch");
const jwt = require("jsonwebtoken");
const qs = require("qs");

const {
  deleteList,
  createList,
  updateList,
  addItemsBulk,
} = require("../src/firestore");

const apiServer = process.env.API_SERVER;

const listsToMigrate = [
  {
    type: "checkbook",
    name: "business-checking",
  },
  {
    type: "checkbook",
    name: "personal-checking",
  },
  {
    type: "checkbook",
    name: "square-checking",
  },
  {
    type: "read",
    name: "tri",
  },
  {
    type: "ledge",
    name: "tri",
  },
  {
    type: "meta",
    name: "users"
  }
];

async function migrateItemsInChunks(token, listType, listName, before) {
  const chunkSize = 500;
  const user = jwt.decode(token);
  const listId = `${listType}!${listName}`;
  let query = {
    limit: chunkSize,
    orderBy: "id",
    order: "desc",
  };
  if (before) {
    query.where = [
      {
        field: "id",
        op: "<",
        value: before,
      },
    ];
  }
  const items = await getJson(
    `${apiServer}/${listType}/${listName}/items?${qs.stringify(query)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!items.length) {
    console.log(`No more items for ${listId}`);
    return;
  }
  console.log(
    `Adding ${items.length} items to list ${listId}, starting with ${
      items[0].id
    }, ending with ${items[items.length - 1].id}`
  );
  await addItemsBulk(user, listType, listName, items);

  // recursively call migrate, starting with the item before the last item
  await migrateItemsInChunks(
    token,
    listType,
    listName,
    items[items.length - 1].id
  );
}

async function migrateList(token, { type: listType, name: listName }) {
  const user = jwt.decode(token);
  const listId = `${listType}!${listName}`;
  try {
    const list = await getJson(`${apiServer}/${listType}/${listName}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log(`Migrating list ${listId}`);
    // list might not exist - wrap in try/catch
    try {
      console.log(`Deleting old list ${listId}`);
      await deleteList(user, listType, listName);
    } catch (e) {
      console.error(`Error deleting list ${listId}`);
      console.error(e);
    }
    try {
      console.log(`Creating new list ${listId}`);
      await createList(user, listType, listName);
    } catch (e) {
      console.error(`Error creating new list ${listId}`);
      throw e;
    }
    try {
      console.log(`Updating new list ${listId} with metadata`);
      await updateList(user, listType, listName, list);
    } catch (e) {
      console.error(`Error updating list metadata ${listId}`);
      throw e;
    }
    await migrateItemsInChunks(token, listType, listName);
  } catch (e) {
    console.error(`Error migrating list ${listId}`);
    console.error(e);
  }
}

module.exports = {
  migrateList,
};
