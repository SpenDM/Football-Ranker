// Client-only static app: pages are prerendered as shells and hydrate in the browser,
// where localStorage and Firebase are available.
export const ssr = false;
export const prerender = true;
export const trailingSlash = 'never';
