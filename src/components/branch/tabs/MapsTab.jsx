"use client";
import { CHANNEL_COLORS } from "@/src/lib/constants";
import { Badge, Th, Td, Btn, DelBtn, Modal, SectionWithCost, RankBadge } from "@/src/components/ui";
import { MapForm } from "@/src/components/forms";

export function MapsTab({checkAllMapRanks,checkMapRank,data,del,fetchReviews,handleMapExcel,handleMapGoogleSheet,mapFileRef,modal,rankLoading,runApiDiag,setModal,upd}){
  return (
            <SectionWithCost title="지도 노출 순위" cost={data.mapsCost} onCostChange={v=>upd("mapsCost",v)} color={CHANNEL_COLORS.maps} right={<div style={{display:"flex",gap:6,flexWrap:"wrap"}}><Btn color="#f59e0b" onClick={()=>runApiDiag()} disabled={rankLoading==="diag"}>{rankLoading==="diag"?"⏳":"🔧 API 진단"}</Btn><Btn color="#10b981" onClick={()=>checkAllMapRanks()} disabled={!!rankLoading}>{String(rankLoading).startsWith("allMaps:")?"⏳ "+rankLoading.split(":")[1]:rankLoading==="allMaps"?"⏳ 준비중...":"🔍 전체 조회"}</Btn><Btn color="#f59e0b" onClick={()=>mapFileRef.current.click()}>📂 엑셀</Btn><input ref={mapFileRef} type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={handleMapExcel}/><Btn color="#34a853" onClick={handleMapGoogleSheet} disabled={rankLoading==="gsheetMap"}>{rankLoading==="gsheetMap"?"⏳":"📊"} 구글시트</Btn><Btn onClick={()=>setModal("map")}>+ 추가</Btn></div>}>
              <div style={{background:"#0f172a",borderRadius:12,padding:"14px 18px",marginBottom:14,border:"1px solid #334155"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <div style={{fontWeight:700,fontSize:13,color:"#10b981"}}>🎯 내 콘텐츠 식별자</div>
                  <span style={{color:"#475569",fontSize:11}}>지도 순위 조회 시 이 업체명으로 찾습니다</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8}}>
                  <div><div style={{color:"#94a3b8",fontSize:11,marginBottom:4}}>플레이스/업체명</div><input value={data.rankTargets?.placeName||""} onChange={e=>upd("rankTargets",{...data.rankTargets,placeName:e.target.value})} placeholder="예: 강남피부과의원" style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:"8px 12px",color:"#e2e8f0",fontSize:13}}/></div>
                </div>
              </div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr><Th c="키워드"/><Th c="📍 플레이스"/><Th c="🌐 G맵"/><Th c="🟡 K맵"/><Th c="상태"/><Th c="조회일"/><Th c=""/></tr></thead>
                <tbody>{data.maps.map((m,ri)=>(
                  <tr key={m.id} style={{borderBottom:"1px solid #1e293b",background:ri%2===0?"#0f172a":"#111827"}}>
                    <Td><span style={{color:"#6366f1",fontWeight:700}}>{m.keyword}</span></Td>
                    <Td><RankBadge value={m.naverPlace} color="#06b6d4"/></Td>
                    <Td><RankBadge value={m.google} color="#f97316"/></Td>
                    <Td><RankBadge value={m.kakao} color="#fbbf24"/></Td>
                    <Td><Badge status={m.status}/></Td>
                    <Td><span style={{color:"#475569",fontSize:11}}>{m.lastRankCheck||"-"}</span></Td>
                    <Td><div style={{display:"flex",gap:4}}>
                      <button onClick={()=>checkMapRank(m)} disabled={rankLoading==="map_"+m.id} style={{background:rankLoading==="map_"+m.id?"#1e293b":"#10b981",border:"none",color:"#fff",borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:11,fontWeight:700}}>{rankLoading==="map_"+m.id?"⏳":"🔍"}</button>
                      <button onClick={()=>fetchReviews(m.keyword,"naver")} disabled={rankLoading==="reviews_naver"} style={{background:"#334155",border:"none",color:"#06b6d4",borderRadius:6,padding:"4px 6px",cursor:"pointer",fontSize:10}}>{rankLoading==="reviews_naver"?"⏳":"📍리뷰"}</button>
                      <button onClick={()=>fetchReviews(m.keyword,"google")} disabled={rankLoading==="reviews_google"} style={{background:"#334155",border:"none",color:"#f97316",borderRadius:6,padding:"4px 6px",cursor:"pointer",fontSize:10}}>{rankLoading==="reviews_google"?"⏳":"🌐리뷰"}</button>
                      <button onClick={()=>fetchReviews(m.keyword,"kakao")} disabled={rankLoading==="reviews_kakao"} style={{background:"#334155",border:"none",color:"#fbbf24",borderRadius:6,padding:"4px 6px",cursor:"pointer",fontSize:10}}>{rankLoading==="reviews_kakao"?"⏳":"🟡리뷰"}</button>
                      <button onClick={()=>m._mapDetail?setModal({type:"mapDetail",item:m}):null} disabled={!m._mapDetail} style={{background:m._mapDetail?"#334155":"#1e293b",border:"none",color:m._mapDetail?"#06b6d4":"#334155",borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:11}}>상세</button>
                      <button onClick={()=>setModal({type:"editMap",item:m})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>편집</button>
                      <DelBtn onClick={()=>del("maps",m.id)}/>
                    </div></Td>
                  </tr>
                ))}</tbody>
              </table>
              {modal?.type==="mapDetail"&&(
                <Modal title={`🗺️ ${modal.item.keyword} - 지도 검색결과`} onClose={()=>setModal(null)}>
                  <div style={{maxHeight:"60vh",overflowY:"auto"}}>
                    {[{key:"place",label:"📍 네이버 플레이스",color:"#06b6d4"},{key:"googleMap",label:"🌐 구글맵",color:"#f97316"},{key:"kakaoMap",label:"🟡 카카오맵",color:"#fbbf24"}].map(sec=>{
                      const items=modal.item._mapDetail?.[sec.key]||[];
                      const tgt=(data.rankTargets?.placeName||"").toLowerCase();
                      return(
                        <div key={sec.key} style={{marginBottom:16}}>
                          <div style={{color:sec.color,fontWeight:700,fontSize:13,marginBottom:8}}>{sec.label} ({items.length}건){items.length===0&&<span style={{color:"#ef4444",fontSize:11,marginLeft:8}}>결과 없음</span>}</div>
                          {items.length>0?items.map((t,i)=>{
                            const isMe=tgt&&t.toLowerCase().includes(tgt);
                            return(
                              <div key={i} style={{display:"flex",gap:8,alignItems:"center",padding:"6px 10px",background:isMe?"#1e293b":"#0f172a",borderRadius:8,marginBottom:4,border:isMe?"1px solid "+sec.color:"1px solid transparent"}}>
                                <span style={{color:i<3?sec.color:"#475569",fontWeight:800,fontSize:13,minWidth:24}}>{i+1}</span>
                                <span style={{color:isMe?"#e2e8f0":"#94a3b8",fontSize:13,fontWeight:isMe?700:400}}>{t}</span>
                                {isMe&&<span style={{background:sec.color,color:"#fff",borderRadius:99,padding:"1px 8px",fontSize:10,fontWeight:700,marginLeft:"auto"}}>내 업체</span>}
                              </div>
                            );
                          }):<div style={{color:"#475569",fontSize:12,padding:"8px 10px"}}>데이터를 가져올 수 없습니다</div>}
                        </div>
                      );
                    })}
                    {modal.item._mapDetail?._placeDebug&&(
                      <div style={{background:"#1a1a2e",borderRadius:8,padding:"10px 14px",marginTop:8,border:"1px solid #334155"}}>
                        <div style={{color:"#06b6d4",fontSize:11,fontWeight:700,marginBottom:6}}>🔧 네이버 플레이스 디버그</div>
                        <pre style={{color:"#94a3b8",fontSize:10,margin:0,whiteSpace:"pre-wrap",wordBreak:"break-all"}}>{JSON.stringify(modal.item._mapDetail._placeDebug,null,2)}</pre>
                      </div>
                    )}
                    {modal.item._mapDetail?._kakaoDebug&&(
                      <div style={{background:"#1a1a2e",borderRadius:8,padding:"10px 14px",marginTop:8,border:"1px solid #334155"}}>
                        <div style={{color:"#f59e0b",fontSize:11,fontWeight:700,marginBottom:6}}>🔧 카카오맵 디버그</div>
                        <pre style={{color:"#94a3b8",fontSize:10,margin:0,whiteSpace:"pre-wrap",wordBreak:"break-all"}}>{JSON.stringify(modal.item._mapDetail._kakaoDebug,null,2)}</pre>
                      </div>
                    )}
                  </div>
                </Modal>
              )}
              {modal?.type==="apiDiag"&&(
                <Modal title="🔧 API 연동 진단" onClose={()=>setModal(null)} wide>
                  <div style={{maxHeight:"65vh",overflowY:"auto"}}>
                    <div style={{color:"#94a3b8",fontSize:11,marginBottom:12}}>테스트 키워드: {modal.data.keyword} | {modal.data.timestamp}</div>
                    {Object.entries(modal.data.results||{}).map(([key,val])=>{
                      const labels={env:"📋 환경변수",kakao:"🟡 카카오맵 API",naverAd:"📊 네이버 검색광고 API",google:"🌐 구글맵",naverMap:"🗺️ 네이버 지도"};
                      const isOk=val.status===200||val.results||val.placeCount>0||key==="env";
                      const hasError=val.error||val.status>=400;
                      return(
                        <div key={key} style={{background:hasError?"#1a0f0f":"#0f172a",borderRadius:10,padding:"12px 16px",marginBottom:10,borderLeft:`3px solid ${hasError?"#ef4444":isOk?"#10b981":"#f59e0b"}`}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                            <span style={{color:"#e2e8f0",fontWeight:700,fontSize:13}}>{labels[key]||key}</span>
                            <span style={{color:hasError?"#ef4444":isOk?"#10b981":"#f59e0b",fontSize:12,fontWeight:700}}>{hasError?"❌ 실패":isOk?"✅ 정상":"⚠️ 확인필요"}</span>
                          </div>
                          <pre style={{color:"#94a3b8",fontSize:11,margin:0,whiteSpace:"pre-wrap",wordBreak:"break-all",background:"#0a0f1a",borderRadius:6,padding:8}}>{JSON.stringify(val,null,2)}</pre>
                        </div>
                      );
                    })}
                  </div>
                </Modal>
              )}
              {modal?.type==="reviews"&&(
                <Modal title={`💬 ${modal.data.placeName||modal.keyword} - ${modal.platform==="google"?"구글맵":modal.platform==="kakao"?"카카오맵":"플레이스"} ${modal.data.reviewType||"리뷰"} 분석`} onClose={()=>setModal(null)}>
                  <div style={{maxHeight:"65vh",overflowY:"auto"}}>
                    {modal.data.error&&(
                      <div style={{background:"#2d1f0f",borderRadius:10,padding:"12px 16px",marginBottom:14,border:"1px solid #f59e0b44"}}>
                        <div style={{color:"#f59e0b",fontWeight:700,fontSize:13}}>⚠️ {modal.data.error}</div>
                      </div>
                    )}
                    {modal.data.negCount>0&&(
                      <div style={{background:"#2d0f0f",borderRadius:10,padding:"12px 16px",marginBottom:14,border:"1px solid #ef444444"}}>
                        <div style={{color:"#ef4444",fontWeight:800,fontSize:14}}>⚠️ 부정적 리뷰 {modal.data.negCount}건 감지</div>
                        <div style={{color:"#f87171",fontSize:12,marginTop:4}}>총 {modal.data.reviews?.length||0}건 중 부정 {modal.data.negCount}건 ({Math.round(modal.data.negCount/(modal.data.reviews?.length||1)*100)}%)</div>
                      </div>
                    )}
                    {(modal.data.reviews||[]).map((rv,i)=>(
                      <div key={i} style={{background:rv.sentiment==="negative"?"#1a0f0f":rv.sentiment==="positive"?"#0f1a15":"#0f172a",borderRadius:10,padding:"12px 14px",marginBottom:8,borderLeft:`3px solid ${rv.sentiment==="negative"?"#ef4444":rv.sentiment==="positive"?"#10b981":"#475569"}`}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                          <span style={{fontSize:12,fontWeight:700,color:rv.sentiment==="negative"?"#ef4444":rv.sentiment==="positive"?"#10b981":"#94a3b8"}}>{rv.sentiment==="negative"?"👎 부정":rv.sentiment==="positive"?"👍 긍정":"😐 중립"}{rv.type?` (${rv.type})`:""}{rv.author?` · ${rv.author}`:""}</span>
                          {rv.negWords&&rv.negWords.length>0&&<span style={{fontSize:11,color:"#ef4444"}}>{rv.negWords.join(", ")}</span>}
                        </div>
                        <div style={{color:"#e2e8f0",fontSize:13,lineHeight:"1.5"}}>{rv.text}</div>
                      </div>
                    ))}
                    {(!modal.data.reviews||!modal.data.reviews.length)&&<div style={{color:"#475569",textAlign:"center",padding:20}}>리뷰를 찾을 수 없습니다</div>}
                    {modal.data._debug&&(
                      <div style={{marginTop:12,background:"#1a1a2e",borderRadius:8,padding:"10px 12px",border:"1px solid #334155"}}>
                        <div style={{color:"#f59e0b",fontSize:11,fontWeight:700,marginBottom:4}}>🔧 디버그</div>
                        <pre style={{color:"#64748b",fontSize:10,margin:0,whiteSpace:"pre-wrap",wordBreak:"break-all"}}>{JSON.stringify(modal.data._debug,null,2)}</pre>
                      </div>
                    )}
                  </div>
                </Modal>
              )}
              {(modal==="map"||modal?.type==="editMap")&&(
                <Modal title={modal==="map"?"지도 추가":"편집"} onClose={()=>setModal(null)}>
                  <MapForm initial={modal?.item} onSave={f=>{if(modal==="map")upd("maps",[...data.maps,{...f,id:Date.now(),status:"warn"}]);else upd("maps",data.maps.map(m=>m.id===modal.item.id?{...m,...f}:m));setModal(null);}}/>
                </Modal>
              )}
            </SectionWithCost>
  );
}
