import { test, expect } from '@playwright/test';

test.describe('Auto-Dispatch Flow', () => {
  test('Dashboard loads correctly and auto-dispatch can be triggered', async ({ page }) => {
    // 1. Ouvrir le tableau de bord
    await page.goto('http://localhost:3000');
    
    // 2. Vérifier que la carte est affichée (timeout 30s pour la 1ère compilation Next.js)
    await expect(page.locator('#map-container')).toBeVisible({ timeout: 30000 });

    // 3. Vérifier que les interventions sont chargées
    await expect(page.getByText('Interventions du Jour')).toBeVisible();
    await expect(page.getByText('En attente')).toBeVisible();

    // 4. Déclencher l'Auto-Dispatch
    const dispatchBtn = page.getByText('Auto-Dispatch').first();
    await expect(dispatchBtn).toBeVisible();
    
    // On écoute l'alerte pour valider l'assignation
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Dispatch Auto');
      await dialog.accept();
    });

    await dispatchBtn.click();
  });

  test('Technician mobile view works', async ({ page }) => {
    // Simuler un affichage mobile
    await page.setViewportSize({ width: 375, height: 812 });
    
    // 1. Ouvrir la vue technicien
    await page.goto('http://localhost:3000/technician');
    
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
