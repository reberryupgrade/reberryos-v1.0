"use client";
import { XAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { TABS, PRIORITY_OPTS } from "@/src/lib/constants";
import { fmtW, getDday } from "@/src/lib/format";
import { DdayBadge } from "@/src/components/ui";

export function OverviewTab({budgetRows,data,setCalTab,setTab,stats}){
  return (
            <div>
              {/* D-Day Alerts Banner */}
              {(()=>{
                const urgentItems=[];
                (data.calendarEvents||[]).filter(e=>e.type==="deadline"&&!e.done).forEach(e=>{const d=getDday(e.date);if(d>=0&&d<=7)urgentItems.push({title:e.title,date:e.date,d});});
                [...(data.offline?.elevator||[]),...(data.offline?.subway||[]),...(data.offline?.other||[])].filter(a=>a.status==="집행중").forEach(a=>{const d=getDday(a.endDate);if(d>=0&&d<=14)urgentItems.push({title:`${a.complex||a.station||a.location||a.type} 광고 종료`,date:a.endDate,d});});
                (data.todos||[]).filter(t=>!t.done).forEach(t=>{const d=getDday(t.dueDate);if(d>=0&&d<=3)urgentItems.push({title:t.text,date:t.dueDate,d});});
                urgentItems.sort((a,b)=>a.d-b.d);
                if(!urgentItems.length)return null;
                return (
                  <div style={{background:"linear-gradient(135deg,#2d0f0f,#422006)",borderRadius:12,padding:"14px 18px",marginBottom:16,border:"1px solid #ef444433",cursor:"pointer"}} onClick={()=>{setTab("calendar");setCalTab("alerts");}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:20}}>🔔</span>
                      <div style={{flex:1}}>
                        <div style={{color:"#ef4444",fontWeight:700,fontSize:13,marginBottom:4}}>긴급 알림 {urgentItems.length}건</div>
                        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                          {urgentItems.slice(0,4).map((a,i)=>(
                            <span key={i} style={{display:"flex",alignItems:"center",gap:4,fontSize:12}}>
                              <DdayBadge dateStr={a.date}/>
                              <span style={{color:"#f1f5f9"}}>{a.title}</span>
                            </span>
                          ))}
                          {urgentItems.length>4&&<span style={{color:"#64748b",fontSize:11}}>외 {urgentItems.length-4}건</span>}
                        </div>
                      </div>
                      <span style={{color:"#64748b",fontSize:12}}>상세보기 →</span>
                    </div>
                  </div>
                );
              })()}

              {/* Todo Progress Mini */}
              {(()=>{
                const todos=data.todos||[];
                const pending=todos.filter(t=>!t.done);
                if(!pending.length)return null;
                const done=todos.filter(t=>t.done).length;
                const pct=todos.length>0?Math.round(done/todos.length*100):0;
                return (
                  <div style={{background:"#1e293b",borderRadius:12,padding:"12px 16px",marginBottom:16,cursor:"pointer"}} onClick={()=>{setTab("calendar");setCalTab("todos");}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <span style={{color:"#94a3b8",fontSize:12,fontWeight:600}}>✅ 할 일 진행 ({done}/{todos.length})</span>
                      <span style={{color:pct>=80?"#10b981":"#f59e0b",fontWeight:800,fontSize:13}}>{pct}%</span>
                    </div>
                    <div style={{background:"#0f172a",borderRadius:99,height:6,overflow:"hidden",marginBottom:8}}>
                      <div style={{width:`${pct}%`,background:pct>=80?"#10b981":"#f59e0b",height:"100%",borderRadius:99}}/>
                    </div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {pending.slice(0,3).map(t=>{
                        const pr=PRIORITY_OPTS.find(p=>p.v===t.priority);
                        return <span key={t.id} style={{background:"#0f172a",borderRadius:6,padding:"3px 8px",fontSize:11,color:pr?.c||"#94a3b8",borderLeft:`2px solid ${pr?.c||"#f59e0b"}`}}>{t.text}</span>;
                      })}
                      {pending.length>3&&<span style={{color:"#475569",fontSize:11}}>+{pending.length-3}건</span>}
                    </div>
                  </div>
                );
              })()}

              <div style={{display:"flex",flexWrap:"wrap",gap:12,marginBottom:24}}>
                {stats.map((s,i)=>(
                  <div key={i} style={{background:"#1e293b",borderRadius:12,padding:"15px 18px",flex:"1 1 110px"}}>
                    <div style={{color:"#94a3b8",fontSize:12,marginBottom:4}}>{s.title}</div>
                    <div style={{color:s.color,fontSize:22,fontWeight:800}}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div style={{background:"#1e293b",borderRadius:14,padding:"18px 20px",marginBottom:20}}>
                <div style={{fontWeight:700,fontSize:15,marginBottom:14}}>월간 마케팅 비용</div>
                <ResponsiveContainer width="100%" height={110}>
                  <BarChart data={budgetRows.filter(r=>r.cost>0)} margin={{top:0,right:10,left:0,bottom:0}}>
                    <XAxis dataKey="label" tick={{fontSize:9,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                    <Tooltip formatter={v=>[fmtW(v),"비용"]} contentStyle={{background:"#0f172a",border:"none",fontSize:11}}/>
                    <Bar dataKey="cost" radius={[4,4,0,0]}>{budgetRows.filter(r=>r.cost>0).map((r,i)=><Cell key={i} fill={r.color}/>)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))",gap:10}}>
                {TABS.slice(3).map((t,i)=>(
                  <div key={i} onClick={()=>setTab(t.id)} style={{background:"#1e293b",borderRadius:12,padding:"13px 15px",cursor:"pointer",border:"1px solid #334155"}}>
                    <div style={{fontWeight:700,fontSize:13,marginBottom:3}}>{t.label}</div>
                    <div style={{color:"#64748b",fontSize:11}}>클릭하여 이동</div>
                  </div>
                ))}
              </div>
            </div>
  );
}
