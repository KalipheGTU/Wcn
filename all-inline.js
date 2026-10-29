
window.maplibregl||document.write('<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"><\/script>')

window.proj4||document.write('<script src="https://unpkg.com/proj4@2.12.1/dist/proj4.js"><\/script>')

const $=s=>document.querySelector(s), st=t=>$("#status").innerHTML=t;
if(typeof maplibregl==="undefined"||typeof proj4==="undefined"){document.body.insertAdjacentHTML("afterbegin","<div style='padding:20px;background:#fee;font:15px sans-serif'>⚠️ Bibliothèque de carte introuvable (dossier <b>static/vendor</b> absent et internet indisponible). Voir README.</div>");throw new Error("bibliothèques manquantes")}

/*COORDS*/
const L93="+proj=lcc +lat_0=46.5 +lon_0=3 +lat_1=49 +lat_2=44 +x_0=700000 +y_0=6600000 +ellps=GRS80 +units=m +no_defs";
const DZN="+proj=lcc +lat_1=36 +lat_0=36 +lon_0=2.7 +k_0=0.999625544 +x_0=500135 +y_0=300090 +a=6378249.145 +rf=293.465 +towgs84=-165.914,-70.607,305.009,0,0,0,0 +units=m +no_defs";
const PARIS=2.33722917; // méridien de Paris : 2°20'14,025" E de Greenwich
const NUM=/-?\d+(?:[.,]\d+)?/g, num=s=>parseFloat(s.replace(",","."));
const dms=n=>{const neg=n[0].trim().startsWith("-"),v=n.map(s=>Math.abs(num(s)));const d=v[0]+(v[1]||0)/60+(v[2]||0)/3600;return neg?-d:d};
function parseGeo(t,lonFirst){
 let lat,lon;
 if(/[NSEWOnsewo]/.test(t)){
  const ch=t.match(/[^NSEWOnsewo]+[NSEWOnsewo]|[NSEWOnsewo][^NSEWOnsewo]+/g)||[];
  if(ch.length!=2)throw "deux coordonnées attendues (lat et lon)";
  for(const c of ch){
   const L=c.match(/[NSEWOnsewo]/)[0].toUpperCase(),n=c.match(NUM);
   if(!n)throw "nombre manquant";
   let v=Math.abs(dms(n)); if("SWO".includes(L)||n[0].trim().startsWith("-"))v=-v;
   if("NS".includes(L))lat=v;else lon=v;
  }
  if(lat===undefined||lon===undefined)throw "il faut une latitude (N/S) et une longitude (E/O)";
 }else{
  const n=t.match(NUM)||[];
  if(![2,4,6].includes(n.length))throw "format non reconnu";
  const h=n.length/2,a=dms(n.slice(0,h)),b=dms(n.slice(h));
  [lat,lon]=lonFirst?[b,a]:[a,b];
 }
 if(Math.abs(lat)>90||Math.abs(lon)>180)throw "latitude/longitude hors limites";
 return{lon,lat};
}
// Grades : "39g 90" = 39,90 grades ; latitude puis longitude (méridien de Paris par défaut)
function parseGrad(t,paris,lonFirst){
 const s=t.replace(/(\d)\s*g(?:rad|on|r)?\.?\s*(\d*)/gi,(m,a,b)=>a+(b?"."+b:"")).replace(/[A-Za-z°'"′″]/g," ");
 const n=(s.match(NUM)||[]).map(num);
 if(n.length!=2)throw "grades : deux valeurs attendues, ex. 39g 90 , 5g 30";
 const[a,b]=lonFirst?[n[1],n[0]]:n;
 const lat=a*0.9,lon=b*0.9+(paris?PARIS:0);
 if(Math.abs(lat)>90)throw "latitude hors limites";
 return{lon,lat};
}
function parseUTM(t,needBand){
 const m=t.trim().match(/^(\d{1,2})\s*([A-Za-z])?[\s,;]+(\d+(?:[.,]\d+)?)\s*(?:m?E)?[\s,;]+(\d+(?:[.,]\d+)?)\s*(?:m?N)?$/i);
 if(!m||(needBand&&!m[2]))return null;
 const z=+m[1]; if(z<1||z>60)return null;
 const south=m[2]&&m[2].toUpperCase()<"N";
 const r=proj4(`+proj=utm +zone=${z}${south?" +south":""} +datum=WGS84 +units=m +no_defs`,"WGS84",[num(m[3]),num(m[4])]);
 return{lon:r[0],lat:r[1]};
}
function parseCoords(t,fmt,lonFirst){
 t=t.trim(); if(!t)throw "coordonnées vides";
 const fin=p=>{if(!isFinite(p.lon)||!isFinite(p.lat)||Math.abs(p.lat)>85.06||Math.abs(p.lon)>180)throw "coordonnées hors limites";return p};
 const proj=(def,t,km)=>{
  let p=(t.match(NUM)||[]).map(num);
  if(p.length!=2)throw "deux nombres attendus (X Y)";
  if(km&&Math.max(Math.abs(p[0]),Math.abs(p[1]))<20000)p=p.map(v=>v*1000);
  const r=proj4(def,"WGS84",p);return{lon:r[0],lat:r[1]};
 };
 if(fmt=="utm"){const u=parseUTM(t,false);if(!u)throw "format UTM : 31T 500000 4800000";return fin(u)}
 if(fmt=="l93")return fin(proj(L93,t,true));
 if(fmt=="dzn")return fin(proj(DZN,t,true));
 if(fmt=="merc")return fin(proj("EPSG:3857",t));
 if(fmt=="dd")return fin(parseGeo(t,lonFirst));
 if(fmt=="grp")return fin(parseGrad(t,true,lonFirst));
 if(fmt=="grg")return fin(parseGrad(t,false,lonFirst));
 if(/\dg/i.test(t))return fin(parseGrad(t,true,lonFirst));
 const u=parseUTM(t,true); if(u)return fin(u);
 try{return fin(parseGeo(t,lonFirst))}catch(e){
  const p=(t.match(NUM)||[]).map(num);
  if(p.length==2&&!/[°'"′″NSEWOnsewo]/.test(t)){
   if(p[0]>=0&&p[0]<=1.4e6&&p[1]>=6e6&&p[1]<=7.3e6)return fin(proj(L93,t));
   if(p[0]>=3e5&&p[0]<=1.4e6&&p[1]>=1e5&&p[1]<=6e5)return fin(proj(DZN,t));
   if(p[0]>=300&&p[0]<=1400&&p[1]>=100&&p[1]<=600)return fin(proj(DZN,t,true));
   if(Math.max(Math.abs(p[0]),Math.abs(p[1]))>1000&&Math.abs(p[0])<=20037508&&Math.abs(p[1])<=20037508)return fin(proj("EPSG:3857",t));
  }
  throw e;
 }
}
/*ENDCOORDS*/

// ---------- Fonds de carte ----------
let cfg={mapbox:"",google:"",s3:{}}, curBase="osm", keyVer=0;
const BASES={osm:{z:19,a:"© OpenStreetMap"},topo:{z:17,a:"© OpenTopoMap, OSM"},esri:{z:19,a:"© Esri"},esrit:{z:19,a:"© Esri"},esrir:{z:19,a:"© Esri"},
 carto:{z:19,a:"© OpenStreetMap © CARTO"},ignp:{z:18,a:"© IGN"},igns:{z:19,a:"© IGN"},
 mbs:{z:22,a:"© Mapbox © OSM",k:"mapbox"},mbr:{z:22,a:"© Mapbox © OSM",k:"mapbox"},mbo:{z:22,a:"© Mapbox © OSM",k:"mapbox"},
 gr:{z:22,a:"© Google",k:"google"},gs:{z:22,a:"© Google",k:"google"}};
const tileUrl=id=>`${location.origin}/tiles/${id}/{z}/{x}/{y}?v=${keyVer}`;
const map=new maplibregl.Map({container:"map",center:[2.5,46.6],zoom:4.5,style:{version:8,glyphs:location.origin+"/fonts/{fontstack}/{range}.pbf",sources:{},layers:[]}});
map.addControl(new maplibregl.NavigationControl({visualizePitch:false}),"bottom-right");
map.addControl(new maplibregl.ScaleControl(),"bottom-left");
async function setBase(id){
 const b=BASES[id];
 if(b.k&&!cfg[b.k]){$("#base").value=curBase;st("⚠️ "+(b.k=="mapbox"?"Token Mapbox":"Clé Google")+" manquant(e) — bouton ⚙ Clés");openCfg();return}
 if(map.getLayer("base"))map.removeLayer("base");
 if(map.getSource("base"))map.removeSource("base");
 map.addSource("base",{type:"raster",tiles:[tileUrl(id)],tileSize:256,maxzoom:b.z,attribution:b.a});
 map.addLayer({id:"base",type:"raster",source:"base"},firstOverlay());
 curBase=id;berr[id]=0;
}
map.on("load",()=>{
 map.addSource("grid",{type:"geojson",data:{type:"FeatureCollection",features:[]}});
 map.addLayer({id:"grid-l",type:"line",source:"grid",paint:{"line-color":"#d00000","line-width":1,"line-opacity":.75}});
 map.addLayer({id:"grid-t",type:"symbol",source:"grid",layout:{"symbol-placement":"line","symbol-spacing":320,"text-field":["get","label"],"text-font":["Open Sans Regular,Arial Unicode MS Regular"],"text-size":11},paint:{"text-color":"#900000","text-halo-color":"#fff","text-halo-width":1.6}});
 setBase("osm");
});
$("#base").onchange=e=>setBase(e.target.value);
const berr={};
map.on("error",async e=>{
 if(e.sourceId!=="base")return;
 const n=berr[curBase]=(berr[curBase]||0)+1;
 if(n==3){
  let d="";try{const r=await fetch(`/tiles/${curBase}/0/0/0`);if(!r.ok){const j=await r.json();d=" : "+j.detail}}catch(x){d=" : "+x}
  st(`⚠️ Le fond « ${$("#base").selectedOptions[0].text} » ne s'affiche pas${d}. Cliquez sur 🔧 Diagnostic.`);
 }
});

// ---------- Clés ----------
fetch("/api/settings").then(r=>r.json()).then(s=>{cfg={mapbox:s.mapbox||"",google:s.google||"",opentopo:s.opentopo||"",s3:s.s3||{},theme:s.theme||"dark",out_dir:s.out_dir||"",cpu_workers:s.cpu_workers||4,ram_limit_gb:s.ram_limit_gb||4};loadS3();$("#ot-key").value=cfg.opentopo;if(cfg.theme==="light")setTheme(false);if(cfg.out_dir){exportDest=cfg.out_dir;$("#destv").textContent=$("#destv2").textContent=cfg.out_dir}});
function openCfg(){$("#k-mb").value=cfg.mapbox;$("#k-g").value=cfg.google;$("#dlg").showModal()}
$("#cfg").onclick=openCfg; $("#k-cancel").onclick=()=>$("#dlg").close();
async function openResourceOptions(){
 const r=await fetch("/api/resources");const hw=await r.json();const sel=$("#cpu-workers");
 sel.innerHTML="";for(let n=1;n<=hw.cpu_count;n++){const o=document.createElement("option");o.value=n;o.textContent=`${n} cœur${n>1?"s":""}`;sel.appendChild(o);}
 sel.value=Math.min(hw.cpu_count,Math.max(1,Number(cfg.cpu_workers||Math.min(4,hw.cpu_count))));
 $("#cpu-note").textContent=`Processeur détecté : ${hw.cpu_count} cœur(s) logique(s).`;
 $("#ram-limit").value=String(cfg.ram_limit_gb||4);$("#resdlg").showModal();
}
$("#b-options").onclick=openResourceOptions;
$("#res-cancel").onclick=()=>$("#resdlg").close();
$("#res-save").onclick=async()=>{
 cfg.cpu_workers=Number($("#cpu-workers").value)||1;cfg.ram_limit_gb=Number($("#ram-limit").value)||4;
 const r=await fetch("/api/settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(cfg)});
 if(!r.ok){st("⚠️ Impossible d’enregistrer les options de performance.");return;}
 $("#resdlg").close();st("Options de performance enregistrées.");
};
$("#k-save").onclick=async()=>{keyVer++;
 cfg={...cfg,mapbox:$("#k-mb").value.trim(),google:$("#k-g").value.trim()};
 await fetch("/api/settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(cfg)});
 $("#dlg").close(); st("Clés enregistrées"); setBase($("#base").value);
};

// ---------- Recherche de lieu ----------
async function search(){
 const q=$("#q").value.trim(); if(!q)return; const L=$("#res-list");
 try{
  const j=await (await fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&accept-language=fr&q="+encodeURIComponent(q))).json();
  L.innerHTML=j.length?"":"<div>Aucun résultat</div>";
  j.forEach(x=>{const d=document.createElement("div");d.textContent=x.display_name;
   d.onclick=()=>{L.innerHTML="";const b=x.boundingbox.map(Number);map.fitBounds([[b[2],b[0]],[b[3],b[1]]],{maxZoom:17,padding:30})};L.appendChild(d)});
 }catch(e){st("⚠️ Recherche impossible : "+e)}
}
$("#qgo").onclick=search; $("#q").onkeydown=e=>{if(e.key=="Enter")search()};

// ---------- Visionneuse d'image (zoom + déplacement) ----------
let id=null,nat={w:0,h:0},k=1,tx=0,ty=0;
const iv=$("#iv"),ib=$("#ib");
const apply=()=>{ib.style.transform=`translate(${tx}px,${ty}px) scale(${k})`;ib.style.setProperty("--inv",1/k)};
function fit(){const r=iv.getBoundingClientRect();k=Math.min(r.width/nat.w,r.height/nat.h)*.95;tx=(r.width-nat.w*k)/2;ty=(r.height-nat.h*k)/2;apply()}
function zoomAt(f,cx,cy){const nk=Math.min(40,Math.max(.01,k*f));tx=cx-(cx-tx)*nk/k;ty=cy-(cy-ty)*nk/k;k=nk;apply()}
iv.addEventListener("wheel",e=>{e.preventDefault();const r=iv.getBoundingClientRect();zoomAt(e.deltaY<0?1.25:.8,e.clientX-r.left,e.clientY-r.top)},{passive:false});
const mid=f=>()=>{if(nat.w){const r=iv.getBoundingClientRect();zoomAt(f,r.width/2,r.height/2)}};
$("#zi").onclick=mid(1.5);$("#zo").onclick=mid(1/1.5);$("#zf").onclick=()=>nat.w&&fit();
let drag=null,tool="pts",rect=null,cropBox=null,angPts=[],colors=[];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const toNat=e=>{const r=iv.getBoundingClientRect();return[(e.clientX-r.left-tx)/k,(e.clientY-r.top-ty)/k]};
function drawRect(){
 const el=$("#cr");if(!el)return;const b=rect?[rect.x0,rect.y0,rect.x1,rect.y1]:cropBox;
 if(!b){el.style.display="none";return}
 Object.assign(el.style,{display:"block",left:Math.min(b[0],b[2])+"px",top:Math.min(b[1],b[3])+"px",width:Math.abs(b[2]-b[0])+"px",height:Math.abs(b[3]-b[1])+"px"});
}
iv.onpointerdown=e=>{
 if(e.target.closest(".zb"))return;
 if(tool=="crop"){const[x,y]=toNat(e),X=clamp(x,0,nat.w),Y=clamp(y,0,nat.h);rect={x0:X,y0:Y,x1:X,y1:Y};iv.setPointerCapture(e.pointerId);return}
 drag={x:e.clientX,y:e.clientY,tx,ty,m:false};iv.setPointerCapture(e.pointerId)};
iv.onpointermove=e=>{
 if(rect){const[x,y]=toNat(e);rect.x1=clamp(x,0,nat.w);rect.y1=clamp(y,0,nat.h);drawRect();return}
 if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>4)drag.m=true;if(drag.m){tx=drag.tx+dx;ty=drag.ty+dy;apply()}};
iv.onpointerup=e=>{
 if(rect){const b=[Math.min(rect.x0,rect.x1),Math.min(rect.y0,rect.y1),Math.max(rect.x0,rect.x1),Math.max(rect.y0,rect.y1)];rect=null;
  cropBox=(b[2]-b[0]>8&&b[3]-b[1]>8)?b:null;drawRect();$("#cropinfo").textContent=cropBox?`Zone : ${Math.round(b[2]-b[0])} × ${Math.round(b[3]-b[1])} px`:"Zone trop petite";return}
 if(!drag)return;const d=drag;drag=null;
 if(d.m||!nat.w)return;const[px,py]=toNat(e);if(px<0||py<0||px>nat.w||py>nat.h)return;
 if(tool=="pts")setImg(px,py);
 else if(tool=="pick")pickColor(px,py);
 else if(tool=="angle"){angPts.push([px,py]);if(angPts.length==2){let a=Math.atan2(angPts[1][1]-angPts[0][1],angPts[1][0]-angPts[0][0])*180/Math.PI;if(a>90)a-=180;if(a<-90)a+=180;$("#rot").value=a.toFixed(2);angPts=[];setTool("pts");st(`Angle mesuré : ${a.toFixed(2)}° → cliquez « Pivoter » (onglet Image)`)}}
};

// ---------- Grille ----------
/*GRID*/
const nice=x=>{const e=Math.pow(10,Math.floor(Math.log10(x))),m=x/e;return(m<=1?1:m<=2?2:m<=5?5:10)*e};
function gridSys(sys,lon,lat){
 if(sys=="ll")return{ll:true,unit:"°",k:111320,fwd:(a,b)=>[a,b],inv:(x,y)=>[x,y]};
 if(sys=="gp")return{ll:true,gr:true,unit:" gr",k:100188,fwd:(a,b)=>[(a-PARIS)/0.9,b/0.9],inv:(x,y)=>[x*0.9+PARIS,y*0.9]};
 let def=sys=="dzn"?DZN:L93;
 if(sys=="utm"){const z=Math.min(60,Math.max(1,Math.floor((lon+180)/6)+1));def=`+proj=utm +zone=${z}${lat<0?" +south":""} +datum=WGS84 +units=m +no_defs`}
 const c=proj4("WGS84",def);
 return{ll:false,km:sys=="dzn",unit:" m",k:1,fwd:(a,b)=>c.forward([a,b]),inv:(x,y)=>c.inverse([x,y])};
}
function buildGrid(B,sys,manual,zoom){
 const clat=(B.s+B.n)/2,clon=(B.w+B.e)/2,g=gridSys(sys,clon,clat);
 const s=Math.max(B.s,-84),n=Math.min(B.n,84),P=[];
 for(let i=0;i<=12;i++){const t=i/12,lo=B.w+(B.e-B.w)*t,la=s+(n-s)*t;P.push([lo,s],[lo,n],[B.w,la],[B.e,la])}
 const Q=P.map(p=>g.fwd(p[0],p[1]));
 let minX=Math.min(...Q.map(q=>q[0])),maxX=Math.max(...Q.map(q=>q[0])),minY=Math.min(...Q.map(q=>q[1])),maxY=Math.max(...Q.map(q=>q[1]));
 if(g.ll){const L=g.gr?94:85;minY=Math.max(minY,-L);maxY=Math.min(maxY,L)}
 const mpp=78271.517*Math.cos(clat*Math.PI/180)/Math.pow(2,zoom);
 const cnt=t=>(maxX-minX)/t+(maxY-minY)/t;
 let step=manual>0?manual:nice(120*mpp/g.k);
 if(manual>0){if(cnt(step)>800)return{features:[],step,g}}else while(cnt(step)>400)step*=2;
 const dec=Math.min(8,Math.max(0,-Math.floor(Math.log10(step)+1e-9)));
 const lab=(v,isX)=>g.gr?(v<0?"-":"")+Math.abs(v).toFixed(Math.max(2,dec)).replace(".","g ")
  :g.ll?`${Math.abs(v).toFixed(dec)}°${isX?(v<0?"W":"E"):(v<0?"S":"N")}`
  :g.km?`${isX?"X":"Y"} ${(v/1000).toFixed(Math.max(0,dec-3))}`
  :`${isX?"X":"Y"} ${v.toFixed(dec)}`;
 const feats=[],N=24;
 for(let i=Math.ceil(minX/step);i<=Math.floor(maxX/step);i++){const x=i*step,co=[];for(let j=0;j<=N;j++)co.push(g.inv(x,minY+(maxY-minY)*j/N));feats.push({type:"Feature",properties:{label:lab(x,true)},geometry:{type:"LineString",coordinates:co}})}
 for(let i=Math.ceil(minY/step);i<=Math.floor(maxY/step);i++){const y=i*step,co=[];for(let j=0;j<=N;j++)co.push(g.inv(minX+(maxX-minX)*j/N,y));feats.push({type:"Feature",properties:{label:lab(y,false)},geometry:{type:"LineString",coordinates:co}})}
 return{features:feats,step,g};
}
/*ENDGRID*/
let gridState=null,gq=0;
function drawGrid(){
 const src=map.getSource("grid");if(!src)return;
 if(!$("#gon").checked){src.setData({type:"FeatureCollection",features:[]});gridState=null;$("#gstep").textContent="";return}
 const b=map.getBounds();
 try{
  const r=buildGrid({w:b.getWest(),s:b.getSouth(),e:b.getEast(),n:b.getNorth()},$("#gsys").value,parseFloat($("#gst").value.replace(",",".")),map.getZoom());
  const f=r.features.filter(x=>x.geometry.coordinates.every(c=>isFinite(c[0])&&isFinite(c[1])));
  src.setData({type:"FeatureCollection",features:f});
  gridState={...r.g,step:r.step};
  $("#gstep").textContent=f.length?"pas "+r.step+r.g.unit:"pas trop petit";
 }catch(e){}
}
map.on("move",()=>{if(!gq){gq=1;requestAnimationFrame(()=>{gq=0;drawGrid()})}});
["gon","gsys"].forEach(i=>$("#"+i).onchange=drawGrid);$("#gst").oninput=drawGrid;

// ---------- Points de contrôle (annuler/rétablir, déplacer, supprimer) ----------
let gcps=[],pend={img:null,geo:null},mm=[],sel=-1,hist=[],fut=[];
const stateJS=()=>JSON.stringify({gcps,pend});
const commit=()=>{hist.push(stateJS());if(hist.length>300)hist.shift();fut=[]};   // à appeler AVANT une modification
const restore=js=>{const o=JSON.parse(js);gcps=o.gcps;pend=o.pend;sel=-1;redraw()};
const undo=()=>{if(hist.length){fut.push(stateJS());restore(hist.pop())}};
const redo=()=>{if(fut.length){hist.push(stateJS());restore(fut.pop())}};
const badge=(n,c)=>{const e=document.createElement("div");e.className="pt "+c;e.innerHTML=`<span class="pn">${n}</span>`;return e};
const place=(e,p)=>{e.style.left=p.px+"px";e.style.top=p.py+"px"};
function del(i){commit();gcps.splice(i,1);sel=-1;redraw()}
function centerImg(px,py){const r=iv.getBoundingClientRect();tx=r.width/2-px*k;ty=r.height/2-py*k;apply()}
function dragImg(e,i){
 e.oncontextmenu=ev=>{ev.preventDefault();del(i)};
 e.onpointerdown=ev=>{
  ev.stopPropagation();ev.preventDefault();e.setPointerCapture(ev.pointerId);
  let moved=false;sel=i;
  const mv=x=>{
   const r=iv.getBoundingClientRect();
   if(!moved){moved=true;commit()}
   gcps[i].px=Math.min(nat.w,Math.max(0,(x.clientX-r.left-tx)/k));
   gcps[i].py=Math.min(nat.h,Math.max(0,(x.clientY-r.top-ty)/k));
   place(e,gcps[i]);
  };
  const up=()=>{e.removeEventListener("pointermove",mv);e.removeEventListener("pointerup",up);redraw()};
  e.addEventListener("pointermove",mv);e.addEventListener("pointerup",up);
 };
}
function redraw(){
 ib.querySelectorAll(".ip").forEach(x=>x.remove());mm.forEach(m=>m.remove());mm=[];
 gcps.forEach((g,i)=>{
  const e=badge(i+1,"ip"+(i==sel?" sel":""));place(e,g);dragImg(e,i);ib.appendChild(e);
  const me=badge(i+1,i==sel?"sel":"");
  const m=new maplibregl.Marker({element:me,draggable:true}).setLngLat([g.lon,g.lat]).addTo(map);
  m.on("dragstart",()=>commit());
  m.on("dragend",()=>{const l=m.getLngLat();gcps[i].lon=l.lng;gcps[i].lat=l.lat;sel=i;redraw()});
  me.addEventListener("click",ev=>{ev.stopPropagation();sel=i;redraw()});
  me.oncontextmenu=ev=>{ev.preventDefault();del(i)};
  mm.push(m);
 });
 if(pend.img){const e=badge(gcps.length+1,"ip wait");place(e,pend.img);ib.appendChild(e)}
 if(pend.geo)mm.push(new maplibregl.Marker({element:badge(gcps.length+1,"wait")}).setLngLat([pend.geo.lon,pend.geo.lat]).addTo(map));
 $("#list").innerHTML=gcps.map((g,i)=>`<div data-r="${i}" class="${i==sel?"sel":""}"><b>${i+1}</b><span>image ${g.px.toFixed(0)}, ${g.py.toFixed(0)} → lat ${g.lat.toFixed(6)}, lon ${g.lon.toFixed(6)}</span><a href="#" data-i="${i}">✕</a></div>`).join("")||"<div>Aucun point</div>";
 updGo();redrawHook();
 st(!id?"Chargez d'abord une image":pend.img?"Point image placé → donnez sa position sur la carte (clic ou coordonnées)":pend.geo?"Position carte placée → cliquez le point correspondant sur l'image":sel>=0?`Point ${sel+1} sélectionné · glisser = déplacer · Suppr (ou clic droit) = supprimer · Ctrl+Z / Ctrl+Y`:`${gcps.length} point(s) · cliquez un point sur l'image (ou une position sur la carte)`);
}
function tryDone(){if(pend.img&&pend.geo){gcps.push({...pend.img,...pend.geo});pend={img:null,geo:null};sel=gcps.length-1}redraw()}
function setImg(px,py){commit();pend.img={px,py};tryDone()}
function setGeo(lon,lat){commit();pend.geo={lon,lat};tryDone()}
// Mesures géodésiques, dessin et grille limitée à un polygone
let measureMode=null, measurePts=[], measureFeatures=[], gridShown=false, refMode=false, gridPolygon=[], measureUndo=[], measureRedo=[];
function snapshotMeasure(){measureUndo.push(JSON.stringify({features:measureFeatures,polygon:gridPolygon}));if(measureUndo.length>100)measureUndo.shift();measureRedo=[];}
function restoreMeasure(v){const o=JSON.parse(v);measureFeatures=o.features||[];gridPolygon=o.polygon||[];updateMeasure();}
function undoMeasure(){if(!measureUndo.length)return;measureRedo.push(JSON.stringify({features:measureFeatures,polygon:gridPolygon}));restoreMeasure(measureUndo.pop());}
function redoMeasure(){if(!measureRedo.length)return;measureUndo.push(JSON.stringify({features:measureFeatures,polygon:gridPolygon}));restoreMeasure(measureRedo.pop());}
function hav(a,b){const R=6371008.8,rad=x=>x*Math.PI/180,dLat=rad(b[1]-a[1]),dLon=rad(b[0]-a[0]),la=rad(a[1]),lb=rad(b[1]);const h=Math.sin(dLat/2)**2+Math.cos(la)*Math.cos(lb)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));}
function fmtDist(m){return m>=1000?(m/1000).toFixed(2)+' km':m.toFixed(1)+' m'}
function polyDist(a){let n=0;for(let i=1;i<a.length;i++)n+=hav(a[i-1],a[i]);return n}
function polyArea(coords){if(coords.length<3)return 0;const R=6378137,rad=x=>x*Math.PI/180;let s=0;for(let i=0,j=coords.length-1;i<coords.length;j=i++){s+=rad(coords[i][0]-coords[j][0])*(2+Math.sin(rad(coords[j][1]))+Math.sin(rad(coords[i][1])))}return Math.abs(s*R*R/2)}
function inPoly(pt,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if(((a[1]>pt[1])!==(b[1]>pt[1]))&&(pt[0]<(b[0]-a[0])*(pt[1]-a[1])/(b[1]-a[1])+a[0]))inside=!inside;}return inside;}
function ensureMeasureSource(){if(!map.getSource('user-measure')){map.addSource('user-measure',{type:'geojson',data:{type:'FeatureCollection',features:[]}});map.addLayer({id:'user-measure-line',type:'line',source:'user-measure',filter:['==',['geometry-type'],'LineString'],paint:{'line-color':['coalesce',['get','color'],'#ff8c00'],'line-width':['coalesce',['get','width'],3],'line-dasharray':[2,1]}});map.addLayer({id:'user-measure-area',type:'fill',source:'user-measure',filter:['==',['geometry-type'],'Polygon'],paint:{'fill-color':['coalesce',['get','color'],'#fca311'],'fill-opacity':0.18}});map.addLayer({id:'user-measure-outline',type:'line',source:'user-measure',paint:{'line-color':['coalesce',['get','color'],'#f08c00'],'line-width':['coalesce',['get','width'],2]}});}}
function updateMeasure(){ensureMeasureSource();const fs=[...measureFeatures];if(gridPolygon.length>1){const ring=[...gridPolygon,...(gridPolygon.length>=3?[gridPolygon[0]]:[])];fs.push({type:'Feature',properties:{kind:'grid-boundary',color:drawColor(),width:drawWidth()},geometry:{type:'LineString',coordinates:ring}})}if(measurePts.length>1){let pts=measurePts.slice();if((measureMode==='area'||measureMode==='gridpoly')&&pts.length>=3){const ring=[...pts,pts[0]];fs.push({type:'Feature',properties:{kind:'area',color:drawColor(),width:drawWidth()},geometry:{type:'Polygon',coordinates:[ring]}})}else fs.push({type:'Feature',properties:{kind:'line',color:drawColor(),width:drawWidth()},geometry:{type:'LineString',coordinates:pts}})}map.getSource('user-measure').setData({type:'FeatureCollection',features:fs});}
function drawColor(){return document.getElementById('draw-color').value||'#ff8c00'}function drawWidth(){return Math.max(1,Math.min(12,Number(document.getElementById('draw-width').value)||3))}
function setMeasure(mode){measureMode=mode;refMode=mode==='ref';measurePts=[];document.querySelectorAll('#map-tools button').forEach(b=>b.classList.remove('on'));document.getElementById(mode==='line'?'measure-line':mode==='path'?'measure-path':mode==='area'?'measure-area':mode==='gridpoly'?'grid-polygon':'ref-line')?.classList.add('on');document.getElementById('map-tool-status').textContent=mode==='gridpoly'?'Cliquez les sommets du polygone, double-clic pour fermer':mode==='area'?'Cliquez les sommets, double-clic pour terminer':mode==='ref'?'Cliquez les deux extrémités du repère':'Cliquez les points, double-clic pour terminer';map.getCanvas().style.cursor='crosshair';}
function finishMeasure(){if(measureMode==='gridpoly'&&measurePts.length>=3){snapshotMeasure();gridPolygon=measurePts.slice();measureFeatures=measureFeatures.filter(f=>f.properties?.kind!=='grid');document.getElementById('map-tool-status').textContent='Polygone de grille défini';if(gridShown)drawMetricGrid();}else if(refMode&&measurePts.length>=2){snapshotMeasure();measureFeatures.push({type:'Feature',properties:{kind:'reference',color:drawColor(),width:drawWidth()},geometry:{type:'LineString',coordinates:measurePts.slice(0,2)}});document.getElementById('map-tool-status').textContent='Ligne de repère créée · '+fmtDist(polyDist(measurePts.slice(0,2)));}else if(measureMode==='area'&&measurePts.length>=3){snapshotMeasure();const a=polyArea(measurePts);measureFeatures.push({type:'Feature',properties:{kind:'area',area_m2:a,color:drawColor(),width:drawWidth()},geometry:{type:'Polygon',coordinates:[[...measurePts,measurePts[0]]]}});document.getElementById('map-tool-status').textContent='Surface : '+(a>=1e6?(a/1e6).toFixed(3)+' km²':a.toFixed(1)+' m²');}else if(measurePts.length>=2){snapshotMeasure();const d=polyDist(measurePts);measureFeatures.push({type:'Feature',properties:{kind:'measurement',distance_m:d,color:drawColor(),width:drawWidth()},geometry:{type:'LineString',coordinates:measurePts.slice()}});document.getElementById('map-tool-status').textContent='Distance : '+fmtDist(d);}measurePts=[];measureMode=null;refMode=false;map.getCanvas().style.cursor='';document.querySelectorAll('#map-tools button').forEach(b=>b.classList.remove('on'));updateMeasure();}
function drawMetricGrid(){
 ensureMeasureSource();
 const status=document.getElementById('map-tool-status');
 if(gridPolygon.length<3){status.textContent='Dessinez d’abord un polygone avec « Polygone grille »';return;}
 const step=Math.max(1,Number(document.getElementById('grid-spacing').value)||100),poly=gridPolygon;
 // Projection locale en mètres : la grille et le découpage utilisent le même repère.
 const lat0=poly.reduce((a,p)=>a+p[1],0)/poly.length,lon0=poly.reduce((a,p)=>a+p[0],0)/poly.length;
 const mx=111320*Math.max(.01,Math.cos(lat0*Math.PI/180)),my=110574;
 const xy=poly.map(p=>[(p[0]-lon0)*mx,(p[1]-lat0)*my]);
 const toLL=p=>[p[0]/mx+lon0,p[1]/my+lat0];
 const inside=(p)=>{let yes=false;for(let i=0,j=xy.length-1;i<xy.length;j=i++){const a=xy[i],b=xy[j];if(((a[1]>p[1])!==(b[1]>p[1]))&&(p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]))yes=!yes;}return yes;};
 const xs=xy.map(p=>p[0]),ys=xy.map(p=>p[1]),xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys),features=[];
 // Intersection exacte d'une droite de grille avec le contour; chaque intervalle intérieur devient un segment.
 function clipVertical(x){const hits=[];for(let i=0,j=xy.length-1;i<xy.length;j=i++){const a=xy[j],b=xy[i];if((a[0]<=x&&b[0]>x)||(b[0]<=x&&a[0]>x)){const y=a[1]+(x-a[0])*(b[1]-a[1])/(b[0]-a[0]);hits.push(y);}}hits.sort((a,b)=>a-b);for(let k=0;k+1<hits.length;k+=2){const y1=hits[k],y2=hits[k+1];if(y2-y1>.01&&inside([x,(y1+y2)/2]))addLine([x,y1],[x,y2]);}}
 function clipHorizontal(y){const hits=[];for(let i=0,j=xy.length-1;i<xy.length;j=i++){const a=xy[j],b=xy[i];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y)){const x=a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]);hits.push(x);}}hits.sort((a,b)=>a-b);for(let k=0;k+1<hits.length;k+=2){const x1=hits[k],x2=hits[k+1];if(x2-x1>.01&&inside([(x1+x2)/2,y]))addLine([x1,y],[x2,y]);}}
 function addLine(a,b){features.push({type:'Feature',properties:{kind:'grid',color:drawColor(),width:drawWidth()},geometry:{type:'LineString',coordinates:[toLL(a),toLL(b)]}})}
 const xStart=Math.ceil(xmin/step)*step,yStart=Math.ceil(ymin/step)*step;
 for(let x=xStart;x<=xmax+1e-7;x+=step)clipVertical(x);
 for(let y=yStart;y<=ymax+1e-7;y+=step)clipHorizontal(y);
 measureFeatures=[...measureFeatures.filter(f=>f.properties?.kind!=='grid'),...features];updateMeasure();
 status.textContent=`Grille limitée au polygone : ${features.length} segments · pas ${step} m`;
}
document.getElementById('measure-line').onclick=()=>setMeasure('line');document.getElementById('measure-path').onclick=()=>setMeasure('path');document.getElementById('measure-area').onclick=()=>setMeasure('area');document.getElementById('ref-line').onclick=()=>setMeasure('ref');document.getElementById('grid-polygon').onclick=()=>setMeasure('gridpoly');document.getElementById('measure-finish').onclick=finishMeasure;document.getElementById('measure-undo').onclick=undoMeasure;document.getElementById('measure-redo').onclick=redoMeasure;document.getElementById('measure-clear').onclick=()=>{snapshotMeasure();measurePts=[];measureFeatures=[];gridPolygon=[];updateMeasure();document.getElementById('map-tool-status').textContent='Mesures et dessins effacés'};document.getElementById('grid-toggle').onclick=()=>{gridShown=!gridShown;document.getElementById('grid-toggle').classList.toggle('on',gridShown);if(gridShown){snapshotMeasure();drawMetricGrid();}else{snapshotMeasure();measureFeatures=measureFeatures.filter(f=>f.properties?.kind!=='grid');updateMeasure()}};document.getElementById('grid-spacing').onchange=()=>{if(gridShown){snapshotMeasure();drawMetricGrid()}};document.getElementById('draw-color').onchange=()=>updateMeasure();document.getElementById('draw-width').onchange=()=>updateMeasure();map.on('moveend',()=>{if(gridShown)drawMetricGrid()});
// Logo personnalisable du panneau d’accueil (persisté localement)
const logoImg=document.querySelector('#landing .lico');try{const savedLogo=localStorage.getItem('kaliphetiles_landing_logo');if(savedLogo)logoImg.src=savedLogo;}catch(_){}document.getElementById('logo-pick').onclick=()=>document.getElementById('logo-file').click();document.getElementById('logo-file').onchange=e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{localStorage.setItem('kaliphetiles_landing_logo',r.result);logoImg.src=r.result;}catch(_){alert('Image trop volumineuse pour être mémorisée. Choisissez un logo plus petit.')}};r.readAsDataURL(f);};document.getElementById('logo-reset').onclick=()=>{try{localStorage.removeItem('kaliphetiles_landing_logo')}catch(_){}logoImg.src='/icon.png';};
// Prévenir la fermeture si le projet contient des modifications. Les navigateurs imposent leur dialogue natif.
let projectDirty=false;const markDirty=()=>{if(layers.length)projectDirty=true};window.addEventListener('beforeunload',e=>{if(projectDirty&&layers.length){e.preventDefault();e.returnValue='Votre projet n’est pas enregistré. Voulez-vous quitter sans enregistrer ?';return e.returnValue;}});document.getElementById('b-savetop')?.addEventListener('click',()=>{setTimeout(()=>{projectDirty=false},700)});document.getElementById('b-save')?.addEventListener('click',()=>{setTimeout(()=>{projectDirty=false},700)});document.getElementById('b-saveas')?.addEventListener('click',()=>{setTimeout(()=>{projectDirty=false},700)});document.getElementById('file')?.addEventListener('change',markDirty);document.getElementById('measure-clear')?.addEventListener('click',markDirty);document.getElementById('grid-polygon')?.addEventListener('click',markDirty);document.getElementById('measure-line')?.addEventListener('click',markDirty);document.getElementById('measure-path')?.addEventListener('click',markDirty);document.getElementById('measure-area')?.addEventListener('click',markDirty);


document.getElementById('b-merge-images')?.addEventListener('click',async()=>{
  if(!layers.length){st('Importez au moins une image avant de fusionner.');return;}
  const btn=document.getElementById('b-merge-images');btn.disabled=true;
  try{
    const r=await fetch('/api/merge-images',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:layers.map(l=>l.id),names:layers.map(l=>l.name)})});
    const j=await r.json();if(!r.ok)throw new Error(j.detail||'Fusion impossible');
    const a=document.createElement('a');a.href=j.url;a.download=j.name;a.click();
    st('Image assemblée créée : '+j.name+' (assemblage horizontal, sans géoréférencement).');
  }catch(e){st('⚠️ '+e.message)}finally{btn.disabled=false}
});
// UX: menus compacts de type ruban et outils cartographiques
// Glisser-déposer des images directement dans la fenêtre Image ou sur la page
window.addEventListener('dragover',e=>{if([...e.dataTransfer.types].includes('Files'))e.preventDefault()});window.addEventListener('drop',e=>{const fs=[...(e.dataTransfer?.files||[])];if(!fs.length)return;const target=e.target;const imgs=fs.filter(f=>/\.(png|jpe?g|tiff?|webp)$/i.test(f.name));const vec=fs.filter(f=>/\.(geojson|json|kml|zip|dxf|svg|pdf)$/i.test(f.name));if(target.closest?.('#lyr'))return;e.preventDefault();if(imgs.length){const dt=new DataTransfer();imgs.forEach(f=>dt.items.add(f));const fi=document.getElementById('file');fi.files=dt.files;fi.dispatchEvent(new Event('change',{bubbles:true}));}if(vec.length){const dt=new DataTransfer();vec.forEach(f=>dt.items.add(f));const fi=document.getElementById('vector-file');fi.files=dt.files;fi.dispatchEvent(new Event('change',{bubbles:true}));}});
const fileProxy=document.getElementById("file-menu-proxy"); if(fileProxy) fileProxy.addEventListener("change",()=>{if(fileProxy.files?.length){const dt=new DataTransfer();[...fileProxy.files].forEach(f=>dt.items.add(f));const f=document.getElementById("file");f.files=dt.files;f.dispatchEvent(new Event("change",{bubbles:true}));fileProxy.value="";}});
const openTopMenu=document.getElementById("b-opentop-menu"); if(openTopMenu)openTopMenu.onclick=()=>document.getElementById("b-opentop")?.click();
map.on("dblclick",e=>{if(measureMode||refMode){e.preventDefault();finishMeasure();}});
map.on("click",e=>{
 if(measureMode||refMode){measurePts.push([e.lngLat.lng,e.lngLat.lat]);updateMeasure();if(refMode&&measurePts.length>=2)finishMeasure();return;}
 if(moveMode||Date.now()<noClickUntil)return;
 const t=e.originalEvent.target;if(t&&t.closest&&t.closest(".pt"))return;
 let{lng,lat}=e.lngLat,snapped=null;
 if($("#gon").checked&&$("#snap").checked&&gridState){
  const g=gridState,[x,y]=g.fwd(lng,lat),sx=Math.round(x/g.step)*g.step,sy=Math.round(y/g.step)*g.step;
  [lng,lat]=g.inv(sx,sy);
  const d=Math.max(0,-Math.floor(Math.log10(g.step)+1e-9));
  snapped=g.gr?`${sy.toFixed(Math.max(2,d))} gr / ${sx.toFixed(Math.max(2,d))} gr`:g.ll?`lat ${sy.toFixed(d)}°, lon ${sx.toFixed(d)}°`:`X ${sx.toFixed(d)} · Y ${sy.toFixed(d)}`;
 }
 setGeo(lng,lat);
 if(snapped)st("🧲 Aimanté sur l'intersection "+snapped+" → maintenant le point correspondant sur l'image");
});
$("#list").onclick=e=>{
 const a=e.target.closest("a");
 if(a){e.preventDefault();del(+a.dataset.i);return}
 const r=e.target.closest("[data-r]");if(!r)return;
 sel=+r.dataset.r;const g=gcps[sel];redraw();
 map.flyTo({center:[g.lon,g.lat],zoom:Math.max(map.getZoom(),13)});centerImg(g.px,g.py);
};
$("#undo").onclick=undo;$("#redo").onclick=redo;
document.addEventListener("keydown",e=>{
 const T=e.target,tag=(T.tagName||"").toLowerCase();
 if(tag=="textarea"||(tag=="input"&&["text","number"].includes(T.type)))return;
 const c=e.ctrlKey||e.metaKey,key=e.key.toLowerCase();
 if(c&&key=="z"&&!e.shiftKey){e.preventDefault();undo()}
 else if(c&&(key=="y"||(key=="z"&&e.shiftKey))){e.preventDefault();redo()}
 else if((e.key=="Delete"||e.key=="Backspace")&&sel>=0){e.preventDefault();del(sel)}
 else if(c&&key=="s"){e.preventDefault();saveProject(e.shiftKey)}
 else if(e.key=="Escape"&&(moveMode||document.querySelector(".win.full"))){if(moveMode)$("#b-move").click();const f=document.querySelector(".win.full");if(f){f.classList.remove("full");setTimeout(()=>{map.resize();nat.w&&fit()},50)}}
 else if(e.key=="Escape"){if(pend.img||pend.geo){commit();pend={img:null,geo:null}}else sel=-1;redraw()}
});
function coordText(){
 const a=$("#coord1").value.trim(),b=$("#coord2").value.trim(),z=$("#czone").value.trim();
 if($("#cf").value=="utm"&&z)return z+" "+a+" "+b;
 return b?a+" "+b:a;
}
function coordLabels(){
 const f=$("#cf").value,lf=$("#lf").checked,geo=["auto","dd","grp","grg"].includes(f);
 const A=geo?(lf?"Longitude":"Latitude"):"X / Est",B=geo?(lf?"Latitude":"Longitude"):"Y / Nord";
 const ex=f=="grp"||f=="grg"?" (ex. 39g 90)":geo?" (ex. 35.87 ou 35°52'12\"N)":"";
 $("#coord1").placeholder=A+ex;$("#coord2").placeholder=B+(f=="grp"||f=="grg"?" (ex. 5g 30)":geo?" (ex. 7.11 ou 7°06'E)":"");
 $("#czone").style.display=f=="utm"?"":"none";
}
$("#cf").onchange=coordLabels;$("#lf").onchange=coordLabels;coordLabels();
function placeCoord(){
 try{
  const p=parseCoords(coordText(),$("#cf").value,$("#lf").checked);
  setGeo(p.lon,p.lat); map.flyTo({center:[p.lon,p.lat],zoom:Math.max(map.getZoom(),14)});
 }catch(e){st("⚠️ "+(e.message||e))}
}
$("#cgo").onclick=placeCoord;["#coord1","#coord2","#czone"].forEach(q=>$(q).onkeydown=e=>{if(e.key=="Enter")placeCoord()});

// ---------- Envoi / traitement ----------
const MINP={affine:3,poly2:6,tps:4};
function newProject(){
 layers=[];cur=-1;id=null;gcps=[];pend={img:null,geo:null};sel=-1;hist=[];fut=[];nat={w:0,h:0};resMode=false;
 const s0=map.getStyle();
 s0.layers.map(l=>l.id).filter(x=>/^pv-|^res$|^frame-l$/.test(x)).forEach(x=>map.removeLayer(x));
 Object.keys(s0.sources).filter(x=>/^pv-|^res$|^frame$/.test(x)).forEach(x=>map.removeSource(x));
}
async function uploadImage(f){
 st("Envoi de l'image…");const fd=new FormData();fd.append("file",f);
 const r=await fetch("/api/maps",{method:"POST",body:fd});
 if(!r.ok){const m="⚠️ Import impossible : "+(await r.json()).detail;st(m);alert(m);return null}
 return r.json();
}
$("#file").onchange=async e=>{const f=e.target.files[0];if(!f)return;const j=await uploadImage(f);if(!j)return;newProject();addLayer(j);e.target.value=""};
$("#addimg").onchange=async e=>{const f=e.target.files[0];if(!f)return;const j=await uploadImage(f);if(!j)return;addLayer(j);staleResult();e.target.value="";st("Image ajoutée au collage : posez ses points")};
function updGo(){saveCur();$("#go").disabled=!layers.some(l=>l.vis&&l.gcps.length>=MINP[l.method])}
$("#go").onclick=async()=>{
 const spec=layersSpec();if(!spec.length)return st("Posez au moins 3 points sur une image visible");
 const out=spec[0].id;$("#go").disabled=true;st("Traitement en cours…");
 const r=await fetch(`/api/maps/${out}/process`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({layers:spec,zmin:+$("#zmin").value,zmax:+$("#zmax").value,hd:$("#hd").checked})});
 if(!r.ok){st("⚠️ "+(await r.json()).detail);updGo();return}
 const t=setInterval(async()=>{
  const m=await (await fetch("/api/maps/"+out)).json();
  if(m.status==="processing")st("Génération des tuiles… "+Math.round((m.progress||0)*100)+" %");
  if(m.status==="done"){clearInterval(t);showResult(m,out);updGo()}
  if(m.status==="error"){clearInterval(t);st("⚠️ "+m.error);updGo()}
 },700);
};
function showResult(m,out){
 for(const l of["res","frame-l"])if(map.getLayer(l))map.removeLayer(l);
 for(const x of["res","frame"])if(map.getSource(x))map.removeSource(x);
 map.addSource("res",{type:"raster",tileSize:256,bounds:m.bounds,tiles:[location.origin+"/data/"+out+"/tiles/{z}/{x}/{y}.png?v="+Date.now()]});
 map.addLayer({id:"res",type:"raster",source:"res",paint:{"raster-opacity":opac()}},"grid-l");
 resMode=true;applyVis();
 map.fitBounds([[m.bounds[0],m.bounds[1]],[m.bounds[2],m.bounds[3]]],{padding:40});
 if(m.frame)fetch(m.frame+"?t="+Date.now()).then(r=>r.json()).then(g=>{
  if(map.getLayer("frame-l")){map.removeLayer("frame-l");map.removeSource("frame")}
  map.addSource("frame",{type:"geojson",data:g});
  map.addLayer({id:"frame-l",type:"line",source:"frame",paint:{"line-color":["match",["get","kind"],"bbox","#2a9d8f","#ff6d00"],"line-width":3,"line-dasharray":[2,1]}},"grid-l");
 });
 const e=m.errors||[],rm=e.length?Math.sqrt(e.reduce((a,b)=>a+b*b,0)/e.length).toFixed(1):"–";
 st(`✅ Terminé · erreur moyenne ${rm} px · zoom ${m.zmin}→${m.zmax}${m.ts==512?" · tuiles 512 px":""} · <a href="#" id="of">Ouvrir le dossier</a><br>🟧 Cadre GeoJSON : <b>exports\\${m.name}_footprint.geojson</b> (contour de chaque image + rectangle englobant, prêt pour QGIS)`);
 $("#of").onclick=ev=>{ev.preventDefault();fetch(`/api/maps/${out}/open`,{method:"POST"})};
}

// ---------- Diagnostic ----------
$("#b-diag").onclick=async()=>{
 const L=["MapLibre : "+(typeof maplibregl!=="undefined"?"chargé":"ABSENT"),"WebGL : "+(document.createElement("canvas").getContext("webgl")?"oui":"NON"),
  `Zone carte : ${$("#map").clientWidth}×${$("#map").clientHeight} px`,`Fond actuel : ${curBase}`];
 $("#dgt").textContent=L.join("\n")+"\n\nTest réseau depuis l'application…";$("#dg").showModal();
 try{const j=await (await fetch("/api/diag")).json();
  L.push("Dossier de travail : "+j.data_dir,"");j.tests.forEach(t=>L.push((t.ok?"✅ ":"❌ ")+t.prov.padEnd(6)+(t.ok?t.ms+" ms":t.error)));
 }catch(e){L.push("Diagnostic impossible : "+e)}
 $("#dgt").textContent=L.join("\n");
};
$("#dgc").onclick=()=>$("#dg").close();

// ---------- Fenêtres flottantes + onglets ----------
let Zi=10;
document.querySelectorAll(".win").forEach(w=>{
 const h=w.querySelector(".wh");w.addEventListener("pointerdown",()=>w.style.zIndex=++Zi,true);
 h.onpointerdown=e=>{
  if(e.target.closest("button"))return;
  const W=$("#ws").getBoundingClientRect(),r=w.getBoundingClientRect(),ox=e.clientX-r.left,oy=e.clientY-r.top;
  h.setPointerCapture(e.pointerId);
  h.onpointermove=ev=>{w.style.left=Math.max(0,ev.clientX-W.left-ox)+"px";w.style.top=Math.max(0,ev.clientY-W.top-oy)+"px"};
  h.onpointerup=()=>{h.onpointermove=null};
 };
 w.querySelector(".wm").onclick=()=>w.classList.toggle("min");
});
new ResizeObserver(()=>map.resize()).observe($("#map"));
document.querySelectorAll(".tabs button").forEach(b=>b.onclick=()=>{
 document.querySelectorAll(".tabs button,.tab").forEach(x=>x.classList.remove("on"));b.classList.add("on");$("#t-"+b.dataset.t).classList.add("on")});

// ---------- Image : rogner, pivoter, couleurs ----------
function showImgErr(){st("⚠️ Le navigateur ne peut pas afficher cette image (fichier abîmé ?). Essayez de la ré-enregistrer en JPG/PNG, ou ouvrez 🔧 Diagnostic.")}
function showImage(j,keep){
 id=j.id||id;nat={w:j.width,h:j.height};
 ib.innerHTML=`<img src="${j.image}?t=${Date.now()}" width="${j.width}" height="${j.height}" onerror="showImgErr()"><div id="cr"></div>`;
 if(!keep)fit();
}
function setTool(t){
 tool=t;angPts=[];[["crop","crop"],["pick","pick"],["angle","ang"]].forEach(([x,i])=>$("#b-"+i).classList.toggle("on",x==t));
 iv.style.cursor=t=="pts"?"crosshair":"cell";
 if(t!="pts")st({crop:"Rogner : tracez un rectangle sur l'image",pick:"Pipette : cliquez une couleur à supprimer",angle:"Cliquez 2 points d'une ligne qui doit être horizontale"}[t]);
}
$("#b-crop").onclick=()=>setTool(tool=="crop"?"pts":"crop");
$("#b-pick").onclick=()=>setTool(tool=="pick"?"pts":"pick");
$("#b-ang").onclick=()=>setTool(tool=="angle"?"pts":"angle");
async function edit(body,keep){
 if(cur<0)return st("Chargez d'abord une image");
 st("Traitement de l'image…");
 const r=await fetch(`/api/maps/${id}/edit`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...body,gcps})});
 if(!r.ok)return st("⚠️ "+(await r.json()).detail);
 const j=await r.json(),L=layers[cur];
 hist=[];fut=[];gcps=j.gcps;L.gcps=gcps;L.w=j.width;L.h=j.height;L.image=j.image;pend={img:null,geo:null};sel=-1;cropBox=null;$("#cropinfo").textContent="";
 setTool("pts");showImage(j,keep);staleResult();L.sig=undefined;redraw();
}
$("#b-cropgo").onclick=()=>cropBox?edit({op:"crop",box:cropBox}):st("Tracez d'abord une zone (« Sélectionner la zone »)");
$("#b-rot").onclick=()=>{const a=parseFloat($("#rot").value);a?edit({op:"rotate",angle:a}):st("Angle nul")};
$("#b-reset").onclick=()=>{if(id&&confirm("Restaurer l'image d'origine ? Les points seront supprimés."))edit({op:"reset"})};
function renderColors(){$("#sws").innerHTML=colors.map((c,i)=>`<span class="sw" data-i="${i}" style="background:rgb(${c})" title="rgb(${c})">✕</span>`).join("")}
$("#sws").onclick=e=>{const s=e.target.closest(".sw");if(s){colors.splice(+s.dataset.i,1);renderColors()}};
function pickColor(px,py){
 const im=ib.querySelector("img"),c=document.createElement("canvas");c.width=c.height=1;
 const g=c.getContext("2d",{willReadFrequently:true});g.drawImage(im,px,py,1,1,0,0,1,1);
 const d=g.getImageData(0,0,1,1).data;if(d[3]<10)return;colors.push([d[0],d[1],d[2]]);renderColors();
}
$("#b-rm").onclick=async()=>{if(!colors.length)return st("Choisissez d'abord des couleurs avec la pipette");await edit({op:"remove",colors,tol:+$("#tol").value},true);colors=[];renderColors()};

// ---------- Localisation (fichiers world, Ozi, TAB, emprise, affine, coins) ----------
function toLL(x,y){
 const c=$("#lcrs").value;
 if(c=="wgs")return[x,y];
 if(c=="merc")return proj4("EPSG:3857","WGS84",[x,y]);
 const def=c=="utm"?`+proj=utm +zone=${+$("#lz").value||31}${$("#lh").value=="S"?" +south":""} +datum=WGS84 +units=m +no_defs`:c=="l93"?L93:DZN;
 return proj4(def,"WGS84",[x,y]);
}
let locPts=null;
function showLoc(){const m=$("#lm").value;document.querySelectorAll("[data-m]").forEach(e=>e.style.display=e.dataset.m.split(" ").includes(m)?"":"none");locPts=null}
$("#lm").onchange=showLoc;showLoc();
$("#locfile").onchange=async e=>{
 const f=e.target.files[0];if(!f)return;
 try{
  const t=await f.text(),m=$("#lm").value;
  if(m=="wld"){const n=t.match(NUM);if(!n||n.length<6)throw"fichier world invalide (6 lignes attendues)";$("#aff").value=n.slice(0,6).join("\n");st("Valeurs chargées : choisissez le système de coordonnées, puis Appliquer");return}
  const P=[];
  if(m=="tab"){const re=/\(\s*([-\d.eE+]+)\s*,\s*([-\d.eE+]+)\s*\)\s*\(\s*([-\d.eE+]+)\s*,\s*([-\d.eE+]+)\s*\)/g;let a;while((a=re.exec(t)))P.push([+a[3],+a[4],+a[1],+a[2],false])}
  if(m=="ozi")for(const l of t.split(/\r?\n/)){
   if(!/^Point\d+/i.test(l))continue;const c=l.split(",").map(x=>x.trim()),x=parseFloat(c[2]),y=parseFloat(c[3]);
   if(isNaN(x)||isNaN(y)||c[6]===""||c[6]===undefined)continue;
   P.push([x,y,(+c[9]+(+c[10])/60)*(c[11]=="W"?-1:1),(+c[6]+(+c[7])/60)*(c[8]=="S"?-1:1),true]);
  }
  if(P.length<3)throw"moins de 3 points de calage trouvés dans ce fichier";
  locPts=P;st(`${P.length} points lus : cliquez Appliquer`);
 }catch(err){st("⚠️ "+(err.message||err))}
};
function applyLoc(){
 try{
  if(!id)throw"Chargez d'abord une image";
  const m=$("#lm").value,W=nat.w,H=nat.h,N=s=>parseFloat($("#"+s).value.replace(",","."));
  let P=[];
  if(m=="vis")throw"Mode visuel : placez les points sur l'image et la carte";
  if(m=="bbox"){const[w,s,e,n]=["bw","bs","be","bn"].map(N);if([w,s,e,n].some(isNaN))throw"4 valeurs attendues";P=[[0,0,w,n],[W,0,e,n],[W,H,e,s],[0,H,w,s]]}
  else if(m=="aff"||m=="wld"){const n=($("#aff").value.match(NUM)||[]).map(num);if(n.length!=6)throw"6 nombres attendus (A D B E C F)";const[A,D,B,E,C,F]=n;
   P=[[0,0],[W,0],[W,H],[0,H],[W/2,H/2]].map(([x,y])=>[x,y,A*(x-.5)+B*(y-.5)+C,D*(x-.5)+E*(y-.5)+F])}
  else if(m=="cor"){const n=($("#cor").value.match(NUM)||[]).map(num);if(n.length!=6)throw"6 nombres attendus";const[x1,y1,x2,y2,x3,y3]=n;P=[[0,0,x1,y1],[W,0,x2,y2],[W,H,x3,y3],[0,H,x1+x3-x2,y1+y3-y2]]}
  else{if(!locPts)throw"Chargez d'abord le fichier";P=locPts}
  const g=P.map(p=>{const[lon,lat]=p[4]?[p[2],p[3]]:toLL(p[2],p[3]);return{px:p[0],py:p[1],lon,lat}});
  if(g.some(q=>!isFinite(q.lon)||!isFinite(q.lat)||Math.abs(q.lat)>85))throw"coordonnées invalides pour ce système";
  commit();gcps=g;pend={img:null,geo:null};sel=-1;redraw();
  const b=g.reduce((a,q)=>[Math.min(a[0],q.lon),Math.min(a[1],q.lat),Math.max(a[2],q.lon),Math.max(a[3],q.lat)],[180,90,-180,-90]);
  map.fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:40});
  st(`${g.length} points créés — vérifiez sur la carte, puis « Géoréférencer »`);
 }catch(e){st("⚠️ "+(e.message||e))}
}
$("#b-loc").onclick=applyLoc;

// ---------- Zoom des tuiles (range slider 0–24) + estimation ----------
let et=0,nativeZ=18,autoZ=true;
function zrUpdate(){const a=+$("#zmin").value,b=+$("#zmax").value;$("#zl").textContent=`Zoom ${a} → ${b}`+(autoZ?" (auto)":"");$("#rt").style.background=`linear-gradient(90deg,#ccc ${a/24*100}%,#fca311 ${a/24*100}%,#fca311 ${b/24*100}%,#ccc ${b/24*100}%)`}
function zr(e){
 const a=+$("#zmin").value,b=+$("#zmax").value;
 if(e&&e.target.id=="zmin"&&a>b)$("#zmax").value=a;else if(e&&e.target.id=="zmax"&&b<a)$("#zmin").value=b;
 if(e&&e.isTrusted)autoZ=false;
 zrUpdate();scheduleEst();
}
$("#zmin").oninput=zr;$("#zmax").oninput=zr;$("#hd").onchange=()=>scheduleEst();
$("#b-auto").onclick=()=>{autoZ=true;scheduleEst()};
function scheduleEst(){
 clearTimeout(et);
 et=setTimeout(async()=>{
  const el=$("#est"),spec=layersSpec();
  if(!spec.length){el.textContent="Posez 3 points sur une image pour estimer le nombre de tuiles";return}
  try{
   const r=await fetch(`/api/maps/${spec[0].id}/estimate`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({layers:spec,hd:$("#hd").checked,zmin:autoZ?null:+$("#zmin").value,zmax:autoZ?null:+$("#zmax").value})});
   const j=await r.json();if(!r.ok){el.textContent=j.detail;return}
   nativeZ=j.native;
   if(autoZ){$("#zmin").value=j.zmin;$("#zmax").value=j.zmax;zrUpdate()}
   el.textContent=`≈ ${j.total.toLocaleString("fr-FR")} tuiles · zoom natif de l'image ≈ ${j.native}`+(j.total>500000?" ⚠️ trop de tuiles (max 500 000)":"");
  }catch(e){}
 },500);
}
$("#method").onchange=()=>{saveCur();redraw()};zrUpdate();

// ---------- Export (collage : un seul fichier par format) ----------
$("#b-exp").onclick=async()=>{
 const kinds=[...document.querySelectorAll(".xk:checked")].map(x=>x.value),el=$("#exs"),spec=layersSpec();
 if(!spec.length){el.textContent="Posez d'abord 3 points sur une image visible";return}
 if(!kinds.length){el.textContent="Choisissez au moins un format";return}
 el.textContent="Export en cours… (les grandes images peuvent prendre du temps)";
 const r=await fetch(`/api/maps/${spec[0].id}/export`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({layers:spec,kinds,crs:$("#ocrs").value,max_px:+$("#maxpx").value,demtype:$("#otdem").value,dest:exportDest||null,hm:hmOptions()})});
 const j=await r.json();el.textContent=r.ok?"✅ "+j.files.join(" · ")+"\nDossier : "+j.folder:"⚠️ "+j.detail;
};
$("#b-open").onclick=()=>{if(exportDest)return fetch("/api/open_path",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path:exportDest})});const s=layersSpec();s.length&&fetch(`/api/maps/${s[0].id}/open`,{method:"POST"})};

// ---------- Cloud (S3 / R2 / Scaleway / MinIO) ----------
const S3F={endpoint:"s3e",region:"s3r",bucket:"s3b",access_key:"s3a",secret_key:"s3s",prefix:"s3p"};
function loadS3(){const s=cfg.s3||{};for(const k in S3F)$("#"+S3F[k]).value=s[k]||""}
$("#s3preset").onchange=e=>{const p={aws:["","eu-west-3"],r2:["https://<ACCOUNT_ID>.r2.cloudflarestorage.com","auto"],scw:["https://s3.fr-par.scw.cloud","fr-par"],other:["","us-east-1"]}[e.target.value];$("#s3e").value=p[0];$("#s3r").value=p[1]};
$("#b-up").onclick=async()=>{
 const el=$("#ups");const pid=projId();if(!pid)return el.textContent="Chargez d'abord une image";
 const s3={};for(const k in S3F)s3[k]=$("#"+S3F[k]).value.trim();
 cfg.s3=s3;fetch("/api/settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(cfg)});
 const what=[...document.querySelectorAll(".uk:checked")].map(x=>x.value);
 const r=await fetch(`/api/maps/${pid}/upload`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({s3,what})});
 if(!r.ok)return el.textContent="⚠️ "+(await r.json()).detail;
 el.textContent="Envoi…";
 const t=setInterval(async()=>{
  const u=(await (await fetch("/api/maps/"+pid)).json()).upload||{};
  if(u.status=="running")el.textContent="Envoi… "+Math.round((u.progress||0)*100)+" %";
  if(u.status=="error"){clearInterval(t);el.textContent="⚠️ "+u.error}
  if(u.status=="done"){clearInterval(t);el.innerHTML=`✅ ${u.count} fichiers<br>Page de partage : <b>${u.viewer}</b><br>URL de tuiles (QGIS, Leaflet…) : <b>${u.xyz}</b>`}
 },1000);
};

// ---------- Projet ----------
$("#b-openroot").onclick=()=>fetch("/api/open_root",{method:"POST"});
async function openProjectFile(f){
 const fd=new FormData();fd.append("file",f);
 const r=await fetch("/api/projects/open",{method:"POST",body:fd}),j=await r.json();
 if(!r.ok)return st("⚠️ "+j.detail);
 newProject();const p=j.project;
 for(const L of j.layers)layers.push({id:L.id,name:L.name,w:L.width,h:L.height,image:L.image,gcps:L.gcps||[],method:L.method||"affine",vis:L.vis!==false,dem:!!L.dem});
 $("#zmin").value=p.zmin??0;$("#zmax").value=p.zmax??18;$("#ocrs").value=p.crs||"3857";$("#hd").checked=!!p.hd;autoZ=false;zrUpdate();
 if(layers.length){selectLayer(0);layers.forEach((l,i)=>{if(i!=0)schedulePreview(i)})}
 const all=layers.flatMap(l=>l.gcps);
 if(all.length){const b=all.reduce((a,q)=>[Math.min(a[0],q.lon),Math.min(a[1],q.lat),Math.max(a[2],q.lon),Math.max(a[3],q.lat)],[180,90,-180,-90]);map.fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:60})}
 projPath="";st("Projet ouvert : "+layers.map(l=>l.name).join(", "));
}
$("#pf").onchange=e=>{const f=e.target.files[0];e.target.value="";if(f)openProjectFile(f)};

// ---------- Calques (collage) + aperçu en direct ----------
let layers=[],cur=-1,resMode=false,pvTimer={},pvSeq={},moveMode=false,mv=null,noClickUntil=0;
const opac=()=>+$("#opac").value;
function saveCur(){if(cur<0||!layers[cur])return;layers[cur].gcps=gcps;layers[cur].method=$("#method").value}
function layersSpec(){saveCur();return layers.filter(l=>l.vis&&l.gcps.length>=MINP[l.method]).map(l=>({id:l.id,name:l.name,gcps:l.gcps,method:l.method,adj:$("#sync").checked?(l.adj||null):null}))}
function projId(){const s=layersSpec();return s.length?s[0].id:(layers[0]&&layers[0].id)}
function addLayer(j){
 saveCur();layers.push({id:j.id,name:j.name||("Image "+(layers.length+1)),w:j.width,h:j.height,image:j.image,gcps:[],method:"affine",vis:true,dem:!!j.dem});
 if($("#sync").checked)scheduleHarmonize();
 selectLayer(layers.length-1);
}
function selectLayer(i){
 saveCur();cur=i;const L=layers[i];id=L.id;gcps=L.gcps;pend={img:null,geo:null};sel=-1;hist=[];fut=[];
 $("#method").value=L.method;showImage({id:L.id,width:L.w,height:L.h,image:L.image});
 $("#w-img .wh span").textContent="🖼 "+L.name;redraw();renderLayers();
}
function renderLayers(){
 renderTabs();renderMapLayers();updLanding();
 $("#lyr").innerHTML=layers.map((l,i)=>`<div class="ly${i==cur?" sel":""}" data-i="${i}" draggable="true" title="Glisser-déposer pour changer l’ordre Z"><input type="checkbox" class="lv" ${l.vis?"checked":""} title="Inclure dans le collage"><b>${i+1}</b><span class="ln">${l.name}</span><i>${l.gcps.length} pt</i>${l.dem?"<i style='color:#fca311'>MNT</i>":""}<a data-a="up" title="Descendre sous">▲</a><a data-a="dn" title="Monter dessus">▼</a><a data-a="del" title="Retirer">✕</a></div>`).join("")||"<small>Aucune image</small>";
}
let dragLayerIndex=null;
const layerContainer=document.getElementById('lyr');
if(layerContainer){layerContainer.addEventListener('dragstart',e=>{const r=e.target.closest('.ly');if(!r)return;dragLayerIndex=+r.dataset.i;r.classList.add('dragging');e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',String(dragLayerIndex))}catch(_){}});layerContainer.addEventListener('dragover',e=>{const r=e.target.closest('.ly');if(!r||dragLayerIndex===null)return;e.preventDefault();layerContainer.querySelectorAll('.drop-target').forEach(x=>x.classList.remove('drop-target'));r.classList.add('drop-target');e.dataTransfer.dropEffect='move'});layerContainer.addEventListener('dragleave',e=>{e.target.closest('.ly')?.classList.remove('drop-target')});layerContainer.addEventListener('drop',e=>{const r=e.target.closest('.ly');if(!r||dragLayerIndex===null)return;e.preventDefault();const to=+r.dataset.i,from=dragLayerIndex;dragLayerIndex=null;if(from===to)return;saveCur();const [item]=layers.splice(from,1);layers.splice(to,0,item);cur=to;reorderPv();staleResult();renderLayers();st('Ordre Z des calques mis à jour')});layerContainer.addEventListener('dragend',()=>{dragLayerIndex=null;layerContainer.querySelectorAll('.dragging,.drop-target').forEach(x=>x.classList.remove('dragging','drop-target'))})}
function lyrClick(e){
 const row=e.target.closest(".ly");if(!row)return;const i=+row.dataset.i,a=e.target.dataset.a;
 if(e.target.classList.contains("lv")){setVis(i,e.target.checked);return}
 if(a=="del"){closeLayer(i);return}
 if((a=="up"&&i>0)||(a=="dn"&&i<layers.length-1)){
  saveCur();const j=a=="up"?i-1:i+1;[layers[i],layers[j]]=[layers[j],layers[i]];
  cur=cur==i?j:cur==j?i:cur;reorderPv();staleResult();renderLayers();return;
 }
 if(i!=cur)selectLayer(i);
}
$("#lyr").onclick=e=>{lyrClick(e);if($("#sync").checked)scheduleHarmonize()};
function redrawHook(){
 if(cur<0||!layers[cur])return;const L=layers[cur];L.gcps=gcps;
 const sg=JSON.stringify(gcps)+$("#method").value;
 if(L.sig!==sg){L.sig=sg;schedulePreview(cur);staleResult();scheduleEst();renderLayers();if($("#sync").checked)scheduleHarmonize()}
}
function schedulePreview(i){const L=layers[i];if(!L)return;clearTimeout(pvTimer[L.id]);pvTimer[L.id]=setTimeout(()=>doPreview(L),250)}
async function doPreview(L){
 const isCur=L===layers[cur],g=isCur?gcps:L.gcps,m=isCur?$("#method").value:L.method;
 if(g.length<MINP[m]){removePv(L);return}
 const seq=pvSeq[L.id]=(pvSeq[L.id]||0)+1;
 try{
  const r=await fetch(`/api/maps/${L.id}/preview`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({gcps:g,method:m,adj:$("#sync").checked?(L.adj||null):null})});
  if(!r.ok||seq!=pvSeq[L.id])return;
  const j=await r.json();if(seq!=pvSeq[L.id]||!layers.includes(L))return;setPv(L,j);
 }catch(e){}
}
const topAnchor=()=>map.getLayer("frame-l")?"frame-l":"grid-l";
function setPv(L,j){
 const sid="pv-"+L.id,url=j.url+"?t="+Date.now();L.pvc=j.coordinates;
 if(map.getSource(sid))map.getSource(sid).updateImage({url,coordinates:j.coordinates});
 else{map.addSource(sid,{type:"image",url,coordinates:j.coordinates});map.addLayer({id:sid,type:"raster",source:sid,paint:{"raster-opacity":opac(),"raster-fade-duration":0}},topAnchor())}
 reorderPv();applyVis();
}
function removePv(L){const sid="pv-"+L.id;if(map.getLayer(sid))map.removeLayer(sid);if(map.getSource(sid))map.removeSource(sid);L.pvc=null}
function reorderPv(){const a=topAnchor();for(const l of layers)if(map.getLayer("pv-"+l.id))map.moveLayer("pv-"+l.id,a)}
function firstOverlay(){const o=map.getStyle().layers.find(l=>/^hill$|^pv-|^res$|^grid-l$|^frame-l$/.test(l.id));return o&&o.id}
function applyVis(){
 const on=$("#imgvis").checked;
 for(const l of layers){const sid="pv-"+l.id;if(map.getLayer(sid))map.setLayoutProperty(sid,"visibility",on&&l.vis&&!resMode?"visible":"none")}
 if(map.getLayer("res"))map.setLayoutProperty("res","visibility",on?"visible":"none");
}
function staleResult(){
 if(!resMode&&!map.getLayer("res"))return;
 resMode=false;
 for(const l of["res","frame-l"])if(map.getLayer(l))map.removeLayer(l);
 for(const x of["res","frame"])if(map.getSource(x))map.removeSource(x);
 applyVis();
}
$("#imgvis").onchange=applyVis;
$("#opac").oninput=()=>{for(const l of layers)if(map.getLayer("pv-"+l.id))map.setPaintProperty("pv-"+l.id,"raster-opacity",opac());if(map.getLayer("res"))map.setPaintProperty("res","raster-opacity",opac())};
$("#b-ovt").onclick=()=>document.querySelector(".ov").classList.toggle("ovhide");

// ---------- Déplacer l'image avec tous ses points (glisser sur la carte) ----------
const MC=()=>maplibregl.MercatorCoordinate;
const shiftLL=(lng,lat,dx,dy)=>{const p=MC().fromLngLat([lng,lat]),q=new (MC())(p.x+dx,p.y+dy,0).toLngLat();return[q.lng,q.lat]};
$("#b-move").onclick=()=>{
 moveMode=!moveMode;$("#b-move").classList.toggle("on",moveMode);document.body.classList.toggle("moveon",moveMode);
 st(moveMode?"✋ Glissez sur la carte : l'image se déplace avec tous ses points (Échap pour quitter)":"");
};
map.on("mousedown",e=>{if(!moveMode||!gcps.length)return;e.preventDefault();const p=MC().fromLngLat(e.lngLat);mv={x:p.x,y:p.y,g:JSON.parse(JSON.stringify(gcps)),first:true,moved:false}});
map.on("mousemove",e=>{
 if(!mv)return;const p=MC().fromLngLat(e.lngLat),dx=p.x-mv.x,dy=p.y-mv.y;
 if(mv.first&&Math.abs(dx)+Math.abs(dy)<1e-9)return;
 if(mv.first){commit();mv.first=false}mv.moved=true;
 gcps=mv.g.map(g=>{const[lon,lat]=shiftLL(g.lon,g.lat,dx,dy);return{...g,lon,lat}});
 const L=layers[cur];
 if(L&&L.pvc&&map.getSource("pv-"+L.id)){if(!mv.pv)mv.pv=L.pvc;map.getSource("pv-"+L.id).setCoordinates(mv.pv.map(c=>shiftLL(c[0],c[1],dx,dy)))}
 redraw();
});
map.on("mouseup",()=>{if(mv){if(mv.moved)noClickUntil=Date.now()+300;mv=null}});

// ---------- Plein écran par fenêtre ----------
document.querySelectorAll(".win").forEach(w=>{
 const t=()=>{w.classList.toggle("full");setTimeout(()=>{map.resize();nat.w&&fit()},60)};
 w.querySelector(".wf").onclick=t;w.querySelector(".wh").ondblclick=e=>{if(!e.target.closest("button"))t()};
});


// ---------- Synchronisation des couleurs, actualisation de l'aperçu ----------
let hzTimer=0;
function scheduleHarmonize(){clearTimeout(hzTimer);hzTimer=setTimeout(doHarmonize,800)}
async function doHarmonize(){
 if(!$("#sync").checked){layers.forEach((l,i)=>{if(l.adj){l.adj=null;schedulePreview(i)}});staleResult();return}
 const spec=layersSpec().map(l=>({...l,adj:null}));
 if(spec.length<2){layers.forEach(l=>l.adj=null);return}
 try{
  const r=await fetch("/api/harmonize",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({layers:spec})});
  if(!r.ok)return;const j=(await r.json()).adj;
  layers.forEach((l,i)=>{const a=j[l.id]||null;if(JSON.stringify(a)!==JSON.stringify(l.adj||null)){l.adj=a;schedulePreview(i)}});
  staleResult();st("🎨 Couleurs synchronisées entre les images");
 }catch(e){}
}
$("#sync").onchange=doHarmonize;
$("#b-refresh").onclick=()=>{
 staleResult();layers.forEach(l=>{l.sig=undefined});
 if($("#sync").checked)doHarmonize();
 layers.forEach(l=>doPreview(l));st("🔄 Aperçu actualisé");
};

// ---------- Relief 3D ----------
let t3d=false;
function set3D(on){
 t3d=on;$("#b-3d").classList.toggle("on",on);
 if(on){
  if(!map.getSource("dem"))map.addSource("dem",{type:"raster-dem",tiles:[location.origin+"/tiles/terrarium/{z}/{x}/{y}"],encoding:"terrarium",tileSize:256,maxzoom:15});
  if(!map.getLayer("hill"))map.addLayer({id:"hill",type:"hillshade",source:"dem",paint:{"hillshade-exaggeration":.3}},firstOverlay());
  map.setTerrain({source:"dem",exaggeration:+$("#exag").value});map.easeTo({pitch:60,duration:700});
 }else{
  map.setTerrain(null);map.easeTo({pitch:0,bearing:0,duration:500});if(map.getLayer("hill"))map.removeLayer("hill");
 }
}
$("#b-3d").onclick=()=>set3D(!t3d);$("#b-3d2").onclick=()=>set3D(!t3d);
$("#exag").oninput=()=>{$("#exv").textContent=$("#exag").value;if(t3d)map.setTerrain({source:"dem",exaggeration:+$("#exag").value})};
map.on("error",e=>{if(e.sourceId==="dem"&&!berr._dem){berr._dem=1;st("⚠️ Relief 3D : les tuiles d'altitude ne se chargent pas (internet ?). Cliquez sur 🔧 Diagnostic.")}});

// ---------- OpenTopography ----------
$("#ot-save").onclick=async()=>{
 cfg.opentopo=$("#ot-key").value.trim();
 await fetch("/api/settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(cfg)});
 $("#ot-out").textContent="✅ Clé enregistrée";
};
$("#ot-test").onclick=async()=>{
 const o=$("#ot-out"),btn=$("#ot-test");btn.disabled=true;o.textContent="Test de connexion OpenTopography…\n1. Enregistrement de la clé…";
 try{
  cfg.opentopo=$("#ot-key").value.trim();
  const saved=await fetch("/api/settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(cfg)});
  if(!saved.ok)throw new Error("Impossible d’enregistrer la clé (HTTP "+saved.status+")");
  o.textContent="Test de connexion OpenTopography…\nVérification Internet, DNS, HTTPS et API (cela peut prendre jusqu’à une minute)…";
  const response=await fetch("/api/opentopo/diag",{cache:"no-store"});
  if(!response.ok)throw new Error("Le serveur de diagnostic répond HTTP "+response.status);
  const j=await response.json();
  o.textContent=(j.steps||[]).map(s=>(s.ok?"✅ ":"❌ ")+s.step+" — "+(s.detail|| (s.ok?"OK":"Échec"))+(Number.isFinite(s.ms)?" ("+s.ms+" ms)":"")+(!s.ok&&s.hint?"\n   ↳ "+s.hint:"" )).join("\n");
  if(!j.steps?.length)o.textContent="⚠️ Le diagnostic n’a retourné aucune étape.";
 }catch(e){o.textContent="❌ Test impossible : "+(e?.message||e)+"\nVérifiez que le serveur KalipheTiles est démarré."}
 finally{btn.disabled=false;}
};

// ---------- Accueil, onglets d'images, calques sur la carte ----------
let projPath="",exportDest="";
function updLanding(){$("#landing").classList.toggle("hide",layers.length>0);if(!layers.length)$("#w-img .wh span").textContent="🖼 Image à géoréférencer"}
$("#l-open").onclick=()=>$("#file").click();$("#l-proj").onclick=()=>$("#pf").click();
["dragover","drop"].forEach(t=>$("#ws").addEventListener(t,async e=>{
 e.preventDefault();if(t!="drop")return;const f=e.dataTransfer.files[0];if(!f)return;
 if(/\.ktproj$/i.test(f.name))return openProjectFile(f);
 const j=await uploadImage(f);if(!j)return;
 if(layers.length){addLayer(j);staleResult()}else{newProject();addLayer(j)}
}));
function renderTabs(){
 $("#itabs").innerHTML=layers.map((l,i)=>`<div class="itab${i==cur?" on":""}" data-i="${i}" title="${l.name}"><span>${l.name}</span><b class="x">✕</b></div>`).join("")+`<div class="itab plus" id="itab-add" title="Ajouter une image (nouvel onglet)">＋</div>`;
}
$("#itabs").onclick=e=>{
 const t=e.target.closest(".itab");if(!t)return;
 if(t.id=="itab-add"){$("#addimg").click();return}
 const i=+t.dataset.i;if(e.target.closest(".x")){closeLayer(i);return}if(i!=cur)selectLayer(i);
};
$("#itabs").onauxclick=e=>{if(e.button==1){const t=e.target.closest(".itab");if(t&&t.dataset.i!=null)closeLayer(+t.dataset.i)}};
function closeLayer(i){
 if(!confirm("Retirer cette image du projet ?"))return;
 saveCur();removePv(layers[i]);layers.splice(i,1);cur=-1;staleResult();
 if(!layers.length){newProject();ib.innerHTML="";renderLayers();redraw();return}
 selectLayer(Math.min(i,layers.length-1));
}
function renderMapLayers(){
 $("#mlay").innerHTML=layers.map((l,i)=>`<label class="mrow"><input type="checkbox" data-i="${i}" ${l.vis?"checked":""}> <b>${i+1}</b> ${l.name}</label>`).join("");
}
function setVis(i,v){
 layers[i].vis=v;if(v&&!map.getLayer("pv-"+layers[i].id))schedulePreview(i);
 applyVis();staleResult();updGo();scheduleEst();renderLayers();if($("#sync").checked)scheduleHarmonize();
}
$("#mlay").onchange=e=>{if(e.target.dataset.i!=null)setVis(+e.target.dataset.i,e.target.checked)};
$("#b-ml").onclick=()=>$("#mlay").classList.toggle("hide");
$("#b-contrast").onclick=()=>edit({op:"contrast"});

// ---------- Thème clair / sombre ----------
function setTheme(dark){document.getElementById("darkcss").disabled=!dark;$("#b-theme").textContent=dark?"☀":"🌙";$("#b-theme").title=dark?"Passer en mode clair":"Passer en mode sombre";cfg.theme=dark?"dark":"light"}
$("#b-theme").onclick=()=>{setTheme(document.getElementById("darkcss").disabled);fetch("/api/settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(cfg)})};

// ---------- Choix de l'emplacement : projet et exports ----------
async function pickSave(name){
 const api=window.pywebview&&window.pywebview.api;
 if(api&&api.choose_save){const r=await api.choose_save(name);return r||null}
 const r=prompt("Chemin complet du fichier projet (.ktproj) :",(cfg.out_dir||"C:\\Users\\Public\\Documents")+"\\"+name);return r&&r.trim()||null;
}
async function pickFolder(){
 const api=window.pywebview&&window.pywebview.api;
 if(api&&api.choose_folder)return (await api.choose_folder())||null;
 const r=prompt("Chemin complet du dossier de destination :",cfg.out_dir||"");return r&&r.trim()||null;
}
async function saveProject(as){
 if(!layers.length)return st("Rien à enregistrer");saveCur();
 let path=projPath;
 if(as||!path){path=await pickSave((layers[0].name||"projet")+".ktproj");if(!path)return}
 const r=await fetch("/api/save_project",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({layers:layers.map(l=>({id:l.id,name:l.name,gcps:l.gcps,method:l.method,vis:l.vis})),zmin:+$("#zmin").value,zmax:+$("#zmax").value,crs:$("#ocrs").value,hd:$("#hd").checked,dest:path})});
 const j=await r.json();if(!r.ok)return st("⚠️ "+j.detail);
 projPath=j.path;$("#prs").textContent="💾 "+j.path;st("💾 Projet enregistré : "+j.path);
}
$("#b-save").onclick=()=>saveProject(false);$("#b-savetop").onclick=()=>saveProject(false);$("#b-saveas").onclick=()=>saveProject(true);
$("#b-opentop").onclick=()=>$("#pf").click();
async function chooseDest(){
 const p=await pickFolder();if(!p)return;exportDest=p;cfg.out_dir=p;$("#destv").textContent=$("#destv2").textContent=p;
 fetch("/api/settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(cfg)});
}
$("#b-dest").onclick=chooseDest;$("#b-dest2").onclick=chooseDest;

// ---------- Heightmap OpenTopography ----------
function hmOptions(){
 const mode=$("#hm-mode").value,o={mode,margin:parseFloat($("#hm-margin").value)||0,clip:$("#hm-clip").checked,max_side:+$("#hm-side").value,
  outputs:[...document.querySelectorAll(".hk:checked")].map(x=>x.value),demtype:$("#otdem").value};
 if(mode=="view"){const b=map.getBounds();o.bbox=[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()]}
 return o;
}
function hmBBox(){
 const o=hmOptions(),m=o.margin;let pts;
 if(o.mode=="view"){const[w,s,e,n]=o.bbox;return[w-m,s-m,e+m,n+m]}
 if(o.mode=="gcps")pts=layersSpec().flatMap(l=>l.gcps).map(g=>[g.lon,g.lat]);
 else pts=layers.filter(l=>l.vis&&l.pvc).flatMap(l=>l.pvc);
 if(!pts.length)return null;
 const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);return[Math.min(...xs)-m,Math.min(...ys)-m,Math.max(...xs)+m,Math.max(...ys)+m];
}
$("#hm-show").onclick=()=>{
 const b=hmBBox(),o=$("#ot-out");if(!b){o.textContent="Posez d'abord des points (l'emprise dépend des images calées)";return}
 const g={type:"Feature",geometry:{type:"Polygon",coordinates:[[[b[0],b[1]],[b[2],b[1]],[b[2],b[3]],[b[0],b[3]],[b[0],b[1]]]]}};
 if(map.getSource("hmbox"))map.getSource("hmbox").setData(g);
 else{map.addSource("hmbox",{type:"geojson",data:g});map.addLayer({id:"hmbox-l",type:"line",source:"hmbox",paint:{"line-color":"#00e5ff","line-width":3,"line-dasharray":[3,2]}})}
 map.fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:60});
 o.textContent=`Emprise du MNT : ouest ${b[0].toFixed(5)}, sud ${b[1].toFixed(5)}, est ${b[2].toFixed(5)}, nord ${b[3].toFixed(5)}`;
};
$("#hm-go").onclick=async()=>{
 const o=$("#ot-out"),spec=layersSpec();
 if(!spec.length){o.textContent="Posez d'abord 3 points sur une image";return}
 if(!document.querySelectorAll(".hk:checked").length){o.textContent="Cochez au moins un format de sortie";return}
 cfg.opentopo=$("#ot-key").value.trim();
 await fetch("/api/settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(cfg)});
 o.textContent="Téléchargement et traitement du MNT OpenTopography…";
 try{
  const r=await fetch(`/api/maps/${spec[0].id}/export`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({layers:spec,kinds:["heightmap"],crs:"3857",max_px:0,demtype:$("#otdem").value,dest:exportDest||null,hm:hmOptions()})});
  const j=await r.json();o.textContent=r.ok?"✅ "+j.files.join(" · ")+"\nDossier : "+j.folder:"⚠️ "+j.detail;
 }catch(e){o.textContent="⚠️ "+e}
};
redraw();

// Outils vectoriels / CAD et PMTiles
let importedVector=null; const cadStatus=$("#cad-status");
function showVector(data){
 importedVector=data; const id="kt-imported-vector";
 try{
  [id+"-fill",id+"-line",id+"-point"].forEach(x=>{if(map.getLayer(x))map.removeLayer(x)});
  if(map.getSource(id))map.removeSource(id);
  map.addSource(id,{type:"geojson",data});
  map.addLayer({id:id+"-fill",type:"fill",source:id,filter:["==",["geometry-type"],"Polygon"],paint:{"fill-color":"#00d4ff","fill-opacity":0.18}});
  map.addLayer({id:id+"-line",type:"line",source:id,filter:["in",["geometry-type"],["literal",["LineString","MultiLineString","Polygon","MultiPolygon"]]],paint:{"line-color":"#00d4ff","line-width":2}});
  map.addLayer({id:id+"-point",type:"circle",source:id,filter:["in",["geometry-type"],["literal",["Point","MultiPoint"]]],paint:{"circle-radius":5,"circle-color":"#ff8c00","circle-stroke-color":"#fff","circle-stroke-width":1.5}});
  const pts=[]; const walk=c=>{if(Array.isArray(c)&&typeof c[0]==="number"&&typeof c[1]==="number")pts.push(c);else if(Array.isArray(c))c.forEach(walk)};
  (data.features||[]).forEach(f=>walk(f.geometry?.coordinates));
  if(pts.length){const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);if(xs.every(Number.isFinite)&&ys.every(Number.isFinite)){const b=[[Math.min(...xs),Math.min(...ys)],[Math.max(...xs),Math.max(...ys)]];if(b[0][0]!==b[1][0]||b[0][1]!==b[1][1])map.fitBounds(b,{padding:45,maxZoom:16});}}
  cadStatus.textContent=`${(data.features||[]).length} entité(s) vectorielle(s) affichée(s)`;
 }catch(e){cadStatus.textContent="Vecteur chargé, affichage impossible : "+e.message}
}
$("#vector-file").addEventListener("change",async ev=>{const f=ev.target.files?.[0];if(!f)return;cadStatus.textContent="Import en cours…";try{const fd=new FormData();fd.append("file",f);const r=await fetch("/api/vector/import",{method:"POST",body:fd});const j=await r.json();if(!r.ok)throw Error(j.detail||"import impossible");showVector(j)}catch(e){cadStatus.textContent="⚠️ "+e.message}ev.target.value=""});
$("#vector-dxf").onclick=async()=>{if(!importedVector){cadStatus.textContent="Importez d'abord un vecteur.";return}cadStatus.textContent="Préparation du DXF…";try{const r=await fetch("/api/vector/export-dxf",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({geojson:importedVector,name:"kaliphetiles_vectors"})});if(!r.ok){const j=await r.json();throw Error(j.detail||"export impossible")}const blob=await r.blob(),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="kaliphetiles_vectors.dxf";a.click();URL.revokeObjectURL(url);cadStatus.textContent="DXF exporté."}catch(e){cadStatus.textContent="⚠️ "+e.message}};
$("#pmtiles-export").onclick=async()=>{const id=(typeof layers!=="undefined"&&layers.length)?layers[Math.max(0,cur||0)].id:null;if(!id){cadStatus.textContent="Importez une image et lancez Géoréférencer d'abord.";return}cadStatus.textContent="Conversion PMTiles…";try{const r=await fetch(`/api/maps/${id}/export-pmtiles`,{method:"POST"});if(!r.ok){const j=await r.json();throw Error(j.detail||"export impossible")}const blob=await r.blob(),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="kaliphetiles.pmtiles";a.click();URL.revokeObjectURL(url);cadStatus.textContent="PMTiles exporté."}catch(e){cadStatus.textContent="⚠️ "+e.message}};

