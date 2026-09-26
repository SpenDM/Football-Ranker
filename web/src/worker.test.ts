import { afterEach, describe, expect, it, vi } from 'vitest';
import { firebaseConfig } from './lib/firebase-config';
import worker from './worker';

const env = { ASSETS: { fetch: vi.fn(async () => new Response('asset')) } };

describe('worker', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		firebaseConfig.projectId = '';
	});

	it('proxies /__/auth/* to <projectId>.firebaseapp.com, keeping path and query', async () => {
		firebaseConfig.projectId = 'my-project';
		const upstream = vi.fn(async () => new Response('helper'));
		vi.stubGlobal('fetch', upstream);

		const res = await worker.fetch(
			new Request('http://localhost:8787/__/auth/handler?apiKey=x&mode=signIn'),
			env
		);

		expect(await res.text()).toBe('helper');
		const sent = (upstream.mock.calls[0] as unknown as [Request])[0];
		expect(sent.url).toBe('https://my-project.firebaseapp.com/__/auth/handler?apiKey=x&mode=signIn');
	});

	it('returns 404 for the auth helper while Firebase is not configured', async () => {
		const res = await worker.fetch(new Request('https://example.com/__/auth/handler'), env);
		expect(res.status).toBe(404);
	});

	it('serves everything else from the static assets', async () => {
		const res = await worker.fetch(new Request('https://example.com/power-rankings'), env);
		expect(await res.text()).toBe('asset');
	});
});
