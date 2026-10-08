"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TAB_TYPES, RANK_FIELDS } from "@/src/lib/constants";
import { fmt, fmtW } from "@/src/lib/format";
import { Th, Td, Btn, Inp, FF, DelBtn, Modal, RankBadge } from "@/src/components/ui";
import { KwForm } from "@/src/components/forms";

export function KeywordsTab({addAIKws,aiLoading,aiRegion,aiResult,aiSpec,callAI,checkAllRanks,checkNaverRank,data,del,fileRef,handleExcel,handleGoogleSheet,modal,rankLoading,setAiRegion,setAiResult,setAiSpec,setModal,upd}){
  return (
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div style={{fontWeight:700,fontSize:15}}>네이버 키워드</div>
                <div style={{display:"flex",gap:8}}>
                  <Btn color="#10b981" onClick={()=>checkAllRanks()} disabled={!!rankLoading}>
                    {rankLoading&&String(rankLoading).startsWith("all:")?`⏳ ${rankLoading.split(":")[1]}`:rankLoading==="all"?"⏳ 준비중...":"🔍 전체 순위 조회"}
                  </Btn>
                  <Btn color="#8b5cf6" onClick={()=>setModal("aiKw")}>🤖 AI 제안</Btn>
                  <Btn color="#f59e0b" onClick={()=>fileRef.current.click()}>📂 엑셀</Btn>
                  <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={handleExcel}/>
                  <Btn color="#34a853" onClick={handleGoogleSheet} disabled={rankLoading==="gsheet"}>{rankLoading==="gsheet"?"⏳":"📊"} 구글시트</Btn>
                  <Btn color="#334155" onClick={()=>setModal("sheetGuide")} style={{padding:"5px 10px",fontSize:11,color:"#94a3b8"}}>❓ 양식</Btn>
                  <Btn onClick={()=>setModal("kw")}>+ 추가</Btn>
                </div>
              </div>
              <div style={{background:"#0f172a",borderRadius:12,padding:"14px 18px",marginBottom:14,border:"1px solid #334155"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <div style={{fontWeight:700,fontSize:13,color:"#10b981"}}>🎯 내 콘텐츠 식별자</div>
                  <span style={{color:"#475569",fontSize:11}}>순위 조회 시 이 이름으로 검색 결과에서 찾습니다</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8}}>
                  <div><div style={{color:"#94a3b8",fontSize:11,marginBottom:4}}>블로그/병원명</div><input value={data.rankTargets?.blogName||""} onChange={e=>upd("rankTargets",{...data.rankTargets,blogName:e.target.value})} placeholder="예: 강남피부과" style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:"8px 12px",color:"#e2e8f0",fontSize:13}}/></div>
                  <div><div style={{color:"#94a3b8",fontSize:11,marginBottom:4}}>플레이스/업체명</div><input value={data.rankTargets?.placeName||""} onChange={e=>upd("rankTargets",{...data.rankTargets,placeName:e.target.value})} placeholder="예: 강남피부과의원" style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:"8px 12px",color:"#e2e8f0",fontSize:13}}/></div>
                  <div><div style={{color:"#94a3b8",fontSize:11,marginBottom:4}}>카페/닉네임</div><input value={data.rankTargets?.cafeName||""} onChange={e=>upd("rankTargets",{...data.rankTargets,cafeName:e.target.value})} placeholder="예: 강남피부과공식" style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:"8px 12px",color:"#e2e8f0",fontSize:13}}/></div>
                </div>
              </div>
              <div style={{background:"#1e293b",borderRadius:12,padding:"16px 18px",marginBottom:18}}>
                <div style={{fontWeight:700,fontSize:13,color:"#94a3b8",marginBottom:12}}>📋 탭별 월 집행비</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
                  {TAB_TYPES.map(tp=>(
                    <div key={tp} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#0f172a",borderRadius:8,padding:"8px 12px"}}>
                      <span style={{fontSize:13,fontWeight:600}}>{tp}</span>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <span style={{color:"#64748b",fontSize:11}}>₩</span>
                        <input type="number" value={data.keywordCosts?.[tp]||""} onChange={e=>upd("keywordCosts",{...data.keywordCosts,[tp]:+e.target.value||0})}
                          placeholder="0" style={{background:"#1e293b",border:"1px solid #334155",borderRadius:6,padding:"4px 8px",color:"#f59e0b",fontSize:13,fontWeight:700,width:100,textAlign:"right"}}/>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid #1e293b",display:"flex",justifyContent:"flex-end"}}>
                  <span style={{color:"#94a3b8",fontSize:12,marginRight:8}}>합계</span>
                  <span style={{color:"#f59e0b",fontWeight:800,fontSize:14}}>{fmtW(Object.values(data.keywordCosts||{}).reduce((a,b)=>a+b,0))}/월</span>
                </div>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead><tr>
                    <Th c="키워드"/><Th c="월검색량"/>
                    <Th c="📝 블로그" style={{textAlign:"center",fontSize:11,padding:"8px 6px"}}/>
                    <Th c="📍 플레이스" style={{textAlign:"center",fontSize:11,padding:"8px 6px"}}/>
                    <Th c="☕ 카페" style={{textAlign:"center",fontSize:11,padding:"8px 6px"}}/>
                    <Th c="❓ 지식인" style={{textAlign:"center",fontSize:11,padding:"8px 6px"}}/>
                    <Th c="📰 뉴스" style={{textAlign:"center",fontSize:11,padding:"8px 6px"}}/>
                    <Th c="💎 파워링크" style={{textAlign:"center",fontSize:11,padding:"8px 6px"}}/>
                    
                    <Th c="🌐 G맵" style={{textAlign:"center",fontSize:11,padding:"8px 6px"}}/>
                    <Th c="🟡 K맵" style={{textAlign:"center",fontSize:11,padding:"8px 6px"}}/>
                    <Th c="검색탭순서"/><Th c="설정순서"/><Th c="최근조회"/><Th c=""/>
                  </tr></thead>
                  <tbody>{data.keywords.map((k,ri)=>(
                    <tr key={k.id} style={{borderBottom:"1px solid #1e293b",background:ri%2===0?"#0f172a":"#111827"}}>
                      <Td><span style={{fontWeight:700}}>{k.keyword}</span></Td>
                      <Td>{k.monthlySearch?<button onClick={()=>setModal({type:"trend",item:k})} style={{background:"none",border:"none",color:"#06b6d4",cursor:"pointer",fontWeight:700,fontSize:13,padding:0}}>{fmt(k.monthlySearch)}회 📈</button>:<span style={{color:"#475569"}}>-</span>}</Td>
                      <Td style={{textAlign:"center"}}><RankBadge value={k.myBlogRank} color="#6366f1"/></Td>
                      <Td style={{textAlign:"center"}}><RankBadge value={k.myPlaceRank} color="#06b6d4"/></Td>
                      <Td style={{textAlign:"center"}}><RankBadge value={k.rankCafe} color="#ec4899"/></Td>
                      <Td style={{textAlign:"center"}}><RankBadge value={k.rankKnowledge} color="#f59e0b"/></Td>
                      <Td style={{textAlign:"center"}}><RankBadge value={k.rankNews} color="#94a3b8"/></Td>
                      <Td style={{textAlign:"center"}}><RankBadge value={k.rankPowerlink} color="#10b981"/></Td>
                      
                      <Td style={{textAlign:"center"}}><RankBadge value={k.rankGoogle} color="#f97316"/></Td>
                      <Td style={{textAlign:"center"}}><RankBadge value={k.rankKakao} color="#fbbf24"/></Td>
                      <Td>{k.detectedTabOrder&&k.detectedTabOrder.length>0?<div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{k.detectedTabOrder.slice(0,5).map((tp,idx)=><span key={idx} style={{background:idx===0?"#10b981":idx===1?"#06b6d4":idx===2?"#6366f1":idx===3?"#f59e0b":"#ec4899",color:"#fff",borderRadius:4,padding:"2px 6px",fontSize:10,fontWeight:700}}>{idx+1}.{tp}</span>)}{k.detectedTabOrder.length>5&&<span style={{color:"#64748b",fontSize:10}}>+{k.detectedTabOrder.length-5}</span>}</div>:<span style={{color:"#475569",fontSize:11}}>미조회</span>}</Td>
                      <Td><div style={{display:"flex",gap:2,flexWrap:"wrap"}}>{(k.tabOrder||TAB_TYPES).slice(0,6).map((tp,idx)=><span key={idx} style={{background:idx===0?"#6366f1":idx<3?"#334155":"#1e293b",color:idx===0?"#fff":idx<3?"#e2e8f0":"#64748b",borderRadius:4,padding:"1px 5px",fontSize:10,fontWeight:idx<3?700:400}}>{idx+1}.{tp}</span>)}</div></Td>
                      <Td><span style={{color:"#475569",fontSize:11}}>{k.lastRankCheck||"-"}</span></Td>
                      <Td><div style={{display:"flex",gap:4}}><button onClick={()=>checkNaverRank(k)} disabled={rankLoading===k.id} style={{background:rankLoading===k.id?"#1e293b":"#10b981",border:"none",color:"#fff",borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:11,fontWeight:700}}>{rankLoading===k.id?"⏳":"🔍"}</button><button onClick={()=>setModal({type:"editKw",item:k})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>편집</button><button onClick={()=>k._rankDetail?setModal({type:"rankDetail",item:k}):null} disabled={!k._rankDetail} style={{background:k._rankDetail?"#334155":"#1e293b",border:"none",color:k._rankDetail?"#06b6d4":"#334155",borderRadius:6,padding:"4px 8px",cursor:k._rankDetail?"pointer":"default",fontSize:11}}>상세</button><DelBtn onClick={()=>del("keywords",k.id)}/></div></Td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>

              {/* 순위 요약 카드 */}
              {data.keywords.length>0&&(
                <div style={{background:"#1e293b",borderRadius:14,padding:"16px 20px",marginTop:16}}>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>📊 키워드별 순위 히트맵</div>
                  <div style={{overflowX:"auto"}}>
                    {data.keywords.map(k=>{
                      const allRanks=RANK_FIELDS.map(f=>({...f,val:k[f.key]||"-"}));
                      const ranked=allRanks.filter(r=>r.val&&r.val!=="-");
                      const top3=ranked.filter(r=>{const n=parseInt(r.val);return n>=1&&n<=3;}).length;
                      return (
                        <div key={k.id} style={{background:"#0f172a",borderRadius:10,padding:"12px 16px",marginBottom:8}}>
                          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                            <div style={{display:"flex",alignItems:"center",gap:10}}>
                              <span style={{fontWeight:800,fontSize:14}}>{k.keyword}</span>
                              {k.monthlySearch&&<span style={{color:"#06b6d4",fontSize:12}}>월 {fmt(k.monthlySearch)}회</span>}
                            </div>
                            <div style={{display:"flex",gap:8,alignItems:"center"}}>
                              {top3>0&&<span style={{background:"#022c22",color:"#10b981",borderRadius:99,padding:"2px 10px",fontSize:11,fontWeight:700}}>🏆 TOP3 {top3}개</span>}
                              {ranked.length>0&&<span style={{color:"#64748b",fontSize:11}}>노출 {ranked.length}/{allRanks.length}</span>}
                            </div>
                          </div>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                            {allRanks.map(r=>(
                              <div key={r.key} style={{background:"#1e293b",borderRadius:8,padding:"6px 10px",textAlign:"center",minWidth:60,border:r.val!=="-"?`1px solid ${r.color}33`:"1px solid #1e293b"}}>
                                <div style={{fontSize:10,color:r.color,marginBottom:3,fontWeight:600}}>{r.icon} {r.label}</div>
                                <RankBadge value={r.val} color={r.color}/>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {modal==="aiKw"&&(
                <Modal title="🤖 AI 키워드 제안" onClose={()=>{setModal(null);setAiResult([]);}} wide>
                  <div style={{display:"flex",gap:10,marginBottom:14}}>
                    <div style={{flex:1}}><FF label="지역"><Inp value={aiRegion} onChange={setAiRegion} placeholder="강남"/></FF></div>
                    <div style={{flex:1}}><FF label="전문분야"><Inp value={aiSpec} onChange={setAiSpec} placeholder="피부과"/></FF></div>
                  </div>
                  <Btn onClick={callAI} style={{width:"100%",marginBottom:14}}>{aiLoading?"분석 중...":"키워드 생성"}</Btn>
                  {aiResult.length>0&&(
                    <div>
                      <div style={{maxHeight:360,overflowY:"auto",marginBottom:12}}>
                        {aiResult.map((r,i)=>(
                          <div key={i} style={{background:"#0f172a",borderRadius:10,padding:"10px 14px",marginBottom:8}}>
                            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                              <span style={{fontWeight:700,color:"#6366f1"}}>{r.priority||i+1}. {r.keyword}</span>
                              <span style={{color:"#06b6d4",fontWeight:700,fontSize:13}}>월 {fmt(r.monthlySearch)}회</span>
                            </div>
                            {r.trend&&<ResponsiveContainer width="100%" height={48}><LineChart data={r.trend} margin={{top:0,right:4,left:0,bottom:0}}><Line type="monotone" dataKey="count" stroke="#6366f1" dot={false} strokeWidth={2}/><XAxis dataKey="month" tick={{fontSize:8,fill:"#475569"}} axisLine={false} tickLine={false}/></LineChart></ResponsiveContainer>}
                          </div>
                        ))}
                      </div>
                      <Btn onClick={addAIKws} style={{width:"100%"}}>전체 추가 ({aiResult.length}개)</Btn>
                    </div>
                  )}
                </Modal>
              )}
              {modal?.type==="trend"&&(
                <Modal title={`📈 ${modal.item.keyword}`} onClose={()=>setModal(null)} wide>
                  <div style={{textAlign:"center",marginBottom:12}}><span style={{color:"#06b6d4",fontWeight:800,fontSize:22}}>{fmt(modal.item.monthlySearch)}</span><span style={{color:"#94a3b8",fontSize:14}}> 회/월</span></div>
                  {modal.item.monthlySearchDetail&&(
                    <div style={{display:"flex",gap:12,justifyContent:"center",marginBottom:16,flexWrap:"wrap"}}>
                      <div style={{background:"#0f172a",borderRadius:10,padding:"10px 16px",textAlign:"center"}}><div style={{color:"#94a3b8",fontSize:11}}>PC</div><div style={{color:"#6366f1",fontWeight:800,fontSize:16}}>{fmt(modal.item.monthlySearchDetail.pc)}</div></div>
                      <div style={{background:"#0f172a",borderRadius:10,padding:"10px 16px",textAlign:"center"}}><div style={{color:"#94a3b8",fontSize:11}}>모바일</div><div style={{color:"#10b981",fontWeight:800,fontSize:16}}>{fmt(modal.item.monthlySearchDetail.mobile)}</div></div>
                      {modal.item.monthlySearchDetail.comp&&<div style={{background:"#0f172a",borderRadius:10,padding:"10px 16px",textAlign:"center"}}><div style={{color:"#94a3b8",fontSize:11}}>경쟁강도</div><div style={{color:modal.item.monthlySearchDetail.comp==="HIGH"?"#ef4444":modal.item.monthlySearchDetail.comp==="MEDIUM"?"#f59e0b":"#10b981",fontWeight:800,fontSize:14}}>{modal.item.monthlySearchDetail.comp==="HIGH"?"높음":modal.item.monthlySearchDetail.comp==="MEDIUM"?"보통":"낮음"}</div></div>}
                      {modal.item.monthlySearchDetail.monthlyAvgClickRate>0&&<div style={{background:"#0f172a",borderRadius:10,padding:"10px 16px",textAlign:"center"}}><div style={{color:"#94a3b8",fontSize:11}}>평균 클릭률</div><div style={{color:"#f59e0b",fontWeight:800,fontSize:14}}>{(modal.item.monthlySearchDetail.monthlyAvgClickRate*100).toFixed(1)}%</div></div>}
                    </div>
                  )}
                  {modal.item.trend?<ResponsiveContainer width="100%" height={200}><LineChart data={modal.item.trend} margin={{top:10,right:20,left:0,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/><XAxis dataKey="month" tick={{fontSize:11,fill:"#94a3b8"}}/><YAxis tick={{fontSize:11,fill:"#94a3b8"}} width={50}/><Tooltip formatter={v=>[fmt(v)+"회",""]} contentStyle={{background:"#1e293b",border:"none"}}/><Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{fill:"#6366f1",r:3}}/></LineChart></ResponsiveContainer>:<div style={{color:"#475569",textAlign:"center",padding:20}}>추이 없음 (AI 제안 키워드만 차트 제공)</div>}
                </Modal>
              )}
              {modal?.type==="rankDetail"&&(
                <Modal title={`🔍 ${modal.item.keyword} - 검색결과 상세`} onClose={()=>setModal(null)} wide>
                  <div style={{maxHeight:"70vh",overflowY:"auto"}}>
                    {modal.item.detectedTabOrder&&modal.item.detectedTabOrder.length>0&&(
                      <div style={{marginBottom:16,background:"#0f172a",borderRadius:10,padding:"12px 16px"}}>
                        <div style={{color:"#10b981",fontWeight:700,fontSize:13,marginBottom:8}}>📋 검색 탭 노출 순서</div>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{modal.item.detectedTabOrder.map((tp,idx)=>(
                          <span key={idx} style={{background:idx===0?"#10b981":idx===1?"#06b6d4":idx===2?"#6366f1":idx===3?"#f59e0b":idx===4?"#ec4899":"#334155",color:"#fff",borderRadius:8,padding:"4px 12px",fontSize:13,fontWeight:700}}>{idx+1}위 {tp}</span>
                        ))}</div>
                      </div>
                    )}
                    {modal.item._rankDetail?._tabDebug&&(
                      <div style={{marginBottom:16,background:"#1a1a2e",borderRadius:10,padding:"12px 16px",border:"1px solid #334155"}}>
                        <div style={{color:"#f59e0b",fontWeight:700,fontSize:12,marginBottom:8}}>🔧 탭 감지 디버그</div>
                        <pre style={{color:"#94a3b8",fontSize:10,margin:0,whiteSpace:"pre-wrap",wordBreak:"break-all",maxHeight:200,overflowY:"auto"}}>{JSON.stringify(modal.item._rankDetail._tabDebug,null,2)}</pre>
                      </div>
                    )}
                    {[
                      {key:"blog",label:"📝 블로그",color:"#6366f1"},
                      {key:"place",label:"📍 플레이스",color:"#06b6d4"},
                      {key:"cafe",label:"☕ 카페",color:"#ec4899"},
                      {key:"googleMap",label:"🌐 구글맵",color:"#f97316"},
                      {key:"kakaoMap",label:"🟡 카카오맵",color:"#fbbf24"},
                      {key:"knowledge",label:"❓ 지식인",color:"#f59e0b"},
                      {key:"news",label:"📰 뉴스",color:"#94a3b8"},
                      {key:"powerlink",label:"💎 파워링크",color:"#10b981"},
                    ].map(sec=>{
                      const items=modal.item._rankDetail?.[sec.key]||[];
                      if(!items.length)return null;
                      const tgt=data.rankTargets||{};
                      const searchTerm=(sec.key==="blog"||sec.key==="knowledge"||sec.key==="news"||sec.key==="powerlink")?tgt.blogName:(sec.key==="cafe")?tgt.cafeName:tgt.placeName;
                      return(
                        <div key={sec.key} style={{marginBottom:16}}>
                          <div style={{color:sec.color,fontWeight:700,fontSize:13,marginBottom:8}}>{sec.label} ({items.length}건)</div>
                          {items.map((t,i)=>{
                            const isMe=searchTerm&&t.toLowerCase().includes(searchTerm.toLowerCase());
                            return(
                              <div key={i} style={{display:"flex",gap:8,alignItems:"center",padding:"6px 10px",background:isMe?"#1e293b":"#0f172a",borderRadius:8,marginBottom:4,border:isMe?"1px solid "+sec.color:"1px solid transparent"}}>
                                <span style={{color:i<3?sec.color:"#475569",fontWeight:800,fontSize:13,minWidth:24}}>{i+1}</span>
                                <span style={{color:isMe?"#e2e8f0":"#94a3b8",fontSize:13,fontWeight:isMe?700:400}}>{t}</span>
                                {isMe&&<span style={{background:sec.color,color:"#fff",borderRadius:99,padding:"1px 8px",fontSize:10,fontWeight:700,marginLeft:"auto"}}>내 콘텐츠</span>}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                    <div style={{color:"#475569",fontSize:11,marginTop:10}}>조회일시: {modal.item.lastRankCheck||"-"}</div>
                  </div>
                </Modal>
              )}
              {modal==="sheetGuide"&&(
                <Modal title="📊 키워드 업로드 양식 가이드" onClose={()=>setModal(null)}>
                  <div style={{maxHeight:"65vh",overflowY:"auto",lineHeight:"1.8"}}>
                    <div style={{background:"#0f172a",borderRadius:10,padding:"16px 20px",marginBottom:16,border:"1px solid #334155"}}>
                      <div style={{color:"#10b981",fontWeight:800,fontSize:14,marginBottom:10}}>📂 엑셀 파일 (.xlsx)</div>
                      <div style={{color:"#e2e8f0",fontSize:13}}>엑셀 파일을 직접 업로드합니다. 같은 양식을 사용합니다.</div>
                    </div>
                    <div style={{background:"#0f172a",borderRadius:10,padding:"16px 20px",marginBottom:16,border:"1px solid #34a853"}}>
                      <div style={{color:"#34a853",fontWeight:800,fontSize:14,marginBottom:10}}>📊 구글시트 연동</div>
                      <div style={{color:"#e2e8f0",fontSize:13,marginBottom:8}}>구글시트 링크를 붙여넣으면 자동으로 키워드를 불러옵니다.</div>
                      <div style={{color:"#f59e0b",fontSize:12,fontWeight:700,marginBottom:6}}>⚠️ 시트 공유 설정 필수:</div>
                      <div style={{color:"#94a3b8",fontSize:12,paddingLeft:12}}>시트 → 공유 → '링크가 있는 모든 사용자' → '뷰어'로 설정</div>
                    </div>
                    <div style={{background:"#1e293b",borderRadius:10,padding:"16px 20px",marginBottom:16}}>
                      <div style={{color:"#06b6d4",fontWeight:800,fontSize:14,marginBottom:12}}>📋 시트 양식 (공통)</div>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                        <thead><tr style={{borderBottom:"2px solid #334155"}}>
                          <th style={{padding:"8px 12px",textAlign:"left",color:"#10b981",fontWeight:700}}>열</th>
                          <th style={{padding:"8px 12px",textAlign:"left",color:"#10b981",fontWeight:700}}>내용</th>
                          <th style={{padding:"8px 12px",textAlign:"left",color:"#10b981",fontWeight:700}}>필수</th>
                          <th style={{padding:"8px 12px",textAlign:"left",color:"#10b981",fontWeight:700}}>예시</th>
                        </tr></thead>
                        <tbody>
                          {[
                            ["A","키워드","✅ 필수","강남 피부과"],
                            ["B","블로그 순위","선택","3위"],
                            ["C","플레이스 순위","선택","1위"],
                            ["D","월 검색량","선택","12000"],
                          ].map(([col,desc,req,ex],i)=>(
                            <tr key={i} style={{borderBottom:"1px solid #1e293b"}}>
                              <td style={{padding:"8px 12px",color:"#f59e0b",fontWeight:700}}>{col}</td>
                              <td style={{padding:"8px 12px",color:"#e2e8f0"}}>{desc}</td>
                              <td style={{padding:"8px 12px",color:req.includes("필수")?"#10b981":"#475569"}}>{req}</td>
                              <td style={{padding:"8px 12px",color:"#94a3b8",fontFamily:"monospace"}}>{ex}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{background:"#0f172a",borderRadius:10,padding:"16px 20px",border:"1px solid #334155"}}>
                      <div style={{color:"#8b5cf6",fontWeight:800,fontSize:14,marginBottom:10}}>📝 예시</div>
                      <div style={{background:"#020617",borderRadius:8,padding:"12px 16px",fontFamily:"monospace",fontSize:12,color:"#94a3b8",lineHeight:"1.8"}}>
                        <div><span style={{color:"#475569"}}>1행:</span> <span style={{color:"#f59e0b"}}>키워드</span> | <span style={{color:"#f59e0b"}}>블로그순위</span> | <span style={{color:"#f59e0b"}}>플레이스순위</span> | <span style={{color:"#f59e0b"}}>월검색량</span></div>
                        <div><span style={{color:"#475569"}}>2행:</span> 강남 피부과 | 3위 | 1위 | 12000</div>
                        <div><span style={{color:"#475569"}}>3행:</span> 강남 보톡스 | - | - | 8500</div>
                        <div><span style={{color:"#475569"}}>4행:</span> 신논현 피부과 | | | 3200</div>
                      </div>
                      <div style={{color:"#64748b",fontSize:11,marginTop:8}}>※ 1행(헤더)은 자동으로 건너뜁니다. A열만 있어도 됩니다.</div>
                    </div>
                  </div>
                </Modal>
              )}
              {(modal==="kw"||modal?.type==="editKw")&&(
                <Modal title={modal==="kw"?"키워드 추가":"편집"} onClose={()=>setModal(null)}>
                  <KwForm initial={modal?.item} onSave={f=>{
                    if(modal==="kw")upd("keywords",[...data.keywords,{...f,id:Date.now(),status:"warn"}]);
                    else upd("keywords",data.keywords.map(k=>k.id===modal.item.id?{...k,...f}:k));setModal(null);
                  }}/>
                </Modal>
              )}
            </div>
  );
}
