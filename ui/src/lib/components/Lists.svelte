<script>
  import { token } from '$lib/stores/auth';

  let listsByType = {};
  let loading = true;
  let error = "";

  // Function to fetch lists that we can call whenever token changes
  async function fetchLists() {
    if (!$token) {
      error = "No authentication token available";
      loading = false;
      return;
    }

    loading = true;
    error = null;

    try {
      const response = await fetch('http://localhost:13050/', {
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
      // Group lists by their type using Object.groupBy
      listsByType = Object.groupBy(fetchedLists, list => list.type);
      console.log('Lists by type:', listsByType);
      loading = false;
    } catch (e) {
      console.error('Error fetching lists:', e);
      error = e.message;
      loading = false;
    }
  }

  // React to changes in the token
  $: if ($token) {
    fetchLists();
  }
</script>

<div class="lists-container">
  <h2>Lists</h2>

  {#if loading}
    <p>Getting lists...</p>
  {:else if error}
    <p class="error">Error: {error}</p>
  {:else if Object.keys(listsByType).length === 0}
    <p>No lists available</p>
  {:else}
    <div class="lists-by-type">
      {#each Object.keys(listsByType) as listType (listType)}
        <section class="list-type">
          <h3>{listType}</h3>
          <div class="lists">
            {#each listsByType[listType] as list (list.name)}
              <div class="list">
                <h4 class="list-name">{list.name}</h4>
              </div>
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
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

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

  .error {
    color: #d32f2f;
    font-weight: 500;
  }
</style>
