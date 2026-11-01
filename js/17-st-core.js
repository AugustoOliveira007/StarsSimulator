/* ===================== STARSTEAM — NÚCLEO (acesso, clube, química, pacotes, mercado) ===================== */
const ST={club:null,acc:null,accErr:null,accs:{},pubs:{},pubT:0,cfg:{champOpen:false,useReg:true,notice:''},cfgT:0,market:[],marketT:0,saveT:null,cloudT:null,dirtyPub:false,cloudOk:true,view:'hub',busy:false};
const stKey=u=>String(u||'').trim().replace(/[.#$\/\[\]\s]+/g,'_')||'_';
const stUid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const stLsKey=u=>'stars_st_club_'+stKey(u);

/* ---------- Nuvem (Firebase REST) em /stars_st/<código> ---------- */
const stCloudOk=()=>!!(typeof CL!=='undefined'&&CL&&CL.url&&CL.code);
const stBase=()=>CL.url.replace(/\/+$/,'')+'/stars_st/'+encodeURIComponent(CL.code);
async function stReq(method,path,body,query){
  if(!stCloudOk())return{ok:false,err:'Nuvem desligada'};
  try{
    const r=await fetch(stBase()+path+'.json'+(query||''),{method,body:body===undefined?undefined:JSON.stringify(body)});
    if(!r.ok)throw new Error('HTTP '+r.status+(r.status===401||r.status===403?' (regras do Firebase bloqueando)':''));
    return{ok:true,data:await r.json()};
  }catch(e){return{ok:false,err:(e&&e.message)||String(e)}}
}
const stGet=(p,q)=>stReq('GET',p,undefined,q),stPut=(p,b)=>stReq('PUT',p,b),stPatch=(p,b)=>stReq('PATCH',p,b),stPost=(p,b)=>stReq('POST',p,b),stDel=p=>stReq('DELETE',p);
const SV={'.sv':'timestamp'};

/* ---------- Acesso beta ---------- */
const stPinHash=(u,pin)=>String(stHash('stars-st:'+stKey(u)+':'+pin));
const stAccCacheKey=u=>'stars_st_acc_'+stKey(u);
async function stLoadAccess(){
  const key=stKey(currentUser),r=await stGet('/access/'+key);
  if(r.ok){ST.acc=r.data||null;ST.accErr=null;try{localStorage.setItem(stAccCacheKey(currentUser),JSON.stringify(ST.acc||{}))}catch(e){}}
  else{ST.accErr=r.err;let c=null;try{c=JSON.parse(localStorage.getItem(stAccCacheKey(currentUser)))}catch(e){}ST.acc=c&&c.status?c:null}
  return r;
}
function stStatus(){
  if(isAdmin())return 'approved';
  if(!ST.acc)return ST.accErr?'offline':'none';
  return ST.acc.status||'none';
}
const stPinOk=()=>{
  if(isAdmin()||!ST.acc||!ST.acc.pin)return true;
  try{return localStorage.getItem('stars_st_pin_'+stKey(currentUser))===ST.acc.pin}catch(e){return false}
};
function stCheckPin(pin){
  if(!ST.acc||!ST.acc.pin)return true;
  if(stPinHash(currentUser,pin)!==ST.acc.pin)return false;
  try{localStorage.setItem('stars_st_pin_'+stKey(currentUser),ST.acc.pin)}catch(e){}
  return true;
}
async function stRequestAccess(pin){
  const key=stKey(currentUser),cur=await stGet('/access/'+key);
  if(!cur.ok)return cur;
  if(cur.data&&cur.data.status==='approved'){ST.acc=cur.data;return{ok:true}}
  const h=stPinHash(currentUser,pin),rec={name:currentUser,status:'pending',ts:SV,pin:h};
  const r=await stPut('/access/'+key,rec);
  if(r.ok){ST.acc={...rec,ts:Date.now()};try{localStorage.setItem('stars_st_pin_'+key,h);localStorage.setItem(stAccCacheKey(currentUser),JSON.stringify(ST.acc))}catch(e){}}
  return r;
}
async function stLoadCfg(force){
  if(!force&&Date.now()-ST.cfgT<20000)return;
  ST.cfgT=Date.now();
  const r=await stGet('/cfg');
  if(r.ok&&r.data)ST.cfg={champOpen:!!r.data.champOpen,useReg:r.data.useReg!==false,notice:r.data.notice||''};
  if(typeof stCatLoad==='function')await stCatLoad(force);
}

/* ---------- Clube: criação, normalização e persistência ---------- */
function stBlankSquad(n,form){return{name:n||'Esquadrão',formation:form||'4-3-3',slots:Array(11).fill(''),bench:Array(7).fill(''),atk:'eq',def:'eq',captain:'',pk:''}}
function stNewClub(o){
  return{v:1,rev:0,created:Date.now(),user:currentUser,name:o.name,code:o.code,crest:o.crest,kits:o.kits,ball:o.ball||'b1',
    coins:ST_START_COINS,cards:{},packs:[],squads:[stBlankSquad('Esquadrão 1'),stBlankSquad('Esquadrão 2'),stBlankSquad('Esquadrão 3')],sq:0,mgr:'',stad:'',
    st:{p:0,w:0,d:0,l:0,gf:0,ga:0},rv:{wk:stWeekId(),wins:0,games:0,pts:0,div:10,rating:1000,claimed:{},streak:0,hist:[]},
    sb:{wk:stWeekId(),pts:0,claimed:{},played:0},ch:{wk:'',qual:false,po:false,played:0,wins:0,pts:0,res:[],claimed:false,active:false},chPending:[],
    draft:null,obj:{},sbc:{},mk:{},esc:{},npc:{},done:{},daily:0,log:[],msgs:[],pend:null,seen:{},tut:{}};
}
function stNormalize(c){
  if(!c)return c;
  const d=stNewClub({name:c.name,code:c.code,crest:c.crest,kits:c.kits});
  ['cards','mk','esc','npc','done','obj','sbc','seen','tut'].forEach(k=>{if(!c[k]||typeof c[k]!=='object')c[k]={}});
  ['packs','chPending','log','msgs'].forEach(k=>{c[k]=Array.isArray(c[k])?c[k]:c[k]?Object.values(c[k]):[]});
  c.st=Object.assign({},d.st,c.st);c.rv=Object.assign({},d.rv,c.rv);c.sb=Object.assign({},d.sb,c.sb);c.ch=Object.assign({},d.ch,c.ch);
  ['claimed'].forEach(k=>{c.rv[k]=c.rv[k]||{};c.sb[k]=c.sb[k]||{}});
  c.rv.hist=Array.isArray(c.rv.hist)?c.rv.hist:c.rv.hist?Object.values(c.rv.hist):[];
  c.ch.res=Array.isArray(c.ch.res)?c.ch.res:c.ch.res?Object.values(c.ch.res):[];
  if(!Array.isArray(c.squads))c.squads=c.squads?Object.values(c.squads):[];
  while(c.squads.length<3)c.squads.push(stBlankSquad('Esquadrão '+(c.squads.length+1)));
  c.squads.forEach(s=>{
    const fix=(a,n)=>{const out=Array(n).fill('');if(a)Object.keys(a).forEach(k=>{if(+k<n)out[+k]=a[k]||''});return out};
    s.slots=fix(s.slots,11);s.bench=fix(s.bench,7);s.formation=s.formation||'4-3-3';s.atk=s.atk||'eq';s.def=s.def||'eq';s.captain=s.captain||'';s.pk=s.pk||'';
  });
  c.sq=c.sq||0;c.coins=Math.max(0,+c.coins||0);c.mgr=c.mgr||'';c.stad=c.stad||'';c.ball=c.ball||'b1';
  Object.values(c.cards).forEach(k=>{k.alt=Array.isArray(k.alt)?k.alt:k.alt?Object.values(k.alt):[];if(k.stats&&!Array.isArray(k.stats))k.stats=Object.values(k.stats)});
  return c;
}
async function stLoadClub(){
  const key=stKey(currentUser);let local=null,cloud=null;
  try{local=JSON.parse(localStorage.getItem(stLsKey(currentUser)))}catch(e){}
  const r=await stGet('/clubs/'+key);
  if(r.ok&&r.data&&r.data.name)cloud=r.data;
  ST.cloudOk=r.ok||!stCloudOk()?r.ok:false;
  let c=null;
  if(cloud&&(!local||(cloud.rev||0)>(local.rev||0)))c=cloud;else c=local;
  ST.club=c?stNormalize(c):null;
  if(ST.club&&local&&cloud&&(local.rev||0)>(cloud.rev||0))stSchedulePush();
  if(ST.club&&local&&!cloud&&r.ok)stSchedulePush();
  return ST.club;
}
function stSchedulePush(){clearTimeout(ST.cloudT);ST.cloudT=setTimeout(stPushClub,1500)}
function stSave(opt){
  const c=ST.club;if(!c)return;
  c.rev=(c.rev||0)+1;c.upd=Date.now();
  try{localStorage.setItem(stLsKey(currentUser),JSON.stringify(c))}catch(e){toast('Armazenamento cheio: o clube não pôde ser salvo neste aparelho.')}
  if(opt&&opt.pub)ST.dirtyPub=true;
  stSchedulePush();
}
async function stPushClub(){
  const c=ST.club;if(!c||!stCloudOk())return;
  const r=await stPut('/clubs/'+stKey(currentUser),c);
  ST.cloudOk=r.ok;
  if(r.ok&&ST.dirtyPub){ST.dirtyPub=false;await stPublishPub()}
}
function stPubDoc(){
  const c=ST.club,sq=c.squads[c.sq],xi=sq.slots.map(id=>c.cards[id]).filter(Boolean);
  if(xi.length<11)return null;
  const ch=stChem(sq.slots.map(id=>c.cards[id]),sq.formation,c.cards[c.mgr]);
  const st=c.cards[c.stad];
  return{user:currentUser,name:c.name,code:c.code,crest:c.crest,kits:c.kits,ball:c.ball,formation:sq.formation,atk:sq.atk,def:sq.def,
    xi:sq.slots.map(id=>c.cards[id]),bench:sq.bench.map(id=>c.cards[id]||''),captain:sq.captain,pk:sq.pk,mgr:c.cards[c.mgr]||'',stad:st?{name:st.name,cap:st.cap,hue:st.hue,pid:st.pid}:'',
    ovr:stTeamOvr(sq.slots.map(id=>c.cards[id])),chem:ch.total,div:c.rv.div,rating:Math.round(c.rv.rating),w:c.st.w,p:c.st.p,
    chw:c.ch.wk===stWeekId()?c.ch.wins:0,chp:c.ch.wk===stWeekId()?c.ch.played:0,upd:SV};
}
async function stPublishPub(){
  const d=stPubDoc();if(!d||!stCloudOk())return;
  await stPut('/pub/'+stKey(currentUser),d);
}
async function stFetchPubs(force){
  if(!force&&Date.now()-ST.pubT<15000)return ST.pubs;
  const r=await stGet('/pub');ST.pubT=Date.now();
  if(r.ok&&r.data){
    const out={};Object.entries(r.data).forEach(([k,v])=>{
      if(!v||!v.name)return;
      const fixArr=a=>Array.isArray(a)?a:a?Object.values(a):[];
      v.xi=Array.from({length:11},(_,i)=>(v.xi&&v.xi[i])||null);v.bench=Array.from({length:7},(_,i)=>(v.bench&&v.bench[i])||'');
      v.xi.forEach(c=>{if(c){c.alt=fixArr(c.alt);c.stats=fixArr(c.stats)}});v.bench.forEach(c=>{if(c){c.alt=fixArr(c.alt);c.stats=fixArr(c.stats)}});
      if(v.mgr&&!v.mgr.id)v.mgr=null;
      out[k]=v;
    });
    ST.pubs=out;
  }
  return ST.pubs;
}

/* ---------- Cartas ---------- */
function stMakeCard(base,extra){
  const c={id:stUid(),pid:base.base||base.id,kind:'player',name:base.name,pos:base.pos,alt:(base.alt||[]).slice(),ovr:base.ovr,nat:base.nat||'',league:base.league||'',leagueN:base.leagueN||'',club:base.club||'',clubId:base.clubId||'',stats:base.stats.slice(),rar:base.rar,face:base.face,hue:base.hue,src:base.src,got:Date.now()};
  if(base.src==='r')c.rp=base.rp;
  if(base.wk)c.wk=base.wk;
  return Object.assign(c,extra||{});
}
function stMakeManager(m){return{id:stUid(),pid:m.id,kind:'manager',name:m.name,nat:m.nat,league:m.league,leagueN:m.leagueN,rar:m.rar,hue:m.hue,face:m.face,ovr:0,pos:'TEC',alt:[],stats:[0,0,0,0,0,0],got:Date.now()}}
function stMakeStadium(s){return{id:stUid(),pid:s.id,kind:'stadium',name:s.name,cap:s.cap,hue:s.hue,rar:'comum',ovr:0,pos:'EST',alt:[],stats:[0,0,0,0,0,0],got:Date.now()}}
const stIsPlayer=c=>c&&c.kind==='player';
function stCardPhoto(c){
  if(c&&c.src==='c'){const d=ST.cat&&ST.cat.custom[c.pid];if(d&&d.img)return d.img}
  if(c&&c.src==='r'&&c.rp){const p=players.find(x=>x.id===c.rp);if(p&&p.photo&&p.photo!==PH)return p.photo}
  return stAvatarURL(c.face,c.hue);
}
const stCardTier=c=>c.kind==='player'?stTier(c.ovr):'ouro';
const stCardThemeKey=c=>c.rar==='especial'?'esp-'+(((ST.cat&&ST.cat.custom[c.pid])||{}).theme||'ouro'):c.rar==='totw'?'totw':c.rar==='heroi'?'heroi':c.rar==='idolo'?'idolo':c.rar==='raro'?'raro-'+stTier(c.ovr):stTier(c.ovr);
const stClubCards=()=>Object.values(ST.club.cards);
const stPlayersOwned=()=>stClubCards().filter(stIsPlayer);

/* atletas cadastrados no jogo viram cartas (opcional) */
function stRegPool(){
  if(!ST.cfg.useReg)return[];
  const out=[];
  players.forEach(p=>{
    if(!p||!p.id||!p.name)return;
    const t=teamOf(p.teamId);if(t&&t.priv)return;
    const pr=stRng('reg:'+p.id),ovr=stClamp(Math.round(+p.ovr||60),40,99),pos=ST_PROFILE[p.pos]?p.pos:'CM',prof=ST_PROFILE[pos];
    const lg=t&&t.leagueId?leagues.find(l=>l.id===t.leagueId):null;
    out.push({id:'r'+p.id,rp:p.id,name:p.name,pos,alt:(ST_POS_ALT[pos]||[]).filter(()=>pr()<.5),ovr,nat:ST_NATIONS[p.nat]?p.nat:'',league:lg?'rl:'+lg.id:'',leagueN:lg?lg.name:'',club:t?t.name:'Sem clube',clubId:t?'rt:'+t.id:'',stats:prof.map(o=>stClamp(Math.round(ovr+o+pr.gauss()*3),18,99)),rar:ovr>=78?'raro':'comum',face:{sk:pr.int(0,5),hr:pr.int(0,6),st:pr.int(0,5)},hue:pr.int(0,359),src:'r'});
  });
  return out;
}
function stPool(){
  const base=ST_DB.players.filter(p=>!p.noPack);
  return base.concat(stTotwOfWeek(stWeekId())).concat(stRegPool());
}
const stRarW={comum:1,raro:.8,totw:.3,heroi:.22,idolo:.1,especial:.15};
function stPickFrom(pool,lo,hi,o){
  o=o||{};
  let L=pool.filter(p=>p.ovr>=lo&&p.ovr<=hi&&(!o.rareOnly||p.rar!=='comum')&&(!o.pos||p.pos===o.pos||(p.alt||[]).includes(o.pos)));
  if(o.exclude&&o.exclude.size){const L2=L.filter(p=>!o.exclude.has(p.base||p.id));if(L2.length)L=L2}
  if(o.unique&&o.owned){const L2=L.filter(p=>!o.owned.has(p.base||p.id));if(L2.length)L=L2}
  if(!L.length)return null;
  let tot=0;const w=L.map(p=>{const x=(1/(1+.3*(p.ovr-lo)))*(stRarW[p.rar]||1)*(o.favor&&o.favor(p)||1);tot+=x;return x});
  let r=Math.random()*tot;for(let i=0;i<L.length;i++){r-=w[i];if(r<=0)return L[i]}
  return L[L.length-1];
}
/* sorteia o conteúdo de um pacote. Devolve instâncias de carta (ainda não adicionadas ao clube) */
function stRollPack(type,club){
  const P=ST_PACKS[type];club=club||ST.club;
  if(P.kind==='manager'){const own=new Set(Object.values(club.cards).filter(c=>c.kind==='manager').map(c=>c.pid));const L=ST_MANAGERS.filter(m=>!own.has(m.id));return[stMakeManager((L.length?L:ST_MANAGERS)[Math.floor(Math.random()*(L.length||ST_MANAGERS.length))])]}
  if(P.kind==='stadium'){const own=new Set(Object.values(club.cards).filter(c=>c.kind==='stadium').map(c=>c.pid));const ALLS=stStadiumsAll(),L=ALLS.filter(m=>!own.has(m.id));const pk=L.length?L:ALLS;return[stMakeStadium(pk[Math.floor(Math.random()*pk.length)])]}
  if(P.kind==='starter')return stStarterCards(club.user||currentUser);
  const pool=stPool(),owned=new Set(Object.values(club.cards).filter(stIsPlayer).map(c=>c.pid));
  let range;
  if(P.odds){const u=Math.random(),[,p82,p86,p90]=P.odds;range=u<p90?[90,99]:u<p86?[86,89]:u<p82?[82,85]:[P.lo,P.lo>=82?85:81]}
  else range=[P.lo,P.hi];
  const used=new Set();
  const best=stPickFrom(pool,range[0],range[1],{rareOnly:P.rareOnly,unique:P.unique,owned,exclude:used})||stPickFrom(pool,P.lo||40,99,{owned,exclude:used});
  const out=[best];used.add(best.base||best.id);
  const cap=P.allBest?Math.max(best.ovr,P.fill.hi):Math.min(best.ovr,P.fill.hi);
  for(let i=1;i<P.cards;i++){
    const p=stPickFrom(pool,P.fill.lo,Math.max(P.fill.lo,cap),{rareOnly:P.rareOnly&&Math.random()<.7,unique:P.unique,owned,exclude:used})||stPickFrom(pool,40,cap,{exclude:used});
    if(p){out.push(p);used.add(p.base||p.id)}
  }
  const cards=out.map(p=>stMakeCard(p));
  cards.sort((a,b)=>stValue(a)-stValue(b));
  return cards;
}
/* elenco inicial: 23 cartas, parte delas da mesma liga/nação para já ter alguma química */
function stStarterCards(user){
  const rng=stRng('starter:'+stKey(user)),L=rng.pick(ST_LEAGUES),nat=rng.pick(ST_NAT_CODES);
  const want=[['GK',2],['CB',4],['LB',2],['RB',2],['CDM',2],['CM',3],['CAM',1],['LW',2],['RW',2],['ST',3]];
  const pool=ST_DB.players.filter(p=>(p.src==='g'||p.src==='c')&&!p.noPack&&p.ovr<=80),used=new Set(),out=[];
  const stars=new Set(['ST','CM','CB']);let starsLeft=3;
  want.forEach(([pos,n])=>{
    for(let i=0;i<n;i++){
      const star=stars.has(pos)&&starsLeft>0&&i===0;
      const lo=star?75:54,hi=star?78:72;
      let cand=pool.filter(p=>!used.has(p.id)&&p.ovr>=lo&&p.ovr<=hi&&(p.pos===pos||(p.alt||[]).includes(pos)));
      const pref=cand.filter(p=>p.league===L.id||p.nat===nat);
      if(pref.length&&rng()<.7)cand=pref;
      if(!cand.length)cand=pool.filter(p=>!used.has(p.id)&&p.pos===pos);
      cand.sort((a,b)=>Math.abs(a.ovr-(star?76:64))-Math.abs(b.ovr-(star?76:64))+(rng()-.5)*8);
      if(!cand.length)cand=ST_DB.players.filter(p=>!used.has(p.id)&&p.pos!=='GK'===(pos!=='GK'));
      const p=cand[0];used.add(p.id);if(star)starsLeft--;
      out.push(stMakeCard(p));
    }
  });
  return out;
}
function stAddCards(cards){cards.forEach(c=>{ST.club.cards[c.id]=c})}
function stRemoveCard(id){
  const c=ST.club;delete c.cards[id];
  c.squads.forEach(s=>{s.slots=s.slots.map(x=>x===id?'':x);s.bench=s.bench.map(x=>x===id?'':x);if(s.captain===id)s.captain='';if(s.pk===id)s.pk=''});
  if(c.mgr===id)c.mgr='';if(c.stad===id)c.stad='';
}
function stAddPack(type,src){ST.club.packs.push({id:stUid(),type,src:src||''})}
function stGrant(rw){
  const c=ST.club;if(!rw)return;
  if(rw.coins)c.coins+=rw.coins;
  (rw.packs||[]).forEach(p=>stAddPack(p,'reward'));
  if(rw.pack)stAddPack(rw.pack,'reward');
}
const stRewardText=rw=>{const t=[];if(rw.coins)t.push(stFmt(rw.coins)+' moedas');(rw.packs||(rw.pack?[rw.pack]:[])).forEach(p=>t.push(ST_PACKS[p].n));return t.join(' + ')};
function stLog(t){const c=ST.club;c.log.unshift({t:Date.now(),x:t});if(c.log.length>40)c.log.length=40}
function stNote(t){const c=ST.club;c.msgs.unshift({t:Date.now(),x:t});if(c.msgs.length>30)c.msgs.length=30}

/* ---------- Química e OVR do time ---------- */
function stSlotPos(formation,i){const F=FORMS[formation]||FORMS['4-3-3'];return F[i]?F[i][0]:'CM'}
const stEligible=(card,slotPos)=>!!card&&card.kind==='player'&&(card.pos===slotPos||(card.alt||[]).includes(slotPos));
function stPosPenalty(card,slotPos){
  if(!card||card.kind!=='player')return 0;
  if(stEligible(card,slotPos))return 0;
  if(slotPos==='GK'||card.pos==='GK')return 25;
  return ST_SECTOR(card.pos)===ST_SECTOR(slotPos)?4:9;
}
/* Química (0–3 por atleta), seguindo as regras do modo:
   clube 2/4/7 → 1/2/3 · liga 3/5/8 → 1/2/3 · nação 2/5/8 → 1/2/3.
   Só conta quem está na posição certa (principal ou secundária). Ídolos têm química cheia e valem 2 na nação.
   O treinador soma 1 à contagem da sua liga e da sua nação. */
function stChem(cards,formation,mgr){
  const F=FORMS[formation]||FORMS['4-3-3'],elig=cards.map((c,i)=>stEligible(c,F[i][0]));
  const cc={},lc={},nc={};
  cards.forEach((c,i)=>{
    if(!elig[i])return;
    if(c.club)cc[c.club]=(cc[c.club]||0)+1;
    if(c.league)lc[c.league]=(lc[c.league]||0)+1;
    if(c.nat)nc[c.nat]=(nc[c.nat]||0)+(c.rar==='idolo'?2:1);
  });
  if(mgr&&mgr.kind==='manager'){if(mgr.league)lc[mgr.league]=(lc[mgr.league]||0)+1;if(mgr.nat)nc[mgr.nat]=(nc[mgr.nat]||0)+1}
  const per=cards.map((c,i)=>{
    if(!c||!elig[i])return{t:0,c:0,l:0,n:0};
    if(c.rar==='idolo')return{t:3,c:1,l:1,n:1};
    const n1=cc[c.club]||0,n2=lc[c.league]||0,n3=nc[c.nat]||0;
    const a=n1>=7?3:n1>=4?2:n1>=2?1:0,b=n2>=8?3:n2>=5?2:n2>=3?1:0,d=n3>=8?3:n3>=5?2:n3>=2?1:0;
    return{t:Math.min(3,a+b+d),c:a,l:b,n:d};
  });
  return{per,total:per.reduce((s,x)=>s+x.t,0),elig,club:cc,league:lc,nat:nc};
}
const ST_CHEM_BONUS=[0,1,2,3];
const stTeamOvr=cards=>{const a=cards.filter(Boolean);return a.length?Math.round(a.reduce((s,c)=>s+c.ovr,0)/a.length):0};
function stEffective(cards,formation,mgr){
  const ch=stChem(cards,formation,mgr);
  return cards.map((c,i)=>c?{card:c,slotPos:stSlotPos(formation,i),chem:ch.per[i].t,pen:stPosPenalty(c,stSlotPos(formation,i)),eff:Math.max(30,c.ovr+ST_CHEM_BONUS[ch.per[i].t]-stPosPenalty(c,stSlotPos(formation,i)))}:null);
}

/* ---------- Esquadrão: mover cartas, formação e montagem automática ---------- */
function stFindLoc(sq,id){
  let i=sq.slots.indexOf(id);if(i>=0)return{t:'xi',i};
  i=sq.bench.indexOf(id);if(i>=0)return{t:'bn',i};
  return null;
}
function stCanPlace(sq,card,t,i){
  if(t==='xi'){
    const slotPos=stSlotPos(sq.formation,i);
    if(card.kind!=='player')return false;
    if(slotPos==='GK'&&card.pos!=='GK')return false;
    if(slotPos!=='GK'&&card.pos==='GK')return false;
  }
  return card.kind==='player';
}
/* coloca a carta no destino; se havia outra, ela vai para o lugar de origem (troca) */
function stPlace(sq,cardId,t,i){
  const c=ST.club,card=c.cards[cardId];if(!card)return false;
  if(!stCanPlace(sq,card,t,i))return false;
  const src=stFindLoc(sq,cardId),arr=t==='xi'?sq.slots:sq.bench,occ=arr[i];
  if(occ&&src){
    const oc=c.cards[occ];
    if(oc&&!stCanPlace(sq,oc,src.t,src.i))return false;
    (src.t==='xi'?sq.slots:sq.bench)[src.i]=occ;
  }else if(src){(src.t==='xi'?sq.slots:sq.bench)[src.i]=''}
  arr[i]=cardId;
  return true;
}
function stUnplace(sq,cardId){
  const s=stFindLoc(sq,cardId);if(!s)return;
  (s.t==='xi'?sq.slots:sq.bench)[s.i]='';
  if(sq.captain===cardId)sq.captain='';if(sq.pk===cardId)sq.pk='';
}
function stRearrange(sq,newForm){
  const c=ST.club,F=FORMS[newForm],cards=sq.slots.map(id=>c.cards[id]).filter(Boolean);
  const out=Array(11).fill(''),left=cards.slice();
  const take=(pred)=>{for(let i=0;i<11;i++){if(out[i])continue;const k=left.findIndex(cd=>pred(cd,F[i][0]));if(k>=0){out[i]=left[k].id;left.splice(k,1)}}};
  take((cd,pos)=>pos==='GK'&&cd.pos==='GK');
  take((cd,pos)=>cd.pos===pos);
  take((cd,pos)=>(cd.alt||[]).includes(pos));
  take((cd,pos)=>pos!=='GK'&&cd.pos!=='GK'&&ST_SECTOR(cd.pos)===ST_SECTOR(pos));
  take((cd,pos)=>pos!=='GK'&&cd.pos!=='GK');
  left.forEach(cd=>{sq.bench[sq.bench.indexOf('')>=0?sq.bench.indexOf(''):0]=cd.id});
  sq.slots=out;sq.formation=newForm;
}
function stSquadReady(sq){
  sq=sq||ST.club.squads[ST.club.sq];
  const cards=sq.slots.map(id=>ST.club.cards[id]);
  if(cards.some(x=>!x))return{ok:false,msg:'Complete os 11 titulares no Elenco.'};
  return{ok:true};
}
function stAutoSquad(sq){
  const c=ST.club,cards=stPlayersOwned(),F=FORMS[sq.formation];
  const used=new Set(),xi=Array(11).fill(null);
  const score=(cd,i)=>cd.ovr-stPosPenalty(cd,F[i][0])*1.3;
  const order=[...Array(11).keys()].sort((a,b)=>(F[a][0]==='GK'?-1:0)-(F[b][0]==='GK'?-1:0));
  order.forEach(i=>{
    let best=null,bs=-1e9;
    cards.forEach(cd=>{if(used.has(cd.id))return;if(F[i][0]==='GK'&&cd.pos!=='GK')return;if(F[i][0]!=='GK'&&cd.pos==='GK')return;const s=score(cd,i);if(s>bs){bs=s;best=cd}});
    if(best){xi[i]=best;used.add(best.id)}
  });
  const mgr=c.cards[c.mgr];
  const obj=a=>{const eff=stEffective(a,sq.formation,mgr);return eff.reduce((s,e)=>s+(e?e.eff:0),0)};
  let cur=obj(xi);
  for(let it=0;it<3;it++){
    let improved=false;
    for(let i=0;i<11;i++){
      if(!xi[i])continue;
      for(const cd of cards){
        if(used.has(cd.id))continue;
        if((F[i][0]==='GK')!==(cd.pos==='GK'))continue;
        if(cd.ovr<xi[i].ovr-6)continue;
        const old=xi[i];xi[i]=cd;const v=obj(xi);
        if(v>cur+.01){cur=v;used.delete(old.id);used.add(cd.id);improved=true}else xi[i]=old;
      }
    }
    if(!improved)break;
  }
  sq.slots=xi.map(x=>x?x.id:'');
  const rest=cards.filter(cd=>!used.has(cd.id)).sort((a,b)=>b.ovr-a.ovr),bench=[];
  const gk=rest.find(cd=>cd.pos==='GK');if(gk){bench.push(gk)}
  const seenSector={};
  rest.forEach(cd=>{if(bench.length>=7||bench.includes(cd)||cd.pos==='GK')return;const s=ST_SECTOR(cd.pos);if((seenSector[s]||0)<2){bench.push(cd);seenSector[s]=(seenSector[s]||0)+1}});
  rest.forEach(cd=>{if(bench.length<7&&!bench.includes(cd)&&cd.pos!=='GK')bench.push(cd)});
  sq.bench=Array.from({length:7},(_,i)=>bench[i]?bench[i].id:'');
  const cap=xi.filter(Boolean).sort((a,b)=>b.ovr-a.ovr)[0];if(cap)sq.captain=cap.id;
  const pk=xi.filter(Boolean).sort((a,b)=>b.stats[1]-a.stats[1])[0];if(pk)sq.pk=pk.id;
}

/* ---------- Objetivos ---------- */
function stObjState(){
  const c=ST.club,day=stDayId(),wk=stWeekId();c.obj=c.obj||{};
  if(c.obj.day!==day){c.obj.day=day;c.obj.d={}}
  if(c.obj.wk!==wk){c.obj.wk=wk;c.obj.w={}}
  c.obj.d=c.obj.d||{};c.obj.w=c.obj.w||{};c.obj.f=c.obj.f||{};
}
function stEvent(ev,n){
  if(!ST.club)return;n=n==null?1:n;stObjState();
  [[ST_OBJ_DAILY,ST_CLUB_OBJ('d')],[ST_OBJ_WEEKLY,ST_CLUB_OBJ('w')],[ST_OBJ_FOUND,ST_CLUB_OBJ('f')]].forEach(([defs,b])=>{
    defs.forEach(d=>{if(d.ev!==ev)return;const r=b[d.id]||(b[d.id]={p:0,c:0});if(!r.c)r.p=Math.min(d.goal,(r.p||0)+n)})
  });
}
const ST_CLUB_OBJ=k=>ST.club.obj[k];
function stClaimObj(kind,id){
  stObjState();
  const defs={d:ST_OBJ_DAILY,w:ST_OBJ_WEEKLY,f:ST_OBJ_FOUND}[kind],d=defs.find(x=>x.id===id),r=ST.club.obj[kind][id];
  if(!d||!r||r.c||r.p<d.goal)return false;
  r.c=1;stGrant(d.reward);stSave();return true;
}

/* ---------- Divisões, semana e competições ---------- */
function stWeekRoll(){
  const c=ST.club,wk=stWeekId();
  if(c.rv.wk!==wk){c.rv.wk=wk;c.rv.wins=0;c.rv.games=0;c.rv.claimed={}}
  if(c.sb.wk!==wk){c.sb.wk=wk;c.sb.pts=0;c.sb.claimed={};c.sb.played=0}
  if(c.ch.wk&&c.ch.wk!==wk){
    if(c.ch.played>0&&!c.ch.claimed)c.chPending.push({wk:c.ch.wk,pts:c.ch.pts,played:c.ch.played,wins:c.ch.wins});
    c.ch={wk:'',qual:false,po:false,played:0,wins:0,pts:0,res:[],claimed:false,active:false};
  }
  if(c.draft&&c.draft.day!==stDayId()&&c.draft.stage==='pick'){/* rascunho antigo é mantido até concluir */}
}
const stChampOpen=()=>ST.cfg.champOpen||stIsWeekend();
function stChampTier(pts){let t=ST_CH_TIERS[0];ST_CH_TIERS.forEach(x=>{if(pts>=x.p)t=x});return t}

/* ---------- Caixa de entrada (presentes e avisos) ---------- */
async function stInboxPoll(){
  if(!ST.club||!stCloudOk())return;
  const key=stKey(currentUser),r=await stGet('/inbox/'+key);
  if(!r.ok||!r.data)return;
  const c=ST.club;let ch=false;
  for(const [id,m] of Object.entries(r.data)){
    if(!m)continue;
    if(!c.seen[id]){
      c.seen[id]=1;ch=true;
      if(m.type==='gift'){stGrant({coins:m.coins||0,packs:Array.isArray(m.packs)?m.packs:m.packs?Object.values(m.packs):[]});stNote('🎁 Presente do MingauCoach: '+stRewardText({coins:m.coins||0,packs:Array.isArray(m.packs)?m.packs:m.packs?Object.values(m.packs):[]}))}
      else if(m.type==='duel'){stNote(`⚔️ ${m.from} jogou contra o seu time (${m.mode}): ${m.gf} x ${m.ga}.`)}
      else if(m.type==='note'){stNote(m.text||'')}
      else if(m.type==='addcard'){const cd=stCardFromPid(m.pid);if(cd){stAddCards([cd]);stNote('🎁 O MingauCoach adicionou a carta '+cd.name+' ao seu clube.')}}
      else if(m.type==='rmcard'){const k=Object.values(c.cards).find(x=>x.id===m.cardId||(m.pid&&x.pid===m.pid));if(k){stRemoveCard(k.id);stNote('O MingauCoach removeu a carta '+k.name+' do seu clube.')}}
    }
    stDel('/inbox/'+key+'/'+id);
  }
  const ks=Object.keys(c.seen);if(ks.length>200)ks.slice(0,ks.length-200).forEach(k=>delete c.seen[k]);
  if(ch)stSave();
}
const stSendInbox=(user,m)=>stPost('/inbox/'+stKey(user),{...m,ts:SV});

/* ---------- Mercado de transferências ---------- */
const ST_TAX=.05,ST_MARKET_HOURS=[1,3,12,24];
function stBidStep(v){return v<1000?50:v<10000?100:v<50000?250:1000}
function stListingState(L,now){
  now=now||Date.now();
  const created=typeof L.created==='number'?L.created:now,exp=created+(L.hours||1)*3600e3;
  const bids=Object.entries(L.bids||{}).map(([k,b])=>({k,...b})).filter(b=>b&&b.user&&(b.ts||0)<=exp).sort((a,b)=>b.amount-a.amount||(a.ts||0)-(b.ts||0));
  const buys=Object.entries(L.buys||{}).map(([k,b])=>({k,...b})).filter(b=>b&&b.user).sort((a,b)=>(a.ts||0)-(b.ts||0));
  const st={id:L.id,exp,created,bids,buys,top:bids[0]||null,cur:bids[0]?bids[0].amount:0};
  if(buys.length&&L.buyNow){st.ended=true;st.winner=buys[0].user;st.price=L.buyNow}
  else if(now>=exp+2500){st.ended=true;if(bids.length){st.winner=bids[0].user;st.price=bids[0].amount}else{st.winner=null;st.price=0}}
  else st.ended=false;
  return st;
}
async function stMarketFetch(force){
  if(!force&&Date.now()-ST.marketT<4000)return ST.market;
  const r=await stGet('/market');ST.marketT=Date.now();
  if(r.ok){
    const out=[];Object.entries(r.data||{}).forEach(([id,L])=>{if(L&&L.card){L.id=id;L.card.alt=Array.isArray(L.card.alt)?L.card.alt:L.card.alt?Object.values(L.card.alt):[];L.card.stats=Array.isArray(L.card.stats)?L.card.stats:Object.values(L.card.stats||{});out.push(L)}});
    ST.market=out;ST.marketOk=true;
  }else ST.marketOk=false;
  return ST.market;
}
async function stListCard(cardId,start,buyNow,hours){
  const c=ST.club,card=c.cards[cardId];
  if(!card)return{ok:false,err:'Carta não encontrada.'};
  const rg=card.kind==='player'?stRange(card):{min:500,max:200000};
  if(start<rg.min||buyNow>rg.max||buyNow<start)return{ok:false,err:`Preço fora da faixa permitida (${stFmt(rg.min)} a ${stFmt(rg.max)}).`};
  const body={seller:currentUser,card,start,buyNow,hours,created:SV};
  const r=await stPost('/market',body);
  if(!r.ok)return{ok:false,err:'Não foi possível anunciar: '+r.err};
  const id=r.data&&r.data.name;
  c.mk[id]={card,start,buyNow,hours,t:Date.now()};
  stRemoveCard(cardId);stEvent('list');stLog(`Anunciou ${card.name} (${stFmt(start)}–${stFmt(buyNow)})`);stSave({pub:true});
  return{ok:true,id};
}
async function stBid(L,amount){
  const c=ST.club,me=currentUser;
  const fresh=await stGet('/market/'+L.id);
  if(!fresh.ok||!fresh.data)return{ok:false,err:'Anúncio indisponível.'};
  const F=fresh.data;F.id=L.id;const S=stListingState(F);
  if(S.ended)return{ok:false,err:'Este leilão já terminou.'};
  const need=S.cur?S.cur+stBidStep(S.cur):F.start;
  if(amount<need)return{ok:false,err:'Lance mínimo: '+stFmt(need)};
  if(F.seller===me)return{ok:false,err:'Você não pode dar lance no seu próprio anúncio.'};
  const prev=c.esc[L.id]||0,extra=amount-prev;
  if(extra>c.coins)return{ok:false,err:'Moedas insuficientes.'};
  const r=await stPost('/market/'+L.id+'/bids',{user:me,amount,ts:SV});
  if(!r.ok)return{ok:false,err:r.err};
  c.coins-=extra;c.esc[L.id]=amount;c.mkb=c.mkb||{};c.mkb[L.id]={card:F.card,t:Date.now()};stSave();
  return{ok:true};
}
async function stBuyNow(L){
  const c=ST.club,me=currentUser;
  const fresh=await stGet('/market/'+L.id);
  if(!fresh.ok||!fresh.data)return{ok:false,err:'Anúncio indisponível.'};
  const F=fresh.data;F.id=L.id;const S=stListingState(F);
  if(S.ended)return{ok:false,err:'Este leilão já terminou.'};
  if(F.seller===me)return{ok:false,err:'Você não pode comprar o seu próprio anúncio.'};
  const prev=c.esc[L.id]||0,extra=F.buyNow-prev;
  if(extra>c.coins)return{ok:false,err:'Moedas insuficientes.'};
  const r=await stPost('/market/'+L.id+'/buys',{user:me,ts:SV});
  if(!r.ok)return{ok:false,err:r.err};
  c.coins-=extra;c.esc[L.id]=F.buyNow;c.mkb=c.mkb||{};c.mkb[L.id]={card:F.card,t:Date.now()};stSave();
  return{ok:true};
}
/* aplica no clube local o que aconteceu com os anúncios em que sou vendedor, comprador ou licitante */
async function stMarketProcess(){
  if(!ST.club||!stCloudOk())return false;
  const c=ST.club,me=currentUser;c.mkb=c.mkb||{};
  const ids=new Set([...Object.keys(c.mk),...Object.keys(c.esc),...Object.keys(c.mkb)]);
  if(!ids.size)return false;
  const r=await stGet('/market');if(!r.ok)return false;
  const all=r.data||{};let ch=false;const msgs=[];
  for(const id of ids){
    const L=all[id];
    if(!L){
      /* sumiu do banco: seller recebe de volta após 1h de carência, bidder recebe reembolso */
      if(c.mk[id]&&Date.now()-c.mk[id].t>3600e3){const k=c.mk[id].card;c.cards[k.id]=k;delete c.mk[id];ch=true;msgs.push('Anúncio de '+k.name+' sumiu da nuvem: a carta voltou ao clube.')}
      if(c.esc[id]&&Date.now()-(c.mkb[id]||{t:0}).t>600e3){c.coins+=c.esc[id];delete c.esc[id];delete c.mkb[id];ch=true}
      continue;
    }
    L.id=id;L.card.alt=Array.isArray(L.card.alt)?L.card.alt:L.card.alt?Object.values(L.card.alt):[];L.card.stats=Array.isArray(L.card.stats)?L.card.stats:Object.values(L.card.stats||{});
    const S=stListingState(L);
    /* lance coberto durante o leilão: reembolso imediato */
    if(!S.ended&&c.esc[id]&&S.top&&S.top.user!==me&&!(S.buys||[]).length){c.coins+=c.esc[id];delete c.esc[id];delete c.mkb[id];ch=true;msgs.push('Você foi superado em '+L.card.name+'. Moedas devolvidas.')}
    if(!S.ended)continue;
    const done=L.done||{};
    if(c.mk[id]){
      if(S.winner){
        const gain=Math.floor(S.price*(1-ST_TAX));c.coins+=gain;msgs.push(`💰 ${L.card.name} vendido por ${stFmt(S.price)} (você recebeu ${stFmt(gain)} após a taxa de 5%).`);stLog('Vendeu '+L.card.name+' por '+stFmt(S.price));
      }else{c.cards[L.card.id]=L.card;msgs.push('Ninguém comprou '+L.card.name+'. A carta voltou ao clube.')}
      delete c.mk[id];ch=true;stPut('/market/'+id+'/done/seller',true);done.seller=true;
    }
    if(c.esc[id]||c.mkb[id]){
      if(S.winner===me){
        const card=L.card;card.got=Date.now();c.cards[card.id]=card;
        const paid=c.esc[id]||S.price;if(paid>S.price)c.coins+=paid-S.price;
        msgs.push(`🛒 Você levou ${card.name} por ${stFmt(S.price)}!`);stLog('Comprou '+card.name+' por '+stFmt(S.price));
      }else{if(c.esc[id])c.coins+=c.esc[id]}
      delete c.esc[id];delete c.mkb[id];ch=true;stPut('/market/'+id+'/done/buyer_'+stKey(me),true);done['buyer_'+stKey(me)]=true;
    }
    const need=S.winner?(done.seller&&Object.keys(done).some(k=>k.startsWith('buyer_'))):done.seller;
    if(need)stDel('/market/'+id);
  }
  if(ch){msgs.forEach(stNote);stSave({pub:true})}
  return ch;
}
/* mercado do sistema: lista por hora, igual para todos, com compra imediata a 125% do valor */
function stNpcListings(){
  const bucket=Math.floor(Date.now()/3600e3),rng=stRng('npc:'+bucket),pool=ST_DB.players.filter(p=>(p.src==='g'||p.src==='c')&&!p.noPack&&p.ovr>=52&&p.ovr<=87),out=[];
  for(let i=0;i<40;i++){
    const w=rng(),lo=w<.45?52:w<.8?62:w<.95?72:78,cand=pool.filter(p=>p.ovr>=lo&&p.ovr<=lo+8);
    const p=rng.pick(cand),card={id:'npc'+bucket+'x'+i,pid:p.id,kind:'player',name:p.name,pos:p.pos,alt:p.alt,ovr:p.ovr,nat:p.nat,league:p.league,leagueN:p.leagueN,club:p.club,clubId:p.clubId,stats:p.stats,rar:p.rar,face:p.face,hue:p.hue,src:'g'};
    out.push({id:'npc:'+bucket+':'+i,npc:true,seller:'Mercado do sistema',card,start:0,buyNow:stRound(stValue(card)*1.25),exp:(bucket+1)*3600e3});
  }
  return out;
}
function stBuyNpc(L){
  const c=ST.club;
  if(c.npc[L.id])return{ok:false,err:'Você já comprou este anúncio.'};
  if(c.coins<L.buyNow)return{ok:false,err:'Moedas insuficientes.'};
  c.coins-=L.buyNow;const card={...L.card,id:stUid(),got:Date.now()};c.cards[card.id]=card;c.npc[L.id]=1;
  const ks=Object.keys(c.npc);if(ks.length>200)ks.slice(0,100).forEach(k=>delete c.npc[k]);
  stLog('Comprou '+card.name+' do mercado do sistema');stSave({pub:true});
  return{ok:true,card};
}
function stQuickSellCards(ids){
  let tot=0;
  ids.forEach(id=>{const k=ST.club.cards[id];if(!k)return;tot+=k.kind==='player'?stQuickSell(k):200;stRemoveCard(id)});
  ST.club.coins+=tot;stSave({pub:true});return tot;
}

/* ---------- Abertura de pacote (compra e sorteio) ---------- */
function stBuyPack(type){
  const P=ST_PACKS[type],c=ST.club;
  if(!P||!P.price)return{ok:false,err:'Este pacote não está à venda.'};
  if(c.coins<P.price)return{ok:false,err:'Moedas insuficientes.'};
  c.coins-=P.price;stAddPack(type,'loja');stSave();
  return{ok:true,pack:c.packs[c.packs.length-1]};
}
function stOpenPackById(pid){
  const c=ST.club,i=c.packs.findIndex(p=>p.id===pid);
  if(i<0)return null;
  const pk=c.packs.splice(i,1)[0],cards=stRollPack(pk.type,c);
  stAddCards(cards);stEvent('pack');stSave({pub:true});
  return{pack:pk,cards};
}

/* ---------- Requisitos de DME ---------- */
function stSbcCheck(def,cards,formation,mgr){
  const R=def.req,list=cards.filter(Boolean),res=[];
  const add=(ok,txt,val)=>res.push({ok,txt,val});
  add(list.length===R.n,`Cartas: ${R.n}`,`${list.length}/${R.n}`);
  if(R.tier){const bad=list.filter(c=>stTier(c.ovr)!==R.tier).length;add(!bad&&list.length>0,`Todas ${({bronze:'bronze',prata:'prata',ouro:'ouro'})[R.tier]}`,bad?bad+' fora':'ok')}
  if(R.ovr){const a=list.length?list.reduce((s,c)=>s+c.ovr,0)/list.length:0;add(a>=R.ovr,`OVR médio mínimo ${R.ovr}`,a.toFixed(1))}
  if(R.rare){const n=list.filter(c=>c.rar!=='comum').length;add(n>=R.rare,`Mínimo ${R.rare} raras`,n+'/'+R.rare)}
  const grp=(k)=>{const m={};list.forEach(c=>{if(c[k])m[c[k]]=(m[c[k]]||0)+1});return Math.max(0,...Object.values(m))};
  if(R.league){const n=grp('league');add(n>=R.league,`Mínimo ${R.league} da mesma liga`,n+'/'+R.league)}
  if(R.nat){const n=grp('nat');add(n>=R.nat,`Mínimo ${R.nat} da mesma nação`,n+'/'+R.nat)}
  if(R.club){const n=grp('club');add(n>=R.club,`Mínimo ${R.club} do mesmo clube`,n+'/'+R.club)}
  if(R.chem){const t=stChem(cards,formation||'4-3-3',mgr).total;add(t>=R.chem,`Química mínima ${R.chem}`,t+'/'+R.chem)}
  return{ok:res.every(x=>x.ok),res};
}
