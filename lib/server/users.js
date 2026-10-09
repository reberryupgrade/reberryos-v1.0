import bcrypt from "bcryptjs";

const ROUNDS = 10;
export const MIN_PASSWORD_LEN = 6;
const ROLES = ["admin", "manager", "client"];

// DB 가 완전히 비어 있을 때만 쓰이는 초기 계정. 첫 로그인 후 바로 비밀번호를 바꿀 것.
export const BOOTSTRAP_SYSTEM = {
  users: [{ id: 1, username: "admin", password: "admin", role: "admin", name: "통합관리자", branchId: null }],
  branches: [],
};

export function publicUser(u) {
  const { password, passwordHash, ...rest } = u;
  return rest;
}

// 클라이언트에 내려줄 시스템 객체. 관리자가 아니면 사용자 목록은 비운다.
export function publicSystem(sys, role) {
  const users = role === "admin" ? (sys.users || []).map(publicUser) : [];
  return { ...sys, users };
}

export function hashPassword(pw) {
  return bcrypt.hash(pw, ROUNDS);
}

export async function verifyPassword(user, pw) {
  if (!user || typeof pw !== "string") return false;
  if (typeof user.passwordHash === "string") return bcrypt.compare(pw, user.passwordHash);
  if (typeof user.password === "string") return user.password === pw; // 아직 해시로 이전되지 않은 레거시 계정
  return false;
}

export function hasLegacyPasswords(users) {
  return (users || []).some((u) => typeof u.password === "string");
}

export function validateUsers(users) {
  if (!Array.isArray(users)) throw new Error("users must be an array");
  const seen = new Set();
  for (const u of users) {
    if (!u || typeof u.username !== "string" || !u.username.trim()) throw new Error("username required");
    if (seen.has(u.username)) throw new Error(`duplicate username: ${u.username}`);
    seen.add(u.username);
    if (!ROLES.includes(u.role)) throw new Error(`invalid role for ${u.username}`);
    if (typeof u.password === "string" && u.password.length < MIN_PASSWORD_LEN) {
      throw new Error(`password for ${u.username} must be at least ${MIN_PASSWORD_LEN} chars`);
    }
  }
  if (!users.some((u) => u.role === "admin")) throw new Error("at least one admin required");
}

// 저장 직전 사용자 목록 정규화.
// - 평문 password 가 오면 해시로 바꾼다 (신규 사용자, 비밀번호 변경)
// - 없으면 기존 해시를 그대로 유지한다
// - 기존 레코드가 레거시 평문이면 이 기회에 해시로 이전한다
// - 클라이언트가 보낸 passwordHash 는 무시한다 (위조 방지)
export async function normalizeUsers(incoming, existing) {
  const byId = new Map((existing || []).map((u) => [String(u.id), u]));
  const out = [];
  for (const u of incoming || []) {
    const prev = byId.get(String(u.id));
    const { password, passwordHash: _clientHash, ...rest } = u;
    if (typeof password === "string" && password.length > 0) {
      out.push({ ...rest, passwordHash: await hashPassword(password) });
    } else if (typeof prev?.passwordHash === "string") {
      out.push({ ...rest, passwordHash: prev.passwordHash });
    } else if (typeof prev?.password === "string") {
      out.push({ ...rest, passwordHash: await hashPassword(prev.password) });
    } else {
      throw new Error(`password required for user ${u.username || u.id}`);
    }
  }
  return out;
}
