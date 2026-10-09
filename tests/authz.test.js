import { describe, it, expect } from "vitest";
import { isAdmin, canReadBranch, canWriteBranch } from "../lib/server/authz.js";

const admin = { role: "admin", branchId: null };
const manager = { role: "manager", branchId: 1774841405455 };
const client = { role: "client", branchId: "1774841405455" };

describe("authz", () => {
  it("admin can do everything", () => {
    expect(isAdmin(admin)).toBe(true);
    expect(canReadBranch(admin, 1)).toBe(true);
    expect(canWriteBranch(admin, "anything")).toBe(true);
  });
  it("manager can read/write only own branch (id compared as string)", () => {
    expect(canReadBranch(manager, "1774841405455")).toBe(true);
    expect(canWriteBranch(manager, 1774841405455)).toBe(true);
    expect(canReadBranch(manager, 1)).toBe(false);
    expect(canWriteBranch(manager, 1)).toBe(false);
    expect(isAdmin(manager)).toBe(false);
  });
  it("client can read own branch but never write", () => {
    expect(canReadBranch(client, 1774841405455)).toBe(true);
    expect(canWriteBranch(client, 1774841405455)).toBe(false);
    expect(canReadBranch(client, 2)).toBe(false);
  });
  it("missing user or branch is denied", () => {
    expect(canReadBranch(null, 1)).toBe(false);
    expect(canReadBranch({ role: "manager", branchId: null }, 1)).toBe(false);
    expect(canWriteBranch(undefined, 1)).toBe(false);
  });
});
