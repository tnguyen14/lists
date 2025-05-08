<script>
	import { writable } from 'svelte/store';
	import { Button, Input, Form } from '@sveltestrap/sveltestrap';
	import { PUBLIC_API_URL } from '$env/static/public';
	import { token } from '$lib/stores/auth';

	/**
	 * @template T
	 * @typedef {import('svelte/store').Writable<T>} WritableStore
	 */

	/**
	 * @typedef {Object} ListType
	 * @property {string} name - The name of the list
	 * @property {string} type - The type of the list
	 * @property {Object} [meta] - Optional metadata
	 * @property {string} [meta.displayName] - Optional display name
	 * @property {string[]} [admins] - List of admin users
	 * @property {string[]} [editors] - List of editor users
	 * @property {string[]} [viewers] - List of viewer users
	 */

	/**
	 * Takes a single list object as a prop
	 * @type {ListType}
	 */
	export let list;

	/**
	 * Function to handle deletion, passed from parent
	 * @type {(type: string, name: string) => void}
	 */
	export let onDelete = () => {};

	/**
	 * @typedef {'admins' | 'editors' | 'viewers'} PermissionKey
	 */

	/**
	 * @type {Array<{key: PermissionKey, label: string}>}
	 */
	const permissionTypes = [
		{ key: 'admins', label: 'Admins' },
		{ key: 'editors', label: 'Editors' },
		{ key: 'viewers', label: 'Viewers' }
	];

	/**
	 * Helper function to safely get users for a permission type
	 * @param {ListType} list - The list object
	 * @param {PermissionKey} key - The permission key
	 * @returns {string[]} Array of users with that permission
	 */
	function getPermissionUsers(list, key) {
		return Array.isArray(list[key]) ? list[key] : [];
	}

	let listName = '';
	if (list) {
		if (list.name) {
			listName = list.name;
		} else {
			listName = 'This list is missing ID';
		}
		if (list.meta && list.meta.displayName) {
			listName = `${list.meta.displayName} (${list.name})`;
		}
	}

	/**
	 * @type {Record<PermissionKey, string>}
	 */
	let userInputs = {
		admins: '',
		editors: '',
		viewers: ''
	};

	/**
	 * @typedef {Record<PermissionKey, string[]>} UserPermissionsRecord
	 */

	/**
	 * Store for tracking newly added users that haven't been saved yet
	 * @type {WritableStore<UserPermissionsRecord>}
	 */
	const newUsers = writable({
		admins: [],
		editors: [],
		viewers: []
	});

	/**
	 * Remove a user from a permission list
	 * @param {PermissionKey} permType - The permission type key
	 * @param {string} user - The user to remove
	 */
	function removeUser(permType, user) {
		// Function implementation intentionally left blank
		console.log(`Remove user ${user} from ${permType} requested`);
	}

  /**
   * Add a user to a permission list
   * @param {PermissionKey} permType - The permission type key
   * @param {string} user - The user to add
   */
  function addUser(permType, user) {
    newUsers.update(current => ({
      ...current,
      [permType]: [...current[permType], user]
    }));
  }

	/**
	 * Handle the form submission
	 * @param {SubmitEvent} e - The form submission event
	 */
	function handleListUpdate(e) {
		e.preventDefault();
		if (e.submitter && 'value' in e.submitter && e.submitter.value) {
			console.log('an actual form submission action');
			console.log(e.submitter.value);
		}
	}
	$: {
		console.log($newUsers);
	}
</script>

<div class="list">
	<Form on:submit={handleListUpdate}>
		<div class="list-header">
			<h3 class="list-name">{listName}</h3>
			<Button value="update">Update</Button>
			<Button color="danger" size="sm" on:click={() => onDelete(list.type, list.name)}
				>Delete</Button
			>
		</div>
		<div class="permissions">
			<h4>Permissions</h4>
			<style>
				.remove-user {
					margin-left: 0.5rem;
					line-height: 1;
					padding-top: 0;
				}
			</style>
			{#each permissionTypes as permType}
				{#if getPermissionUsers(list, permType.key).length > 0}
					<div class="permission-group">
						<h5 class="permission-label">{permType.label}:</h5>
						<ul class="permission-list">
							{#each getPermissionUsers(list, permType.key) as user}
								<li class="existing-user">
									<span>{user}</span>
									<Button
										class="remove-user"
										outline
										color="danger"
										size="sm"
										on:click={() => removeUser(permType.key, user)}
										title="Remove user"
									>
										<span style="font-size: 1rem; font-weight: bold;">×</span>
									</Button>
								</li>
							{/each}
							{#each $newUsers[permType.key] as user}
								<li class="new-user">
									<span>{user}</span>
								</li>
							{/each}
							<li class="new-user-row">
								<div class="input-group">
									<Input
										type="text"
										id="new-user-id"
										bind:value={userInputs[permType.key]}
										placeholder="Add new user"
									/>
								</div>
								<div class="add-btn-container">
									<Button
										outline
										color="primary"
										size="sm"
										title="Add user"
										on:click={() => {
                      addUser(permType.key, userInputs[permType.key]);
											userInputs[permType.key] = '';
										}}
										>+
									</Button>
								</div>
							</li>
						</ul>
					</div>
				{/if}
			{/each}
		</div>
	</Form>
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

	.permission-list li {
		margin-bottom: 0.5rem;
	}

	.new-user-row {
		position: relative;
		padding-right: 3rem;
	}

	.new-user-row .add-btn-container {
		position: absolute;
		right: 0;
		top: 50%;
		transform: translateY(-50%);
	}
	/* Button styling is applied inline */
</style>
