"use client";
import { notify } from "@/src/components/feedback";
import { useState, useRef, useEffect } from "react";
import { extractYtId, fetchYtVideo, fetchYtComments, resolveYtChannelId, fetchYtChannelVideos } from "@/src/lib/youtube";
import { TAB_TYPES, COMM_PLATFORMS, TABS, CHANNEL_COLORS } from "@/src/lib/constants";
import { fmt, fmtW, today } from "@/src/lib/format";
import { exportExcel, loadXlsx } from "@/src/lib/excel";
import { Btn, SaveBadge } from "@/src/components/ui";
import dynamic from "next/dynamic";
// 탭은 처음 열 때 내려받는다 (recharts 등 무거운 의존성은 해당 탭에서만 로드)
const tabLoading=()=><div style={{color:"#64748b",padding:24,fontSize:13}}>불러오는 중…</div>;
const lazyTab=(loader)=>dynamic(loader,{loading:tabLoading,ssr:false});
const OverviewTab=lazyTab(()=>import("@/src/components/branch/tabs/OverviewTab").then(m=>m.OverviewTab));
const PerformanceTab=lazyTab(()=>import("@/src/components/branch/tabs/PerformanceTab").then(m=>m.PerformanceTab));
const PortalTab=lazyTab(()=>import("@/src/components/branch/tabs/PortalTab").then(m=>m.PortalTab));
const BudgetTab=lazyTab(()=>import("@/src/components/branch/tabs/BudgetTab").then(m=>m.BudgetTab));
const KeywordsTab=lazyTab(()=>import("@/src/components/branch/tabs/KeywordsTab").then(m=>m.KeywordsTab));
const MapsTab=lazyTab(()=>import("@/src/components/branch/tabs/MapsTab").then(m=>m.MapsTab));
const ExperienceTab=lazyTab(()=>import("@/src/components/branch/tabs/ExperienceTab").then(m=>m.ExperienceTab));
const CafesTab=lazyTab(()=>import("@/src/components/branch/tabs/CafesTab").then(m=>m.CafesTab));
const YoutubeTab=lazyTab(()=>import("@/src/components/branch/tabs/YoutubeTab").then(m=>m.YoutubeTab));
const ShortformTab=lazyTab(()=>import("@/src/components/branch/tabs/ShortformTab").then(m=>m.ShortformTab));
const AutocompleteTab=lazyTab(()=>import("@/src/components/branch/tabs/AutocompleteTab").then(m=>m.AutocompleteTab));
const SeoTab=lazyTab(()=>import("@/src/components/branch/tabs/SeoTab").then(m=>m.SeoTab));
const CalendarTab=lazyTab(()=>import("@/src/components/branch/tabs/CalendarTab").then(m=>m.CalendarTab));
const CommunityTab=lazyTab(()=>import("@/src/components/branch/tabs/CommunityTab").then(m=>m.CommunityTab));
const InhouseTab=lazyTab(()=>import("@/src/components/branch/tabs/InhouseTab").then(m=>m.InhouseTab));
const OfflineTab=lazyTab(()=>import("@/src/components/branch/tabs/OfflineTab").then(m=>m.OfflineTab));

export function BranchApp({branchId,branchName,data,setData,user,onBack,onLogout,saveStatus}){
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
  const mapFileRef=useRef();

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
    const k=(dataRef.current.keywords||[]).find(x=>x.id===kwId)||{};
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
      _tabDebug:r._tabDebug||null,
      _placeDebug:r.place?._debug||null
    };
    return updates;
  };
  const checkNaverRank=async(kwItem)=>{
    const targets=dataRef.current.rankTargets||{};
    if(!targets.blogName&&!targets.placeName&&!targets.cafeName){notify("먼저 '내 콘텐츠 식별자'를 설정해주세요 (블로그명, 업체명 등)");return;}
    setRankLoading(kwItem.id);
    try{
      const d=await fetchRankData(kwItem.keyword,targets);
      if(d.error){notify("오류: "+d.error);setRankLoading(null);return;}
      const updates=applyRankResult(kwItem.id,d);
      upd("keywords",dataRef.current.keywords.map(k=>k.id===kwItem.id?{...k,...updates}:k));
    }catch(e){notify("네트워크 오류: "+e.message);}
    setRankLoading(null);
  };
  const checkAllRanks=async()=>{
    const targets=dataRef.current.rankTargets||{};
    if(!targets.blogName&&!targets.placeName&&!targets.cafeName){notify("먼저 '내 콘텐츠 식별자'를 설정해주세요");return;}
    const kws=[...dataRef.current.keywords];
    if(!kws.length)return;
    setRankLoading("all");
    const BATCH=3;
    let done=0;
    for(let i=0;i<kws.length;i+=BATCH){
      const batch=kws.slice(i,i+BATCH);
      const results=await Promise.allSettled(batch.map(kw=>fetchRankData(kw.keyword,targets).then(d=>({kw,d})).catch(e=>({kw,d:{error:e.message}}))));
      let cur=dataRef.current.keywords;
      for(const r of results){
        if(r.status==="fulfilled"&&!r.value.d.error){
          const{kw,d}=r.value;
          const updates=applyRankResult(kw.id,d);
          cur=cur.map(k=>k.id===kw.id?{...k,...updates}:k);
        }
        done++;
      }
      upd("keywords",cur);
      setRankLoading(`all:${done}/${kws.length}`);
      if(i+BATCH<kws.length)await new Promise(r=>setTimeout(r,500));
    }
    setRankLoading(null);
  };
  const checkMapRank=async(mapItem)=>{
    const targets=dataRef.current.rankTargets||{};
    if(!targets.placeName){notify("먼저 '내 콘텐츠 식별자'에서 업체명을 설정해주세요");return;}
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
        updates._mapDetail={place:r.place?.titles||[],googleMap:r.googleMap?.titles||[],kakaoMap:r.kakaoMap?.titles||[],_placeDebug:r.place?._debug||null,_kakaoDebug:r.kakaoMap?._debug||null,_googleDebug:r.googleMap?.error||null};
        const rn=parseInt(updates.naverPlace)||99;const rg=parseInt(updates.google)||99;const rk=parseInt(updates.kakao)||99;
        const best=Math.min(rn,rg,rk);updates.status=best<=3?"good":best<=5?"warn":"danger";
        upd("maps",dataRef.current.maps.map(m=>m.id===mapItem.id?{...m,...updates}:m));
      }
    }catch(e){console.error(e);}
    setRankLoading(null);
  };
  const checkAllMapRanks=async()=>{
    const targets=dataRef.current.rankTargets||{};
    if(!targets.placeName){notify("먼저 업체명을 설정해주세요");return;}
    const maps=[...dataRef.current.maps];
    if(!maps.length)return;
    setRankLoading("allMaps");
    const BATCH=3;
    let done=0;
    for(let i=0;i<maps.length;i+=BATCH){
      const batch=maps.slice(i,i+BATCH);
      const results=await Promise.allSettled(batch.map(m=>fetchRankData(m.keyword,targets).then(d=>({m,d})).catch(e=>({m,d:{error:e.message}}))));
      let cur=dataRef.current.maps;
      for(const res of results){
        if(res.status==="fulfilled"&&!res.value.d.error){
          const{m,d}=res.value;
          const r=d.results||{};
          const updates={lastRankCheck:today()};
          if(r.place?.rank)updates.naverPlace=r.place.rank+"위";
          else if(r.place?.titles?.length)updates.naverPlace="미노출";
          if(r.googleMap?.rank)updates.google=r.googleMap.rank+"위";
          else if(r.googleMap?.titles?.length)updates.google="미노출";
          if(r.kakaoMap?.rank)updates.kakao=r.kakaoMap.rank+"위";
          else if(r.kakaoMap?.titles?.length)updates.kakao="미노출";
          updates._mapDetail={place:r.place?.titles||[],googleMap:r.googleMap?.titles||[],kakaoMap:r.kakaoMap?.titles||[],_placeDebug:r.place?._debug||null,_kakaoDebug:r.kakaoMap?._debug||null,_googleDebug:r.googleMap?.error||null};
          const rn=parseInt(updates.naverPlace)||99;const rg=parseInt(updates.google)||99;const rk=parseInt(updates.kakao)||99;
          const best=Math.min(rn,rg,rk);updates.status=best<=3?"good":best<=5?"warn":"danger";
          cur=cur.map(x=>x.id===m.id?{...x,...updates}:x);
        }
        done++;
      }
      upd("maps",cur);
      setRankLoading(`allMaps:${done}/${maps.length}`);
      if(i+BATCH<maps.length)await new Promise(r=>setTimeout(r,500));
    }
    setRankLoading(null);
  };
  const fetchReviews=async(keyword,platform="naver")=>{
    const targets=dataRef.current.rankTargets||{};
    if(!targets.placeName){notify("업체명을 먼저 설정해주세요");return;}
    setRankLoading("reviews_"+platform);
    try{
      const res=await fetch("/api/naver-rank",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({keyword,targets,action:"reviews",platform})});
      const d=await res.json();
      if(d.results?.reviews){setModal({type:"reviews",data:d.results.reviews,keyword,platform});}
      else{notify((platform==="naver"?"플레이스":platform==="google"?"구글맵":"카카오맵")+" 리뷰를 가져올 수 없습니다.");}
    }catch(e){notify("오류: "+e.message);}
    setRankLoading(null);
  };
  const runApiDiag=async()=>{
    setRankLoading("diag");
    try{
      const res=await fetch("/api/naver-rank/test");
      const d=await res.json();
      setModal({type:"apiDiag",data:d});
    }catch(e){notify("진단 실패: "+e.message);}
    setRankLoading(null);
  };
  const[ytChTab,setYtChTab]=useState("all");
  const ytRefresh=async(item,key="youtube")=>{
    const vid=extractYtId(item.url);if(!vid){notify("유효한 YouTube URL이 아닙니다.");return;}
    setYtLoading(item.id);
    try{
      const[vd,cm]=await Promise.all([fetchYtVideo(vid),fetchYtComments(vid)]);
      if(!vd){notify("영상 정보를 가져올 수 없습니다.");setYtLoading(null);return;}
      const updated={...item,title:vd.title||item.title,views:vd.views,likes:vd.likes,commentCount:vd.commentCount,comments:cm,channelTitle:vd.channelTitle,channelId:vd.channelId,thumbnail:vd.thumbnail,lastUpdated:today()};
      upd(key,data[key].map(r=>r.id===item.id?{...r,...updated}:r));
    }catch(e){notify("API 오류: "+e.message);}
    setYtLoading(null);
  };
  const ytAddByUrl=async(url,key="youtube",platform="")=>{
    const vid=extractYtId(url);if(!vid){notify("유효한 YouTube URL이 아닙니다.");return false;}
    setYtLoading("adding");
    try{
      const[vd,cm]=await Promise.all([fetchYtVideo(vid),fetchYtComments(vid)]);
      if(!vd){notify("영상 정보를 가져올 수 없습니다.");setYtLoading(null);return false;}
      const entry={id:Date.now(),url,title:vd.title,views:vd.views,likes:vd.likes,commentCount:vd.commentCount,comments:cm,channelTitle:vd.channelTitle,channelId:vd.channelId,thumbnail:vd.thumbnail,lastUpdated:today()};
      if(platform)entry.platform=platform;
      upd(key,[...data[key],entry]);
    }catch(e){notify("API 오류: "+e.message);}
    setYtLoading(null);return true;
  };
  const ytAddChannel=async(input)=>{
    setYtLoading("addCh");
    try{
      const cid=await resolveYtChannelId(input);
      if(!cid){notify("채널을 찾을 수 없습니다.");setYtLoading(null);return;}
      if((data.ytChannels||[]).some(c=>c.id===cid)){notify("이미 등록된 채널입니다.");setYtLoading(null);return;}
      const result=await fetchYtChannelVideos(cid);
      if(!result){notify("채널 정보를 가져올 수 없습니다.");setYtLoading(null);return;}
      const ch={...result.channel,id:cid,addedAt:today()};
      upd("ytChannels",[...(data.ytChannels||[]),ch]);
      const newVids=result.videos.filter(v=>!data.youtube.some(y=>y.url===v.url)).map(v=>({...v,id:Date.now()+Math.random(),channelId:cid,channelTitle:result.channel.name,lastUpdated:today(),comments:[]}));
      if(newVids.length)upd("youtube",[...data.youtube,...newVids]);
      notify(`${result.channel.name} 등록 완료! ${newVids.length}개 영상 추가됨`);
    }catch(e){notify("오류: "+e.message);}
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
    reader.onload=async ev=>{const XLSX=await loadXlsx();const wb=XLSX.read(ev.target.result,{type:"binary"});const ws=wb.Sheets[wb.SheetNames[0]];const rows=XLSX.utils.sheet_to_json(ws,{header:1});
      const nk=rows.slice(1).filter(r=>r[0]).map((r,i)=>({id:Date.now()+i,keyword:String(r[0]).trim(),tabOrder:[...TAB_TYPES],myBlogRank:r[1]||"-",myPlaceRank:r[2]||"-",status:"warn"}));
      upd("keywords",[...data.keywords,...nk]);notify(`${nk.length}개 키워드 추가 완료`);};
    reader.readAsBinaryString(file);e.target.value="";
  };
  const handleGoogleSheet=async()=>{
    const url=prompt("구글시트 링크를 붙여넣으세요:\n\n※ 시트가 '링크가 있는 모든 사용자에게 공개'로 설정되어야 합니다.\n※ A열: 키워드 (필수), B열: 블로그순위, C열: 플레이스순위, D열: 월검색량\n※ 1행은 헤더로 건너뜁니다.");
    if(!url)return;
    const idMatch=url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if(!idMatch){notify("유효한 구글시트 URL이 아닙니다.\n예: https://docs.google.com/spreadsheets/d/1abc.../edit");return;}
    const sheetId=idMatch[1];
    const gidMatch=url.match(/gid=(\d+)/);
    const gid=gidMatch?gidMatch[1]:"0";
    const csvUrl=`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    try{
      setRankLoading("gsheet");
      const res=await fetch(csvUrl);
      if(!res.ok)throw new Error(`시트 접근 실패 (${res.status}). 공유 설정을 확인하세요.`);
      const text=await res.text();
      const lines=text.split("\n").map(l=>{
        const cells=[];let cur="",inQ=false;
        for(let i=0;i<l.length;i++){const c=l[i];if(c==='"'){inQ=!inQ;}else if(c===","&&!inQ){cells.push(cur.trim());cur="";}else{cur+=c;}}
        cells.push(cur.trim());return cells;
      });
      const nk=lines.slice(1).filter(r=>r[0]&&r[0].length>0).map((r,i)=>({
        id:Date.now()+i,keyword:r[0].replace(/^"|"$/g,"").trim(),tabOrder:[...TAB_TYPES],
        myBlogRank:r[1]||"-",myPlaceRank:r[2]||"-",monthlySearch:r[3]?parseInt(r[3]):null,status:"warn"
      }));
      if(nk.length===0){notify("키워드를 찾을 수 없습니다. A열에 키워드를 입력해주세요.");setRankLoading(null);return;}
      upd("keywords",[...data.keywords,...nk]);
      notify(`✅ ${nk.length}개 키워드 추가 완료!`);
    }catch(e){notify("구글시트 불러오기 실패: "+e.message);}
    setRankLoading(null);
  };
  const handleMapExcel=e=>{
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=async ev=>{const XLSX=await loadXlsx();const wb=XLSX.read(ev.target.result,{type:"binary"});const ws=wb.Sheets[wb.SheetNames[0]];const rows=XLSX.utils.sheet_to_json(ws,{header:1});
      const nm=rows.slice(1).filter(r=>r[0]).map((r,i)=>({id:Date.now()+i,keyword:String(r[0]).trim(),naverPlace:"-",google:"-",kakao:"-",status:"warn"}));
      upd("maps",[...data.maps,...nm]);notify(`${nm.length}개 지도 키워드 추가 완료`);};
    reader.readAsBinaryString(file);e.target.value="";
  };
  const handleMapGoogleSheet=async()=>{
    const url=prompt("구글시트 링크를 붙여넣으세요:\n\n※ 시트가 '링크가 있는 모든 사용자에게 공개'로 설정되어야 합니다.\n※ A열: 키워드 (필수)\n※ 1행은 헤더로 건너뜁니다.");
    if(!url)return;
    const idMatch=url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if(!idMatch){notify("유효한 구글시트 URL이 아닙니다.");return;}
    const sheetId=idMatch[1];
    const gidMatch=url.match(/gid=(\d+)/);
    const gid=gidMatch?gidMatch[1]:"0";
    try{
      setRankLoading("gsheetMap");
      const res=await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`);
      if(!res.ok)throw new Error(`시트 접근 실패 (${res.status}). 공유 설정을 확인하세요.`);
      const text=await res.text();
      const lines=text.split("\n").map(l=>{
        const cells=[];let cur="",inQ=false;
        for(let i=0;i<l.length;i++){const c=l[i];if(c==='"'){inQ=!inQ;}else if(c===","&&!inQ){cells.push(cur.trim());cur="";}else{cur+=c;}}
        cells.push(cur.trim());return cells;
      });
      const nm=lines.slice(1).filter(r=>r[0]&&r[0].length>0).map((r,i)=>({
        id:Date.now()+i,keyword:r[0].replace(/^"|"$/g,"").trim(),naverPlace:"-",google:"-",kakao:"-",status:"warn"
      }));
      if(nm.length===0){notify("키워드를 찾을 수 없습니다. A열에 키워드를 입력해주세요.");setRankLoading(null);return;}
      upd("maps",[...data.maps,...nm]);
      notify(`✅ ${nm.length}개 지도 키워드 추가 완료!`);
    }catch(e){notify("구글시트 불러오기 실패: "+e.message);}
    setRankLoading(null);
  };
  const callAI=async()=>{
    if(!aiRegion)return notify("지역을 입력해주세요.");
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
          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            <SaveBadge status={saveStatus}/>
            <Btn onClick={()=>exportExcel(data,branchName)} color="#334155" style={{color:"#94a3b8",padding:"5px 12px",fontSize:12}}>📥 엑셀</Btn>
          </div>
        </div>

        <div style={{flex:1,overflow:"auto",padding:"20px 24px"}}>

          {/* OVERVIEW */}
          {tab==="overview"&&<OverviewTab budgetRows={budgetRows} data={data} setCalTab={setCalTab} setTab={setTab} stats={stats}/>}

          {/* PERFORMANCE */}
          {tab==="performance"&&<PerformanceTab data={data} modal={modal} setModal={setModal} upd={upd}/>}

          {/* PORTAL */}
          {tab==="portal"&&<PortalTab budgetTotal={budgetTotal} data={data} portalView={portalView} setData={setData} setPortalView={setPortalView} updN={updN}/>}

          {/* BUDGET + ROI */}
          {tab==="budget"&&<BudgetTab budgetRows={budgetRows} budgetTotal={budgetTotal} budgetTab={budgetTab} data={data} roi={roi} setBudgetTab={setBudgetTab} upd={upd}/>}

          {/* KEYWORDS */}
          {tab==="keywords"&&<KeywordsTab addAIKws={addAIKws} aiLoading={aiLoading} aiRegion={aiRegion} aiResult={aiResult} aiSpec={aiSpec} callAI={callAI} checkAllRanks={checkAllRanks} checkNaverRank={checkNaverRank} data={data} del={del} fileRef={fileRef} handleExcel={handleExcel} handleGoogleSheet={handleGoogleSheet} modal={modal} rankLoading={rankLoading} setAiRegion={setAiRegion} setAiResult={setAiResult} setAiSpec={setAiSpec} setModal={setModal} upd={upd}/>}

          {/* MAPS */}
          {tab==="maps"&&<MapsTab checkAllMapRanks={checkAllMapRanks} checkMapRank={checkMapRank} data={data} del={del} fetchReviews={fetchReviews} handleMapExcel={handleMapExcel} handleMapGoogleSheet={handleMapGoogleSheet} mapFileRef={mapFileRef} modal={modal} rankLoading={rankLoading} runApiDiag={runApiDiag} setModal={setModal} upd={upd}/>}

          {/* EXPERIENCE */}
          {tab==="experience"&&<ExperienceTab data={data} del={del} modal={modal} setModal={setModal} simRefresh={simRefresh} upd={upd}/>}

          {/* CAFES */}
          {tab==="cafes"&&<CafesTab data={data} modal={modal} setModal={setModal} upd={upd}/>}

          {/* YOUTUBE */}
          {tab==="youtube"&&<YoutubeTab data={data} del={del} modal={modal} setModal={setModal} setYtChTab={setYtChTab} upd={upd} ytAddByUrl={ytAddByUrl} ytAddChannel={ytAddChannel} ytChTab={ytChTab} ytLoading={ytLoading} ytRefresh={ytRefresh} ytRefreshChannel={ytRefreshChannel}/>}

          {/* SHORTFORM */}
          {tab==="shortform"&&<ShortformTab data={data} del={del} modal={modal} setModal={setModal} simRefresh={simRefresh} upd={upd} ytAddByUrl={ytAddByUrl} ytLoading={ytLoading} ytRefresh={ytRefresh}/>}

          {/* AUTOCOMPLETE */}
          {tab==="autocomplete"&&<AutocompleteTab data={data} del={del} modal={modal} setModal={setModal} upd={upd}/>}

          {/* HOMEPAGE SEO */}
          {tab==="seo"&&<SeoTab data={data} modal={modal} setModal={setModal} upd={upd}/>}

          {/* CALENDAR & TODOS */}
          {tab==="calendar"&&<CalendarTab calMonth={calMonth} calTab={calTab} data={data} modal={modal} setCalMonth={setCalMonth} setCalTab={setCalTab} setModal={setModal} upd={upd}/>}

          {/* COMMUNITY */}
          {tab==="community"&&<CommunityTab commTab={commTab} data={data} modal={modal} setCommTab={setCommTab} setModal={setModal} simRefreshComm={simRefreshComm} updComm={updComm}/>}

          {/* INHOUSE */}
          {tab==="inhouse"&&<InhouseTab data={data} handleImgUpload={handleImgUpload} inhouseTab={inhouseTab} modal={modal} setInhouseTab={setInhouseTab} setModal={setModal} updN={updN}/>}

          {/* OFFLINE */}
          {tab==="offline"&&<OfflineTab data={data} modal={modal} offlineTab={offlineTab} setModal={setModal} setOfflineTab={setOfflineTab} updN={updN}/>}

        </div>
      </div>
    </div>
  );
}
