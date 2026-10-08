import { notify } from "@/src/components/feedback";



// 서버 API 호출 공통 래퍼. 세션 쿠키가 자동으로 실리고, 권한 검사는 서버가 한다.
export async function api(path,{method="GET",body}={}){
  let r;
  try{
    r=await fetch(path,{method,credentials:"same-origin",headers:body?{"Content-Type":"application/json"}:{},body:body?JSON.stringify(body):undefined});
  }catch(e){
    return {ok:false,status:0,body:{error:"네트워크 오류: "+e.message}};
  }
  let data=null;
  try{data=await r.json();}catch{}
  return {ok:r.ok,status:r.status,body:data};
}

// YouTube Data API 는 서버 프록시(/api/youtube)를 거친다. API 키는 서버에만 있다.
export async function ytApi(endpoint,params){
  const qs=new URLSearchParams({endpoint,...params}).toString();
  const r=await api("/api/youtube?"+qs);
  return r.body||{};
}

// Storage (서버 API 경유. 세션 쿠키로 인증되고 역할별 권한은 서버가 검사한다)
export async function loadSys(){const r=await api("/api/storage/sys");return r.ok?r.body.value:null;}

export async function saveSys(d){
  const r=await api("/api/storage/sys",{method:"PUT",body:{value:d}});
  if(!r.ok)notify("설정 저장 실패: "+(r.body?.error||"HTTP "+r.status));
  return r;
}

// 성공 시 {value,updatedAt}, 없거나 권한이 없으면 null
export async function loadBranch(id){const r=await api(`/api/storage/branch/${id}`);return r.ok?r.body:null;}

// baseUpdatedAt: 불러왔을 때의 updatedAt. 서버 저장본이 그 뒤에 바뀌었으면 409 로 거절된다.
export async function saveBranch(id,d,{baseUpdatedAt,force}={}){
  return api(`/api/storage/branch/${id}`,{method:"PUT",body:{value:d,baseUpdatedAt,force:!!force}});
}

export async function deleteBranch(id){return api(`/api/storage/branch/${id}`,{method:"DELETE"});}
