import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	},
	server: {
		host: true
	},
	build: {
		sourcemap: "inline"
	},
	optimizeDeps: {
		// This ensures proper handling of source maps for dependencies
		entries: []
	}
});
