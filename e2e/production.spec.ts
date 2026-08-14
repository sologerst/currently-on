import { test, expect, request as pwRequest } from "@playwright/test";

/**
 * E2E pass against the LIVE production site.
 * Public/unauthenticated checks ONLY — no sign-in or data mutations.
 */

test.describe("Home", () => {
  test("/ loads and shows Currently On brand + category tiles", async ({
    page,
  }) => {
    const resp = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(resp?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: /currently on/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /music/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /friends/i })).toBeVisible();
  });
});

test.describe("Category routes", () => {
  const routes = ["/music", "/tv", "/movies", "/podcasts", "/books", "/friends"];
  for (const route of routes) {
    test(`${route} loads (200)`, async ({ page }) => {
      const resp = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(resp?.status()).toBe(200);
    });
  }
});

test.describe("Utility routes", () => {
  test("/diary loads (200)", async ({ page }) => {
    const resp = await page.goto("/diary", { waitUntil: "domcontentloaded" });
    expect(resp?.status()).toBe(200);
  });

  test("/calendar loads (200)", async ({ page }) => {
    const resp = await page.goto("/calendar", { waitUntil: "domcontentloaded" });
    expect(resp?.status()).toBe(200);
  });

  test("/search loads (200)", async ({ page }) => {
    const resp = await page.goto("/search?q=harbor", {
      waitUntil: "domcontentloaded",
    });
    expect(resp?.status()).toBe(200);
  });
});

test.describe("PWA / infra", () => {
  test("/manifest.webmanifest is 200", async ({ baseURL }) => {
    const ctx = await pwRequest.newContext();
    const resp = await ctx.get((baseURL ?? "") + "/manifest.webmanifest");
    expect(resp.status()).toBe(200);
    const body = await resp.text();
    expect(body).toMatch(/Currently On/i);
    await ctx.dispose();
  });

  test("/sw.js is 200", async ({ baseURL }) => {
    const ctx = await pwRequest.newContext();
    const resp = await ctx.get((baseURL ?? "") + "/sw.js");
    expect(resp.status()).toBe(200);
    await ctx.dispose();
  });
});
