# lists

## Migrate from prod to dev

```shell
:; export API_TOKEN=<jwt-token>
:; export MIGRATE_FROM_API_SERVER=https://lists.cloud.tridnguyen.com
:; node migrate/api-to-firestore.js
```
