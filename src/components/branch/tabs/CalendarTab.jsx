"use client";
import { EVENT_TYPES, PRIORITY_OPTS } from "@/src/lib/constants";
import { today, getDday } from "@/src/lib/format";
import { Btn, DelBtn, Modal, DdayBadge } from "@/src/components/ui";
import { EventForm, TodoForm } from "@/src/components/forms";

export function CalendarTab({calMonth,calTab,data,modal,setCalMonth,setCalTab,setModal,upd}){
  return (
            <div>
              <div style={{display:"flex",gap:8,marginBottom:20}}>
                <button onClick={()=>setCalTab("calendar")} style={{background:calTab==="calendar"?"#6366f1":"#1e293b",color:calTab==="calendar"?"#fff":"#94a3b8",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:600,fontSize:14}}>📅 캘린더</button>
                <button onClick={()=>setCalTab("todos")} style={{background:calTab==="todos"?"#6366f1":"#1e293b",color:calTab==="todos"?"#fff":"#94a3b8",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:600,fontSize:14}}>✅ 할 일</button>
                <button onClick={()=>setCalTab("alerts")} style={{background:calTab==="alerts"?"#6366f1":"#1e293b",color:calTab==="alerts"?"#fff":"#94a3b8",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:600,fontSize:14}}>🔔 D-Day</button>
              </div>

              {calTab==="calendar"&&(
                <div>
                  {/* Month Nav */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                    <button onClick={()=>setCalMonth(p=>{let m=p.m-1,y=p.y;if(m<0){m=11;y--;}return{y,m};})} style={{background:"#1e293b",border:"none",color:"#94a3b8",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:16}}>‹</button>
                    <div style={{fontWeight:800,fontSize:18}}>{calMonth.y}년 {calMonth.m+1}월</div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>{const n=new Date();setCalMonth({y:n.getFullYear(),m:n.getMonth()});}} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:12,fontWeight:600}}>오늘</button>
                      <Btn onClick={()=>setModal("addEvent")} style={{padding:"6px 12px",fontSize:12}}>+ 일정</Btn>
                      <Btn onClick={()=>setModal("addTodo")} color="#f59e0b" style={{padding:"6px 12px",fontSize:12}}>+ 할 일</Btn>
                      <button onClick={()=>setCalMonth(p=>{let m=p.m+1,y=p.y;if(m>11){m=0;y++;}return{y,m};})} style={{background:"#1e293b",border:"none",color:"#94a3b8",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:16}}>›</button>
                    </div>
                  </div>

                  {/* Monthly Todo Progress */}
                  {(()=>{
                    const mTodos=(data.todos||[]).filter(t=>{const d=new Date(t.dueDate);return d.getFullYear()===calMonth.y&&d.getMonth()===calMonth.m;});
                    const mDone=mTodos.filter(t=>t.done).length;
                    const mPct=mTodos.length>0?Math.round(mDone/mTodos.length*100):0;
                    const mEvents=(data.calendarEvents||[]).filter(e=>{const d=new Date(e.date);return d.getFullYear()===calMonth.y&&d.getMonth()===calMonth.m;});
                    const eDone=mEvents.filter(e=>e.done).length;
                    return mTodos.length+mEvents.length>0?(
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:16}}>
                        <div style={{background:"#1e293b",borderRadius:10,padding:"12px 14px"}}>
                          <div style={{color:"#94a3b8",fontSize:11}}>이달 일정</div>
                          <div style={{color:"#6366f1",fontSize:20,fontWeight:800}}>{mEvents.length}<span style={{fontSize:12,color:"#475569",fontWeight:400}}> ({eDone}완료)</span></div>
                        </div>
                        <div style={{background:"#1e293b",borderRadius:10,padding:"12px 14px"}}>
                          <div style={{color:"#94a3b8",fontSize:11}}>이달 할 일</div>
                          <div style={{color:"#f59e0b",fontSize:20,fontWeight:800}}>{mTodos.length}<span style={{fontSize:12,color:"#475569",fontWeight:400}}> ({mDone}완료)</span></div>
                        </div>
                        <div style={{background:"#1e293b",borderRadius:10,padding:"12px 14px"}}>
                          <div style={{color:"#94a3b8",fontSize:11}}>할 일 진행률</div>
                          <div style={{color:mPct>=80?"#10b981":mPct>=50?"#f59e0b":"#ef4444",fontSize:20,fontWeight:800}}>{mPct}%</div>
                          <div style={{background:"#0f172a",borderRadius:99,height:4,overflow:"hidden",marginTop:4}}>
                            <div style={{width:`${mPct}%`,background:mPct>=80?"#10b981":mPct>=50?"#f59e0b":"#ef4444",height:"100%",borderRadius:99}}/>
                          </div>
                        </div>
                        <div style={{background:"#1e293b",borderRadius:10,padding:"12px 14px"}}>
                          <div style={{color:"#94a3b8",fontSize:11}}>미완료 합계</div>
                          <div style={{color:"#ef4444",fontSize:20,fontWeight:800}}>{mTodos.filter(t=>!t.done).length+mEvents.filter(e=>!e.done).length}건</div>
                        </div>
                      </div>
                    ):null;
                  })()}

                  {/* Calendar Grid */}
                  {(()=>{
                    const firstDay=new Date(calMonth.y,calMonth.m,1).getDay();
                    const daysInMonth=new Date(calMonth.y,calMonth.m+1,0).getDate();
                    const todayStr=today();
                    const cells=[];
                    for(let i=0;i<firstDay;i++)cells.push(null);
                    for(let d=1;d<=daysInMonth;d++)cells.push(d);
                    const events=data.calendarEvents||[];
                    const todos=data.todos||[];
                    return (
                      <div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
                          {["일","월","화","수","목","금","토"].map((d,i)=>(
                            <div key={i} style={{textAlign:"center",padding:"6px",color:i===0?"#ef4444":i===6?"#6366f1":"#64748b",fontSize:12,fontWeight:700}}>{d}</div>
                          ))}
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
                          {cells.map((d,i)=>{
                            if(!d)return <div key={i} style={{background:"#0a0f1e",borderRadius:6,minHeight:85}}/>;
                            const dateStr=`${calMonth.y}-${String(calMonth.m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                            const dayEvents=events.filter(e=>e.date===dateStr);
                            const dayTodos=todos.filter(t=>t.dueDate===dateStr);
                            const allItems=[...dayEvents.map(e=>({...e,_type:"event"})),...dayTodos.map(t=>({...t,_type:"todo"}))];
                            const isToday=dateStr===todayStr;
                            const dow=new Date(calMonth.y,calMonth.m,d).getDay();
                            return (
                              <div key={i} style={{background:isToday?"#1e1b4b":"#0f172a",borderRadius:6,minHeight:85,padding:"4px 6px",border:isToday?"1px solid #6366f1":"1px solid #1e293b"}}>
                                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
                                  <span style={{fontSize:12,fontWeight:isToday?800:600,color:isToday?"#6366f1":dow===0?"#ef4444":dow===6?"#818cf8":"#94a3b8"}}>{d}</span>
                                  {allItems.length>0&&<span style={{fontSize:8,color:"#475569"}}>{allItems.length}</span>}
                                </div>
                                {allItems.slice(0,3).map((item,idx)=>{
                                  if(item._type==="event"){
                                    const et=EVENT_TYPES.find(t=>t.v===item.type);
                                    return (
                                      <div key={"e"+item.id} style={{background:et?.c+"22",borderLeft:`2px solid ${et?.c||"#6366f1"}`,borderRadius:3,padding:"1px 5px",marginBottom:2,fontSize:10,color:item.done?"#475569":et?.c||"#94a3b8",textDecoration:item.done?"line-through":"none",cursor:"pointer",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}
                                        onClick={()=>upd("calendarEvents",events.map(e=>e.id===item.id?{...e,done:!e.done}:e))}>
                                        {item.title}
                                      </div>
                                    );
                                  }else{
                                    const pr=PRIORITY_OPTS.find(p=>p.v===item.priority);
                                    return (
                                      <div key={"t"+item.id} style={{background:pr?.c+"15",borderLeft:`2px solid ${pr?.c||"#f59e0b"}`,borderRadius:3,padding:"1px 5px",marginBottom:2,fontSize:10,color:item.done?"#475569":pr?.c||"#f59e0b",textDecoration:item.done?"line-through":"none",cursor:"pointer",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}
                                        onClick={()=>upd("todos",todos.map(t=>t.id===item.id?{...t,done:!t.done}:t))}>
                                        ✓ {item.text}
                                      </div>
                                    );
                                  }
                                })}
                                {allItems.length>3&&<div style={{color:"#475569",fontSize:9}}>+{allItems.length-3}건</div>}
                              </div>
                            );
                          })}
                        </div>
                        <div style={{display:"flex",gap:12,marginTop:8,justifyContent:"center"}}>
                          {EVENT_TYPES.map(t=><span key={t.v} style={{display:"flex",alignItems:"center",gap:3,fontSize:10,color:"#64748b"}}><span style={{display:"inline-block",width:8,height:8,borderRadius:2,background:t.c}}/>{t.l}</span>)}
                          <span style={{display:"flex",alignItems:"center",gap:3,fontSize:10,color:"#64748b"}}><span style={{display:"inline-block",width:8,height:8,borderRadius:2,background:"#f59e0b"}}/>✓ 할 일</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Combined Monthly List: Events + Todos */}
                  {(()=>{
                    const mEvents=(data.calendarEvents||[]).filter(e=>{const d=new Date(e.date);return d.getFullYear()===calMonth.y&&d.getMonth()===calMonth.m;});
                    const mTodos=(data.todos||[]).filter(t=>{const d=new Date(t.dueDate);return d.getFullYear()===calMonth.y&&d.getMonth()===calMonth.m;});
                    const allItems=[
                      ...mEvents.map(e=>({...e,_type:"event",_date:e.date,_done:e.done})),
                      ...mTodos.map(t=>({...t,_type:"todo",_date:t.dueDate,_done:t.done})),
                    ].sort((a,b)=>a._done-b._done||a._date.localeCompare(b._date));
                    return (
                      <div style={{background:"#1e293b",borderRadius:14,padding:"16px 18px",marginTop:16}}>
                        <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>📋 {calMonth.m+1}월 전체 ({allItems.length}건)</div>
                        {allItems.length===0&&<div style={{color:"#334155",padding:12,textAlign:"center",fontSize:13}}>이달 일정/할 일이 없습니다</div>}
                        {allItems.map(item=>{
                          if(item._type==="event"){
                            const et=EVENT_TYPES.find(t=>t.v===item.type);
                            return (
                              <div key={"e"+item.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"#0f172a",borderRadius:8,marginBottom:4,borderLeft:`3px solid ${et?.c||"#6366f1"}`,opacity:item.done?0.5:1}}>
                                <button onClick={()=>upd("calendarEvents",(data.calendarEvents||[]).map(e=>e.id===item.id?{...e,done:!e.done}:e))}
                                  style={{background:"none",border:"none",fontSize:16,cursor:"pointer",padding:0}}>{item.done?"✅":"⬜"}</button>
                                <span style={{color:"#64748b",fontSize:12,fontWeight:700,minWidth:55}}>{item.date.slice(5)}</span>
                                <span style={{background:et?.c+"22",color:et?.c,borderRadius:4,padding:"1px 7px",fontSize:11,fontWeight:600}}>{et?.l||item.type}</span>
                                <span style={{color:item.done?"#475569":"#e2e8f0",fontSize:13,flex:1,textDecoration:item.done?"line-through":"none"}}>{item.title}</span>
                                <span style={{background:"#1e293b",color:"#64748b",borderRadius:4,padding:"1px 7px",fontSize:10}}>{item.channel}</span>
                                <DdayBadge dateStr={item.date}/>
                                <DelBtn onClick={()=>upd("calendarEvents",(data.calendarEvents||[]).filter(e=>e.id!==item.id))}/>
                              </div>
                            );
                          }else{
                            const pr=PRIORITY_OPTS.find(p=>p.v===item.priority);
                            return (
                              <div key={"t"+item.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"#0f172a",borderRadius:8,marginBottom:4,borderLeft:`3px solid ${pr?.c||"#f59e0b"}`,opacity:item.done?0.5:1}}>
                                <button onClick={()=>upd("todos",(data.todos||[]).map(t=>t.id===item.id?{...t,done:!t.done}:t))}
                                  style={{background:item.done?"#10b981":"none",border:item.done?"none":`2px solid ${pr?.c||"#64748b"}`,borderRadius:6,width:22,height:22,cursor:"pointer",flexShrink:0,color:"#fff",fontSize:11,lineHeight:"22px",textAlign:"center"}}>{item.done?"✓":""}</button>
                                <span style={{color:"#64748b",fontSize:12,fontWeight:700,minWidth:55}}>{item.dueDate.slice(5)}</span>
                                <span style={{background:pr?.c+"22",color:pr?.c,borderRadius:4,padding:"1px 7px",fontSize:11,fontWeight:600}}>{pr?.l}</span>
                                <span style={{color:item.done?"#475569":"#e2e8f0",fontSize:13,flex:1,textDecoration:item.done?"line-through":"none"}}>{item.text}</span>
                                <span style={{background:"#1e293b",color:"#64748b",borderRadius:4,padding:"1px 7px",fontSize:10}}>{item.channel}</span>
                                <DdayBadge dateStr={item.dueDate}/>
                                <DelBtn onClick={()=>upd("todos",(data.todos||[]).filter(t=>t.id!==item.id))}/>
                              </div>
                            );
                          }
                        })}
                      </div>
                    );
                  })()}
                  {modal==="addEvent"&&<Modal title="📅 일정 추가" onClose={()=>setModal(null)}><EventForm onSave={f=>{upd("calendarEvents",[...(data.calendarEvents||[]),{...f,id:Date.now(),done:false}]);setModal(null);}}/></Modal>}
                  {modal==="addTodo"&&<Modal title="✅ 할 일 추가" onClose={()=>setModal(null)}><TodoForm onSave={f=>{upd("todos",[...(data.todos||[]),{...f,id:Date.now(),done:false}]);setModal(null);}}/></Modal>}
                </div>
              )}

              {calTab==="todos"&&(
                <div>
                  {/* Month Nav (shared with calendar) */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                    <button onClick={()=>setCalMonth(p=>{let m=p.m-1,y=p.y;if(m<0){m=11;y--;}return{y,m};})} style={{background:"#1e293b",border:"none",color:"#94a3b8",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:16}}>‹</button>
                    <div style={{fontWeight:800,fontSize:18}}>{calMonth.y}년 {calMonth.m+1}월 할 일</div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>{const n=new Date();setCalMonth({y:n.getFullYear(),m:n.getMonth()});}} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:12,fontWeight:600}}>이번 달</button>
                      <Btn onClick={()=>setModal("addTodo")}>+ 할 일</Btn>
                      <button onClick={()=>setCalMonth(p=>{let m=p.m+1,y=p.y;if(m>11){m=0;y++;}return{y,m};})} style={{background:"#1e293b",border:"none",color:"#94a3b8",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:16}}>›</button>
                    </div>
                  </div>

                  {(()=>{
                    const allTodos=data.todos||[];
                    const mTodos=allTodos.filter(t=>{const d=new Date(t.dueDate);return d.getFullYear()===calMonth.y&&d.getMonth()===calMonth.m;});
                    const mPending=mTodos.filter(t=>!t.done);
                    const mDone=mTodos.filter(t=>t.done);
                    const mPct=mTodos.length>0?Math.round(mDone.length/mTodos.length*100):0;

                    const totalAll=allTodos.length;
                    const totalDone=allTodos.filter(t=>t.done).length;
                    const totalPct=totalAll>0?Math.round(totalDone/totalAll*100):0;

                    return (
                      <div>
                        {/* Progress Cards */}
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
                          <div style={{background:"#1e293b",borderRadius:14,padding:"16px 20px"}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                              <span style={{color:"#94a3b8",fontSize:13,fontWeight:600}}>📊 전체 진행률</span>
                              <span style={{color:totalPct>=80?"#10b981":totalPct>=50?"#f59e0b":"#ef4444",fontWeight:800,fontSize:20}}>{totalPct}%</span>
                            </div>
                            <div style={{background:"#0f172a",borderRadius:99,height:10,overflow:"hidden",marginBottom:6}}>
                              <div style={{width:`${totalPct}%`,background:totalPct>=80?"#10b981":totalPct>=50?"#f59e0b":"#ef4444",height:"100%",borderRadius:99,transition:"width 0.3s"}}/>
                            </div>
                            <div style={{color:"#475569",fontSize:11}}>{totalDone}완료 / {totalAll}전체 · 미완료 {totalAll-totalDone}건</div>
                          </div>
                          <div style={{background:"#1e293b",borderRadius:14,padding:"16px 20px"}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                              <span style={{color:"#94a3b8",fontSize:13,fontWeight:600}}>📅 {calMonth.m+1}월 진행률</span>
                              <span style={{color:mPct>=80?"#10b981":mPct>=50?"#f59e0b":"#ef4444",fontWeight:800,fontSize:20}}>{mTodos.length>0?mPct:"-"}%</span>
                            </div>
                            <div style={{background:"#0f172a",borderRadius:99,height:10,overflow:"hidden",marginBottom:6}}>
                              <div style={{width:`${mPct}%`,background:mPct>=80?"#10b981":mPct>=50?"#f59e0b":"#ef4444",height:"100%",borderRadius:99,transition:"width 0.3s"}}/>
                            </div>
                            <div style={{color:"#475569",fontSize:11}}>{mDone.length}완료 / {mTodos.length}전체 · 미완료 {mPending.length}건</div>
                          </div>
                        </div>

                        {/* Channel Summary */}
                        {mTodos.length>0&&(
                          <div style={{background:"#1e293b",borderRadius:14,padding:"14px 18px",marginBottom:20}}>
                            <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"#94a3b8"}}>채널별 현황</div>
                            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                              {[...new Set(mTodos.map(t=>t.channel))].map(ch=>{
                                const chTodos=mTodos.filter(t=>t.channel===ch);
                                const chDone=chTodos.filter(t=>t.done).length;
                                const chPct=Math.round(chDone/chTodos.length*100);
                                return (
                                  <div key={ch} style={{background:"#0f172a",borderRadius:8,padding:"8px 12px",minWidth:100}}>
                                    <div style={{fontSize:12,fontWeight:700,color:"#e2e8f0",marginBottom:4}}>{ch}</div>
                                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                                      <div style={{background:"#1e293b",borderRadius:99,height:5,flex:1,overflow:"hidden"}}>
                                        <div style={{width:`${chPct}%`,background:chPct>=100?"#10b981":chPct>=50?"#f59e0b":"#ef4444",height:"100%",borderRadius:99}}/>
                                      </div>
                                      <span style={{color:"#64748b",fontSize:10,fontWeight:700}}>{chDone}/{chTodos.length}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Pending Todos for this month */}
                        <div style={{marginBottom:20}}>
                          <div style={{fontWeight:700,fontSize:14,marginBottom:10,color:"#e2e8f0"}}>📌 미완료 ({mPending.length}건)</div>
                          {mPending.sort((a,b)=>{const po={high:0,medium:1,low:2};return(po[a.priority]||1)-(po[b.priority]||1)||a.dueDate.localeCompare(b.dueDate);}).map(todo=>{
                            const pr=PRIORITY_OPTS.find(p=>p.v===todo.priority);
                            return (
                              <div key={todo.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"#0f172a",borderRadius:10,marginBottom:6,borderLeft:`3px solid ${pr?.c||"#f59e0b"}`}}>
                                <button onClick={()=>upd("todos",allTodos.map(t=>t.id===todo.id?{...t,done:true}:t))}
                                  style={{background:"none",border:`2px solid ${pr?.c||"#64748b"}`,borderRadius:6,width:22,height:22,cursor:"pointer",flexShrink:0}}/>
                                <div style={{flex:1}}>
                                  <div style={{color:"#e2e8f0",fontSize:14,fontWeight:600}}>{todo.text}</div>
                                  <div style={{display:"flex",gap:6,marginTop:4,alignItems:"center"}}>
                                    <span style={{background:pr?.c+"22",color:pr?.c,borderRadius:4,padding:"1px 7px",fontSize:10,fontWeight:700}}>{pr?.l}</span>
                                    <span style={{background:"#1e293b",color:"#64748b",borderRadius:4,padding:"1px 7px",fontSize:10}}>{todo.channel}</span>
                                    <span style={{color:"#475569",fontSize:11}}>마감 {todo.dueDate?.slice(5)}</span>
                                  </div>
                                </div>
                                <DdayBadge dateStr={todo.dueDate}/>
                                <DelBtn onClick={()=>upd("todos",allTodos.filter(t=>t.id!==todo.id))}/>
                              </div>
                            );
                          })}
                          {!mPending.length&&(
                            <div style={{background:"#022c22",borderRadius:10,padding:"20px",textAlign:"center",color:"#10b981",fontSize:14}}>🎉 {calMonth.m+1}월 할 일을 모두 완료했습니다!</div>
                          )}
                        </div>

                        {/* Done Todos for this month */}
                        {mDone.length>0&&(
                          <div>
                            <div style={{fontWeight:700,fontSize:14,marginBottom:10,color:"#475569"}}>✅ 완료 ({mDone.length}건)</div>
                            {mDone.map(todo=>(
                              <div key={todo.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 14px",background:"#0f172a",borderRadius:8,marginBottom:4,opacity:0.5}}>
                                <button onClick={()=>upd("todos",allTodos.map(t=>t.id===todo.id?{...t,done:false}:t))}
                                  style={{background:"#10b981",border:"none",borderRadius:6,width:22,height:22,cursor:"pointer",color:"#fff",fontSize:12,lineHeight:"22px",textAlign:"center",flexShrink:0}}>✓</button>
                                <span style={{color:"#475569",fontSize:13,textDecoration:"line-through",flex:1}}>{todo.text}</span>
                                <span style={{color:"#334155",fontSize:10}}>{todo.channel} · {todo.dueDate?.slice(5)}</span>
                                <DelBtn onClick={()=>upd("todos",allTodos.filter(t=>t.id!==todo.id))}/>
                              </div>
                            ))}
                          </div>
                        )}

                        {!mTodos.length&&(
                          <div style={{background:"#1e293b",borderRadius:14,padding:"40px 20px",textAlign:"center"}}>
                            <div style={{fontSize:40,marginBottom:12}}>📋</div>
                            <div style={{color:"#94a3b8",fontSize:14}}>{calMonth.m+1}월에 등록된 할 일이 없습니다</div>
                            <div style={{color:"#64748b",fontSize:12,marginTop:4}}>+ 할 일 버튼으로 추가하세요</div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {modal==="addTodo"&&<Modal title="✅ 할 일 추가" onClose={()=>setModal(null)}><TodoForm onSave={f=>{upd("todos",[...(data.todos||[]),{...f,id:Date.now(),done:false}]);setModal(null);}}/></Modal>}
                </div>
              )}

              {calTab==="alerts"&&(
                <div>
                  <div style={{fontWeight:800,fontSize:16,marginBottom:16}}>🔔 D-Day 알림</div>
                  {(()=>{
                    // Collect all deadlines
                    const alerts=[];
                    // From calendar events (deadlines)
                    (data.calendarEvents||[]).filter(e=>e.type==="deadline"&&!e.done).forEach(e=>alerts.push({title:e.title,date:e.date,channel:e.channel,source:"캘린더"}));
                    // From offline ads
                    [...(data.offline?.elevator||[]),...(data.offline?.subway||[]),...(data.offline?.other||[])].filter(a=>a.status==="집행중").forEach(a=>{
                      const loc=a.complex||a.station||a.location||a.type;
                      alerts.push({title:`${loc} 광고 종료`,date:a.endDate,channel:"오프라인",source:"오프라인 광고"});
                    });
                    // From todos
                    (data.todos||[]).filter(t=>!t.done).forEach(t=>alerts.push({title:t.text,date:t.dueDate,channel:t.channel,source:"할 일"}));
                    // Sort
                    alerts.sort((a,b)=>getDday(a.date)-getDday(b.date));
                    const urgent=alerts.filter(a=>{const d=getDday(a.date);return d>=0&&d<=7;});
                    const upcoming=alerts.filter(a=>{const d=getDday(a.date);return d>7&&d<=30;});
                    const overdue=alerts.filter(a=>getDday(a.date)<0);
                    const renderList=(items,emptyMsg)=>items.length?items.map((a,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"#0f172a",borderRadius:8,marginBottom:4}}>
                        <DdayBadge dateStr={a.date}/>
                        <span style={{color:"#e2e8f0",fontSize:13,flex:1,fontWeight:600}}>{a.title}</span>
                        <span style={{background:"#1e293b",color:"#64748b",borderRadius:4,padding:"1px 7px",fontSize:10}}>{a.channel}</span>
                        <span style={{color:"#334155",fontSize:10}}>{a.source}</span>
                        <span style={{color:"#475569",fontSize:11}}>{a.date}</span>
                      </div>
                    )):<div style={{color:"#334155",padding:12,textAlign:"center",fontSize:13}}>{emptyMsg}</div>;

                    return (
                      <div>
                        {/* Summary */}
                        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
                          <div style={{background:"#2d0f0f",borderRadius:12,padding:"16px 18px",border:"1px solid #ef444444"}}>
                            <div style={{color:"#ef4444",fontSize:12,fontWeight:600}}>🚨 긴급 (7일 이내)</div>
                            <div style={{color:"#ef4444",fontSize:28,fontWeight:800,marginTop:4}}>{urgent.length}건</div>
                          </div>
                          <div style={{background:"#422006",borderRadius:12,padding:"16px 18px",border:"1px solid #f59e0b44"}}>
                            <div style={{color:"#f59e0b",fontSize:12,fontWeight:600}}>⏳ 예정 (30일 이내)</div>
                            <div style={{color:"#f59e0b",fontSize:28,fontWeight:800,marginTop:4}}>{upcoming.length}건</div>
                          </div>
                          <div style={{background:"#1e293b",borderRadius:12,padding:"16px 18px",border:"1px solid #47556944"}}>
                            <div style={{color:"#94a3b8",fontSize:12,fontWeight:600}}>⚠️ 지난 기한</div>
                            <div style={{color:"#94a3b8",fontSize:28,fontWeight:800,marginTop:4}}>{overdue.length}건</div>
                          </div>
                        </div>

                        {urgent.length>0&&(
                          <div style={{background:"#1e293b",borderRadius:14,padding:"16px 18px",marginBottom:16}}>
                            <div style={{fontWeight:700,fontSize:14,marginBottom:10,color:"#ef4444"}}>🚨 긴급 알림</div>
                            {renderList(urgent,"없음")}
                          </div>
                        )}
                        {upcoming.length>0&&(
                          <div style={{background:"#1e293b",borderRadius:14,padding:"16px 18px",marginBottom:16}}>
                            <div style={{fontWeight:700,fontSize:14,marginBottom:10,color:"#f59e0b"}}>⏳ 다가오는 기한</div>
                            {renderList(upcoming,"없음")}
                          </div>
                        )}
                        {overdue.length>0&&(
                          <div style={{background:"#1e293b",borderRadius:14,padding:"16px 18px",marginBottom:16}}>
                            <div style={{fontWeight:700,fontSize:14,marginBottom:10,color:"#94a3b8"}}>⚠️ 지난 항목</div>
                            {renderList(overdue,"없음")}
                          </div>
                        )}
                        {!alerts.length&&(
                          <div style={{background:"#1e293b",borderRadius:14,padding:"40px 20px",textAlign:"center"}}>
                            <div style={{fontSize:40,marginBottom:12}}>🎉</div>
                            <div style={{color:"#10b981",fontSize:15,fontWeight:700}}>등록된 기한이 없습니다</div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
  );
}
