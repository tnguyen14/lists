const authToken = process.env.AUTH_TOKEN;
const serverUrl = process.env.SERVER_URL;

if (!serverUrl) {
  console.error(
    "Please specify which server to migrate to via SERVER_URL env var."
  );
  process.exit(1);
}
if (!authToken) {
  console.error("AUTH_TOKEN is needed to authorized against lists server");
  process.exit(1);
}

const { getJson, postJson } = require("simple-fetch");

async function migrate() {
  const articles = await getJson(
    "https://read.cloud.tridnguyen.com/tri/articles"
  );
  console.log(`Found ${articles.length} articles from old API.`);

  await Promise.all(
    articles.map(async (article) => {
      try {
        await postJson(`${serverUrl}/read/tri/items`, article, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
      } catch (e) {
        console.error(e);
      }
    })
  );
}

migrate();
