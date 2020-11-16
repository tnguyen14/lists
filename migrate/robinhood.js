require("dotenv").config();
const { getJson, postJson, patchJson } = require("simple-fetch");
const compact = require("lodash.compact");

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

async function getRobinhoodApi(url) {
  return await getJson(url, {
    headers: {
      Authorization: `Bearer ${ROBINHOOD_AUTH_TOKEN}`,
    },
  });
}

async function addListBulk(listName, items) {
  console.log(`Adding ${items.length} items to ${listName}...`);
  const addResponse = await postJson(
    `${API_SERVER}/robinhood/${listName}/bulk`,
    items,
    {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
    }
  );

  if (!addResponse.success) {
    throw new Error(`Failed to add items to ${listName}`);
  }
}

async function migratePositions(url) {
  const requestUrl = url || `${ROBINHOOD_API_SERVER}/positions/`;
  // resp has properties: next, previous, results
  const resp = await getRobinhoodApi(requestUrl);
  if (!resp.results.length) {
    console.log(`No results found for ${requestUrl}`);
    return;
  }
  const positions = resp.results.map(parseItem);
  await addListBulk("positions", positions);

  const instruments = await Promise.all(
    positions
      .map((position) => getIdFromUrl(position.instrument))
      .map(async (instrument) => {
        return await getRobinhoodApi(
          `${ROBINHOOD_API_SERVER}/instruments/${instrument}/`
        );
      })
  );
  await addListBulk("instruments", instruments);

  const quotes = await Promise.all(
    instruments.map(async (instrument) => {
      let quote;
      try {
        quote = await getRobinhoodApi(
          `${ROBINHOOD_API_SERVER}/quotes/${instrument.symbol}/`
        );
        quote.id = instrument.symbol;
      } catch (e) {
        console.error(`Failed to get quote for ${instrument.symbol}`);
      }
      return quote;
    })
  );
  await addListBulk("quotes", compact(quotes));

  if (resp.next) {
    await migratePositions(resp.next);
  }
}

async function migrateOrders(url) {
  const requestUrl = url || `${ROBINHOOD_API_SERVER}/orders/`;
  // resp has properties: next, previous, results
  const resp = await getRobinhoodApi(requestUrl);
  if (!resp.results.length) {
    console.log(`No results found for ${requestUrl}`);
    return;
  }
  await addListBulk("orders", resp.results);

  if (resp.next) {
    await migrateOrders(resp.next);
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
  await Promise.all([migrateAccount(), migratePositions(), migrateOrders()]);
}

migrate().then(console.log, console.error);
