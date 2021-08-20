# lists

## APIs

See `test/lists.js` for endpoint documentation.

### Create a new list

```sh
:; curl -X POST https://lists.cloud.tridnguyen.com/ \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"type": "<listType>", "name": "<listName>"}'
```

## Migrate from prod to dev

```shell
:; export API_SERVER=https://lists.cloud.tridnguyen.com
:; node migrate/api-to-firestore.js
```
