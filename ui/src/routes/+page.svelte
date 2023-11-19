<script>
	import { onMount } from 'svelte';
	import createAuth from '@tridnguyen/auth/spa';
	onMount(async () => {
		const auth0 = await createAuth({
			clientId: 'dXrVfRywvgZJcf5J1z74sGXmgDfsK5AK'
		});
		console.log(await auth0.isAuthenticated());
	});
</script>

<div class="main">
	<h1>Lists</h1>
	<p>
		<button>Log In</button>
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
