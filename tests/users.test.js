import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";
import { normalizeUsers, verifyPassword, validateUsers, publicSystem, hasLegacyPasswords, MIN_PASSWORD_LEN } from "../lib/server/users.js";

describe("normalizeUsers", () => {
  it("hashes a plaintext password for a new user and drops the plaintext", async () => {
    const [u] = await normalizeUsers([{ id: 1, username: "a", role: "admin", password: "secret1" }], []);
    expect(u.password).toBeUndefined();
    expect(await bcrypt.compare("secret1", u.passwordHash)).toBe(true);
  });
  it("keeps the existing hash when no password is sent", async () => {
    const hash = await bcrypt.hash("keepme", 4);
    const [u] = await normalizeUsers([{ id: 1, username: "a", role: "admin" }], [{ id: 1, passwordHash: hash }]);
    expect(u.passwordHash).toBe(hash);
  });
  it("migrates a legacy plaintext record to a hash", async () => {
    const [u] = await normalizeUsers([{ id: 2, username: "b", role: "manager" }], [{ id: 2, password: "legacy" }]);
    expect(u.password).toBeUndefined();
    expect(await bcrypt.compare("legacy", u.passwordHash)).toBe(true);
  });
  it("ignores a client-supplied hash and requires a password for unknown users", async () => {
    await expect(normalizeUsers([{ id: 9, username: "x", role: "client", passwordHash: "forged" }], [])).rejects.toThrow("password required");
  });
});

describe("verifyPassword", () => {
  it("accepts hashed and legacy plaintext, rejects everything else", async () => {
    const hashed = { passwordHash: await bcrypt.hash("pw", 4) };
    expect(await verifyPassword(hashed, "pw")).toBe(true);
    expect(await verifyPassword(hashed, "nope")).toBe(false);
    expect(await verifyPassword({ password: "legacy" }, "legacy")).toBe(true);
    expect(await verifyPassword(undefined, "pw")).toBe(false);
    expect(await verifyPassword({ passwordHash: "x" }, 123)).toBe(false);
  });
  it("detects legacy records", () => {
    expect(hasLegacyPasswords([{ passwordHash: "h" }, { password: "p" }])).toBe(true);
    expect(hasLegacyPasswords([{ passwordHash: "h" }])).toBe(false);
  });
});

describe("validateUsers", () => {
  const ok = [{ id: 1, username: "admin", role: "admin" }];
  it("accepts a valid list", () => expect(() => validateUsers(ok)).not.toThrow());
  it("rejects duplicates, bad roles, short passwords and admin-less lists", () => {
    expect(() => validateUsers([...ok, { id: 2, username: "admin", role: "manager" }])).toThrow("duplicate");
    expect(() => validateUsers([{ id: 1, username: "a", role: "root" }])).toThrow("invalid role");
    expect(() => validateUsers([{ id: 1, username: "a", role: "admin", password: "x".repeat(MIN_PASSWORD_LEN - 1) }])).toThrow("at least");
    expect(() => validateUsers([{ id: 1, username: "a", role: "manager" }])).toThrow("admin required");
    expect(() => validateUsers("nope")).toThrow("array");
  });
});

describe("publicSystem", () => {
  const sys = { branches: [{ id: 1 }], users: [{ id: 1, username: "a", role: "admin", password: "p", passwordHash: "h" }] };
  it("strips secrets for admins and hides users from others", () => {
    const a = publicSystem(sys, "admin");
    expect(a.users[0]).toEqual({ id: 1, username: "a", role: "admin" });
    expect(publicSystem(sys, "manager").users).toEqual([]);
    expect(publicSystem(sys, "manager").branches).toEqual(sys.branches);
  });
});
