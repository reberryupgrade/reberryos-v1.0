"use client";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, AreaChart, Area, Legend } from "recharts";
import { fmt } from "@/src/lib/format";
import { Th, Td, Btn, DelBtn, Modal } from "@/src/components/ui";
import { PerfForm } from "@/src/components/forms";

export function PerformanceTab({data,modal,setModal,upd}){
  return (
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
                <div><div style={{fontWeight:800,fontSize:16}}>성과 추이 분석</div></div>
                <Btn color="#334155" style={{color:"#94a3b8"}} onClick={()=>setModal("addPerf")}>+ 데이터 입력</Btn>
              </div>
              <div style={{background:"#1e293b",borderRadius:14,padding:"18px 20px",marginBottom:16}}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>📺 콘텐츠 조회수 추이</div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={data.performanceLogs||[]} margin={{top:10,right:20,left:10,bottom:0}}>
                    <defs>
                      <linearGradient id="ytG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/><stop offset="95%" stopColor="#f97316" stopOpacity={0}/></linearGradient>
                      <linearGradient id="sfG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" vertical={false}/>
                    <XAxis dataKey="period" tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:"#94a3b8"}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} width={40}/>
                    <Tooltip formatter={(v,n)=>[fmt(v)+"회",n==="youtube_views"?"유튜브":"숏폼"]} contentStyle={{background:"#0f172a",border:"1px solid #334155",fontSize:12}}/>
                    <Legend formatter={n=>n==="youtube_views"?"유튜브":"숏폼"} wrapperStyle={{fontSize:12}}/>
                    <Area type="monotone" dataKey="youtube_views" stroke="#f97316" fill="url(#ytG)" strokeWidth={2} dot={{fill:"#f97316",r:3}}/>
                    <Area type="monotone" dataKey="shortform_views" stroke="#8b5cf6" fill="url(#sfG)" strokeWidth={2} dot={{fill:"#8b5cf6",r:3}}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div style={{background:"#1e293b",borderRadius:14,padding:"18px 20px",marginBottom:16}}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>🗺️ 네이버 노출 추이</div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={data.performanceLogs||[]} margin={{top:10,right:20,left:10,bottom:0}}>
                    <defs>
                      <linearGradient id="blG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                      <linearGradient id="plG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/><stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" vertical={false}/>
                    <XAxis dataKey="period" tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:"#94a3b8"}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} width={40}/>
                    <Tooltip formatter={(v,n)=>[fmt(v)+"회",n==="blog_visits"?"블로그":"플레이스"]} contentStyle={{background:"#0f172a",border:"1px solid #334155",fontSize:12}}/>
                    <Legend formatter={n=>n==="blog_visits"?"블로그":"플레이스"} wrapperStyle={{fontSize:12}}/>
                    <Area type="monotone" dataKey="blog_visits" stroke="#6366f1" fill="url(#blG)" strokeWidth={2} dot={{fill:"#6366f1",r:3}}/>
                    <Area type="monotone" dataKey="place_views" stroke="#06b6d4" fill="url(#plG)" strokeWidth={2} dot={{fill:"#06b6d4",r:3}}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
                <div style={{background:"#1e293b",borderRadius:14,padding:"16px 18px"}}>
                  <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>⭐ 신규 리뷰</div>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={data.performanceLogs||[]}><CartesianGrid strokeDasharray="3 3" stroke="#0f172a" vertical={false}/><XAxis dataKey="period" tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:10,fill:"#94a3b8"}} width={26}/><Tooltip formatter={v=>[v+"건","리뷰"]} contentStyle={{background:"#0f172a",border:"1px solid #334155",fontSize:11}}/><Bar dataKey="new_reviews" fill="#10b981" radius={[3,3,0,0]}/></BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{background:"#1e293b",borderRadius:14,padding:"16px 18px"}}>
                  <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>☕ 카페 게시물</div>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={data.performanceLogs||[]}><CartesianGrid strokeDasharray="3 3" stroke="#0f172a" vertical={false}/><XAxis dataKey="period" tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:10,fill:"#94a3b8"}} width={26}/><Tooltip formatter={v=>[v+"건","게시물"]} contentStyle={{background:"#0f172a",border:"1px solid #334155",fontSize:11}}/><Bar dataKey="cafe_posts" fill="#ec4899" radius={[3,3,0,0]}/></BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={{background:"#1e293b",borderRadius:14,padding:"16px 18px"}}>
                <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>📋 월별 상세</div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                    <thead><tr><Th c="기간"/><Th c="유튜브"/><Th c="숏폼"/><Th c="블로그"/><Th c="플레이스"/><Th c="리뷰"/><Th c="카페"/><Th c="메모"/><Th c=""/></tr></thead>
                    <tbody>{(data.performanceLogs||[]).map((log,ri)=>(
                      <tr key={log.id} style={{borderBottom:"1px solid #0f172a",background:ri%2===0?"#0f172a":"#111827"}}>
                        <Td><span style={{fontWeight:700,color:"#6366f1"}}>{log.period}</span></Td>
                        <Td><span style={{color:"#f97316"}}>{fmt(log.youtube_views)}</span></Td>
                        <Td><span style={{color:"#8b5cf6"}}>{fmt(log.shortform_views)}</span></Td>
                        <Td><span style={{color:"#6366f1"}}>{fmt(log.blog_visits)}</span></Td>
                        <Td><span style={{color:"#06b6d4"}}>{fmt(log.place_views)}</span></Td>
                        <Td><span style={{color:"#10b981"}}>{log.new_reviews}건</span></Td>
                        <Td><span style={{color:"#ec4899"}}>{log.cafe_posts}건</span></Td>
                        <Td><span style={{color:"#64748b",fontSize:11}}>{log.notes||"-"}</span></Td>
                        <Td><DelBtn onClick={()=>upd("performanceLogs",(data.performanceLogs||[]).filter(l=>l.id!==log.id))}/></Td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
              {modal==="addPerf"&&<Modal title="📊 성과 데이터 입력" onClose={()=>setModal(null)}><PerfForm onSave={f=>{upd("performanceLogs",[...(data.performanceLogs||[]),{...f,id:Date.now()}]);setModal(null);}}/></Modal>}
            </div>
  );
}
