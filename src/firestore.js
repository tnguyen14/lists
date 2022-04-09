const firestore = require("@tridnguyen/firestore");
const listsRef = firestore.collection("lists");
const chunk = require("lodash/chunk");

const httpErrors = require("fastify-sensible/lib/httpErrors");

const {
  isUserSuperAdmin,
  isUserAdmin,
  isUserEditor,
  isUserViewer,
} = require("./authorization");

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
  return {
    ref,
    snapshot,
    data,
  };
}

async function createList(user, type, name, payload) {
  if (!isUserSuperAdmin(user)) {
    throw httpErrors.unauthorized("user is not authorized to create list");
  }
  const { ref, snapshot } = await getList(user, type, name);
  const { viewers, editors, meta } = payload || {};
  if (snapshot.exists) {
    throw httpErrors.conflict(
      `List "${name}" of type "${type}" already exists`
    );
  }
  await ref.create({
    type,
    name,
    admins: [user.sub],
    editors: editors || [],
    viewers: viewers || [],
    meta: meta || {},
  });
  return { success: true };
}

async function updateList(user, type, name, payload) {
  const { ref, data } = await getList(user, type, name);
  if (!data) {
    throw httpErrors.notFound(`"${name}" is not found.`);
  }
  if (!isUserAdmin(user, data)) {
    throw httpErrors.unauthorized(
      "user is not authorized to perform modification of list"
    );
  }
  const updatedList = {};
  const updateProps = ["meta", "admins", "editors", "viewers"];
  for (const prop of updateProps) {
    if (payload[prop]) {
      updatedList[prop] = payload[prop];
    }
  }
  await ref.set(updatedList, { merge: true });
  return { success: true };
}

async function updateListMeta(user, type, name, payload) {
  const { ref, data } = await getList(user, type, name);
  if (!data) {
    throw httpErrors.notFound(`"${name}" is not found.`);
  }
  if (!isUserAdmin(user, data)) {
    throw httpErrors.unauthorized(
      "user is not authorized to perform modification of list"
    );
  }
  await ref.set(
    {
      meta: {
        ...payload,
      },
    },
    { merge: true }
  );
  return { success: true };
}

async function deleteList(user, type, name) {
  const { ref, data } = await getList(user, type, name);
  if (!data) {
    throw httpErrors.notFound(`"${name}" is not found.`);
  }
  if (!isUserAdmin(user, data)) {
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

async function getItems(user, listType, listName, query) {
  const { ref: listRef, data: listData } = await getList(
    user,
    listType,
    listName
  );
  if (!listData) {
    throw httpErrors.notFound();
  }
  if (!isUserViewer(user, listData)) {
    throw httpErrors.unauthorized("user is not authorized for list");
  }

  const { limit, orderBy, order, where } = query;
  const itemsRef = listRef.collection("items");
  let ref = itemsRef;

  if (where && Array.isArray(where)) {
    for (const filter of where) {
      ref = ref.where(filter.field, filter.op, filter.value);
    }
  }
  // @TODO enforce a default limit once checkbook is migrated to query filter
  // such as Math.min(Number(limit) || defaultLimit, maxLimit)
  if (Number(limit)) {
    ref = ref.limit(Number(limit));
  }
  // @TODO if orderBy is different from where filter field,
  // firestore will throw an error about composite index
  if (orderBy) {
    ref = ref.orderBy(orderBy, order);
  }
  const snapshot = await ref.get();

  return {
    ref,
    snapshot,
    data: snapshot.docs.map((doc) => doc.data()),
  };
}

async function getItem(user, listType, listName, itemId) {
  const { ref: listRef, data: listData } = await getList(
    user,
    listType,
    listName
  );
  if (!isUserViewer(user, listData)) {
    throw httpErrors.unauthorized("user is not authorized for list");
  }
  const ref = listRef.collection("items").doc(itemId);
  const snapshot = await ref.get();
  return {
    ref,
    snapshot,
    data: snapshot.data(),
  };
}

async function createItem(user, listType, listName, item) {
  const { data: listData } = await getList(
    user,
    listType,
    listName
  );
  if (!isUserEditor(user, listData)) {
    throw httpErrors.unauthorized("user is not authorized to create item");
  }
  if (!item.id) {
    throw httpErrors.badRequest(`"item.id" is required`);
  }
  const { ref, snapshot } = await getItem(user, listType, listName, item.id);
  if (snapshot.exists) {
    throw httpErrors.conflict(`Item "${item.id}" already exists`);
  }
  await ref.create({
    ...item,
  });
  return { success: true };
}

async function updateItem(user, listType, listName, itemId, updatedItem) {
  const { data: listData } = await getList(
    user,
    listType,
    listName
  );
  if (!isUserEditor(user, listData)) {
    throw httpErrors.unauthorized("user is not authorized to update item");
  }

  const { ref, snapshot } = await getItem(user, listType, listName, itemId);
  if (!snapshot.exists) {
    throw httpErrors.notFound(`"${itemId}" is not found.`);
  }
  await ref.set(
    {
      ...updatedItem,
    },
    { merge: true }
  );
  return { success: true };
}

async function addItemsBulk(user, listType, listName, items) {
  const { ref: listRef, data: listData } = await getList(
    user,
    listType,
    listName
  );
  if (!isUserEditor(user, listData)) {
    throw httpErrors.unauthorized(
      "user is not authorized to add items to list"
    );
  }
  // @TODO check if items already exist?
  const chunks = chunk(items, firestore.batchSize);
  await Promise.all(
    chunks.map(async (chunk) => {
      const writeBatch = firestore.batch();

      chunk.forEach((item) => {
        const itemRef = listRef.collection("items").doc(item.id);
        writeBatch.set(itemRef, item);
      });
      await writeBatch.commit();
    })
  );
  return { success: true };
}

async function deleteItem(user, listType, listName, itemId) {
  const { data: listData } = await getList(
    user,
    listType,
    listName
  );
  if (!isUserEditor(user, listData)) {
    throw httpErrors.unauthorized("user is not authorized to delete item");
  }

  const { ref, snapshot } = await getItem(user, listType, listName, itemId);
  if (!snapshot.exists) {
    throw httpErrors.notFound(`"${itemId}" is not found.`);
  }
  await ref.delete();
  return { success: true };
}

module.exports = {
  getLists,
  getList,
  createList,
  updateList,
  updateListMeta,
  deleteList,
  getItems,
  getItem,
  createItem,
  updateItem,
  addItemsBulk,
  deleteItem,
};
