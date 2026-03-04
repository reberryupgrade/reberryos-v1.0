"use client";
import { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell, AreaChart, Area, Legend } from "recharts";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const TAB_TYPES = ["블로그","지식인","카페","플레이스","뉴스","파워링크"];

const YT_API_KEY="AIzaSyBaQzlNcJldt5zuPR_1CtD-1zsBvcKITl0";
function extractYtId(url){if(!url)return null;const m=url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);return m?m[1]:null;}
async function fetchYtVideo(videoId){
  try{
    const r=await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${YT_API_KEY}`);
    const d=await r.json();if(!d.items||!d.items.length)return null;
    const item=d.items[0];const s=item.statistics;const sn=item.snippet;
    return{title:sn.title,views:+(s.viewCount||0),likes:+(s.likeCount||0),commentCount:+(s.commentCount||0),channelTitle:sn.channelTitle,channelId:sn.channelId,thumbnail:sn.thumbnails?.medium?.url||"",publishedAt:sn.publishedAt?.split("T")[0]||""};
  }catch(e){console.error("YT video fetch error:",e);return null;}
}
async function fetchYtComments(videoId,maxResults=20){
  try{
    const r=await fetch(`https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=${maxResults}&order=time&key=${YT_API_KEY}`);
    const d=await r.json();if(!d.items)return[];
    return d.items.map(item=>{const s=item.snippet.topLevelComment.snippet;return{author:s.authorDisplayName,text:s.textDisplay?.replace(/<[^>]*>/g,"")||"",date:s.publishedAt?.split("T")[0]||"",likes:+(s.likeCount||0)};});
  }catch(e){console.error("YT comments fetch error:",e);return[];}
}
async function fetchYtChannel(channelId){
  try{
    const r=await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${YT_API_KEY}`);
    const d=await r.json();if(!d.items||!d.items.length)return null;
    const s=d.items[0].statistics;const sn=d.items[0].snippet;
    return{name:sn.title,subscribers:+(s.subscriberCount||0),totalViews:+(s.viewCount||0),videoCount:+(s.videoCount||0)};
  }catch(e){console.error("YT channel fetch error:",e);return null;}
}
function extractYtChannelId(url){
  if(!url)return null;
  const m1=url.match(/youtube\.com\/channel\/([\w-]+)/);if(m1)return{type:"id",val:m1[1]};
  const m2=url.match(/youtube\.com\/@([\w.-]+)/);if(m2)return{type:"handle",val:m2[1]};
  const m3=url.match(/youtube\.com\/c\/([\w.-]+)/);if(m3)return{type:"custom",val:m3[1]};
  if(/^UC[\w-]{22}$/.test(url))return{type:"id",val:url};
  return null;
}
async function resolveYtChannelId(input){
  const parsed=extractYtChannelId(input);
  if(!parsed){
    const r=await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(input)}&type=channel&maxResults=1&key=${YT_API_KEY}`);
    const d=await r.json();if(d.items&&d.items.length)return d.items[0].snippet.channelId;return null;
  }
  if(parsed.type==="id")return parsed.val;
  const r=await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(parsed.val)}&type=channel&maxResults=1&key=${YT_API_KEY}`);
  const d=await r.json();if(d.items&&d.items.length)return d.items[0].snippet.channelId;return null;
}
async function fetchYtChannelVideos(channelId,maxResults=10){
  try{
    const cr=await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails,snippet,statistics&id=${channelId}&key=${YT_API_KEY}`);
    const cd=await cr.json();if(!cd.items||!cd.items.length)return null;
    const ch=cd.items[0];const uploadsId=ch.contentDetails.relatedPlaylists.uploads;
    const pr=await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsId}&maxResults=${maxResults}&key=${YT_API_KEY}`);
    const pd=await pr.json();if(!pd.items)return{channel:ch,videos:[]};
    const videoIds=pd.items.map(i=>i.snippet.resourceId.videoId).join(",");
    const vr=await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${YT_API_KEY}`);
    const vd=await vr.json();
    const videos=(vd.items||[]).map(v=>({
      videoId:v.id,title:v.snippet.title,url:`https://youtube.com/watch?v=${v.id}`,
      views:+(v.statistics.viewCount||0),likes:+(v.statistics.likeCount||0),
      commentCount:+(v.statistics.commentCount||0),
      thumbnail:v.snippet.thumbnails?.medium?.url||"",
      publishedAt:v.snippet.publishedAt?.split("T")[0]||""
    }));
    return{channel:{id:channelId,name:ch.snippet.title,thumbnail:ch.snippet.thumbnails?.default?.url||"",subscribers:+(ch.statistics.subscriberCount||0),totalViews:+(ch.statistics.viewCount||0),videoCount:+(ch.statistics.videoCount||0)},videos};
  }catch(e){console.error("YT channel videos error:",e);return null;}
}


const COMM_PLATFORMS = ["당근마켓","에브리타임","맘카페","지역카페"];
const TABS = [
  {id:"overview",label:"전체 현황"},
  {id:"performance",label:"📈 성과 추이"},
  {id:"portal",label:"🔗 클라이언트 포털"},
  {id:"budget",label:"💰 마케팅 비용"},
  {id:"keywords",label:"네이버 키워드"},
  {id:"maps",label:"지도 노출"},
  {id:"experience",label:"체험단"},
  {id:"cafes",label:"카페 바이럴"},
  {id:"youtube",label:"유튜브"},
  {id:"shortform",label:"숏폼"},
  {id:"autocomplete",label:"키워드 자동완성"},
  {id:"seo",label:"🌐 홈페이지 SEO"},
  {id:"calendar",label:"📅 캘린더/할일"},
  {id:"community",label:"당근/커뮤니티"},
  {id:"inhouse",label:"원내 마케팅"},
  {id:"offline",label:"오프라인 광고"},
];
const CHANNEL_COLORS = {
  keywords:"#6366f1",maps:"#06b6d4",experience:"#10b981",cafes:"#ec4899",
  youtube:"#f97316",shortform:"#8b5cf6",autocomplete:"#14b8a6",seo:"#0ea5e9",
  community_당근마켓:"#f97316",community_에브리타임:"#6366f1",community_맘카페:"#ec4899",community_지역카페:"#10b981",
  inhouse_messages:"#3b82f6",inhouse_reviews:"#06b6d4",inhouse_photos:"#8b5cf6",inhouse_videos:"#f59e0b",
  offline:"#ef4444",
};

const DEFAULT_BRANCH_DATA = {
  performanceLogs: [
    {id:1,period:"2024-09",youtube_views:8200,shortform_views:14000,blog_visits:3200,place_views:5400,new_reviews:8,cafe_posts:3,notes:"9월 집행 시작"},
    {id:2,period:"2024-10",youtube_views:10400,shortform_views:18500,blog_visits:4100,place_views:6200,new_reviews:12,cafe_posts:5,notes:""},
    {id:3,period:"2024-11",youtube_views:9800,shortform_views:22000,blog_visits:4800,place_views:7100,new_reviews:15,cafe_posts:7,notes:"11월 이벤트 진행"},
    {id:4,period:"2024-12",youtube_views:13200,shortform_views:28000,blog_visits:5600,place_views:8900,new_reviews:21,cafe_posts:9,notes:"연말 프로모션"},
    {id:5,period:"2025-01",youtube_views:11000,shortform_views:24000,blog_visits:5100,place_views:8200,new_reviews:18,cafe_posts:8,notes:""},
    {id:6,period:"2025-02",youtube_views:12400,shortform_views:23000,blog_visits:5400,place_views:9300,new_reviews:20,cafe_posts:10,notes:"2월 체험단 강화"},
  ],
  portalConfig: {clinicName:"",reportMonth:"2025년 2월",managerName:"마케팅팀",logoText:"🏥",showBudget:false,showKeywords:true,showMaps:true,showYoutube:true,showShortform:true,showReviews:true,showCafes:true,memo:""},
  keywords:[{id:1,keyword:"강남 피부과",tabOrder:["플레이스","블로그","파워링크","카페","지식인","뉴스"],myBlogRank:"3위",myPlaceRank:"1위",rankCafe:"-",rankKnowledge:"-",rankNews:"-",rankPowerlink:"2위",rankNaverMap:"1위",rankGoogle:"3위",rankKakao:"2위",status:"good"}],
  keywordCosts:{블로그:0,지식인:0,카페:0,플레이스:0,뉴스:0,파워링크:0},
  rankTargets:{blogName:"",placeName:"",cafeName:""},
  maps:[{id:1,keyword:"강남 피부과",naverPlace:"1위",google:"3위",kakao:"2위",status:"good"}],
  mapsCost:0,
  experience:[{id:1,title:"체험후기",url:"",platform:"네이버블로그",views:1240,comments:32,lastUpdated:"2024-02-20",status:"good"}],
  experienceCost:0, cafesCost:0,
  cafes:[{id:1,name:"강남맘카페",url:"",members:"12만",penetrated:true,posts:[{id:101,title:"다녀왔어요",url:"",views:1240,comments:[]}]},{id:2,name:"서초생활정보",url:"",members:"8만",penetrated:false,posts:[]}],
  youtube:[{id:1,title:"보톡스 솔직후기",url:"",views:12400,likes:320,lastUpdated:"2024-02-20",comments:[]}],
  ytChannels:[],
  youtubeCost:0,
  shortform:[{id:1,platform:"인스타그램",title:"시술 전후 비교",url:"",views:23000,likes:890,lastUpdated:"2024-02-20",comments:[]}],
  shortformCost:0,
  autocomplete:[{id:1,keyword:"강남피부과",naver:["강남피부과 추천","강남피부과 가격"],instagram:["강남피부과일상"]}],
  autocompleteCost:0,
  seoPages:[
    {id:1,targetKeyword:"강남 피부과",pageUrl:"/",pageTitle:"메인 페이지",metaTitle:"강남 피부과 | OO피부과 - 강남역 도보 3분",metaDesc:"강남 피부과 전문의 직접 시술. 보톡스, 필러, 레이저 토닝 등 피부과 전문 진료. 강남역 1번출구 도보 3분.",h1Tag:"강남 피부과 전문 OO피부과",
      seoChecklist:{titleLen:true,descLen:true,h1Has:true,altText:false,internalLink:true,schema:false,mobileOpt:true,pageSpeed:false,ssl:true,sitemap:true},
      currentRank:"5위",targetRank:"1위",status:"수정필요",notes:"alt text, schema 마크업 추가 필요",lastUpdated:"2024-02-20"},
    {id:2,targetKeyword:"강남 보톡스",pageUrl:"/botox",pageTitle:"보톡스 페이지",metaTitle:"강남 보톡스 가격 | OO피부과 - 정품 보톡스 전문",metaDesc:"강남 보톡스 가격 안내. 정품 보톡스만 사용, 전문의 직접 시술. 자연스러운 결과를 약속합니다.",h1Tag:"강남 보톡스 시술 안내",
      seoChecklist:{titleLen:true,descLen:true,h1Has:true,altText:true,internalLink:true,schema:true,mobileOpt:true,pageSpeed:true,ssl:true,sitemap:true},
      currentRank:"3위",targetRank:"1위",status:"설정완료",notes:"",lastUpdated:"2024-02-18"},
    {id:3,targetKeyword:"강남 필러",pageUrl:"/filler",pageTitle:"필러 페이지",metaTitle:"",metaDesc:"",h1Tag:"",
      seoChecklist:{titleLen:false,descLen:false,h1Has:false,altText:false,internalLink:false,schema:false,mobileOpt:true,pageSpeed:false,ssl:true,sitemap:true},
      currentRank:"-",targetRank:"3위",status:"미설정",notes:"페이지 신규 생성 필요",lastUpdated:"2024-02-15"},
  ],
  seoCost:0,
  calendarEvents:[
    {id:1,title:"블로그 포스팅 3건",date:"2025-02-10",type:"content",channel:"키워드",done:true},
    {id:2,title:"체험단 모집 마감",date:"2025-02-15",type:"deadline",channel:"체험단",done:true},
    {id:3,title:"유튜브 영상 촬영",date:"2025-02-20",type:"content",channel:"유튜브",done:false},
    {id:4,title:"카페 바이럴 게시물 5건",date:"2025-02-25",type:"content",channel:"카페",done:false},
    {id:5,title:"래미안 강남 광고 종료",date:"2025-04-30",type:"deadline",channel:"오프라인",done:false},
    {id:6,title:"강남역 광고 종료",date:"2025-03-31",type:"deadline",channel:"오프라인",done:false},
    {id:7,title:"3월 보고서 작성",date:"2025-03-05",type:"report",channel:"전체",done:false},
    {id:8,title:"숏폼 콘텐츠 2건 발행",date:"2025-03-10",type:"content",channel:"숏폼",done:false},
    {id:9,title:"리뷰 답글 작성 20건",date:"2025-03-12",type:"task",channel:"원내",done:false},
  ],
  todos:[
    {id:1,text:"블로그 포스팅 3건 발행",channel:"키워드",priority:"high",done:false,dueDate:"2025-03-07"},
    {id:2,text:"네이버 플레이스 리뷰 답글 10건",channel:"원내",priority:"medium",done:false,dueDate:"2025-03-05"},
    {id:3,text:"체험단 후기 확인 및 공유",channel:"체험단",priority:"medium",done:true,dueDate:"2025-02-28"},
    {id:4,text:"카페 바이럴 게시물 기획",channel:"카페",priority:"low",done:false,dueDate:"2025-03-10"},
    {id:5,text:"유튜브 썸네일 제작",channel:"유튜브",priority:"high",done:false,dueDate:"2025-03-03"},
    {id:6,text:"숏폼 릴스 편집",channel:"숏폼",priority:"medium",done:false,dueDate:"2025-03-08"},
  ],
  community:{당근마켓:{cost:0,items:[{id:1,title:"피부과 이벤트 공지",url:"",views:1240,lastUpdated:"2024-02-20"}]},에브리타임:{cost:0,items:[]},맘카페:{cost:0,items:[]},지역카페:{cost:0,items:[]}},
  inhouse:{messagesCost:0,reviewsCost:0,photosCost:0,videosCost:0,messages:[{id:1,title:"2월 보톡스 이벤트",platform:"카카오",sentDate:"2024-02-01",recipients:1240,openRate:"38%",status:"완료"}],reviews:[{id:1,platform:"네이버 플레이스",count:124,target:200,lastUpdated:"2024-02-20"},{id:2,platform:"구글맵",count:43,target:100,lastUpdated:"2024-02-20"}],photos:[{id:1,title:"쁘띠성형 전후사진",category:"쁘띠성형",lastUpdated:"2024-02-15",images:[]}],videos:[{id:1,title:"원내 시술 소개",location:"대기실 TV",duration:"3분 20초",lastUpdated:"2024-02-01",url:""}]},
  offline:{elevator:[{id:1,complex:"래미안 강남",units:320,startDate:"2024-02-01",endDate:"2024-04-30",cost:1200000,status:"집행중"}],subway:[{id:1,station:"강남역",location:"2번 출구",startDate:"2024-02-01",endDate:"2024-03-31",cost:2500000,status:"집행중"}],other:[{id:1,type:"버스정류장",location:"강남구청 앞",startDate:"2024-02-15",endDate:"2024-03-14",cost:800000,status:"집행중"}]},
  conversions:{keywords:5,maps:12,experience:3,cafes:2,youtube:4,shortform:6,autocomplete:1,seo:3,community:3,inhouse:8,offline:7},
  avgRevenuePerPatient:500000,
};

const DEFAULT_SYSTEM = {
  users:[
    {id:1,username:"admin",password:"admin",role:"admin",name:"통합관리자",branchId:null},
    {id:2,username:"manager1",password:"1234",role:"manager",name:"강남점 매니저",branchId:1},
    {id:3,username:"client1",password:"1234",role:"client",name:"강남피부과 원장",branchId:1},
  ],
  branches:[{id:1,name:"강남점",clinicName:"강남 피부과"}],
};

// Storage
const SYS_KEY="reberryos-v1-sys";
const bKey=id=>`reberryos-v1-b-${id}`;
async function loadSys(){
  try{
    const {data,error}=await supabase.from('app_storage').select('value').eq('key',SYS_KEY).single();
    if(error||!data)return null;
    return data.value;
  }catch{return null;}
}
async function saveSys(d){
  try{
    await supabase.from('app_storage').upsert({key:SYS_KEY,value:d,updated_at:new Date().toISOString()});
  }catch{}
}
async function loadBranch(id){
  try{
    const {data,error}=await supabase.from('app_storage').select('value').eq('key',bKey(id)).single();
    if(error||!data)return null;
    return data.value;
  }catch{return null;}
}
async function saveBranch(id,d){
  try{
    await supabase.from('app_storage').upsert({key:bKey(id),value:d,updated_at:new Date().toISOString()});
  }catch{}
}

const fmt=n=>(n||0).toLocaleString();
const fmtW=n=>"₩"+(n||0).toLocaleString();
const SC={good:"#10b981",warn:"#f59e0b",danger:"#ef4444"};
const SL={good:"정상",warn:"주의",danger:"점검필요"};
const today=()=>new Date().toISOString().slice(0,10);

// Shared UI
const Badge=({status})=> <span style={{background:SC[status]||"#475569",color:"#fff",borderRadius:99,padding:"2px 10px",fontSize:12,fontWeight:700}}>{SL[status]||status}</span>;
const Th=({c,style={}})=><th style={{padding:"10px 14px",color:"#94a3b8",textAlign:"left",fontWeight:600,whiteSpace:"nowrap",background:"#1e293b",...style}}>{c}</th>;
const Td=({children,style={}})=><td style={{padding:"10px 14px",color:"#e2e8f0",...style}}>{children}</td>;
const Btn=({onClick,children,color="#10b981",style={}})=><button onClick={onClick} style={{background:color,color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",fontSize:13,cursor:"pointer",fontWeight:600,...style}}>{children}</button>;
const Inp=({value,onChange,placeholder,type="text",style={}})=><input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{background:"#0f172a",border:"1px solid #334155",borderRadius:8,padding:"7px 11px",color:"#f1f5f9",fontSize:13,width:"100%",boxSizing:"border-box",...style}}/>;
const FF=({label,children})=><div style={{marginBottom:14}}><div style={{color:"#94a3b8",fontSize:12,marginBottom:5}}>{label}</div>{children}</div>;
const LinkCell=({url,children})=>url?<a href={url} target="_blank" rel="noreferrer" style={{color:"#6366f1",textDecoration:"underline"}}>{children}</a>:<span>{children}</span>;
const DelBtn=({onClick})=><button onClick={e=>{e.stopPropagation();onClick();}} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:14,padding:"2px 6px",opacity:0.6}} title="삭제">✕</button>;

const CostBox=({label,value,onChange,color="#f59e0b"})=>(
  <div style={{background:"#0f172a",borderRadius:10,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
    <span style={{color:"#94a3b8",fontSize:13,fontWeight:600}}>{label}</span>
    <div style={{display:"flex",alignItems:"center",gap:4}}>
      <span style={{color:"#64748b",fontSize:12}}>₩</span>
      <input type="number" value={value||""} onChange={e=>onChange(+e.target.value||0)} placeholder="0"
        style={{background:"#1e293b",border:"1px solid #334155",borderRadius:6,padding:"5px 10px",color,fontSize:14,fontWeight:700,width:120,textAlign:"right"}}/>
      <span style={{color:"#64748b",fontSize:11}}>/월</span>
    </div>
  </div>
);

const Modal=({title,onClose,children,wide,extraWide})=>(
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div style={{background:"#1e293b",borderRadius:16,padding:28,width:"90%",maxWidth:extraWide?920:wide?720:520,maxHeight:"90vh",overflowY:"auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontWeight:800,fontSize:17}}>{title}</div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#94a3b8",fontSize:20,cursor:"pointer"}}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

const CommentsPanel=({comments,title,onClose})=>(
  <Modal title={`💬 ${title}`} onClose={onClose}>
    {(!comments||!comments.length)?<div style={{color:"#475569"}}>댓글이 없습니다.</div>
    :comments.map((c,i)=>(
      <div key={i} style={{background:"#0f172a",borderRadius:10,padding:"12px 14px",marginBottom:8}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
          <span style={{fontWeight:700,fontSize:13,color:"#6366f1"}}>@{c.author}</span>
          <span style={{color:"#475569",fontSize:11}}>{c.date}</span>
        </div>
        <div style={{color:"#e2e8f0",fontSize:14}}>{c.text}</div>
      </div>
    ))}
  </Modal>
);

const ProgressBar=({value,max,color="#6366f1"})=>{
  const pct=max>0?Math.min(100,Math.round(value/max*100)):0;
  return (
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div style={{flex:1,background:"#0f172a",borderRadius:99,height:8,overflow:"hidden"}}>
        <div style={{width:`${pct}%`,background:color,height:"100%",borderRadius:99}}/>
      </div>
      <span style={{color:"#94a3b8",fontSize:12,whiteSpace:"nowrap"}}>{fmt(value)}/{fmt(max)} ({pct}%)</span>
    </div>
  );
};

function SimpleForm({fields,onSave,initial}){
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


function OfflineForm({fields,onSave,initial}){
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

const SectionWithCost=({title,costLabel,cost,onCostChange,color,children,right})=>(
  <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <div style={{fontWeight:700,fontSize:15}}>{title}</div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>{right}</div>
    </div>
    <div style={{marginBottom:16}}>
      <CostBox label={costLabel||`${title} 월 집행비`} value={cost} onChange={onCostChange} color={color||"#f59e0b"}/>
    </div>
    {children}
  </div>
);

const calcDelta=(cur,p)=>{if(!p||!cur)return null;const d=cur-p;return{val:d,pct:p?Math.round(d/p*100):0,up:d>=0};};
const DeltaBadge=({cur,pre})=>{const d=calcDelta(cur,pre);if(!d)return null;return <span style={{background:d.up?"#022c22":"#2d0f0f",color:d.up?"#10b981":"#ef4444",borderRadius:99,padding:"1px 7px",fontSize:11,fontWeight:700,marginLeft:6}}>{d.up?"▲":"▼"}{Math.abs(d.pct)}%</span>;};
const StatCard=({icon,label,value,color,cur,pre})=>(
  <div style={{background:"#1e293b",borderRadius:12,padding:"16px 18px",border:"1px solid #1e293b"}}>
    <div style={{fontSize:22,marginBottom:6}}>{icon}</div>
    <div style={{color:"#94a3b8",fontSize:12,marginBottom:4}}>{label}</div>
    <div style={{display:"flex",alignItems:"baseline",gap:4}}>
      <span style={{color,fontSize:20,fontWeight:800}}>{value}</span>
      <DeltaBadge cur={cur} pre={pre}/>
    </div>
  </div>
);

// ===== Excel Export =====
function exportExcel(data, branchName){
  const wb=XLSX.utils.book_new();
  // 성과추이
  if(data.performanceLogs?.length){
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data.performanceLogs.map(l=>({기간:l.period,유튜브조회:l.youtube_views,숏폼조회:l.shortform_views,블로그방문:l.blog_visits,플레이스조회:l.place_views,신규리뷰:l.new_reviews,카페게시물:l.cafe_posts,메모:l.notes||""}))),"성과추이");
  }
  // 키워드
  if(data.keywords?.length){
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data.keywords.map(k=>({키워드:k.keyword,블로그순위:k.myBlogRank,플레이스순위:k.myPlaceRank,상태:SL[k.status]||k.status,월검색량:k.monthlySearch||""}))),"키워드");
  }
  // 지도
  if(data.maps?.length){
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data.maps.map(m=>({키워드:m.keyword,네이버:m.naverPlace,구글:m.google,카카오:m.kakao}))),"지도");
  }
  // 유튜브
  if(data.youtube?.length){
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data.youtube.map(y=>({제목:y.title,조회수:y.views,좋아요:y.likes,최근갱신:y.lastUpdated}))),"유튜브");
  }
  // 숏폼
  if(data.shortform?.length){
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data.shortform.map(s=>({플랫폼:s.platform,제목:s.title,조회수:s.views,좋아요:s.likes,최근갱신:s.lastUpdated}))),"숏폼");
  }
  // 체험단
  if(data.experience?.length){
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data.experience.map(e=>({제목:e.title,플랫폼:e.platform,조회수:e.views,댓글:e.comments,최근갱신:e.lastUpdated}))),"체험단");
  }
  // 카페
  const cafeRows=[];
  (data.cafes||[]).forEach(c=>{c.posts.forEach(p=>cafeRows.push({카페:c.name,회원수:c.members,침투:c.penetrated?"완료":"미침투",게시물:p.title,조회수:p.views}));if(!c.posts.length)cafeRows.push({카페:c.name,회원수:c.members,침투:c.penetrated?"완료":"미침투",게시물:"",조회수:""});});
  if(cafeRows.length) XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(cafeRows),"카페");
  // 오프라인
  const offRows=[...data.offline.elevator.map(e=>({유형:"엘리베이터",위치:e.complex,시작:e.startDate,종료:e.endDate,비용:e.cost,상태:e.status})),...data.offline.subway.map(s=>({유형:"역사",위치:`${s.station} ${s.location}`,시작:s.startDate,종료:s.endDate,비용:s.cost,상태:s.status})),...data.offline.other.map(o=>({유형:o.type,위치:o.location,시작:o.startDate,종료:o.endDate,비용:o.cost,상태:o.status}))];
  if(offRows.length) XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(offRows),"오프라인");
  // SEO
  if(data.seoPages?.length){
    const checkLabels={titleLen:"Title길이",descLen:"Desc길이",h1Has:"H1키워드",altText:"Alt텍스트",internalLink:"내부링크",schema:"Schema",mobileOpt:"모바일",pageSpeed:"속도",ssl:"SSL",sitemap:"사이트맵"};
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data.seoPages.map(p=>{
      const row={타겟키워드:p.targetKeyword,URL:p.pageUrl,페이지명:p.pageTitle,"Meta Title":p.metaTitle,"Meta Desc":p.metaDesc,H1:p.h1Tag,현재순위:p.currentRank,목표순위:p.targetRank,상태:p.status};
      Object.entries(checkLabels).forEach(([k,l])=>{row[l]=p.seoChecklist?.[k]?"✅":"❌";});
      return row;
    })),"홈페이지SEO");
  }
  // ROI / Conversions
  if(data.conversions){
    const conv=data.conversions;
    const roiRows=[
      {채널:"네이버 키워드",신규내원:conv.keywords||0},
      {채널:"지도 노출",신규내원:conv.maps||0},
      {채널:"체험단",신규내원:conv.experience||0},
      {채널:"카페 바이럴",신규내원:conv.cafes||0},
      {채널:"유튜브",신규내원:conv.youtube||0},
      {채널:"숏폼",신규내원:conv.shortform||0},
      {채널:"자동완성",신규내원:conv.autocomplete||0},
      {채널:"홈페이지 SEO",신규내원:conv.seo||0},
      {채널:"커뮤니티",신규내원:conv.community||0},
      {채널:"원내 마케팅",신규내원:conv.inhouse||0},
      {채널:"오프라인",신규내원:conv.offline||0},
    ];
    roiRows.push({채널:"합계",신규내원:roiRows.reduce((a,r)=>a+(r.신규내원||0),0)});
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(roiRows),"채널별전환");
  }
  XLSX.writeFile(wb,`${branchName||"마케팅"}_보고서_${today()}.xlsx`);
}

// ===== LOGIN SCREEN =====
function LoginScreen({onLogin,system}){
  const[u,setU]=useState("");
  const[p,setP]=useState("");
  const[err,setErr]=useState("");
  const handleLogin=()=>{
    const user=system.users.find(x=>x.username===u&&x.password===p);
    if(!user){setErr("아이디 또는 비밀번호가 일치하지 않습니다.");return;}
    setErr("");onLogin(user);
  };
  return (
    <div style={{minHeight:"100vh",background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Apple SD Gothic Neo',sans-serif"}}>
      <div style={{background:"#1e293b",borderRadius:20,padding:"48px 40px",width:380,boxShadow:"0 25px 60px rgba(0,0,0,0.5)"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:36,marginBottom:8}}>📊</div>
          <div style={{color:"#6366f1",fontWeight:800,fontSize:24}}>REBERRYOS</div>
          <div style={{color:"#64748b",fontSize:13,marginTop:4}}>마케팅 관리 시스템</div>
        </div>
        <FF label="아이디"><Inp value={u} onChange={setU} placeholder="아이디 입력"/></FF>
        <FF label="비밀번호"><input type="password" value={p} onChange={e=>setP(e.target.value)} placeholder="비밀번호 입력" onKeyDown={e=>e.key==="Enter"&&handleLogin()}
          style={{background:"#0f172a",border:"1px solid #334155",borderRadius:8,padding:"7px 11px",color:"#f1f5f9",fontSize:13,width:"100%",boxSizing:"border-box"}}/></FF>
        {err&&<div style={{color:"#ef4444",fontSize:12,marginBottom:12}}>{err}</div>}
        <Btn onClick={handleLogin} color="#6366f1" style={{width:"100%",padding:"10px",fontSize:14,marginTop:4}}>로그인</Btn>

      </div>
    </div>
  );
}

// ===== ADMIN DASHBOARD =====
const EVENT_TYPES=[{v:"content",l:"📝 콘텐츠",c:"#6366f1"},{v:"deadline",l:"⏰ 마감/종료",c:"#ef4444"},{v:"report",l:"📊 보고서",c:"#f59e0b"},{v:"task",l:"✅ 업무",c:"#10b981"},{v:"meeting",l:"🤝 미팅",c:"#8b5cf6"}];
const EVENT_CHANNELS=["전체","키워드","지도","체험단","카페","유튜브","숏폼","자동완성","SEO","커뮤니티","원내","오프라인"];
const PRIORITY_OPTS=[{v:"high",l:"🔴 긴급",c:"#ef4444"},{v:"medium",l:"🟡 보통",c:"#f59e0b"},{v:"low",l:"🟢 여유",c:"#10b981"}];

function EventForm({initial,onSave}){
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

function TodoForm({initial,onSave}){
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

// D-day calculator
function getDday(dateStr){
  const t=new Date(dateStr);const n=new Date();t.setHours(0,0,0,0);n.setHours(0,0,0,0);
  return Math.ceil((t-n)/(1000*60*60*24));
}
function DdayBadge({dateStr}){
  const d=getDday(dateStr);
  const color=d<0?"#475569":d===0?"#ef4444":d<=3?"#ef4444":d<=7?"#f59e0b":d<=14?"#f59e0b":"#10b981";
  const bg=d<0?"#1e293b":d<=3?"#2d0f0f":d<=7?"#422006":"#022c22";
  const label=d<0?`D+${Math.abs(d)}`:d===0?"D-Day":`D-${d}`;
  return <span style={{background:bg,color,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:800}}>{label}</span>;
}

function AddUserForm({branches,onSave}){
  const[f,setF]=useState({name:"",username:"",password:"",role:"manager",branchId:""});
  return (
    <div>
      <FF label="이름"><Inp value={f.name} onChange={v=>setF({...f,name:v})} placeholder="홍길동"/></FF>
      <FF label="아이디"><Inp value={f.username} onChange={v=>setF({...f,username:v})} placeholder="user1"/></FF>
      <FF label="비밀번호"><Inp value={f.password} onChange={v=>setF({...f,password:v})} placeholder="1234"/></FF>
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
      <Btn onClick={()=>onSave(f)} style={{width:"100%",marginTop:4}}>추가</Btn>
    </div>
  );
}

function AdminDashboard({system,setSystem,onSelectBranch,branchSummaries,user,onLogout}){
  const[modal,setModal]=useState(null);
  const[tab,setTab]=useState("branches");

  const addBranch=(f)=>{
    const nb={id:Date.now(),name:f.name,clinicName:f.clinicName||f.name};
    const newSys={...system,branches:[...system.branches,nb]};
    setSystem(newSys);saveSys(newSys);
    // Save default data for new branch
    saveBranch(nb.id,{...DEFAULT_BRANCH_DATA,portalConfig:{...DEFAULT_BRANCH_DATA.portalConfig,clinicName:nb.clinicName}});
    setModal(null);
  };
  const delBranch=(id)=>{
    if(!confirm("이 지점과 모든 데이터를 삭제합니다. 계속할까요?"))return;
    const newSys={...system,branches:system.branches.filter(b=>b.id!==id),users:system.users.map(u=>u.branchId===id?{...u,branchId:null}:u)};
    setSystem(newSys);saveSys(newSys);
  };
  const addUser=(f)=>{
    const nu={id:Date.now(),username:f.username,password:f.password,role:f.role,name:f.name,branchId:f.role!=="admin"?(+f.branchId||null):null};
    const newSys={...system,users:[...system.users,nu]};
    setSystem(newSys);saveSys(newSys);setModal(null);
  };
  const delUser=(id)=>{
    if(id===user.id)return alert("자신의 계정은 삭제할 수 없습니다.");
    const newSys={...system,users:system.users.filter(u=>u.id!==id)};
    setSystem(newSys);saveSys(newSys);
  };

  return (
    <div style={{minHeight:"100vh",background:"#0f172a",color:"#f1f5f9",fontFamily:"'Apple SD Gothic Neo',sans-serif"}}>
      <div style={{background:"#0a0f1e",borderBottom:"1px solid #1e293b",padding:"14px 28px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:22}}>📊</span>
          <div>
            <span style={{fontWeight:800,fontSize:17,color:"#6366f1"}}>REBERRYOS</span>
            <span style={{color:"#475569",fontSize:12,marginLeft:8}}>통합관리</span>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{color:"#94a3b8",fontSize:13}}>👤 {user.name}</span>
          <Btn onClick={onLogout} color="#334155" style={{color:"#94a3b8",padding:"5px 14px"}}>로그아웃</Btn>
        </div>
      </div>

      <div style={{padding:"24px 28px",maxWidth:1100,margin:"0 auto"}}>
        <div style={{display:"flex",gap:8,marginBottom:24}}>
          <button onClick={()=>setTab("branches")} style={{background:tab==="branches"?"#6366f1":"#1e293b",color:tab==="branches"?"#fff":"#94a3b8",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:600,fontSize:14}}>🏢 지점 관리</button>
          <button onClick={()=>setTab("users")} style={{background:tab==="users"?"#6366f1":"#1e293b",color:tab==="users"?"#fff":"#94a3b8",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:600,fontSize:14}}>👥 사용자 관리</button>
        </div>

        {tab==="branches"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <div style={{fontWeight:800,fontSize:18}}>전체 지점 ({system.branches.length})</div>
              <Btn onClick={()=>setModal("addBranch")} color="#6366f1">+ 새 지점 추가</Btn>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:16}}>
              {system.branches.map(b=>{
                const sm=branchSummaries[b.id]||{};
                const mgrs=system.users.filter(u=>u.branchId===b.id&&u.role==="manager");
                return (
                  <div key={b.id} style={{background:"#1e293b",borderRadius:14,overflow:"hidden",border:"1px solid #334155"}}>
                    <div style={{background:"linear-gradient(135deg,#1e1b4b,#312e81)",padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontWeight:800,fontSize:16}}>{b.name}</div>
                        <div style={{color:"#a5b4fc",fontSize:12,marginTop:2}}>{b.clinicName}</div>
                      </div>
                      <DelBtn onClick={()=>delBranch(b.id)}/>
                    </div>
                    <div style={{padding:"16px 20px"}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
                        <div style={{background:"#0f172a",borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
                          <div style={{color:"#94a3b8",fontSize:10}}>키워드</div>
                          <div style={{color:"#6366f1",fontWeight:800,fontSize:16}}>{sm.keywords||0}</div>
                        </div>
                        <div style={{background:"#0f172a",borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
                          <div style={{color:"#94a3b8",fontSize:10}}>유튜브</div>
                          <div style={{color:"#f97316",fontWeight:800,fontSize:16}}>{fmt(sm.ytViews||0)}</div>
                        </div>
                        <div style={{background:"#0f172a",borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
                          <div style={{color:"#94a3b8",fontSize:10}}>월비용</div>
                          <div style={{color:"#f59e0b",fontWeight:800,fontSize:13}}>{fmtW(sm.cost||0)}</div>
                        </div>
                      </div>
                      <div style={{color:"#64748b",fontSize:12,marginBottom:12}}>담당: {mgrs.length?mgrs.map(m=>m.name).join(", "):"미배정"}</div>
                      <Btn onClick={()=>onSelectBranch(b.id)} color="#6366f1" style={{width:"100%"}}>관리 →</Btn>
                    </div>
                  </div>
                );
              })}
            </div>
            {modal==="addBranch"&&(
              <Modal title="새 지점 추가" onClose={()=>setModal(null)}>
                <SimpleForm fields={["name:지점명|예: 분당점","clinicName:병원/클라이언트명|예: 분당 피부과"]} onSave={addBranch}/>
              </Modal>
            )}
          </div>
        )}

        {tab==="users"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <div style={{fontWeight:800,fontSize:18}}>사용자 관리 ({system.users.length})</div>
              <Btn onClick={()=>setModal("addUser")} color="#6366f1">+ 사용자 추가</Btn>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr><Th c="이름"/><Th c="아이디"/><Th c="비밀번호"/><Th c="역할"/><Th c="소속 지점"/><Th c=""/></tr></thead>
              <tbody>{system.users.map((u,ri)=>(
                <tr key={u.id} style={{borderBottom:"1px solid #1e293b",background:ri%2===0?"#0f172a":"#111827"}}>
                  <Td><span style={{fontWeight:700}}>{u.name}</span></Td>
                  <Td>{u.username}</Td>
                  <Td><span style={{color:"#475569"}}>{u.password}</span></Td>
                  <Td><span style={{background:u.role==="admin"?"#6366f1":u.role==="manager"?"#10b981":"#f59e0b",color:"#fff",borderRadius:99,padding:"2px 10px",fontSize:12,fontWeight:700}}>
                    {u.role==="admin"?"통합관리자":u.role==="manager"?"지점관리자":"클라이언트"}
                  </span></Td>
                  <Td>{u.branchId?system.branches.find(b=>b.id===u.branchId)?.name||"-":"-"}</Td>
                  <Td><DelBtn onClick={()=>delUser(u.id)}/></Td>
                </tr>
              ))}</tbody>
            </table>
            {modal==="addUser"&&(
              <Modal title="사용자 추가" onClose={()=>setModal(null)}>
                <AddUserForm branches={system.branches} onSave={addUser}/>
              </Modal>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ===== CLIENT PORTAL VIEW (for client login) =====
function ClientPortal({data,onClose,budgetTotal,standalone}){
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

// ===== FORM COMPONENTS =====
function PerfForm({onSave}){
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
const RANK_FIELDS=[
  {key:"myBlogRank",label:"블로그",icon:"📝",color:"#6366f1"},
  {key:"myPlaceRank",label:"플레이스",icon:"📍",color:"#06b6d4"},
  {key:"rankCafe",label:"카페",icon:"☕",color:"#ec4899"},
  {key:"rankKnowledge",label:"지식인",icon:"❓",color:"#f59e0b"},
  {key:"rankNews",label:"뉴스",icon:"📰",color:"#94a3b8"},
  {key:"rankPowerlink",label:"파워링크",icon:"💎",color:"#10b981"},
  {key:"rankGoogle",label:"구글맵",icon:"🌐",color:"#f97316"},
  {key:"rankKakao",label:"카카오맵",icon:"🟡",color:"#fbbf24"},
];
const RankBadge=({value,color})=>{
  if(!value||value==="-")return <span style={{color:"#334155",fontSize:12}}>—</span>;
  const n=parseInt(value);
  const bg=n===1?"#10b981":n<=3?color||"#6366f1":n<=5?"#f59e0b":n<=10?"#f97316":"#ef4444";
  return <span style={{background:bg,color:"#fff",borderRadius:6,padding:"2px 8px",fontSize:12,fontWeight:800,display:"inline-block",minWidth:28,textAlign:"center"}}>{value}</span>;
};

function KwForm({initial={},onSave}){
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
function MapForm({initial={},onSave}){
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
function ACForm({initial={},onSave}){
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
function SeoFormInner({initial,existingKws,onSave}){
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
function PhotoViewer({photo,startIdx,onClose,onDelete}){
  const[idx,setIdx]=useState(startIdx||0);
  const imgs=photo.images||[];const cur=imgs[idx];
  return (
    <Modal title={photo.title} onClose={onClose} extraWide>
      {!imgs.length?<div style={{color:"#475569",textAlign:"center",padding:40}}>사진이 없습니다.</div>:(
        <div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginBottom:16}}>
            <button onClick={()=>setIdx(i=>Math.max(0,i-1))} disabled={idx===0} style={{background:"#334155",border:"none",color:idx===0?"#334155":"#94a3b8",borderRadius:8,padding:"8px 16px",cursor:idx===0?"default":"pointer",fontSize:18}}>‹</button>
            <div style={{flex:1,maxWidth:600,textAlign:"center"}}>
              <img src={cur?.dataUrl} alt={cur?.name} style={{maxWidth:"100%",maxHeight:420,borderRadius:10,objectFit:"contain"}}/>
              <div style={{color:"#94a3b8",fontSize:12,marginTop:8}}>{cur?.name} ({idx+1}/{imgs.length})</div>
            </div>
            <button onClick={()=>setIdx(i=>Math.min(imgs.length-1,i+1))} disabled={idx===imgs.length-1} style={{background:"#334155",border:"none",color:idx===imgs.length-1?"#334155":"#94a3b8",borderRadius:8,padding:"8px 16px",cursor:idx===imgs.length-1?"default":"pointer",fontSize:18}}>›</button>
          </div>
          <div style={{textAlign:"center"}}>
            <button onClick={()=>{if(cur)onDelete(photo.id,cur.id);}} style={{background:"#ef4444",border:"none",color:"#fff",borderRadius:8,padding:"7px 16px",cursor:"pointer",fontSize:13,fontWeight:600}}>🗑 현재 사진 삭제</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ===== BRANCH APP (main management UI) =====
function BranchApp({branchId,branchName,data,setData,user,onBack,onLogout}){
  const[tab,setTab]=useState("overview");
  const[modal,setModal]=useState(null);
  const[sidebar,setSidebar]=useState(true);
  const[aiLoading,setAiLoading]=useState(false);
  const[aiResult,setAiResult]=useState([]);
  const[aiRegion,setAiRegion]=useState("");
  const[aiSpec,setAiSpec]=useState("");
  const[commTab,setCommTab]=useState("당근마켓");
  const[inhouseTab,setInhouseTab]=useState("messages");
  const[offlineTab,setOfflineTab]=useState("elevator");
  const[portalView,setPortalView]=useState(false);
  const[budgetTab,setBudgetTab]=useState("cost");
  const[calTab,setCalTab]=useState("calendar");
  const[calMonth,setCalMonth]=useState(()=>{const n=new Date();return{y:n.getFullYear(),m:n.getMonth()};});
  const fileRef=useRef();

  const upd=(k,v)=>setData(d=>({...d,[k]:v}));
  const updN=(o,k,v)=>setData(d=>({...d,[o]:{...d[o],[k]:v}}));
  const updComm=(p,k,v)=>setData(d=>({...d,community:{...d.community,[p]:{...d.community[p],[k]:v}}}));
  const del=(key,id)=>upd(key,data[key].filter(r=>r.id!==id));


  const[ytLoading,setYtLoading]=useState(null);

  const[rankLoading,setRankLoading]=useState(null);
  const dataRef=useRef(data);
  useEffect(()=>{dataRef.current=data;},[data]);
  const fetchRankData=async(keyword,targets)=>{
    const res=await fetch("/api/naver-rank",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({keyword,targets})});
    return await res.json();
  };
  const applyRankResult=(kwId,d)=>{
    const r=d.results||{};
    const updates={lastRankCheck:today()};
    if(r.blog?.rank)updates.myBlogRank=r.blog.rank+"위";
    else if(r.blog?.titles?.length)updates.myBlogRank="미노출";
    if(r.place?.rank)updates.myPlaceRank=r.place.rank+"위";
    else if(r.place?.titles?.length)updates.myPlaceRank="미노출";
    if(r.cafe?.rank)updates.rankCafe=r.cafe.rank+"위";
    else if(r.cafe?.titles?.length)updates.rankCafe="미노출";
    if(r.knowledge?.rank)updates.rankKnowledge=r.knowledge.rank+"위";
    if(r.news?.rank)updates.rankNews=r.news.rank+"위";
    if(r.powerlink?.rank)updates.rankPowerlink=r.powerlink.rank+"위";
    if(r.googleMap?.rank)updates.rankGoogle=r.googleMap.rank+"위";
    else if(r.googleMap?.titles?.length)updates.rankGoogle="미노출";
    if(r.kakaoMap?.rank)updates.rankKakao=r.kakaoMap.rank+"위";
    else if(r.kakaoMap?.titles?.length)updates.rankKakao="미노출";
    updates._kakaoInfo={titles:r.kakaoMap?.titles||[],rank:r.kakaoMap?.rank||null,debug:r.kakaoMap?._debug||null};
    if(r.tabOrder&&r.tabOrder.length>0)updates.detectedTabOrder=r.tabOrder;
    if(r.monthlySearch)updates.monthlySearch=r.monthlySearch;
    if(r.monthlySearchDetail)updates.monthlySearchDetail=r.monthlySearchDetail;
    updates._rankDetail={
      blog:r.blog?.titles||[],place:r.place?.titles||[],cafe:r.cafe?.titles||[],
      knowledge:r.knowledge?.titles||[],news:r.news?.titles||[],
      powerlink:r.powerlink?.titles||[],naverMap:r.naverMap?.titles||[],
      googleMap:r.googleMap?.titles||[],kakaoMap:r.kakaoMap?.titles||[],
      tabOrder:r.tabOrder&&r.tabOrder.length>0?r.tabOrder:(k.detectedTabOrder||[]),
      _tabDebug:r._tabDebug||null
    };
    return updates;
  };
  const checkNaverRank=async(kwItem)=>{
    const targets=dataRef.current.rankTargets||{};
    if(!targets.blogName&&!targets.placeName&&!targets.cafeName){alert("먼저 '내 콘텐츠 식별자'를 설정해주세요 (블로그명, 업체명 등)");return;}
    setRankLoading(kwItem.id);
    try{
      const d=await fetchRankData(kwItem.keyword,targets);
      if(d.error){alert("오류: "+d.error);setRankLoading(null);return;}
      const updates=applyRankResult(kwItem.id,d);
      upd("keywords",dataRef.current.keywords.map(k=>k.id===kwItem.id?{...k,...updates}:k));
    }catch(e){alert("네트워크 오류: "+e.message);}
    setRankLoading(null);
  };
  const checkAllRanks=async()=>{
    const targets=dataRef.current.rankTargets||{};
    if(!targets.blogName&&!targets.placeName&&!targets.cafeName){alert("먼저 '내 콘텐츠 식별자'를 설정해주세요");return;}
    setRankLoading("all");
    for(const kw of dataRef.current.keywords){
      try{
        const d=await fetchRankData(kw.keyword,targets);
        if(!d.error){
          const updates=applyRankResult(kw.id,d);
          const cur=dataRef.current.keywords.map(k=>k.id===kw.id?{...k,...updates}:k);
          upd("keywords",cur);
        }
      }catch(e){console.error(e);}
      await new Promise(r=>setTimeout(r,1500));
    }
    setRankLoading(null);
  };
  const checkMapRank=async(mapItem)=>{
    const targets=dataRef.current.rankTargets||{};
    if(!targets.placeName){alert("먼저 '내 콘텐츠 식별자'에서 업체명을 설정해주세요");return;}
    setRankLoading("map_"+mapItem.id);
    try{
      const d=await fetchRankData(mapItem.keyword,targets);
      if(!d.error){
        const r=d.results||{};
        const updates={lastRankCheck:today()};
        if(r.place?.rank)updates.naverPlace=r.place.rank+"위";
        else if(r.place?.titles?.length)updates.naverPlace="미노출";
        if(r.googleMap?.rank)updates.google=r.googleMap.rank+"위";
        else if(r.googleMap?.titles?.length)updates.google="미노출";
        if(r.kakaoMap?.rank)updates.kakao=r.kakaoMap.rank+"위";
        else if(r.kakaoMap?.titles?.length)updates.kakao="미노출";
        updates._mapDetail={place:r.place?.titles||[],googleMap:r.googleMap?.titles||[],kakaoMap:r.kakaoMap?.titles||[],_kakaoDebug:r.kakaoMap?._debug||null,_googleDebug:r.googleMap?.error||null};
        const rn=parseInt(updates.naverPlace)||99;const rg=parseInt(updates.google)||99;const rk=parseInt(updates.kakao)||99;
        const best=Math.min(rn,rg,rk);updates.status=best<=3?"good":best<=5?"warn":"danger";
        upd("maps",dataRef.current.maps.map(m=>m.id===mapItem.id?{...m,...updates}:m));
      }
    }catch(e){console.error(e);}
    setRankLoading(null);
  };
  const checkAllMapRanks=async()=>{
    const targets=dataRef.current.rankTargets||{};
    if(!targets.placeName){alert("먼저 업체명을 설정해주세요");return;}
    setRankLoading("allMaps");
    for(const m of dataRef.current.maps){
      await checkMapRank(m);
      await new Promise(r=>setTimeout(r,1500));
    }
    setRankLoading(null);
  };
  const fetchReviews=async(keyword,platform="naver")=>{
    const targets=dataRef.current.rankTargets||{};
    if(!targets.placeName){alert("업체명을 먼저 설정해주세요");return;}
    setRankLoading("reviews_"+platform);
    try{
      const res=await fetch("/api/naver-rank",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({keyword,targets,action:"reviews",platform})});
      const d=await res.json();
      if(d.results?.reviews){setModal({type:"reviews",data:d.results.reviews,keyword,platform});}
      else{alert((platform==="naver"?"플레이스":platform==="google"?"구글맵":"카카오맵")+" 리뷰를 가져올 수 없습니다.");}
    }catch(e){alert("오류: "+e.message);}
    setRankLoading(null);
  };
  const runApiDiag=async()=>{
    setRankLoading("diag");
    try{
      const res=await fetch("/api/naver-rank/test");
      const d=await res.json();
      setModal({type:"apiDiag",data:d});
    }catch(e){alert("진단 실패: "+e.message);}
    setRankLoading(null);
  };
  const[ytChTab,setYtChTab]=useState("all");
  const ytRefresh=async(item,key="youtube")=>{
    const vid=extractYtId(item.url);if(!vid){alert("유효한 YouTube URL이 아닙니다.");return;}
    setYtLoading(item.id);
    try{
      const[vd,cm]=await Promise.all([fetchYtVideo(vid),fetchYtComments(vid)]);
      if(!vd){alert("영상 정보를 가져올 수 없습니다.");setYtLoading(null);return;}
      const updated={...item,title:vd.title||item.title,views:vd.views,likes:vd.likes,commentCount:vd.commentCount,comments:cm,channelTitle:vd.channelTitle,channelId:vd.channelId,thumbnail:vd.thumbnail,lastUpdated:today()};
      upd(key,data[key].map(r=>r.id===item.id?{...r,...updated}:r));
    }catch(e){alert("API 오류: "+e.message);}
    setYtLoading(null);
  };
  const ytAddByUrl=async(url,key="youtube",platform="")=>{
    const vid=extractYtId(url);if(!vid){alert("유효한 YouTube URL이 아닙니다.");return false;}
    setYtLoading("adding");
    try{
      const[vd,cm]=await Promise.all([fetchYtVideo(vid),fetchYtComments(vid)]);
      if(!vd){alert("영상 정보를 가져올 수 없습니다.");setYtLoading(null);return false;}
      const entry={id:Date.now(),url,title:vd.title,views:vd.views,likes:vd.likes,commentCount:vd.commentCount,comments:cm,channelTitle:vd.channelTitle,channelId:vd.channelId,thumbnail:vd.thumbnail,lastUpdated:today()};
      if(platform)entry.platform=platform;
      upd(key,[...data[key],entry]);
    }catch(e){alert("API 오류: "+e.message);}
    setYtLoading(null);return true;
  };
  const ytAddChannel=async(input)=>{
    setYtLoading("addCh");
    try{
      const cid=await resolveYtChannelId(input);
      if(!cid){alert("채널을 찾을 수 없습니다.");setYtLoading(null);return;}
      if((data.ytChannels||[]).some(c=>c.id===cid)){alert("이미 등록된 채널입니다.");setYtLoading(null);return;}
      const result=await fetchYtChannelVideos(cid);
      if(!result){alert("채널 정보를 가져올 수 없습니다.");setYtLoading(null);return;}
      const ch={...result.channel,id:cid,addedAt:today()};
      upd("ytChannels",[...(data.ytChannels||[]),ch]);
      const newVids=result.videos.filter(v=>!data.youtube.some(y=>y.url===v.url)).map(v=>({...v,id:Date.now()+Math.random(),channelId:cid,channelTitle:result.channel.name,lastUpdated:today(),comments:[]}));
      if(newVids.length)upd("youtube",[...data.youtube,...newVids]);
      alert(`${result.channel.name} 등록 완료! ${newVids.length}개 영상 추가됨`);
    }catch(e){alert("오류: "+e.message);}
    setYtLoading(null);
  };
  const ytRefreshChannel=async(ch)=>{
    setYtLoading("ch_"+ch.id);
    try{
      const result=await fetchYtChannelVideos(ch.id);
      if(!result){setYtLoading(null);return;}
      upd("ytChannels",(data.ytChannels||[]).map(c=>c.id===ch.id?{...c,...result.channel}:c));
      const newVids=result.videos.filter(v=>!data.youtube.some(y=>y.url===v.url)).map(v=>({...v,id:Date.now()+Math.random(),channelId:ch.id,channelTitle:result.channel.name,lastUpdated:today(),comments:[]}));
      if(newVids.length)upd("youtube",[...data.youtube,...newVids]);
    }catch(e){console.error(e);}
    setYtLoading(null);
  };

  const simRefresh=(key,item)=>{upd(key,data[key].map(r=>r.id===item.id?{...r,views:Math.max(0,(r.views||0)+Math.floor(Math.random()*200+20)),lastUpdated:today()}:r));};
  const simRefreshComm=(p,item)=>{updComm(p,"items",data.community[p].items.map(r=>r.id===item.id?{...r,views:Math.max(0,(r.views||0)+Math.floor(Math.random()*100+10)),lastUpdated:today()}:r));};

  const handleExcel=e=>{
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{const wb=XLSX.read(ev.target.result,{type:"binary"});const ws=wb.Sheets[wb.SheetNames[0]];const rows=XLSX.utils.sheet_to_json(ws,{header:1});
      const nk=rows.slice(1).filter(r=>r[0]).map((r,i)=>({id:Date.now()+i,keyword:r[0]||"",tabOrder:[...TAB_TYPES],myBlogRank:r[1]||"-",myPlaceRank:r[2]||"-",status:"warn"}));
      upd("keywords",[...data.keywords,...nk]);};
    reader.readAsBinaryString(file);e.target.value="";
  };
  const callAI=async()=>{
    if(!aiRegion)return alert("지역을 입력해주세요.");
    setAiLoading(true);setAiResult([]);
    try{const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:2000,messages:[{role:"user",content:`당신은 한국 로컬 마케팅 전문가입니다. ${aiRegion} 지역의 ${aiSpec||"미용 피부과/성형외과"} 병원에 방문할 잠재 고객이 네이버에서 검색할만한 키워드를 중요도 순으로 20개 제안해주세요. 월간 예상 검색량과 지난 12개월 월별 추이를 포함하세요. JSON 배열로만:\n[{"keyword":"강남 피부과","priority":1,"monthlySearch":12000,"trend":[{"month":"1월","count":10000},{"month":"2월","count":11000},{"month":"3월","count":13000},{"month":"4월","count":14000},{"month":"5월","count":13500},{"month":"6월","count":12000},{"month":"7월","count":11000},{"month":"8월","count":10500},{"month":"9월","count":11500},{"month":"10월","count":12500},{"month":"11월","count":13000},{"month":"12월","count":12000}]}]`}]})});
      const d=await res.json();setAiResult(JSON.parse((d.content?.[0]?.text||"[]").replace(/```json|```/g,"").trim()));
    }catch{setAiResult([]);}setAiLoading(false);
  };
  const addAIKws=()=>{upd("keywords",[...data.keywords,...aiResult.map((r,i)=>({id:Date.now()+i,keyword:r.keyword,tabOrder:[...TAB_TYPES],myBlogRank:"-",myPlaceRank:"-",status:"warn",monthlySearch:r.monthlySearch,trend:r.trend}))]);setModal(null);setAiResult([]);};
  const handleImgUpload=(photoId,files)=>{
    Promise.all(Array.from(files).map(f=>new Promise(res=>{const r=new FileReader();r.onload=ev=>res({id:Date.now()+Math.random(),name:f.name,dataUrl:ev.target.result});r.readAsDataURL(f);}))).then(imgs=>updN("inhouse","photos",data.inhouse.photos.map(p=>p.id===photoId?{...p,images:[...(p.images||[]),...imgs]}:p)));
  };

  // Budget calc
  const calcBudget=()=>{
    const offTotal=[...data.offline.elevator,...data.offline.subway,...data.offline.other].filter(a=>a.status==="집행중").reduce((a,b)=>a+(+b.cost||0),0);
    const commTotal=Object.values(data.community||{}).reduce((a,p)=>a+(p.cost||0),0);
    const rows=[
      ...Object.entries(data.keywordCosts||{}).filter(([,v])=>v>0).map(([k,v])=>({label:`키워드·${k}`,cost:v,color:CHANNEL_COLORS.keywords})),
      {label:"지도 노출",cost:data.mapsCost||0,color:CHANNEL_COLORS.maps},
      {label:"체험단",cost:data.experienceCost||0,color:CHANNEL_COLORS.experience},
      {label:"카페 바이럴",cost:data.cafesCost||0,color:CHANNEL_COLORS.cafes},
      {label:"유튜브",cost:data.youtubeCost||0,color:CHANNEL_COLORS.youtube},
      {label:"숏폼",cost:data.shortformCost||0,color:CHANNEL_COLORS.shortform},
      {label:"자동완성",cost:data.autocompleteCost||0,color:CHANNEL_COLORS.autocomplete},
      {label:"홈페이지 SEO",cost:data.seoCost||0,color:CHANNEL_COLORS.seo},
      ...COMM_PLATFORMS.filter(p=>(data.community[p]?.cost||0)>0).map(p=>({label:`커뮤·${p}`,cost:data.community[p].cost||0,color:CHANNEL_COLORS[`community_${p}`]||"#94a3b8"})),
      {label:"원내·메시지",cost:data.inhouse.messagesCost||0,color:CHANNEL_COLORS.inhouse_messages},
      {label:"원내·리뷰",cost:data.inhouse.reviewsCost||0,color:CHANNEL_COLORS.inhouse_reviews},
      {label:"원내·사진",cost:data.inhouse.photosCost||0,color:CHANNEL_COLORS.inhouse_photos},
      {label:"원내·영상",cost:data.inhouse.videosCost||0,color:CHANNEL_COLORS.inhouse_videos},
      {label:"오프라인",cost:offTotal,color:CHANNEL_COLORS.offline},
    ];
    return{rows,total:rows.reduce((a,b)=>a+b.cost,0)};
  };
  const{rows:budgetRows,total:budgetTotal}=calcBudget();

  // ROI Calculation
  const calcROI=()=>{
    const conv=data.conversions||{};
    const avgRev=data.avgRevenuePerPatient||0;
    const latest=data.performanceLogs?.[data.performanceLogs.length-1]||{};
    const kwCost=Object.values(data.keywordCosts||{}).reduce((a,b)=>a+b,0);
    const commCost=Object.values(data.community||{}).reduce((a,p)=>a+(p.cost||0),0);
    const inhCost=(data.inhouse?.messagesCost||0)+(data.inhouse?.reviewsCost||0)+(data.inhouse?.photosCost||0)+(data.inhouse?.videosCost||0);
    const offCost=[...data.offline.elevator,...data.offline.subway,...data.offline.other].filter(a=>a.status==="집행중").reduce((a,b)=>a+(+b.cost||0),0);
    const cafeViews=(data.cafes||[]).reduce((a,c)=>a+c.posts.reduce((b,p)=>b+(p.views||0),0),0);
    const commViews=Object.values(data.community||{}).reduce((a,p)=>a+(p.items||[]).reduce((b,i)=>b+(i.views||0),0),0);

    const channels=[
      {key:"keywords",label:"네이버 키워드",cost:kwCost,views:(latest.blog_visits||0),patients:conv.keywords||0,color:"#6366f1",icon:"🔍"},
      {key:"maps",label:"지도 노출",cost:data.mapsCost||0,views:(latest.place_views||0),patients:conv.maps||0,color:"#06b6d4",icon:"📍"},
      {key:"experience",label:"체험단",cost:data.experienceCost||0,views:data.experience?.reduce((a,e)=>a+(e.views||0),0)||0,patients:conv.experience||0,color:"#10b981",icon:"📝"},
      {key:"cafes",label:"카페 바이럴",cost:data.cafesCost||0,views:cafeViews,patients:conv.cafes||0,color:"#ec4899",icon:"☕"},
      {key:"youtube",label:"유튜브",cost:data.youtubeCost||0,views:data.youtube?.reduce((a,y)=>a+(y.views||0),0)||0,patients:conv.youtube||0,color:"#f97316",icon:"📺"},
      {key:"shortform",label:"숏폼",cost:data.shortformCost||0,views:data.shortform?.reduce((a,s)=>a+(s.views||0),0)||0,patients:conv.shortform||0,color:"#8b5cf6",icon:"🎬"},
      {key:"autocomplete",label:"자동완성",cost:data.autocompleteCost||0,views:0,patients:conv.autocomplete||0,color:"#14b8a6",icon:"⌨️"},
      {key:"seo",label:"홈페이지 SEO",cost:data.seoCost||0,views:0,patients:conv.seo||0,color:"#0ea5e9",icon:"🌐"},
      {key:"community",label:"커뮤니티",cost:commCost,views:commViews,patients:conv.community||0,color:"#f97316",icon:"👥"},
      {key:"inhouse",label:"원내 마케팅",cost:inhCost,views:0,patients:conv.inhouse||0,color:"#3b82f6",icon:"🏥"},
      {key:"offline",label:"오프라인",cost:offCost,views:0,patients:conv.offline||0,color:"#ef4444",icon:"📋"},
    ];
    const totalPatients=channels.reduce((a,c)=>a+c.patients,0);
    return{channels,totalPatients,avgRev};
  };
  const roi=calcROI();
  const rankColor=r=>r==="1위"?"#10b981":r==="-"?"#475569":"#f59e0b";
  const stats=[
    {title:"총 키워드",value:data.keywords.length,color:"#10b981"},
    {title:"지도 1위",value:data.maps.filter(m=>m.naverPlace==="1위").length,color:"#06b6d4"},
    {title:"카페 침투",value:`${data.cafes.filter(c=>c.penetrated).length}/${data.cafes.length}`,color:"#ec4899"},
    {title:"유튜브 조회",value:fmt(data.youtube.reduce((a,b)=>a+b.views,0)),color:"#f97316"},
    {title:"숏폼 조회",value:fmt(data.shortform.reduce((a,b)=>a+b.views,0)),color:"#8b5cf6"},
    {title:"월 총 비용",value:fmtW(budgetTotal),color:"#f59e0b"},
  ];

  return (
    <div style={{display:"flex",height:"100vh",background:"#0f172a",color:"#f1f5f9",fontFamily:"'Apple SD Gothic Neo',sans-serif",overflow:"hidden"}}>
      {/* Sidebar */}
      <div style={{width:sidebar?208:52,background:"#0a0f1e",flexShrink:0,borderRight:"1px solid #1e293b",display:"flex",flexDirection:"column",transition:"width 0.2s",overflow:"hidden"}}>
        <div style={{padding:"14px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid #1e293b"}}>
          {sidebar&&<span style={{fontWeight:800,fontSize:15,color:"#6366f1",whiteSpace:"nowrap"}}>REBERRYOS</span>}
          <button onClick={()=>setSidebar(!sidebar)} style={{background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:18,flexShrink:0}}>☰</button>
        </div>
        {onBack&&(
          <button onClick={onBack} style={{display:"flex",alignItems:"center",padding:"10px 14px",background:"#1e1b4b",border:"none",color:"#a5b4fc",cursor:"pointer",textAlign:"left",fontWeight:600,fontSize:12,borderBottom:"1px solid #1e293b",whiteSpace:"nowrap",overflow:"hidden"}}>
            {sidebar?"← 지점 목록":"←"}
          </button>
        )}
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>{setTab(t.id);if(t.id!=="portal")setPortalView(false);}}
            style={{display:"flex",alignItems:"center",padding:"10px 14px",background:tab===t.id?"#1e293b":"none",border:"none",color:tab===t.id?"#6366f1":"#94a3b8",cursor:"pointer",textAlign:"left",fontWeight:tab===t.id?700:400,fontSize:13,borderLeft:tab===t.id?"3px solid #6366f1":"3px solid transparent",whiteSpace:"nowrap",overflow:"hidden"}}>
            {sidebar?t.label:t.label[0]}
          </button>
        ))}
        <div style={{flex:1}}/>
        <div style={{padding:"8px 10px",borderTop:"1px solid #1e293b"}}>
          {sidebar&&<div style={{color:"#64748b",fontSize:11,marginBottom:6}}>👤 {user.name}</div>}
          <button onClick={onLogout} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:11,width:"100%"}}>{sidebar?"로그아웃":"🚪"}</button>
        </div>
      </div>

      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"13px 24px",borderBottom:"1px solid #1e293b",background:"#0a0f1e",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontWeight:800,fontSize:17}}>{branchName&&<span style={{color:"#a5b4fc",marginRight:8,fontSize:13,background:"#1e1b4b",borderRadius:6,padding:"2px 8px"}}>{branchName}</span>}{TABS.find(t=>t.id===tab)?.label}</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <Btn onClick={()=>exportExcel(data,branchName)} color="#334155" style={{color:"#94a3b8",padding:"5px 12px",fontSize:12}}>📥 엑셀</Btn>
          </div>
        </div>

        <div style={{flex:1,overflow:"auto",padding:"20px 24px"}}>

          {/* OVERVIEW */}
          {tab==="overview"&&(
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
          )}

          {/* PERFORMANCE */}
          {tab==="performance"&&(
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
          )}

          {/* PORTAL */}
          {tab==="portal"&&(
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
          )}

          {/* BUDGET + ROI */}
          {tab==="budget"&&(
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
          )}

          {/* KEYWORDS */}
          {tab==="keywords"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div style={{fontWeight:700,fontSize:15}}>네이버 키워드</div>
                <div style={{display:"flex",gap:8}}>
                  <Btn color="#10b981" onClick={()=>checkAllRanks()} disabled={!!rankLoading}>
                    {rankLoading?"⏳ 조회중...":"🔍 전체 순위 조회"}
                  </Btn>
                  <Btn color="#8b5cf6" onClick={()=>setModal("aiKw")}>🤖 AI 제안</Btn>
                  <Btn color="#f59e0b" onClick={()=>fileRef.current.click()}>📂 엑셀</Btn>
                  <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={handleExcel}/>
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
              {(modal==="kw"||modal?.type==="editKw")&&(
                <Modal title={modal==="kw"?"키워드 추가":"편집"} onClose={()=>setModal(null)}>
                  <KwForm initial={modal?.item} onSave={f=>{
                    if(modal==="kw")upd("keywords",[...data.keywords,{...f,id:Date.now(),status:"warn"}]);
                    else upd("keywords",data.keywords.map(k=>k.id===modal.item.id?{...k,...f}:k));setModal(null);
                  }}/>
                </Modal>
              )}
            </div>
          )}

          {/* MAPS */}
          {tab==="maps"&&(
            <SectionWithCost title="지도 노출 순위" cost={data.mapsCost} onCostChange={v=>upd("mapsCost",v)} color={CHANNEL_COLORS.maps} right={<div style={{display:"flex",gap:6}}><Btn color="#f59e0b" onClick={()=>runApiDiag()} disabled={rankLoading==="diag"}>{rankLoading==="diag"?"⏳":"🔧 API 진단"}</Btn><Btn color="#10b981" onClick={()=>checkAllMapRanks()} disabled={!!rankLoading}>{rankLoading==="allMaps"?"⏳ 조회중...":"🔍 전체 조회"}</Btn><Btn onClick={()=>setModal("map")}>+ 추가</Btn></div>}>
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
          )}

          {/* EXPERIENCE */}
          {tab==="experience"&&(
            <SectionWithCost title="체험단" cost={data.experienceCost} onCostChange={v=>upd("experienceCost",v)} color={CHANNEL_COLORS.experience} right={<Btn onClick={()=>setModal("exp")}>+ 추가</Btn>}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr><Th c="제목"/><Th c="플랫폼"/><Th c="조회수"/><Th c="댓글"/><Th c="갱신"/><Th c="상태"/><Th c="URL"/><Th c=""/></tr></thead>
                <tbody>{data.experience.map((e,ri)=>(
                  <tr key={e.id} style={{borderBottom:"1px solid #1e293b",background:ri%2===0?"#0f172a":"#111827"}}>
                    <Td><LinkCell url={e.url}><span style={{fontWeight:700}}>{e.title}</span></LinkCell></Td>
                    <Td><span style={{background:"#334155",borderRadius:6,padding:"2px 7px",fontSize:12}}>{e.platform}</span></Td>
                    <Td><span style={{color:"#06b6d4"}}>{fmt(e.views)}</span></Td>
                    <Td>{e.comments}</Td>
                    <Td><span style={{color:"#475569",fontSize:12}}>{e.lastUpdated}</span></Td>
                    <Td><Badge status={e.status}/></Td>
                    <Td><div style={{display:"flex",gap:6}}><input value={e.url||""} onChange={ev=>upd("experience",data.experience.map(r=>r.id===e.id?{...r,url:ev.target.value}:r))} placeholder="URL" style={{background:"#0f172a",border:"1px solid #334155",borderRadius:6,padding:"5px 9px",color:"#94a3b8",fontSize:12,width:140}}/><button onClick={()=>simRefresh("experience",e)} style={{background:"#334155",border:"none",color:"#06b6d4",borderRadius:6,padding:"5px 9px",cursor:"pointer",fontSize:12}}>↻</button></div></Td>
                    <Td><div style={{display:"flex",gap:4}}><button onClick={()=>setModal({type:"editExp",item:e})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>편집</button><DelBtn onClick={()=>del("experience",e.id)}/></div></Td>
                  </tr>
                ))}</tbody>
              </table>
              {modal?.type==="editExp"&&<Modal title="체험단 편집" onClose={()=>setModal(null)}><SimpleForm fields={["title:제목","platform:플랫폼|네이버블로그 / 네이버카페","url:URL","views:조회수","comments:댓글수"]} initial={modal.item} onSave={f=>{upd("experience",data.experience.map(x=>x.id===modal.item.id?{...x,...f,views:+f.views||0,comments:+f.comments||0}:x));setModal(null);}}/></Modal>}
              {modal==="exp"&&<Modal title="체험단 추가" onClose={()=>setModal(null)}><SimpleForm fields={["title:제목","platform:플랫폼|네이버블로그 / 네이버카페","url:URL","views:조회수","comments:댓글수"]} onSave={f=>{upd("experience",[...data.experience,{...f,id:Date.now(),views:+f.views||0,comments:+f.comments||0,status:"warn",lastUpdated:today()}]);setModal(null);}}/></Modal>}
            </SectionWithCost>
          )}

          {/* CAFES */}
          {tab==="cafes"&&(
            <SectionWithCost title="카페 바이럴" costLabel="카페 바이럴 월 집행비" cost={data.cafesCost} onCostChange={v=>upd("cafesCost",v)} color={CHANNEL_COLORS.cafes} right={<Btn onClick={()=>setModal("cafe")}>+ 카페</Btn>}>
              {data.cafes.map(cafe=>(
                <div key={cafe.id} style={{background:"#0f172a",borderRadius:14,padding:"16px 18px",marginBottom:14}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <LinkCell url={cafe.url}><span style={{fontWeight:800,fontSize:15}}>{cafe.name}</span></LinkCell>
                      <span style={{color:"#64748b",fontSize:12}}>회원 {cafe.members}</span>
                      <span style={{background:cafe.penetrated?"#10b981":"#ef4444",color:"#fff",borderRadius:99,padding:"2px 9px",fontSize:12,fontWeight:700}}>{cafe.penetrated?"✓ 완료":"✗ 미침투"}</span>
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <button onClick={()=>setModal({type:"editCafe",item:cafe})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:12}}>편집</button><button onClick={()=>upd("cafes",data.cafes.map(c=>c.id===cafe.id?{...c,penetrated:!c.penetrated}:c))} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:12}}>상태전환</button>
                      <Btn onClick={()=>setModal({type:"addPost",cafeId:cafe.id})} style={{padding:"5px 12px",fontSize:12}}>+ 게시물</Btn>
                      <DelBtn onClick={()=>upd("cafes",data.cafes.filter(c=>c.id!==cafe.id))}/>
                    </div>
                  </div>
                  {cafe.posts.length>0&&(
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                      <thead><tr><Th c="게시물"/><Th c="조회수"/><Th c="댓글"/><Th c="URL"/><Th c=""/></tr></thead>
                      <tbody>{cafe.posts.map(post=>(
                        <tr key={post.id} style={{borderBottom:"1px solid #0f172a"}}>
                          <Td><LinkCell url={post.url}><span style={{fontWeight:600}}>{post.title}</span></LinkCell></Td>
                          <Td><span style={{color:"#06b6d4"}}>{fmt(post.views)}</span></Td>
                          <Td><button onClick={()=>setModal({type:"comments",comments:post.comments,title:post.title})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 9px",cursor:"pointer",fontSize:12}}>💬 {post.comments?.length||0}</button></Td>
                          <Td><input value={post.url||""} onChange={e=>upd("cafes",data.cafes.map(c=>c.id===cafe.id?{...c,posts:c.posts.map(p=>p.id===post.id?{...p,url:e.target.value}:p)}:c))} placeholder="URL" style={{background:"#0f172a",border:"1px solid #334155",borderRadius:6,padding:"5px 9px",color:"#94a3b8",fontSize:12,width:140}}/></Td>
                          <Td><div style={{display:"flex",gap:4}}><button onClick={()=>setModal({type:"editPost",cafeId:cafe.id,item:post})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>편집</button><DelBtn onClick={()=>upd("cafes",data.cafes.map(c=>c.id===cafe.id?{...c,posts:c.posts.filter(p=>p.id!==post.id)}:c))}/></div></Td>
                        </tr>
                      ))}</tbody>
                    </table>
                  )}
                </div>
              ))}
              {modal?.type==="editCafe"&&<Modal title="카페 편집" onClose={()=>setModal(null)}><SimpleForm fields={["name:카페명","members:회원수|예: 5만","url:카페 URL"]} initial={modal.item} onSave={f=>{upd("cafes",data.cafes.map(c=>c.id===modal.item.id?{...c,...f}:c));setModal(null);}}/></Modal>}
              {modal==="cafe"&&<Modal title="카페 추가" onClose={()=>setModal(null)}><SimpleForm fields={["name:카페명","members:회원수|예: 5만","url:카페 URL"]} onSave={f=>{upd("cafes",[...data.cafes,{...f,id:Date.now(),penetrated:false,posts:[]}]);setModal(null);}}/></Modal>}
              {modal?.type==="editPost"&&<Modal title="게시물 편집" onClose={()=>setModal(null)}><SimpleForm fields={["title:제목","url:URL","views:조회수"]} initial={modal.item} onSave={f=>{upd("cafes",data.cafes.map(c=>c.id===modal.cafeId?{...c,posts:c.posts.map(p=>p.id===modal.item.id?{...p,...f,views:+f.views||0}:p)}:c));setModal(null);}}/></Modal>}
              {modal?.type==="addPost"&&<Modal title="게시물 추가" onClose={()=>setModal(null)}><SimpleForm fields={["title:제목","url:URL","views:조회수"]} onSave={f=>{upd("cafes",data.cafes.map(c=>c.id===modal.cafeId?{...c,posts:[...c.posts,{...f,id:Date.now(),views:+f.views||0,comments:[]}]}:c));setModal(null);}}/></Modal>}
              {modal?.type==="comments"&&<CommentsPanel comments={modal.comments} title={modal.title} onClose={()=>setModal(null)}/>}
            </SectionWithCost>
          )}

          {/* YOUTUBE */}
          {tab==="youtube"&&(
            <SectionWithCost title="유튜브" cost={data.youtubeCost} onCostChange={v=>upd("youtubeCost",v)} color={CHANNEL_COLORS.youtube} right={<div style={{display:"flex",gap:6}}><Btn onClick={()=>setModal({type:"addYtCh"})}>+ 채널</Btn><Btn onClick={()=>setModal({type:"addYt",_ytUrl:""})}>+ 영상</Btn></div>}>
              {(data.ytChannels||[]).length>0&&(
                <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
                  {(data.ytChannels||[]).map(ch=>(
                    <div key={ch.id} style={{background:ytChTab===ch.id?"#1e293b":"#0f172a",borderRadius:10,padding:"12px 16px",flex:"1 1 220px",border:ytChTab===ch.id?"1px solid #6366f1":"1px solid #1e293b",cursor:"pointer"}} onClick={()=>setYtChTab(ytChTab===ch.id?"all":ch.id)}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          {ch.thumbnail&&<img src={ch.thumbnail} alt="" style={{width:28,height:28,borderRadius:99}}/>}
                          <span style={{fontWeight:800,fontSize:14}}>{ch.name}</span>
                        </div>
                        <div style={{display:"flex",gap:4}}>
                          <button onClick={e=>{e.stopPropagation();ytRefreshChannel(ch);}} disabled={ytLoading==="ch_"+ch.id} style={{background:"#334155",border:"none",color:"#06b6d4",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:11}}>{ytLoading==="ch_"+ch.id?"⏳":"↻"}</button>
                          <button onClick={e=>{e.stopPropagation();if(confirm(ch.name+" 채널을 삭제하시겠습니까?"))upd("ytChannels",(data.ytChannels||[]).filter(x=>x.id!==ch.id));}} style={{background:"#334155",border:"none",color:"#ef4444",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:11}}>✕</button>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                        <div><div style={{color:"#94a3b8",fontSize:11}}>구독자</div><div style={{color:"#f43f5e",fontWeight:800,fontSize:15}}>{(ch.subscribers||0).toLocaleString()}명</div></div>
                        <div><div style={{color:"#94a3b8",fontSize:11}}>총 조회수</div><div style={{color:"#06b6d4",fontWeight:800,fontSize:15}}>{(ch.totalViews||0).toLocaleString()}</div></div>
                        <div><div style={{color:"#94a3b8",fontSize:11}}>영상</div><div style={{color:"#a78bfa",fontWeight:800,fontSize:15}}>{ch.videoCount||0}개</div></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {(data.ytChannels||[]).length>0&&(
                <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
                  <button onClick={()=>setYtChTab("all")} style={{background:ytChTab==="all"?"#6366f1":"#1e293b",color:ytChTab==="all"?"#fff":"#94a3b8",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:ytChTab==="all"?700:400}}>전체 ({data.youtube.length})</button>
                  {(data.ytChannels||[]).map(ch=><button key={ch.id} onClick={()=>setYtChTab(ch.id)} style={{background:ytChTab===ch.id?"#6366f1":"#1e293b",color:ytChTab===ch.id?"#fff":"#94a3b8",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:ytChTab===ch.id?700:400}}>{ch.name} ({data.youtube.filter(y=>y.channelId===ch.id).length})</button>)}
                  <button onClick={()=>setYtChTab("noChannel")} style={{background:ytChTab==="noChannel"?"#6366f1":"#1e293b",color:ytChTab==="noChannel"?"#fff":"#94a3b8",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:ytChTab==="noChannel"?700:400}}>직접추가 ({data.youtube.filter(y=>!y.channelId).length})</button>
                </div>
              )}
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr><Th c="제목"/><Th c="조회수"/><Th c="댓글"/><Th c="좋아요"/><Th c="갱신"/><Th c="URL"/><Th c=""/></tr></thead>
                <tbody>{data.youtube.filter(y=>ytChTab==="all"?true:ytChTab==="noChannel"?!y.channelId:y.channelId===ytChTab).map((y,ri)=>(
                  <tr key={y.id} style={{borderBottom:"1px solid #1e293b",background:ri%2===0?"#0f172a":"#111827"}}>
                    <Td><LinkCell url={y.url}><span style={{fontWeight:700}}>{y.title}</span></LinkCell></Td>
                    <Td><span style={{color:"#06b6d4"}}>{fmt(y.views)}</span></Td>
                    <Td><button onClick={()=>setModal({type:"comments",comments:y.comments,title:y.title})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 9px",cursor:"pointer",fontSize:12}}>💬 {y.commentCount||y.comments?.length||0}</button></Td>
                    <Td><span style={{color:"#f43f5e"}}>{fmt(y.likes)}</span></Td>
                    <Td><span style={{color:"#475569",fontSize:12}}>{y.lastUpdated}</span></Td>
                    <Td><div style={{display:"flex",gap:6}}><input value={y.url||""} onChange={e=>upd("youtube",data.youtube.map(r=>r.id===y.id?{...r,url:e.target.value}:r))} placeholder="URL" style={{background:"#0f172a",border:"1px solid #334155",borderRadius:6,padding:"5px 9px",color:"#94a3b8",fontSize:12,width:140}}/><button onClick={()=>ytRefresh(y,"youtube")} disabled={ytLoading===y.id} style={{background:ytLoading===y.id?"#1e293b":"#334155",border:"none",color:"#06b6d4",borderRadius:6,padding:"5px 9px",cursor:"pointer",fontSize:12}}>{ytLoading===y.id?"⏳":"↻"}</button></div></Td>
                    <Td><div style={{display:"flex",gap:4}}><button onClick={()=>setModal({type:"editYt",item:y})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>편집</button><DelBtn onClick={()=>del("youtube",y.id)}/></div></Td>
                  </tr>
                ))}</tbody>
              </table>
              {modal?.type==="editYt"&&<Modal title="유튜브 편집" onClose={()=>setModal(null)}><SimpleForm fields={["title:제목","url:URL","views:조회수","likes:좋아요수"]} initial={modal.item} onSave={f=>{upd("youtube",data.youtube.map(x=>x.id===modal.item.id?{...x,...f,views:+f.views||0,likes:+f.likes||0}:x));setModal(null);}}/></Modal>}
              {modal?.type==="addYt"&&<Modal title="유튜브 추가" onClose={()=>setModal(null)}><div>
                <FF label="YouTube URL"><Inp value={modal?._ytUrl||""} onChange={v=>setModal({...modal,_ytUrl:v})} placeholder="https://youtube.com/watch?v=... 또는 shorts/..."/></FF>
                <Btn onClick={async()=>{const ok=await ytAddByUrl(modal?._ytUrl||"","youtube");if(ok)setModal(null);}} disabled={ytLoading==="adding"} style={{width:"100%",marginTop:4}}>{ytLoading==="adding"?"⏳ 데이터 가져오는 중...":"URL로 자동 추가"}</Btn>
                <div style={{textAlign:"center",color:"#475569",fontSize:12,margin:"10px 0"}}>또는 직접 입력</div>
                <SimpleForm fields={["title:제목","url:URL","views:조회수","likes:좋아요수"]} onSave={f=>{upd("youtube",[...data.youtube,{...f,id:Date.now(),views:+f.views||0,likes:+f.likes||0,lastUpdated:today(),comments:[]}]);setModal(null);}}/></div></Modal>}
              {modal?.type==="addYtCh"&&<Modal title="📺 채널 등록" onClose={()=>setModal(null)}><div>
                <FF label="채널 URL 또는 이름"><Inp value={modal?._chUrl||""} onChange={v=>setModal({...modal,_chUrl:v})} placeholder="https://youtube.com/@채널명 또는 채널 검색어"/></FF>
                <div style={{color:"#64748b",fontSize:11,marginBottom:8}}>예: https://youtube.com/@channelname, 채널명 직접 검색도 가능</div>
                <Btn onClick={async()=>{await ytAddChannel(modal?._chUrl||"");setModal(null);}} disabled={ytLoading==="addCh"} style={{width:"100%"}}>{ytLoading==="addCh"?"⏳ 채널 검색 중...":"채널 등록 + 영상 자동 수집"}</Btn>
              </div></Modal>}
              {modal?.type==="comments"&&<CommentsPanel comments={modal.comments} title={modal.title} onClose={()=>setModal(null)}/>}
            </SectionWithCost>
          )}

          {/* SHORTFORM */}
          {tab==="shortform"&&(
            <SectionWithCost title="숏폼" cost={data.shortformCost} onCostChange={v=>upd("shortformCost",v)} color={CHANNEL_COLORS.shortform} right={<Btn onClick={()=>setModal({type:"addSf",_sfUrl:""})}>+ 추가</Btn>}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr><Th c="플랫폼"/><Th c="제목"/><Th c="조회수"/><Th c="댓글"/><Th c="좋아요"/><Th c="갱신"/><Th c="URL"/><Th c=""/></tr></thead>
                <tbody>{data.shortform.map((s,ri)=>(
                  <tr key={s.id} style={{borderBottom:"1px solid #1e293b",background:ri%2===0?"#0f172a":"#111827"}}>
                    <Td><span style={{background:"#334155",borderRadius:6,padding:"2px 7px",fontSize:12}}>{s.platform}</span></Td>
                    <Td><LinkCell url={s.url}><span style={{fontWeight:700}}>{s.title}</span></LinkCell></Td>
                    <Td><span style={{color:"#06b6d4"}}>{fmt(s.views)}</span></Td>
                    <Td><button onClick={()=>setModal({type:"comments",comments:s.comments,title:s.title})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 9px",cursor:"pointer",fontSize:12}}>💬 {s.comments?.length||0}</button></Td>
                    <Td>{s.likes}</Td>
                    <Td><span style={{color:"#475569",fontSize:12}}>{s.lastUpdated}</span></Td>
                    <Td><div style={{display:"flex",gap:6}}><input value={s.url||""} onChange={e=>upd("shortform",data.shortform.map(r=>r.id===s.id?{...r,url:e.target.value}:r))} placeholder="URL" style={{background:"#0f172a",border:"1px solid #334155",borderRadius:6,padding:"5px 9px",color:"#94a3b8",fontSize:12,width:140}}/><button onClick={()=>{if(extractYtId(s.url))ytRefresh(s,"shortform");else simRefresh("shortform",s);}} disabled={ytLoading===s.id} style={{background:ytLoading===s.id?"#1e293b":"#334155",border:"none",color:"#06b6d4",borderRadius:6,padding:"5px 9px",cursor:"pointer",fontSize:12}}>{ytLoading===s.id?"⏳":"↻"}</button></div></Td>
                    <Td><div style={{display:"flex",gap:4}}><button onClick={()=>setModal({type:"editSf",item:s})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>편집</button><DelBtn onClick={()=>del("shortform",s.id)}/></div></Td>
                  </tr>
                ))}</tbody>
              </table>
              {modal?.type==="editSf"&&<Modal title="숏폼 편집" onClose={()=>setModal(null)}><SimpleForm fields={["platform:플랫폼|인스타그램 / 틱톡 / 유튜브쇼츠","title:제목","url:URL","views:조회수","likes:좋아요수"]} initial={modal.item} onSave={f=>{upd("shortform",data.shortform.map(x=>x.id===modal.item.id?{...x,...f,views:+f.views||0,likes:+f.likes||0}:x));setModal(null);}}/></Modal>}
              {modal?.type==="addSf"&&<Modal title="숏폼 추가" onClose={()=>setModal(null)}><div>
                <FF label="YouTube Shorts URL (자동)"><Inp value={modal?._sfUrl||""} onChange={v=>setModal({...modal,_sfUrl:v})} placeholder="https://youtube.com/shorts/..."/></FF>
                <Btn onClick={async()=>{const ok=await ytAddByUrl(modal?._sfUrl||"","shortform","유튜브쇼츠");if(ok)setModal(null);}} disabled={ytLoading==="adding"} style={{width:"100%",marginTop:4}}>{ytLoading==="adding"?"⏳ 데이터 가져오는 중...":"URL로 자동 추가"}</Btn>
                <div style={{textAlign:"center",color:"#475569",fontSize:12,margin:"10px 0"}}>또는 직접 입력 (인스타/틱톡)</div>
                <SimpleForm fields={["platform:플랫폼|인스타그램 / 틱톡 / 유튜브쇼츠","title:제목","url:URL","views:조회수","likes:좋아요수"]} onSave={f=>{upd("shortform",[...data.shortform,{...f,id:Date.now(),views:+f.views||0,likes:+f.likes||0,lastUpdated:today(),comments:[]}]);setModal(null);}}/></div></Modal>}
              {modal?.type==="comments"&&<CommentsPanel comments={modal.comments} title={modal.title} onClose={()=>setModal(null)}/>}
            </SectionWithCost>
          )}

          {/* AUTOCOMPLETE */}
          {tab==="autocomplete"&&(
            <SectionWithCost title="키워드 자동완성" cost={data.autocompleteCost} onCostChange={v=>upd("autocompleteCost",v)} color={CHANNEL_COLORS.autocomplete} right={<Btn onClick={()=>setModal("ac")}>+ 추가</Btn>}>
              {data.autocomplete.map(a=>(
                <div key={a.id} style={{background:"#0f172a",borderRadius:14,padding:"16px 18px",marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{fontWeight:800,fontSize:15,color:"#6366f1"}}>🔍 {a.keyword}</div>
                    <div style={{display:"flex",gap:6}}><Btn onClick={()=>setModal({type:"editAC",item:a})} color="#334155" style={{color:"#94a3b8",fontSize:12,padding:"5px 10px"}}>편집</Btn><DelBtn onClick={()=>del("autocomplete",a.id)}/></div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                    <div><div style={{color:"#94a3b8",fontSize:12,marginBottom:6,fontWeight:600}}>네이버</div>{a.naver.map((n,i)=><div key={i} style={{background:"#1e293b",borderRadius:6,padding:"6px 10px",marginBottom:4,fontSize:13}}><span style={{color:"#475569",fontSize:11,marginRight:6}}>{i+1}</span>{n}</div>)}</div>
                    <div><div style={{color:"#94a3b8",fontSize:12,marginBottom:6,fontWeight:600}}>인스타</div>{a.instagram.map((n,i)=><div key={i} style={{background:"#1e293b",borderRadius:6,padding:"6px 10px",marginBottom:4,fontSize:13,color:"#ec4899"}}><span style={{color:"#475569",fontSize:11,marginRight:6}}>{i+1}</span>#{n}</div>)}</div>
                  </div>
                </div>
              ))}
              {modal==="ac"&&<Modal title="키워드 추가" onClose={()=>setModal(null)}><ACForm onSave={f=>{upd("autocomplete",[...data.autocomplete,{...f,id:Date.now()}]);setModal(null);}}/></Modal>}
              {modal?.type==="editAC"&&<Modal title="편집" onClose={()=>setModal(null)}><ACForm initial={modal.item} onSave={f=>{upd("autocomplete",data.autocomplete.map(a=>a.id===modal.item.id?{...a,...f}:a));setModal(null);}}/></Modal>}
            </SectionWithCost>
          )}

          {/* HOMEPAGE SEO */}
          {tab==="seo"&&(
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
          )}

          {/* CALENDAR & TODOS */}
          {tab==="calendar"&&(
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
          )}

          {/* COMMUNITY */}
          {tab==="community"&&(
            <div>
              <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
                {COMM_PLATFORMS.map(p=>(
                  <button key={p} onClick={()=>setCommTab(p)} style={{background:commTab===p?"#6366f1":"#1e293b",color:commTab===p?"#fff":"#94a3b8",border:"none",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontWeight:commTab===p?700:400,fontSize:13}}>
                    {p} <span style={{opacity:0.7,fontSize:11}}>({(data.community[p]?.items||[]).length})</span>
                  </button>
                ))}
                <Btn onClick={()=>setModal({type:"addComm",platform:commTab})} style={{marginLeft:"auto"}}>+ 추가</Btn>
              </div>
              <div style={{marginBottom:14}}>
                <CostBox label={`${commTab} 월 집행비`} value={data.community[commTab]?.cost||0} onChange={v=>updComm(commTab,"cost",v)} color={CHANNEL_COLORS[`community_${commTab}`]||"#f59e0b"}/>
              </div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr><Th c="제목"/><Th c="조회수"/><Th c="갱신"/><Th c="URL"/><Th c=""/></tr></thead>
                <tbody>
                  {(data.community[commTab]?.items||[]).map(c=>(
                    <tr key={c.id} style={{borderBottom:"1px solid #1e293b"}}>
                      <Td><LinkCell url={c.url}><span style={{fontWeight:700}}>{c.title}</span></LinkCell></Td>
                      <Td><span style={{color:"#06b6d4"}}>{fmt(c.views)}</span></Td>
                      <Td><span style={{color:"#475569",fontSize:12}}>{c.lastUpdated}</span></Td>
                      <Td><div style={{display:"flex",gap:6}}>
                        <input value={c.url||""} onChange={e=>updComm(commTab,"items",data.community[commTab].items.map(r=>r.id===c.id?{...r,url:e.target.value}:r))} placeholder="URL" style={{background:"#0f172a",border:"1px solid #334155",borderRadius:6,padding:"5px 9px",color:"#94a3b8",fontSize:12,width:140}}/>
                        <button onClick={()=>simRefreshComm(commTab,c)} style={{background:"#334155",border:"none",color:"#06b6d4",borderRadius:6,padding:"5px 9px",cursor:"pointer",fontSize:12}}>↻</button>
                      </div></Td>
                      <Td><div style={{display:"flex",gap:4}}><button onClick={()=>setModal({type:"editComm",platform:commTab,item:c})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>편집</button><DelBtn onClick={()=>updComm(commTab,"items",data.community[commTab].items.filter(r=>r.id!==c.id))}/></div></Td>
                    </tr>
                  ))}
                  {!(data.community[commTab]?.items||[]).length&&<tr><td colSpan={5} style={{padding:20,textAlign:"center",color:"#475569"}}>등록된 게시물이 없습니다.</td></tr>}
                </tbody>
              </table>
              {modal?.type==="editComm"&&<Modal title={`${modal.platform} 편집`} onClose={()=>setModal(null)}><SimpleForm fields={["title:제목","url:URL","views:조회수"]} initial={modal.item} onSave={f=>{updComm(modal.platform,"items",data.community[modal.platform].items.map(r=>r.id===modal.item.id?{...r,...f,views:+f.views||0}:r));setModal(null);}}/></Modal>}
              {modal?.type==="addComm"&&<Modal title={`${modal.platform} 추가`} onClose={()=>setModal(null)}><SimpleForm fields={["title:제목","url:URL","views:조회수"]} onSave={f=>{updComm(modal.platform,"items",[...(data.community[modal.platform]?.items||[]),{...f,id:Date.now(),views:+f.views||0,lastUpdated:today()}]);setModal(null);}}/></Modal>}
            </div>
          )}

          {/* INHOUSE */}
          {tab==="inhouse"&&(
            <div>
              <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
                {[{id:"messages",label:"정기 메시지"},{id:"reviews",label:"리뷰 관리"},{id:"photos",label:"전후 사진"},{id:"videos",label:"원내 영상"}].map(t=>(
                  <button key={t.id} onClick={()=>setInhouseTab(t.id)} style={{background:inhouseTab===t.id?"#6366f1":"#1e293b",color:inhouseTab===t.id?"#fff":"#94a3b8",border:"none",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontWeight:inhouseTab===t.id?700:400,fontSize:13}}>{t.label}</button>
                ))}
              </div>
              {inhouseTab==="messages"&&(
                <SectionWithCost title="정기 메시지" costLabel="메시지 월 집행비" cost={data.inhouse.messagesCost} onCostChange={v=>updN("inhouse","messagesCost",v)} color={CHANNEL_COLORS.inhouse_messages} right={<Btn onClick={()=>setModal("addMsg")}>+ 추가</Btn>}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead><tr><Th c="제목"/><Th c="플랫폼"/><Th c="발송일"/><Th c="발송수"/><Th c="오픈율"/><Th c="상태"/><Th c=""/></tr></thead>
                    <tbody>{data.inhouse.messages.map((m,ri)=>(
                      <tr key={m.id} style={{borderBottom:"1px solid #1e293b",background:ri%2===0?"#0f172a":"#111827"}}>
                        <Td><span style={{fontWeight:700}}>{m.title}</span></Td>
                        <Td><span style={{background:"#334155",borderRadius:6,padding:"2px 7px",fontSize:12}}>{m.platform}</span></Td>
                        <Td>{m.sentDate}</Td>
                        <Td><span style={{color:"#06b6d4"}}>{fmt(m.recipients)}명</span></Td>
                        <Td><span style={{color:"#10b981",fontWeight:700}}>{m.openRate}</span></Td>
                        <Td><span style={{background:m.status==="완료"?"#10b981":"#f59e0b",color:"#fff",borderRadius:99,padding:"2px 9px",fontSize:12,fontWeight:700}}>{m.status}</span></Td>
                        <Td><div style={{display:"flex",gap:4}}><button onClick={()=>setModal({type:"editMsg",item:m})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>편집</button><DelBtn onClick={()=>updN("inhouse","messages",data.inhouse.messages.filter(x=>x.id!==m.id))}/></div></Td>
                      </tr>
                    ))}</tbody>
                  </table>
                  {modal?.type==="editMsg"&&<Modal title="메시지 편집" onClose={()=>setModal(null)}><SimpleForm fields={["title:제목","platform:플랫폼|카카오 / 문자 / 이메일","sentDate:발송일","recipients:발송수","openRate:오픈율|예: 35%","status:상태|예정 / 진행중 / 완료"]} initial={modal.item} onSave={f=>{updN("inhouse","messages",data.inhouse.messages.map(x=>x.id===modal.item.id?{...x,...f,recipients:+f.recipients||0}:x));setModal(null);}}/></Modal>}
                  {modal==="addMsg"&&<Modal title="메시지 추가" onClose={()=>setModal(null)}><SimpleForm fields={["title:제목","platform:플랫폼|카카오 / 문자 / 이메일","sentDate:발송일","recipients:발송수","openRate:오픈율|예: 35%","status:상태|예정 / 진행중 / 완료"]} onSave={f=>{updN("inhouse","messages",[...data.inhouse.messages,{...f,id:Date.now(),recipients:+f.recipients||0}]);setModal(null);}}/></Modal>}
                </SectionWithCost>
              )}
              {inhouseTab==="reviews"&&(
                <SectionWithCost title="리뷰 관리" costLabel="리뷰 월 집행비" cost={data.inhouse.reviewsCost} onCostChange={v=>updN("inhouse","reviewsCost",v)} color={CHANNEL_COLORS.inhouse_reviews} right={<Btn onClick={()=>setModal("addReview")}>+ 추가</Btn>}>
                  {data.inhouse.reviews.map(r=>(
                    <div key={r.id} style={{background:"#0f172a",borderRadius:12,padding:"14px 16px",marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                        <span style={{fontWeight:700,fontSize:14}}>{r.platform}</span>
                        <div style={{display:"flex",gap:8,alignItems:"center"}}>
                          <span style={{color:"#94a3b8",fontSize:12}}>{r.lastUpdated}</span>
                          <button onClick={()=>{const d=Math.floor(Math.random()*5+1);updN("inhouse","reviews",data.inhouse.reviews.map(rv=>rv.id===r.id?{...rv,count:rv.count+d,lastUpdated:today()}:rv));}} style={{background:"#334155",border:"none",color:"#06b6d4",borderRadius:6,padding:"4px 9px",cursor:"pointer",fontSize:12}}>↻</button>
                          <button onClick={()=>setModal({type:"editReview",item:r})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 9px",cursor:"pointer",fontSize:12}}>편집</button><DelBtn onClick={()=>updN("inhouse","reviews",data.inhouse.reviews.filter(x=>x.id!==r.id))}/>
                        </div>
                      </div>
                      <ProgressBar value={r.count} max={r.target} color={r.count>=r.target?"#10b981":"#6366f1"}/>
                    </div>
                  ))}
                  {modal?.type==="editReview"&&<Modal title="리뷰 편집" onClose={()=>setModal(null)}><SimpleForm fields={["platform:플랫폼","count:현재 리뷰수","target:목표 리뷰수"]} initial={modal.item} onSave={f=>{updN("inhouse","reviews",data.inhouse.reviews.map(x=>x.id===modal.item.id?{...x,...f,count:+f.count||0,target:+f.target||100}:x));setModal(null);}}/></Modal>}
                  {modal==="addReview"&&<Modal title="리뷰 플랫폼 추가" onClose={()=>setModal(null)}><SimpleForm fields={["platform:플랫폼","count:현재 리뷰수","target:목표 리뷰수"]} onSave={f=>{updN("inhouse","reviews",[...data.inhouse.reviews,{...f,id:Date.now(),count:+f.count||0,target:+f.target||100,lastUpdated:today()}]);setModal(null);}}/></Modal>}
                </SectionWithCost>
              )}
              {inhouseTab==="photos"&&(
                <SectionWithCost title="전후 사진" costLabel="사진 월 집행비" cost={data.inhouse.photosCost} onCostChange={v=>updN("inhouse","photosCost",v)} color={CHANNEL_COLORS.inhouse_photos} right={<Btn onClick={()=>setModal("addPhoto")}>+ 세트</Btn>}>
                  {data.inhouse.photos.map(p=>(
                    <div key={p.id} style={{background:"#0f172a",borderRadius:14,padding:"16px 18px",marginBottom:14}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <button onClick={()=>setModal({type:"photoViewer",photo:p,startIdx:0})} style={{background:"none",border:"none",color:"#6366f1",fontWeight:800,fontSize:15,cursor:"pointer",textDecoration:"underline",padding:0}}>{p.title}</button>
                          <span style={{background:"#334155",borderRadius:6,padding:"2px 7px",fontSize:12}}>{p.category}</span>
                          <span style={{color:"#64748b",fontSize:12}}>{(p.images||[]).length}장</span>
                        </div>
                        <div style={{display:"flex",gap:8,alignItems:"center"}}>
                          <label style={{background:"#10b981",color:"#fff",borderRadius:8,padding:"6px 12px",fontSize:12,cursor:"pointer",fontWeight:600}}>📷 추가<input type="file" multiple accept="image/*" style={{display:"none"}} onChange={e=>handleImgUpload(p.id,e.target.files)}/></label>
                          <button onClick={()=>setModal({type:"editPhoto",item:p})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 9px",cursor:"pointer",fontSize:12}}>편집</button><DelBtn onClick={()=>updN("inhouse","photos",data.inhouse.photos.filter(x=>x.id!==p.id))}/>
                        </div>
                      </div>
                      {(p.images||[]).length>0&&(
                        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                          {p.images.map((img,ii)=>(
                            <div key={ii} onClick={()=>setModal({type:"photoViewer",photo:p,startIdx:ii})} style={{width:72,height:72,borderRadius:8,overflow:"hidden",cursor:"pointer",background:"#1e293b",border:"1px solid #334155",flexShrink:0}}>
                              <img src={img.dataUrl} alt={img.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {modal?.type==="editPhoto"&&<Modal title="전후사진 편집" onClose={()=>setModal(null)}><SimpleForm fields={["title:세트 제목","category:시술 카테고리"]} initial={modal.item} onSave={f=>{updN("inhouse","photos",data.inhouse.photos.map(x=>x.id===modal.item.id?{...x,...f}:x));setModal(null);}}/></Modal>}
                  {modal==="addPhoto"&&<Modal title="전후사진 세트 추가" onClose={()=>setModal(null)}><SimpleForm fields={["title:세트 제목","category:시술 카테고리"]} onSave={f=>{updN("inhouse","photos",[...data.inhouse.photos,{...f,id:Date.now(),lastUpdated:today(),images:[]}]);setModal(null);}}/></Modal>}
                  {modal?.type==="photoViewer"&&<PhotoViewer photo={modal.photo} startIdx={modal.startIdx||0} onClose={()=>setModal(null)} onDelete={(photoId,imgId)=>{updN("inhouse","photos",data.inhouse.photos.map(p=>p.id===photoId?{...p,images:p.images.filter(i=>i.id!==imgId)}:p));setModal(null);}}/>}
                </SectionWithCost>
              )}
              {inhouseTab==="videos"&&(
                <SectionWithCost title="원내 영상" costLabel="영상 월 집행비" cost={data.inhouse.videosCost} onCostChange={v=>updN("inhouse","videosCost",v)} color={CHANNEL_COLORS.inhouse_videos} right={<Btn onClick={()=>setModal("addVid")}>+ 추가</Btn>}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead><tr><Th c="제목"/><Th c="위치"/><Th c="러닝타임"/><Th c="갱신"/><Th c="URL"/><Th c=""/></tr></thead>
                    <tbody>{data.inhouse.videos.map((v,ri)=>(
                      <tr key={v.id} style={{borderBottom:"1px solid #1e293b",background:ri%2===0?"#0f172a":"#111827"}}>
                        <Td><span style={{fontWeight:700}}>{v.title}</span></Td>
                        <Td><span style={{background:"#334155",borderRadius:6,padding:"2px 7px",fontSize:12}}>{v.location}</span></Td>
                        <Td>{v.duration}</Td>
                        <Td><span style={{color:"#475569",fontSize:12}}>{v.lastUpdated}</span></Td>
                        <Td><input value={v.url||""} onChange={e=>updN("inhouse","videos",data.inhouse.videos.map(vi=>vi.id===v.id?{...vi,url:e.target.value}:vi))} placeholder="링크" style={{background:"#0f172a",border:"1px solid #334155",borderRadius:6,padding:"5px 9px",color:"#94a3b8",fontSize:12,width:160}}/></Td>
                        <Td><div style={{display:"flex",gap:4}}><button onClick={()=>setModal({type:"editVid",item:v})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>편집</button><DelBtn onClick={()=>updN("inhouse","videos",data.inhouse.videos.filter(x=>x.id!==v.id))}/></div></Td>
                      </tr>
                    ))}</tbody>
                  </table>
                  {modal?.type==="editVid"&&<Modal title="영상 편집" onClose={()=>setModal(null)}><SimpleForm fields={["title:제목","location:상영 위치","duration:러닝타임","url:링크"]} initial={modal.item} onSave={f=>{updN("inhouse","videos",data.inhouse.videos.map(x=>x.id===modal.item.id?{...x,...f}:x));setModal(null);}}/></Modal>}
                  {modal==="addVid"&&<Modal title="영상 추가" onClose={()=>setModal(null)}><SimpleForm fields={["title:제목","location:상영 위치","duration:러닝타임","url:링크"]} onSave={f=>{updN("inhouse","videos",[...data.inhouse.videos,{...f,id:Date.now(),lastUpdated:today()}]);setModal(null);}}/></Modal>}
                </SectionWithCost>
              )}
            </div>
          )}

          {/* OFFLINE */}
          {tab==="offline"&&(
            <div>
              <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
                {[{id:"elevator",label:"엘리베이터"},{id:"subway",label:"역사 광고"},{id:"other",label:"기타 거점"}].map(t=>(
                  <button key={t.id} onClick={()=>setOfflineTab(t.id)} style={{background:offlineTab===t.id?"#6366f1":"#1e293b",color:offlineTab===t.id?"#fff":"#94a3b8",border:"none",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontWeight:offlineTab===t.id?700:400,fontSize:13}}>{t.label}</button>
                ))}
              </div>
              <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
                {[
                  {label:"집행중",value:[...data.offline.elevator,...data.offline.subway,...data.offline.other].filter(a=>a.status==="집행중").length+"건",color:"#10b981"},
                  {label:"총 비용",value:fmtW([...data.offline.elevator,...data.offline.subway,...data.offline.other].filter(a=>a.status==="집행중").reduce((a,b)=>a+(+b.cost||0),0))+"/월",color:"#f59e0b"},
                ].map((s,i)=>(
                  <div key={i} style={{background:"#1e293b",borderRadius:10,padding:"12px 16px",flex:"1 1 120px"}}>
                    <div style={{color:"#94a3b8",fontSize:12,marginBottom:4}}>{s.label}</div>
                    <div style={{color:s.color,fontSize:20,fontWeight:800}}>{s.value}</div>
                  </div>
                ))}
              </div>
              {offlineTab==="elevator"&&(
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{fontWeight:700,fontSize:15}}>엘리베이터 광고</div><Btn onClick={()=>setModal("addElev")}>+ 추가</Btn>
                  </div>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead><tr><Th c="단지명"/><Th c="세대"/><Th c="시작"/><Th c="종료"/><Th c="비용"/><Th c="상태"/><Th c=""/></tr></thead>
                    <tbody>{data.offline.elevator.map((e,ri)=>(
                      <tr key={e.id} style={{borderBottom:"1px solid #1e293b",background:ri%2===0?"#0f172a":"#111827"}}>
                        <Td><span style={{fontWeight:700}}>{e.complex}</span></Td>
                        <Td>{fmt(e.units)}세대</Td>
                        <Td><span style={{color:"#94a3b8",fontSize:12}}>{e.startDate}</span></Td>
                        <Td><span style={{color:"#94a3b8",fontSize:12}}>{e.endDate}</span></Td>
                        <Td><span style={{color:"#f59e0b",fontWeight:700}}>{fmtW(e.cost)}</span></Td>
                        <Td><span style={{background:e.status==="집행중"?"#10b981":"#475569",color:"#fff",borderRadius:99,padding:"2px 9px",fontSize:12,fontWeight:700}}>{e.status}</span></Td>
                        <Td><div style={{display:"flex",gap:4}}><button onClick={()=>setModal({type:"editElev",item:e})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>편집</button><DelBtn onClick={()=>updN("offline","elevator",data.offline.elevator.filter(x=>x.id!==e.id))}/></div></Td>
                      </tr>
                    ))}</tbody>
                  </table>
                  {modal?.type==="editElev"&&<Modal title="엘리베이터 편집" onClose={()=>setModal(null)}><OfflineForm fields={["complex:단지명","units:세대수","startDate:시작일","endDate:종료일","status:상태|집행중 / 예정 / 종료"]} initial={modal.item} onSave={f=>{updN("offline","elevator",data.offline.elevator.map(x=>x.id===modal.item.id?{...x,...f,units:+f.units||0,cost:+f.cost||0,totalCost:+f.totalCost||0}:x));setModal(null);}}/></Modal>}
                  {modal==="addElev"&&<Modal title="엘리베이터 추가" onClose={()=>setModal(null)}><OfflineForm fields={["complex:단지명","units:세대수","startDate:시작일","endDate:종료일","status:상태|집행중 / 예정 / 종료"]} onSave={f=>{updN("offline","elevator",[...data.offline.elevator,{...f,id:Date.now(),units:+f.units||0,cost:+f.cost||0,totalCost:+f.totalCost||0}]);setModal(null);}}/></Modal>}
                </div>
              )}
              {offlineTab==="subway"&&(
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{fontWeight:700,fontSize:15}}>역사 광고</div><Btn onClick={()=>setModal("addSub")}>+ 추가</Btn>
                  </div>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead><tr><Th c="역명"/><Th c="위치"/><Th c="시작"/><Th c="종료"/><Th c="비용"/><Th c="상태"/><Th c=""/></tr></thead>
                    <tbody>{data.offline.subway.map((s,ri)=>(
                      <tr key={s.id} style={{borderBottom:"1px solid #1e293b",background:ri%2===0?"#0f172a":"#111827"}}>
                        <Td><span style={{fontWeight:700}}>{s.station}</span></Td><Td>{s.location}</Td>
                        <Td><span style={{color:"#94a3b8",fontSize:12}}>{s.startDate}</span></Td>
                        <Td><span style={{color:"#94a3b8",fontSize:12}}>{s.endDate}</span></Td>
                        <Td><span style={{color:"#f59e0b",fontWeight:700}}>{fmtW(s.cost)}</span></Td>
                        <Td><span style={{background:s.status==="집행중"?"#10b981":"#475569",color:"#fff",borderRadius:99,padding:"2px 9px",fontSize:12,fontWeight:700}}>{s.status}</span></Td>
                        <Td><div style={{display:"flex",gap:4}}><button onClick={()=>setModal({type:"editSub",item:s})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>편집</button><DelBtn onClick={()=>updN("offline","subway",data.offline.subway.filter(x=>x.id!==s.id))}/></div></Td>
                      </tr>
                    ))}</tbody>
                  </table>
                  {modal?.type==="editSub"&&<Modal title="역사 광고 편집" onClose={()=>setModal(null)}><OfflineForm fields={["station:역명","location:위치","startDate:시작일","endDate:종료일","status:상태|집행중 / 예정 / 종료"]} initial={modal.item} onSave={f=>{updN("offline","subway",data.offline.subway.map(x=>x.id===modal.item.id?{...x,...f,cost:+f.cost||0,totalCost:+f.totalCost||0}:x));setModal(null);}}/></Modal>}
                  {modal==="addSub"&&<Modal title="역사 광고 추가" onClose={()=>setModal(null)}><OfflineForm fields={["station:역명","location:위치","startDate:시작일","endDate:종료일","status:상태|집행중 / 예정 / 종료"]} onSave={f=>{updN("offline","subway",[...data.offline.subway,{...f,id:Date.now(),cost:+f.cost||0,totalCost:+f.totalCost||0}]);setModal(null);}}/></Modal>}
                </div>
              )}
              {offlineTab==="other"&&(
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{fontWeight:700,fontSize:15}}>기타 거점</div><Btn onClick={()=>setModal("addOth")}>+ 추가</Btn>
                  </div>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead><tr><Th c="유형"/><Th c="위치"/><Th c="시작"/><Th c="종료"/><Th c="비용"/><Th c="상태"/><Th c=""/></tr></thead>
                    <tbody>{data.offline.other.map((o,ri)=>(
                      <tr key={o.id} style={{borderBottom:"1px solid #1e293b",background:ri%2===0?"#0f172a":"#111827"}}>
                        <Td><span style={{background:"#334155",borderRadius:6,padding:"2px 7px",fontSize:12}}>{o.type}</span></Td>
                        <Td><span style={{fontWeight:700}}>{o.location}</span></Td>
                        <Td><span style={{color:"#94a3b8",fontSize:12}}>{o.startDate}</span></Td>
                        <Td><span style={{color:"#94a3b8",fontSize:12}}>{o.endDate}</span></Td>
                        <Td><span style={{color:"#f59e0b",fontWeight:700}}>{fmtW(o.cost)}</span></Td>
                        <Td><span style={{background:o.status==="집행중"?"#10b981":"#475569",color:"#fff",borderRadius:99,padding:"2px 9px",fontSize:12,fontWeight:700}}>{o.status}</span></Td>
                        <Td><div style={{display:"flex",gap:4}}><button onClick={()=>setModal({type:"editOth",item:o})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>편집</button><DelBtn onClick={()=>updN("offline","other",data.offline.other.filter(x=>x.id!==o.id))}/></div></Td>
                      </tr>
                    ))}</tbody>
                  </table>
                  {modal?.type==="editOth"&&<Modal title="기타 편집" onClose={()=>setModal(null)}><OfflineForm fields={["type:유형|버스정류장 / 현수막 등","location:위치","startDate:시작일","endDate:종료일","status:상태|집행중 / 예정 / 종료"]} initial={modal.item} onSave={f=>{updN("offline","other",data.offline.other.map(x=>x.id===modal.item.id?{...x,...f,cost:+f.cost||0,totalCost:+f.totalCost||0}:x));setModal(null);}}/></Modal>}
                  {modal==="addOth"&&<Modal title="기타 추가" onClose={()=>setModal(null)}><OfflineForm fields={["type:유형|버스정류장 / 현수막 등","location:위치","startDate:시작일","endDate:종료일","status:상태|집행중 / 예정 / 종료"]} onSave={f=>{updN("offline","other",[...data.offline.other,{...f,id:Date.now(),cost:+f.cost||0,totalCost:+f.totalCost||0}]);setModal(null);}}/></Modal>}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ===== MAIN APP =====
export default function App(){
  const[user,setUser]=useState(null);
  const[system,setSystem]=useState(null);
  const[activeBranchId,setActiveBranchId]=useState(null);
  const[branchData,setBranchData]=useState(null);
  const[branchSummaries,setBranchSummaries]=useState({});
  const[loaded,setLoaded]=useState(false);
  const[saving,setSaving]=useState(false);

  // Load system
  useEffect(()=>{
    loadSys().then(s=>{
      if(s){setSystem(s);}
      else{setSystem(DEFAULT_SYSTEM);saveSys(DEFAULT_SYSTEM);saveBranch(1,DEFAULT_BRANCH_DATA);}
      setLoaded(true);
    });
  },[]);

  // Load branch data when activeBranchId changes
  useEffect(()=>{
    if(!activeBranchId)return;
    loadBranch(activeBranchId).then(d=>{
      setBranchData(d||{...DEFAULT_BRANCH_DATA});
    });
  },[activeBranchId]);

  // Save branch data on change
  useEffect(()=>{
    if(!activeBranchId||!branchData)return;
    setSaving(true);
    const t=setTimeout(()=>{saveBranch(activeBranchId,branchData).then(()=>setSaving(false));},900);
    return()=>clearTimeout(t);
  },[branchData,activeBranchId]);

  // Load summaries for admin dashboard
  useEffect(()=>{
    if(!system||!user||user.role!=="admin")return;
    const loadAll=async()=>{
      const sums={};
      for(const b of system.branches){
        const d=await loadBranch(b.id);
        if(d){
          const off=[...(d.offline?.elevator||[]),...(d.offline?.subway||[]),...(d.offline?.other||[])].filter(a=>a.status==="집행중").reduce((a,x)=>a+(+x.cost||0),0);
          const kwC=Object.values(d.keywordCosts||{}).reduce((a,x)=>a+x,0);
          const commC=Object.values(d.community||{}).reduce((a,p)=>a+(p.cost||0),0);
          const inhC=(d.inhouse?.messagesCost||0)+(d.inhouse?.reviewsCost||0)+(d.inhouse?.photosCost||0)+(d.inhouse?.videosCost||0);
          sums[b.id]={
            keywords:d.keywords?.length||0,
            ytViews:d.youtube?.reduce((a,x)=>a+x.views,0)||0,
            cost:kwC+(d.mapsCost||0)+(d.experienceCost||0)+(d.cafesCost||0)+(d.youtubeCost||0)+(d.shortformCost||0)+(d.autocompleteCost||0)+(d.seoCost||0)+commC+inhC+off,
          };
        }
      }
      setBranchSummaries(sums);
    };
    loadAll();
  },[system,user]);

  const logout=()=>{setUser(null);setActiveBranchId(null);setBranchData(null);};

  if(!loaded||!system)return <div style={{minHeight:"100vh",background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center",color:"#6366f1",fontSize:18,fontFamily:"sans-serif"}}>로딩 중...</div>;

  // Not logged in
  if(!user)return <LoginScreen system={system} onLogin={u=>{setUser(u);if(u.role==="manager"||u.role==="client")setActiveBranchId(u.branchId);}}/>;

  // Client → portal only
  if(user.role==="client"){
    if(!branchData)return <div style={{minHeight:"100vh",background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center",color:"#94a3b8",fontFamily:"sans-serif"}}>데이터 로딩 중...</div>;
    return (
      <div style={{minHeight:"100vh",background:"#0f172a",fontFamily:"'Apple SD Gothic Neo',sans-serif",color:"#f1f5f9"}}>
        <div style={{background:"#0a0f1e",borderBottom:"1px solid #1e293b",padding:"10px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontWeight:800,color:"#6366f1"}}>REBERRYOS</span>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{color:"#94a3b8",fontSize:13}}>👤 {user.name}</span>
            <Btn onClick={logout} color="#334155" style={{color:"#94a3b8",padding:"5px 14px"}}>로그아웃</Btn>
          </div>
        </div>
        <div style={{maxWidth:900,margin:"0 auto",padding:24}}>
          <ClientPortal data={branchData} budgetTotal={0} standalone/>
        </div>
      </div>
    );
  }

  // Admin without active branch → dashboard
  if(user.role==="admin"&&!activeBranchId){
    return <AdminDashboard system={system} setSystem={setSystem} onSelectBranch={id=>setActiveBranchId(id)} branchSummaries={branchSummaries} user={user} onLogout={logout}/>;
  }

  // Admin with branch selected OR Manager → BranchApp
  if(!branchData)return <div style={{minHeight:"100vh",background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center",color:"#94a3b8",fontFamily:"sans-serif"}}>데이터 로딩 중...</div>;
  const branch=system.branches.find(b=>b.id===activeBranchId);

  return <BranchApp
    branchId={activeBranchId}
    branchName={branch?.name}
    data={branchData}
    setData={setBranchData}
    user={user}
    onBack={user.role==="admin"?()=>{setActiveBranchId(null);setBranchData(null);}:null}
    onLogout={logout}
  />;
}
