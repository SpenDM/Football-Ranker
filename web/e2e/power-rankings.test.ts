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

const formatButton = (page: Page, name: string) =>
	page.getByRole('group', { name: 'Format' }).getByRole('button', { name, exact: true });

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
	await formatButton(page, '1–32').click();
	await expect(page.getByLabel('AFC West pool', { exact: true }).locator('.card')).toHaveCount(4);
	await formatButton(page, 'Letter Grades').click();
	await expect(card(page, 'Tier S', 'Kansas City Chiefs')).toBeVisible();

	// Dragging back to the pool returns it to its division.
	await drag(page, card(page, 'Tier S', 'Kansas City Chiefs'), page.getByLabel('NFC East pool', { exact: true }));
	await expect(page.getByLabel('AFC West pool', { exact: true }).locator('.card')).toHaveCount(4);
});

test('save formats inline as buttons (max 5), rename, and delete', async ({ page }) => {
	await page.goto('/power-rankings');
	// Only a modified format can be saved.
	await expect(page.getByRole('button', { name: 'Save Format' })).toBeDisabled();

	// Save Format turns into a name input for the new format; another Save Format appears under it.
	for (let i = 1; i <= 5; i++) {
		await page.getByRole('button', { name: 'Add tier' }).click();
		await page.getByRole('button', { name: 'Save Format' }).click();
		const name = page.getByRole('textbox', { name: 'Format name' });
		await expect(name).toBeFocused();
		await name.fill(`Mine ${i}`);
		await name.press('Enter');
		await expect(formatButton(page, `Mine ${i}`)).toHaveAttribute('aria-pressed', 'true');
		if (i < 5) await expect(page.getByRole('button', { name: 'Save Format' })).toBeDisabled();
	}
	await expect(page.getByRole('button', { name: 'Save Format' })).toHaveCount(0);
	await expect(page.getByText(/You've saved 5 formats/)).toBeVisible();

	await page.reload();
	await expect(formatButton(page, 'Mine 5')).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator('.board .row')).toHaveCount(11);

	// Each save put the format it came from back the way it was saved.
	await formatButton(page, 'Mine 1').click();
	await expect(page.locator('.board .row')).toHaveCount(7);
	await formatButton(page, 'Mine 5').click();

	// Clicking the active custom format renames it.
	await formatButton(page, 'Mine 5').click();
	await page.getByRole('textbox', { name: 'Format name' }).fill('Renamed');
	await page.getByRole('textbox', { name: 'Format name' }).press('Enter');
	await expect(formatButton(page, 'Renamed')).toBeVisible();

	// Delete Format only shows for custom formats, and asks for a second click.
	await page.getByRole('button', { name: 'Delete Format' }).click();
	await page.getByRole('button', { name: 'Confirm delete' }).click();
	await expect(formatButton(page, 'Renamed')).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Save Format' })).toBeVisible();

	// The preset itself was reset to its defaults after saving.
	await formatButton(page, 'Letter Grades').click();
	await expect(page.getByRole('button', { name: 'Delete Format' })).toHaveCount(0);
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
	await expect(page.getByRole('button', { name: 'Save Format' })).toBeEnabled();

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

test('1–32: drop into any slot, occupants slide right, and a team sent back leaves a gap', async ({ page }) => {
	await page.goto('/power-rankings');
	await formatButton(page, '1–32').click();
	const slot = (n: number) => page.getByLabel(`Rank ${n}`, { exact: true });
	const inSlot = (n: number, name: string) => slot(n).locator(`[title$="${name}"]`);

	await drag(page, card(page, 'AFC West pool', 'Kansas City Chiefs'), slot(5));
	await expect(inSlot(5, 'Kansas City Chiefs')).toBeVisible();
	await expect(slot(1).locator('.card')).toHaveCount(0);

	await drag(page, card(page, 'NFC North pool', 'Detroit Lions'), slot(12));
	await expect(inSlot(12, 'Detroit Lions')).toBeVisible();

	// Ranked team onto ranked team: the occupant slides right; the old slot is left empty.
	await drag(page, inSlot(12, 'Detroit Lions'), slot(5));
	await expect(inSlot(5, 'Detroit Lions')).toBeVisible();
	await expect(inSlot(6, 'Kansas City Chiefs')).toBeVisible();
	await expect(slot(12).locator('.card')).toHaveCount(0);

	// Pool team onto a ranked team: the run of teams from there slides right.
	await drag(page, card(page, 'AFC North pool', 'Baltimore Ravens'), slot(5));
	await expect(inSlot(5, 'Baltimore Ravens')).toBeVisible();
	await expect(inSlot(6, 'Detroit Lions')).toBeVisible();
	await expect(inSlot(7, 'Kansas City Chiefs')).toBeVisible();

	// Ranked team back to the pool leaves its slot empty; other ranks don't shift.
	await drag(page, inSlot(5, 'Baltimore Ravens'), page.getByLabel('NFC West pool', { exact: true }));
	await expect(slot(5).locator('.card')).toHaveCount(0);
	await expect(inSlot(7, 'Kansas City Chiefs')).toBeVisible();

	await page.reload();
	await expect(inSlot(6, 'Detroit Lions')).toBeVisible();
	await expect(inSlot(7, 'Kansas City Chiefs')).toBeVisible();
	await expect(page.locator('.slots .card')).toHaveCount(2);
});
