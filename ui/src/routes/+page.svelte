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
		if (!isAuthenticated) {
			return;
		}
		try {
			const accessToken = await auth0.getTokenSilently();
			token.set(accessToken);
		} catch (e) {
			console.error(e);
			isAuthenticated.set(false);
		}
		user.set(await auth0.getUser());
	}
	onMount(async () => {
		auth0 = await createAuth({
			clientId: 'dXrVfRywvgZJcf5J1z74sGXmgDfsK5AK'
		});

		if (location.search.includes("state=") && 
			location.search.includes("code=") ||
			location.search.includes("error=")) {
			console.log("handling callback");
			authStatus.set(AUTH_STATUSES.pendingVerify)
			try {
				await auth0.handleRedirectCallback();
			} catch (e) {
				console.error(e);
			}
			authStatus.set("");
			goto("/", {replaceState: true});
		}
		isAuthenticated.set(await auth0.isAuthenticated());
		if (!$isAuthenticated) {
			return;
		}
		authStatus.set(AUTH_STATUSES.loggedIn);
		await loadAuth();
		if ($user) {
			authStatus.set(`Hello, ${$user.name}`);
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