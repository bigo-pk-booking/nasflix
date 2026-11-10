(()=> {
  const $ = id => document.getElementById(id);
  const audio = $("radioAudio"), grid = $("radioStations"), status = $("radioStatus");
  if (!audio || !grid) return;
  let stations = [], current = null;
  const favorites = new Set(JSON.parse(localStorage.getItem("nasflixRadioFavorites") || "[]"));
  const esc = value => String(value || "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const saveFavorites = () => localStorage.setItem("nasflixRadioFavorites", JSON.stringify([...favorites]));
  const now = $("radioNow");
  function syncMini(){
    const playing = !!current && !audio.paused && !audio.error;
    now.hidden = !current;
    document.body.classList.toggle("radio-playing",playing);
    $("radioNowTitle").textContent = current?.name || "NASFLIX RADIO";
    $("radioPlayToggle").textContent = audio.paused ? "▶" : "Ⅱ";
    $("radioPlayToggle").setAttribute("aria-label",audio.paused?"Play radio":"Pause radio");
  }
  function render(list) {
    grid.innerHTML = list.length ? list.map(s => {
      const id = s.stationuuid;
      const isCurrent = current?.stationuuid === id;
      return '<article class="radio-station '+(isCurrent?'radio-station-current':'')+'"><div class="radio-station-copy"><strong>'+esc(s.name)+'</strong><small>'+esc([s.country,s.tags].filter(Boolean).join(" · "))+'</small></div><button type="button" data-radio-play="'+esc(id)+'" aria-label="Play '+esc(s.name)+'">'+(isCurrent&&!audio.paused?"Ⅱ":"▶")+'</button><button type="button" data-radio-fav="'+esc(id)+'" aria-label="Favorite">'+(favorites.has(id)?"♥":"♡")+'</button></article>';
    }).join("") : '<p class="radio-status">No stations found. Try another country or genre.</p>';
  }
  async function findStations() {
    status.textContent = "Searching live stations…"; grid.innerHTML = "";
    const country = $("radioCountry").value, genre = $("radioGenre").value, term = $("radioSearch").value.trim();
    const params = new URLSearchParams({limit:"60",hidebroken:"true",order:"clickcount",reverse:"true"});
    if(country) params.set("countrycode",country);
    if(genre) params.set("tag",genre);
    if(term) params.set("name",term);
    try {
      const response = await fetch("https://de1.api.radio-browser.info/json/stations/search?"+params.toString(),{headers:{"Accept":"application/json"}});
      if(!response.ok) throw new Error("Directory unavailable ("+response.status+")");
      stations = await response.json();
      status.textContent = stations.length+" live stations found. Tap ▶ to listen.";
      render(stations);
    } catch(error) { status.textContent = "Unable to load stations right now. Please try again later."; console.warn("NASFLIX Radio:",error); }
  }
  function playStation(station) {
    if(!station || !station.url_resolved) return;
    current = station; audio.src = station.url_resolved;
    now.hidden = false; $("radioNowTitle").textContent = station.name;
    audio.play().then(()=>{syncMini();render(stations);}).catch(()=>{
      status.textContent = "This station could not start. Try another station; some streams block browser playback.";
      syncMini();render(stations);
    });
  }
  $("radioFind").addEventListener("click",findStations);
  $("radioSearch").addEventListener("keydown",e=>{if(e.key==="Enter")findStations();});
  grid.addEventListener("click",e=>{
    const play=e.target.closest("[data-radio-play]"), fav=e.target.closest("[data-radio-fav]");
    if(play){const station=stations.find(s=>s.stationuuid===play.dataset.radioPlay);if(current?.stationuuid===station?.stationuuid&&!audio.paused){audio.pause();}else playStation(station);}
    if(fav){const id=fav.dataset.radioFav;favorites.has(id)?favorites.delete(id):favorites.add(id);saveFavorites();render(stations);}
  });
  $("radioPlayToggle").addEventListener("click",()=>{if(audio.paused)audio.play().catch(()=>{});else audio.pause();});
  $("radioStop").addEventListener("click",()=>{audio.pause();audio.removeAttribute("src");audio.load();current=null;syncMini();render(stations);});
  audio.addEventListener("play",()=>{syncMini();render(stations);});
  audio.addEventListener("pause",()=>{syncMini();render(stations);});
  audio.addEventListener("error",()=>{status.textContent="Stream error. Please choose another station.";syncMini();});
  findStations();
})();