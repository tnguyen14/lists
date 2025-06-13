<script>
	import { PUBLIC_API_URL } from '$env/static/public';
	import { Button, Input, Form, FormGroup } from '@sveltestrap/sveltestrap';
	import { token } from '$lib/stores/auth';

	export let onSuccess = () => {};
	export let onCancel = () => {};
	/** @type string[] */
	export let listTypes = [];

	// Form state
	let listTypeSelection = '';
	let customListType = '';
	let listId = '';
	let displayName = ''; // Added field for display name
	let isSubmitting = false;
	let formError = '';

	$: listType = listTypeSelection === '__new__' ? customListType : listTypeSelection;

	async function createList() {
		if (!listId) {
			formError = 'List ID is required';
			return;
		}

		if (!listType) {
			formError = listTypeSelection === '__new__'
				? 'New list type is required'
				: 'List type is required';
			return;
		}

		isSubmitting = true;
		formError = '';

		try {
			const response = await fetch(PUBLIC_API_URL, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${$token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					type: listType,
					name: listId,
					meta: {
						displayName: displayName
					}
				})
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Failed to create list: ${errorText}`);
			}

			// Reset form and notify parent
			listId = '';
			displayName = '';
			listTypeSelection = '';
			customListType = '';
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
	<h5>Add a new list</h5>

	{#if formError}
		<p class="error">{formError}</p>
	{/if}

	<Form>
		<FormGroup floating label="List Type">
			<Input type="select" id="listTypeSelect" bind:value={listTypeSelection}>
				{#each listTypes as type}
					<option value={type}>{type}</option>
				{/each}
				<option value="__new__">Create New Type</option>
			</Input>
		</FormGroup>

		{#if listTypeSelection === "__new__"}
			<FormGroup floating label="New List Type">
				<Input
					type="text"
					id="newListType"
					bind:value={customListType}
					placeholder="Enter new list type"
				/>
			</FormGroup>
		{/if}

		<FormGroup floating label="List ID">
			<Input type="text" id="listId" bind:value={listId} placeholder="my-list" />
		</FormGroup>
		<FormGroup floating label="Display Name">
			<Input type="text" id="displayName" bind:value={displayName} placeholder="My List" />
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

	:global(option[value="__new__"]) {
		color: #2c6baa;
	}
</style>
