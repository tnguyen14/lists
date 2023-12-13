# lists

## APIs

See `test/lists.js` for endpoint documentation.

### List management

```sh
# create a new list
:; curl -X POST https://lists.cloud.tridnguyen.com/ \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"type": "<listType>", "name": "<listName>"}'

# delete a list
:; curl -X DELETE "https://lists.cloud.tridnguyen.com/${listType}/${listName}" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

### Add item to list

```sh
:; curl -X POST "https://lists.cloud.tridnguyen.com/${listType}/${listName}/items" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"id": "my-item-id", "foo": "bar"}'
```

## Migrate from prod to dev

```shell
:; export API_SERVER=https://lists.cloud.tridnguyen.com
:; node migrate/api-to-firestore.js
```
