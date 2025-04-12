/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  // Special handling for source map requests that don't exist
  if (event.url.pathname.endsWith('.map')) {
    if (event.url.pathname.includes('installHook.js.map')) {
      return new Response('', { status: 200 });
    }
  }

  const response = await resolve(event);
  return response;
}
