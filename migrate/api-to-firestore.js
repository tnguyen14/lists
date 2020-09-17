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
const listType = process.env.LIST_TYPE;
const listName = process.env.LIST_NAME;

const user = jwt.decode(apiToken);

Promise.all([
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
])
  .then(async ([list, items]) => {
    console.log(`Migrating list ${listType}!${listName}`);
    console.log(list);
    // list might not exist - wrap in try/catch
    try {
      console.log("Deleting old list...");
      await deleteList(user, listType, listName);
    } catch (e) {
      console.error(e);
    }
    console.log("Creating new list...");
    await createList(user, listType, listName);
    console.log("updating new list with metadata...");
    await updateList(user, listType, listName, list);
    console.log(`adding ${items.length} items in bulk`);
    await addItemsBulk(user, listType, listName, items);
  })
  .then(null, (err) => {
    console.error(err);
    process.exit(1);
  });
