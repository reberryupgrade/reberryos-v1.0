"use client";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell } from "recharts";
import { fmt, fmtW } from "@/src/lib/format";
import { Th, Td } from "@/src/components/ui";

export function BudgetTab({budgetRows,budgetTotal,budgetTab,data,roi,setBudgetTab,upd}){
  return (
            <div>
              <div style={{display:"flex",gap:8,marginBottom:20}}>
                <button onClick={()=>setBudgetTab("cost")} style={{background:budgetTab==="cost"?"#6366f1":"#1e293b",color:budgetTab==="cost"?"#fff":"#94a3b8",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:600,fontSize:14}}>💰 비용 현황</button>
                <button onClick={()=>setBudgetTab("exposure")} style={{background:budgetTab==="exposure"?"#6366f1":"#1e293b",color:budgetTab==="exposure"?"#fff":"#94a3b8",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:600,fontSize:14}}>📊 노출 효율</button>
                <button onClick={()=>setBudgetTab("cpa")} style={{background:budgetTab==="cpa"?"#6366f1":"#1e293b",color:budgetTab==="cpa"?"#fff":"#94a3b8",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:600,fontSize:14}}>🎯 환자 획득 (CPA)</button>
              </div>

              {budgetTab==="cost"&&(
                <div>
                  <div style={{background:"#1e293b",borderRadius:14,padding:"20px 22px",marginBottom:20}}>
                    <div style={{color:"#94a3b8",fontSize:13,marginBottom:6}}>월간 총 마케팅 비용</div>
                    <div style={{color:"#f59e0b",fontSize:36,fontWeight:800}}>{fmtW(budgetTotal)}</div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:10,marginBottom:24}}>
                    {budgetRows.map((r,i)=>(
                      <div key={i} style={{background:"#1e293b",borderRadius:12,padding:"13px 16px",borderLeft:`3px solid ${r.color}`}}>
                        <div style={{color:"#94a3b8",fontSize:12,marginBottom:3}}>{r.label}</div>
                        <div style={{color:r.color,fontSize:18,fontWeight:800}}>{fmtW(r.cost)}</div>
                        {budgetTotal>0&&<div style={{color:"#475569",fontSize:11,marginTop:2}}>{r.cost>0?`${Math.round(r.cost/budgetTotal*100)}%`:"미입력"}</div>}
                      </div>
                    ))}
                  </div>
                  <div style={{background:"#1e293b",borderRadius:14,padding:"18px 20px"}}>
                    <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>채널별 비용 비교</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={budgetRows} margin={{top:0,right:10,left:10,bottom:50}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" vertical={false}/>
                        <XAxis dataKey="label" tick={{fontSize:10,fill:"#94a3b8"}} angle={-35} textAnchor="end" axisLine={false} tickLine={false}/>
                        <YAxis tick={{fontSize:10,fill:"#94a3b8"}} tickFormatter={v=>`${(v/10000).toFixed(0)}만`} width={44}/>
                        <Tooltip formatter={v=>[fmtW(v),"비용"]} contentStyle={{background:"#0f172a",border:"none",fontSize:11}}/>
                        <Bar dataKey="cost" radius={[4,4,0,0]}>{budgetRows.map((r,i)=><Cell key={i} fill={r.color}/>)}</Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {budgetTab==="exposure"&&(
                <div>
                  <div style={{background:"#1e293b",borderRadius:14,padding:"20px 22px",marginBottom:20}}>
                    <div style={{fontWeight:800,fontSize:16,marginBottom:4}}>📊 비용 대비 노출 효율 분석</div>
                    <div style={{color:"#64748b",fontSize:12}}>₩1,000당 조회수를 기준으로 채널 효율을 비교합니다</div>
                  </div>
                  {(()=>{
                    const effData=roi.channels.filter(c=>c.cost>0&&c.views>0).map(c=>({
                      ...c,
                      viewsPer1000:Math.round(c.views/c.cost*1000),
                      costPerView:c.views>0?Math.round(c.cost/c.views):0,
                    })).sort((a,b)=>b.viewsPer1000-a.viewsPer1000);
                    const bestCh=effData[0];
                    return (
                      <div>
                        {bestCh&&(
                          <div style={{background:"linear-gradient(135deg,#022c22,#064e3b)",borderRadius:14,padding:"18px 22px",marginBottom:20,border:"1px solid #10b981"}}>
                            <div style={{color:"#10b981",fontSize:12,fontWeight:700,marginBottom:6}}>🏆 최고 효율 채널</div>
                            <div style={{display:"flex",alignItems:"baseline",gap:12}}>
                              <span style={{fontSize:28}}>{bestCh.icon}</span>
                              <span style={{color:"#fff",fontWeight:800,fontSize:20}}>{bestCh.label}</span>
                              <span style={{color:"#10b981",fontWeight:800,fontSize:18}}>₩1,000당 {fmt(bestCh.viewsPer1000)}회</span>
                            </div>
                          </div>
                        )}
                        <div style={{background:"#1e293b",borderRadius:14,padding:"18px 20px",marginBottom:16}}>
                          <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>₩1,000당 조회수 비교</div>
                          <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={effData} margin={{top:10,right:10,left:10,bottom:50}} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" horizontal={false}/>
                              <XAxis type="number" tick={{fontSize:11,fill:"#94a3b8"}} tickFormatter={v=>`${v}회`}/>
                              <YAxis type="category" dataKey="label" tick={{fontSize:12,fill:"#e2e8f0"}} width={90}/>
                              <Tooltip formatter={v=>[`${fmt(v)}회/₩1,000`,"노출 효율"]} contentStyle={{background:"#0f172a",border:"1px solid #334155",fontSize:12}}/>
                              <Bar dataKey="viewsPer1000" radius={[0,4,4,0]}>
                                {effData.map((c,i)=><Cell key={i} fill={c.color}/>)}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div style={{background:"#1e293b",borderRadius:14,padding:"16px 18px"}}>
                          <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>채널별 상세</div>
                          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                            <thead><tr><Th c="채널"/><Th c="월 비용"/><Th c="총 조회수"/><Th c="₩1,000당 조회"/><Th c="조회당 비용"/><Th c="효율등급"/></tr></thead>
                            <tbody>{roi.channels.filter(c=>c.cost>0||c.views>0).map((c,ri)=>{
                              const vp1k=c.cost>0&&c.views>0?Math.round(c.views/c.cost*1000):0;
                              const cpv=c.views>0?Math.round(c.cost/c.views):0;
                              const grade=vp1k>=10?"S":vp1k>=5?"A":vp1k>=2?"B":vp1k>0?"C":"-";
                              const gradeColor={S:"#10b981",A:"#6366f1",B:"#f59e0b",C:"#ef4444","-":"#475569"}[grade];
                              return (
                                <tr key={c.key} style={{borderBottom:"1px solid #0f172a",background:ri%2===0?"#0f172a":"#111827"}}>
                                  <Td><span style={{color:c.color,fontWeight:700}}>{c.icon} {c.label}</span></Td>
                                  <Td><span style={{color:"#f59e0b",fontWeight:700}}>{fmtW(c.cost)}</span></Td>
                                  <Td><span style={{color:"#06b6d4"}}>{c.views>0?fmt(c.views)+"회":"—"}</span></Td>
                                  <Td><span style={{fontWeight:800,color:c.cost>0&&c.views>0?"#e2e8f0":"#475569"}}>{vp1k>0?fmt(vp1k)+"회":"—"}</span></Td>
                                  <Td><span style={{color:"#94a3b8"}}>{cpv>0?fmtW(cpv):"—"}</span></Td>
                                  <Td><span style={{background:gradeColor,color:"#fff",borderRadius:6,padding:"2px 10px",fontSize:12,fontWeight:800}}>{grade}</span></Td>
                                </tr>
                              );
                            })}</tbody>
                          </table>
                          <div style={{marginTop:12,padding:"10px 14px",background:"#0f172a",borderRadius:8,fontSize:11,color:"#64748b"}}>
                            효율등급: <span style={{color:"#10b981"}}>S</span>=₩1,000당 10회↑ <span style={{color:"#6366f1"}}>A</span>=5~9회 <span style={{color:"#f59e0b"}}>B</span>=2~4회 <span style={{color:"#ef4444"}}>C</span>=1회이하
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {budgetTab==="cpa"&&(
                <div>
                  <div style={{background:"#1e293b",borderRadius:14,padding:"20px 22px",marginBottom:20}}>
                    <div style={{fontWeight:800,fontSize:16,marginBottom:4}}>🎯 환자 획득 비용 (CPA) 분석</div>
                    <div style={{color:"#64748b",fontSize:12}}>채널별 신규 내원 환자 수를 입력하면 환자 1명 획득에 드는 비용을 분석합니다</div>
                  </div>

                  {/* Summary Cards */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12,marginBottom:20}}>
                    <div style={{background:"#1e293b",borderRadius:12,padding:"16px 18px"}}>
                      <div style={{color:"#94a3b8",fontSize:12,marginBottom:4}}>총 신규 내원</div>
                      <div style={{color:"#10b981",fontSize:28,fontWeight:800}}>{roi.totalPatients}명</div>
                    </div>
                    <div style={{background:"#1e293b",borderRadius:12,padding:"16px 18px"}}>
                      <div style={{color:"#94a3b8",fontSize:12,marginBottom:4}}>평균 CPA</div>
                      <div style={{color:"#f59e0b",fontSize:28,fontWeight:800}}>{roi.totalPatients>0?fmtW(Math.round(budgetTotal/roi.totalPatients)):"—"}</div>
                    </div>
                    <div style={{background:"#1e293b",borderRadius:12,padding:"16px 18px"}}>
                      <div style={{color:"#94a3b8",fontSize:12,marginBottom:4}}>월 총 비용</div>
                      <div style={{color:"#f59e0b",fontSize:24,fontWeight:800}}>{fmtW(budgetTotal)}</div>
                    </div>
                    <div style={{background:"#1e293b",borderRadius:12,padding:"16px 18px"}}>
                      <div style={{color:"#94a3b8",fontSize:12,marginBottom:4}}>예상 ROAS</div>
                      <div style={{color:roi.totalPatients*roi.avgRev>budgetTotal?"#10b981":"#ef4444",fontSize:24,fontWeight:800}}>{budgetTotal>0&&roi.avgRev>0?`${Math.round(roi.totalPatients*roi.avgRev/budgetTotal*100)}%`:"—"}</div>
                    </div>
                  </div>

                  {/* 환자 1인당 평균 매출 입력 */}
                  <div style={{background:"#1e293b",borderRadius:14,padding:"16px 20px",marginBottom:20}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:14}}>💵 환자 1인당 평균 매출</div>
                        <div style={{color:"#64748b",fontSize:11,marginTop:2}}>초진 + 재진 평균 매출을 입력하면 ROAS를 계산합니다</div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <span style={{color:"#64748b",fontSize:13}}>₩</span>
                        <input type="number" value={data.avgRevenuePerPatient||""} onChange={e=>upd("avgRevenuePerPatient",+e.target.value||0)} placeholder="500000"
                          style={{background:"#0f172a",border:"1px solid #334155",borderRadius:8,padding:"8px 12px",color:"#10b981",fontSize:18,fontWeight:800,width:160,textAlign:"right"}}/>
                      </div>
                    </div>
                  </div>

                  {/* 채널별 신규 내원 입력 */}
                  <div style={{background:"#1e293b",borderRadius:14,padding:"18px 20px",marginBottom:20}}>
                    <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>📋 채널별 월간 신규 내원 입력</div>
                    <div style={{color:"#64748b",fontSize:11,marginBottom:16}}>내원 시 설문, 전화 추적, 예약 경로 등으로 파악한 채널별 신규 환자 수를 입력하세요</div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:10}}>
                      {roi.channels.map(c=>{
                        const cpa=c.cost>0&&c.patients>0?Math.round(c.cost/c.patients):0;
                        return (
                          <div key={c.key} style={{background:"#0f172a",borderRadius:10,padding:"12px 14px",borderLeft:`3px solid ${c.color}`}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                              <span style={{fontSize:13,fontWeight:700,color:c.color}}>{c.icon} {c.label}</span>
                              {cpa>0&&<span style={{color:"#94a3b8",fontSize:11}}>CPA: {fmtW(cpa)}</span>}
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <input type="number" value={data.conversions?.[c.key]||""} onChange={e=>upd("conversions",{...data.conversions,[c.key]:+e.target.value||0})}
                                placeholder="0" style={{background:"#1e293b",border:"1px solid #334155",borderRadius:6,padding:"6px 10px",color:"#f1f5f9",fontSize:15,fontWeight:700,width:70,textAlign:"right"}}/>
                              <span style={{color:"#64748b",fontSize:12}}>명/월</span>
                              {c.cost>0&&<span style={{color:"#475569",fontSize:11,marginLeft:"auto"}}>비용: {fmtW(c.cost)}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* CPA 비교 차트 */}
                  {(()=>{
                    const cpaData=roi.channels.filter(c=>c.cost>0&&c.patients>0).map(c=>({
                      ...c,
                      cpa:Math.round(c.cost/c.patients),
                      revenue:c.patients*roi.avgRev,
                      roas:roi.avgRev>0?Math.round(c.patients*roi.avgRev/c.cost*100):0,
                    })).sort((a,b)=>a.cpa-b.cpa);
                    const bestCpa=cpaData[0];
                    return cpaData.length>0?(
                      <div>
                        {bestCpa&&(
                          <div style={{background:"linear-gradient(135deg,#022c22,#064e3b)",borderRadius:14,padding:"18px 22px",marginBottom:20,border:"1px solid #10b981"}}>
                            <div style={{color:"#10b981",fontSize:12,fontWeight:700,marginBottom:6}}>🏆 최저 CPA 채널 (가장 효율적)</div>
                            <div style={{display:"flex",alignItems:"baseline",gap:12}}>
                              <span style={{fontSize:28}}>{bestCpa.icon}</span>
                              <span style={{color:"#fff",fontWeight:800,fontSize:20}}>{bestCpa.label}</span>
                              <span style={{color:"#10b981",fontWeight:800,fontSize:18}}>환자 1명당 {fmtW(bestCpa.cpa)}</span>
                            </div>
                          </div>
                        )}
                        <div style={{background:"#1e293b",borderRadius:14,padding:"18px 20px",marginBottom:16}}>
                          <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>채널별 환자 획득 비용 (CPA) 비교</div>
                          <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={cpaData} margin={{top:10,right:10,left:10,bottom:50}} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" horizontal={false}/>
                              <XAxis type="number" tick={{fontSize:11,fill:"#94a3b8"}} tickFormatter={v=>`${(v/10000).toFixed(0)}만`}/>
                              <YAxis type="category" dataKey="label" tick={{fontSize:12,fill:"#e2e8f0"}} width={90}/>
                              <Tooltip formatter={v=>[fmtW(v),"환자 1명당"]} contentStyle={{background:"#0f172a",border:"1px solid #334155",fontSize:12}}/>
                              <Bar dataKey="cpa" radius={[0,4,4,0]}>
                                {cpaData.map((c,i)=><Cell key={i} fill={c.color}/>)}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div style={{background:"#1e293b",borderRadius:14,padding:"16px 18px"}}>
                          <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>채널별 ROI 상세</div>
                          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                            <thead><tr><Th c="채널"/><Th c="월 비용"/><Th c="신규내원"/><Th c="CPA"/><Th c="예상매출"/><Th c="ROAS"/></tr></thead>
                            <tbody>{roi.channels.filter(c=>c.cost>0||c.patients>0).map((c,ri)=>{
                              const cpa=c.cost>0&&c.patients>0?Math.round(c.cost/c.patients):0;
                              const rev=c.patients*(roi.avgRev||0);
                              const roas=c.cost>0&&rev>0?Math.round(rev/c.cost*100):0;
                              return (
                                <tr key={c.key} style={{borderBottom:"1px solid #0f172a",background:ri%2===0?"#0f172a":"#111827"}}>
                                  <Td><span style={{color:c.color,fontWeight:700}}>{c.icon} {c.label}</span></Td>
                                  <Td><span style={{color:"#f59e0b",fontWeight:700}}>{fmtW(c.cost)}</span></Td>
                                  <Td><span style={{color:"#10b981",fontWeight:800,fontSize:15}}>{c.patients>0?c.patients+"명":"—"}</span></Td>
                                  <Td><span style={{fontWeight:700,color:cpa>0?"#e2e8f0":"#475569"}}>{cpa>0?fmtW(cpa):"—"}</span></Td>
                                  <Td><span style={{color:rev>0?"#06b6d4":"#475569"}}>{rev>0?fmtW(rev):"—"}</span></Td>
                                  <Td>{roas>0?<span style={{background:roas>=100?"#10b981":roas>=50?"#f59e0b":"#ef4444",color:"#fff",borderRadius:6,padding:"2px 10px",fontSize:12,fontWeight:800}}>{roas}%</span>:<span style={{color:"#475569"}}>—</span>}</Td>
                                </tr>
                              );
                            })}</tbody>
                          </table>
                          <div style={{marginTop:12,padding:"10px 14px",background:"#0f172a",borderRadius:8,fontSize:11,color:"#64748b"}}>
                            CPA = 채널 비용 ÷ 신규 내원 수 · ROAS = 예상 매출 ÷ 비용 × 100% · <span style={{color:"#10b981"}}>100%↑</span> 수익 · <span style={{color:"#f59e0b"}}>50~99%</span> 손익분기 근접 · <span style={{color:"#ef4444"}}>50%↓</span> 비효율
                          </div>
                        </div>
                      </div>
                    ):(
                      <div style={{background:"#1e293b",borderRadius:14,padding:"40px 20px",textAlign:"center"}}>
                        <div style={{fontSize:40,marginBottom:12}}>🎯</div>
                        <div style={{color:"#94a3b8",fontSize:14}}>위에서 채널별 신규 내원 수를 입력하면</div>
                        <div style={{color:"#94a3b8",fontSize:14}}>CPA 비교 차트가 여기에 표시됩니다</div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
  );
}
