/* ===================== STARS SIMULATOR — núcleo ===================== */
const $=id=>document.getElementById(id);
const closeM=id=>{const m=$(id);if(m)m.classList.remove('on')};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PH='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" rx="14" fill="#16233a"/><circle cx="50" cy="38" r="16" fill="#2b3f61"/><path d="M18 92a32 28 0 0 1 64 0z" fill="#2b3f61"/></svg>');
const load=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const rnd=(a,b)=>Math.random()*(b-a)+a;
const gauss=()=>{let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
const openness=()=>Math.min(3,Math.exp(gauss()*.7-.245));
const WEEK=7*864e5;

let teams=load('stars_teams',[]),players=load('stars_players',[]),logs=load('stars_logs',[]),leagues=load('stars_leagues',[]);
let S=load('stars_season',null);
let currentUser=sessionStorage.getItem('stars_user')||'';
const ADMIN_NAME='MingauCoach',PASS='MingauPrime67';
const isAdmin=()=>currentUser===ADMIN_NAME;
const MSG_ADM='Apenas o MingauCoach pode editar. Você pode jogar e criar ligas personalizadas.';
let editTeamId=null,editPlayerId=null,tactics={};
let M=null,QQ=[],playing=false,PK=null;
let ST_LIVE=false;   /* true durante partidas do StarsTeam: times/atletas temporários não podem ser salvos nem sincronizados */

/* ---------- Armazenamento com carimbo (sincronização) e times privados ---------- */
const MK=['stars_teams','stars_players','stars_leagues'];
let HID={teams:[],players:[]},DEL=load('stars_del',{}),MERGING=false,SYNC=false;
const SNAP={};
const strip=o=>{const c={...o};delete c._m;return JSON.stringify(c)};
function rebuildSnap(){MK.forEach(k=>{SNAP[k]={};load(k,[]).forEach(o=>{if(o&&o.id)SNAP[k][o.id]=strip(o)})})}
function stampList(k,arr){
  const now=Date.now(),hid=new Set((k==='stars_teams'?HID.teams:k==='stars_players'?HID.players:[]).map(o=>o.id)),cur={};
  arr.forEach(o=>{if(!o||!o.id)return;const s=strip(o);cur[o.id]=s;if(SNAP[k][o.id]!==s)o._m=now});
  let dd=false;
  Object.keys(SNAP[k]).forEach(id=>{if(!(id in cur)&&!hid.has(id)){DEL[id]=now;dd=true}});
  SNAP[k]=cur;
  if(dd)localStorage.setItem('stars_del',JSON.stringify(DEL));
}
const store=(k,v)=>{
  if(ST_LIVE&&MK.includes(k))return true;
  try{
    let out=v;
    if(MK.includes(k)&&Array.isArray(v))stampList(k,v);
    if(k==='stars_teams')out=v.concat(HID.teams);else if(k==='stars_players')out=v.concat(HID.players);
    localStorage.setItem(k,JSON.stringify(out));localStorage.setItem('stars_ts',Date.now());cloudDirty();return true;
  }catch(e){toast('Não foi possível salvar: armazenamento cheio ou bloqueado pelo navegador.');return false}
};
const visT=t=>!t.priv||t.author===currentUser;
function applyVis(){
  const aT=[...teams,...HID.teams],aP=[...players,...HID.players];
  teams=aT.filter(visT);HID.teams=aT.filter(t=>!visT(t));
  const h=new Set(HID.teams.map(t=>t.id));
  players=aP.filter(p=>!h.has(p.teamId));HID.players=aP.filter(p=>h.has(p.teamId));
}

function toast(m){const t=$('toast');if(!t)return;t.textContent=m;t.style.display='block';clearTimeout(t._t);t._t=setTimeout(()=>t.style.display='none',3000)}
function askConfirm(msg,cb){$('conf-msg').textContent=msg;$('conf-yes').onclick=()=>{$('m-conf').classList.remove('on');cb()};$('m-conf').classList.add('on')}
function applyRole(){
  $('nav-logs').style.display=isAdmin()?'':'none';
  if(!isAdmin()&&$('tab-logs').classList.contains('active'))goTab('home');
  renderLogs();
  document.body.classList.toggle('noadm',!isAdmin());
  const c=$('l-priv');
  if(c){
    if(!isAdmin()){c.checked=true;c.dataset.forced='1';pvToggleBox(true)}
    else if(c.dataset.forced){c.checked=false;delete c.dataset.forced;pvToggleBox(false)}
    c.disabled=!isAdmin();
  }
}

/* ---------- Autenticação ---------- */
const BAD_LONG=['merda','porra','caralho','bosta','buceta','viado','arrombado','foder','foda','cuzao','vagabund','babaca','idiota','fuck','shit','asshole','bitch','dick','cunt','bastard','nigger','pussy','whore','slut'];
const BAD_SHORT=['cu','puta','puto','fdp','pqp','vsf','tnc','crl','prr','pau','piru'];
function isProfane(name){
  const n=name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/0/g,'o').replace(/[1!]/g,'i').replace(/3/g,'e').replace(/[4@]/g,'a').replace(/\$/g,'s');
  const joined=n.replace(/[^a-z]/g,'');
  if(BAD_LONG.some(w=>joined.includes(w)))return true;
  return n.split(/[^a-z]+/).some(t=>BAD_SHORT.includes(t));
}
function coachNameInput(){$('coach-pass-fg').style.display=$('coach-name').value.trim()===ADMIN_NAME?'':'none'}
function registerCoach(){
  const name=$('coach-name').value.trim().replace(/\s+/g,' '),err=$('coach-err');
  const fail=m=>{err.textContent=m;err.style.display='block'};
  if(!name)return fail('Digite o nome do técnico.');
  if(name.length<2)return fail('O nome precisa ter pelo menos 2 caracteres.');
  if(isProfane(name))return fail('🚨 Nome ofensivo não permitido! Escolha outro nome.');
  if(name===ADMIN_NAME){
    if($('coach-pass').value!==PASS)return fail('🔒 Senha incorreta.');
    sessionStorage.setItem('stars_auth','1');
  }else sessionStorage.removeItem('stars_auth');
  currentUser=name;sessionStorage.setItem('stars_user',name);
  $('user-name').textContent=name;$('m-coach').classList.remove('on');err.style.display='none';
  applyRole();applyVis();refreshAll();twRender();renderTotwHome();
  log(`Técnico registrado: ${name}`);
}

/* ---------- Navegação ---------- */
function lgRestore(){const mg=$('lg-play')&&$('lg-play').querySelector('.match-grid');if(mg)$('tab-match').appendChild(mg)}
function goTab(id){
  if(id==='logs'&&!isAdmin())return;
  if(id==='match'&&M&&M.ctx&&M.lg)id='leagues';
  const tab=$('tab-'+id);if(!tab)return;
  if(id==='match'&&!(M&&M.ctx))lgRestore();
  document.querySelectorAll('.tab').forEach(e=>e.classList.remove('active'));
  document.querySelectorAll('.nav-btn[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));
  tab.classList.add('active');
  const run=f=>{try{f()}catch(err){console.error('[Stars] aba '+id+':',err)}};
  if(id==='teams'){run(fillTeamSelects);run(renderTactics)}
  if(id==='leagues')run(renderSeason);
  if(id==='logs')run(renderLogs);
  if(id==='totw')run(twRender);
  if(id==='players')run(renderPlayers);
}
document.querySelectorAll('header .nav-btn[data-tab]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();goTab(b.dataset.tab)}));

function stats(){$('c-teams').textContent=teams.length;$('c-players').textContent=players.length}
function log(text,type='info'){
  logs.unshift({user:currentUser||'Sistema',text,date:new Date().toLocaleString('pt-BR'),type});
  if(logs.length>500)logs.length=500;
  store('stars_logs',logs);renderLogs();stats();
}
function renderLogs(){
  const l=$('logs');if(!l)return;
  if(!isAdmin()){l.innerHTML='';return}
  l.innerHTML=logs.length?logs.map(x=>`<div class="tick"><span>📝</span><div><b>[${esc(x.date)}] ${esc(x.user)}:</b> ${esc(x.text)}</div></div>`).join(''):'<div class="tick">Nenhuma ação registrada ainda.</div>';
}
function shrinkImg(src,max,cb,type){
  const im=new Image();
  im.onload=()=>{
    const m=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');
    c.width=Math.max(1,Math.round(im.width*m));c.height=Math.max(1,Math.round(im.height*m));
    c.getContext('2d').drawImage(im,0,0,c.width,c.height);
    cb(type==='jpeg'?c.toDataURL('image/jpeg',.8):c.toDataURL('image/webp',.8));
  };
  im.onerror=()=>cb(src);
  im.src=src;
}
function upload(ev,target){
  const f=ev.target.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=e=>shrinkImg(e.target.result,target==='t-logo'||target==='l-logo'||target==='lg-logo'?128:180,d=>{$(target).value=d;if(target==='lg-logo')$('lg-prev').src=d});
  r.readAsDataURL(f);ev.target.value='';
}
const teamOf=id=>teams.find(t=>t.id===id);
const POSO=['GK','RB','LB','CB','RWB','LWB','CDM','CM','CAM','RM','LM','RW','LW','CF','ST'];
const posRank=p=>{const i=POSO.indexOf(p);return i<0?99:i};
const byPos=(a,b)=>posRank(a.pos)-posRank(b.pos)||b.ovr-a.ovr||String(a.name).localeCompare(b.name);
const byN=(a,b)=>String(a.name).localeCompare(String(b.name),'pt');
const lgOf=tid=>{const t=teamOf(tid);return t&&t.leagueId&&leagues.some(l=>l.id===t.leagueId)?t.leagueId:'__none'};
const canSee=l=>!(l.custom||l.priv)||!l.author||l.author===currentUser;
const c1=t=>(t&&t.color)||'#2f6bff',c2=t=>(t&&t.color2)||'#ffffff';
