"use client";
import { useState } from "react";
import { TAB_TYPES, EVENT_TYPES, EVENT_CHANNELS, PRIORITY_OPTS, RANK_FIELDS } from "@/src/lib/constants";
import { today } from "@/src/lib/format";
import { Btn, Inp, FF } from "@/src/components/ui";

export function SimpleForm({fields,onSave,initial}){
  const parsed=fields.map(f=>{const[k,r]=f.split(":");const[l,p]=(r||k).split("|");const isDate=/date/i.test(k);const opts=(p&&p.includes(" / ")&&!p.startsWith("예:"))?p.split(" / ").map(s=>s.trim()):null;return{k,l,p,isDate,opts};});
  const[form,setForm]=useState(initial?{...initial}:{});
  return (
    <div>
      {parsed.map(({k,l,p,isDate,opts})=><FF key={k} label={l}>{isDate?(
        <input type="date" max="9999-12-31" value={form[k]||""} onChange={e=>setForm({...form,[k]:e.target.value})} style={{width:"100%",background:"#0f172a",border:"1px solid #334155",borderRadius:8,padding:"10px 12px",color:"#e2e8f0",fontSize:14,outline:"none"}}/>
      ):opts?(
        <div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>
            {opts.map(o=><button key={o} type="button" onClick={()=>setForm({...form,[k]:o})} style={{background:form[k]===o?"#6366f1":"#1e293b",color:form[k]===o?"#fff":"#94a3b8",border:form[k]===o?"1px solid #6366f1":"1px solid #334155",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:13,fontWeight:form[k]===o?700:400,transition:"all 0.15s"}}>{o}</button>)}
          </div>
          <Inp value={form[k]||""} onChange={v=>setForm({...form,[k]:v})} placeholder="직접 입력도 가능"/>
        </div>
      ):(
        <Inp value={form[k]||""} onChange={v=>setForm({...form,[k]:v})} placeholder={p||""}/>
      )}</FF>)}
      <Btn onClick={()=>onSave(form)} style={{width:"100%",marginTop:4}}>저장</Btn>
    </div>
  );
}

export function OfflineForm({fields,onSave,initial}){
  const parsed=fields.map(f=>{const[k,r]=f.split(":");const[l,p]=(r||k).split("|");const opts=(p&&p.includes(" / ")&&!p.startsWith("예:"))?p.split(" / ").map(s=>s.trim()):null;return{k,l,p,opts};});
  const[form,setForm]=useState(initial?{...initial}:{});
  const u=(k,v)=>setForm(prev=>{const nf={...prev,[k]:v};
    if(k==="startDate"||k==="endDate"||k==="totalCost"){
      const s=nf.startDate,e=nf.endDate,tc=+(nf.totalCost||0);
      if(s&&e&&tc){
        const sd=new Date(s),ed=new Date(e);
        const months=Math.max(1,Math.round((ed-sd)/(1000*60*60*24*30.44)*10)/10);
        nf._months=months;nf._monthlyCost=Math.round(tc/months);
      }else{nf._months=null;nf._monthlyCost=null;}
    }
    return nf;
  });
  return (
    <div>
      {parsed.map(({k,l,p,opts})=>(
        <FF key={k} label={l}>
          {(k==="startDate"||k==="endDate")?(
            <input type="date" max="9999-12-31" value={form[k]||""} onChange={e=>u(k,e.target.value)} style={{width:"100%",background:"#0f172a",border:"1px solid #334155",borderRadius:8,padding:"10px 12px",color:"#e2e8f0",fontSize:14,outline:"none"}}/>
          ):opts?(
            <div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>
                {opts.map(o=><button key={o} type="button" onClick={()=>u(k,o)} style={{background:form[k]===o?"#6366f1":"#1e293b",color:form[k]===o?"#fff":"#94a3b8",border:form[k]===o?"1px solid #6366f1":"1px solid #334155",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:13,fontWeight:form[k]===o?700:400,transition:"all 0.15s"}}>{o}</button>)}
              </div>
              <Inp value={form[k]||""} onChange={v=>u(k,v)} placeholder="직접 입력도 가능"/>
            </div>
          ):(
            <Inp value={form[k]||""} onChange={v=>u(k,v)} placeholder={p||""}/>
          )}
        </FF>
      ))}
      <FF label="총 비용 (원)">
        <Inp value={form.totalCost||""} onChange={v=>u("totalCost",v)} placeholder="계약 총 비용"/>
      </FF>
      {form._months&&form._monthlyCost!=null&&(
        <div style={{background:"#1e293b",borderRadius:10,padding:"12px 16px",marginTop:8,marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <span style={{color:"#94a3b8",fontSize:13}}>계약 기간</span>
            <span style={{color:"#e2e8f0",fontWeight:700,fontSize:14}}>{form._months}개월</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{color:"#94a3b8",fontSize:13}}>월 환산 비용</span>
            <span style={{color:"#f59e0b",fontWeight:800,fontSize:16}}>{"\u20A9"+(form._monthlyCost||0).toLocaleString()}</span>
          </div>
        </div>
      )}
      <Btn onClick={()=>{const out={...form};if(form._monthlyCost!=null)out.cost=form._monthlyCost;out.totalCost=+(form.totalCost||0);delete out._months;delete out._monthlyCost;onSave(out);}} style={{width:"100%",marginTop:4}}>저장</Btn>
    </div>
  );
}

export function EventForm({initial,onSave}){
  const[f,setF]=useState({title:initial?.title||"",date:initial?.date||today(),type:initial?.type||"content",channel:initial?.channel||"전체"});
  const u=(k,v)=>setF(p=>({...p,[k]:v}));
  return (
    <div>
      <FF label="일정 제목"><Inp value={f.title} onChange={v=>u("title",v)} placeholder="블로그 포스팅 3건"/></FF>
      <FF label="날짜"><Inp type="date" value={f.date} onChange={v=>u("date",v)}/></FF>
      <FF label="유형">
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {EVENT_TYPES.map(t=>(
            <button key={t.v} onClick={()=>u("type",t.v)} style={{background:f.type===t.v?t.c:"#0f172a",color:f.type===t.v?"#fff":"#94a3b8",border:"1px solid #334155",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>{t.l}</button>
          ))}
        </div>
      </FF>
      <FF label="채널">
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {EVENT_CHANNELS.map(c=>(
            <button key={c} onClick={()=>u("channel",c)} style={{background:f.channel===c?"#6366f1":"#0f172a",color:f.channel===c?"#fff":"#94a3b8",border:"1px solid #334155",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>{c}</button>
          ))}
        </div>
      </FF>
      <Btn onClick={()=>onSave(f)} style={{width:"100%",marginTop:4}}>저장</Btn>
    </div>
  );
}

export function TodoForm({initial,onSave}){
  const[f,setF]=useState({text:initial?.text||"",channel:initial?.channel||"전체",priority:initial?.priority||"medium",dueDate:initial?.dueDate||today()});
  const u=(k,v)=>setF(p=>({...p,[k]:v}));
  return (
    <div>
      <FF label="할 일"><Inp value={f.text} onChange={v=>u("text",v)} placeholder="블로그 포스팅 3건 발행"/></FF>
      <FF label="마감일"><Inp type="date" value={f.dueDate} onChange={v=>u("dueDate",v)}/></FF>
      <FF label="우선순위">
        <div style={{display:"flex",gap:8}}>
          {PRIORITY_OPTS.map(p=>(
            <button key={p.v} onClick={()=>u("priority",p.v)} style={{flex:1,background:f.priority===p.v?p.c:"#0f172a",color:f.priority===p.v?"#fff":"#94a3b8",border:"1px solid #334155",borderRadius:8,padding:"7px",cursor:"pointer",fontSize:12,fontWeight:600}}>{p.l}</button>
          ))}
        </div>
      </FF>
      <FF label="채널">
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {EVENT_CHANNELS.map(c=>(
            <button key={c} onClick={()=>u("channel",c)} style={{background:f.channel===c?"#6366f1":"#0f172a",color:f.channel===c?"#fff":"#94a3b8",border:"1px solid #334155",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>{c}</button>
          ))}
        </div>
      </FF>
      <Btn onClick={()=>onSave(f)} style={{width:"100%",marginTop:4}}>저장</Btn>
    </div>
  );
}

export function AddUserForm({branches,onSave}){
  const[f,setF]=useState({name:"",username:"",password:"",role:"manager",branchId:""});
  const[err,setErr]=useState("");
  const submit=()=>{
    if(!f.name.trim()||!f.username.trim())return setErr("이름과 아이디를 입력하세요.");
    if(/\s/.test(f.username))return setErr("아이디에는 공백을 쓸 수 없습니다.");
    if(f.password.length<6)return setErr("비밀번호는 6자 이상이어야 합니다.");
    if(f.role!=="admin"&&!f.branchId)return setErr("소속 지점을 선택하세요.");
    setErr("");onSave({...f,username:f.username.trim(),name:f.name.trim()});
  };
  return (
    <div>
      <FF label="이름"><Inp value={f.name} onChange={v=>setF({...f,name:v})} placeholder="홍길동"/></FF>
      <FF label="아이디"><Inp value={f.username} onChange={v=>setF({...f,username:v})} placeholder="user1"/></FF>
      <FF label="비밀번호"><Inp value={f.password} onChange={v=>setF({...f,password:v})} placeholder="6자 이상"/></FF>
      <FF label="역할">
        <div style={{display:"flex",gap:8}}>
          {[["admin","통합관리자"],["manager","지점관리자"],["client","클라이언트"]].map(([r,l])=>(
            <button key={r} onClick={()=>setF({...f,role:r})} style={{flex:1,background:f.role===r?"#6366f1":"#0f172a",color:f.role===r?"#fff":"#94a3b8",border:"1px solid #334155",borderRadius:8,padding:"8px",cursor:"pointer",fontSize:13,fontWeight:600}}>{l}</button>
          ))}
        </div>
      </FF>
      {f.role!=="admin"&&(
        <FF label="소속 지점">
          <select value={f.branchId} onChange={e=>setF({...f,branchId:e.target.value})} style={{background:"#0f172a",border:"1px solid #334155",borderRadius:8,padding:"7px 11px",color:"#f1f5f9",fontSize:13,width:"100%"}}>
            <option value="">선택</option>
            {branches.map(b=><option key={b.id} value={b.id}>{b.name} ({b.clinicName})</option>)}
          </select>
        </FF>
      )}
      {err&&<div style={{color:"#ef4444",fontSize:12,marginBottom:12}}>{err}</div>}
      <Btn onClick={submit} style={{width:"100%",marginTop:4}}>추가</Btn>
    </div>
  );
}

export function ChangePasswordForm({onSave}){
  const[p1,setP1]=useState("");
  const[p2,setP2]=useState("");
  const[err,setErr]=useState("");
  const submit=()=>{
    if(p1.length<6)return setErr("비밀번호는 6자 이상이어야 합니다.");
    if(p1!==p2)return setErr("비밀번호가 서로 다릅니다.");
    setErr("");onSave(p1);
  };
  return (
    <div>
      <FF label="새 비밀번호"><Inp type="password" value={p1} onChange={setP1} placeholder="6자 이상"/></FF>
      <FF label="새 비밀번호 확인"><Inp type="password" value={p2} onChange={setP2} placeholder="다시 입력"/></FF>
      {err&&<div style={{color:"#ef4444",fontSize:12,marginBottom:12}}>{err}</div>}
      <Btn onClick={submit} style={{width:"100%",marginTop:4}}>변경</Btn>
    </div>
  );
}

export function PerfForm({onSave}){
  const defP=`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}`;
  const[f,setF]=useState({period:defP,youtube_views:"",shortform_views:"",blog_visits:"",place_views:"",new_reviews:"",cafe_posts:"",notes:""});
  const u=(k,v)=>setF(p=>({...p,[k]:v}));
  return (
    <div>
      <FF label="기간 (YYYY-MM)"><Inp value={f.period} onChange={v=>u("period",v)} placeholder="2025-03"/></FF>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <FF label="유튜브 조회수"><Inp value={f.youtube_views} onChange={v=>u("youtube_views",v)} placeholder="0"/></FF>
        <FF label="숏폼 조회수"><Inp value={f.shortform_views} onChange={v=>u("shortform_views",v)} placeholder="0"/></FF>
        <FF label="블로그 방문수"><Inp value={f.blog_visits} onChange={v=>u("blog_visits",v)} placeholder="0"/></FF>
        <FF label="플레이스 조회수"><Inp value={f.place_views} onChange={v=>u("place_views",v)} placeholder="0"/></FF>
        <FF label="신규 리뷰 수"><Inp value={f.new_reviews} onChange={v=>u("new_reviews",v)} placeholder="0"/></FF>
        <FF label="카페 게시물 수"><Inp value={f.cafe_posts} onChange={v=>u("cafe_posts",v)} placeholder="0"/></FF>
      </div>
      <FF label="메모"><Inp value={f.notes} onChange={v=>u("notes",v)} placeholder="이달 특이사항"/></FF>
      <Btn onClick={()=>onSave({...f,youtube_views:+f.youtube_views||0,shortform_views:+f.shortform_views||0,blog_visits:+f.blog_visits||0,place_views:+f.place_views||0,new_reviews:+f.new_reviews||0,cafe_posts:+f.cafe_posts||0})} style={{width:"100%",marginTop:4}}>저장</Btn>
    </div>
  );
}

export function KwForm({initial={},onSave}){
  const[kw,setKw]=useState(initial.keyword||"");
  const[order,setOrder]=useState(initial.tabOrder||[...TAB_TYPES]);
  const[ranks,setRanks]=useState(()=>{
    const r={};RANK_FIELDS.forEach(f=>{r[f.key]=initial[f.key]||"";});return r;
  });
  const move=(i,d)=>{const a=[...order],n=i+d;if(n<0||n>=a.length)return;[a[i],a[n]]=[a[n],a[i]];setOrder(a);};
  return (
    <div>
      <FF label="키워드"><Inp value={kw} onChange={setKw} placeholder="예: 강남 피부과"/></FF>
      <FF label="검색탭 노출 순서">
        {order.map((tp,i)=>(
          <div key={tp} style={{display:"flex",alignItems:"center",gap:8,background:"#0f172a",borderRadius:6,padding:"6px 10px",marginBottom:4}}>
            <span style={{color:"#6366f1",fontWeight:700,width:20}}>{i+1}</span>
            <span style={{flex:1,fontSize:13}}>{tp}</span>
            <button onClick={()=>move(i,-1)} style={{background:"none",border:"none",color:"#94a3b8",cursor:"pointer",fontSize:14}}>▲</button>
            <button onClick={()=>move(i,1)} style={{background:"none",border:"none",color:"#94a3b8",cursor:"pointer",fontSize:14}}>▼</button>
          </div>
        ))}
      </FF>
      <FF label="상위노출 순위 (예: 1위, 3위, - )">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          {RANK_FIELDS.map(f=>(
            <div key={f.key} style={{background:"#0f172a",borderRadius:8,padding:"8px 10px"}}>
              <div style={{color:f.color,fontSize:11,fontWeight:600,marginBottom:4}}>{f.icon} {f.label}</div>
              <Inp value={ranks[f.key]} onChange={v=>setRanks(p=>({...p,[f.key]:v}))} placeholder="-" style={{textAlign:"center",fontSize:14,fontWeight:700}}/>
            </div>
          ))}
        </div>
      </FF>
      <Btn onClick={()=>onSave({keyword:kw,tabOrder:order,...ranks})} style={{width:"100%",marginTop:4}}>저장</Btn>
    </div>
  );
}

export function MapForm({initial={},onSave}){
  const[f,setF]=useState({keyword:"",naverPlace:"-",google:"-",kakao:"-",...initial});
  const u=(k,v)=>setF(p=>({...p,[k]:v}));
  return (
    <div>
      <FF label="검색 키워드"><Inp value={f.keyword} onChange={v=>u("keyword",v)} placeholder="강남 피부과"/></FF>
      <FF label="네이버 순위"><Inp value={f.naverPlace} onChange={v=>u("naverPlace",v)} placeholder="1위"/></FF>
      <FF label="구글맵 순위"><Inp value={f.google} onChange={v=>u("google",v)} placeholder="3위"/></FF>
      <FF label="카카오맵 순위"><Inp value={f.kakao} onChange={v=>u("kakao",v)} placeholder="2위"/></FF>
      <Btn onClick={()=>onSave(f)} style={{width:"100%",marginTop:4}}>저장</Btn>
    </div>
  );
}

export function ACForm({initial={},onSave}){
  const[kw,setKw]=useState(initial.keyword||"");
  const[nav,setNav]=useState((initial.naver||[]).join("\n"));
  const[ins,setIns]=useState((initial.instagram||[]).join("\n"));
  return (
    <div>
      <FF label="뿌리 키워드"><Inp value={kw} onChange={setKw} placeholder="강남피부과"/></FF>
      <FF label="네이버 자동완성 (한 줄에 하나)"><textarea value={nav} onChange={e=>setNav(e.target.value)} placeholder={"강남피부과 추천\n강남피부과 가격"} style={{background:"#0f172a",border:"1px solid #334155",borderRadius:8,padding:"8px 11px",color:"#f1f5f9",fontSize:13,width:"100%",boxSizing:"border-box",minHeight:80,resize:"vertical"}}/></FF>
      <FF label="인스타 해시태그"><textarea value={ins} onChange={e=>setIns(e.target.value)} placeholder={"강남피부과일상"} style={{background:"#0f172a",border:"1px solid #334155",borderRadius:8,padding:"8px 11px",color:"#f1f5f9",fontSize:13,width:"100%",boxSizing:"border-box",minHeight:80,resize:"vertical"}}/></FF>
      <Btn onClick={()=>onSave({keyword:kw,naver:nav.split("\n").map(s=>s.trim()).filter(Boolean),instagram:ins.split("\n").map(s=>s.trim()).filter(Boolean)})} style={{width:"100%",marginTop:4}}>저장</Btn>
    </div>
  );
}

export function SeoFormInner({initial,existingKws,onSave}){
  const[f,setF]=useState({
    targetKeyword:initial.targetKeyword||"",pageUrl:initial.pageUrl||"/",pageTitle:initial.pageTitle||"",
    metaTitle:initial.metaTitle||"",metaDesc:initial.metaDesc||"",h1Tag:initial.h1Tag||"",
    currentRank:initial.currentRank||"-",targetRank:initial.targetRank||"",
    status:initial.status||"미설정",notes:initial.notes||"",
  });
  const u=(k,v)=>setF(p=>({...p,[k]:v}));
  return (
    <div>
      <FF label="타겟 키워드">
        <Inp value={f.targetKeyword} onChange={v=>u("targetKeyword",v)} placeholder="강남 피부과"/>
        {existingKws.length>0&&(
          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:6}}>
            <span style={{color:"#475569",fontSize:11}}>키워드 목록:</span>
            {existingKws.map((kw,i)=>(
              <button key={i} onClick={()=>u("targetKeyword",kw)} style={{background:f.targetKeyword===kw?"#6366f1":"#1e293b",color:f.targetKeyword===kw?"#fff":"#94a3b8",border:"1px solid #334155",borderRadius:6,padding:"2px 8px",fontSize:11,cursor:"pointer"}}>{kw}</button>
            ))}
          </div>
        )}
      </FF>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <FF label="페이지 URL"><Inp value={f.pageUrl} onChange={v=>u("pageUrl",v)} placeholder="/botox"/></FF>
        <FF label="페이지 제목 (관리용)"><Inp value={f.pageTitle} onChange={v=>u("pageTitle",v)} placeholder="보톡스 페이지"/></FF>
      </div>
      <FF label={<span>Meta Title <span style={{color:f.metaTitle.length>=50&&f.metaTitle.length<=60?"#10b981":f.metaTitle.length>0?"#f59e0b":"#64748b"}}>({f.metaTitle.length}자, 권장 50~60자)</span></span>}>
        <Inp value={f.metaTitle} onChange={v=>u("metaTitle",v)} placeholder="강남 피부과 | OO피부과 - 강남역 도보 3분"/>
      </FF>
      <FF label={<span>Meta Description <span style={{color:f.metaDesc.length>=150&&f.metaDesc.length<=160?"#10b981":f.metaDesc.length>0?"#f59e0b":"#64748b"}}>({f.metaDesc.length}자, 권장 150~160자)</span></span>}>
        <textarea value={f.metaDesc} onChange={e=>u("metaDesc",e.target.value)} placeholder="강남 피부과 전문의 직접 시술. 보톡스, 필러..."
          style={{background:"#0f172a",border:"1px solid #334155",borderRadius:8,padding:"8px 11px",color:"#f1f5f9",fontSize:13,width:"100%",boxSizing:"border-box",minHeight:60,resize:"vertical"}}/>
      </FF>
      <FF label="H1 태그"><Inp value={f.h1Tag} onChange={v=>u("h1Tag",v)} placeholder="강남 피부과 전문 OO피부과"/></FF>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
        <FF label="현재 순위"><Inp value={f.currentRank} onChange={v=>u("currentRank",v)} placeholder="5위"/></FF>
        <FF label="목표 순위"><Inp value={f.targetRank} onChange={v=>u("targetRank",v)} placeholder="1위"/></FF>
        <FF label="상태">
          <div style={{display:"flex",gap:4}}>
            {["설정완료","수정필요","미설정"].map(s=>(
              <button key={s} onClick={()=>u("status",s)} style={{flex:1,background:f.status===s?(s==="설정완료"?"#10b981":s==="수정필요"?"#f59e0b":"#ef4444"):"#0f172a",color:f.status===s?"#fff":"#94a3b8",border:"1px solid #334155",borderRadius:6,padding:"6px",cursor:"pointer",fontSize:12,fontWeight:600}}>{s}</button>
            ))}
          </div>
        </FF>
      </div>
      <FF label="메모"><Inp value={f.notes} onChange={v=>u("notes",v)} placeholder="추가 작업 사항"/></FF>
      <Btn onClick={()=>onSave(f)} style={{width:"100%",marginTop:4}}>저장</Btn>
    </div>
  );
}
