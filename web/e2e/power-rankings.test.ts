import { expect, test, type Locator, type Page } from '@playwright/test';

async function drag(page: Page, source: Locator, target: Locator) {
	const from = (await source.boundingBox())!;
	const to = (await target.boundingBox())!;
	await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
	await page.mouse.down();
	await page.mouse.move(from.x + from.width / 2 + 40, from.y + from.height / 2 + 40, { steps: 5 });
	await page.mouse.move(to.x + 40, to.y + to.height / 2, { steps: 20 });
	// svelte-dnd-action samples the hovered zone periodically; hover briefly like a real user.
	await page.waitForTimeout(250);
	await page.mouse.up();
	await page.waitForTimeout(300);
}

const card = (page: Page, zone: string, abbr: string) =>
	page.getByLabel(zone, { exact: true }).locator(`[title$="${abbr}"]`).first();

test('home links to each tool and banner navigates between tools', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Football Tools' })).toBeVisible();
	await page.getByRole('link', { name: /Power Rankings/ }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Power Rankings' })).toBeVisible();
	await page.getByRole('link', { name: 'Fantasy Draft Manager' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Fantasy Draft Manager' })).toBeVisible();
	await page.getByRole('link', { name: 'Home' }).click();
	await expect(page).toHaveURL(/\/$/);
});

test('pool is grouped by division in AFC then NFC N/E/S/W order', async ({ page }) => {
	await page.goto('/power-rankings');
	const headings = await page.locator('.division h3').allTextContents();
	expect(headings).toEqual([
		'AFC North', 'AFC East', 'AFC South', 'AFC West',
		'NFC North', 'NFC East', 'NFC South', 'NFC West'
	]);
	await expect(page.getByLabel('AFC West pool', { exact: true }).locator('.card')).toHaveCount(4);
});

test('dragging a team into a tier persists across reload', async ({ page }) => {
	await page.goto('/power-rankings');
	await drag(page, card(page, 'AFC West pool', 'Kansas City Chiefs'), page.getByLabel('Tier S', { exact: true }));
	await expect(card(page, 'Tier S', 'Kansas City Chiefs')).toBeVisible();
	await expect(page.getByLabel('AFC West pool', { exact: true }).locator('.card')).toHaveCount(3);

	await page.reload();
	await expect(card(page, 'Tier S', 'Kansas City Chiefs')).toBeVisible();

	// Placements are kept per framework.
	await page.locator('.picker select').selectOption('preset-ranked');
	await expect(page.getByLabel('AFC West pool', { exact: true }).locator('.card')).toHaveCount(4);
	await page.locator('.picker select').selectOption('preset-letter');
	await expect(card(page, 'Tier S', 'Kansas City Chiefs')).toBeVisible();

	// Dragging back to the pool returns it to its division.
	await drag(page, card(page, 'Tier S', 'Kansas City Chiefs'), page.getByLabel('NFC East pool', { exact: true }));
	await expect(page.getByLabel('AFC West pool', { exact: true }).locator('.card')).toHaveCount(4);
});

test('save a modified preset as a custom framework (max 5)', async ({ page }) => {
	await page.goto('/power-rankings');
	await page.getByRole('button', { name: 'Edit format' }).click();
	await page.getByRole('button', { name: '+ Add tier' }).click();
	await expect(page.locator('.board .row')).toHaveCount(7);

	for (let i = 1; i <= 5; i++) {
		await page.getByRole('button', { name: 'Save format' }).click();
		await page.getByRole('dialog').getByLabel('Name').fill(`Mine ${i}`);
		await page.getByRole('button', { name: 'Save', exact: true }).click();
	}
	await expect(page.getByRole('button', { name: 'Save format' })).toBeDisabled();

	await page.reload();
	await expect(page.locator('.picker select')).toHaveValue(/custom-/);
	await expect(page.locator('.board .row')).toHaveCount(7);
	// The preset itself was reset to its defaults after saving.
	await page.locator('.picker select').selectOption('preset-letter');
	await expect(page.locator('.board .row')).toHaveCount(6);
});
