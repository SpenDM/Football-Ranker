import { expect, test } from '@playwright/test';

test('fantasy roster: team mode lists top/bottom 10s; mode choice persists', async ({ page }) => {
	await page.goto('/fantasy-roster');
	await expect(page.getByRole('heading', { level: 1, name: 'Fantasy Roster Manager' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Team Rankings' })).toHaveAttribute('aria-pressed', 'true');

	for (const unit of ['offense', 'defense']) {
		for (const split of ['overall', 'rushing', 'passing']) {
			await expect(page.getByLabel(`Top 10 ${unit} ${split}`).locator('li')).toHaveCount(10);
			await expect(page.getByLabel(`Bottom 10 ${unit} ${split}`).locator('li')).toHaveCount(10);
		}
	}
	await expect(page.getByLabel('Top 10 offense overall').locator('.rank').first()).toHaveText('1');
	await expect(page.getByLabel('Bottom 10 offense overall').locator('.rank').first()).toHaveText('32');

	await page.getByRole('button', { name: 'Player Rankings' }).click();
	await expect(page.getByRole('region', { name: 'Top Performers QB' })).toBeVisible();
	await expect(page.getByLabel('Top 10 offense overall')).toHaveCount(0);

	await page.reload();
	await expect(page.getByRole('button', { name: 'Player Rankings' })).toHaveAttribute('aria-pressed', 'true');
	await page.getByRole('button', { name: 'Team Rankings' }).click();
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
	await expect(games.locator('.opp-rank').first()).toHaveText(/^#\d+$/);
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

test('fantasy roster: Team Lookup finds a team by city or name and shows its games', async ({ page }) => {
	await page.goto('/fantasy-roster');
	const head = page.locator('.category-head').filter({ hasText: 'Rushing' }).first();
	await head.getByRole('button', { name: 'Team Lookup' }).click();

	const input = page.getByRole('combobox', { name: 'Team lookup, offense rushing' });
	await expect(input).toBeFocused();
	await input.fill('new york');
	await expect(page.getByRole('option')).toHaveText(['New York Giants', 'New York Jets']);
	await page.getByRole('option', { name: 'New York Jets' }).click();

	const result = page.getByRole('group', { name: 'NYJ offense rushing' });
	await expect(result.locator('.row')).toContainText('Jets');
	await expect(result.getByRole('group', { name: 'New York Jets by game' }).locator('li').first()).toContainText(
		/Wk \d+/
	);
	await expect(result.getByRole('group', { name: 'New York Jets by game' }).locator('li').last()).toContainText(
		'UPCOMING'
	);

	// Esc dismisses back to the button.
	await page.keyboard.press('Escape');
	await expect(result).toHaveCount(0);
	await expect(head.getByRole('button', { name: 'Team Lookup' })).toBeVisible();

	// Keyboard: type a nickname and press Enter; clicking off dismisses.
	await head.getByRole('button', { name: 'Team Lookup' }).click();
	await input.fill('bears');
	await input.press('Enter');
	await expect(page.getByRole('group', { name: 'CHI offense rushing' })).toBeVisible();
	await page.getByRole('heading', { name: 'Offense' }).click();
	await expect(page.getByRole('group', { name: 'CHI offense rushing' })).toHaveCount(0);
});

test('fantasy roster: player mode ranks each position in three columns', async ({ page }) => {
	await page.goto('/fantasy-roster');
	await page.getByRole('button', { name: 'Player Rankings' }).click();

	const positions = page.getByRole('group', { name: 'Position' });
	for (const label of ['QB', 'RB', 'WR', 'TE', 'FLEX', 'D/ST', 'K']) {
		await positions.getByRole('button', { name: label, exact: true }).click();
		for (const column of ['Top Performers', 'Best Matchup', 'Best Available']) {
			await expect(
				page.getByRole('region', { name: `${column} ${label}` }).locator('li')
			).toHaveCount(20);
		}
	}

	// Matchups are highest first.
	const scores = async (name: string) =>
		(await page.getByRole('region', { name }).locator('.score').allTextContents()).map((t) =>
			Number(t.replace('−', '-'))
		);
	await positions.getByRole('button', { name: 'D/ST', exact: true }).click();
	await expect(page.getByRole('region', { name: 'Best Matchup D/ST' }).locator('li')).toHaveCount(20);
	const dst = await scores('Best Matchup D/ST');
	expect(dst).toEqual([...dst].sort((a, b) => b - a));
	expect(dst[0]).toBeGreaterThan(0);
	await positions.getByRole('button', { name: 'RB', exact: true }).click();
	await expect(page.getByRole('region', { name: 'Best Matchup RB' }).locator('li')).toHaveCount(20);
	const rb = await scores('Best Matchup RB');
	expect(rb).toEqual([...rb].sort((a, b) => b - a));
	const top = await scores('Top Performers RB');
	expect(top).toEqual([...top].sort((a, b) => b - a));

	// Clicking a player shows their games, ending with the upcoming one.
	const first = page
		.getByRole('region', { name: 'Top Performers RB' })
		.locator('button.row')
		.first();
	await first.click();
	const games = page.getByRole('region', { name: 'Top Performers RB' }).getByRole('group');
	await expect(games.locator('li').first()).toContainText(/Wk \d+/);
	await expect(games.locator('.opp-rank').first()).toHaveAttribute(
		'title',
		/^rushing defense rank \d+$/
	);

	// The chosen position is remembered.
	await page.reload();
	await expect(positions.getByRole('button', { name: 'RB', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
});

test('fantasy roster: players marked not available can be restored from Player Lookup', async ({
	page
}) => {
	await page.goto('/fantasy-roster');
	await page.getByRole('button', { name: 'Player Rankings' }).click();
	await page
		.getByRole('group', { name: 'Position' })
		.getByRole('button', { name: 'WR', exact: true })
		.click();

	const available = page.getByRole('region', { name: 'Best Available WR' });
	const firstName = (await available.locator('.name').first().textContent())!;
	await available.getByRole('button', { name: `Mark ${firstName} not available` }).click();
	await expect(available.locator('.name').first()).not.toHaveText(firstName);
	await expect(available.locator('.rank').first()).toHaveText('1');
	// Still listed under Best Matchup.
	await expect(
		page.getByRole('region', { name: 'Best Matchup WR' }).locator('.name').first()
	).toHaveText(firstName);

	// Hidden players stay hidden after a reload.
	await page.reload();
	await expect(available.getByText(firstName, { exact: true })).toHaveCount(0);

	await page.getByRole('button', { name: 'Player Lookup' }).click();
	const input = page.getByRole('combobox', { name: 'Player lookup, WR' });
	await input.fill(firstName);
	await input.press('Enter');
	const result = page.getByRole('group', { name: `${firstName} WR` });
	await expect(result).toContainText('Not available');
	await expect(
		result
			.getByRole('group', { name: `${firstName} by game` })
			.locator('li')
			.last()
	).toContainText('UPCOMING');
	await result.getByRole('button', { name: `Mark ${firstName} available` }).click();
	await expect(result).toContainText('Available.');

	await page.keyboard.press('Escape');
	await expect(available.locator('.name').first()).toHaveText(firstName);
});

test('fantasy roster: Team Matchups lists the upcoming week, better team first; view persists', async ({
	page
}) => {
	await page.goto('/fantasy-roster');
	await expect(page.getByRole('button', { name: 'Team Rankings' })).toHaveAttribute('aria-pressed', 'true');
	await page.getByRole('button', { name: 'Team Matchups' }).click();
	await expect(page.getByLabel('Top 10 offense overall')).toHaveCount(0);

	await expect(page.getByRole('heading', { name: /^Week \d+ Matchups$/ })).toBeVisible();
	const games = page.getByRole('list', { name: /^Week \d+ games$/ }).locator('li');
	await expect(games).not.toHaveCount(0);
	const first = games.first();
	await expect(first.locator('.ranks').first()).toHaveText(/^Off #\d+ · Def #\d+$/);
	await expect(first.locator('.score')).toHaveText(/^\d+$/);

	// Better team first: its offense + defense rank total is no higher than its opponent's.
	const total = async (i: number) =>
		(await first.locator('.ranks').nth(i).innerText()).match(/\d+/g)!.map(Number).reduce((a, b) => a + b);
	const [better, worse] = [await total(0), await total(1)];
	expect(better).toBeLessThanOrEqual(worse);
	await expect(first.locator('.score')).toHaveText(String(worse - better));

	await page.reload();
	await expect(page.getByRole('button', { name: 'Team Matchups' })).toHaveAttribute('aria-pressed', 'true');
	await page.getByRole('button', { name: 'Team Rankings' }).click();
	await expect(page.getByLabel('Top 10 offense overall').locator('li')).toHaveCount(10);
	await expect(page.locator('.data-note')).toContainText(/^Data: \d{4} regular season/);
});
