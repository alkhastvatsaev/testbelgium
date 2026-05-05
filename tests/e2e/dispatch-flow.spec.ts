import { test, expect, type Page } from '@playwright/test';

/** CI / fresh env has no Firebase session nor office IP — unlock dashboard via dev gate when shown. */
async function bypassDashboardLoginIfNeeded(page: Page) {
  const devBtn = page.getByRole('button', { name: 'DEV ACCESS' });
  try {
    await devBtn.waitFor({ state: 'visible', timeout: 12000 });
    await devBtn.click();
  } catch {
    // Already authenticated (office IP, Firebase session, or env-specific bypass).
  }
}

test.describe('Dashboard & technician smoke', () => {
  test('dashboard loads: map shell and quote panel', async ({ page }) => {
    await page.goto('/');
    await bypassDashboardLoginIfNeeded(page);

    await expect(page.locator('#map-container')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('#map')).toBeVisible();
    /** Premier libellé stable du panneau devis (`QuoteRequests`). */
    await expect(page.getByText('M. Dupont')).toBeVisible();
  });

  test('Technician mobile view works', async ({ page }) => {
    // Simuler un affichage mobile
    await page.setViewportSize({ width: 375, height: 812 });
    
    // 1. Ouvrir la vue technicien
    await page.goto('/technician');
    
    // 2. Vérifier que l'interface est chargée
    await expect(page.getByText('Je suis en route')).toBeVisible();

    // 3. Cliquer sur le statut "En route"
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Statut mis à jour sur : en_route');
      await dialog.accept();
    });

    await page.getByText('Je suis en route').click();
  });
});
