require("dotenv").config();
const AUTH_TOKEN = process.env.AUTH_TOKEN;
const ROBINHOOD_AUTH_TOKEN = process.env.ROBINHOOD_AUTH_TOKEN;
const API_SERVER = process.env.API_SERVER;
const ROBINHOOD_API_SERVER = "https://api.robinhood.com";
const ROBINHOOD_ACCOUNT_NUMBER = process.env.ROBINHOOD_ACCOUNT_NUMBER;
const { getJson, postJson, patchJson, deleteJson } = require("simple-fetch");
const jwt = require("jsonwebtoken");
const compact = require("lodash/compact");

async function migrateEntity(entity, url) {
  const requestUrl = url || `${ROBINHOOD_API_SERVER}/${entity}/`;
  // resp has properties: next, previous, results
  const resp = await getJson(requestUrl, {
    headers: {
      Authorization: `Bearer ${ROBINHOOD_AUTH_TOKEN}`,
    },
  });
  if (!resp.results.length) {
    console.log(`No results found for ${requestUrl}`);
    return;
  }
  console.log(`Migrating ${resp.results.length} items for ${entity}...`);
  // Currently, we know that positions don't have "id" property,
  // generalizing this logic for any entity without id,
  // assuming they have "url" property, and the last part of it
  // is the ID.
  // For example, position "url" is
  // https://api.robinhood.com/positions/5PY27745/306245dd-b82d-4d8d-bcc5-7c58e87cdd15/
  const items = resp.results.map((item) => {
    if (item.id) {
      return item;
    }
    const urlParts = compact(item.url.split("/"));
    item.id = urlParts.pop();
    return item;
  });

  const addResponse = await postJson(
    `${API_SERVER}/robinhood/${entity}/bulk`,
    items,
    {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
    }
  );

  if (!addResponse.success) {
    throw new Error(`Failed to add for ${entity} from ${requestUrl}`);
  }

  if (resp.next) {
    await migrateEntity(entity, resp.next);
  }
}

async function migrateList(listName) {
  const user = jwt.decode(AUTH_TOKEN);
  try {
    await deleteJson(`${API_SERVER}/robinhood/${listName}`, {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
    });
  } catch (e) {
    if (e.response.statusText != "Not Found") {
      throw e;
    }
  }

  await postJson(
    `${API_SERVER}`,
    {
      type: "robinhood",
      name: listName,
    },
    {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
    }
  );

  await patchJson(
    `${API_SERVER}/robinhood/${listName}`,
    {
      admins: [user.sub, "DQdO31wITIPGO5g9T3jd3kPDuqvMXPFy@clients"],
    },
    {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
    }
  );
}

async function migrateAccount() {
  await migrateList("account");
  const account = await getJson(
    `${ROBINHOOD_API_SERVER}/accounts/${ROBINHOOD_ACCOUNT_NUMBER}/`,
    {
      headers: {
        Authorization: `Bearer ${ROBINHOOD_AUTH_TOKEN}`,
      },
    }
  );
  const portfolio = await getJson(
    `${ROBINHOOD_API_SERVER}/accounts/${ROBINHOOD_ACCOUNT_NUMBER}/portfolio/`,
    {
      headers: {
        Authorization: `Bearer ${ROBINHOOD_AUTH_TOKEN}`,
      },
    }
  );
  await patchJson(
    `${API_SERVER}/robinhood/account`,
    {
      meta: {
        account,
        portfolio,
        lastUpdated: new Date(),
      },
    },
    {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
    }
  );
}

async function migrate() {
  await Promise.all(
    ["positions", "orders"]
      .map(async (entity) => {
        await migrateList(entity);
        await migrateEntity(entity);
      })
      .concat(await migrateAccount())
  );
}

// before this, create 2 lists first
// create-list robinhood positions
// create-list robinhood orders
migrate().then(console.log, console.error);
