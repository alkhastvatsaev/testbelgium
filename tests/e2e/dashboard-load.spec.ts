import { test, expect } from '@playwright/test';

test.describe('Dashboard Rail System Layout', () => {
  test('loads the dashboard and renders the 3 main panels correctly', async ({ page }) => {
    // Navigate to the root
    await page.goto('/');

    // Ensure the page title is correct (or at least loaded)
    await expect(page).toHaveTitle(/testbelgiquepwa|belgmap/i);

    // Verify the Global Header is present
    const header = page.locator('header[data-testid="dashboard-global-header"]');
    await expect(header).toBeVisible();

    // Verify the central map container is present
    const mapContainer = page.locator('#map-container');
    await expect(mapContainer).toBeVisible();

    // Verify the Galaxy Dock is present (bottom UI)
    const galaxyDock = page.locator('div[data-testid="dashboard-galaxy-dock"]');
    await expect(galaxyDock).toBeVisible();
  });
});
