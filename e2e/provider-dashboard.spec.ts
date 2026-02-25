import { test, expect } from '@playwright/test';

test.describe('Provider Dashboard Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Mock authentication by creating a session directly
        await page.goto('/login');
        await page.locator('input[type="password"]').fill('test-playwright-key');
        await page.getByRole('button', { name: 'Login' }).click();
        await page.waitForURL('**/dashboard**');
    });

    test('should navigate to provider dashboard and verify components', async ({ page }) => {
        // Navigate to the providers dashboard
        await page.goto('/dashboard/providers');

        // Verify the page title
        await expect(page.locator('h1')).toContainText('Provider Connectivity');

        // Look for the Active Configuration card
        await expect(page.locator('text=Active Configuration')).toBeVisible();

        // The component should list standard providers like "OpenAI" or "Jules"
        await expect(page.locator('text=Jules')).toBeVisible();

        // Verify that "Session Authentication" UI string is present (Phase 7 fix validation)
        await expect(page.getByText('Session Authentication', { exact: false })).toBeVisible();
    });
});
