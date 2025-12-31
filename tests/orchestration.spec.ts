import { test, expect } from '@playwright/test';

test.describe('Agent Orchestration', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/api/auth/me', async route => {
        await route.fulfill({ status: 200, contentType: 'application/json', json: { authenticated: true } });
    });

    // Mock initial session list to be empty or contain default
    await page.route('**/api/jules/sessions', async route => {
         if (route.request().method() === 'GET') {
             await route.fulfill({ status: 200, contentType: 'application/json', json: [] });
         } else {
             await route.continue();
         }
    });

    // Navigate to root
    await page.goto('/');
    
    // Wait for the main layout to render instead of specifically header
    // The AppLayout is wrapped in Suspense, so we wait for something stable
    // Also, we bypass the middleware redirect by adding a dummy session cookie
    const context = page.context();
    await context.addCookies([{
        name: 'session',
        value: 'dummy-session-token-for-testing',
        domain: 'localhost',
        path: '/'
    }]);

    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('can create a new session', async ({ page }) => {
    // Intercept the creation POST request
    await page.route('**/api/jules/sessions', async route => {
        if (route.request().method() === 'POST') {
             const json = {
                id: 'test-session-123',
                title: 'Hello World Task',
                state: 'ACTIVE',
                createTime: new Date().toISOString(),
                sourceContext: { source: 'sources/github/test/repo' }
            };
            await route.fulfill({ status: 201, contentType: 'application/json', json });
        } else {
            await route.continue();
        }
    });

    // Intercept list sessions to include the new one after creation
    // This is tricky because the UI might refetch. 
    // We can update the mock handler dynamically or just respond with the new list if the header refreshes.
    
    // Wait for the "New Session" button to appear.
    // We use the reliable data-testid added to AppHeader
    const newSessionBtn = page.getByTestId('new-session-btn');
    await newSessionBtn.waitFor({ state: 'visible', timeout: 10000 });
    await newSessionBtn.click();
    
    // Expect the creation dialog
    const dialogHeader = page.getByRole('heading', { name: 'New Coding Session' });
    await expect(dialogHeader).toBeVisible();
    
    // Fill out the form
    await page.getByPlaceholder('What should I build?').fill('Create a simple hello world script');
    
    // Click Start Session
    const startBtn = page.getByRole('button', { name: 'Start Session' });
    await startBtn.click();

    // The dialog should close
    await expect(dialogHeader).not.toBeVisible();
  });

  test('can open supervisor settings', async ({ page }) => {
    // 1. Locate the header settings trigger using the testid
    const settingsTrigger = page.getByTestId('settings-dropdown-trigger');
    
    // Ensure it's visible before clicking
    await settingsTrigger.waitFor({ state: 'visible', timeout: 10000 });
    await settingsTrigger.click();

    // 2. Click "Settings" item in the dropdown
    const settingsItem = page.getByRole('menuitem', { name: 'Settings' });
    await settingsItem.waitFor({ state: 'visible' });
    await settingsItem.click();

    // Expect Settings Dialog to be visible
    // We check for the "Session Keeper" tab content or the dialog title
    await expect(page.getByText('Session Keeper')).toBeVisible({ timeout: 10000 });
  });
});
