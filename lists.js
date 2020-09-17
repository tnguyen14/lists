const firestore = require("@tridnguyen/firestore");

const listsRef = firestore.collection("lists");

// get lists that belongs to a user
async function getLists(user) {
  const ref = listsRef.where("admins", "array-contains", user.sub);
  const snapshot = await ref.get();
  return {
    ref,
    snapshot,
    data: snapshot.docs.map((doc) => doc.data()),
  };
}

// if list does not exist, data would be `undefined`
// if list is empty, data would be `{}`, or check `snapshot.exists`
async function getList(user, type, name) {
  const ref = listsRef.doc(`${type}!${name}`);
  const snapshot = await ref.get();
  const data = snapshot.data();
  if (
    snapshot.exists &&
    data.read != "public" &&
    !data.admins.includes(user.sub)
  ) {
    throw fastify.httpErrors.unauthorized("user is not authorized for list");
  }
  return {
    ref,
    snapshot,
    data,
  };
}

async function getItems(user, listType, listName) {
  const { ref: listRef, data: listData } = await getList(
    user,
    listType,
    listName
  );
  if (!listData) {
    throw fastify.httpErrors.notFound();
  }
  const ref = listRef.collection("items");
  const snapshot = await ref.get();

  return {
    ref,
    snapshot,
    data: snapshot.docs.map((doc) => doc.data()),
  };
}

async function getItem(user, listType, listName, itemId) {
  const { ref: listRef } = await getList(user, listType, listName);
  const ref = listRef.collection("items").doc(itemId);
  const snapshot = await ref.get();
  return {
    ref,
    snapshot,
    data: snapshot.data(),
  };
}

module.exports = {
  getLists,
  getList,
  getItems,
  getItem,
};
