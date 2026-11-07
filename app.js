const demoItems = [
  {id:1,title:"The Unknown",type:"Movie",genre:"Sci-Fi",description:"A mysterious signal changes everything in this cinematic concept preview.",art:"未知",c1:"#5b21b6",c2:"#111827"},
  {id:2,title:"Neon Dreams",type:"AI Video",genre:"Fantasy",description:"A surreal journey through a glowing dreamscape.",art:"✧",c1:"#be185d",c2:"#312e81"},
  {id:3,title:"After the Silence",type:"Series",genre:"Drama",description:"A quiet town. A secret that refuses to stay buried.",art:"静",c1:"#0f766e",c2:"#172554"},
  {id:4,title:"Midnight Drive",type:"Music",genre:"Electronic",description:"A late-night electronic mood for the road ahead.",art:"♫",c1:"#7c2d12",c2:"#1e1b4b"},
  {id:5,title:"Red Horizon",type:"Movie",genre:"Action",description:"An original action-film concept set beyond the edge of the city.",art:"赤",c1:"#b91c1c",c2:"#292524"},
  {id:6,title:"Dream Circuit",type:"AI Video",genre:"Animation",description:"An experimental animated world built from imagination.",art:"◎",c1:"#0369a1",c2:"#581c87"},
  {id:7,title:"Quiet Frequencies",type:"Music",genre:"Ambient",description:"Soft ambient textures for focus and relaxation.",art:"〰",c1:"#4338ca",c2:"#164e63"},
  {id:8,title:"The Last Signal",type:"Series",genre:"Mystery",description:"Every episode reveals another piece of the mystery.",art:"⌁",c1:"#4c1d95",c2:"#3f1d2e"}
];
let items = [...demoItems];
const $ = s => document.querySelector(s);
const NASFLIX_APP_MODE=new URLSearchParams(location.search).get("app")==="1";
if(NASFLIX_APP_MODE){document.body.classList.add("app-mode");}
if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));}
const grid = $("#contentGrid"), musicList = $("#musicList");
let activeFilter = "All";
let editingId = null;
function render(){
  const term = $("#searchInput").value.trim().toLowerCase();
  const visible = items.filter(x => (activeFilter==="All" || x.type===activeFilter || String(x.genre||"").toLowerCase()===activeFilter.toLowerCase()) && [x.title,x.seriesTitle,x.type,x.genre,x.description].join(" ").toLowerCase().includes(term));
  const catalogueCards=[];const seenSeries=new Set();
  visible.filter(x=>x.type!=="Music").forEach(x=>{if(x.type==="Series"&&x.seriesTitle){if(seenSeries.has(x.seriesTitle.toLowerCase()))return;seenSeries.add(x.seriesTitle.toLowerCase());const episodes=items.filter(e=>e.type==="Series"&&String(e.seriesTitle||"").toLowerCase()===x.seriesTitle.toLowerCase());catalogueCards.push({...x,displayTitle:x.seriesTitle,episodeCount:episodes.length});}else catalogueCards.push(x);});
  grid.innerHTML = catalogueCards.map(card).join("");
  musicList.innerHTML = visible.filter(x=>x.type==="Music").map(track).join("");
  $("#emptyState").hidden = visible.length>0;
  document.querySelectorAll(".cat-chip").forEach(b=>b.classList.toggle("selected",b.dataset.filter===activeFilter));
  document.querySelectorAll(".media-card").forEach(el=>el.addEventListener("click",()=>openPlayer(el.dataset.id)));
  document.querySelectorAll("[data-track]").forEach(el=>el.addEventListener("click",()=>openPlayer(el.dataset.track)));
  renderAdmin();
}
function card(x){const yt=youtubeId(x.url);const thumb=x.thumbnail||(yt?`https://img.youtube.com/vi/${yt}/hqdefault.jpg`:"");const title=x.displayTitle||x.title;return `<article class="media-card" data-id="${x.id}"><div class="poster" style="--c1:${x.c1||"#4c1d95"};--c2:${x.c2||"#111827"}">${thumb?`<img class="poster-thumb" src="${esc(thumb)}" alt="${esc(title)} thumbnail" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`:""}<span class="card-type">${esc(x.type)}</span><span class="poster-art">${thumb?"":esc(x.art||"✦")}</span><div><span class="poster-label">${x.episodeCount?`${x.episodeCount} EPISODES`:esc(x.genre||"FEATURED").toUpperCase()}</span></div><span class="play-badge">▶</span></div><h3 class="card-title">${esc(title)}</h3><p class="card-meta">${esc(x.type)} · ${esc(x.genre||"Entertainment")}</p></article>`}
function track(x){return `<div class="track"><div class="track-cover">♫</div><div class="track-info"><b>${esc(x.title)}</b><small>${esc(x.genre||"Music")} · ${esc(x.description||"Featured track")}</small></div><button data-track="${x.id}">▶ Listen</button></div>`}
function esc(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function youtubeId(value){try{const u=new URL(value);if(u.hostname==="youtu.be")return u.pathname.split("/").filter(Boolean)[0]||"";if(u.hostname==="youtube.com"||u.hostname.endsWith(".youtube.com")){const v=u.searchParams.get("v");if(v)return v;const parts=u.pathname.split("/").filter(Boolean);if(parts[0]==="embed"||parts[0]==="shorts")return parts[1]||"";}}catch{}return "";}
function isDirectMedia(value){if(String(value||"").startsWith("/api/file/"))return true;try{const path=new URL(value).pathname.toLowerCase();return [".mp4",".webm",".mp3",".ogg",".m4a",".wav"].some(ext=>path.endsWith(ext));}catch{return false;}}
function renderEpisodeNav(current){
  const box=$("#seriesEpisodes");
  if(current.type!=="Series"||!current.seriesTitle){box.hidden=true;box.innerHTML="";return;}
  const episodes=items.filter(e=>e.type==="Series"&&String(e.seriesTitle||"").toLowerCase()===String(current.seriesTitle).toLowerCase()).sort((a,b)=>(Number(a.seasonNumber)||1)-(Number(b.seasonNumber)||1)||(Number(a.episodeNumber)||0)-(Number(b.episodeNumber)||0));
  const index=episodes.findIndex(e=>String(e.id)===String(current.id));
  box.hidden=false;
  box.innerHTML=`<div class="episode-heading"><div><p class="eyebrow">CONTINUE THE STORY</p><h3>${esc(current.seriesTitle)}</h3></div><small>${episodes.length} episodes</small></div>${episodes.map((ep,i)=>`<button class="episode-row ${String(ep.id)===String(current.id)?"current":""}" data-episode-id="${esc(ep.id)}"><span class="episode-number">${Number(ep.seasonNumber)||1}.${Number(ep.episodeNumber)||i+1}</span><span class="episode-copy"><b>${esc(ep.episodeTitle||ep.title)}</b><small>Season ${Number(ep.seasonNumber)||1} · Episode ${Number(ep.episodeNumber)||i+1}</small></span><span class="episode-play">${String(ep.id)===String(current.id)?"NOW PLAYING":"▶"}</span></button>`).join("")}<div class="episode-nav-buttons"><button type="button" data-episode-id="${episodes[index-1]?.id||""}" ${index<=0?"disabled":""}>← Previous</button><button type="button" data-episode-id="${episodes[index+1]?.id||""}" ${index>=episodes.length-1?"disabled":""}>Next Episode →</button></div>`;
}
function openPlayer(id){const x=items.find(i=>String(i.id)===String(id));if(!x)return;$("#playerType").textContent=x.type.toUpperCase()+" · "+(x.genre||"FEATURED");$("#playerTitle").textContent=x.seriesTitle?(x.episodeTitle||x.title):x.title;$("#playerDescription").textContent=x.description||"Enjoy this featured title.";const link=$("#downloadLink");if(x.url&&x.download){link.href=x.url;link.hidden=false}else{link.hidden=true}const yt=youtubeId(x.url);const screen=$("#playerScreen");screen.innerHTML=yt?`<div class="player-loading"><span></span>Loading video…</div><iframe src="https://www.youtube-nocookie.com/embed/${yt}" title="${esc(x.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe><button class="player-fullscreen" type="button" aria-label="Fullscreen">⛶</button>`:x.url&&isDirectMedia(x.url)?(x.type==="Music"?`<audio controls src="${esc(x.url)}"></audio>`:`<video controls playsinline src="${esc(x.url)}"></video><button class="player-fullscreen" type="button" aria-label="Fullscreen">⛶</button>`):`<div class="play-symbol">▶</div><p>${x.url?"This link may not be a direct playable media file. Open the original link below.":"No media URL has been added yet."}</p>${x.url?`<a href="${esc(x.url)}" target="_blank" rel="noopener">Open media link</a>`:""}`;const frame=screen.querySelector("iframe");if(frame)frame.addEventListener("load",()=>screen.querySelector(".player-loading")?.remove(),{once:true});renderEpisodeNav(x);$("#playerModal").classList.add("open");$("#playerModal").setAttribute("aria-hidden","false");}

function closeModal(id){const el=$("#"+id+"Modal");el.classList.remove("open");el.setAttribute("aria-hidden","true");}
document.querySelectorAll(".cat-chip").forEach(b=>b.addEventListener("click",()=>{activeFilter=b.dataset.filter;render()}));
$("#searchInput").addEventListener("input",render);
$("#heroExplore").addEventListener("click",()=>$("#movies").scrollIntoView({behavior:"smooth"}));
if($("#adminOpen")&&$("#adminModal"))$("#adminOpen").addEventListener("click",()=>{$("#adminModal").classList.add("open");$("#adminModal").setAttribute("aria-hidden","false");});
document.addEventListener("click",async e=>{const btn=e.target.closest(".player-fullscreen");if(!btn)return;const screen=$("#playerScreen");try{if(!document.fullscreenElement)await screen.requestFullscreen();else await document.exitFullscreen();}catch{const media=screen.querySelector("iframe,video");if(media?.requestFullscreen)try{await media.requestFullscreen()}catch{}}});
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>closeModal(b.dataset.close)));
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeModal("player");closeModal("admin")}});
function setUploadProgress(percent,label,detail,state=""){
  const box=$("#uploadProgress");if(!box)return;
  box.hidden=false;box.classList.toggle("done",state==="done");box.classList.toggle("error",state==="error");
  $("#uploadProgressBar").style.width=Math.max(0,Math.min(100,percent))+"%";
  $("#uploadProgressPercent").textContent=Math.round(percent)+"%";
  $("#uploadProgressLabel").textContent=label;
  $("#uploadProgressDetail").textContent=detail;
}
function uploadWithProgress(url,formData,token,onProgress){
  return new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest();xhr.open("POST",url);xhr.setRequestHeader("authorization","Bearer "+token);
    xhr.upload.addEventListener("progress",event=>{if(event.lengthComputable)onProgress(event.loaded,event.total);});
    xhr.addEventListener("load",()=>{let result={};try{result=JSON.parse(xhr.responseText||"{}");}catch{}if(xhr.status>=200&&xhr.status<300)resolve(result);else reject(new Error(result.error||"Upload failed ("+xhr.status+")."));});
    xhr.addEventListener("error",()=>reject(new Error("Network error. Please try the upload again.")));
    xhr.addEventListener("abort",()=>reject(new Error("Upload cancelled.")));
    xhr.send(formData);
  });
}
$("#contentForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const token=$("#adminToken").value.trim(),status=$("#uploadStatus"),file=$("#itemFile").files[0],submit=$("#contentSubmit");
  const progress=$("#uploadProgress");
  const item={title:$("#itemTitle").value.trim(),type:$("#itemType").value,genre:$("#itemGenre").value.trim()||"Independent",description:$("#itemDescription").value.trim(),url:$("#itemUrl").value.trim(),allowDownload:$("#itemDownload").checked,seriesTitle:$("#seriesTitle").value.trim(),seasonNumber:Number($("#seasonNumber").value)||1,episodeNumber:Number($("#episodeNumber").value)||null,episodeTitle:$("#episodeTitle").value.trim()};
  if(!token){status.textContent="Enter your admin access key first.";return;}
  if(!item.title){status.textContent="Enter a title.";return;}
  if(!editingId&&file&&file.size>50*1024*1024){status.textContent="Maximum upload size is 50 MB.";return;}
  if(!file&&!item.url){status.textContent="Choose a media file or enter a media URL.";return;}
  if(!file&&item.url&&!/^https?:\/\//i.test(item.url)){status.textContent="Enter a valid http or https media URL.";return;}
  submit.disabled=true;submit.textContent=file?"Uploading…":"Saving…";
  if(progress){progress.hidden=true;progress.classList.remove("done","error");}
  status.textContent=file?"Preparing secure upload…":"Saving to NASFLIX…";
  try{
    let result;
    if(file&&!editingId){
      const form=new FormData();Object.entries(item).forEach(([k,v])=>form.append(k,String(v??"")));form.append("file",file);
      setUploadProgress(0,"Preparing upload…","Getting your file ready for secure R2 storage.");
      result=await uploadWithProgress("/api/media",form,token,(loaded,total)=>{
        const percent=total?loaded/total*100:0;
        setUploadProgress(percent,percent>=100?"Upload sent — saving…":"Uploading your video…",Math.round(loaded/1024/1024*10)/10+" MB of "+Math.round(total/1024/1024*10)/10+" MB uploaded. Keep this page open.");
        status.textContent="Uploading to secure R2 storage… "+Math.round(percent)+"%";
      });
      setUploadProgress(100,"Upload complete!","Your file was stored in R2 successfully.", "done");
    }else{
      const headers={"authorization":"Bearer "+token,"content-type":"application/json"};
      const response=await fetch(editingId?"/api/media/"+encodeURIComponent(editingId):"/api/media",{method:editingId?"PUT":"POST",headers,body:JSON.stringify(item)});
      result=await response.json();if(!response.ok)throw new Error(result.error||"Could not save this item.");
    }
    status.textContent=editingId?"Changes saved successfully!":file?"Video uploaded securely to R2!":"Saved permanently to NASFLIX!";
    editingId=null;$("#contentForm").reset();$("#adminToken").value=token;$("#contentSubmit").textContent="Save to NASFLIX catalogue +";$("#cancelEdit").hidden=true;
    await loadRemote();
  }catch(error){status.textContent=error.message;if(file)setUploadProgress(0,"Upload not completed",error.message,"error");}
  finally{submit.disabled=false;if(submit.textContent==="Uploading…"||submit.textContent==="Saving…")submit.textContent="Save to NASFLIX catalogue +";}
});
async function loadRemote(){
  try{
    const response=await fetch("/api/media");if(!response.ok)return;
    const data=await response.json();
    const remote=data.map((x,i)=>({...x,id:x.id,url:x.media_url,download:!!x.allow_download,seriesTitle:x.series_title||"",seasonNumber:x.season_number||1,episodeNumber:x.episode_number||null,episodeTitle:x.episode_title||"",remote:true,art:"✦",c1:["#6d28d9","#be185d","#0369a1","#0f766e"][i%4],c2:"#171026"}));
    items=[...remote,...demoItems];render();
  }catch(error){console.warn("NASFLIX media API is not configured yet.",error);}
}
function renderAdmin(){
  $("#adminItems").innerHTML=items.map(x=>"<div class=\"admin-row\"><span>"+esc(x.title)+" <small>("+esc(x.type)+")"+(x.remote?" · Saved":"")+"</small></span><span class=\"admin-actions\">"+(x.remote?"<button data-edit=\""+esc(x.id)+"\">Edit</button>":"")+"<button data-delete=\""+esc(x.id)+"\" data-remote=\""+(x.remote?"1":"0")+"\">Remove</button></span></div>").join("");
  document.querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>{const x=items.find(item=>String(item.id)===String(b.dataset.edit));if(!x)return;editingId=x.id;$("#itemTitle").value=x.title;$("#itemType").value=x.type;$("#itemGenre").value=x.genre||"";$("#itemDescription").value=x.description||"";$("#itemUrl").value=x.url||"";$("#seriesTitle").value=x.seriesTitle||"";$("#seasonNumber").value=x.seasonNumber||1;$("#episodeNumber").value=x.episodeNumber||"";$("#episodeTitle").value=x.episodeTitle||"";$("#itemDownload").checked=!!x.download;$("#contentSubmit").textContent="Save changes";$("#cancelEdit").hidden=false;$("#uploadStatus").textContent="Editing: "+x.title;$("#contentForm").scrollIntoView({behavior:"smooth",block:"start"});}));
  document.querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",async()=>{
    const id=b.dataset.delete;
    if(b.dataset.remote==="1"){
      const token=$("#adminToken").value.trim();
      if(!token){$("#uploadStatus").textContent="Enter your admin access key before removing saved content.";return;}
      const response=await fetch("/api/media/"+encodeURIComponent(id),{method:"DELETE",headers:{Authorization:"Bearer "+token}});
      if(!response.ok){const result=await response.json().catch(()=>({}));$("#uploadStatus").textContent=result.error||"Could not remove this item.";return;}
    }
    items=items.filter(x=>String(x.id)!==String(id));render();
  }));
}
$("#year").textContent=new Date().getFullYear();
render();
loadRemote();

$("#cancelEdit").addEventListener("click",()=>{editingId=null;$("#contentForm").reset();$("#contentSubmit").textContent="Save to NASFLIX catalogue +";$("#cancelEdit").hidden=true;$("#uploadStatus").textContent="Edit cancelled.";});

document.addEventListener("click",e=>{const b=e.target.closest("[data-episode-id]");if(b&&!b.disabled&&b.dataset.episodeId)openPlayer(b.dataset.episodeId);});
