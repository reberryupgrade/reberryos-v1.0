"use client";
import { CHANNEL_COLORS } from "@/src/lib/constants";
import { today } from "@/src/lib/format";
import { Btn, DelBtn, Modal, SectionWithCost, RankBadge } from "@/src/components/ui";
import { SeoFormInner } from "@/src/components/forms";

export function SeoTab({data,modal,setModal,upd}){
  return (
            <div>
              <SectionWithCost title="홈페이지 SEO" costLabel="SEO 월 관리비" cost={data.seoCost} onCostChange={v=>upd("seoCost",v)} color={CHANNEL_COLORS.seo} right={<Btn onClick={()=>setModal("addSeo")}>+ 페이지 추가</Btn>}>

                {/* Summary */}
                {(()=>{
                  const pages=data.seoPages||[];
                  const done=pages.filter(p=>p.status==="설정완료").length;
                  const need=pages.filter(p=>p.status==="수정필요").length;
                  const none=pages.filter(p=>p.status==="미설정").length;
                  const checkKeys=["titleLen","descLen","h1Has","altText","internalLink","schema","mobileOpt","pageSpeed","ssl","sitemap"];
                  const totalChecks=pages.length*checkKeys.length;
                  const passedChecks=pages.reduce((a,p)=>a+checkKeys.filter(k=>p.seoChecklist?.[k]).length,0);
                  return (
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10,marginBottom:20}}>
                      <div style={{background:"#1e293b",borderRadius:12,padding:"14px 16px"}}>
                        <div style={{color:"#94a3b8",fontSize:11}}>전체 페이지</div>
                        <div style={{color:"#0ea5e9",fontSize:24,fontWeight:800}}>{pages.length}</div>
                      </div>
                      <div style={{background:"#1e293b",borderRadius:12,padding:"14px 16px"}}>
                        <div style={{color:"#94a3b8",fontSize:11}}>✅ 설정완료</div>
                        <div style={{color:"#10b981",fontSize:24,fontWeight:800}}>{done}</div>
                      </div>
                      <div style={{background:"#1e293b",borderRadius:12,padding:"14px 16px"}}>
                        <div style={{color:"#94a3b8",fontSize:11}}>⚠️ 수정필요</div>
                        <div style={{color:"#f59e0b",fontSize:24,fontWeight:800}}>{need}</div>
                      </div>
                      <div style={{background:"#1e293b",borderRadius:12,padding:"14px 16px"}}>
                        <div style={{color:"#94a3b8",fontSize:11}}>❌ 미설정</div>
                        <div style={{color:"#ef4444",fontSize:24,fontWeight:800}}>{none}</div>
                      </div>
                      <div style={{background:"#1e293b",borderRadius:12,padding:"14px 16px"}}>
                        <div style={{color:"#94a3b8",fontSize:11}}>SEO 점수</div>
                        <div style={{color:passedChecks/totalChecks>=0.8?"#10b981":passedChecks/totalChecks>=0.5?"#f59e0b":"#ef4444",fontSize:24,fontWeight:800}}>{totalChecks>0?Math.round(passedChecks/totalChecks*100):0}%</div>
                      </div>
                    </div>
                  );
                })()}

                {/* Page Cards */}
                {(data.seoPages||[]).map(page=>{
                  const checkItems=[
                    {key:"titleLen",label:"Meta Title (50~60자)",icon:"📌"},
                    {key:"descLen",label:"Meta Desc (150~160자)",icon:"📝"},
                    {key:"h1Has",label:"H1에 키워드 포함",icon:"🏷️"},
                    {key:"altText",label:"이미지 Alt 텍스트",icon:"🖼️"},
                    {key:"internalLink",label:"내부 링크 구조",icon:"🔗"},
                    {key:"schema",label:"Schema 마크업",icon:"📊"},
                    {key:"mobileOpt",label:"모바일 최적화",icon:"📱"},
                    {key:"pageSpeed",label:"페이지 속도",icon:"⚡"},
                    {key:"ssl",label:"SSL (HTTPS)",icon:"🔒"},
                    {key:"sitemap",label:"사이트맵 등록",icon:"🗺️"},
                  ];
                  const passed=checkItems.filter(c=>page.seoChecklist?.[c.key]).length;
                  const score=Math.round(passed/checkItems.length*100);
                  const statusColor=page.status==="설정완료"?"#10b981":page.status==="수정필요"?"#f59e0b":"#ef4444";
                  const statusBg=page.status==="설정완료"?"#022c22":page.status==="수정필요"?"#422006":"#2d0f0f";
                  return (
                    <div key={page.id} style={{background:"#0f172a",borderRadius:14,marginBottom:16,overflow:"hidden",border:`1px solid ${statusColor}33`}}>
                      {/* Header */}
                      <div style={{background:statusBg,padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div style={{display:"flex",alignItems:"center",gap:12}}>
                          <span style={{background:statusColor,color:"#fff",borderRadius:8,padding:"4px 12px",fontSize:12,fontWeight:700}}>{page.status}</span>
                          <div>
                            <div style={{fontWeight:800,fontSize:15}}>{page.targetKeyword}</div>
                            <div style={{color:"#64748b",fontSize:12,marginTop:2}}>{page.pageTitle} · <span style={{color:"#0ea5e9"}}>{page.pageUrl}</span></div>
                          </div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <div style={{textAlign:"right"}}>
                            <div style={{color:"#64748b",fontSize:10}}>현재 → 목표</div>
                            <div style={{display:"flex",alignItems:"center",gap:4}}>
                              <RankBadge value={page.currentRank} color="#f59e0b"/>
                              <span style={{color:"#475569"}}>→</span>
                              <RankBadge value={page.targetRank} color="#10b981"/>
                            </div>
                          </div>
                          <button onClick={()=>setModal({type:"editSeo",item:page})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:12}}>편집</button>
                          <DelBtn onClick={()=>upd("seoPages",(data.seoPages||[]).filter(p=>p.id!==page.id))}/>
                        </div>
                      </div>
                      {/* Meta Info */}
                      <div style={{padding:"14px 20px",borderBottom:"1px solid #1e293b"}}>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                          <div>
                            <div style={{color:"#64748b",fontSize:10,marginBottom:3}}>Meta Title {page.metaTitle&&<span style={{color:page.metaTitle.length>=50&&page.metaTitle.length<=60?"#10b981":"#f59e0b"}}>({page.metaTitle.length}자)</span>}</div>
                            <div style={{color:page.metaTitle?"#e2e8f0":"#334155",fontSize:13,fontWeight:600,background:"#1e293b",borderRadius:6,padding:"6px 10px",minHeight:20}}>{page.metaTitle||"미설정"}</div>
                          </div>
                          <div>
                            <div style={{color:"#64748b",fontSize:10,marginBottom:3}}>H1 태그</div>
                            <div style={{color:page.h1Tag?"#e2e8f0":"#334155",fontSize:13,fontWeight:600,background:"#1e293b",borderRadius:6,padding:"6px 10px",minHeight:20}}>{page.h1Tag||"미설정"}</div>
                          </div>
                        </div>
                        <div style={{marginTop:8}}>
                          <div style={{color:"#64748b",fontSize:10,marginBottom:3}}>Meta Description {page.metaDesc&&<span style={{color:page.metaDesc.length>=150&&page.metaDesc.length<=160?"#10b981":"#f59e0b"}}>({page.metaDesc.length}자)</span>}</div>
                          <div style={{color:page.metaDesc?"#94a3b8":"#334155",fontSize:12,background:"#1e293b",borderRadius:6,padding:"6px 10px",minHeight:20}}>{page.metaDesc||"미설정"}</div>
                        </div>
                        {page.notes&&<div style={{marginTop:8,color:"#64748b",fontSize:12,fontStyle:"italic"}}>💡 {page.notes}</div>}
                      </div>
                      {/* SEO Checklist */}
                      <div style={{padding:"14px 20px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                          <span style={{color:"#94a3b8",fontSize:12,fontWeight:600}}>SEO 체크리스트</span>
                          <span style={{color:score>=80?"#10b981":score>=50?"#f59e0b":"#ef4444",fontWeight:800,fontSize:13}}>{score}% ({passed}/{checkItems.length})</span>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:6}}>
                          {checkItems.map(c=>{
                            const ok=page.seoChecklist?.[c.key];
                            return (
                              <button key={c.key} onClick={()=>upd("seoPages",(data.seoPages||[]).map(p=>p.id===page.id?{...p,seoChecklist:{...p.seoChecklist,[c.key]:!ok}}:p))}
                                style={{display:"flex",alignItems:"center",gap:6,background:ok?"#022c2288":"#1e293b",border:`1px solid ${ok?"#10b98144":"#33415544"}`,borderRadius:8,padding:"6px 10px",cursor:"pointer",textAlign:"left"}}>
                                <span style={{fontSize:14,width:18,textAlign:"center"}}>{ok?"✅":"⬜"}</span>
                                <span style={{color:ok?"#10b981":"#64748b",fontSize:12,fontWeight:ok?600:400}}>{c.icon} {c.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Empty State */}
                {!(data.seoPages||[]).length&&(
                  <div style={{background:"#1e293b",borderRadius:14,padding:"40px 20px",textAlign:"center"}}>
                    <div style={{fontSize:40,marginBottom:12}}>🌐</div>
                    <div style={{color:"#94a3b8",fontSize:14}}>등록된 SEO 페이지가 없습니다</div>
                    <div style={{color:"#64748b",fontSize:12,marginTop:4}}>상위노출할 키워드별로 페이지를 추가하세요</div>
                  </div>
                )}
              </SectionWithCost>

              {/* SEO Form Modal */}
              {(modal==="addSeo"||modal?.type==="editSeo")&&(
                <Modal title={modal==="addSeo"?"🌐 SEO 페이지 추가":"🌐 SEO 페이지 편집"} onClose={()=>setModal(null)} wide>
                  <SeoFormInner initial={modal?.item||{}} existingKws={(data.keywords||[]).map(k=>k.keyword)} onSave={(f)=>{
                    const init=modal?.item||{};
                    const entry={...f,seoChecklist:init.seoChecklist||{titleLen:false,descLen:false,h1Has:false,altText:false,internalLink:false,schema:false,mobileOpt:false,pageSpeed:false,ssl:false,sitemap:false},lastUpdated:today()};
                    if(modal==="addSeo")upd("seoPages",[...(data.seoPages||[]),{...entry,id:Date.now()}]);
                    else upd("seoPages",(data.seoPages||[]).map(p=>p.id===init.id?{...p,...entry}:p));
                    setModal(null);
                  }}/>
                </Modal>
              )}
            </div>
  );
}
