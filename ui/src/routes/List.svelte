<script>
  import { Button } from '@sveltestrap/sveltestrap';

  // Takes a single list object as a prop
  export let list;
  // Function to handle deletion, passed from parent
  export let onDelete = () => {};

  // Define permission types with proper labels
  const permissionTypes = [
    { key: 'admins', label: 'Admins' },
    { key: 'editors', label: 'Editors' },
    { key: 'viewers', label: 'Viewers' }
  ];
</script>

<div class="list">
  <div class="list-header">
    <h3 class="list-name">{list.name}</h3>
    <Button color="danger" size="sm" on:click={() => onDelete(list.type, list.name)}>Delete</Button>
  </div>
  <div class="permissions">
    <h4>Permissions</h4>
    {#each permissionTypes as permType}
      {#if list[permType.key] && list[permType.key].length > 0}
        <div class="permission-group">
          <h5 class="permission-label">{permType.label}:</h5>
          <ul class="permission-list">
            {#each list[permType.key] as user}
              <li>{user}</li>
            {/each}
          </ul>
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .list {
    border-bottom: 1px solid #ddd;
    padding: 1.25rem 0;
    width: 100%;
    transition: background-color 0.2s;
  }

  .list:hover {
    background-color: #f8f9fd;
  }

  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .list-name {
    margin: 0 0 0.5rem 0;
    color: #444;
  }

  .permissions {
    margin-top: 0.5rem;
    font-size: 0.85rem;
  }

  .permission-group {
    margin-bottom: 0.5rem;
  }

  .permission-label {
    color: #666;
    font-weight: 500;
    display: block;
    margin-bottom: 0.25rem;
  }

  .permission-list {
    margin: 0;
    padding-left: 1.5rem;
    color: #444;
    list-style-type: disc;
  }

</style>
