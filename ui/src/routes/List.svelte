<script>
  // Takes a single list object as a prop
  export let list;
</script>

<div class="list">
  <h4 class="list-name">{list.name}</h4>
  <div class="permissions">
    {#if list.admins && list.admins.length > 0}
      <div class="permission-group">
        <span class="permission-label">Admins:</span>
        <ul class="permission-list">
          {#each list.admins as admin}
            <li>{admin}</li>
          {/each}
        </ul>
      </div>
    {/if}

    {#if list.editors && list.editors.length > 0}
      <div class="permission-group">
        <span class="permission-label">Editors:</span>
        <ul class="permission-list">
          {#each list.editors as editor}
            <li>{editor}</li>
          {/each}
        </ul>
      </div>
    {/if}

    {#if list.viewers && list.viewers.length > 0}
      <div class="permission-group">
        <span class="permission-label">Viewers:</span>
        <ul class="permission-list">
          {#each list.viewers as viewer}
            <li>{viewer}</li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>
</div>

<style>
  .list {
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 1rem;
    background-color: white;
    transition: background-color 0.2s;
  }

  .list:hover {
    background-color: #f5f8ff;
  }

  .list-name {
    margin: 0 0 0.5rem 0;
    color: #444;
    font-size: 1.1rem;
    font-weight: 500;
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

  .permission-list li {
    margin-bottom: 0.1rem;
  }
</style>
