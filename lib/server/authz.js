// 역할별 권한 판정 (순수 함수)
// admin   : 모든 지점 읽기/쓰기, 시스템 설정 변경
// manager : 소속 지점 읽기/쓰기
// client  : 소속 지점 읽기만

export function isAdmin(user) {
  return !!user && user.role === "admin";
}

function ownsBranch(user, branchId) {
  return user.branchId != null && String(user.branchId) === String(branchId);
}

export function canReadBranch(user, branchId) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return ownsBranch(user, branchId);
}

export function canWriteBranch(user, branchId) {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.role === "manager") return ownsBranch(user, branchId);
  return false;
}
