import { expect, test } from "@playwright/test";

test("wallet login activates TxLINE and loads the dashboard", async ({ page }) => {
  await page.addInitScript(() => {
    const activationMessages: string[] = [];
    Object.assign(window, {
      __TXLINE_ACTIVATION_MESSAGES__: activationMessages,
      __TXLINE_TEST_WALLET__: {
        publicKey: "4vJ9JU1bJJE96FWSJKvHsmmFbt9sS3TGAz9BqxQYE2jG",
        signMessage: async (message: Uint8Array) => {
          activationMessages.push(new TextDecoder().decode(message));
          return new Uint8Array(64).fill(7);
        },
        subscribe: async () => "tx12345678901234567890123456789012",
      },
    });
  });

  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ status: 401, json: { error: "Unauthorized" } }),
  );
  await page.route("**/api/auth/nonce", (route) =>
    route.fulfill({
      json: {
        nonce: "nonce-1234567890123456",
        issuedAt: "2026-07-17T12:00:00.000Z",
        expiresAt: "2026-07-17T12:05:00.000Z",
        message: "Mock wallet login message",
      },
    }),
  );
  await page.route("**/api/auth/verify", (route) =>
    route.fulfill({
      json: {
        sessionId: "session-id",
        userId: "user-id",
        walletPublicKey: "4vJ9JU1bJJE96FWSJKvHsmmFbt9sS3TGAz9BqxQYE2jG",
      },
    }),
  );
  await page.route("**/api/txline/setup/status**", (route) =>
    route.fulfill({ json: { state: null, network: "devnet" } }),
  );
  await page.route("**/api/txline/setup/start", (route) =>
    route.fulfill({ json: { state: "guest_created", network: "devnet" } }),
  );
  await page.route("**/api/txline/setup/activation-message", async (route) => {
    const body = route.request().postDataJSON() as { txSignature: string };
    expect(body.txSignature).toBe("tx12345678901234567890123456789012");
    await route.fulfill({
      json: { message: `${body.txSignature}::jwt456` },
    });
  });
  await page.route("**/api/txline/setup/activate", async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    expect(body.walletSignature).toBeTruthy();
    const response = { state: "activated", network: "devnet" };
    expect(response).not.toHaveProperty("apiToken");
    await route.fulfill({ json: response });
  });
  await page.route("**/api/txline/fixtures**", (route) =>
    route.fulfill({
      json: [
        {
          fixtureId: 42,
          homeTeam: "Argentina",
          awayTeam: "Spain",
        },
      ],
    }),
  );
  await page.route("**/api/txline/odds/**", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/txline/scores/**", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/txline/history/**", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/txline/stream/**", (route) =>
    route.fulfill({
      contentType: "text/event-stream",
      body: ": heartbeat\n\n",
    }),
  );

  await page.goto("/");
  expect(
    await page.evaluate(
      () => Boolean((window as unknown as { __TXLINE_TEST_WALLET__?: unknown }).__TXLINE_TEST_WALLET__),
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Connect wallet" }).click();
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("button", { name: "Set up TxLINE" }).click();
  await expect(page.getByText("TxLINE ready")).toBeVisible();
  await expect(page.getByText("Argentina vs Spain")).toBeVisible();
  await expect(page.getByText("Live scores")).toBeVisible();
  const activationMessages = await page.evaluate(
    () =>
      (
        window as unknown as {
          __TXLINE_ACTIVATION_MESSAGES__: string[];
        }
      ).__TXLINE_ACTIVATION_MESSAGES__,
  );
  expect(activationMessages).toContain(
    "tx12345678901234567890123456789012::jwt456",
  );
});
