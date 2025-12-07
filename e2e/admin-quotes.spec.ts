import { test, expect } from '@playwright/test';

test.describe('Admin Quotes Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.evaluate(() => {
      localStorage.setItem('durdle_admin_token', 'test-token-12345');
    });

    // Navigate to quotes page
    await page.goto('http://localhost:3000/admin/quotes', {
      waitUntil: 'networkidle',
    });
  });

  test('should display quotes table', async ({ page }) => {
    // Wait for table to load
    await expect(page.locator('table')).toBeVisible();

    // Check that headers are present
    await expect(page.locator('th:has-text("Reference")')).toBeVisible();
    await expect(page.locator('th:has-text("Created")')).toBeVisible();
    await expect(page.locator('th:has-text("Customer")')).toBeVisible();
    await expect(page.locator('th:has-text("Price")')).toBeVisible();
    await expect(page.locator('th:has-text("Status")')).toBeVisible();
  });

  test('should display filters section', async ({ page }) => {
    // Check for filter elements
    await expect(page.locator('text=Quotes')).toBeVisible();
    await expect(page.locator('button:has-text("Apply")')).toBeVisible();
    await expect(page.locator('button:has-text("Clear")')).toBeVisible();
  });

  test('should display export button', async ({ page }) => {
    await expect(page.locator('button:has-text("Export")')).toBeVisible();
  });

  test('should filter quotes by status', async ({ page }) => {
    // Change status filter
    const statusSelect = page.locator('select').first();
    await statusSelect.selectOption('accepted');

    // Click apply button
    await page.locator('button:has-text("Apply")').click();

    // Wait for reload
    await page.waitForLoadState('networkidle');

    // Verify URL contains status parameter
    expect(page.url()).toContain('status=accepted');
  });

  test('should search quotes by text', async ({ page }) => {
    // Type in search field
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await searchInput.fill('john@example.com');

    // Click apply
    await page.locator('button:has-text("Apply")').click();

    // Wait for load
    await page.waitForLoadState('networkidle');

    // Verify URL contains search parameter
    expect(page.url()).toContain('search=');
  });

  test('should sort table by clicking headers', async ({ page }) => {
    // Click Created column header
    await page.locator('th:has-text("Created")').click();

    // Wait for load
    await page.waitForLoadState('networkidle');

    // Verify URL contains sortBy parameter
    expect(page.url()).toContain('sortBy=date');
  });

  test('should toggle sort direction', async ({ page }) => {
    // Click Created column header to sort
    await page.locator('th:has-text("Created")').click();
    await page.waitForLoadState('networkidle');

    // First sort should be descending (default)
    expect(page.url()).toContain('sortOrder=desc');

    // Click again to toggle
    await page.locator('th:has-text("Created")').click();
    await page.waitForLoadState('networkidle');

    // Should now be ascending
    expect(page.url()).toContain('sortOrder=asc');
  });

  test('should paginate through quotes', async ({ page }) => {
    // Check that pagination buttons exist
    await expect(page.locator('button:has-text("Previous")')).toBeVisible();
    await expect(page.locator('button:has-text("Next")')).toBeVisible();

    // Previous button should be disabled initially
    const prevButton = page.locator('button:has-text("Previous")');
    await expect(prevButton).toBeDisabled();

    // Click Next if enabled
    const nextButton = page.locator('button:has-text("Next")');
    const isNextEnabled = await nextButton.isEnabled();

    if (isNextEnabled) {
      await nextButton.click();
      await page.waitForLoadState('networkidle');

      // URL should contain cursor parameter
      expect(page.url()).toContain('cursor=');

      // Previous button should now be enabled
      await expect(prevButton).toBeEnabled();

      // Go back
      await prevButton.click();
      await page.waitForLoadState('networkidle');

      // Cursor parameter should be removed
      expect(page.url()).not.toContain('cursor=');
    }
  });

  test('should open quote details modal on row click', async ({ page }) => {
    // Find first quote row and click
    const firstQuoteRow = page.locator('tbody tr').first();
    await firstQuoteRow.click();

    // Modal should appear
    await expect(page.locator('text=Quote Details')).toBeVisible();

    // Should display quote information
    await expect(page.locator('button:has-text("Close")')).toBeVisible();

    // Close modal
    await page.locator('button:has-text("Close")').click();

    // Modal should disappear
    await expect(page.locator('text=Quote Details')).not.toBeVisible();
  });

  test('should clear all filters', async ({ page }) => {
    // Set some filters
    const statusSelect = page.locator('select').first();
    await statusSelect.selectOption('accepted');
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await searchInput.fill('test');

    // Click Clear
    await page.locator('button:has-text("Clear")').click();

    // Should reload with no filters
    await page.waitForLoadState('networkidle');

    // Status should be reset
    await expect(statusSelect).toHaveValue('all');

    // Search should be empty
    await expect(searchInput).toHaveValue('');
  });

  test('should maintain filters in URL', async ({ page }) => {
    // Navigate with query parameters
    await page.goto(
      'http://localhost:3000/admin/quotes?status=accepted&sortBy=price&sortOrder=asc',
      { waitUntil: 'networkidle' }
    );

    // Filters should be applied
    const statusSelect = page.locator('select').first();
    await expect(statusSelect).toHaveValue('accepted');

    // Sort should reflect in URL
    expect(page.url()).toContain('sortBy=price');
    expect(page.url()).toContain('sortOrder=asc');
  });

  test('should display loading state', async ({ page }) => {
    // Intercept API response to delay it
    await page.route('**/admin/quotes*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.continue();
    });

    // Reload page
    await page.reload();

    // Loading indicator should appear
    await expect(page.locator('text=Loading')).toBeVisible();

    // Wait for content to load
    await expect(page.locator('table')).toBeVisible();
  });

  test('should export quotes as CSV', async ({ page }) => {
    // Start waiting for download before clicking
    const downloadPromise = page.waitForEvent('download');

    // Click export button
    await page.locator('button:has-text("Export")').click();

    // Wait for download
    const download = await downloadPromise;

    // Verify file name
    expect(download.suggestedFilename()).toMatch(/quotes.*\.csv/);
  });

  test('should navigate from sidebar', async ({ page }) => {
    // Home page with sidebar
    await page.goto('http://localhost:3000/admin', {
      waitUntil: 'networkidle',
    });

    // Click Quotes link in sidebar
    await page.locator('a:has-text("Quotes")').click();

    // Should navigate to quotes page
    expect(page.url()).toContain('/admin/quotes');

    // Quotes sidebar item should be highlighted
    const quotesLink = page.locator('a:has-text("Quotes")').first();
    await expect(quotesLink).toHaveClass(/bg-blue-600/);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/admin/quotes*', (route) => {
      route.abort('failed');
    });

    // Reload
    await page.reload();

    // Error message should be displayed
    await expect(page.locator('text=Error')).toBeVisible();
  });
});
