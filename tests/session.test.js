import { describe, it, expect } from "vitest";
import { signSession, verifySession, parseCookies, sessionCookie, clearSessionCookie, COOKIE_NAME } from "../lib/server/session.js";

const secret = "test-secret-".padEnd(48, "x");
const user = { id: 7, username: "admin", role: "admin" };

describe("session token", () => {
  it("round-trips subject, username and role", async () => {
    const token = await signSession(user, { secret });
    const payload = await verifySession(token, { secret });
    expect(payload.sub).toBe("7");
    expect(payload.username).toBe("admin");
    expect(payload.role).toBe("admin");
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });
  it("rejects a tampered token and a wrong secret", async () => {
    const token = await signSession(user, { secret });
    await expect(verifySession(token.slice(0, -2) + "zz", { secret })).rejects.toThrow();
    await expect(verifySession(token, { secret: "another-secret-".padEnd(48, "y") })).rejects.toThrow();
  });
  it("rejects an expired token", async () => {
    const token = await signSession(user, { secret, expiresIn: Math.floor(Date.now() / 1000) - 10 });
    await expect(verifySession(token, { secret })).rejects.toThrow();
  });
  it("refuses a short secret", async () => {
    await expect(signSession(user, { secret: "short" })).rejects.toThrow("AUTH_SECRET");
  });
});

describe("cookies", () => {
  it("parses the session cookie out of a header", () => {
    const c = parseCookies(`a=1; ${COOKIE_NAME}=abc%20d; b=2`);
    expect(c[COOKIE_NAME]).toBe("abc d");
    expect(c.a).toBe("1");
    expect(parseCookies(null)).toEqual({});
  });
  it("sets and clears an httpOnly cookie", () => {
    const set = sessionCookie("tok");
    expect(set).toContain(`${COOKIE_NAME}=tok`);
    expect(set).toContain("HttpOnly");
    expect(set).toContain("SameSite=Lax");
    expect(clearSessionCookie()).toContain("Max-Age=0");
  });
});
