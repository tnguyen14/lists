require("dotenv").config();

const { getJson, postJson } = require("simple-fetch");
const jwt = require("jsonwebtoken");

const {
  deleteList,
  createList,
  updateList,
  addItemsBulk,
} = require("../lists");

const apiServer = "https://lists.cloud.tridnguyen.com";

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

async function migrateList({ type: listType, name: listName }) {
  try {
    const [list, items] = await Promise.all(
      [
        `${apiServer}/${listType}/${listName}`,
        `${apiServer}/${listType}/${listName}/items`,
      ].map((url) =>
        getJson(url, {
          headers: {
            Authorization: `Bearer ${apiToken}`,
          },
        })
      )
    );
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
  } catch (e) {
    if (e.response) {
      console.error(e.response);
    } else {
      console.error(e);
    }
  }
}

async function migrate() {
  const tokenResponse = await postJson(
    "https://tridnguyen.auth0.com/oauth/token",
    {
      client_id: process.env.SERVER_APP_AUTH0_CLIENT_ID,
      client_secret: process.env.SERVER_APP_AUTH0_CLIENT_SECRET,
      audience: "https://tridnguyen.auth0.com/api/v2/",
      grant_type: "client_credentials",
    }
  );
  const user = tokenResponse.access_token;
  listsToMigrate.map(migrateList);
}

if (require.main === module) {
  try {
    migrate();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
