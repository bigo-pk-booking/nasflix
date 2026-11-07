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
const grid = $("#contentGrid"), musicList = $("#musicList");
let activeFilter = "All";
let editingId = null;
function render(){
  const term = $("#searchInput").value.trim().toLowerCase();
  const visible = items.filter(x => (activeFilter==="All" || x.type===activeFilter) && [x.title,x.type,x.genre,x.description].join(" ").toLowerCase().includes(term));
  grid.innerHTML = visible.filter(x=>x.type!=="Music").map(card).join("");
  musicList.innerHTML = visible.filter(x=>x.type==="Music").map(track).join("");
  $("#emptyState").hidden = visible.length>0;
  document.querySelectorAll(".cat-chip").forEach(b=>b.classList.toggle("selected",b.dataset.filter===activeFilter));
  document.querySelectorAll(".media-card").forEach(el=>el.addEventListener("click",()=>openPlayer(el.dataset.id)));
  document.querySelectorAll("[data-track]").forEach(el=>el.addEventListener("click",()=>openPlayer(el.dataset.track)));
  renderAdmin();
}
function card(x){const yt=youtubeId(x.url);const thumb=x.thumbnail||(yt?`https://img.youtube.com/vi/${yt}/hqdefault.jpg`:"");return `<article class="media-card" data-id="${x.id}"><div class="poster" style="--c1:${x.c1||"#4c1d95"};--c2:${x.c2||"#111827"}">${thumb?`<img class="poster-thumb" src="${esc(thumb)}" alt="${esc(x.title)} thumbnail" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`:""}<span class="card-type">${esc(x.type)}</span><span class="poster-art">${thumb?"":esc(x.art||"✦")}</span><div><span class="poster-label">${esc(x.genre||"FEATURED").toUpperCase()}</span></div><span class="play-badge">▶</span></div><h3 class="card-title">${esc(x.title)}</h3><p class="card-meta">${esc(x.type)} · ${esc(x.genre||"Entertainment")}</p></article>`}
function track(x){return `<div class="track"><div class="track-cover">♫</div><div class="track-info"><b>${esc(x.title)}</b><small>${esc(x.genre||"Music")} · ${esc(x.description||"Featured track")}</small></div><button data-track="${x.id}">▶ Listen</button></div>`}
function esc(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function youtubeId(value){try{const u=new URL(value);if(u.hostname==="youtu.be")return u.pathname.split("/").filter(Boolean)[0]||"";if(u.hostname==="youtube.com"||u.hostname.endsWith(".youtube.com")){const v=u.searchParams.get("v");if(v)return v;const parts=u.pathname.split("/").filter(Boolean);if(parts[0]==="embed"||parts[0]==="shorts")return parts[1]||"";}}catch{}return "";}
function isDirectMedia(value){try{const path=new URL(value).pathname.toLowerCase();return [".mp4",".webm",".mp3",".ogg",".m4a",".wav"].some(ext=>path.endsWith(ext));}catch{return false;}}
function openPlayer(id){const x=items.find(i=>String(i.id)===String(id));if(!x)return;$("#playerType").textContent=x.type.toUpperCase()+" · "+(x.genre||"FEATURED");$("#playerTitle").textContent=x.title;$("#playerDescription").textContent=x.description||"Enjoy this featured title.";const link=$("#downloadLink");if(x.url&&x.download){link.href=x.url;link.hidden=false}else{link.hidden=true}const yt=youtubeId(x.url);const screen=$("#playerScreen");screen.innerHTML=yt?`<div class="player-loading"><span></span>Loading video…</div><iframe src="https://www.youtube-nocookie.com/embed/${yt}" title="${esc(x.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe><button class="player-fullscreen" type="button" aria-label="Fullscreen">⛶</button>`:x.url&&isDirectMedia(x.url)?(x.type==="Music"?`<audio controls src="${esc(x.url)}"></audio>`:`<video controls playsinline src="${esc(x.url)}"></video><button class="player-fullscreen" type="button" aria-label="Fullscreen">⛶</button>`):`<div class="play-symbol">▶</div><p>${x.url?"This link may not be a direct playable media file. Open the original link below.":"No media URL has been added yet."}</p>${x.url?`<a href="${esc(x.url)}" target="_blank" rel="noopener">Open media link</a>`:""}`;const frame=screen.querySelector("iframe");if(frame)frame.addEventListener("load",()=>screen.querySelector(".player-loading")?.remove(),{once:true});$("#playerModal").classList.add("open");$("#playerModal").setAttribute("aria-hidden","false");}

function closeModal(id){const el=$("#"+id+"Modal");el.classList.remove("open");el.setAttribute("aria-hidden","true");}
document.querySelectorAll(".cat-chip").forEach(b=>b.addEventListener("click",()=>{activeFilter=b.dataset.filter;render()}));
$("#searchInput").addEventListener("input",render);
$("#heroExplore").addEventListener("click",()=>$("#movies").scrollIntoView({behavior:"smooth"}));
$("#adminOpen").addEventListener("click",()=>{$("#adminModal").classList.add("open");$("#adminModal").setAttribute("aria-hidden","false");});
document.addEventListener("click",async e=>{const btn=e.target.closest(".player-fullscreen");if(!btn)return;const screen=$("#playerScreen");try{if(!document.fullscreenElement)await screen.requestFullscreen();else await document.exitFullscreen();}catch{const media=screen.querySelector("iframe,video");if(media?.requestFullscreen)try{await media.requestFullscreen()}catch{}}});
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>closeModal(b.dataset.close)));
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeModal("player");closeModal("admin")}});
$("#contentForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const token=$("#adminToken").value.trim(),status=$("#uploadStatus");
  const item={title:$("#itemTitle").value.trim(),type:$("#itemType").value,genre:$("#itemGenre").value.trim()||"Independent",description:$("#itemDescription").value.trim(),url:$("#itemUrl").value.trim(),allowDownload:$("#itemDownload").checked};
  if(!token){status.textContent="Enter your admin access key first.";return;}
  if(!item.title||!item.url){status.textContent="Enter a title and a media URL.";return;}
  if(!/^https?:\/\//i.test(item.url)){status.textContent="Enter a valid http or https media URL.";return;}
  status.textContent="Saving to NASFLIX...";
  try{
    const response=await fetch(editingId?"/api/media/"+encodeURIComponent(editingId):"/api/media",{method:editingId?"PUT":"POST",headers:{"content-type":"application/json","authorization":"Bearer "+token},body:JSON.stringify(item)});
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||"Could not save this item.");
    status.textContent=editingId?"Changes saved successfully!":"Saved permanently to NASFLIX!";
    editingId=null;$("#contentForm").reset();$("#adminToken").value=token;$("#contentSubmit").textContent="Save to NASFLIX catalogue +";$("#cancelEdit").hidden=true;
    await loadRemote();
  }catch(error){status.textContent=error.message;}
});
async function loadRemote(){
  try{
    const response=await fetch("/api/media");if(!response.ok)return;
    const data=await response.json();
    const remote=data.map((x,i)=>({...x,id:x.id,url:x.media_url,download:!!x.allow_download,remote:true,art:"✦",c1:["#6d28d9","#be185d","#0369a1","#0f766e"][i%4],c2:"#171026"}));
    items=[...remote,...demoItems];render();
  }catch(error){console.warn("NASFLIX media API is not configured yet.",error);}
}
function renderAdmin(){
  $("#adminItems").innerHTML=items.map(x=>"<div class=\"admin-row\"><span>"+esc(x.title)+" <small>("+esc(x.type)+")"+(x.remote?" · Saved":"")+"</small></span><span class=\"admin-actions\">"+(x.remote?"<button data-edit=\""+esc(x.id)+"\">Edit</button>":"")+"<button data-delete=\""+esc(x.id)+"\" data-remote=\""+(x.remote?"1":"0")+"\">Remove</button></span></div>").join("");
  document.querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>{const x=items.find(item=>String(item.id)===String(b.dataset.edit));if(!x)return;editingId=x.id;$("#itemTitle").value=x.title;$("#itemType").value=x.type;$("#itemGenre").value=x.genre||"";$("#itemDescription").value=x.description||"";$("#itemUrl").value=x.url||"";$("#itemDownload").checked=!!x.download;$("#contentSubmit").textContent="Save changes";$("#cancelEdit").hidden=false;$("#uploadStatus").textContent="Editing: "+x.title;$("#contentForm").scrollIntoView({behavior:"smooth",block:"start"});}));
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
