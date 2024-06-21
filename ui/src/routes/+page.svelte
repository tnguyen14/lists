<script>
	import { onMount } from 'svelte';
	import {goto} from '$app/navigation';
	import { getAuth} from '$lib/authState.svelte.js';
	import createAuth from '@tridnguyen/auth/spa';
	const {state: authState} = getAuth();
	let auth0;
async function loadAuth() {
	if (!authState.isAuthenticated) {
		return;
	}
	authState.token = await auth0.getTokenSilently();
	authState.user = await auth0.getUser();
}
	onMount(async () => {
		auth0 = await createAuth({
			clientId: 'dXrVfRywvgZJcf5J1z74sGXmgDfsK5AK'
		});

		if (location.search.includes("state=") && 
			location.search.includes("code=") ||
			location.search.includes("error=")) {
			console.log("handling callback");
			authState.authStatus = "Verifying authentication..."
			try {
				await auth0.handleRedirectCallback();
			} catch (e) {
				console.error(e);
			}
			authState.authStatus = "";
			goto("/", {replaceState: true});
		}
		authState.isAuthenticated = await auth0.isAuthenticated();
		if (!authState.isAuthenticated) {
			authState.authStatus = "Please log in to continue.";
			return;
		}
		authState.authStatus = "User is logged in";
		await loadAuth();
		if (authState.user) {
			authState.authStatus = `Hello, ${authState.user.name}`;
		}
	});
	function login() {
		auth0.loginWithRedirect();
	}
	function logout() {
		authState.authStatus = "Logging out...";
		auth0.logout();
		authState.authStatus = "";
	}
</script>

<div class="main">
	<h1>Lists</h1>
		<p>{authState.authStatus}</p>
	<p>
		{#if authState.isAuthenticated}
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