<script>
	import { writable, derived } from 'svelte/store';
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
	 * @property {string[]} admins - List of admin users
	 * @property {string[]} editors - List of editor users
	 * @property {string[]} viewers - List of viewer users
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
	 * Initial state for permission updates tracking
	 * @type {Record<PermissionKey, string[]>}
	 */
	const INITIAL_PERMISSIONS_UPDATE_STATE = {
		admins: [],
		editors: [],
		viewers: []
	};

	/**
	 * @type {Array<{key: PermissionKey, label: string}>}
	 */
	const permissionTypes = [
		{ key: 'admins', label: 'Admins' },
		{ key: 'editors', label: 'Editors' },
		{ key: 'viewers', label: 'Viewers' }
	];

	// No helper function needed - we'll use direct access with type assertions

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
	 * Tracks whether an update is in progress
	 */
	let isUpdating = false;

	/**
	 * @typedef {Record<PermissionKey, string[]>} UserPermissionsRecord
	 */

	/**
	 * Store for tracking newly added users that haven't been saved yet
	 * @type {WritableStore<UserPermissionsRecord>}
	 */
	const newUsers = writable({ ...INITIAL_PERMISSIONS_UPDATE_STATE });

	/**
	 * Store for tracking users to be removed that haven't been saved yet
	 * @type {WritableStore<UserPermissionsRecord>}
	 */
	const removedUsers = writable({ ...INITIAL_PERMISSIONS_UPDATE_STATE });

	/**
	 * Remove a user from a permission list
	 * @param {PermissionKey} permType - The permission type key
	 * @param {string} user - The user to remove
	 */
	function removeUser(permType, user) {
		if ($newUsers[permType].includes(user)) {
			// If the user is in newUsers, just remove them from there
			newUsers.update((current) => ({
				...current,
				[permType]: current[permType].filter((u) => u !== user)
			}));
			return;
		}
		// If the user is not in newUsers, add them to the removedUsers store
		removedUsers.update((current) => ({
			...current,
			[permType]: [...current[permType], user]
		}));
	}

	/**
	 * Restore a previously marked user (remove from removedUsers list)
	 * @param {PermissionKey} permType - The permission type key
	 * @param {string} user - The user to restore
	 */
	function restoreUser(permType, user) {
		removedUsers.update(current => ({
			...current,
			[permType]: current[permType].filter(u => u !== user)
		}));
	}

	/**
	 * Add a user to a permission list
	 * @param {PermissionKey} permType - The permission type key
	 * @param {string} user - The user to add
	 */
	function addUser(permType, user) {
		// Check if user already exists
		if (list[permType]?.includes(user) || $newUsers[permType].includes(user)) {
			return;
		}

		newUsers.update((current) => ({
			...current,
			[permType]: [...current[permType], user]
		}));
	}

	/**
	 * Handle the form submission
	 * @param {SubmitEvent} e - The form submission event
	 */
	async function handleListUpdate(e) {
		e.preventDefault();

		// @ts-ignore - submitter and value properties exist at runtime
		if (e.submitter?.value !== 'update') return;

		if (!$hasPendingChanges) return;

		// Set updating state to true
		isUpdating = true;

		try {
			// Start with a copy of the existing list
			const updatedPermissions = { ...list };

			// Update each permission type
			permissionTypes.forEach(({ key }) => {
				$newUsers[key].forEach(user => {
					updatedPermissions[key].push(user);
				});

				// Remove users that were marked for removal
				updatedPermissions[key] = updatedPermissions[key].filter(user =>
					!$removedUsers[key].includes(user)
				);
			});

			const response = await fetch(`${PUBLIC_API_URL}/${list.type}/${list.name}`, {
				method: 'PATCH',
				headers: {
					'Authorization': `Bearer ${$token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(updatedPermissions)
			});

			if (!response.ok) {
				throw new Error(`API error: ${response.status}`);
			}

			// Update was successful, clear the pending changes
			newUsers.set({ ...INITIAL_PERMISSIONS_UPDATE_STATE });
			removedUsers.set({ ...INITIAL_PERMISSIONS_UPDATE_STATE });

			// TODO: instead of updating the new values locally,
			// trigger an event and have the parent component retrieve the
			// updated list data and pass that down through the prop
			list = { ...updatedPermissions };

			console.log('List updated successfully');
		} catch (error) {
			console.error('Error updating list:', error);
			// Here you could add error handling logic, like showing a notification
		} finally {
			// Reset updating state regardless of success or failure
			isUpdating = false;
		}
	}

	/**
	 * Derived store to check if there are any pending changes
	 * @type {import('svelte/store').Readable<boolean>}
	 */
	const hasPendingChanges = derived(
		[newUsers, removedUsers],
		([$newUsers, $removedUsers]) => {
			// Check if any permission type has new or removed users
			return permissionTypes.some(
				(type) =>
					$newUsers[type.key].length > 0 ||
					$removedUsers[type.key].length > 0
			);
		}
	);

	$: {
		console.log($newUsers);
	}
</script>

<div class="list">
	<Form on:submit={handleListUpdate}>
		<div class="list-header">
			<h3 class="list-name">{listName}</h3>
			<Button type="submit" value="update" disabled={!$hasPendingChanges || isUpdating}>
				{isUpdating ? 'Updating' : 'Update'}
			</Button>
			<Button color="danger" size="sm" on:click={(e) => {
				e.stopPropagation();
				e.preventDefault();
				onDelete(list.type, list.name)
			}}
				>Delete</Button
			>
		</div>
		<div class="permissions">
			<h4>Permissions</h4>
			<style>
				.remove-user,
				.restore-user {
					margin-left: 0.5rem;
					line-height: 1;
					padding-top: 0;
				}
				.restore-user {
					padding-top: 0.2rem;
				}
			</style>
			{#each permissionTypes as permType}
				<div class="permission-group">
					<h5 class="permission-label">{permType.label}:</h5>
					<ul class="permission-list">
						{#each list[permType.key] as user}
							<li class="existing-user">
								<span class={$removedUsers[permType.key]?.includes(user) ? 'removed-user' : ''}>
									{user}
								</span>
								{#if $removedUsers[permType.key]?.includes(user)}
									<!-- Show restore button for marked users -->
									<Button
										class="restore-user"
										outline
										color="success"
										size="sm"
										on:click={() => restoreUser(permType.key, user)}
										title="Restore user"
									>
										<span style="font-size: 0.9rem;">↩</span>
									</Button>
								{:else}
									<!-- Show remove button for regular users -->
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
								{/if}
							</li>
						{/each}
						{#each $newUsers[permType.key] as user}
							<li class="new-user">
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
						<li class="add-new-user">
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

	.permission-list .removed-user {
		text-decoration: line-through;
		color: #888;
	}

	.permission-list .new-user {
		color: #2c6baa;
	}

	.add-new-user {
		position: relative;
		padding-right: 3rem;
	}

	.add-new-user .add-btn-container {
		position: absolute;
		right: 0;
		top: 50%;
		transform: translateY(-50%);
	}
</style>
