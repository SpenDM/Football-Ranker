// Cloudflare Worker entry point (see wrangler.jsonc). The site itself is static assets served
// directly by Cloudflare; only /__/auth/* runs this script (assets.run_worker_first).
import { firebaseConfig } from './lib/firebase-config';

type Env = { ASSETS: { fetch(request: Request): Promise<Response> } };

/**
 * Firebase Auth's sign-in helper pages, served from this domain (firebaseConfig.authDomain) by
 * proxying them to <projectId>.firebaseapp.com, so the Google popup/redirect keeps working in
 * browsers that block third-party storage:
 * https://firebase.google.com/docs/auth/web/redirect-best-practices#proxy-requests
 */
function firebaseAuthHelper(request: Request, url: URL): Promise<Response> | Response {
	if (!firebaseConfig.projectId) return new Response('Not found', { status: 404 });
	const upstream = new URL(url);
	upstream.protocol = 'https:';
	upstream.host = `${firebaseConfig.projectId}.firebaseapp.com`;
	upstream.port = '';
	return fetch(new Request(upstream, request));
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		if (url.pathname.startsWith('/__/auth/')) return firebaseAuthHelper(request, url);
		return env.ASSETS.fetch(request);
	}
};
