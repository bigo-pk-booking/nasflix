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
function render(){
  const term = $("#searchInput").value.trim().toLowerCase();
  const visible = items.filter(x => (activeFilter==="All" || x.type===activeFilter) && [x.title,x.type,x.genre,x.description].join(" ").toLowerCase().includes(term));
  grid.innerHTML = visible.filter(x=>x.type!=="Music").map(card).join("");
  musicList.innerHTML = visible.filter(x=>x.type==="Music").map(track).join("");
  $("#emptyState").hidden = visible.length>0;
  document.querySelectorAll(".cat-chip").forEach(b=>b.classList.toggle("selected",b.dataset.filter===activeFilter));
  document.querySelectorAll(".media-card").forEach(el=>el.addEventListener("click",()=>openPlayer(Number(el.dataset.id))));
  document.querySelectorAll("[data-track]").forEach(el=>el.addEventListener("click",()=>openPlayer(Number(el.dataset.track))));
  renderAdmin();
}
function card(x){return `<article class="media-card" data-id="${x.id}"><div class="poster" style="--c1:${x.c1||"#4c1d95"};--c2:${x.c2||"#111827"}"><span class="card-type">${esc(x.type)}</span><span class="poster-art">${esc(x.art||"✦")}</span><div><span class="poster-label">${esc(x.genre||"FEATURED").toUpperCase()}</span></div><span class="play-badge">▶</span></div><h3 class="card-title">${esc(x.title)}</h3><p class="card-meta">${esc(x.type)} · ${esc(x.genre||"Entertainment")}</p></article>`}
function track(x){return `<div class="track"><div class="track-cover">♫</div><div class="track-info"><b>${esc(x.title)}</b><small>${esc(x.genre||"Music")} · ${esc(x.description||"Featured track")}</small></div><button data-track="${x.id}">▶ Listen</button></div>`}
function esc(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function openPlayer(id){const x=items.find(i=>String(i.id)===String(id));if(!x)return;$("#playerType").textContent=x.type.toUpperCase()+" · "+(x.genre||"FEATURED");$("#playerTitle").textContent=x.title;$("#playerDescription").textContent=x.description||"Enjoy this featured title.";const link=$("#downloadLink");if(x.url&&x.download){link.href=x.url;link.hidden=false}else{link.hidden=true}$("#playerScreen").innerHTML=x.url&&/\.(mp4|webm|mp3|ogg)(\?|$)/i.test(x.url)?(x.type==="Music"?`<audio controls src="${esc(x.url)}"></audio>`:`<video controls playsinline src="${esc(x.url)}"></video>`):`<div class="play-symbol">▶</div><p>PREVIEW PLAYER</p>`;$("#playerModal").classList.add("open");$("#playerModal").setAttribute("aria-hidden","false");}
function closeModal(id){const el=$("#"+id+"Modal");el.classList.remove("open");el.setAttribute("aria-hidden","true");}
document.querySelectorAll(".cat-chip").forEach(b=>b.addEventListener("click",()=>{activeFilter=b.dataset.filter;render()}));
$("#searchInput").addEventListener("input",render);
$("#heroExplore").addEventListener("click",()=>$("#movies").scrollIntoView({behavior:"smooth"}));
$("#adminOpen").addEventListener("click",()=>{$("#adminModal").classList.add("open");$("#adminModal").setAttribute("aria-hidden","false");});
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>closeModal(b.dataset.close)));
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeModal("player");closeModal("admin")}});
$("#contentForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const file=$("#itemFile").files[0], token=$("#adminToken").value.trim(), status=$("#uploadStatus");
  if(file){
    if(!token){status.textContent="Enter your admin access key first.";return;}
    const form=new FormData();
    form.append("file",file);form.append("title",$("#itemTitle").value.trim());
    form.append("type",$("#itemType").value);form.append("genre",$("#itemGenre").value.trim());
    form.append("description",$("#itemDescription").value.trim());form.append("allowDownload",String($("#itemDownload").checked));
    status.textContent="Uploading media to NASFLIX...";
    try{
      const response=await fetch("/api/upload",{method:"POST",headers:{Authorization:"Bearer "+token},body:form});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error||"Upload failed.");
      status.textContent="Upload complete! Your media is now saved in NASFLIX.";
      $("#contentForm").reset();$("#adminToken").value=token;await loadRemote();
    }catch(error){status.textContent=error.message;}
    return;
  }
  const item={id:Date.now(),title:$("#itemTitle").value.trim(),type:$("#itemType").value,genre:$("#itemGenre").value.trim()||"Independent",description:$("#itemDescription").value.trim(),url:$("#itemUrl").value.trim(),download:$("#itemDownload").checked,art:"✦",c1:"#6d28d9",c2:"#171026"};
  items.unshift(item);$("#contentForm").reset();$("#adminToken").value=token;status.textContent="Added as a temporary browser preview. Choose a file to save permanently.";render();
});
async function loadRemote(){
  try{
    const response=await fetch("/api/media");if(!response.ok)return;
    const data=await response.json();
    const remote=data.map((x,i)=>({...x,id:x.id,url:x.url,download:!!x.allow_download,remote:true,art:"✦",c1:["#6d28d9","#be185d","#0369a1","#0f766e"][i%4],c2:"#171026"}));
    items=[...remote,...demoItems];render();
  }catch(error){console.warn("NASFLIX media API is not configured yet.",error);}
}
function renderAdmin(){
  $("#adminItems").innerHTML=items.map(x=>"<div class=\"admin-row\"><span>"+esc(x.title)+" <small>("+esc(x.type)+")"+(x.remote?" · Saved":"")+"</small></span><button data-delete=\""+esc(x.id)+"\" data-remote=\""+(x.remote?"1":"0")+"\">Remove</button></div>").join("");
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
