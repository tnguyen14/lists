require("dotenv").config();
const authToken = process.env.AUTH_TOKEN;
const LISTS_SERVER_URL = process.env.API_SERVER;
const { getJson, patchJson, postJson, deleteJson } = require("simple-fetch");

const OLD_SERVER_URL = "https://ledge.cloud.tridnguyen.com";

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
  return updateMeta;
}

migrate().then(console.log, console.error);
