require("dotenv").config();
const authToken = process.env.AUTH_TOKEN;
const apiServer = process.env.API_SERVER;
const { getJson, patchJson, postJson } = require("simple-fetch");

async function migrate() {
  const account = await getJson(
    "https://ledge.cloud.tridnguyen.com/accounts/daily",
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );

  const updateMeta = await patchJson(
    `${apiServer}/ledge/tri`,
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
