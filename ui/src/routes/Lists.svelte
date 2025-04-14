<script>
  import { token } from '$lib/stores/auth';
  import { PUBLIC_API_URL } from '$env/static/public';
  import { Button } from '@sveltestrap/sveltestrap';
  import List from './List.svelte';
  import AddListForm from './AddListForm.svelte';

  let listsByType = {};
  let loading = true;
  /** @type string? */
  let errorMessage = "";

  async function fetchLists() {
    if (!$token) {
      errorMessage = "No authentication token available";
      loading = false;
      return;
    }

    loading = true;
    errorMessage = null;

    try {
      const response = await fetch(PUBLIC_API_URL, {
        headers: {
          'Authorization': `Bearer ${$token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API responded with status: ${response.status} - ${errorText}`);
      }

      const fetchedLists = await response.json();
      listsByType = Object.groupBy(fetchedLists, list => list.type);
      console.log('Lists by type:', listsByType);
      loading = false;
    } catch (e) {
      console.error('Error fetching lists:', e);
      errorMessage = e.message;
      loading = false;
    }
  }

  $: if ($token) {
    fetchLists();
  }

  // Track which list type section has an active add form
  /** @type string? */
  let activeListType = null;

  const toggleActiveList = (type) => activeListType = activeListType === type ? null : type;

  async function deleteList(type, name) {
    if (!confirm(`Are you sure you want to delete the list "${name}" of type "${type}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${PUBLIC_API_URL}/${type}/${name}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${$token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete list: ${errorText}`);
      }

      await fetchLists();
    } catch (e) {
      console.error('Error deleting list:', e);
      errorMessage = e.message;
    }
  }
</script>

<div class="lists-container">

  {#if loading}
    <p>Getting lists...</p>
  {:else if errorMessage}
    <p class="error-message">Error: {errorMessage}</p>
  {:else if Object.keys(listsByType).length === 0}
    <p>No lists available</p>
  {:else}
    <div class="lists-by-type">
      {#each Object.keys(listsByType) as listType (listType)}
        <section class="list-type">
          <div class="list-type-header">
            <h3>{listType}</h3>
            <Button
              color={activeListType === listType ? "secondary" : "success"}
              size="sm"
              on:click={() => toggleActiveList(listType)}
            >
              {activeListType === listType ? 'Cancel' : `Add ${listType} List`}
            </Button>
          </div>

          {#if activeListType === listType}
            <div class="type-specific-form">
              <AddListForm
                listType={listType}
                onSuccess={() => {
                  activeListType = null;
                  fetchLists();
                }}
                onCancel={() => activeListType = null}
              />
            </div>
          {/if}

          <div class="lists">
            {#each listsByType[listType] as list (list.name)}
              <List {list} onDelete={deleteList} />
            {/each}
          </div>
        </section>
      {/each}
    </div>
  {/if}
</div>

<style>
  .lists-container {
    margin: 1rem auto 0;
    max-width: 1200px;
  }

  .lists-by-type {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    margin-top: 1.5rem;
  }

  .list-type {
    background-color: #f9f9f9;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    padding: 1.25rem;
  }


  .lists {
    display: flex;
    flex-direction: column;
    width: 100%;
    margin-top: 1rem;
  }

  .error-message {
    color: #d32f2f;
    font-weight: 500;
  }
</style>
