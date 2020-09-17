require("dotenv").config();

const { getJson } = require("simple-fetch");
const jwt = require("jsonwebtoken");

const {
  deleteList,
  createList,
  updateList,
  addItemsBulk,
} = require("../lists");

const apiToken = process.env.API_TOKEN;
const apiServer = process.env.MIGRATE_FROM_API_SERVER;

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
];

const user = jwt.decode(apiToken);

async function migrateList({ type: listType, name: listName }) {
  const [list, items] = await Promise.all([
    getJson(`${apiServer}/${listType}/${listName}`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    }),
    getJson(`${apiServer}/${listType}/${listName}/items`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    }),
  ]);
  const listId = `${listType}!${listName}`;
  console.log(`Migrating list ${listId}`);
  // list might not exist - wrap in try/catch
  try {
    console.log(`Deleting old list ${listId}`);
    await deleteList(user, listType, listName);
  } catch (e) {
    console.error(e);
  }
  console.log(`Creating new list ${listId}`);
  await createList(user, listType, listName);
  console.log(`Updating new list ${listId} with metadata`);
  await updateList(user, listType, listName, list);
  console.log(`Adding ${items.length} items to list ${listId}`);
  await addItemsBulk(user, listType, listName, items);
}

try {
  listsToMigrate.map(migrateList);
} catch (e) {
  console.error(e);
}
