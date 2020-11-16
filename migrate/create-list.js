require("dotenv").config();
const jwt = require("jsonwebtoken");
const { postJson, patchJson, deleteJson } = require("simple-fetch");

const AUTH_TOKEN = process.env.AUTH_TOKEN;
const API_SERVER = process.env.API_SERVER;

async function migrateList(listType, listName) {
  const user = jwt.decode(AUTH_TOKEN);
  try {
    await deleteJson(`${API_SERVER}/${listType}/${listName}`, {
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
      type: listType,
      name: listName,
    },
    {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
    }
  );

  await patchJson(
    `${API_SERVER}/${listType}/${listName}`,
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

// usage: node create-list.js <list-type> <list-name>
if (require.main === module) {
  try {
    migrateList(process.argv[2], process.argv[3]);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

module.exports = migrateList;
