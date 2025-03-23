<script>
	/*
	import type {Auth0Client} from '@auth0/auth0-spa-js';
	*/
	import { onMount } from 'svelte';
	import {goto} from '$app/navigation';
	import { isAuthenticated, user, authStatus, token, AUTH_STATUSES } from '$lib/authState.svelte.js';
	import createAuth from '@tridnguyen/auth/spa';
	/**
	 * @type {Auth0Client}
	 */
	let auth0;
	async function loadAuth() {
		if (!auth0) {
			throw new Error('auth0 instance has not been instantiated');
		}
		if (!$isAuthenticated) {
			console.log('Not authenticated, skipping token fetch');
			return;
		}

		try {
			console.log('Retrieving access token');
			const accessToken = await auth0.getTokenSilently();

			console.log('Token retrieved successfully');
			token.set(accessToken);

			// Get user information
			const userInfo = await auth0.getUser();
			console.log('User info retrieved');
			user.set(userInfo);
		} catch (e) {
			console.error('Error in loadAuth:', e);
			if (e.error === 'login_required' || e.error === 'unauthorized') {
			isAuthenticated.set(false);
		}
		}
	}
	onMount(async () => {
		auth0 = await createAuth({
			clientId: 'dXrVfRywvgZJcf5J1z74sGXmgDfsK5AK',
			authorizationParams: {
				redirect_uri: window.location.href
			}
		});

		// Handle redirect callback if present in URL
		if (location.search.includes("state=") &&
			(location.search.includes("code=") || location.search.includes("error="))) {
			console.log("Handling auth callback");
			authStatus.set(AUTH_STATUSES.pendingVerify);
			try {
				await auth0.handleRedirectCallback();
				console.log("Callback handled successfully");
				// Clear URL parameters
				goto("/", {replaceState: true});
			} catch (e) {
				console.error("Error handling callback:", e);
				authStatus.set(AUTH_STATUSES.error);
				isAuthenticated.set(false);
				return;
			}
		}

		// Check authentication state
		try {
			const authenticated = await auth0.isAuthenticated();
			console.log("Authentication state:", authenticated);
			isAuthenticated.set(authenticated);

			if (!authenticated) {
				authStatus.set(AUTH_STATUSES.initial);
			return;
		}
		authStatus.set(AUTH_STATUSES.loggedIn);
		await loadAuth();
		if ($user) {
			authStatus.set(`Hello, ${$user.name}`);
			}
		} catch (authError) {
			console.error("Authentication check error:", authError);
			authStatus.set(AUTH_STATUSES.error);
			isAuthenticated.set(false);
		}
	});
	function login() {
		if (!auth0) {
			throw new Error('auth0 instance has not been instantiated');
		}
		auth0.loginWithRedirect();
	}
	function logout() {
		if (!auth0) {
			throw new Error('auth0 instance has not been instantiated');
		}
		authStatus.set(AUTH_STATUSES.pendingLogout);
		auth0.logout();
		authStatus.set(AUTH_STATUSES.initial);
	}
</script>

<div class="main">
	<h1>Lists</h1>
		<p>{$authStatus}</p>
	<p>
		{#if $isAuthenticated}
			<button on:click={logout}>Log Out</button>
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
