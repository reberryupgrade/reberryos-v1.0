"use client";
import { Btn, Inp, FF } from "@/src/components/ui";
import { ClientPortal } from "@/src/components/ClientPortal";

export function PortalTab({budgetTotal,data,portalView,setData,setPortalView,updN}){
  return (
            <div>
              {!portalView?(
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
                    <div><div style={{fontWeight:800,fontSize:16}}>클라이언트 포털 설정</div><div style={{color:"#64748b",fontSize:12,marginTop:2}}>고객사에게 보여줄 보고서를 설정합니다</div></div>
                    <Btn onClick={()=>setPortalView(true)} color="#6366f1">👁 포털 미리보기</Btn>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
                    <div style={{background:"#1e293b",borderRadius:12,padding:"16px 18px"}}>
                      <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>기본 정보</div>
                      <FF label="병원/클라이언트명"><Inp value={data.portalConfig?.clinicName||""} onChange={v=>updN("portalConfig","clinicName",v)}/></FF>
                      <FF label="보고 기간"><Inp value={data.portalConfig?.reportMonth||""} onChange={v=>updN("portalConfig","reportMonth",v)}/></FF>
                      <FF label="담당자명"><Inp value={data.portalConfig?.managerName||""} onChange={v=>updN("portalConfig","managerName",v)}/></FF>
                      <FF label="로고 이모지"><Inp value={data.portalConfig?.logoText||""} onChange={v=>updN("portalConfig","logoText",v)}/></FF>
                    </div>
                    <div style={{background:"#1e293b",borderRadius:12,padding:"16px 18px"}}>
                      <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>공개 항목</div>
                      {[{key:"showKeywords",label:"키워드 순위"},{key:"showMaps",label:"지도 순위"},{key:"showYoutube",label:"유튜브"},{key:"showShortform",label:"숏폼"},{key:"showReviews",label:"리뷰 현황"},{key:"showCafes",label:"카페 바이럴"},{key:"showBudget",label:"마케팅 비용 (민감)"}].map(item=>(
                        <div key={item.key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                          <span style={{fontSize:13}}>{item.label}</span>
                          <button onClick={()=>setData(d=>({...d,portalConfig:{...d.portalConfig,[item.key]:!d.portalConfig?.[item.key]}}))}
                            style={{background:data.portalConfig?.[item.key]?"#10b981":"#334155",border:"none",borderRadius:99,padding:"4px 16px",cursor:"pointer",color:"#fff",fontSize:12,fontWeight:600}}>{data.portalConfig?.[item.key]?"공개":"비공개"}</button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{background:"#1e293b",borderRadius:12,padding:"16px 18px"}}>
                    <FF label="클라이언트 메모">
                      <textarea value={data.portalConfig?.memo||""} onChange={e=>setData(d=>({...d,portalConfig:{...d.portalConfig,memo:e.target.value}}))}
                        placeholder="안녕하세요! 이번 달 보고서입니다..." style={{background:"#0f172a",border:"1px solid #334155",borderRadius:8,padding:"10px 12px",color:"#f1f5f9",fontSize:13,width:"100%",boxSizing:"border-box",minHeight:80,resize:"vertical"}}/>
                    </FF>
                  </div>
                </div>
              ):(
                <ClientPortal data={data} onClose={()=>setPortalView(false)} budgetTotal={budgetTotal}/>
              )}
            </div>
  );
}
