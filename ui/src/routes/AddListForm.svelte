<script>
  import { PUBLIC_API_URL } from '$env/static/public';
  import { Button, Input, Form, FormGroup, Label } from '@sveltestrap/sveltestrap';
  import { token } from '$lib/stores/auth';

  export let onSuccess = () => {};
  export let onCancel = () => {};
  export let listType = '';

  // Form state
  let newListName = '';
  let isSubmitting = false;
  let formError = '';

  async function createList() {
    if (!newListName) {
      formError = 'List name is required';
      return;
    }

    isSubmitting = true;
    formError = '';

    try {
      const response = await fetch(PUBLIC_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${$token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: listType,
          name: newListName
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create list: ${errorText}`);
      }

      // Reset form and notify parent
      newListName = '';
      onSuccess();
    } catch (e) {
      formError = e.message;
      console.error('Error creating list:', e);
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="add-form">
  <h5>Add New {listType} List</h5>

  {#if formError}
    <p class="error">{formError}</p>
  {/if}

  <Form>
    <FormGroup>
      <Label for="listName">Name:</Label>
      <Input
        type="text"
        id="listName"
        bind:value={newListName}
        placeholder="e.g., fiction, groceries, etc."
      />
    </FormGroup>
    <div class="form-actions">
      <Button color="secondary" on:click={onCancel}>Cancel</Button>
      <Button color="primary" on:click={createList} disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create List'}
      </Button>
    </div>
  </Form>
</div>

<style>
  .add-form {
    background-color: #f9f9f9;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 2rem;
    border: 1px solid #ddd;
  }

  .form-actions {
    margin-top: 1.5rem;
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }

  .error {
    color: #d32f2f;
    font-weight: 500;
    margin-bottom: 1rem;
  }
</style>
