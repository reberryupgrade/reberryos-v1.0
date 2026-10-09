"use client";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from "recharts";
import { fmt, fmtW } from "@/src/lib/format";
import { Badge, Th, Td, ProgressBar, StatCard } from "@/src/components/ui";

export function ClientPortal({data,onClose,budgetTotal,standalone}){
  const cfg=data.portalConfig||{};
  const latest=data.performanceLogs?.[data.performanceLogs.length-1]||{};
  const prev=data.performanceLogs?.[data.performanceLogs.length-2]||{};
  return (
    <div style={{background:"#0a0f1e",borderRadius:standalone?0:16,border:standalone?"none":"2px solid #6366f1",overflow:"hidden",minHeight:standalone?"100vh":"auto"}}>
      <div style={{background:"linear-gradient(135deg,#1e1b4b,#312e81)",padding:"24px 28px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{fontSize:36}}>{cfg.logoText||"🏥"}</div>
          <div>
            <div style={{fontWeight:800,fontSize:20,color:"#fff"}}>{cfg.clinicName||"클라이언트"}</div>
            <div style={{color:"#a5b4fc",fontSize:13,marginTop:2}}>마케팅 성과 보고서 · {cfg.reportMonth||"이번 달"}</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{textAlign:"right"}}>
            <div style={{color:"#a5b4fc",fontSize:11}}>담당</div>
            <div style={{color:"#fff",fontWeight:700,fontSize:13}}>{cfg.managerName||"마케팅팀"}</div>
          </div>
          {onClose&&<button onClick={onClose} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"#fff",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:600}}>← 설정으로</button>}
        </div>
      </div>
      <div style={{padding:"24px 28px"}}>
        {cfg.memo&&<div style={{background:"#1e293b",borderRadius:10,padding:"14px 18px",marginBottom:20,borderLeft:"3px solid #6366f1"}}>
          <div style={{color:"#94a3b8",fontSize:11,marginBottom:4}}>📌 담당자 메모</div>
          <div style={{color:"#e2e8f0",fontSize:13,lineHeight:1.6}}>{cfg.memo}</div>
        </div>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:12,marginBottom:20}}>
          {cfg.showYoutube&&<StatCard icon="📺" label="유튜브 조회수" value={fmt(latest.youtube_views||0)} color="#f97316" cur={latest.youtube_views} pre={prev.youtube_views}/>}
          {cfg.showShortform&&<StatCard icon="🎬" label="숏폼 조회수" value={fmt(latest.shortform_views||0)} color="#8b5cf6" cur={latest.shortform_views} pre={prev.shortform_views}/>}
          {cfg.showKeywords&&<StatCard icon="📝" label="블로그 방문" value={fmt(latest.blog_visits||0)} color="#6366f1" cur={latest.blog_visits} pre={prev.blog_visits}/>}
          {cfg.showMaps&&<StatCard icon="📍" label="플레이스 조회" value={fmt(latest.place_views||0)} color="#06b6d4" cur={latest.place_views} pre={prev.place_views}/>}
          {cfg.showReviews&&<StatCard icon="⭐" label="신규 리뷰" value={(latest.new_reviews||0)+"건"} color="#10b981" cur={latest.new_reviews} pre={prev.new_reviews}/>}
          {cfg.showCafes&&<StatCard icon="☕" label="카페 게시물" value={(latest.cafe_posts||0)+"건"} color="#ec4899" cur={latest.cafe_posts} pre={prev.cafe_posts}/>}
          {cfg.showBudget&&<StatCard icon="💰" label="월 집행비" value={fmtW(budgetTotal||0)} color="#f59e0b"/>}
        </div>
        <div style={{background:"#1e293b",borderRadius:12,padding:"16px 20px",marginBottom:16}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:14,color:"#e2e8f0"}}>📈 6개월 성과 추이</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data.performanceLogs||[]} margin={{top:10,right:10,left:0,bottom:0}}>
              <defs>
                <linearGradient id="pYt" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.25}/><stop offset="95%" stopColor="#f97316" stopOpacity={0}/></linearGradient>
                <linearGradient id="pSf" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" vertical={false}/>
              <XAxis dataKey="period" tick={{fontSize:10,fill:"#64748b"}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:10,fill:"#64748b"}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} width={36}/>
              <Tooltip formatter={(v,n)=>[fmt(v)+"회",n==="youtube_views"?"유튜브":"숏폼"]} contentStyle={{background:"#0f172a",border:"1px solid #1e293b",fontSize:11}}/>
              <Area type="monotone" dataKey="youtube_views" stroke="#f97316" fill="url(#pYt)" strokeWidth={2} dot={false}/>
              <Area type="monotone" dataKey="shortform_views" stroke="#8b5cf6" fill="url(#pSf)" strokeWidth={2} dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {cfg.showKeywords&&data.keywords?.length>0&&(
          <div style={{background:"#1e293b",borderRadius:12,padding:"16px 20px",marginBottom:16}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:12,color:"#e2e8f0"}}>🔍 키워드 순위</div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr><Th c="키워드"/><Th c="블로그"/><Th c="플레이스"/><Th c="상태"/></tr></thead>
              <tbody>{data.keywords.map((k,ri)=>(
                <tr key={k.id} style={{borderBottom:"1px solid #0f172a",background:ri%2===0?"#0f172a":"#111827"}}>
                  <Td><span style={{fontWeight:700}}>{k.keyword}</span></Td>
                  <Td><span style={{color:k.myBlogRank==="1위"?"#10b981":"#f59e0b",fontWeight:700}}>{k.myBlogRank}</span></Td>
                  <Td><span style={{color:k.myPlaceRank==="1위"?"#10b981":"#f59e0b",fontWeight:700}}>{k.myPlaceRank}</span></Td>
                  <Td><Badge status={k.status}/></Td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {cfg.showMaps&&data.maps?.length>0&&(
          <div style={{background:"#1e293b",borderRadius:12,padding:"16px 20px",marginBottom:16}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:12,color:"#e2e8f0"}}>📍 지도 순위</div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr><Th c="키워드"/><Th c="네이버"/><Th c="구글"/><Th c="카카오"/></tr></thead>
              <tbody>{data.maps.map((m,ri)=>(
                <tr key={m.id} style={{borderBottom:"1px solid #0f172a",background:ri%2===0?"#0f172a":"#111827"}}>
                  <Td><span style={{fontWeight:700}}>{m.keyword}</span></Td>
                  <Td><span style={{color:m.naverPlace==="1위"?"#10b981":"#f59e0b",fontWeight:700}}>{m.naverPlace}</span></Td>
                  <Td><span style={{color:m.google==="1위"?"#10b981":"#f59e0b",fontWeight:700}}>{m.google}</span></Td>
                  <Td><span style={{color:m.kakao==="1위"?"#10b981":"#f59e0b",fontWeight:700}}>{m.kakao}</span></Td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {cfg.showReviews&&data.inhouse?.reviews?.length>0&&(
          <div style={{background:"#1e293b",borderRadius:12,padding:"16px 20px",marginBottom:16}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:12,color:"#e2e8f0"}}>⭐ 리뷰 달성</div>
            {data.inhouse.reviews.map(r=>(
              <div key={r.id} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <span style={{fontSize:13,fontWeight:600}}>{r.platform}</span>
                  <span style={{color:"#94a3b8",fontSize:12}}>{r.count}건 / 목표 {r.target}건</span>
                </div>
                <ProgressBar value={r.count} max={r.target} color={r.count>=r.target?"#10b981":"#6366f1"}/>
              </div>
            ))}
          </div>
        )}
        <div style={{textAlign:"center",paddingTop:12,color:"#334155",fontSize:11}}>REBERRYOS v0.3</div>
      </div>
    </div>
  );
}
