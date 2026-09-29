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
