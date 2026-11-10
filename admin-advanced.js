(()=>{
"use strict";
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let active="dashboard";
const legacySelectors=[".admin-choice-hint",".admin-items"];
const api=async(path,options={})=>{const r=await fetch("/api/admin/"+path,{credentials:"same-origin",cache:"no-store",headers:{"content-type":"application/json",...(options.headers||{})},...options});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Admin request failed.");return d;};
function ensureUI(){
 const card=$(".admin-card");if(!card||$("#adminAdvanced"))return;
 const root=document.createElement("section");root.id="adminAdvanced";root.innerHTML=`
 <style>
 #adminAdvanced{margin:0 0 18px;color:#f7f4ff;font-family:'DM Sans',sans-serif}
 #adminAdvanced .aa-header{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:4px 0 18px;border-bottom:1px solid #30243d}
 #adminAdvanced .aa-header .eyebrow{margin:0 0 6px;letter-spacing:2px}
 #adminAdvanced .aa-header h2{margin:0;font:800 22px Manrope,sans-serif}
 #adminAdvanced .aa-header h2 em{font-style:normal;color:#b78aff}
 #adminAdvanced .aa-header small{color:#a99bb9;font-size:11px}
 #adminAdvanced .aa-live{font-size:10px;letter-spacing:1px;color:#d4b6ff;background:#2a1a3b;border:1px solid #50356c;padding:7px 10px;border-radius:20px}
 #adminAdvanced .aa-layout{display:grid;grid-template-columns:190px minmax(0,1fr);gap:16px;margin-top:16px;align-items:start}
 #adminAdvanced .aa-sidebar{position:sticky;top:8px;background:#15101e;border:1px solid #30243d;border-radius:14px;padding:10px}
 #adminAdvanced .aa-nav{display:flex;flex-direction:column;gap:5px;margin:0}
 #adminAdvanced .aa-nav button,#adminAdvanced button{border:1px solid #49365f;background:#1b1527;color:#e9ddff;border-radius:9px;padding:10px;font:600 11px 'DM Sans',sans-serif;text-align:left}
 #adminAdvanced .aa-nav button{border-color:transparent;background:transparent}
 #adminAdvanced .aa-nav button.active,#adminAdvanced .aa-primary{background:linear-gradient(110deg,#7836c7,#a72acb);border-color:#a76bd4;color:white}
 #adminAdvanced .aa-main{min-width:0}
 #adminAdvanced .aa-panel{border:1px solid #382a49;border-radius:14px;padding:15px;background:#15111e;margin-bottom:12px}
 #adminAdvanced .aa-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
 #adminAdvanced .aa-stat{padding:13px;border:1px solid #33283f;border-radius:11px;background:#1b1527}
 #adminAdvanced .aa-stat small{display:block;color:#bca9d2;font-size:10px}
 #adminAdvanced .aa-stat strong{display:block;font:800 21px Manrope;margin-top:5px;color:#d7b4ff}
 #adminAdvanced h3{font:700 16px Manrope;margin:4px 0 12px}
 #adminAdvanced p,#adminAdvanced small{color:#bca9d2;font-size:11px;line-height:1.6}
 #adminAdvanced input,#adminAdvanced textarea,#adminAdvanced select{width:100%;box-sizing:border-box;margin:5px 0 10px;padding:11px;border:1px solid #514064;border-radius:9px;background:#0e0c16;color:white;font:12px 'DM Sans',sans-serif}
 #adminAdvanced label{display:block;color:#d8c9eb;font-size:11px}
 #adminAdvanced .aa-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid #ffffff15;font-size:11px}
 #adminAdvanced .aa-row span{min-width:0;overflow-wrap:anywhere}
 #adminAdvanced .aa-row button{flex-shrink:0}
 #adminAdvanced .aa-msg{min-height:18px;color:#d8b4fe;font-size:11px}
 #adminAdvanced .aa-actions{display:flex;gap:8px;flex-wrap:wrap}
 #adminAdvanced .aa-actions button{flex:1}
 #adminAdvanced .aa-studio{margin-top:20px}
 #adminAdvanced .aa-studio h2{font:800 22px Manrope;margin:4px 0 12px}
 #adminAdvanced .aa-studio h2 em{font-style:normal;color:#b78aff}
 #adminAdvanced [hidden]{display:none!important}
 .admin-card>.admin-intro{display:none!important}
 .admin-card>.admin-access-top{display:block!important;margin:0 0 12px;padding:12px;border:1px solid #49365f;border-radius:11px;background:#1b1527}
 .admin-card>.admin-access-top h3{margin:2px 0 8px;font-size:13px}
 .admin-card>.admin-access-top label{display:block;color:#cbb9e1;font-size:11px}
 .admin-card>.admin-access-top input{width:100%;box-sizing:border-box;margin-top:7px;padding:11px;border:1px solid #514064;border-radius:9px;background:#0e0c16;color:#fff}
 .admin-card:not(.aa-show-catalogue)>.admin-items{display:none!important}
 @media(max-width:680px){#adminAdvanced .aa-layout{grid-template-columns:1fr;gap:10px}#adminAdvanced .aa-sidebar{position:static;padding:7px}#adminAdvanced .aa-nav{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}#adminAdvanced .aa-nav button{padding:9px 5px;text-align:center;font-size:10px}#adminAdvanced .aa-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}

 #adminAdvanced .aa-statusbar{padding:10px 12px;margin:12px 0 14px;border:1px solid #6b512b;border-radius:9px;background:#2a2113;color:#e9d5a8;font-size:11px}
 #adminAdvanced .aa-quick{margin-top:12px;padding:14px;border:1px solid #30243d;border-radius:12px;background:#15101e}
 #adminAdvanced .aa-quick strong{display:block;margin-bottom:10px;font-size:12px}
 #adminAdvanced .aa-quick .aa-actions button{font-size:11px;text-align:center}
 #adminAdvanced .aa-studio-tools{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
 #adminAdvanced .aa-studio-tools>.admin-upload-choices{display:contents}
 #adminAdvanced .aa-studio-tools .admin-choice{min-height:104px;border-radius:13px;background:linear-gradient(125deg,#7b32cf,#a52bd1);border:1px solid #b46ce4;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px}
 #adminAdvanced .aa-studio-tools .admin-choice span{font-size:22px}
 #adminAdvanced .aa-studio-tools .admin-choice b{font-size:13px}
 #adminAdvanced .aa-studio-tools .admin-access-top,#adminAdvanced .aa-studio-tools .admin-choice-hint,#adminAdvanced .aa-studio-tools .admin-upload-area,#adminAdvanced .aa-studio-tools .admin-items{grid-column:1/-1}
 @media(max-width:680px){#adminAdvanced .aa-layout{grid-template-columns:150px minmax(0,1fr);gap:10px}#adminAdvanced .aa-nav{display:flex;flex-direction:column}#adminAdvanced .aa-nav button{text-align:left;padding:10px 8px}#adminAdvanced .aa-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
 @media(max-width:480px){#adminAdvanced .aa-layout{grid-template-columns:1fr}#adminAdvanced .aa-nav{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}#adminAdvanced .aa-studio-tools{grid-template-columns:1fr 1fr}}
 </style>
 <header class="aa-header"><div><p class="eyebrow">PRIVATE WORKSPACE · ADMIN STUDIO</p><h2>NASFLIX <em>Admin</em></h2><small>Content management workspace</small></div><span class="aa-live">● ADMIN</span></header>
 <div class="aa-statusbar">Connected to NASFLIX database. Changes here are shared with the public website.</div><div class="aa-layout"><aside class="aa-sidebar"><nav class="aa-nav" aria-label="Admin sections">
 <button data-aa="dashboard" class="active">Overview</button><button data-aa="content">Content</button><button data-aa="users">Users</button><button data-aa="analytics">Analytics</button><button data-aa="notifications">Alerts</button><button data-aa="settings">Settings</button><button data-aa="security">Security</button>
 </nav></aside><main class="aa-main"><div class="aa-panel aa-intro-panel" id="aaIntroPanel"></div>
 <div class="aa-panel" data-aa-panel="dashboard"><h3>Dashboard Overview</h3><div class="aa-grid" id="aaStats"><div class="aa-stat"><small>Loading overview</small><strong>—</strong></div></div><div class="aa-quick"><strong>Quick actions</strong><div class="aa-actions"><button class="aa-primary" data-aa-action="music">Add music or video</button><button data-aa-action="catalogue">Manage catalogue</button></div></div><h3 style="margin-top:18px">Recent admin activity</h3><div id="aaRecent"></div><p class="aa-msg" id="aaDashMsg"></p></div>
 <div class="aa-panel" data-aa-panel="content" hidden><h3>Content Management</h3><p>Use the existing secure upload and catalogue tools below to add, edit, and remove media. Your current media records and R2 files are retained.</p><div class="aa-actions"><button class="aa-primary" id="aaShowUpload">Open upload tools</button><button id="aaRefreshContent">Refresh catalogue</button></div><div id="aaContentSummary"></div></div>
 <div class="aa-panel" data-aa-panel="users" hidden><h3>User Management</h3><p>Registered accounts. Suspending an account revokes its active sessions; the primary admin account is protected.</p><div id="aaUsers"></div><p class="aa-msg" id="aaUsersMsg"></p></div>
 <div class="aa-panel" data-aa-panel="analytics" hidden><h3>Analytics</h3><p>Engagement totals are based on recorded plays/listens. These are not unique visitors or verified website sessions.</p><div class="aa-grid" id="aaAnalytics"></div><h3 style="margin-top:18px">Most played content</h3><div id="aaTop"></div></div>
 <div class="aa-panel" data-aa-panel="notifications" hidden><h3>Notifications & Announcements</h3><form id="aaNoticeForm"><label>Title<input name="title" maxlength="100" required placeholder="New NASFLIX update"></label><label>Message<textarea name="message" rows="3" maxlength="1000" required placeholder="Write your announcement…"></textarea></label><label>Type<select name="type"><option value="announcement">Announcement</option><option value="maintenance">Maintenance</option><option value="update">App update</option></select></label><button class="aa-primary" type="submit">Publish announcement</button></form><p class="aa-msg" id="aaNoticeMsg"></p><div id="aaNotices"></div></div>
 <div class="aa-panel" data-aa-panel="settings" hidden><h3>Website Settings</h3><p>Settings are stored safely in D1. They will not change public pages until their corresponding site integration is enabled.</p><form id="aaSettingsForm"><label>Website name<input name="site_name" maxlength="100"></label><label>Homepage message<input name="homepage_message" maxlength="300"></label><label>SEO description<textarea name="seo_description" rows="2" maxlength="300"></textarea></label><label>Facebook URL<input name="social_facebook" maxlength="300"></label><label>Telegram URL<input name="social_telegram" maxlength="300"></label><label>Maintenance mode<select name="maintenance_mode"><option value="off">Off</option><option value="on">On (setting only; not enforced yet)</option></select></label><button class="aa-primary" type="submit">Save settings</button></form><p class="aa-msg" id="aaSettingsMsg"></p></div>
 <div class="aa-panel" data-aa-panel="security" hidden><h3>Security & Activity Logs</h3><p>Admin actions recorded by the new control center.</p><div id="aaLogs"></div><p class="aa-msg" id="aaLogsMsg"></p></div><section class="aa-studio"><p class="eyebrow">PRIVATE WORKSPACE</p><h2>Admin <em>studio</em></h2><div id="aaLegacyTools" class="aa-studio-tools"></div></section></main></div>`;
 const close= $(".admin-card>.modal-close",card); if(close)close.insertAdjacentElement("afterend",root);else card.prepend(root);
 const legacy= $("#aaLegacyTools");
 if(legacy){
  const intro=card.querySelector(":scope>.admin-intro");if(intro)$("#aaIntroPanel").append(intro);
  [".admin-access-top",".admin-upload-choices",".admin-choice-hint","#musicUploadArea","#videoUploadArea",".admin-items"].forEach(sel=>{const node=card.querySelector(sel);if(node)legacy.append(node);});
 }
 root.addEventListener("click",e=>{const b=e.target.closest("[data-aa]");if(b){switchTab(b.dataset.aa);return;}if(e.target.id==="aaShowUpload"){switchTab("content");$("#openVideoUpload")?.click();}const quick=e.target.closest("[data-aa-action]");if(quick){if(quick.dataset.aaAction==="catalogue"){switchTab("content");}else{switchTab("content");$("#openMusicUpload")?.click();}}if(e.target.id==="aaRefreshContent"){window.NASFLIXAdminRefresh?.();renderContentSummary();}});
 root.addEventListener("submit",async e=>{if(e.target.id==="aaNoticeForm"){e.preventDefault();const f=new FormData(e.target);try{await api("notifications",{method:"POST",body:JSON.stringify(Object.fromEntries(f))});e.target.reset();$("#aaNoticeMsg").textContent="Announcement saved.";loadNotices();}catch(x){$("#aaNoticeMsg").textContent=x.message;}}if(e.target.id==="aaSettingsForm"){e.preventDefault();try{await api("settings",{method:"PUT",body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});$("#aaSettingsMsg").textContent="Settings saved securely.";loadSettings();}catch(x){$("#aaSettingsMsg").textContent=x.message;}}});
 root.addEventListener("click",async e=>{const b=e.target.closest("[data-aa-user]");if(b){const id=b.dataset.aaUser,status=b.dataset.status;try{await api("users/"+encodeURIComponent(id),{method:"POST",body:JSON.stringify({status})});loadUsers();}catch(x){$("#aaUsersMsg").textContent=x.message;}}const del=e.target.closest("[data-aa-notice]");if(del){try{await api("notifications/"+encodeURIComponent(del.dataset.aaNotice),{method:"DELETE"});loadNotices();}catch(x){$("#aaNoticeMsg").textContent=x.message;}}});
}
function switchTab(tab){active=tab;const root=$("#adminAdvanced");if(!root)return;const card=root.closest(".admin-card");card?.classList.toggle("aa-show-catalogue",tab==="content");root.querySelectorAll("[data-aa]").forEach(b=>b.classList.toggle("active",b.dataset.aa===tab));root.querySelectorAll("[data-aa-panel]").forEach(p=>p.hidden=p.dataset.aaPanel!==tab);const isContent=tab==="content";legacySelectors.forEach(s=>document.querySelectorAll(s).forEach(n=>n.hidden=!isContent));if(isContent){$("#adminUploadHint")&&( $("#adminUploadHint").hidden=false);renderContentSummary();}if(tab==="dashboard"||tab==="analytics")loadOverview();if(tab==="users")loadUsers();if(tab==="notifications")loadNotices();if(tab==="settings")loadSettings();if(tab==="security")loadLogs();}
async function loadOverview(){try{const d=await api("overview");$("#aaStats").innerHTML=[["Users",d.users],["Media",d.media],["Video titles",d.videos],["Music tracks",d.music],["Video plays",d.views],["Music plays",d.listens],["Download enabled",d.downloadable]].map(x=>'<div class="aa-stat"><small>'+x[0]+'</small><strong>'+Number(x[1]||0).toLocaleString()+'</strong></div>').join("");$("#aaAnalytics").innerHTML=[["Total plays",d.views],["Total listens",d.listens],["Registered users",d.users],["Media items",d.media]].map(x=>'<div class="aa-stat"><small>'+x[0]+'</small><strong>'+Number(x[1]||0).toLocaleString()+'</strong></div>').join("");$("#aaTop").innerHTML=(d.top||[]).map(x=>'<div class="aa-row"><span>'+esc(x.title)+'</span><b>'+Number(x.plays||0).toLocaleString()+'</b></div>').join("")||"<p>No play data yet.</p>";$("#aaRecent").innerHTML=(d.activity||[]).map(x=>'<div class="aa-row"><span>'+esc(x.action)+' · '+esc(x.details)+'</span><small>'+esc(x.created_at)+'</small></div>').join("")||"<p>No admin actions recorded yet.</p>";}catch(e){$("#aaDashMsg").textContent=e.message;}}
async function loadUsers(){try{const d=await api("users");$("#aaUsers").innerHTML=(d.users||[]).map(u=>'<div class="aa-row"><span><b>'+esc(u.full_name||"NASFLIX User")+'</b><br>'+esc(u.email)+'<br><small>'+esc(u.created_at)+' · '+esc(u.status||"active")+'</small></span>'+(u.status==="suspended"?'<button data-aa-user="'+esc(u.id)+'" data-status="active">Reactivate</button>':'<button data-aa-user="'+esc(u.id)+'" data-status="suspended">Suspend</button>')+'</div>').join("")||"<p>No users found.</p>";}catch(e){$("#aaUsersMsg").textContent=e.message;}}
async function loadNotices(){try{const d=await api("notifications");$("#aaNotices").innerHTML=(d.notifications||[]).map(n=>'<div class="aa-row"><span><b>'+esc(n.title)+'</b><br>'+esc(n.message)+'<br><small>'+esc(n.type)+' · '+esc(n.created_at)+'</small></span><button data-aa-notice="'+esc(n.id)+'">Delete</button></div>').join("")||"<p>No announcements yet.</p>";}catch(e){$("#aaNoticeMsg").textContent=e.message;}}
async function loadSettings(){try{const d=await api("settings");const map=Object.fromEntries((d.settings||[]).map(x=>[x.setting_key,x.setting_value]));const f=$("#aaSettingsForm");Object.keys(map).forEach(k=>{if(f.elements[k])f.elements[k].value=map[k];});}catch(e){$("#aaSettingsMsg").textContent=e.message;}}
async function loadLogs(){try{const d=await api("logs");$("#aaLogs").innerHTML=(d.logs||[]).map(x=>'<div class="aa-row"><span><b>'+esc(x.action)+'</b><br>'+esc(x.actor_email)+' · '+esc(x.details)+'</span><small>'+esc(x.created_at)+'</small></div>').join("")||"<p>No logs yet.</p>";}catch(e){$("#aaLogsMsg").textContent=e.message;}}
function renderContentSummary(){const box=$("#aaContentSummary");if(box)box.innerHTML='<p>Current catalogue entries: '+(document.querySelectorAll("#adminItems .admin-row").length||0)+'. Existing upload, edit, and remove controls are preserved below.</p>';}
document.addEventListener("click",e=>{if(e.target.closest("#adminOpen"))setTimeout(()=>{ensureUI();switchTab("dashboard");},80);});
document.addEventListener("DOMContentLoaded",()=>{ensureUI();switchTab("dashboard");});
window.NASFLIXAdminRefresh=()=>{loadOverview();renderContentSummary();};
})();