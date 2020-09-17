require("dotenv").config();

const firestore = require("@tridnguyen/firestore");
const chunk = require("lodash.chunk");
const { getJson } = require("simple-fetch");
const jwt = require("jsonwebtoken");

const { deleteList, createList, updateList } = require("../lists");

const apiToken = process.env.API_TOKEN;
const apiServer = process.env.MIGRATE_FROM_API_SERVER;
const listType = process.env.LIST_TYPE;
const listName = process.env.LIST_NAME;

const user = jwt.decode(apiToken);

getJson(`${apiServer}/${listType}/${listName}`, {
  headers: {
    Authorization: `Bearer ${apiToken}`,
  },
})
  .then(async (list) => {
    console.log(list);
    // list migt not exist - wrap in try/catch
    try {
      await deleteList(user, listType, listName);
    } catch (e) {
      console.error(e);
    }
    await createList(user, listType, listName);
    await updateList(user, listType, listName, list);
  })
  .then(null, console.error);
