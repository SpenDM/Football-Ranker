import { expect, test, type Locator, type Page } from '@playwright/test';

async function drag(page: Page, source: Locator, target: Locator) {
	// hover() waits until the card is visible and not animating before the drag starts.
	await source.hover();
	const from = (await source.boundingBox())!;
	const to = (await target.boundingBox())!;
	await page.mouse.down();
	await page.mouse.move(from.x + from.width / 2 + 40, from.y + from.height / 2 + 40, { steps: 5 });
	await page.mouse.move(to.x + Math.min(40, to.width / 2), to.y + to.height / 2, { steps: 20 });
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
	// The app renders client-side; wait for it before reading (allTextContents doesn't wait).
	await expect(page.locator('.division h3')).toHaveCount(8);
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
	await page.getByLabel('Format', { exact: true }).selectOption('preset-ranked');
	await expect(page.getByLabel('AFC West pool', { exact: true }).locator('.card')).toHaveCount(4);
	await page.getByLabel('Format', { exact: true }).selectOption('preset-letter');
	await expect(card(page, 'Tier S', 'Kansas City Chiefs')).toBeVisible();

	// Dragging back to the pool returns it to its division.
	await drag(page, card(page, 'Tier S', 'Kansas City Chiefs'), page.getByLabel('NFC East pool', { exact: true }));
	await expect(page.getByLabel('AFC West pool', { exact: true }).locator('.card')).toHaveCount(4);
});

test('save a modified preset as a custom framework (max 5)', async ({ page }) => {
	await page.goto('/power-rankings');
	await page.getByRole('button', { name: 'Add tier' }).click();
	await expect(page.locator('.board .row')).toHaveCount(7);

	for (let i = 1; i <= 5; i++) {
		await page.getByRole('button', { name: 'Save format' }).click();
		await page.getByRole('dialog').getByLabel('Name').fill(`Mine ${i}`);
		await page.getByRole('button', { name: 'Save', exact: true }).click();
	}
	await expect(page.getByRole('button', { name: 'Save format' })).toBeDisabled();

	await page.reload();
	await expect(page.getByLabel('Format', { exact: true })).toHaveValue(/custom-/);
	await expect(page.locator('.board .row')).toHaveCount(7);
	// The preset itself was reset to its defaults after saving.
	await page.getByLabel('Format', { exact: true }).selectOption('preset-letter');
	await expect(page.locator('.board .row')).toHaveCount(6);
});

test('click a tier name to rename and recolor it; +/- add and remove the bottom tier', async ({ page }) => {
	await page.goto('/power-rankings');
	await page.getByRole('button', { name: 'Edit tier S' }).click();
	const editor = page.getByRole('dialog', { name: 'Edit tier S' });
	await editor.getByLabel('Name').fill('GOAT');
	await page.getByRole('dialog', { name: 'Edit tier GOAT' }).getByRole('button', { name: 'Color #7fbfff' }).click();
	await page.keyboard.press('Enter');
	await expect(page.getByRole('dialog')).toHaveCount(0);

	const label = page.getByRole('button', { name: 'Edit tier GOAT' });
	await expect(label).toBeVisible();
	await expect(label.locator('..')).toHaveCSS('background-color', 'rgb(127, 191, 255)');
	await expect(page.getByText(/You've changed this preset/)).toBeVisible();

	await page.getByRole('button', { name: 'Remove bottom tier' }).click();
	await expect(page.locator('.board .row')).toHaveCount(5);
	await expect(page.getByRole('button', { name: 'Edit tier F' })).toHaveCount(0);
	await page.getByRole('button', { name: 'Add tier' }).click();
	await expect(page.locator('.board .row')).toHaveCount(6);

	await page.reload();
	await expect(page.getByRole('button', { name: 'Edit tier GOAT' })).toBeVisible();
	await expect(page.locator('.board .row')).toHaveCount(6);

	await page.getByRole('button', { name: 'Reset to default' }).click();
	await expect(page.getByRole('button', { name: 'Edit tier S' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Edit tier F' })).toBeVisible();
});

test('1–32: drop into any slot, swap ranked teams, and send a replaced team back to the pool', async ({ page }) => {
	await page.goto('/power-rankings');
	await page.getByLabel('Format', { exact: true }).selectOption('preset-ranked');
	const slot = (n: number) => page.getByLabel(`Rank ${n}`, { exact: true });
	const inSlot = (n: number, name: string) => slot(n).locator(`[title$="${name}"]`);

	await drag(page, card(page, 'AFC West pool', 'Kansas City Chiefs'), slot(5));
	await expect(inSlot(5, 'Kansas City Chiefs')).toBeVisible();
	await expect(slot(1).locator('.card')).toHaveCount(0);

	await drag(page, card(page, 'NFC North pool', 'Detroit Lions'), slot(12));
	await expect(inSlot(12, 'Detroit Lions')).toBeVisible();

	// Ranked team onto ranked team: they swap.
	await drag(page, inSlot(12, 'Detroit Lions'), slot(5));
	await expect(inSlot(5, 'Detroit Lions')).toBeVisible();
	await expect(inSlot(12, 'Kansas City Chiefs')).toBeVisible();

	// Pool team onto a ranked team: the ranked team goes back to the pool.
	await drag(page, card(page, 'AFC North pool', 'Baltimore Ravens'), slot(5));
	await expect(inSlot(5, 'Baltimore Ravens')).toBeVisible();
	await expect(card(page, 'NFC North pool', 'Detroit Lions')).toBeVisible();

	// Ranked team back to the pool leaves its slot empty; other ranks don't shift.
	await drag(page, inSlot(5, 'Baltimore Ravens'), page.getByLabel('NFC West pool', { exact: true }));
	await expect(slot(5).locator('.card')).toHaveCount(0);
	await expect(inSlot(12, 'Kansas City Chiefs')).toBeVisible();

	await page.reload();
	await expect(inSlot(12, 'Kansas City Chiefs')).toBeVisible();
	await expect(page.locator('.slots .card')).toHaveCount(1);
});
