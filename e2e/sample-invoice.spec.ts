import { test, expect } from "@playwright/test";

test("a visitor can explore partial payments from the home page without a wallet", async ({
  page,
}) => {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/api/")) {
      writes.push(request.url());
    }
  });

  await page.goto("/");
  await page.getByRole("link", { name: "Try a Sample Invoice" }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(
    page.getByText(/All payments on this page are simulated/),
  ).toBeVisible();
  await expect(page.getByTestId("sample-status")).toHaveText(
    "Awaiting payment",
  );
  await expect(page.getByTestId("sample-remaining")).toHaveText("250.00 USDC");

  await page.getByRole("button", { name: "Simulate 100 USDC deposit" }).click();
  await expect(page.getByTestId("sample-status")).toHaveText("Partially paid");
  await expect(page.getByTestId("sample-received")).toHaveText("100.00 USDC");
  await expect(page.getByTestId("sample-remaining")).toHaveText("150.00 USDC");

  await page
    .getByRole("button", { name: "Simulate remaining 150 USDC" })
    .click();
  await expect(page.getByTestId("sample-status")).toHaveText("Paid in sample");
  await expect(page.getByTestId("sample-remaining")).toHaveText("0.00 USDC");
  await expect(
    page.getByRole("heading", { name: "Sample receipt" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open merchant portal" }),
  ).toHaveAttribute("href", "/app");

  await page.getByRole("button", { name: "Restart sample" }).click();
  await expect(page.getByTestId("sample-received")).toHaveText("0.00 USDC");
  await expect(
    page.getByRole("heading", { name: "Sample receipt" }),
  ).toHaveCount(0);
  expect(writes).toEqual([]);

  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/demo?lang=hi");
  await expect(
    page.getByRole("heading", { name: "चालान से भुगतान की रसीद तक।" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "100 USDC अग्रिम भुगतान सिमुलेट करें" })
    .click();
  await expect(page.getByTestId("sample-status")).toHaveText("आंशिक भुगतान");
  await expect(page.getByTestId("sample-remaining")).toHaveText("150.00 USDC");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Toggle menu" }).click();
  await expect(page.getByRole("link", { name: "डैशबोर्ड", exact: true })).toBeVisible();
});
