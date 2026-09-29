import { expect, test } from '@playwright/test';

test('fantasy roster: team mode lists top/bottom 10s; mode choice persists', async ({ page }) => {
	await page.goto('/fantasy-roster');
	await expect(page.getByRole('heading', { level: 1, name: 'Fantasy Roster Manager' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Team' })).toHaveAttribute('aria-pressed', 'true');

	for (const unit of ['offense', 'defense']) {
		for (const split of ['overall', 'rushing', 'passing']) {
			await expect(page.getByLabel(`Top 10 ${unit} ${split}`).locator('li')).toHaveCount(10);
			await expect(page.getByLabel(`Bottom 10 ${unit} ${split}`).locator('li')).toHaveCount(10);
		}
	}
	await expect(page.getByLabel('Top 10 offense overall').locator('.rank').first()).toHaveText('1');
	await expect(page.getByLabel('Bottom 10 offense overall').locator('.rank').first()).toHaveText('32');

	await page.getByRole('button', { name: 'Player' }).click();
	await expect(page.getByRole('heading', { name: 'Player mode' })).toBeVisible();
	await expect(page.getByLabel('Top 10 offense overall')).toHaveCount(0);

	await page.reload();
	await expect(page.getByRole('button', { name: 'Player' })).toHaveAttribute('aria-pressed', 'true');
	await page.getByRole('button', { name: 'Team' }).click();
	await expect(page.getByLabel('Top 10 defense passing').locator('li')).toHaveCount(10);
});

test('fantasy roster: clicking a team shows its games; clicking off closes it', async ({ page }) => {
	await page.goto('/fantasy-roster');
	const list = page.getByLabel('Top 10 offense rushing');
	const first = list.getByRole('button').first();
	await first.click();
	await expect(first).toHaveAttribute('aria-expanded', 'true');

	const games = list.getByRole('group');
	await expect(games).toBeVisible();
	await expect(games.locator('li').first()).toContainText(/Wk \d+/);
	await expect(games.locator('.opp-rank').first()).toHaveText(/^Rank \d+$/);
	await expect(games.locator('.opp-rank').first()).toHaveAttribute('title', /^rushing defense rank \d+$/);

	await page.getByRole('heading', { name: 'Offense' }).click();
	await expect(games).toHaveCount(0);

	// Opening one team's games closes another's.
	await first.click();
	await page.getByLabel('Bottom 10 defense passing').getByRole('button').first().click();
	await expect(list.getByRole('group')).toHaveCount(0);
	await expect(
		page.getByLabel('Bottom 10 defense passing').getByRole('group').locator('.opp-rank').first()
	).toHaveAttribute('title', /^passing offense rank \d+$/);
});
