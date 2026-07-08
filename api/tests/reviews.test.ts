import { describe, it, expect } from "vitest";
import app from "../src/index";
import { env, jsonAuth, makeUser } from "./helpers";
import {
  createReviewCase,
  createReviewPanel,
  createPanelMember,
  createGuideReviewCase,
} from "./factories/reviews";
import {
  createGuideBase,
  createGuide,
  createGuideRevision,
} from "./factories/guides";
import { expectToMatchSpec } from "./openapi";

async function seedQueueCase(userId: string, title: string) {
  const base = await createGuideBase();
  const guide = await createGuide(base.id);
  const revision = await createGuideRevision(guide.id, { title });
  const reviewCase = await createReviewCase(userId, {
    case_type: "guide_publish",
  });
  const panel = await createReviewPanel(reviewCase.id);
  await createPanelMember(panel.id, userId);
  await createGuideReviewCase(reviewCase.id, revision.id);
  return reviewCase;
}

describe("GET /reviews/queue", () => {
  it("401s without a token", async () => {
    const res = await app.request("/reviews/queue", {}, env);
    expect(res.status).toBe(401);
    await expectToMatchSpec(res, "GET", "/reviews/queue");
  });

  it("returns a case where the caller is an assigned panelist", async () => {
    const { token, userId } = await makeUser();
    const reviewCase = await seedQueueCase(userId, "Calculus");

    const res = await app.request(
      "/reviews/queue",
      { headers: { Authorization: `Bearer ${token}` } },
      env
    );

    expect(res.status).toBe(200);
    await expectToMatchSpec(res, "GET", "/reviews/queue");
    const body = (await res.json()) as {
      cases: Array<{ id: string; title: string }>;
    };
    const mine = body.cases.find((c) => c.id === reviewCase.id);
    expect(mine?.title).toBe("Calculus");
  });

  it("omits cases where the caller has no seat", async () => {
    const { userId } = await makeUser();
    const { token } = await makeUser(); // different caller, no seat
    const reviewCase = await seedQueueCase(userId, "Calculus");

    const res = await app.request(
      "/reviews/queue",
      { headers: { Authorization: `Bearer ${token}` } },
      env
    );

    expect(res.status).toBe(200);
    await expectToMatchSpec(res, "GET", "/reviews/queue");
    const body = (await res.json()) as { cases: Array<{ id: string }> };
    expect(body.cases.map((c) => c.id)).not.toContain(reviewCase.id);
  });
});

describe("GET /reviews/cases", () => {
  it("lists review cases", async () => {
    const { userId } = await makeUser();
    const reviewCase = await seedQueueCase(userId, "Statistics");

    const res = await app.request("/reviews/cases", {}, env);

    expect(res.status).toBe(200);
    await expectToMatchSpec(res, "GET", "/reviews/cases");
    const body = (await res.json()) as { cases: Array<{ id: string }> };
    expect(body.cases.map((c) => c.id)).toContain(reviewCase.id);
  });
});

describe("GET /reviews/cases/{id}", () => {
  it("returns a case with its panel and decisions", async () => {
    const { userId } = await makeUser();
    const reviewCase = await seedQueueCase(userId, "Statistics");

    const res = await app.request(`/reviews/cases/${reviewCase.id}`, {}, env);

    expect(res.status).toBe(200);
    await expectToMatchSpec(res, "GET", "/reviews/cases/{id}");
    const body = (await res.json()) as { case: { id: string } };
    expect(body.case.id).toBe(reviewCase.id);
  });
});

describe("POST /reviews/cases/{id}/decisions", () => {
  it("401s without a token", async () => {
    const res = await app.request(
      `/reviews/cases/${crypto.randomUUID()}/decisions`,
      { method: "POST" },
      env
    );
    expect(res.status).toBe(401);
    await expectToMatchSpec(res, "POST", "/reviews/cases/{id}/decisions");
  });

  it("records an approving decision for an assigned panelist", async () => {
    const { token, userId } = await makeUser();
    const reviewCase = await seedQueueCase(userId, "Statistics");

    const res = await app.request(
      `/reviews/cases/${reviewCase.id}/decisions`,
      jsonAuth(token, "POST", {
        decision: "approved",
        justification: "Clear and accurate.",
      }),
      env
    );

    expect(res.status).toBe(201);
    await expectToMatchSpec(res, "POST", "/reviews/cases/{id}/decisions");
  });
});
