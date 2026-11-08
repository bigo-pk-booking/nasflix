let items = [];
let offlineItems=loadOfflineList();
const OFFLINE_CACHE_NAME="nasflix-offline-media-v1";
function loadOfflineList(){try{return JSON.parse(localStorage.getItem("nasflix-offline-items")||"[]");}catch{return [];}}
function saveOfflineList(){localStorage.setItem("nasflix-offline-items",JSON.stringify(offlineItems));}
const $ = s => document.querySelector(s);
const NASFLIX_APP_MODE=new URLSearchParams(location.search).get("app")==="1";
if(NASFLIX_APP_MODE){document.body.classList.add("app-mode");}
if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));}
const grid = $("#contentGrid"), musicList = $("#musicList");
let activeFilter = "All";
let activeMusicArtist = "All Artists";
let activeMusicAlbum = "All Albums";
let musicVisibleCount = 10;
let activeDownloadFolder = "none";
let musicBatchLoading = true;
let musicBatchTimer = null;
let editingId = null;
function render(){
  const term = $("#searchInput").value.trim().toLowerCase();
  const visible = items.filter(x => (activeFilter==="All" || x.type===activeFilter || String(x.genre||"").toLowerCase()===activeFilter.toLowerCase()) && [x.title,x.seriesTitle,x.type,x.genre,x.description,x.artist,x.albumTitle].join(" ").toLowerCase().includes(term));
  const catalogueCards=[];const seenSeries=new Set();
  visible.filter(x=>x.type!=="Music").forEach(x=>{if(x.type==="Series"){const seriesName=String(x.seriesTitle||x.title||"").trim();const key=seriesName.toLowerCase();if(seenSeries.has(key))return;seenSeries.add(key);const episodes=items.filter(e=>e.type==="Series"&&String(e.seriesTitle||e.title||"").trim().toLowerCase()===key);catalogueCards.push({...x,displayTitle:seriesName,episodeCount:episodes.length});}else catalogueCards.push(x);});
  grid.innerHTML = catalogueCards.map(card).join("");
  const musicItems=visible.filter(x=>x.type==="Music");
  const normalizeArtistName=value=>String(value||"").trim().replace(/\\s+/g," ").toLocaleLowerCase();
  const artistNames=new Map();
  musicItems.forEach(x=>{const raw=String(x.artist||"").trim().replace(/\\s+/g," ");const key=normalizeArtistName(raw);if(key&&!artistNames.has(key))artistNames.set(key,raw);});
  const artists=[...artistNames.values()].sort((a,b)=>a.localeCompare(b));
  if(activeMusicArtist!=="All Artists"&&!artistNames.has(normalizeArtistName(activeMusicArtist))){activeMusicArtist="All Artists";activeMusicAlbum="All Albums";}
  const artistSearchTerm=String($("#artistSearchInput")?.value||"").trim().toLocaleLowerCase();const artistBox=$("#artistFilters");
  if(artistBox){artistBox.innerHTML=artists.map((name,i)=>{const artistTracksForCover=musicItems.filter(x=>normalizeArtistName(x.artist)===normalizeArtistName(name));const cover=artistTracksForCover.map(x=>x.artistImage||x.artist_image||x.artistPhoto||x.artistArtwork||x.poster_url||x.thumbnail).find(Boolean);const initials=name.split(/\\s+/).map(w=>w[0]).slice(0,2).join("").toUpperCase();return '<button type="button" class="artist-filter '+(normalizeArtistName(name)===normalizeArtistName(activeMusicArtist)?'selected':'')+'" data-artist-filter="'+esc(name)+'"><span class="artist-avatar" style="--artist-hue:'+((i*67+275)%360)+'deg"><span class="artist-avatar-initials">'+esc(initials)+'</span>'+(cover?'<img src="'+esc(cover)+'" alt="'+esc(name)+' photo" loading="lazy" onerror="this.remove()">':'')+'</span><b>'+esc(name)+'</b></button>';}).join("")||'<p class="playlist-empty">Artists will appear here when music is added.</p>';artistBox.scrollLeft=0;artistBox.querySelectorAll("[data-artist-filter]").forEach(button=>{button.hidden=!!artistSearchTerm&&!button.dataset.artistFilter.toLocaleLowerCase().includes(artistSearchTerm);});const noArtists=$("#artistSearchEmpty");if(noArtists)noArtists.hidden=!artistSearchTerm||artistBox.querySelectorAll("[data-artist-filter]:not([hidden])").length>0;}
  const categoryBox=$("#musicCategoryGrid");
  if(categoryBox){const categories=[...new Set(musicItems.map(x=>String(x.genre||"Music").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));const albumsAll=[...new Set(musicItems.map(x=>String(x.albumTitle||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));categoryBox.innerHTML=[...categories.map((name,i)=>({name,kind:"genre",count:musicItems.filter(x=>String(x.genre||"Music").trim()===name).length,index:i})),...albumsAll.map((name,i)=>({name,kind:"album",count:musicItems.filter(x=>String(x.albumTitle||"").trim()===name).length,index:i+categories.length}))].map(c=>'<button type="button" class="music-category-card" data-music-category="'+esc(c.name)+'" data-category-kind="'+c.kind+'" style="--category-hue:'+((c.index*61+275)%360)+'deg"><span>'+esc(c.name)+'</span><small>'+c.count+' tracks</small></button>').join("")||'<p class="playlist-empty">Genres and albums will appear here.</p>';}
  const artistTracks=activeMusicArtist==="All Artists"?musicItems:musicItems.filter(x=>normalizeArtistName(x.artist)===normalizeArtistName(activeMusicArtist));
  const albums=[...new Set(artistTracks.map(x=>String(x.albumTitle||"").trim()||"Singles"))].sort((a,b)=>a.localeCompare(b));
  if(activeMusicAlbum!=="All Albums"&&!albums.includes(activeMusicAlbum))activeMusicAlbum="All Albums";
  const albumBox=$("#albumBrowser");
  if(albumBox){albumBox.hidden=activeMusicArtist==="All Artists"||albums.length===0;albumBox.innerHTML=(activeMusicArtist!=="All Artists"?'<button class="album-back" type="button" data-album-filter="All Albums">← All albums</button>':"")+albums.map(name=>'<button type="button" class="album-tile '+(name===activeMusicAlbum?'selected':'')+'" data-album-filter="'+esc(name)+'"><b>▣ '+esc(name)+'</b><small>'+artistTracks.filter(x=>(String(x.albumTitle||"").trim()||"Singles")===name).length+' tracks</small></button>').join("");}
  const shownMusic=activeMusicAlbum==="All Albums"?artistTracks:artistTracks.filter(x=>(String(x.albumTitle||"").trim()||"Singles")===activeMusicAlbum);
  const visibleTracks=shownMusic.slice(0,musicVisibleCount);
  musicList.innerHTML=visibleTracks.map(track).join("")+(musicBatchLoading?'<p class="music-loading-state" role="status">Loading music library…</p>':"");
  const sentinel=$("#musicLoadSentinel");
  if(sentinel)sentinel.hidden=musicBatchLoading||visibleTracks.length>=shownMusic.length;
  const playAll=$("#playAllMusic");if(playAll){playAll.disabled=shownMusic.length===0;playAll.textContent=activeMusicAlbum!=="All Albums"?"▶ Play album":activeMusicArtist==="All Artists"?"▶ Play all":"▶ Play "+activeMusicArtist;}
  $("#emptyState").hidden = visible.length>0;
  if(visible.length===0) $("#emptyState").textContent=items.length===0?"No content has been added yet. Check back soon.":"No titles found. Try another search.";
  document.querySelectorAll(".cat-chip").forEach(b=>b.classList.toggle("selected",b.dataset.filter===activeFilter));
  document.querySelectorAll(".media-card").forEach(el=>el.addEventListener("click",e=>{if(e.target.closest("[data-offline-save]"))return;openPlayer(el.dataset.id);}));
  document.querySelectorAll("[data-track]").forEach(el=>el.addEventListener("click",()=>openPlayer(el.dataset.track)));
  document.querySelectorAll("[data-artist-filter]").forEach(el=>el.addEventListener("click",()=>{activeMusicArtist=el.dataset.artistFilter;activeMusicAlbum="All Albums";musicVisibleCount=10;render();}));
   const artistSearch=$("#artistSearchInput"),clearArtistSearch=$("#clearArtistSearch");if(artistSearch&&!artistSearch.dataset.bound){artistSearch.dataset.bound="1";artistSearch.addEventListener("input",()=>{const term=artistSearch.value.trim().toLocaleLowerCase();$("#artistFilters")?.querySelectorAll("[data-artist-filter]").forEach(button=>{button.hidden=!!term&&!button.dataset.artistFilter.toLocaleLowerCase().includes(term);});if(clearArtistSearch)clearArtistSearch.hidden=!term;const noArtists=$("#artistSearchEmpty");if(noArtists)noArtists.hidden=!term||$("#artistFilters")?.querySelectorAll("[data-artist-filter]:not([hidden])").length>0;});}if(clearArtistSearch&&!clearArtistSearch.dataset.bound){clearArtistSearch.dataset.bound="1";clearArtistSearch.addEventListener("click",()=>{if(artistSearch){artistSearch.value="";artistSearch.dispatchEvent(new Event("input"));artistSearch.focus();}});}
  document.querySelectorAll("[data-album-filter]").forEach(el=>el.addEventListener("click",()=>{activeMusicAlbum=el.dataset.albumFilter;musicVisibleCount=10;render();}));
  $("#playAllMusic")?.addEventListener("click",()=>{const list=shownMusic.filter(x=>x.url&&isDirectMedia(x.url));if(list.length)openMusicPlayer(list[0].id,true,activeMusicArtist==="All Artists"?"":activeMusicArtist,activeMusicAlbum);});
  $("#shuffleAllMusic")?.addEventListener("click",()=>{const list=shownMusic.filter(x=>x.url&&isDirectMedia(x.url));if(list.length){const first=list[Math.floor(Math.random()*list.length)];openMusicPlayer(first.id,true,activeMusicArtist==="All Artists"?"":activeMusicArtist,activeMusicAlbum,true);}});
  document.querySelectorAll("[data-music-category]").forEach(el=>el.addEventListener("click",()=>{const kind=el.dataset.categoryKind,name=el.dataset.musicCategory;if(kind==="genre"){activeFilter=name;activeMusicArtist="All Artists";activeMusicAlbum="All Albums";}else{activeFilter="All";activeMusicArtist="All Artists";activeMusicAlbum=name;}musicVisibleCount=10;render();$("#musicList")?.scrollIntoView({behavior:"smooth",block:"start"});}));
  renderAdmin();
  renderDownloads();
}

let accountUser=null,userPlaylists=[],activePlaylistId="",playlistSaveTimer=null,guestMode=true;
async function accountRequest(path,body){let response;try{response=await fetch("/api/account/"+path,{method:body===undefined?"GET":"POST",headers:body===undefined?{}:{"content-type":"application/json"},body:body===undefined?undefined:JSON.stringify(body),credentials:"same-origin",cache:"no-store"});}catch(e){throw new Error("Cannot connect to NASFLIX server. Check your internet connection.");}const raw=await response.text();let data={};try{data=raw?JSON.parse(raw):{};}catch{}if(!response.ok)throw new Error(data.error||("Server error ("+response.status+"). "+(raw&&!raw.startsWith("<")?raw.slice(0,160):"Please check Cloudflare Pages Functions and D1 database settings.")));return data;}
function accountMessage(message){const el=$("#accountMessage");if(el)el.textContent=message;}
function renderUserPlaylists(){
 const list=$("#myPlaylistList"),detail=$("#playlistDetail");if(!list)return;
 list.innerHTML=userPlaylists.map(p=>{const first=p.trackIds.map(id=>items.find(x=>String(x.id)===String(id))).find(Boolean);return '<div class="my-playlist-card '+(p.id===viewingPlaylistId?"selected":"")+'"><button type="button" class="playlist-open" data-open-playlist="'+esc(p.id)+'"><span class="playlist-icon">'+(first?'<img src="'+esc(musicArtwork(first))+'" alt="">':'♫')+'</span><span><b>'+esc(p.name)+'</b><small>'+p.trackIds.length+' songs</small></span><span class="playlist-view-label">View →</span></button><button type="button" class="playlist-delete" data-delete-playlist="'+esc(p.id)+'">×</button></div>';}).join("")||'<p class="playlist-empty">No playlists yet. Create your first one.</p>';
 const p=userPlaylists.find(x=>x.id===viewingPlaylistId);if(!detail)return;detail.hidden=!p;if(!p){detail.innerHTML="";return;}
 const tracks=p.trackIds.map(id=>items.find(x=>String(x.id)===String(id))).filter(Boolean),cover=tracks[0]?musicArtwork(tracks[0]):"";
 detail.innerHTML='<div class="playlist-view-top"><button type="button" data-close-playlist>← My playlists</button><span>NASFLIX MUSIC</span></div><div class="playlist-hero"><div class="playlist-hero-cover">'+(cover?'<img src="'+esc(cover)+'" alt="">':'♫')+'</div><div class="playlist-hero-copy"><p class="eyebrow">YOUR PLAYLIST</p><h2>'+esc(p.name)+'</h2><p>'+tracks.length+' songs · NASFLIX playlist</p><div class="playlist-hero-actions"><button type="button" data-play-playlist="'+esc(p.id)+'" '+(!tracks.length?'disabled':'')+'>▶ Play</button><button type="button" data-shuffle-playlist="'+esc(p.id)+'" '+(!tracks.length?'disabled':'')+'>⤨ Shuffle play</button></div></div></div><div class="playlist-track-heading"><span>#</span><span>Title</span><span>Album</span><span></span></div>'+(tracks.length?tracks.map((t,i)=>'<div class="playlist-track-row"><span class="playlist-track-number">'+(i+1)+'</span><img src="'+esc(musicArtwork(t))+'" alt=""><button type="button" class="playlist-track-title" data-play-track="'+esc(t.id)+'"><b>'+esc(t.title)+'</b><small>'+esc(t.artist||"Unknown artist")+'</small></button><span class="playlist-track-album">'+esc(t.albumTitle||"Music")+'</span><button type="button" class="playlist-track-remove" data-remove-playlist-track="'+esc(p.id)+'" data-track-id="'+esc(t.id)+'">×</button></div>').join(""):'<p class="playlist-empty">This playlist is empty. Tap ＋ beside a song to add music.</p>');
}
async function syncPlaylists(){clearTimeout(playlistSaveTimer);await accountRequest("playlists",{playlists:userPlaylists});}
function schedulePlaylistSync(){clearTimeout(playlistSaveTimer);playlistSaveTimer=setTimeout(()=>syncPlaylists().catch(e=>accountMessage(e.message)),500);}
function enterGuestMode(){guestMode=true;$("#welcomeGate").hidden=true;$("#accountPlaylistPanel").hidden=true;$("#accountLoginHeader").hidden=false;}
async function refreshAccount(){try{const data=await accountRequest("me");accountUser=data.user;if(accountUser){guestMode=false;$("#welcomeGate").hidden=true;$("#accountPlaylistPanel").hidden=false;$("#accountLoginHeader").hidden=true;$("#accountLogoutHeader").hidden=false;$("#accountSignedIn").hidden=false;$("#accountStatus").textContent=accountUser.role==="admin"?"Admin account":"Signed in";$("#accountEmailLabel").textContent=accountUser.email;const saved=await accountRequest("playlists");userPlaylists=Array.isArray(saved.playlists)?saved.playlists:[];activePlaylistId=userPlaylists[0]?.id||"";renderUserPlaylists();if(accountUser.role==="admin"){const admin=$("#adminModal");if(admin){admin.classList.add("open");admin.setAttribute("aria-hidden","false");}}}else{userPlaylists=[];$("#welcomeGate").hidden=guestMode;$("#accountPlaylistPanel").hidden=true;$("#accountSignedIn").hidden=true;$("#accountLoginHeader").hidden=false;$("#accountLogoutHeader").hidden=true;$("#accountStatus").textContent="Not signed in";}}catch(e){accountMessage(e.message);$("#welcomeGate").hidden=guestMode;$("#accountPlaylistPanel").hidden=true;$("#accountLoginHeader").hidden=false;$("#accountLogoutHeader").hidden=true;}}
let accountActionBusy=false;
async function accountAction(kind){
 if(accountActionBusy)return;
 const email=$("#accountEmail").value.trim(),password=$("#accountPassword").value,fullName=$("#accountFullName").value.trim(),confirmPassword=$("#accountConfirmPassword").value;
 if(!email||!password||(kind==="register"&&!fullName)){accountMessage(kind==="register"?"Enter your full name, email and password.":"Enter your email and password.");return;}
 if(kind==="register"&&password!==confirmPassword){accountMessage("Passwords do not match. Please re-enter your password.");$("#accountConfirmPassword").focus();return;}
 const button=kind==="register"?$("#accountCreate"):$("#accountLogin"),original=button?.textContent||"";
 accountActionBusy=true;if(button){button.disabled=true;button.textContent=kind==="register"?"Creating account…":"Signing in…";}
 accountMessage(kind==="register"?"Creating your NASFLIX account…":"Connecting to NASFLIX…");
 try{
  const data=await accountRequest(kind,{email,password,...(kind==="register"?{fullName}:{})});
  accountUser=data.user;$("#accountPassword").value="";$("#accountConfirmPassword").value="";$("#accountFullName").value="";
  await refreshAccount();
  accountMessage(kind==="register"?"Account created successfully!":"Welcome back!");
 }catch(e){accountMessage(e.message||"Something went wrong. Please try again.");}
 finally{accountActionBusy=false;if(button){button.disabled=false;button.textContent=original;}}
}
window.NASFLIXAccountAction=accountAction;
let pendingPlaylistTrackId="";
function closePlaylistPicker(){const modal=$("#playlistPicker");if(modal)modal.hidden=true;pendingPlaylistTrackId="";}
function openPlaylistPicker(id){
 if(!accountUser){accountMessage("Log in first to save songs to playlists.");$("#accountEmail").focus();return;}
 if(!userPlaylists.length){accountMessage("Create a playlist first, then tap ＋ beside a song.");return;}
 pendingPlaylistTrackId=String(id);const modal=$("#playlistPicker"),box=$("#playlistPickerOptions");if(!modal||!box)return;
 box.innerHTML=userPlaylists.map(p=>'<button type="button" class="playlist-picker-option" data-choose-playlist="'+esc(p.id)+'"><span class="playlist-icon">♫</span><span><b>'+esc(p.name)+'</b><small>'+p.trackIds.length+' songs</small></span><span>＋</span></button>').join("");
 modal.hidden=false;
}
function addTrackToPlaylist(id){openPlaylistPicker(id);}
function playUserPlaylist(shuffle=false){const p=userPlaylists.find(x=>x.id===viewingPlaylistId);if(!p)return;const queue=p.trackIds.map(id=>items.find(x=>String(x.id)===id)).filter(x=>x&&x.url&&isDirectMedia(x.url));if(!queue.length){accountMessage("No playable songs in this playlist yet.");return;}const ordered=shuffle?[...queue].sort(()=>Math.random()-.5):queue;openMusicPlayer(ordered[0].id,true,"","All Albums",false,ordered);}
// Resilient delegated account controls: handle clicks even if a button listener was missed.
document.addEventListener("click",function(event){
 const button=event.target.closest("#accountLogin,#accountCreate,#accountRegister,#accountBackToLogin");
 if(!button)return;
 event.preventDefault();event.stopImmediatePropagation();
 if(button.id==="accountLogin")accountAction("login");
 else if(button.id==="accountCreate")accountAction("register");
 else if(button.id==="accountRegister")setAccountFormMode("register");
 else if(button.id==="accountBackToLogin")setAccountFormMode("login");
},true);
$("#continueGuest")?.addEventListener("click",enterGuestMode);
setAccountFormMode("login");
$("#welcomeClose")?.addEventListener("click",enterGuestMode);
function closeOfflineLoginModal(){const modal=$("#offlineLoginModal");if(modal)modal.hidden=true;}
$("#offlineLoginClose")?.addEventListener("click",closeOfflineLoginModal);
$("#offlineLoginCancel")?.addEventListener("click",closeOfflineLoginModal);
$("#offlineLoginContinue")?.addEventListener("click",()=>{closeOfflineLoginModal();guestMode=false;$("#welcomeGate").hidden=false;setAccountFormMode("login");});
function setAccountFormMode(mode){const signup=mode==="register";const field=$("#fullNameField"),confirm=$("#confirmPasswordField");if(field)field.hidden=!signup;if(confirm)confirm.hidden=!signup;$("#accountLogin").hidden=signup;$("#accountCreate").hidden=!signup;$("#accountRegister").hidden=signup;$("#accountBackToLogin").hidden=!signup;$("#accountPassword").setAttribute("autocomplete",signup?"new-password":"current-password");accountMessage(signup?"Create your NASFLIX account using your full name, email and password twice.":"Log in with your email and password.");}
$("#accountLoginHeader")?.addEventListener("click",()=>{guestMode=false;setAccountFormMode("login");$("#welcomeGate").hidden=false;$("#accountEmail").focus();});
$("#accountLogin")?.addEventListener("click",()=>accountAction("login"));
$("#accountRegister")?.addEventListener("click",()=>setAccountFormMode("register"));
$("#accountCreate")?.addEventListener("click",()=>accountAction("register"));
$("#accountBackToLogin")?.addEventListener("click",()=>setAccountFormMode("login"));
$("#forgotPassword")?.addEventListener("click",async()=>{const email=$("#accountEmail").value.trim();if(!email){accountMessage("Enter your email first.");$("#accountEmail").focus();return;}try{const result=await accountRequest("forgot-password",{email});accountMessage(result.message);}catch(e){accountMessage(e.message);}});
$("#resetPasswordSubmit")?.addEventListener("click",async()=>{const token=new URLSearchParams(location.search).get("reset"),password=$("#resetNewPassword").value;if(!token){accountMessage("Reset link is missing.");return;}try{const result=await accountRequest("reset-password",{token,password});$("#resetPasswordBox").hidden=true;history.replaceState({},"",location.pathname);accountMessage(result.message);}catch(e){accountMessage(e.message);}});
if(new URLSearchParams(location.search).has("reset")){$("#resetPasswordBox").hidden=false;accountMessage("Enter a new password to reset your account.");}else{$("#resetPasswordBox").hidden=true;}
$("#accountLogoutHeader")?.addEventListener("click",async()=>{try{await accountRequest("logout",{});accountUser=null;userPlaylists=[];guestMode=false;const admin=$("#adminModal");if(admin){admin.classList.remove("open");admin.setAttribute("aria-hidden","true");}const adminKey=$("#adminToken");if(adminKey)adminKey.value="";renderUserPlaylists();await refreshAccount();}catch(e){accountMessage(e.message);}});
function closePlaylistCreate(){const modal=$("#playlistCreateModal");if(modal)modal.hidden=true;}
function createPlaylistNow(){if(!accountUser){accountMessage("Log in to create synced playlists.");return;}const input=$("#newPlaylistName"),name=input.value.trim();if(!name){input.focus();return;}if(userPlaylists.some(p=>p.name.toLowerCase()===name.toLowerCase())){input.setCustomValidity("That playlist name already exists.");input.reportValidity();return;}const p={id:"pl-"+crypto.randomUUID(),name,trackIds:[]};userPlaylists.push(p);activePlaylistId=p.id;viewingPlaylistId="";input.value="";closePlaylistCreate();renderUserPlaylists();schedulePlaylistSync();}
$("#createPlaylist")?.addEventListener("click",()=>{if(!accountUser){accountMessage("Log in to create synced playlists.");$("#accountLoginHeader")?.click();return;}const modal=$("#playlistCreateModal");if(modal)modal.hidden=false;$("#newPlaylistName")?.focus();});
$("#confirmCreatePlaylist")?.addEventListener("click",createPlaylistNow);
$("#newPlaylistName")?.addEventListener("keydown",e=>{if(e.key==="Enter")createPlaylistNow();});
document.querySelectorAll("[data-close-playlist-create]").forEach(el=>el.addEventListener("click",closePlaylistCreate));
$("#playlistPickerClose")?.addEventListener("click",closePlaylistPicker);
$("#playlistPicker")?.addEventListener("click",e=>{if(e.target.id==="playlistPicker")closePlaylistPicker();});
document.addEventListener("click",e=>{
 const add=e.target.closest("[data-add-playlist]");if(add){e.preventDefault();e.stopPropagation();addTrackToPlaylist(add.dataset.addPlaylist);return;}
 const choose=e.target.closest("[data-choose-playlist]");if(choose){const p=userPlaylists.find(x=>x.id===choose.dataset.choosePlaylist);if(p&&pendingPlaylistTrackId){if(!p.trackIds.includes(pendingPlaylistTrackId))p.trackIds.push(pendingPlaylistTrackId);activePlaylistId=p.id;renderUserPlaylists();schedulePlaylistSync();accountMessage("Song added to "+p.name+".");}closePlaylistPicker();return;}
 const open=e.target.closest("[data-open-playlist]");if(open){activePlaylistId=open.dataset.openPlaylist;viewingPlaylistId=activePlaylistId;renderUserPlaylists();return;}
 const play=e.target.closest("[data-play-playlist]");if(play){viewingPlaylistId=play.dataset.playPlaylist;playUserPlaylist(false);return;}
 const shuffle=e.target.closest("[data-shuffle-playlist]");if(shuffle){viewingPlaylistId=shuffle.dataset.shufflePlaylist;playUserPlaylist(true);return;}
 const playTrack=e.target.closest("[data-play-track]");if(playTrack){const item=items.find(x=>String(x.id)===playTrack.dataset.playTrack);if(item)openMusicPlayer(item.id,true,"","All Albums",false,[item]);return;}
 const closePlaylist=e.target.closest("[data-close-playlist]");if(closePlaylist){viewingPlaylistId="";renderUserPlaylists();return;}
 const remove=e.target.closest("[data-remove-playlist-track]");if(remove){const p=userPlaylists.find(x=>x.id===remove.dataset.removePlaylistTrack);if(p){p.trackIds=p.trackIds.filter(id=>id!==remove.dataset.trackId);renderUserPlaylists();schedulePlaylistSync();}return;}
 const del=e.target.closest("[data-delete-playlist]");if(del){userPlaylists=userPlaylists.filter(p=>p.id!==del.dataset.deletePlaylist);if(activePlaylistId===del.dataset.deletePlaylist)activePlaylistId="";if(viewingPlaylistId===del.dataset.deletePlaylist)viewingPlaylistId="";renderUserPlaylists();schedulePlaylistSync();}
});

function card(x){const yt=youtubeId(x.url);const thumb=x.poster_url||x.thumbnail||(yt?`https://img.youtube.com/vi/${yt}/hqdefault.jpg`:"");const title=x.displayTitle||x.title;const saved=offlineItems.some(s=>String(s.id)===String(x.id));return `<article class="media-card" data-id="${x.id}"><div class="poster" style="--c1:${x.c1||"#4c1d95"};--c2:${x.c2||"#111827"}">${thumb?`<img class="poster-thumb" src="${esc(thumb)}" alt="${esc(title)} thumbnail" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`:""}<span class="card-type">${esc(x.type)}</span><span class="poster-art">${thumb?"":esc(x.art||"✦")}</span><div><span class="poster-label">${x.episodeCount?`${x.episodeCount} EPISODES`:esc(x.genre||"FEATURED").toUpperCase()}</span></div><span class="play-badge">▶</span></div><h3 class="card-title">${esc(title)}</h3><p class="card-meta">${esc(x.type)} · ${esc(x.genre||"Entertainment")}</p><button class="offline-save-chip" type="button" data-offline-save="${esc(x.id)}">${saved?"✓ Saved offline":"↓ Save offline"}</button></article>`}
function track(x){const saved=offlineItems.some(s=>String(s.id)===String(x.id));return `<div class="track"><div class="track-cover"><img src="${esc(musicArtwork(x))}" alt="${esc(x.title)} artwork" loading="lazy"></div><div class="track-info"><b>${esc(x.title)}</b><small>${esc(x.artist||"Unknown artist")} · ${esc(x.genre||"Music")}</small></div><button data-track="${x.id}">▶ Listen</button><button class="track-playlist-add" type="button" data-add-playlist="${esc(x.id)}" title="Add to playlist">＋</button><button class="track-save" type="button" data-offline-save="${esc(x.id)}">${saved?"✓":"↓"}</button></div>`}
function esc(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function musicArtwork(item){
 const uploaded=item?.poster_url||item?.thumbnail;if(uploaded)return uploaded;
 const title=String(item?.title||"NASFLIX MUSIC"),artist=String(item?.artist||"Music");
 let hash=0;for(const ch of title+"|"+artist)hash=(hash*31+ch.charCodeAt(0))>>>0;
 const palettes=[["#6d28d9","#db2777"],["#0e7490","#7c3aed"],["#be185d","#7c3aed"],["#4338ca","#c026d3"],["#0f766e","#9333ea"]];
 const colors=palettes[hash%palettes.length],initials=title.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase();
 const shortTitle=title.length>27?title.slice(0,25)+"…":title;
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><defs><linearGradient id="g"><stop stop-color="'+colors[0]+'"/><stop offset="1" stop-color="'+colors[1]+'"/></linearGradient></defs><rect width="512" height="512" rx="48" fill="url(#g)"/><circle cx="420" cy="90" r="180" fill="#fff" opacity=".12"/><path d="M350 70v190a58 58 0 1 1-28-49V130l120-30v130a58 58 0 1 1-28-49V70z" fill="#fff" opacity=".22"/><text x="42" y="300" fill="#fff" font-family="Arial,sans-serif" font-size="108" font-weight="800">'+esc(initials||"♫")+'</text><text x="44" y="390" fill="#fff" font-family="Arial,sans-serif" font-size="25" font-weight="700">'+esc(shortTitle)+'</text><text x="44" y="430" fill="#fff" font-family="Arial,sans-serif" font-size="19">'+esc(artist.slice(0,32))+'</text></svg>';
 return "data:image/svg+xml;charset=UTF-8,"+encodeURIComponent(svg);
}
function internetArchiveId(value){try{const u=new URL(value);if(u.hostname==="archive.org"||u.hostname==="www.archive.org"){const parts=u.pathname.split("/").filter(Boolean);if((parts[0]==="details"||parts[0]==="embed")&&parts[1])return parts[1];}}catch{}return "";}
function youtubeId(value){try{const u=new URL(value);if(u.hostname==="youtu.be")return u.pathname.split("/").filter(Boolean)[0]||"";if(u.hostname==="youtube.com"||u.hostname.endsWith(".youtube.com")){const v=u.searchParams.get("v");if(v)return v;const parts=u.pathname.split("/").filter(Boolean);if(parts[0]==="embed"||parts[0]==="shorts")return parts[1]||"";}}catch{}return "";}
function dropboxRawUrl(value){try{const u=new URL(value);if(u.hostname==="www.dropbox.com"||u.hostname==="dropbox.com"){u.searchParams.delete("dl");u.searchParams.set("raw","1");return u.toString();}}catch{}return value;}
function googleDriveId(value){try{const u=new URL(value);if(u.hostname==="drive.google.com"||u.hostname==="www.drive.google.com"){const parts=u.pathname.split("/").filter(Boolean);if(parts[0]==="file"&&parts[1]==="d")return parts[2]||"";return u.searchParams.get("id")||"";}}catch{}return "";} 
function isDirectMedia(value){if(String(value||"").startsWith("/api/file/"))return true;try{const path=new URL(value).pathname.toLowerCase();return [".mp4",".webm",".mp3",".ogg",".m4a",".wav"].some(ext=>path.endsWith(ext));}catch{return false;}}
function renderEpisodeNav(current){
  const box=$("#seriesEpisodes");
  if(current.type!=="Series"){box.hidden=true;box.innerHTML="";return;}
  const episodes=items.filter(e=>e.type==="Series"&&String(e.seriesTitle||e.title||"").trim().toLowerCase()===String(current.seriesTitle||current.title).trim().toLowerCase()).sort((a,b)=>(Number(a.seasonNumber)||1)-(Number(b.seasonNumber)||1)||(Number(a.episodeNumber)||0)-(Number(b.episodeNumber)||0));
  const index=episodes.findIndex(e=>String(e.id)===String(current.id));
  box.hidden=false;
  box.innerHTML=`<div class="episode-heading"><div><p class="eyebrow">CONTINUE THE STORY</p><h3>${esc(current.seriesTitle)}</h3></div><small>${episodes.length} episodes</small></div>${episodes.map((ep,i)=>`<button class="episode-row ${String(ep.id)===String(current.id)?"current":""}" data-episode-id="${esc(ep.id)}"><span class="episode-number">${Number(ep.seasonNumber)||1}.${Number(ep.episodeNumber)||i+1}</span><span class="episode-copy"><b>${esc(ep.episodeTitle||ep.title)}</b><small>Season ${Number(ep.seasonNumber)||1} · Episode ${Number(ep.episodeNumber)||i+1}</small></span><span class="episode-play">${String(ep.id)===String(current.id)?"NOW PLAYING":"▶"}</span></button>`).join("")}<div class="episode-nav-buttons"><button type="button" data-episode-id="${episodes[index-1]?.id||""}" ${index<=0?"disabled":""}>← Previous</button><button type="button" data-episode-id="${episodes[index+1]?.id||""}" ${index>=episodes.length-1?"disabled":""}>Next Episode →</button></div>`;
}
let activeMusicAudio=null,activeMusicContext=null,activeMusicAnalyser=null,activeMusicSource=null,musicVisualFrame=0,nativeMusicPoll=null;
// Android/Chrome lock-screen and notification media controls
function updateMediaSession(item,mediaElement,handlers={}){
  if(!("mediaSession" in navigator))return;
  try{
    if("MediaMetadata" in window){
      const artwork=item.poster_url||item.thumbnail||"";
      const artworkList=[];
      if(artwork){try{artworkList.push({src:new URL(artwork,location.href).href,sizes:"512x512"});}catch{}}
      navigator.mediaSession.metadata=new MediaMetadata({
        title:item.episodeTitle||item.title||"NASFLIX",
        artist:item.artist||item.seriesTitle||item.genre||"NASFLIX",
        album:"NASFLIX",
        artwork:artworkList
      });
    }
  }catch(error){console.warn("NASFLIX media metadata:",error);}
  const actions={
    play:handlers.play||(()=>mediaElement?.play?.()),
    pause:handlers.pause||(()=>mediaElement?.pause?.()),
    previoustrack:handlers.previous||null,
    nexttrack:handlers.next||null,
    seekto:details=>{if(mediaElement&&Number.isFinite(details.seekTime))mediaElement.currentTime=details.seekTime;},
    seekbackward:details=>{if(mediaElement)mediaElement.currentTime=Math.max(0,mediaElement.currentTime-(details.seekOffset||10));},
    seekforward:details=>{if(mediaElement&&Number.isFinite(mediaElement.duration))mediaElement.currentTime=Math.min(mediaElement.duration,mediaElement.currentTime+(details.seekOffset||10));}
  };
  for(const [action,handler] of Object.entries(actions)){
    try{navigator.mediaSession.setActionHandler(action,handler);}catch(error){console.debug("Media action not supported:",action);}
  }
  try{navigator.mediaSession.playbackState=mediaElement&&!mediaElement.paused?"playing":"paused";}catch{}
}
function clearMediaSession(){
  if(!("mediaSession" in navigator))return;
  try{navigator.mediaSession.playbackState="none";}catch{}
  try{navigator.mediaSession.metadata=null;}catch{}
  ["play","pause","previoustrack","nexttrack","seekto","seekbackward","seekforward"].forEach(action=>{
    try{navigator.mediaSession.setActionHandler(action,null);}catch{}
  });
}
function stopCurrentMedia(stopNative=true){
  const screen=$("#playerScreen");
  try{window.NasflixAndroid?.setVideoPlaying(false);}catch{}
  const video=screen?.querySelector("video");
  if(video){try{video.pause();video.removeAttribute("src");video.load();}catch{}}
  const frame=screen?.querySelector("iframe");
  if(frame){try{frame.src="about:blank";}catch{}}
  if(nativeMusicPoll){clearInterval(nativeMusicPoll);nativeMusicPoll=null;}
  if(stopNative&&window.NasflixAndroid?.stop){try{window.NasflixAndroid.stop();}catch{}}
  if(activeMusicAudio){
    try{activeMusicAudio.pause();activeMusicAudio.currentTime=0;activeMusicAudio.removeAttribute("src");activeMusicAudio.load();}catch{}
    activeMusicAudio=null;
  }
  try{activeMusicSource?.disconnect();}catch{}
  try{activeMusicAnalyser?.disconnect();}catch{}
  activeMusicSource=null;activeMusicAnalyser=null;
  if(musicVisualFrame){cancelAnimationFrame(musicVisualFrame);musicVisualFrame=0;}
  clearMediaSession();
}
function updateMediaPlaybackState(state){
  if("mediaSession" in navigator){try{navigator.mediaSession.playbackState=state;}catch{}}
}

async function openPlayer(id){const x=items.find(i=>String(i.id)===String(id));if(!x)return;document.body.classList.remove("music-player-minimized");if(x.type!=="Music"&&x.remote)trackEngagement(id,"view");const openingNativeMusic=x.type==="Music"&&x.url&&isDirectMedia(x.url)&&!!window.NasflixAndroid?.playQueue;stopCurrentMedia(!openingNativeMusic);if(x.type==="Music"&&x.url&&isDirectMedia(x.url)){openMusicPlayer(id,true,x.artist||"");return;}if(activeMusicAudio){activeMusicAudio.pause();activeMusicAudio=null;}if(musicVisualFrame)cancelAnimationFrame(musicVisualFrame);$("#playerType").textContent=x.type.toUpperCase()+" · "+(x.genre||"FEATURED");$("#playerTitle").textContent=x.seriesTitle?(x.episodeTitle||x.title):x.title;$("#playerDescription").textContent=x.description||"Enjoy this featured title.";const link=$("#downloadLink");if(x.url&&x.download){link.href=dropboxRawUrl(x.url);link.hidden=false}else{link.hidden=true}const saveBtn=$("#saveOfflinePlayer");if(saveBtn){saveBtn.dataset.id=String(x.id);saveBtn.dataset.offlineSave=String(x.id);saveBtn.textContent=offlineItems.some(s=>String(s.id)===String(x.id))?"✓ Saved offline":"↓ Save offline";}const yt=youtubeId(x.url);const archiveId=internetArchiveId(x.url);const driveId=googleDriveId(x.url);let playbackUrl=dropboxRawUrl(x.url);const savedOffline=offlineItems.find(s=>String(s.id)===String(x.id));if(savedOffline){try{const cache=await caches.open(OFFLINE_CACHE_NAME);const cached=await cache.match(savedOffline.url);if(!cached)throw new Error("Saved file is missing from offline storage.");playbackUrl=URL.createObjectURL(await cached.blob());}catch(error){alert("Cannot play saved video offline: "+error.message);return;}}const screen=$("#playerScreen");screen.classList.remove("music-mode");screen.innerHTML=yt?'<button class="youtube-preview" type="button" data-youtube-start="'+yt+'" aria-label="Play video"><img src="'+esc(x.poster_url||x.thumbnail||("https://img.youtube.com/vi/"+yt+"/hqdefault.jpg"))+'" alt=""><span class="youtube-preview-play">▶</span></button>':archiveId?'<iframe src="https://archive.org/embed/'+encodeURIComponent(archiveId)+'" title="'+esc(x.title)+'" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe><button class="player-fullscreen" type="button" aria-label="Fullscreen">⛶</button>':driveId?'<iframe src="https://drive.google.com/file/d/'+driveId+'/preview" title="'+esc(x.title)+'" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe><button class="player-fullscreen" type="button" aria-label="Fullscreen">⛶</button>':x.url&&isDirectMedia(x.url)?'<video controls playsinline preload="metadata" src="'+esc(playbackUrl)+'"></video><button class="player-fullscreen" type="button" aria-label="Fullscreen">⛶</button>':'<div class="play-symbol">▶</div><p>'+(x.url?"This link may not be a direct playable media file. Open the original link below.":"No media URL has been added yet.")+'</p>'+(x.url?'<a href="'+esc(x.url)+'" target="_blank" rel="noopener">Open media link</a>':"");const video=screen.querySelector("video");if(video){video.autoplay=false;video.removeAttribute("autoplay");video.pause();}const frame=screen.querySelector("iframe");if(frame)frame.addEventListener("load",()=>screen.querySelector(".player-loading")?.remove(),{once:true});
 if(video){
   updateMediaSession(x,video);
   video.addEventListener("play",()=>{updateMediaPlaybackState("playing");updateMediaSession(x,video);try{window.NasflixAndroid?.setVideoPlaying(true);}catch{}});
   video.addEventListener("pause",()=>{updateMediaPlaybackState("paused");try{window.NasflixAndroid?.setVideoPlaying(false);}catch{}});
   video.addEventListener("ended",()=>{updateMediaPlaybackState("none");try{window.NasflixAndroid?.setVideoPlaying(false);}catch{}});
 }
 syncMiniPlayer(x);renderEpisodeNav(x);$("#playerModal").classList.remove("minimized");$("#playerModal").classList.add("open");$("#playerModal").setAttribute("aria-hidden","false");$("#miniPlayerTitle").textContent=$("#playerTitle").textContent||"Now playing";}
async function openMusicPlayer(id,shouldPlay=true,artistFilter="",albumFilter="All Albums",shuffleQueue=false,queueOverride=null){
 document.body.classList.remove("music-player-minimized");
 const offlineQueueMode=offlineItems.some(s=>String(s.id)===String(id));
 if(!offlineQueueMode)trackEngagement(id,"listen");
 const queue=Array.isArray(queueOverride)?[...queueOverride]:(offlineQueueMode?offlineItems.filter(x=>x.type==="Music"&&x.url&&(!artistFilter||String(x.artist||"").trim()===artistFilter)&&(albumFilter==="All Albums"||(String(x.albumTitle||"").trim()||"Singles")===albumFilter)):items.filter(x=>x.type==="Music"&&x.url&&isDirectMedia(x.url)&&(!artistFilter||String(x.artist||"").trim()===artistFilter)&&(albumFilter==="All Albums"||(String(x.albumTitle||"").trim()||"Singles")===albumFilter)));if(shuffleQueue){for(let i=queue.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[queue[i],queue[j]]=[queue[j],queue[i]];}}if(offlineQueueMode){try{window.NasflixAndroid?.stop();}catch{}}let index=queue.findIndex(x=>String(x.id)===String(id));if(index<0)return;const x=queue[index];const screen=$("#playerScreen");screen.classList.add("music-mode");
 if(activeMusicAudio){activeMusicAudio.pause();activeMusicAudio=null;}if(musicVisualFrame)cancelAnimationFrame(musicVisualFrame);
 $("#playerType").textContent="NOW PLAYING · MUSIC";$("#playerTitle").textContent=x.title;syncMiniPlayer(x);$("#playerDescription").textContent=x.description||"Enjoy the music.";const link=$("#downloadLink");if(x.download){link.href=x.url;link.hidden=false}else link.hidden=true;const saveBtn=$("#saveOfflinePlayer");if(saveBtn){saveBtn.dataset.id=String(x.id);saveBtn.dataset.offlineSave=String(x.id);saveBtn.textContent=offlineItems.some(s=>String(s.id)===String(x.id))?"✓ Saved offline":"↓ Save offline";}
 screen.innerHTML='<div class="nas-music-player"><div class="music-visual-stage"><img class="music-visual-art" id="musicVisualArt" src="'+esc(musicArtwork(x))+'" alt="'+esc(x.title)+' artwork"><canvas class="music-visualizer" id="musicVisualizer" aria-label="Audio visualizer"></canvas></div><div class="music-live"><span></span> NOW PLAYING</div><div class="music-track-name" id="musicTrackName">'+esc(x.title)+'</div><div class="music-track-genre" id="musicTrackGenre">'+esc(x.genre||"Music")+'</div><audio id="nasMusicAudio" preload="metadata"></audio><div class="music-progress-row"><span id="musicCurrent">0:00</span><input id="musicSeek" type="range" min="0" max="1000" value="0" aria-label="Seek music"><span id="musicDuration">0:00</span></div><div class="music-controls"><button type="button" id="musicPrevious" aria-label="Previous track">⏮</button><button type="button" id="musicPlayPause" class="music-play" aria-label="Play">▶</button><button type="button" id="musicNext" aria-label="Next track">⏭</button></div><div class="music-bottom"><span>NASFLIX AUDIO</span><label>VOL <input id="musicVolume" type="range" min="0" max="1" step=".01" value=".85"></label></div><div class="music-queue-label" id="musicQueueLabel">TRACK '+(index+1)+' OF '+queue.length+'</div></div>';
 const audio=$("#nasMusicAudio"),seek=$("#musicSeek"),play=$("#musicPlayPause"),canvas=$("#musicVisualizer"),ctx=canvas.getContext("2d");activeMusicAudio=audio;audio.volume=.85;if(!window.NasflixAndroid?.playQueue||offlineQueueMode)audio.src=x.url;
 function time(t){if(!Number.isFinite(t))return"0:00";return Math.floor(t/60)+":"+String(Math.floor(t%60)).padStart(2,"0");}
 async function loadTrack(nextIndex,playNow){index=(nextIndex+queue.length)%queue.length;const track=queue[index];$("#playerTitle").textContent=track.title;syncMiniPlayer(track);$("#musicTrackName").textContent=track.title;$("#musicTrackGenre").textContent=track.genre||"Music";const visualArt=$("#musicVisualArt");if(visualArt){const art=musicArtwork(track);visualArt.hidden=false;visualArt.src=art;}$("#musicQueueLabel").textContent="TRACK "+(index+1)+" OF "+queue.length;if(window.NasflixAndroid?.playQueue&&!offlineQueueMode){const nativeQueue=queue.map(t=>({url:new URL(t.url,location.href).href,title:t.title,artist:t.artist||t.genre||"NASFLIX",artwork:musicArtwork(t)}));window.NasflixAndroid.playQueue(JSON.stringify(nativeQueue),index,!!playNow);play.textContent=playNow?"Ⅱ":"▶";play.setAttribute("aria-label",playNow?"Pause":"Play");}else{if(offlineQueueMode){const saved=offlineItems.find(s=>String(s.id)===String(track.id));const cache=await caches.open(OFFLINE_CACHE_NAME);const response=saved?await cache.match(saved.url):null;if(!response){alert("This music file is not available in offline storage. Save it again while online.");return;}audio.src=URL.createObjectURL(await response.blob());}else audio.src=track.url;audio.load();updateMediaSession(track,audio,{play:()=>{if(activeMusicContext?.state==="suspended")activeMusicContext.resume();audio.play().catch(()=>{});},pause:()=>audio.pause(),previous:()=>loadTrack(index-1,true),next:()=>loadTrack(index+1,true)});}
  seek.value=0;$("#musicCurrent").textContent="0:00";$("#musicDuration").textContent="0:00";const dl=$("#downloadLink");if(track.download){dl.href=track.url;dl.hidden=false}else dl.hidden=true;if(playNow&&(!window.NasflixAndroid?.playQueue||offlineQueueMode))audio.play().then(()=>{play.textContent="Ⅱ";play.setAttribute("aria-label","Pause");}).catch(()=>{play.textContent="▶";});else{play.textContent=playNow?"Ⅱ":"▶";play.setAttribute("aria-label",playNow?"Pause":"Play");}}
 loadTrack(index,!!(shouldPlay&&window.NasflixAndroid?.playQueue&&!offlineQueueMode));
  function resizeCanvas(){const dpr=Math.min(window.devicePixelRatio||1,2),w=canvas.clientWidth,h=canvas.clientHeight;canvas.width=Math.max(1,Math.floor(w*dpr));canvas.height=Math.max(1,Math.floor(h*dpr));ctx.setTransform(dpr,0,0,dpr,0,0);}window.addEventListener("resize",resizeCanvas,{passive:true});
 if(!window.NasflixAndroid?.playQueue||offlineQueueMode){try{const AC=window.AudioContext||window.webkitAudioContext;if(AC){if(!activeMusicContext)activeMusicContext=new AC();activeMusicAnalyser=activeMusicContext.createAnalyser();activeMusicAnalyser.fftSize=128;activeMusicAnalyser.smoothingTimeConstant=.82;activeMusicSource=activeMusicContext.createMediaElementSource(audio);activeMusicSource.connect(activeMusicAnalyser);activeMusicAnalyser.connect(activeMusicContext.destination);}}catch(e){activeMusicAnalyser=null;}}
 const bins=activeMusicAnalyser?new Uint8Array(activeMusicAnalyser.frequencyBinCount):null;
 function draw(){musicVisualFrame=requestAnimationFrame(draw);const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;ctx.clearRect(0,0,w,h);const count=48,gap=3,bw=(w-gap*(count-1))/count;if(bins)activeMusicAnalyser.getByteFrequencyData(bins);for(let n=0;n<count;n++){let v=bins?bins[Math.floor(n/count*bins.length)]/255:(.12+Math.abs(Math.sin(Date.now()/270+n*.47))*.28);if(audio.paused)v*=.28;const bh=Math.max(4,v*(h*.82));const grad=ctx.createLinearGradient(0,h-bh,0,h);grad.addColorStop(0,"#e879f9");grad.addColorStop(1,"#7c3aed");ctx.fillStyle=grad;ctx.beginPath();ctx.roundRect(n*(bw+gap),h-bh,bw,bh,4);ctx.fill();}}
 $("#musicPrevious").addEventListener("click",()=>loadTrack(index-1,true));$("#musicNext").addEventListener("click",()=>loadTrack(index+1,true));
 play.addEventListener("click",()=>{if(window.NasflixAndroid?.play){if(window.NasflixAndroid.isPlaying()){window.NasflixAndroid.pause();play.textContent="▶";play.setAttribute("aria-label","Play");}else{window.NasflixAndroid.play();play.textContent="Ⅱ";play.setAttribute("aria-label","Pause");}return;}if(audio.paused){if(activeMusicContext?.state==="suspended")activeMusicContext.resume();audio.play().then(()=>{play.textContent="Ⅱ";play.setAttribute("aria-label","Pause");}).catch(()=>{});}else audio.pause();});
 audio.addEventListener("play",()=>{if(activeMusicContext?.state==="suspended")activeMusicContext.resume();play.textContent="Ⅱ";play.setAttribute("aria-label","Pause");updateMediaPlaybackState("playing");updateMediaSession(queue[index],audio,{play:()=>audio.play().catch(()=>{}),pause:()=>audio.pause(),previous:()=>loadTrack(index-1,true),next:()=>loadTrack(index+1,true)});});audio.addEventListener("pause",()=>{play.textContent="▶";play.setAttribute("aria-label","Play");updateMediaPlaybackState("paused");});
 audio.addEventListener("ended",()=>loadTrack(index+1,true));audio.addEventListener("loadedmetadata",()=>{$("#musicDuration").textContent=time(audio.duration);});audio.addEventListener("timeupdate",()=>{
  if(Number.isFinite(audio.duration)&&audio.duration>0){
    seek.value=String(Math.round(audio.currentTime/audio.duration*1000));$("#musicCurrent").textContent=time(audio.currentTime);
    if("mediaSession" in navigator&&navigator.mediaSession.setPositionState){try{navigator.mediaSession.setPositionState({duration:audio.duration,playbackRate:audio.playbackRate,position:audio.currentTime});}catch{}}
  }
 });
 seek.addEventListener("input",()=>{if(window.NasflixAndroid?.seekTo){const duration=Number(window.NasflixAndroid.getDuration());window.NasflixAndroid.seekTo(Math.round((Number(seek.value)/1000)*duration));}else if(Number.isFinite(audio.duration)&&audio.duration>0)audio.currentTime=(Number(seek.value)/1000)*audio.duration;});$("#musicVolume").addEventListener("input",e=>{const v=Number(e.target.value);if(window.NasflixAndroid?.setVolume)window.NasflixAndroid.setVolume(v);else audio.volume=v;});
 if(window.NasflixAndroid?.getCurrentPosition){nativeMusicPoll=setInterval(()=>{const duration=Number(window.NasflixAndroid.getDuration()),position=Number(window.NasflixAndroid.getCurrentPosition());if(duration>0){seek.value=String(Math.round(position/duration*1000));$("#musicCurrent").textContent=time(position/1000);$("#musicDuration").textContent=time(duration/1000);}const active=window.NasflixAndroid.isPlaying();play.textContent=active?"Ⅱ":"▶";play.setAttribute("aria-label",active?"Pause":"Play");const status=$("#musicTrackGenre");if(status&&!status.textContent.trim())status.textContent="Music";},500);}
 renderEpisodeNav(x);$("#playerModal").classList.remove("minimized");$("#playerModal").classList.add("open");$("#playerModal").setAttribute("aria-hidden","false");$("#miniPlayerTitle").textContent=$("#playerTitle").textContent||"Now playing";requestAnimationFrame(()=>{resizeCanvas();draw();});if(shouldPlay&&(!window.NasflixAndroid?.playQueue||offlineQueueMode)){if(activeMusicContext?.state==="suspended")activeMusicContext.resume();audio.play().catch(()=>{play.textContent="▶";});}
}

function syncMiniPlayer(track){
 const title=track?.title||$("#playerTitle")?.textContent||"Now playing";
 const artist=track?.artist||track?.genre||"NASFLIX MUSIC";
 const art=track?musicArtwork(track):"";
 const a=$("#miniPlayerArt");if(a&&art)a.src=art;
 const t=$("#miniPlayerTitle");if(t)t.textContent=title;
 const ar=$("#miniPlayerArtist");if(ar)ar.textContent=artist;
}
function minimizePlayer(){
  const modal=$("#playerModal");
  if(!modal.classList.contains("open"))return;
  document.body.classList.add("music-player-minimized");
  $("#miniPlayerTitle").textContent=$("#playerTitle").textContent||"Now playing";
  modal.classList.add("minimized");
  modal.setAttribute("aria-label","Mini player. Playback continues while you browse.");
}
function restorePlayer(){
  const modal=$("#playerModal");
  document.body.classList.remove("music-player-minimized");
  modal.classList.remove("minimized");
  $("#miniPlayerTitle").textContent=$("#playerTitle").textContent||"Now playing";
}
$("#playerMinimize")?.addEventListener("click",minimizePlayer);
$("#playerRestore")?.addEventListener("click",e=>{e.stopPropagation();restorePlayer();});
$("#miniPlayerBar")?.addEventListener("click",e=>{
 if(e.target.closest("#miniPlayerToggle"))return;
 restorePlayer();
});
$("#miniPlayerToggle")?.addEventListener("click",()=>{
 const audio=$("#nasMusicAudio"),video=$("#playerScreen video");
 if(window.NasflixAndroid?.isPlaying&&window.NasflixAndroid?.play){if(window.NasflixAndroid.isPlaying())window.NasflixAndroid.pause();else window.NasflixAndroid.play();return;}
 if(audio){const play=$("#musicPlayPause");if(play)play.click();return;}
 if(video){if(video.paused)video.play().catch(()=>{});else video.pause();}
});
function syncMiniProgress(){const seek=$("#musicSeek"),bar=$("#miniPlayerProgress");if(seek&&bar)bar.style.width=(Number(seek.value)/10)+"%";}
document.addEventListener("input",e=>{if(e.target?.id==="musicSeek")syncMiniProgress();});
document.addEventListener("timeupdate",syncMiniProgress,true);
$("#playerScreen")?.addEventListener("click",e=>{
  if($("#playerModal").classList.contains("minimized")&&!e.target.closest("video,iframe,button,a"))restorePlayer();
});
function closeModal(id){const el=$("#"+id+"Modal");if(!el)return;if(id==="player"){document.body.classList.remove("music-player-minimized");stopCurrentMedia(true);}el.classList.remove("open","minimized");el.setAttribute("aria-hidden","true");}
document.querySelectorAll(".cat-chip").forEach(b=>b.addEventListener("click",()=>{activeFilter=b.dataset.filter;render()}));
$("#searchInput")?.addEventListener("input",()=>{musicVisibleCount=10;render();});
$("#searchInput").addEventListener("input",render);

if($("#adminOpen")&&$("#adminModal"))$("#adminOpen").addEventListener("click",()=>{$("#adminModal").classList.add("open");$("#adminModal").setAttribute("aria-hidden","false");});
const menuToggle=$("#menuToggle"),mainNav=$("#mainNav");
function closeNav(){if(!menuToggle||!mainNav)return;menuToggle.setAttribute("aria-expanded","false");menuToggle.setAttribute("aria-label","Open navigation menu");mainNav.classList.remove("open");}
menuToggle?.addEventListener("click",()=>{const open=menuToggle.getAttribute("aria-expanded")!=="true";menuToggle.setAttribute("aria-expanded",String(open));menuToggle.setAttribute("aria-label",open?"Close navigation menu":"Open navigation menu");mainNav.classList.toggle("open",open);});
// Context-aware bottom navigation: video library tabs vs music library tabs
 const bottomNav=$("#nasBottomNav");
 function renderBottomNav(mode="video"){
   if(!bottomNav)return;
   const entries=mode==="music"
     ? [["home","⌂","Home"],["search","⌕","Search"],["playlists","▤","Your Library"],["music","♫","Music"]]
     : [["home","⌂","Home"],["movie","▣","Movies"],["series","▤","Series"],["video","▷","Videos"]];
   bottomNav.innerHTML=entries.map(([key,icon,label])=>`<button type="button" data-bottom-page="${key}" class="${(mode==="music"?key==="music":key==="home")?"active":""}"><span>${icon}</span><small>${label}</small></button>`).join("");
   bottomNav.querySelectorAll("[data-bottom-page]").forEach(btn=>btn.addEventListener("click",()=>{
     const page=btn.dataset.bottomPage;
     bottomNav.querySelectorAll("button").forEach(b=>b.classList.toggle("active",b===btn));
     if(page==="search"){const input=$("#searchInput");input?.focus();window.scrollTo({top:0,behavior:"smooth"});}
     else if(page==="movie")setMediaTab("Movie");
     else if(page==="series")setMediaTab("Series");
     else if(page==="video")setMediaTab("AI Video");
     else if(page==="music")setMediaTab("Music");
     else showNasflixPage(page);
   }));
 }
 renderBottomNav("video");

function showNasflixPage(page){
  document.body.classList.toggle("music-page",page==="playlists");
  document.body.classList.toggle("video-library-page",page!=="playlists" && page!=="music");
  if(page==="playlists"){
    document.querySelectorAll("[data-page-section]").forEach(section=>section.classList.toggle("page-hidden",section.dataset.pageSection!=="music"));
    $("#accountPlaylistPanel").hidden=false;
    $("#accountPlaylistPanel").scrollIntoView({behavior:"smooth",block:"start"});
    return;
  }
  if(page==="home"){
    document.querySelectorAll("[data-page-section]").forEach(section=>section.classList.toggle("page-hidden",section.dataset.pageSection!=="home"));
    window.scrollTo({top:0,behavior:"smooth"});return;
  }
  setMediaTab(page==="music"?"Music":"Movie");
}
function setMediaTab(type){
  const isMusic=type==="Music";
  document.body.classList.toggle("music-page",isMusic);
  document.body.classList.toggle("video-library-page",!isMusic);
  renderBottomNav(isMusic?"music":"video");
  document.querySelectorAll("[data-page-section]").forEach(section=>section.classList.toggle("page-hidden",isMusic?section.dataset.pageSection!=="music":section.dataset.pageSection!=="movies"));
  $("#quickCats")?.classList.toggle("page-hidden",isMusic);
  activeFilter=isMusic?"All":type==="Movie"?"Movie":type==="Series"?"Series":type==="AI Video"?"AI Video":"All";
  if(isMusic){activeMusicArtist="All Artists";activeMusicAlbum="All Albums";musicVisibleCount=10;musicBatchLoading=false;}
  document.querySelectorAll(".media-tab").forEach(tab=>tab.classList.toggle("active",tab.dataset.mediaTab===type));
  render();
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll("[data-media-tab]").forEach(tab=>tab.addEventListener("click",()=>setMediaTab(tab.dataset.mediaTab)));
setMediaTab("Movie");
mainNav?.querySelectorAll("a").forEach(link=>link.addEventListener("click",event=>{
  if(link.id==="deviceHelpOpen"){
    event.preventDefault();
    if(window.NasflixAndroid?.openBackgroundBatterySettings){window.NasflixAndroid.openBackgroundBatterySettings();}
    else {const modal=$("#deviceHelp");if(modal){modal.hidden=false;document.body.classList.add("device-help-open");}}
    closeNav();
    return;
  }
  const page=link.dataset.page,filter=link.dataset.menuFilter;
  if(page){event.preventDefault();showNasflixPage(page);}
  else if(filter){event.preventDefault();setMediaTab(filter==="Music"?"Music":filter==="Series"?"Series":filter==="AI Video"?"AI Video":"Movie");if(!["Music","Series","AI Video","Movie"].includes(filter)){activeFilter=filter;render();}}
  closeNav();
}));

document.addEventListener("keydown",e=>{if(e.key==="Escape")closeNav();});
document.addEventListener("click",e=>{const start=e.target.closest("[data-youtube-start]");if(!start)return;const id=start.dataset.youtubeStart;const screen=$("#playerScreen");if(!screen||!id)return;screen.innerHTML='<iframe src="https://www.youtube-nocookie.com/embed/'+encodeURIComponent(id)+'?autoplay=1&rel=0" title="Video player" allow="autoplay; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe><button class="player-fullscreen" type="button" aria-label="Fullscreen">⛶</button>';});
document.addEventListener("click",async e=>{const btn=e.target.closest(".player-fullscreen");if(!btn)return;const screen=$("#playerScreen"),video=screen.querySelector("video"),frame=screen.querySelector("iframe");try{if(document.fullscreenElement){await document.exitFullscreen();return;}if(video){if(typeof video.webkitEnterFullscreen==="function"){video.webkitEnterFullscreen();return;}if(video.requestFullscreen){await video.requestFullscreen();return;}}if(frame?.requestFullscreen){await frame.requestFullscreen();return;}if(screen.requestFullscreen)await screen.requestFullscreen();}catch(error){console.warn("Fullscreen request was blocked by the device WebView.",error);}});
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
async function readMusicTags(file){
 try{
  const head=new Uint8Array(await file.slice(0,10).arrayBuffer());
  if(head.length<10||String.fromCharCode(...head.slice(0,3))!=="ID3")return {};
  const version=head[3],tagSize=(head[6]&127)<<21|(head[7]&127)<<14|(head[8]&127)<<7|(head[9]&127);
  if(![2,3,4].includes(version)||tagSize<=0)return {};
  const bytes=new Uint8Array(await file.slice(10,Math.min(file.size,10+tagSize)).arrayBuffer()),tags={};let offset=0;
  const decode=data=>{if(!data.length)return "";const enc=data[0],body=data.slice(1);try{const label=enc===0?"windows-1252":enc===3?"utf-8":enc===1?"utf-16":enc===2?"utf-16be":"";return label?new TextDecoder(label).decode(body).replace(/\0/g,"").trim():"";}catch{return "";}};
  while(offset+10<=bytes.length){
   const id=String.fromCharCode(...bytes.slice(offset,offset+4));if(!id.trim()||/^\0+$/.test(id))break;
   const size=version===4?((bytes[offset+4]&127)<<21|(bytes[offset+5]&127)<<14|(bytes[offset+6]&127)<<7|(bytes[offset+7]&127)):((bytes[offset+4]<<24)|(bytes[offset+5]<<16)|(bytes[offset+6]<<8)|bytes[offset+7]);
   if(size<=0||offset+10+size>bytes.length)break;
   const key=version===2?({TT2:"title",TP1:"artist",TAL:"album"}[id]):({TIT2:"title",TPE1:"artist",TALB:"album"}[id]);
   if(key&&!tags[key])tags[key]=decode(bytes.slice(offset+10,offset+10+size));offset+=10+size;
  }
  return tags;
 }catch(error){console.warn("Could not read audio tags",error);return {};}
}
function cleanFileTitle(name){return name.replace(/\.[^.]+$/,"").replace(/[._]+/g," ").trim()||name;}
function uploadWithProgress(url,formData,token,onProgress,method="POST"){
  return new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest();const requestMethod=method||"POST";xhr.open(requestMethod,url);xhr.setRequestHeader("authorization","Bearer "+token);
    xhr.upload.addEventListener("progress",event=>{if(event.lengthComputable)onProgress(event.loaded,event.total);});
    xhr.addEventListener("load",()=>{let result={};try{result=JSON.parse(xhr.responseText||"{}");}catch{}if(xhr.status>=200&&xhr.status<300)resolve(result);else reject(new Error(result.error||"Upload failed ("+xhr.status+")."));});
    xhr.addEventListener("error",()=>reject(new Error("Network error. Please try the upload again.")));
    xhr.addEventListener("abort",()=>reject(new Error("Upload cancelled.")));
    xhr.send(formData);
  });
}
async function uploadBulkBatch(kind){
  const music=kind==="music";
  const files=[...(music?$("#bulkMusicFiles"):$("#bulkVideoFiles")).files];
  const artist=(music?$("#bulkMusicArtist").value:$("#bulkVideoArtist").value).trim();
  const poster=(music?$("#bulkMusicPoster"):$("#bulkVideoPoster")).files[0];
  const status=$(music?"#bulkMusicStatus":"#bulkVideoStatus");
  const button=$(music?"#bulkMusicSubmit":"#bulkVideoSubmit");
  const token=$("#adminToken").value.trim();
  if(!token){status.textContent="Enter your Admin access key first.";return;}
  if(!files.length){status.textContent="Choose at least one "+(music?"music":"video")+" file.";return;}
  if(music&&!artist){status.textContent="Enter the artist / singer name.";return;}
  if(poster&&poster.size>5*1024*1024){status.textContent="Shared poster maximum size is 5 MB.";return;}
  const invalid=files.find(file=>file.size>50*1024*1024);
  if(invalid){status.textContent=invalid.name+" is over the 50 MB per-file limit.";return;}
  button.disabled=true;
  let completed=0;
  try{
    for(const file of files){
      const tags=music?await readMusicTags(file):{};
      const title=(music&&tags.title)||cleanFileTitle(file.name);
      const detectedArtist=music?(artist||tags.artist||""):artist;
      const detectedAlbum=music?(tags.album||$("#bulkMusicAlbum").value.trim()):"";
      const form=new FormData();
      const data={title,type:music?"Music":"Movie",genre:music?"Music":"Independent",artist:detectedArtist,albumTitle:detectedAlbum,description:"",url:"",allowDownload:false,seriesTitle:"",seasonNumber:1,episodeNumber:"",episodeTitle:""};
      Object.entries(data).forEach(([key,value])=>form.append(key,String(value)));
      form.append("file",file);
      if(poster&&completed===0)form.append("posterFile",poster);
      status.textContent="Uploading "+(completed+1)+" of "+files.length+": "+title+(tags.title?" · title detected from music tags":" · using filename");
      await uploadWithProgress("/api/media",form,token,(loaded,total)=>{
        const pct=total?Math.round(loaded/total*100):0;
        status.textContent="Uploading "+(completed+1)+" of "+files.length+": "+file.name+" ("+pct+"%)";
      },"POST");
      completed++;
    }
    status.textContent="Done! "+completed+" "+(music?"music tracks":"videos")+" added to NASFLIX.";
    (music?$("#bulkMusicFiles"):$("#bulkVideoFiles")).value="";
    (music?$("#bulkMusicPoster"):$("#bulkVideoPoster")).value="";
    await loadRemote();
  }catch(error){
    status.textContent=completed+" of "+files.length+" uploaded. Stopped at the first error: "+error.message+" You can select the remaining files and retry.";
  }finally{button.disabled=false;}
}
$("#bulkMusicSubmit")?.addEventListener("click",()=>uploadBulkBatch("music"));
$("#bulkVideoSubmit")?.addEventListener("click",()=>uploadBulkBatch("video"));

$("#itemFile")?.addEventListener("change",async e=>{
 const file=e.target.files?.[0];if(!file)return;const status=$("#uploadStatus");
 if(/^audio\//i.test(file.type)||/\.(mp3|m4a|ogg|wav)$/i.test(file.name)){
  const tags=await readMusicTags(file);
  if(tags.title&&!$("#itemTitle").value.trim())$("#itemTitle").value=tags.title;
  if(tags.artist&&!$("#itemArtist").value.trim())$("#itemArtist").value=tags.artist;
  if(tags.album&&!$("#albumTitle").value.trim())$("#albumTitle").value=tags.album;
  status.textContent=tags.title?"Music details detected. You can still edit the title, artist, and album before saving.":"No embedded music title found. You can enter or edit the title manually.";
 }else if(!$("#itemTitle").value.trim())$("#itemTitle").value=cleanFileTitle(file.name);
});
$("#contentForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const token=$("#adminToken").value.trim(),status=$("#uploadStatus"),file=$("#itemFile").files[0],posterFile=$("#posterFile")?.files?.[0],submit=$("#contentSubmit");
  const progress=$("#uploadProgress");
  const item={title:$("#itemTitle").value.trim(),type:$("#itemType").value,genre:$("#itemGenre").value.trim()||"Independent",artist:$("#itemArtist").value.trim(),albumTitle:$("#albumTitle").value.trim(),description:$("#itemDescription").value.trim(),url:$("#itemUrl").value.trim(),allowDownload:$("#itemDownload").checked,seriesTitle:$("#seriesTitle").value.trim(),seasonNumber:Number($("#seasonNumber").value)||1,episodeNumber:Number($("#episodeNumber").value)||null,episodeTitle:$("#episodeTitle").value.trim()};
  if(!token){status.textContent="Enter your admin access key first.";return;}
  if(!item.title){status.textContent="Enter a title.";return;}
  if(!editingId&&file&&file.size>50*1024*1024){status.textContent="Maximum upload size is 50 MB.";return;}if(posterFile&&posterFile.size>5*1024*1024){status.textContent="Poster maximum size is 5 MB.";return;}
  if(!file&&!item.url){status.textContent="Choose a media file or enter a media URL.";return;}
  if(!file&&item.url&&!/^https?:\/\//i.test(item.url)&&!/^\/api\/file\/[a-z0-9-]+$/i.test(item.url)){status.textContent="Enter a valid media URL.";return;}
  submit.disabled=true;submit.textContent=(file||posterFile)?"Uploading…":"Saving…";
  if(progress){progress.hidden=true;progress.classList.remove("done","error");}
  status.textContent=(file||posterFile)?"Preparing secure upload…":"Saving to NASFLIX…";
  try{
    let result;
    if(file||posterFile){
      const form=new FormData();Object.entries(item).forEach(([k,v])=>form.append(k,String(v??"")));if(file)form.append("file",file);if(posterFile)form.append("posterFile",posterFile);
      setUploadProgress(0,"Preparing upload…","Getting your file ready for secure R2 storage.");
      result=await uploadWithProgress(editingId?"/api/media/"+encodeURIComponent(editingId):"/api/media",form,token,(loaded,total)=>{
        const percent=total?loaded/total*100:0;
        setUploadProgress(percent,percent>=100?"Upload sent — saving…":"Uploading files…",Math.round(loaded/1024/1024*10)/10+" MB of "+Math.round(total/1024/1024*10)/10+" MB uploaded. Keep this page open.");
        status.textContent="Uploading to secure R2 storage… "+Math.round(percent)+"%";
      },editingId?"PUT":"POST");
      setUploadProgress(100,"Upload complete!","Your file(s) were stored in R2 successfully.", "done");
    }else{
      const headers={"authorization":"Bearer "+token,"content-type":"application/json"};
      const response=await fetch(editingId?"/api/media/"+encodeURIComponent(editingId):"/api/media",{method:editingId?"PUT":"POST",headers,body:JSON.stringify(item)});
      result=await response.json();if(!response.ok)throw new Error(result.error||"Could not save this item.");
    }
    status.textContent=editingId?"Changes saved successfully!":(file||posterFile)?"Content and poster saved securely!":"Saved permanently to NASFLIX!";
    editingId=null;$("#contentForm").reset();$("#bulkMusicAlbum").value="";$("#adminToken").value=token;$("#contentSubmit").textContent="Save to NASFLIX catalogue +";$("#cancelEdit").hidden=true;
    await loadRemote();
  }catch(error){status.textContent=error.message;if(file||posterFile)setUploadProgress(0,"Upload not completed",error.message,"error");}
  finally{submit.disabled=false;if(submit.textContent==="Uploading…"||submit.textContent==="Saving…")submit.textContent="Save to NASFLIX catalogue +";}
});
async function loadRemote(){
  try{
    const response=await fetch("/api/media");if(!response.ok)throw new Error("Catalogue unavailable offline.");
    const data=await response.json();
    const remote=data.map((x,i)=>({...x,id:x.id,url:x.media_url,download:!!x.allow_download,seriesTitle:x.series_title||"",seasonNumber:x.season_number||1,albumTitle:x.album_title||"",episodeNumber:x.episode_number||null,episodeTitle:x.episode_title||"",remote:true,art:"✦",c1:["#6d28d9","#be185d","#0369a1","#0f766e"][i%4],c2:"#171026"}));
    items=remote;localStorage.setItem("nasflix-catalogue-cache",JSON.stringify(remote));musicBatchLoading=false;render();
  }catch(error){console.warn("NASFLIX media API is not configured yet.",error);try{items=JSON.parse(localStorage.getItem("nasflix-catalogue-cache")||"[]");}catch{items=[];}musicBatchLoading=false;render();}
}
async function trackEngagement(id,kind){try{await fetch("/api/metrics/track",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({id:String(id),kind}),credentials:"same-origin",keepalive:true});}catch{}}
const trendingLists={};function renderTrendingItems(list,target,kind){const box=$(target);if(!box)return;trendingLists[target]=Array.isArray(list)?list:[];const more=$(`[data-see-more="${target.slice(1)}"]`),expanded=box.dataset.expanded==="true",shown=expanded?trendingLists[target]:trendingLists[target].slice(0,4);if(!trendingLists[target].length){box.innerHTML='<p class="trending-empty">Not enough plays yet. Be the first to explore!</p>';if(more)more.hidden=true;return;}box.innerHTML=shown.map((x,i)=>'<article class="trending-card" data-trending-id="'+esc(x.id)+'"><div class="trending-card-art">'+(x.poster_object_key?'<img loading="lazy" src="/api/poster/'+encodeURIComponent(x.id)+'" alt="">':'<span>✦</span>')+'<span class="trending-rank">#'+(i+1)+'</span></div><div class="trending-card-info"><b>'+esc(x.episode_title||x.title)+'</b><small>'+esc(kind==="view"?(x.views||0)+" views":kind==="listen"?(x.listens||0)+" listens":kind==="recent-view"?"Recently viewed":kind==="recent-listen"?"Recently listened":"Recently added")+'</small></div></article>').join("");if(more){more.hidden=trendingLists[target].length<=4;more.textContent=expanded?"Show less":"See more";}box.querySelectorAll("[data-trending-id]").forEach(card=>card.addEventListener("click",()=>openPlayer(card.dataset.trendingId)));}
document.querySelectorAll("[data-see-more]").forEach(button=>button.addEventListener("click",()=>{const target="#"+button.dataset.seeMore,box=$(target);if(!box)return;box.dataset.expanded=box.dataset.expanded!=="true"?"true":"false";const kind=target.includes("mostViewed")?"view":target.includes("mostListened")?"listen":target.includes("recentViewed")?"recent-view":target.includes("recentListened")?"recent-listen":"added";renderTrendingItems(trendingLists[target],target,kind);}));
function renderTrendingPayload(data){renderTrendingItems(data.mostViewed,"#mostViewedGrid","view");renderTrendingItems(data.mostListened,"#mostListenedGrid","listen");renderTrendingItems(data.recentViewed,"#recentViewedGrid","recent-view");renderTrendingItems(data.recentListened,"#recentListenedGrid","recent-listen");renderTrendingItems(data.recentAddedVideos,"#recentAddedVideosGrid","added");renderTrendingItems(data.recentAddedMusic,"#recentAddedMusicGrid","added");}
async function loadTrending(){
 const cacheKey="nasflix-trending-cache-v1";
 try{const cached=JSON.parse(localStorage.getItem(cacheKey)||"null");if(cached&&cached.data)renderTrendingPayload(cached.data);}catch{}
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),7000);
 try{
  const response=await fetch("/api/metrics/top",{cache:"default",signal:controller.signal});
  if(!response.ok)throw new Error("Rankings unavailable");
  const data=await response.json();renderTrendingPayload(data);
  try{localStorage.setItem(cacheKey,JSON.stringify({savedAt:Date.now(),data}));}catch{}
 }catch(error){
  console.warn("NASFLIX rankings could not refresh:",error);
  for(const [id,message] of [["mostViewedGrid","No popular videos yet."],["mostListenedGrid","No popular music yet."],["recentViewedGrid","No recent video activity yet."],["recentListenedGrid","No recent music activity yet."],["recentAddedVideosGrid","No videos have been added yet."],["recentAddedMusicGrid","No music has been added yet."]]){
   const box=$("#"+id);if(box&&!box.querySelector(".trending-card"))box.innerHTML='<p class="trending-empty">'+message+'</p>';
  }
 }finally{clearTimeout(timeout);}
}
async function saveOffline(id){
 if(!accountUser){const modal=$("#offlineLoginModal");if(modal)modal.hidden=false;return;}
 const item=items.find(x=>String(x.id)===String(id));
 if(!item){alert("This title is not available in the catalogue yet.");return;}
 if(!item.url||!isDirectMedia(item.url)||youtubeId(item.url)){alert("Offline saving is available for direct NASFLIX video and music files. Embedded YouTube links cannot be saved.");return;}
 let url;try{url=new URL(item.url,location.href);}catch{alert("Invalid media URL.");return;}
 if(url.origin!==location.origin){alert("For offline playback, this media must be hosted in NASFLIX storage.");return;}
 const button=[...document.querySelectorAll("[data-offline-save]")].find(b=>b.dataset.offlineSave===String(id));const original=button?.textContent;
 if(button){button.disabled=true;button.textContent="Saving…";}
 try{if(navigator.storage?.persist)await navigator.storage.persist();const response=await fetch(url.href,{cache:"no-store"});if(!response.ok)throw new Error("Could not download this file ("+response.status+").");const cache=await caches.open(OFFLINE_CACHE_NAME);await cache.put(url.href,response.clone());
 const entry={...item,id:String(item.id),url:url.href,savedAt:Date.now()};offlineItems=offlineItems.filter(s=>String(s.id)!==String(item.id));offlineItems.unshift(entry);saveOfflineList();renderDownloads();render();
 const playerButton=$("#saveOfflinePlayer");if(playerButton?.dataset.id===String(id))playerButton.textContent="✓ Saved offline";
 }catch(error){alert("Offline save failed: "+error.message);}finally{if(button){button.disabled=false;button.textContent=offlineItems.some(s=>String(s.id)===String(id))?"✓ Saved offline":(original||"↓ Save offline");}}
}
async function removeOffline(id){const entry=offlineItems.find(s=>String(s.id)===String(id));if(entry?.url){const cache=await caches.open(OFFLINE_CACHE_NAME);await cache.delete(new URL(entry.url,location.href).href);}offlineItems=offlineItems.filter(s=>String(s.id)!==String(id));saveOfflineList();renderDownloads();render();}
function loadMoreMusicOnScroll(){
 const sentinel=$("#musicLoadSentinel");if(!sentinel||musicBatchLoading||sentinel.hidden)return;
 const term=$("#searchInput").value.trim().toLowerCase();
 const filtered=items.filter(x=>x.type==="Music"&&(activeFilter==="All"||x.type===activeFilter||String(x.genre||"").toLowerCase()===activeFilter.toLowerCase())&&[x.title,x.seriesTitle,x.type,x.genre,x.description,x.artist,x.albumTitle].join(" ").toLowerCase().includes(term));
 const artistTracks=activeMusicArtist==="All Artists"?filtered:filtered.filter(x=>String(x.artist||"").trim()===activeMusicArtist);
 const shown=activeMusicAlbum==="All Albums"?artistTracks:artistTracks.filter(x=>(String(x.albumTitle||"").trim()||"Singles")===activeMusicAlbum);
 if(musicVisibleCount<shown.length&&sentinel.getBoundingClientRect().top<=window.innerHeight+260){musicBatchLoading=true;render();clearTimeout(musicBatchTimer);musicBatchTimer=setTimeout(()=>{musicVisibleCount=Math.min(shown.length,musicVisibleCount+10);musicBatchLoading=false;render();},450);}
}
window.addEventListener("scroll",loadMoreMusicOnScroll,{passive:true});
window.addEventListener("resize",loadMoreMusicOnScroll);
document.querySelectorAll("[data-download-folder]").forEach(button=>button.addEventListener("click",()=>{if(!accountUser){const modal=$("#offlineLoginModal");if(modal)modal.hidden=false;return;}activeDownloadFolder=button.dataset.downloadFolder;renderDownloads();}));
function renderDownloads(){
 const box=$("#downloadsGrid"),empty=$("#downloadsEmpty"),count=$("#downloadsCount");if(!box)return;
 const filtered=offlineItems.filter(x=>activeDownloadFolder==="all"||(activeDownloadFolder==="music"?String(x.type).toLowerCase()==="music":String(x.type).toLowerCase()!=="music"));
 count.textContent=accountUser?offlineItems.length+" saved":"Login required";
 if(!accountUser){box.hidden=true;empty.hidden=false;empty.textContent="Log in or register to access My Downloads and save media for offline playback.";return;}
 box.hidden=activeDownloadFolder==="none";
 empty.hidden=activeDownloadFolder==="none"||filtered.length>0;
 if(activeDownloadFolder==="none"){box.innerHTML="";document.querySelectorAll("[data-download-folder]").forEach(button=>button.classList.remove("active"));return;}
 box.innerHTML=filtered.map(x=>"<div class=\"download-card\"><div class=\"download-card-main\" data-offline-play=\""+esc(x.id)+"\"><span class=\"download-type\">"+esc(x.type)+"</span><b>"+esc(x.episodeTitle||x.title)+"</b><small>"+esc(x.seriesTitle||x.genre||"NASFLIX")+"</small><span class=\"download-play\">▶ Play offline</span></div><button type=\"button\" data-offline-delete=\""+esc(x.id)+"\" aria-label=\"Delete saved download\">×</button></div>").join("");
 empty.hidden=filtered.length>0;
 document.querySelectorAll("[data-download-folder]").forEach(button=>button.classList.toggle("active",button.dataset.downloadFolder===activeDownloadFolder));
}
document.addEventListener("click",e=>{const save=e.target.closest("[data-offline-save]");if(save){e.preventDefault();e.stopPropagation();saveOffline(save.dataset.offlineSave);return;}const del=e.target.closest("[data-offline-delete]");if(del){e.preventDefault();e.stopPropagation();removeOffline(del.dataset.offlineDelete);return;}const play=e.target.closest("[data-offline-play]");if(play){const id=play.dataset.offlinePlay;const item=offlineItems.find(x=>String(x.id)===String(id));if(item){if(!items.some(x=>String(x.id)===String(id)))items.push(item);openPlayer(id);}return;}});
function renderAdmin(){
  $("#adminItems").innerHTML=items.map(x=>"<div class=\"admin-row\"><span>"+esc(x.title)+" <small>("+esc(x.type)+")"+(x.remote?" · Saved":"")+"</small></span><span class=\"admin-actions\">"+(x.remote?"<button data-edit=\""+esc(x.id)+"\">Edit</button>":"")+"<button data-delete=\""+esc(x.id)+"\" data-remote=\""+(x.remote?"1":"0")+"\">Remove</button></span></div>").join("");
  document.querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>{const x=items.find(item=>String(item.id)===String(b.dataset.edit));if(!x)return;editingId=x.id;$("#itemTitle").value=x.title;$("#itemType").value=x.type;$("#itemGenre").value=x.genre||"";$("#itemArtist").value=x.artist||"";$("#albumTitle").value=x.albumTitle||"";$("#itemDescription").value=x.description||"";$("#itemUrl").value=x.url||"";$("#seriesTitle").value=x.seriesTitle||"";$("#seasonNumber").value=x.seasonNumber||1;$("#episodeNumber").value=x.episodeNumber||"";$("#episodeTitle").value=x.episodeTitle||"";$("#itemDownload").checked=!!x.download;$("#contentSubmit").textContent="Save changes";$("#cancelEdit").hidden=false;$("#uploadStatus").textContent="Editing: "+x.title;$("#contentForm").scrollIntoView({behavior:"smooth",block:"start"});}));
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
let startupStepTimer=null;
function setStartupStep(step){
  const status=$("#startupStatus"),bar=$("#startupProgressBar");
  const labels=["Starting NASFLIX app…","Loading videos…","Loading music…","Loading pictures…","Preparing your library…"];
  if(status)status.textContent=labels[Math.max(0,Math.min(step,labels.length-1))];
  if(bar)bar.style.width=(12+step*17)+"%";
  document.querySelectorAll("[data-startup-step]").forEach(el=>{
    const n=Number(el.dataset.startupStep);
    el.classList.toggle("current",n===step);
    el.classList.toggle("complete",n<step);
  });
}
async function finishStartupLoading(){
  const overlay=$("#nasStartup");
  if(!overlay)return;
  // Ask Android once per app session to exempt NASFLIX from battery optimization.
  if(NASFLIX_APP_MODE&&window.NasflixAndroid?.openBackgroundBatterySettings&&!sessionStorage.getItem("nasflixBatteryPrompted")){
    sessionStorage.setItem("nasflixBatteryPrompted","1");
    setTimeout(()=>window.NasflixAndroid.openBackgroundBatterySettings(),900);
  }
  // Let visible poster artwork finish loading, but don't keep startup open forever
  const images=[...document.querySelectorAll("#contentGrid img, #downloadsGrid img")];
  const imageLoads=images.map(img=>img.complete?Promise.resolve():new Promise(resolve=>{
    img.addEventListener("load",resolve,{once:true});
    img.addEventListener("error",resolve,{once:true});
  }));
  await Promise.all([
    Promise.race([Promise.all(imageLoads),new Promise(resolve=>setTimeout(resolve,2200))]),
    new Promise(resolve=>setTimeout(resolve,2600))
  ]);
  if(startupStepTimer){clearInterval(startupStepTimer);startupStepTimer=null;}
  setStartupStep(4);
  const bar=$("#startupProgressBar");if(bar)bar.style.width="100%";
  const status=$("#startupStatus");if(status)status.textContent="You're all set. Enjoy NASFLIX!";
  document.querySelectorAll("[data-startup-step]").forEach(el=>{el.classList.remove("current");el.classList.add("complete");});
  await new Promise(resolve=>setTimeout(resolve,450));
  overlay.classList.add("startup-hidden");
  setTimeout(()=>overlay.remove(),700);
}
setStartupStep(0);
let startupStep=0;
startupStepTimer=setInterval(()=>{startupStep=Math.min(4,startupStep+1);setStartupStep(startupStep);},650);
loadRemote().finally(finishStartupLoading);
loadTrending();
refreshAccount();

$("#cancelEdit").addEventListener("click",()=>{editingId=null;$("#contentForm").reset();$("#contentSubmit").textContent="Save to NASFLIX catalogue +";$("#cancelEdit").hidden=true;$("#uploadStatus").textContent="Edit cancelled.";});

document.addEventListener("click",e=>{const b=e.target.closest("[data-episode-id]");if(b&&!b.disabled&&b.dataset.episodeId)openPlayer(b.dataset.episodeId);});




// Device-aware background playback help. This guides users but never changes protected OS settings.
(function initDeviceBackgroundHelp(){
  const modal=document.getElementById("deviceHelp");
  const open=document.getElementById("deviceHelpOpen");
  const detected=document.getElementById("deviceHelpDetected");
  const steps=document.getElementById("deviceHelpSteps");
  if(!modal||!open||!detected||!steps)return;
  const ua=navigator.userAgent||"";
  const platform=(navigator.userAgentData&&navigator.userAgentData.platform)||ua;
  const brand=(ua.match(/(Xiaomi|Redmi|POCO|Samsung|SM-[A-Z0-9]+|OPPO|Realme|vivo|HUAWEI|HONOR|Infinix|TECNO|Google Pixel|Pixel|OnePlus)/i)||[])[0]||"Android phone";
  let title=brand,guide=[];
  if(/Xiaomi|Redmi|POCO/i.test(brand))guide=["Open Settings → Apps → Manage apps → NASFLIX → Battery saver → No restrictions.","If available, open Autostart and enable it for NASFLIX.","On some models, open Security → Permissions → Autostart and allow NASFLIX."];
  else if(/Samsung|SM-/i.test(brand))guide=["Open Settings → Apps → NASFLIX → Battery.","Allow background activity if that option is shown.","Open Settings → Battery → Background usage limits → Never sleeping apps, then add NASFLIX."];
  else if(/OPPO|Realme/i.test(brand))guide=["Open Settings → Apps → App management → NASFLIX → Battery usage.","Allow background activity / background running if available.","Check Auto launch or App battery management and allow NASFLIX to run in the background."];
  else if(/vivo/i.test(brand))guide=["Open Settings → Apps → NASFLIX → Battery.","Allow background power consumption or background activity if available.","Check iManager → App manager / Autostart and allow NASFLIX if your model provides it."];
  else if(/HUAWEI|HONOR/i.test(brand))guide=["Open Settings → Apps → Apps → NASFLIX → Battery.","Open App launch / Launch management and manage NASFLIX manually.","Allow Auto-launch, Secondary launch and Run in background if those switches appear."];
  else if(/Infinix|TECNO/i.test(brand))guide=["Open Settings → Apps → App management → NASFLIX → Battery.","Allow background activity and disable battery optimization for NASFLIX if offered.","Check Phone Master / Power Marathon for app background restrictions and allow NASFLIX."];
  else if(/Pixel|Google/i.test(brand))guide=["Open Settings → Apps → NASFLIX → App battery usage.","Select Unrestricted (or Allow background usage, depending on Android version)."];
  else guide=["Open Settings → Apps → NASFLIX → Battery or App battery usage.","Choose Unrestricted / No restrictions or Allow background activity if available.","Look for Autostart / Background activity settings in your phone's battery or security app."];
  detected.textContent="Detected device: "+title+(platform?" · "+(String(platform).includes("Android")?"Android":"Mobile device"):"");
  steps.innerHTML="<h3>Settings to check</h3><ol>"+guide.map(x=>"<li>"+x.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")+"</li>").join("")+"</ol>";
  function show(){modal.hidden=false;document.body.classList.add("device-help-open");}
  function hide(){modal.hidden=true;document.body.classList.remove("device-help-open");}
  modal.querySelectorAll("[data-device-help-close]").forEach(el=>el.addEventListener("click",hide));
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!modal.hidden)hide();});
})();
