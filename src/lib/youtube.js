import { ytApi } from "@/src/lib/api";

export function extractYtId(url){if(!url)return null;const m=url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);return m?m[1]:null;}

export async function fetchYtVideo(videoId){
  try{
    const d=await ytApi("videos",{part:"snippet,statistics",id:videoId});if(!d.items||!d.items.length)return null;
    const item=d.items[0];const s=item.statistics;const sn=item.snippet;
    return{title:sn.title,views:+(s.viewCount||0),likes:+(s.likeCount||0),commentCount:+(s.commentCount||0),channelTitle:sn.channelTitle,channelId:sn.channelId,thumbnail:sn.thumbnails?.medium?.url||"",publishedAt:sn.publishedAt?.split("T")[0]||""};
  }catch(e){console.error("YT video fetch error:",e);return null;}
}

export async function fetchYtComments(videoId,maxResults=20){
  try{
    const d=await ytApi("commentThreads",{part:"snippet",videoId,maxResults,order:"time"});if(!d.items)return[];
    return d.items.map(item=>{const s=item.snippet.topLevelComment.snippet;return{author:s.authorDisplayName,text:s.textDisplay?.replace(/<[^>]*>/g,"")||"",date:s.publishedAt?.split("T")[0]||"",likes:+(s.likeCount||0)};});
  }catch(e){console.error("YT comments fetch error:",e);return[];}
}

export async function fetchYtChannel(channelId){
  try{
    const d=await ytApi("channels",{part:"statistics,snippet",id:channelId});if(!d.items||!d.items.length)return null;
    const s=d.items[0].statistics;const sn=d.items[0].snippet;
    return{name:sn.title,subscribers:+(s.subscriberCount||0),totalViews:+(s.viewCount||0),videoCount:+(s.videoCount||0)};
  }catch(e){console.error("YT channel fetch error:",e);return null;}
}

export function extractYtChannelId(url){
  if(!url)return null;
  const m1=url.match(/youtube\.com\/channel\/([\w-]+)/);if(m1)return{type:"id",val:m1[1]};
  const m2=url.match(/youtube\.com\/@([\w.-]+)/);if(m2)return{type:"handle",val:m2[1]};
  const m3=url.match(/youtube\.com\/c\/([\w.-]+)/);if(m3)return{type:"custom",val:m3[1]};
  if(/^UC[\w-]{22}$/.test(url))return{type:"id",val:url};
  return null;
}

export async function resolveYtChannelId(input){
  const parsed=extractYtChannelId(input);
  if(!parsed){
    const d=await ytApi("search",{part:"snippet",q:input,type:"channel",maxResults:1});if(d.items&&d.items.length)return d.items[0].snippet.channelId;return null;
  }
  if(parsed.type==="id")return parsed.val;
  const d=await ytApi("search",{part:"snippet",q:parsed.val,type:"channel",maxResults:1});if(d.items&&d.items.length)return d.items[0].snippet.channelId;return null;
}

export async function fetchYtChannelVideos(channelId,maxResults=10){
  try{
    const cd=await ytApi("channels",{part:"contentDetails,snippet,statistics",id:channelId});if(!cd.items||!cd.items.length)return null;
    const ch=cd.items[0];const uploadsId=ch.contentDetails.relatedPlaylists.uploads;
    const pd=await ytApi("playlistItems",{part:"snippet",playlistId:uploadsId,maxResults});if(!pd.items)return{channel:ch,videos:[]};
    const videoIds=pd.items.map(i=>i.snippet.resourceId.videoId).join(",");
    const vd=await ytApi("videos",{part:"statistics,snippet",id:videoIds});
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
