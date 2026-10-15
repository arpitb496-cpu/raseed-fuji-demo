import { test, expect } from "@playwright/test";

test.describe("Merchant Invoice Flow E2E Smoke Test", () => {
  test("sign in via mock SIWE, create invoice, verify in list, download CSV, and cancel it", async ({ page }) => {
    // 1. Sign in via mock SIWE (test-mode only endpoint)
    const loginRes = await page.request.post("/api/auth/mock-test-login", {
      data: {
        address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      },
    });
    expect(loginRes.ok()).toBeTruthy();

    // 2. Visit dashboard
    await page.goto("/app");
    await expect(page).toHaveURL(/\/app/);

    // Verify merchant dashboard metrics exist
    await expect(page.locator("h1")).toBeVisible();

    // 3. Navigate to create invoice
    await page.goto("/app/invoices/new");
    await expect(page).toHaveURL(/\/app\/invoices\/new/);

    // Fill in invoice form using explicit descriptive IDs
    const uniqueTitle = `Consulting Protocol Review ${Date.now()}`;
    await page.fill("#invoice-title-input", uniqueTitle);
    await page.fill("#item-desc-0", "Architecture Security Review");
    await page.fill("#item-price-0", "250.00");

    // Live total check
    await expect(page.locator("text=250.00").first()).toBeVisible();

    // Submit invoice
    await page.click("#create-invoice-submit-btn");

    // 4. Verify redirected to invoice details page
    await page.waitForURL(/\/app\/invoices\/[a-zA-Z0-9_]+/);
    await expect(page.locator("h1")).toContainText(uniqueTitle);
    await expect(page.locator("text=250.00").first()).toBeVisible();

    // Verify share link & QR container
    await expect(page.locator('text=/pay/').first()).toBeVisible();

    // 5. Navigate to invoices list page
    await page.goto("/app/invoices");
    await expect(page.locator("table")).toBeVisible();
    await expect(page.locator(`text=${uniqueTitle}`)).toBeVisible();

    // 6. Test CSV Export download
    const downloadPromise = page.waitForEvent("download");
    await page.click('a[href="/api/invoices/export"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("cryptodao_invoices.csv");

    // 7. Cancel the invoice
    // Go to the newly created invoice detail page
    await page.click(`text=${uniqueTitle}`);
    await page.waitForURL(/\/app\/invoices\/[a-zA-Z0-9_]+/);

    // Handle confirm dialog for cancellation
    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });

    // Click Cancel Invoice button
    await page.click("#cancel-invoice-btn");

    // Verify status updates to CANCELLED and banner displays
    await expect(page.locator("#invoice-status-badge")).toContainText(/Cancelled|रद्द/i);
    await expect(page.locator("#cancelled-banner")).toBeVisible();
  });
});
