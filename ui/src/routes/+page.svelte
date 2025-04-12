<script>
	/**
	 * @typedef {import('@auth0/auth0-spa-js').Auth0Client} Auth0Client
	 * @typedef {Object} AuthError
	 * @property {string} [error] - The error code from Auth0
	 */

	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { isAuthenticated, user, authStatus, token, AUTH_STATUSES } from '$lib/stores/auth.js';
	import createAuth from '@tridnguyen/auth/spa';
	import Lists from '$lib/components/Lists.svelte';

	/** @type {Auth0Client|undefined} */
	let auth0;

	async function loadAuth() {
		if (!auth0) {
			throw new Error('auth0 instance has not been instantiated');
		}

		try {
			// First check if the user is authenticated
			const authenticated = await auth0.isAuthenticated();
			console.log("Authentication check in loadAuth:", authenticated);
			isAuthenticated.set(authenticated);

			if (!authenticated) {
				console.log('Not authenticated, skipping token fetch');
				authStatus.set(AUTH_STATUSES.initial);
				return false;
			}

			console.log('Retrieving access token');
			// Get access token with audience parameter to ensure correct format
			const accessToken = await auth0.getTokenSilently({
				authorizationParams: {
					audience: 'https://lists.cloud.tridnguyen.com',
					scope: 'read:list write:list',
				}
			});

			console.log('Access token retrieved successfully');
			// Store the raw token without any modifications
			token.set(accessToken);

			// Get user information
			const userInfo = await auth0.getUser();
			console.log('User info retrieved:', userInfo);
			user.set(userInfo || {});

			// Update auth status
			authStatus.set(AUTH_STATUSES.loggedIn);
			if (userInfo && userInfo.name) {
				authStatus.set(`Hello, ${userInfo.name}`);
			}

			return true;
		} catch (error) {
			console.error('Error in loadAuth:', error);
			// Type-safe error handling using JavaScript
			/** @type {AuthError} */
			const e = error;
			if (e.error === 'login_required' || e.error === 'unauthorized') {
				isAuthenticated.set(false);
				authStatus.set(AUTH_STATUSES.initial);
				// Clear any stale user or token information
				user.set({});
				token.set('');
			} else {
				authStatus.set(AUTH_STATUSES.error);
			}
			return false;
		}
	}

	onMount(async () => {

		auth0 = await createAuth({
			domain: 'tridnguyen.auth0.com',
			clientId: 'dXrVfRywvgZJcf5J1z74sGXmgDfsK5AK',
			authorizationParams: {
				redirect_uri: window.location.href,
				audience: 'https://lists.cloud.tridnguyen.com',
				scope: 'openid profile email read:list write:list'
			},
			cacheLocation: 'localstorage'
		});

		// Handle redirect callback if present in URL
		if (location.search.includes("state=") &&
			(location.search.includes("code=") || location.search.includes("error="))) {
			console.log("Handling auth callback");
			authStatus.set(AUTH_STATUSES.pendingVerify);

			try {
				await auth0.handleRedirectCallback();
				console.log("Callback handled successfully");

				// After handling callback, load auth state
				await loadAuth();

				// Clear URL parameters
				goto("/", {replaceState: true});
			} catch (e) {
				console.error("Error handling callback:", e);
				authStatus.set(AUTH_STATUSES.error);
				isAuthenticated.set(false);
				user.set({});
				token.set('');
			}
		} else {
			// If no callback to handle, just load auth state
			await loadAuth();
		}
	});

	function login() {
		if (!auth0) {
			throw new Error('auth0 instance has not been instantiated');
		}
		authStatus.set(AUTH_STATUSES.pendingVerify);
		auth0.loginWithRedirect({
			authorizationParams: {
				redirect_uri: window.location.href
			}
		});
	}

	function logout() {
		if (!auth0) {
			throw new Error('auth0 instance has not been instantiated');
		}
		authStatus.set(AUTH_STATUSES.pendingLogout);

		// Clear auth state values first
		isAuthenticated.set(false);
		user.set({});
		token.set('');

		// Then log out from Auth0
		auth0.logout({
			logoutParams: {
				returnTo: window.location.origin
			}
		});

		authStatus.set(AUTH_STATUSES.initial);
	}
</script>

<div class="main">
	<h1>Lists</h1>
	<p>{$authStatus}</p>
	<p>
		{#if $isAuthenticated}
			<button on:click={logout}>Log Out</button>
			<Lists />
		{:else}
			<button on:click={login}>Log In</button>
		{/if}
	</p>
</div>

<style>
	.main {
		margin: 2rem auto 1rem;
		width: 90%;
	}
	p {
		text-align: center;
	}
</style>
