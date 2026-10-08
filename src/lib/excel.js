import * as XLSX from "xlsx";
import { SL } from "@/src/lib/constants";
import { today } from "@/src/lib/format";

export function exportExcel(data, branchName){
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
