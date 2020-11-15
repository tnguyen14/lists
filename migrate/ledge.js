require("dotenv").config();
const authToken = process.env.AUTH_TOKEN;
const LISTS_SERVER_URL = process.env.API_SERVER;
const { getJson, patchJson, postJson, deleteJson } = require("simple-fetch");
const qs = require("qs");

const OLD_SERVER_URL = "https://ledge.cloud.tridnguyen.com";

async function migrateTransactionsInChunk(authToken, before) {
  let query = {
    limit: 500,
  };
  if (before) {
    query.before = before;
  }

  const transactions = await getJson(
    `${OLD_SERVER_URL}/accounts/daily/transactions?${qs.stringify(query)}`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );
  if (!transactions.length) {
    console.log("No more transactions");
    return;
  }

  console.log(
    `Migrating ${transactions.length} transactions, starting with ${
      transactions[0].date
    }, ending with ${transactions[transactions.length - 1].date}`
  );

  const addResponse = await postJson(
    `${LISTS_SERVER_URL}/ledge/tri/bulk`,
    transactions,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );
  if (!addResponse.success) {
    throw new Error("Failed to add transactions");
  }
  await migrateTransactionsInChunk(
    authToken,
    transactions[transactions.length - 1].date
  );
}

async function migrate() {
  const account = await getJson(`${OLD_SERVER_URL}/accounts/daily`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  try {
    await deleteJson(`${LISTS_SERVER_URL}/ledge/tri`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  } catch (e) {
    if (e.response.statusText != "Not Found") {
      throw e;
    }
  }

  await postJson(
    `${LISTS_SERVER_URL}`,
    {
      type: "ledge",
      name: "tri",
    },
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );

  const updateMeta = await patchJson(
    `${LISTS_SERVER_URL}/ledge/tri`,
    {
      meta: {
        categories: account.categories,
        merchants_count: account.merchants_count,
        sources: account.sources,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );
  if (!updateMeta.success) {
    throw new Error("Unable to update account meta");
  }
  await migrateTransactionsInChunk(authToken);
}

migrate().then(console.log, console.error);
