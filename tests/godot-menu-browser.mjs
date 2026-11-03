import assert from 'node:assert/strict';

// Music, Sounds, About, Before These Streets and the hub's three settings are rows behind Menu (docs/HUD_REDESIGN_PLAN.md 3).
// useMenuRow opens the menu with a real press of Menu, presses the row, and closes the menu again with Escape (a second
// press of Menu this soon would be a settled repeat). tap is the journey's own real-input tap for a snapshot control.
const snap = page => page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
const frames = async (page, n) => { const f = (await snap(page)).ui_frame; await page.waitForFunction(({ f, n }) => window.__tenderloinGodotA11ySnapshot.ui_frame > f + n, { f, n }); };

export async function openMenu(page, tap) {
  if ((await snap(page)).menu.open) return;
  await tap((await snap(page)).menu.button);
  await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot.menu.open);
}

export async function useMenuRow(page, key, tap, { keepOpen = false } = {}) {
  await openMenu(page, tap);
  const s = await snap(page), row = key.includes('.') ? key.split('.').reduce((v, k) => v?.[k], s) : s[key];
  assert.ok(row?.visible && row.width >= 44 && row.height >= 44 && row.x >= 0 && row.y >= 0 && row.x + row.width <= s.viewport_width + 1 && row.y + row.height <= s.viewport_height + 1, `${key} is an on-screen 44px menu row`);
  await tap(row);
  await frames(page, 3);
  if (!keepOpen) await closeMenu(page);
}

export async function closeMenu(page) {
  for (let i = 0; i < 2 && (await snap(page)).menu.open; i++) { await page.keyboard.press('Escape'); await frames(page, 2); }
  assert.ok(!(await snap(page)).menu.open, 'Escape closes the menu (About first goes back to its rows)');
}
