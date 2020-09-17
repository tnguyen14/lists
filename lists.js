const firestore = require("@tridnguyen/firestore");
const listsRef = firestore.collection("lists");

const httpErrors = require("fastify-sensible/lib/httpErrors");

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
    throw httpErrors.unauthorized("user is not authorized for list");
  }
  return {
    ref,
    snapshot,
    data,
  };
}

async function deleteList(user, type, name) {
  const { ref, data } = await getList(user, type, name);
  if (!data) {
    throw httpErrors.notFound(`"${name}" is not found.`);
  }
  if (!data.admins.includes(user.sub)) {
    throw httpErrors.unauthorized(
      "user is not authorized to perform deletion of list"
    );
  }
  await firestore.deleteCollection(`lists/${type}!${name}/items`);
  await ref.delete();
  return {
    success: true,
  };
}

async function getItems(user, listType, listName) {
  const { ref: listRef, data: listData } = await getList(
    user,
    listType,
    listName
  );
  if (!listData) {
    throw httpErrors.notFound();
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
  deleteList,
  getItems,
  getItem,
};
