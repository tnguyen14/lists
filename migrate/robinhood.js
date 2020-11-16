require("dotenv").config();
const { getJson, postJson, patchJson, deleteJson } = require("simple-fetch");
const compact = require("lodash/compact");

const AUTH_TOKEN = process.env.AUTH_TOKEN;
const ROBINHOOD_AUTH_TOKEN = process.env.ROBINHOOD_AUTH_TOKEN;
const API_SERVER = process.env.API_SERVER;
const ROBINHOOD_API_SERVER = "https://api.robinhood.com";
const ROBINHOOD_ACCOUNT_NUMBER = process.env.ROBINHOOD_ACCOUNT_NUMBER;

const migrateList = require("./create-list");

// Some items don't have "id" property,
// derive the ID from the last part of url
// For example, position url is
// https://api.robinhood.com/positions/5PY27745/306245dd-b82d-4d8d-bcc5-7c58e87cdd15/
function getIdFromUrl(url) {
  const urlParts = compact(url.split("/"));
  return urlParts.pop();
}

function parseItem(item) {
  if (item.id) {
    return item;
  }
  item.id = getIdFromUrl(item.url);
  return item;
}

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
  const items = resp.results.map(parseItem);

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

async function migrateAccount() {
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
  const lists = ["account", "instruments", "quotes", "positions", "orders"];
  await Promise.all(
    lists.map(async (list) => {
      await migrateList("robinhood", list);
    })
  );
  await Promise.all([
    await migrateAccount(),
    await migrateEntity("positions"),
    await migrateEntity("orders"),
  ]);
}

// before this, create 2 lists first
// create-list robinhood positions
// create-list robinhood orders
migrate().then(console.log, console.error);
