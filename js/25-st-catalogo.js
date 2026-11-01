/* ===================== STARSTEAM — CATÁLOGO GLOBAL (cartas, técnicos, nações, anúncios) =====================
   Tudo o que o MingauCoach adiciona ou remove fica na nuvem em /cat e /ann e vale para todos os jogadores. */
ST.cat={removed:{},purged:{},custom:{},mgrs:{},nations:{}};ST.ann=[];ST.catT=0;
const ST_ORIG={players:ST_DB.players.slice(),mgrs:ST_MANAGERS.slice(),nations:new Set(Object.keys(ST_NATIONS))};
const ST_CAT_LS='stars_st_cat_v1';
const stObjVals=o=>o?Array.isArray(o)?o.filter(Boolean):Object.values(o).filter(Boolean):[];
const stSlug=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,24)||'x';
const stCatDef=c=>c&&ST.cat?(c.kind==='manager'?ST.cat.mgrs[c.pid]:c.src==='c'?ST.cat.custom[c.pid]:null):null;

function stCatApply(){
  const C=ST.cat;
  /* nações extras (com bandeira em imagem) */
  Object.keys(ST_NATIONS).forEach(k=>{if(!ST_ORIG.nations.has(k))delete ST_NATIONS[k]});
  Object.entries(C.nations||{}).forEach(([k,v])=>{if(v&&v.n)ST_NATIONS[k]={n:v.n,f:[],l:[],img:v.img||''}});
  /* ligas cadastradas no jogo ficam disponíveis para cartas e técnicos */
  Object.keys(ST_EXTRA_LG).forEach(k=>{if(k.startsWith('rl:'))delete ST_EXTRA_LG[k]});
  if(typeof stRegLeagueList==='function')stRegLeagueList().forEach(l=>{ST_EXTRA_LG[l.id]=l.n});
  /* jogadores */
  const list=ST_ORIG.players.filter(p=>!C.removed[p.id]);
  stObjVals(C.custom).forEach(d=>{
    if(C.removed[d.id])return;
    if(d.league&&d.leagueN)ST_EXTRA_LG[d.league]=d.leagueN;
    list.push({id:d.id,name:d.name,pos:d.pos,alt:(d.alt||[]).slice(),ovr:+d.ovr,nat:d.nat||'',league:d.league||'',leagueN:d.leagueN||'',club:d.club||'',clubId:d.clubId||('cx:'+stSlug(d.club)),
      stats:(d.stats&&d.stats.length===6?Object.values(d.stats):ST_PROFILE[d.pos].map(o=>stClamp(Math.round(+d.ovr+o),18,99))).map(Number),rar:d.rar||'comum',face:d.face||{sk:2,hr:1,st:1},hue:d.hue||210,src:'c',noPack:!!d.noPack});
  });
  /* atletas criados na aba Times/Atletas viram cartas base, como as genéricas */
  if(typeof stRegCards==='function')stRegCards().forEach(p=>{if(!C.removed[p.id])list.push(p)});
  ST_DB.players.length=0;list.forEach(p=>ST_DB.players.push(p));
  Object.keys(ST_DB.byId).forEach(k=>delete ST_DB.byId[k]);ST_DB.players.forEach(p=>{ST_DB.byId[p.id]=p});
  Object.keys(ST_TOTW_CACHE).forEach(k=>delete ST_TOTW_CACHE[k]);
  /* treinadores */
  const ml=ST_ORIG.mgrs.filter(m=>!C.removed[m.id]);
  stObjVals(C.mgrs).forEach(d=>{if(!C.removed[d.id]){if(d.league&&d.leagueN)ST_EXTRA_LG[d.league]=d.leagueN;ml.push({id:d.id,name:d.name,nat:d.nat||'',league:d.league||'',leagueN:d.leagueN||'',rar:d.special?'especial':'comum',kind:'manager',hue:210,face:{sk:0,hr:5,st:0},special:!!d.special})}});
  ST_MANAGERS.length=0;ml.forEach(m=>ST_MANAGERS.push(m));
}
function stCatNormalize(d){
  const C={removed:{},purged:{},custom:{},mgrs:{},nations:{}};
  if(!d)return C;
  ['removed','purged'].forEach(k=>{C[k]=d[k]&&typeof d[k]==='object'?d[k]:{}});
  ['custom','mgrs','nations'].forEach(k=>{C[k]=d[k]&&typeof d[k]==='object'?d[k]:{}});
  Object.values(C.custom).forEach(x=>{if(x){x.alt=stObjVals(x.alt);if(x.stats)x.stats=stObjVals(x.stats)}});
  return C;
}
try{const l=JSON.parse(localStorage.getItem(ST_CAT_LS));if(l){ST.cat=stCatNormalize(l.cat);ST.ann=stObjVals(l.ann);stCatApply()}}catch(e){}
async function stCatLoad(force){
  if(!stCloudOk())return;
  if(!force&&Date.now()-ST.catT<60000)return;
  ST.catT=Date.now();
  const [a,b]=await Promise.all([stGet('/cat'),stGet('/ann')]);
  if(a.ok){ST.cat=stCatNormalize(a.data);stCatApply()}
  if(b.ok)ST.ann=stObjVals(b.data?Object.entries(b.data).map(([k,v])=>v&&{...v,id:k}):[]).sort((x,y)=>(y.ts||0)-(x.ts||0));
  try{localStorage.setItem(ST_CAT_LS,JSON.stringify({cat:ST.cat,ann:ST.ann}))}catch(e){}
  if(ST.club)stCatEnforce();
}
/* cartas "removidas do jogo com remoção nos clubes": viram moedas (venda rápida) para quem as tinha */
function stCatEnforce(){
  const c=ST.club;if(!c)return;let n=0,coins=0;
  Object.values(c.cards).forEach(k=>{
    if(!ST.cat.purged[k.pid])return;
    coins+=k.kind==='player'?stQuickSell(k):200;stRemoveCard(k.id);n++;
  });
  if(n){c.coins+=coins;stNote(`📦 ${n} carta(s) foram retiradas do jogo. Você recebeu ${stFmt(coins)} moedas de compensação.`);stSave({pub:true})}
}
async function stCatSet(path,val){return val===null?stDel('/cat/'+path):stPut('/cat/'+path,val)}

/* criar uma instância de carta a partir do catálogo */
function stCardFromPid(pid){
  if(ST_DB.byId[pid])return stMakeCard(ST_DB.byId[pid]);
  const m=ST_MANAGERS.find(x=>x.id===pid);if(m)return stMakeManager(m);
  const s=stStadiumsAll().find(x=>x.id===pid);if(s)return stMakeStadium(s);
  return null;
}

/* estádios: os genéricos + os estádios reais dos times cadastrados no jogo */
function stStadiumsAll(){
  const out=ST_STADIUMS.slice();
  (typeof teams!=='undefined'?teams:[]).forEach(t=>{
    if(!t||t.priv||t._st||(!t.stadium&&!t.stadiumImg))return;
    out.push({id:'rt:'+t.id,name:t.stadium||('Estádio do '+t.name),cap:Math.max(5000,+t.fans||30000),hue:stHash('st'+t.id)%360,real:1});
  });
  return out;
}

/* ---------- Anúncios (Novidades) ---------- */
function stAnnHTML(a){
  const cards=(a.cards||[]).map(pid=>stCardFromPid(pid)).filter(Boolean);
  return `<div class="st-ann">${a.img?`<img class="st-ann-img" src="${stAttr(a.img)}" alt="">`:''}<div class="st-ann-b"><h3 class="t">${esc(a.title||'')}</h3><p>${esc(a.text||'').replace(/\n/g,'<br>')}</p>
    ${cards.length?`<div class="st-ann-cards">${cards.map(c=>stCardHTML(c,{size:'sm',tilt:true})).join('')}</div>`:''}<small class="st-fine">${a.ts?new Date(a.ts).toLocaleDateString('pt-BR'):''}</small></div></div>`;
}
function stAnnPopup(){
  const c=ST.club;if(!c||!ST.ann.length)return;
  c.seenAnn=c.seenAnn||{};
  const fresh=ST.ann.filter(a=>!c.seenAnn[a.id]).slice(0,3);
  if(!fresh.length||$('st-modal'))return;
  fresh.forEach(a=>{c.seenAnn[a.id]=1});stSave();
  stModal(`<h2 class="t">📢 Novidades do StarsTeam</h2>${fresh.map(stAnnHTML).join('')}<div class="row" style="margin-top:.8rem"><button class="btn" data-act="mclose">Entendi</button></div>`,'wide');
}
