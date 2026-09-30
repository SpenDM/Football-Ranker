import { expect, test, type Page } from '@playwright/test';

/** Open one of the league sidebar's views. */
const openView = (page: Page, name: string) =>
	page.getByRole('navigation', { name: 'League views' }).getByRole('button', { name }).click();

test('leagues: create a league, add a player, set the lineup, and see standings', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('link', { name: /Leagues/ }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Leagues' })).toBeVisible();
	await expect(page.getByText('No leagues yet.')).toBeVisible();

	await page.getByLabel('League name').fill('Test League');
	await page.getByLabel('Teams', { exact: true }).selectOption('4');
	await page.getByRole('button', { name: 'Create league' }).click();

	await expect(page).toHaveURL(/\/leagues\?league=league-/);
	await expect(page.getByRole('heading', { level: 2, name: 'Test League' })).toBeVisible();
	const starters = page.getByRole('table', { name: 'Starters' });
	await expect(starters.locator('tbody tr')).toHaveCount(9);
	await expect(starters.getByText('Empty')).toHaveCount(9);

	// Add the top available player; they land in the lineup (or on the bench if already locked).
	await openView(page, 'Players');
	const list = page.getByRole('table', { name: 'Players list' });
	const first = list.locator('tbody tr').first();
	const name = (await first.locator('.name').textContent())!.trim();
	await first.getByRole('button', { name: `Add ${name}` }).click();
	await expect(page.getByRole('status')).toHaveText(`Added ${name}.`);
	await expect(list.getByText(name)).toHaveCount(0);

	await openView(page, 'Roster');
	await expect(page.locator('.roster table').getByText(name)).toBeVisible();

	// Players aren't shared by default: Team 2 sees them on Team 1.
	await page.getByLabel('Your team').selectOption({ label: 'Team 2' });
	await openView(page, 'Players');
	await page.getByLabel('Show').selectOption('all');
	await page.getByLabel('Search players').fill(name);
	const row = list.locator('tbody tr').filter({ hasText: name });
	await expect(row.locator('.owner')).toHaveText('Team 1');
	await expect(row.getByRole('button', { name: `Add ${name}` })).toHaveCount(0);

	// Standings count from Week 1 once the start week is moved back.
	await openView(page, 'Settings');
	await page.getByLabel('Scoring starts').selectOption('1');
	await openView(page, 'Standings');
	const season = page.getByRole('table', { name: 'Season ranking' });
	await expect(season.locator('tbody tr')).toHaveCount(4);
	await expect(season.locator('tbody tr').first()).toContainText('Team 1');
	await expect(page.getByRole('table', { name: /^Week \d+ ranking$/ }).locator('tbody tr')).toHaveCount(4);

	// Everything persists across a reload.
	await page.reload();
	await expect(season.locator('tbody tr').first()).toContainText('Team 1');
});

test('leagues: manage teams and delete a league', async ({ page }) => {
	await page.goto('/leagues');
	await page.getByLabel('League name').fill('Temp');
	await page.getByLabel('Teams', { exact: true }).selectOption('2');
	await page.getByRole('button', { name: 'Create league' }).click();
	await openView(page, 'Settings');

	await page.getByRole('button', { name: 'Add team' }).click();
	await expect(page.getByRole('heading', { name: 'Teams (3/16)' })).toBeVisible();
	await page.getByLabel('Team 3 name').fill('Sharks');
	await page.getByLabel('Team 3 name').press('Enter');
	await expect(page.getByLabel('Your team').locator('option')).toHaveText(['Team 1', 'Team 2', 'Sharks']);

	await page.getByRole('button', { name: 'Delete Team 1' }).click();
	await page.getByRole('button', { name: 'Confirm delete Team 1' }).click();
	await expect(page.getByLabel('Your team').locator('option')).toHaveText(['Team 2', 'Sharks']);

	await page.getByRole('button', { name: 'Delete league' }).click();
	await page.getByRole('button', { name: 'Confirm delete league' }).click();
	await expect(page).toHaveURL(/\/leagues$/);
	await expect(page.getByText('No leagues yet.')).toBeVisible();
});
