/* ===================== STARSTEAM — PARTIDAS ONLINE ENTRE TÉCNICOS =====================
   Modelo: o ANFITRIÃO (quem criou a sala) roda o motor de partida normalmente. O CONVIDADO vê a partida
   ao vivo (um "espelho" alimentado por quadros publicados na nuvem) e comanda o próprio time por comandos
   (tática, parada técnica, substituições, pênaltis). O resultado vale para os dois clubes.
   Nuvem (Firebase REST), sob /stars_st/<código>/online:
     lobby/<sala>   anúncio público da sala       specs/<sala>/host|guest   elencos
     rooms/<sala>   estado e pedidos de entrada   frames/<sala>             quadro atual da partida
     cmds/<sala>    comandos do convidado         clock/<chave>             relógio do servidor        */
const ST_ON={role:null,rid:null,room:null,spec:{},evs:[],evn:0,lastEv:0,seen:{},frameSig:'',pubBusy:false,offset:null,gq:[],gqBusy:false,lastFrame:null,staleAt:0,ghbVal:null,ghbAt:0};
const stOnP=(...a)=>'/online/'+a.join('/');
const stOnDead=()=>!ST_ON.role||!M||!M.stx||M.stx.done;

/* ---------- utilidades ---------- */
const stOnFix=a=>Array.isArray(a)?a:a&&typeof a==='object'?Object.values(a):[];
function stOnNorm(sp){
  if(!sp)return null;
  const fixC=c=>{if(!c)return null;c.alt=stOnFix(c.alt);c.stats=stOnFix(c.stats).map(Number);return c};
  sp.xi=Array.from({length:11},(_,i)=>fixC(sp.xi&&sp.xi[i]));
  sp.bench=Array.from({length:7},(_,i)=>fixC(sp.bench&&sp.bench[i]));
  sp.captain=sp.captain||'';sp.pk=sp.pk||'';sp.atk=sp.atk||'eq';sp.def=sp.def||'eq';
  sp.mgr=sp.mgr&&sp.mgr.id?sp.mgr:null;sp.stad=sp.stad&&sp.stad.name?sp.stad:null;
  return sp;
}
function stOnMySpec(){const sp=JSON.parse(JSON.stringify(stUserSpec()));sp.rating=Math.round((ST.club.on||{}).rating||1000);sp.user=currentUser;return sp}
async function stOnClock(){
  if(ST_ON.offset!=null&&Date.now()-ST_ON.offT<600000)return ST_ON.offset;
  const k=stKey(currentUser),a=Date.now(),w=await stPut(stOnP('clock',k),SV);
  if(!w.ok)return ST_ON.offset||0;
  const r=await stGet(stOnP('clock',k));
  ST_ON.offset=r.ok&&typeof r.data==='number'?r.data-Math.round((a+Date.now())/2):0;ST_ON.offT=Date.now();
  return ST_ON.offset;
}
const stOnSend=c=>{if(ST_ON.rid)return stPost(stOnP('cmds',ST_ON.rid),{...c,from:currentUser})};

/* ===================== LOBBY ===================== */
ST_ON.list=[];
STV.online=()=>{
  const c=ST.club,r=ST_ON.room,o=c.on||{};
  const head=`<div class="row" style="justify-content:space-between"><h2 class="t">Online</h2><button class="btn sec sm" data-act="go" data-v="play">‹ Voltar</button></div>
  <div class="st-card st-rivhead"><div><small>Rating online</small><b>${Math.round(o.rating||1000)}</b></div><div><small>Vitórias</small><b>${o.w||0}</b></div><div><small>Empates</small><b>${o.d||0}</b></div><div><small>Derrotas</small><b>${o.l||0}</b></div></div>`;
  if(r){
    const me=r.role==='host',opp=me?r.guestName:r.host;
    let body='';
    if(r.state==='open')body=`<div class="st-big pulse">⏳</div><h3 class="t">Sala aberta</h3><p>Aguardando um adversário entrar… Código da sala: <b>${esc(r.rid)}</b></p><button class="btn sec" data-act="onleave">Cancelar sala</button>`;
    else if(r.state==='joining')body=`<div class="st-big pulse">🔌</div><h3 class="t">Entrando na sala…</h3><p>Aguardando o anfitrião aceitar.</p><button class="btn sec" data-act="onleave">Cancelar</button>`;
    else if(r.state==='ready')body=`<div class="st-big">⚔️</div><h3 class="t">${esc(c.name)} x ${esc((ST_ON.spec.opp||{}).name||opp)}</h3><p>Adversário: <b>${esc(opp)}</b> • OVR ${(ST_ON.spec.opp||{}).ovr||'–'} • Rating ${(ST_ON.spec.opp||{}).rating||'–'}</p>
      ${me?`<button class="btn" style="font-size:1.1rem;padding:.8rem 2rem" data-act="onstart">▶ Iniciar partida</button>`:'<p>Aguardando o anfitrião iniciar…</p>'}<button class="btn sec" data-act="onleave" style="margin-left:.5rem">Sair da sala</button>`;
    else body=`<p>${esc(r.msg||'Sala encerrada.')}</p><button class="btn" data-act="onleave">Voltar ao lobby</button>`;
    return head+`<div class="st-card" style="text-align:center">${body}</div>`;
  }
  return head+`<div class="st-card"><p>Jogue ao vivo contra outro técnico do beta. Quem cria a sala roda a partida; o adversário comanda o próprio time em tempo real (tática, paradas técnicas, substituições e pênaltis). Não há prêmios em moedas: vale rating e estatísticas.</p>
    <div class="row" style="gap:.6rem;flex-wrap:wrap"><button class="btn" data-act="onquick">⚡ Partida rápida</button>
    <select id="on-et" class="fc" style="width:auto"><option value="none">Empate: termina empatado</option><option value="et_pen">Empate: prorrogação + pênaltis</option></select>
    <button class="btn sec" data-act="oncreate">➕ Criar sala</button><button class="btn sec" data-act="onrefresh">↻ Atualizar</button></div></div>
    <div class="st-card"><h3 class="t">Salas abertas</h3><div id="st-onlist"><div class="st-load"><div class="st-spin"></div></div></div></div>`;
};
STP.online=async()=>{if(!ST_ON.room)await stOnRefreshList()};
async function stOnRefreshList(){
  const box=$('st-onlist');if(!box)return;
  const [off,r]=await Promise.all([stOnClock(),stGet(stOnP('lobby'))]);
  if(!$('st-onlist'))return;
  const now=Date.now()+off,rows=[];
  Object.entries(r.data||{}).forEach(([rid,l])=>{
    if(!l||!l.host)return;
    const age=now-(+l.hb||0);
    if(age>150000){stOnDrop(rid);return}
    if(age>40000||l.host===currentUser)return;
    rows.push({rid,...l});
  });
  rows.sort((a,b)=>Math.abs((a.rating||1000)-ST.club.on.rating)-Math.abs((b.rating||1000)-ST.club.on.rating));
  ST_ON.list=rows;
  box.innerHTML=rows.length?`<table class="st-table"><tr><th>Clube</th><th>Técnico</th><th>OVR</th><th>ENT</th><th>Rating</th><th>Empate</th><th></th></tr>${rows.map(l=>`<tr><td>${esc(l.club||'')}</td><td>${esc(l.host)}</td><td>${l.ovr||'–'}</td><td>${l.chem||'–'}</td><td>${l.rating||'–'}</td><td>${l.et==='et_pen'?'Prorrog.+pên.':'Empate vale'}</td><td><button class="btn sm" data-act="onjoin" data-r="${stAttr(l.rid)}">Entrar</button></td></tr>`).join('')}</table>`:'<p class="st-fine">Nenhuma sala aberta agora. Crie uma ou use a partida rápida.</p>';
}
function stOnDrop(rid){['lobby','rooms','specs','frames','cmds'].forEach(k=>stDel(stOnP(k,rid)))}
STA.onrefresh=()=>stOnRefreshList();

/* ---------- criar sala (anfitrião) ---------- */
async function stOnCreate(et){
  if(!stReady())return;
  const c=ST.club,rid=stUid(),sp=stOnMySpec();
  const w=await stPut(stOnP('specs',rid,'host'),sp);if(!w.ok)return toast('Erro ao criar a sala: '+w.err);
  await stPut(stOnP('rooms',rid),{id:rid,host:currentUser,status:'open',et:et||'none',created:SV});
  await stPut(stOnP('lobby',rid),{host:currentUser,club:c.name,ovr:sp.ovr,chem:sp.chem,rating:sp.rating,et:et||'none',hb:SV});
  ST_ON.room={rid,role:'host',state:'open',et:et||'none',host:currentUser};ST_ON.rid=rid;ST_ON.spec={me:sp};
  clearInterval(ST_ON.hostT);ST_ON.hostT=setInterval(stOnHostLoop,2200);
  stGo('online',null,true);
}
STA.oncreate=()=>stOnCreate(($('on-et')||{}).value);
async function stOnHostLoop(){
  const r=ST_ON.room;
  if(!r||r.role!=='host'||ST_ON.role==='host'){clearInterval(ST_ON.hostT);return}
  if(ST_ON.hbusy)return;ST_ON.hbusy=true;
  try{
    if(r.state==='open'){
      stPatch(stOnP('lobby',r.rid),{hb:SV});
      const j=await stGet(stOnP('rooms',r.rid,'joins'));
      const list=Object.entries(j.data||{}).filter(([,v])=>v&&v.user&&v.user!==currentUser).sort((a,b)=>a[0]<b[0]?-1:1);
      if(list.length&&ST_ON.room===r){
        const g=list[0][1],gs=await stGet(stOnP('specs',r.rid,'guest'));
        if(gs.ok&&gs.data){
          await stPatch(stOnP('rooms',r.rid),{guest:g.user,status:'ready'});stDel(stOnP('lobby',r.rid));stDel(stOnP('rooms',r.rid,'joins'));
          r.state='ready';r.guestName=g.user;ST_ON.spec.opp=stOnNorm(gs.data);
          toast(`🌐 ${g.user} entrou na sala!`);if(stView('online'))stGo('online',null,true);
        }else stDel(stOnP('rooms',r.rid,'joins/'+list[0][0]));
      }
    }else if(r.state==='ready'){
      const rm=await stGet(stOnP('rooms',r.rid));
      if(rm.ok&&rm.data&&rm.data.status==='guestleft'){
        r.state='open';r.guestName='';delete ST_ON.spec.opp;
        await stPatch(stOnP('rooms',r.rid),{status:'open',guest:''});
        await stPut(stOnP('lobby',r.rid),{host:currentUser,club:ST.club.name,ovr:ST_ON.spec.me.ovr,chem:ST_ON.spec.me.chem,rating:ST_ON.spec.me.rating,et:r.et,hb:SV});
        toast('O adversário saiu da sala.');if(stView('online'))stGo('online',null,true);
      }
    }
  }finally{ST_ON.hbusy=false}
}

/* ---------- entrar numa sala (convidado) ---------- */
async function stOnJoin(rid){
  if(!stReady())return false;
  const rm=await stGet(stOnP('rooms',rid));
  if(!rm.ok||!rm.data||rm.data.status!=='open'||rm.data.host===currentUser){toast('Esta sala não está mais disponível.');return false}
  const hs=await stGet(stOnP('specs',rid,'host'));if(!hs.ok||!hs.data){toast('Sala indisponível.');return false}
  const sp=stOnMySpec();
  const w=await stPut(stOnP('specs',rid,'guest'),sp);if(!w.ok){toast('Erro: '+w.err);return false}
  await stPost(stOnP('rooms',rid,'joins'),{user:currentUser,ts:SV});
  ST_ON.rid=rid;ST_ON.spec={me:sp,opp:stOnNorm(hs.data)};
  ST_ON.room={rid,role:'guest',state:'joining',host:rm.data.host,et:rm.data.et||'none',t0:Date.now()};
  clearInterval(ST_ON.guestT);ST_ON.guestT=setInterval(stOnGuestLoop,1500);
  stGo('online',null,true);return true;
}
STA.onjoin=el=>stOnJoin(el.dataset.r);
async function stOnGuestLoop(){
  const r=ST_ON.room;
  if(!r||r.role!=='guest'||ST_ON.role==='guest'){clearInterval(ST_ON.guestT);return}
  const rm=await stGet(stOnP('rooms',r.rid));
  if(ST_ON.room!==r)return;
  const d=rm.data;
  if(rm.ok&&!d){r.state='closed';r.msg='A sala foi encerrada.';clearInterval(ST_ON.guestT);if(stView('online'))stGo('online',null,true);return}
  if(!rm.ok)return;
  if(r.state==='joining'){
    if(d.guest===currentUser){r.state='ready';toast('✅ Você entrou na sala!');if(stView('online'))stGo('online',null,true)}
    else if(d.status!=='open'||Date.now()-r.t0>16000){r.state='closed';r.msg='Não foi possível entrar: outra pessoa entrou antes ou o anfitrião saiu.';clearInterval(ST_ON.guestT);stDel(stOnP('specs',r.rid,'guest'));if(stView('online'))stGo('online',null,true)}
  }else if(r.state==='ready'){
    stPatch(stOnP('rooms',r.rid),{ghb:SV});
    if(d.status==='playing'){clearInterval(ST_ON.guestT);stOnGuestBegin()}
    else if(d.status==='cancelled'){r.state='closed';r.msg='O anfitrião cancelou a sala.';clearInterval(ST_ON.guestT);if(stView('online'))stGo('online',null,true)}
  }
}
async function stOnQuick(){
  if(!stReady())return;
  toast('Procurando adversário…');
  await stOnRefreshListQuiet();
  for(const l of ST_ON.list.slice(0,3)){if(await stOnJoin(l.rid))return}
  await stOnCreate('none');toast('Nenhuma sala encontrada: sala criada. Aguarde um adversário.');
}
async function stOnRefreshListQuiet(){
  const [off,r]=await Promise.all([stOnClock(),stGet(stOnP('lobby'))]),now=Date.now()+off,rows=[];
  Object.entries(r.data||{}).forEach(([rid,l])=>{if(l&&l.host&&l.host!==currentUser&&now-(+l.hb||0)<=40000)rows.push({rid,...l})});
  rows.sort((a,b)=>Math.abs((a.rating||1000)-ST.club.on.rating)-Math.abs((b.rating||1000)-ST.club.on.rating));ST_ON.list=rows;
}
STA.onquick=()=>stOnQuick();
STA.onleave=async()=>{
  const r=ST_ON.room;clearInterval(ST_ON.hostT);clearInterval(ST_ON.guestT);
  if(r){
    if(r.role==='host'){await stPatch(stOnP('rooms',r.rid),{status:'cancelled'});stOnDrop(r.rid)}
    else if(r.state==='ready'||r.state==='joining'){await stPatch(stOnP('rooms',r.rid),{status:'guestleft'});stDel(stOnP('specs',r.rid,'guest'))}
  }
  ST_ON.room=null;ST_ON.rid=null;ST_ON.spec={};stGo('online',null,true);
};
STA.oninvite=async el=>{
  if(!ST_ON.room)await stOnCreate('none');
  const r=await stSendInbox(el.dataset.u,{type:'invite',from:currentUser});
  toast(r.ok?'Convite enviado a '+el.dataset.u+'. Aguarde na sala.':'Erro: '+r.err);stGo('online',null,true);
};
STA.onstart=async()=>{
  const r=ST_ON.room;if(!r||r.role!=='host'||r.state!=='ready'||!ST_ON.spec.opp)return;
  const w=await stPatch(stOnP('rooms',r.rid),{status:'playing'});if(!w.ok)return toast('Erro: '+w.err);
  clearInterval(ST_ON.hostT);
  const me=stOnMySpec(),opp=ST_ON.spec.opp;
  stStartMatch({mode:'online',title:'Online • '+r.guestName,home:me,away:opp,etMode:r.et,meta:{},online:{rid:r.rid}});
};

/* ===================== ANFITRIÃO: roda o motor e publica quadros ===================== */
function stOnPush(ev){
  if(ST_ON.role!=='host')return;
  ev.n=++ST_ON.evn;ST_ON.evs.push(ev);if(ST_ON.evs.length>45)ST_ON.evs.shift();ST_ON.dirty=true;
}
function stOnHostBegin(o){
  Object.assign(ST_ON,{role:'host',rid:o.rid,evs:[],evn:0,seen:{},frameSig:'',final:null,gate:null,ghbVal:null,ghbAt:Date.now(),lastRoomChk:0});
  clearInterval(ST_ON.pubT);clearInterval(ST_ON.cmdT);
  ST_ON.pubT=setInterval(stOnPublish,500);ST_ON.cmdT=setInterval(stOnHostPoll,800);
  setTimeout(()=>{if(M&&M.stx&&M.stx.online&&M.status==='idle')startOrResume()},3400);
}
function stOnFrame(){
  const hs=s=>[...M.hid[s]],ln=l=>({on:l.on.map(p=>[p.id,p.pos]),bn:l.bench.map(p=>p.id)}),g=ST_ON.gate;
  return{st:M.status,min:M.min,ex:M.ex,ie:M.inExtra?1:0,half:M.half,et:M.et?1:0,etl:M.etHalf||0,sh:M.sh,sa:M.sa,att:M.attack,bx:Math.round(M.bx),by:Math.round(M.by),
    stat:M.st,tac:M.tac,subs:M.subs,pauses:M.pauses,pb:M.pb||'',hid:{home:hs('home'),away:hs('away')},lh:ln(M.lh),la:ln(M.la),cards:M.cards,
    g:g?{l:Math.max(0,Math.round((g.until-Date.now())/1000)),h:g.ready.home?1:0,a:g.ready.away?1:0}:null,evn:ST_ON.evn,ev:ST_ON.evs};
}
async function stOnPublish(){
  if(ST_ON.role!=='host'||!M||ST_ON.pubBusy)return;
  const fin=ST_ON.final;let f;
  try{f=fin?{...stOnFrame(),done:1,res:fin}:stOnFrame()}catch(e){return}
  const sig=JSON.stringify(f);
  if(sig===ST_ON.frameSig&&Date.now()-(ST_ON.lastPub||0)<4000)return;
  ST_ON.pubBusy=true;
  try{const r=await stPut(stOnP('frames',ST_ON.rid),{...f,ts:Date.now()});if(r.ok){ST_ON.frameSig=sig;ST_ON.lastPub=Date.now()}}
  finally{ST_ON.pubBusy=false}
}
/* intervalo: libera quando os dois ficam prontos (ou em 40s) */
function stOnGateTick(){
  if(M.status!=='break'){ST_ON.gate=null;return}
  if(!ST_ON.gate)ST_ON.gate={until:Date.now()+40000,ready:{home:false,away:false}};
  const g=ST_ON.gate;
  if((g.ready.home&&g.ready.away)||Date.now()>g.until){ST_ON.gate=null;ST_ON.real.sor()}
}
async function stOnHostPoll(){
  if(stOnDead()||ST_ON.role!=='host')return;
  stOnGateTick();
  if(M.status==='paused'&&M.pb==='away'&&Date.now()-M.pbAt>45000){tick('▶ Tempo da parada técnica esgotado: jogo retomado');ST_ON.real.sor()}
  if(ST_ON.pollBusy)return;ST_ON.pollBusy=true;
  try{
    const r=await stGet(stOnP('cmds',ST_ON.rid));
    if(r.ok&&r.data){
      for(const k of Object.keys(r.data).sort()){
        if(ST_ON.seen[k])continue;ST_ON.seen[k]=1;
        const c=r.data[k];stDel(stOnP('cmds',ST_ON.rid,k));
        try{stOnCmd(c)}catch(e){console.error('[online] comando',e)}
      }
    }
    if(Date.now()-ST_ON.lastRoomChk>3000){
      ST_ON.lastRoomChk=Date.now();
      const rm=await stGet(stOnP('rooms',ST_ON.rid));
      if(rm.ok&&rm.data&&!stOnDead()){
        if(rm.data.ghb!==ST_ON.ghbVal){ST_ON.ghbVal=rm.data.ghb;ST_ON.ghbAt=Date.now()}
        if(Date.now()-ST_ON.ghbAt>120000){toast('O adversário ficou sem conexão: vitória por W.O.');stMatchEnd(M,null,'win')}
      }
    }
  }finally{ST_ON.pollBusy=false}
}
const stOnToast=x=>stOnPush({k:'toast',to:'away',x});
function stOnCmd(c){
  if(stOnDead()||!c||c.from===currentUser)return;
  const st=M.status,l=M.la;
  switch(c.t){
    case 'tac':
      if(!['running','paused','break','hold'].includes(st))return stOnToast('Mude a tática com o jogo rolando, em pausa ou no intervalo.');
      if(c.k==='atk'&&ATK[c.v])setTac('away','atk',c.v);else if(c.k==='def'&&DEF[c.v])setTac('away','def',c.v);
      break;
    case 'pause':
      if(st!=='running'||M.pauses.away<=0||M.subs.away<=0)return stOnToast('Parada técnica indisponível agora.');
      ST_ON.real.pause('away');break;
    case 'resume':
      if(st==='paused'&&M.pb==='away'){tick('▶ Jogo retomado');ST_ON.real.sor()}break;
    case 'ready':
      if(st==='break'&&ST_ON.gate){ST_ON.gate.ready.away=true;stOnGateTick()}break;
    case 'swap':{
      if(!['paused','break'].includes(st))return stOnToast('Substituições só com o jogo parado.');
      const out=l.on.find(p=>p.id===c.out),inn=l.bench.find(p=>p.id===c.in);
      if(!out||!inn)return;
      if(M.subs.away<=0)return stOnToast('Limite de 5 substituições esgotado.');
      if(inn.pos==='GK'&&out.pos!=='GK')return stOnToast('O goleiro reserva só pode entrar no gol.');
      if(out.pos==='GK'&&inn.pos!=='GK')return stOnToast('Só um goleiro pode substituir o goleiro.');
      ST_ON.real.swap('away',out,inn,true);btns();break}
    case 'move':{
      if(!['paused','break'].includes(st))return;
      const j=l.on.findIndex(x=>x.id===c.a),i=+c.i;
      if(j<0||j===i||!l.on[i])return;
      const a=l.on[j],b=l.on[i];
      if((a.pos==='GK'&&i!==0)||(b.pos==='GK'&&j!==0))return stOnToast('O goleiro fica na posição de GK.');
      l.on[j]=b;l.on[i]=a;tick(`🔁 ${M.a.name}: ${a.name} e ${b.name} trocam de posição (${clock()})`);break}
    case 'pk':pkRemote(+c.id,+c.z);break;
    case 'leave':stMatchEnd(M,null,'win');break;
  }
}
/* fim da partida (anfitrião): publica o resultado final para o convidado */
function stOnHostFinal(m,pk,forced){
  const r=forced===true?{sh:0,sa:3}:forced==='win'?{sh:3,sa:0}:{sh:m.sh,sa:m.sa};
  ST_ON.final={...r,pkw:pk&&pk.winner||'',ph:pk?pk.h:0,pa:pk?pk.a:0,wo:forced===true?'host':forced==='win'?'guest':''};
  const rid=ST_ON.rid;
  stPut(stOnP('frames',rid),{...stOnFrame(),done:1,res:ST_ON.final,ts:Date.now()});
  stPatch(stOnP('rooms',rid),{status:'done'});
  setTimeout(()=>stOnDrop(rid),90000);
}
/* limpeza ao sair da partida (anfitrião ou convidado) */
function stOnCleanup(){
  clearInterval(ST_ON.pubT);clearInterval(ST_ON.cmdT);clearInterval(ST_ON.frameT);clearInterval(ST_ON.hbT);clearInterval(ST_ON.hostT);clearInterval(ST_ON.guestT);
  ST_ON.role=null;ST_ON.room=null;ST_ON.rid=null;ST_ON.spec={};ST_ON.gq.length=0;ST_ON.gqBusy=false;ST_ON.gate=null;
  PK&&PK.mirror&&$('m-pk').classList.remove('on');
}

/* ---------- ganchos no motor (capturam o que o convidado precisa ver) ---------- */
(function(){
  const R=ST_ON.real={sor:startOrResume,pause:pauseBy,swap:swapPlayer};
  const _tick=tick;tick=function(t){stOnPush({k:'t',x:t});return _tick.apply(this,arguments)};
  const _banner=banner;
  banner=function(c){
    const b=_banner.apply(this,arguments);
    if(ST_ON.role==='host'){
      const sh=b.show;
      b.show=function(){
        const side=c.team===M.h?'home':c.team===M.a?'away':'';
        stOnPush({k:'ban',sh:M.sh,sa:M.sa,og:ST_ON.og?1:0,c:{word:c.word,cls:c.cls||'',side:c.side||'',ts:side,neutral:c.neutral?1:0,sub:c.sub||'',name:c.name||'',extra:c.extra||'',card:c.card||'',score:c.score?1:0,hit:c.hit||'',ms:c.ms||2200,
          pair:c.pair?c.pair.map(p=>({label:p.label,cls:p.cls,name:p.name})):null,ph:c.photo&&c.photo!==PH?1:0}});
        return sh.apply(this,arguments);
      };
    }
    return b;
  };
  const _og=ownGoalItem;
  ownGoalItem=function(sd,d){const it=_og.apply(this,arguments),s=it.show;it.show=function(){ST_ON.og=true;try{s.apply(this,arguments)}finally{ST_ON.og=false}};return it};
  const _ht=htShow,_hh=htHide;
  htShow=function(p,team,gold){stOnPush({k:'ht',name:p.name,side:team===M.h?'home':'away',gold:gold?1:0});return _ht.apply(this,arguments)};
  htHide=function(){stOnPush({k:'hth'});return _hh.apply(this,arguments)};
  const _bs=ballSeq;ballSeq=function(pts,st){stOnPush({k:'ball',pts,st});return _bs.apply(this,arguments)};
  const _nh=netHit;netHit=function(sd){stOnPush({k:'net',sd});return _nh.apply(this,arguments)};

  /* iniciar/continuar: no intervalo o anfitrião só segue quando o convidado também estiver pronto (ou em 40s) */
  startOrResume=function(){
    if(M&&M.mirror){
      if(M.status==='paused'&&M.pb==='away')stOnSend({t:'resume'});
      else if(M.status==='break'){stOnSend({t:'ready'});ST_ON.readyMe=true;btns()}
      return;
    }
    if(M&&M.on&&ST_ON.role==='host'){
      if(M.status==='paused'&&M.pb==='away'&&Date.now()-M.pbAt<45000)return toast('O adversário pediu a parada técnica (até 45s).');
      if(M.status==='break'){
        if(!ST_ON.gate)ST_ON.gate={until:Date.now()+40000,ready:{home:false,away:false}};
        ST_ON.gate.ready.home=true;
        if(!(ST_ON.gate.ready.away||Date.now()>ST_ON.gate.until)){toast('Aguardando o adversário ficar pronto…');btns();return}
        ST_ON.gate=null;
      }
    }
    return R.sor.apply(this,arguments);
  };
  pauseBy=function(side){if(M&&M.mirror){stOnSend({t:'pause'});return}return R.pause.apply(this,arguments)};
  swapPlayer=function(side,out,inn,keep){if(M&&M.mirror){stOnSend({t:'swap',out:out.id,in:inn.id});return}return R.swap.apply(this,arguments)};
  const _hold=toggleHold;toggleHold=function(){if(M&&M.on)return toast('Online: use a parada técnica.');return _hold.apply(this,arguments)};
  const _mDrop=mDrop;
  mDrop=function(pid,src,drop){
    if(!(M&&M.mirror))return _mDrop.apply(this,arguments);
    if(!drop||drop[0]!=='m')return;
    const [side,iStr]=drop.slice(1).split(':'),i=+iStr;if(side!=='away')return;
    if(!['paused','break'].includes(M.status))return toast('Substituições só com o jogo parado.');
    if(src==='bench'){
      const inn=M.la.bench.find(x=>x.id===pid),out=M.la.on[i];if(!inn||!out)return;
      if(M.subs.away<=0)return toast('Limite de 5 substituições esgotado.');
      if(inn.pos==='GK'&&out.pos!=='GK')return toast('O goleiro reserva só pode entrar no gol.');
      if(out.pos==='GK'&&inn.pos!=='GK')return toast('Só um goleiro pode substituir o goleiro.');
      stOnSend({t:'swap',out:out.id,in:inn.id});
    }else stOnSend({t:'move',a:pid,i});
  };
  const _setTac=setTac;
  setTac=function(side,k,v){
    if(!(M&&M.mirror))return _setTac.apply(this,arguments);
    if(!tacOk()){buildTac();return toast('Mude a tática com o jogo rolando, em pausa ou no intervalo.')}
    M.tac[side][k]=v;stOnSend({t:'tac',k,v});tacTick(true);
  };
  const _adv=applyAdvice;
  applyAdvice=function(side){
    if(!(M&&M.mirror))return _adv.apply(this,arguments);
    const v=advise(side);if(!v)return;if(!tacOk())return toast('Mude a tática com o jogo rolando, em pausa ou no intervalo.');
    M.tac[side].atk=v.atk;M.tac[side].def=v.def;stOnSend({t:'tac',k:'atk',v:v.atk});stOnSend({t:'tac',k:'def',v:v.def});buildTac();
  };
  /* botões da partida online */
  const _btns=btns;
  btns=function(){
    _btns.apply(this,arguments);
    if(!M||!M.on)return;
    $('btn-hold').disabled=true;$('btn-hold').textContent='⏸ (use a parada técnica)';
    const b=$('btn-main'),s=M.status,host=!M.mirror,me=host?'home':'away',other=host?'away':'home';
    $('pause-'+other).disabled=true;$('sub-'+other).disabled=true;
    if(s==='break'){const rd=host?!!(ST_ON.gate&&ST_ON.gate.ready.home):!!ST_ON.readyMe;b.disabled=rd;b.textContent=rd?'⏳ Aguardando o adversário':`▶ Estou pronto (${M.half}º tempo)`}
    else if(s==='paused'){const mine=M.pb===me;b.disabled=!(mine&&host)&&!(M.mirror&&M.pb==='away');b.textContent=b.disabled?'⏸ Parada do adversário':'▶ Continuar'}
    else if(s==='idle'){b.disabled=true;b.textContent='⏳ A partida vai começar…'}
    else if(s!=='finished'){b.disabled=true;b.textContent='⏳ Em andamento'}
  };
})();

/* ===================== CONVIDADO: espelho da partida ===================== */
async function stOnGuestBegin(){
  const r=ST_ON.room;if(!r)return;
  const hs=await stGet(stOnP('specs',r.rid,'host'));
  const home=stOnNorm(hs.data||ST_ON.spec.opp),away=stOnMySpec();
  Object.assign(ST_ON,{role:'guest',rid:r.rid,lastEv:0,gq:[],gqBusy:false,lastFrame:null,staleAt:Date.now(),frameTs:0,readyMe:false,fin:false});
  stStartMatch({mode:'online',title:'Online • '+r.host,home,away,etMode:r.et,meta:{},online:{rid:r.rid,mirror:true}});
  M.etMode=r.et;
  /* os ids dos jogadores são os mesmos do anfitrião: stp:<lado>:<id da carta> */
  ST_ON.pmap={};players.forEach(p=>{ST_ON.pmap[p.id]=p});
  clearInterval(ST_ON.frameT);clearInterval(ST_ON.hbT);
  ST_ON.frameT=setInterval(stOnFramePoll,650);ST_ON.hbT=setInterval(()=>stPatch(stOnP('rooms',r.rid),{ghb:SV}),5000);
}
async function stOnFramePoll(){
  if(ST_ON.role!=='guest'||!M||!M.mirror||ST_ON.fin||ST_ON.fbusy)return;
  ST_ON.fbusy=true;
  try{
    const r=await stGet(stOnP('frames',ST_ON.rid));
    if(!r.ok||!r.data){if(Date.now()-ST_ON.staleAt>90000)stOnGuestEnd({sh:0,sa:3,wo:'host'});return}
    const f=r.data;
    if(f.ts!==ST_ON.frameTs){ST_ON.frameTs=f.ts;ST_ON.staleAt=Date.now()}
    else if(Date.now()-ST_ON.staleAt>90000&&!f.done){toast('O anfitrião ficou sem conexão: vitória por W.O.');stPatch(stOnP('rooms',ST_ON.rid),{status:'wo'});return stOnGuestEnd({sh:0,sa:3,wo:'host'})}
    stOnApply(f);
  }finally{ST_ON.fbusy=false}
}
const stOnPhoto=name=>{const p=players.find(x=>x.name===name&&String(x.teamId).startsWith('st:'));return p&&p.photo?p.photo:PH};
function stOnGqNext(){
  const it=ST_ON.gq.shift();
  if(!it){ST_ON.gqBusy=false;stOnIdle();return}
  ST_ON.gqBusy=true;it.show();setTimeout(()=>{try{it.hide&&it.hide()}catch(e){}stOnGqNext()},it.ms||2000);
}
function stOnGqPush(it){ST_ON.gq.push(it);if(!ST_ON.gqBusy)stOnGqNext()}
function stOnIdle(){
  const f=ST_ON.lastFrame;if(!f||!M)return;
  M.sh=f.sh;M.sa=f.sa;$('s-home').textContent=M.sh;$('s-away').textContent=M.sa;
}
function stOnEvent(ev){
  switch(ev.k){
    case 't':tick(ev.x);break;
    case 'toast':if(ev.to==='away')toast(ev.x);break;
    case 'ban':{
      const c=ev.c,t=c.ts==='home'?M.h:c.ts==='away'?M.a:undefined;
      const cfg={word:c.word,cls:c.cls,side:c.side,team:t,neutral:!!c.neutral,sub:c.sub,name:c.name,extra:c.extra,card:c.card||undefined,score:c.score?1:0,hit:c.hit||undefined,ms:c.ms,
        photo:c.name?stOnPhoto(c.name):PH,pair:c.pair?c.pair.map(p=>({...p,photo:stOnPhoto(p.name)})):undefined};
      const b=banner(cfg),show=b.show;
      b.show=function(){M.sh=ev.sh;M.sa=ev.sa;$('s-home').textContent=M.sh;$('s-away').textContent=M.sa;show.apply(this,arguments);
        if(ev.og){setTimeout(()=>{const w=$('bn-in').querySelector('.bn-word');if(w)w.innerHTML='<span class="mir">LOOOG</span>';$('bn-ov').classList.add('og')},1200)}};
      const hide=b.hide;b.hide=function(){hide.apply(this,arguments);$('bn-ov').classList.remove('og')};
      stOnGqPush(b);break}
    case 'ht':stOnGqPush({ms:4200,show(){const side=ev.side==='home'?M.h:M.a,p={name:ev.name};htShow(p,side,!!ev.gold)},hide(){htHide()}});break;
    case 'ball':ST_ON.ballUntil=Date.now()+(ev.pts||[]).length*(ev.st||380)+400;ballSeq(stOnFix(ev.pts),ev.st||380);break;
    case 'net':netHit(ev.sd);break;
    case 'pkq':stOnGuestPkQ(ev);break;
    case 'pkr':stOnGuestPkR(ev);break;
    case 'pke':{
      if(PK&&PK.mirror){$('pk-msg').textContent=`🏆 ${ev.wn} vence nos pênaltis! (${ev.h} x ${ev.a})`;$('pk-info').textContent='';setTimeout(()=>{if(PK&&PK.mirror)$('m-pk').classList.remove('on')},4000)}break}
  }
}
function stOnApply(f){
  if(!M||!M.mirror)return;
  ST_ON.lastFrame=f;
  stOnFix(f.ev).forEach(ev=>{if(ev&&ev.n>ST_ON.lastEv){ST_ON.lastEv=ev.n;try{stOnEvent(ev)}catch(e){console.error('[online] evento',e,ev)}}});
  M.status=f.st;M.min=f.min;M.ex=f.ex;M.inExtra=!!f.ie;M.half=f.half;M.et=!!f.et;M.etHalf=f.etl;M.attack=f.att||'home';
  M.st=f.stat;M.tac=f.tac;M.subs=f.subs;M.pauses=f.pauses;M.pb=f.pb||'';M.cards=f.cards||{};
  M.hid={home:new Set(stOnFix(f.hid&&f.hid.home)),away:new Set(stOnFix(f.hid&&f.hid.away))};
  const mk=l=>({on:stOnFix(l.on).map(([id,pos])=>{const p=ST_ON.pmap[id];return p?(p.pos===pos?p:{...p,pos,_gk:1}):null}).filter(Boolean),bench:stOnFix(l.bn).map(id=>ST_ON.pmap[id]).filter(Boolean)});
  M.lh=mk(f.lh);M.la=mk(f.la);
  if(f.g)ST_ON.readyMe=!!f.g.a;else if(f.st!=='break')ST_ON.readyMe=false;
  $('m-time').textContent=clock();
  if(!ST_ON.gqBusy)stOnIdle();
  const tg=$('attack'),t=M.attack==='home'?M.h:M.a;
  if(f.st!=='finished'&&t){tg.textContent='ATAQUE: '+t.name.toUpperCase();tg.style.color=c2(t);tg.style.background=c1(t);tg.style.borderColor=c2(t)}
  if(Date.now()>(ST_ON.ballUntil||0))setBall(f.bx,f.by);
  try{moveDots(f.bx,f.by);renderStats();tacTick();btns()}catch(e){console.error(e)}
  /* quadro de substituições só refaz quando muda */
  if(f.done)stOnGuestEnd(f.res);
}
function stOnGuestEnd(res){
  if(ST_ON.fin||!M||!M.stx||M.stx.done)return;
  ST_ON.fin=true;clearInterval(ST_ON.frameT);clearInterval(ST_ON.hbT);
  const finish=()=>{
    const m=M;if(!m||m.stx.done)return;m.stx.done=true;
    const c=ST.club,gf=res.sa,ga=res.sh;let r=gf>ga?'W':gf<ga?'L':'D';
    if(r==='D'&&res.pkw)r=res.pkw==='away'?'W':'L';
    const p=c.pend||{mode:'online',title:m.stx.title,meta:{},opp:{}};c.pend=null;
    const out=stApplyResult(p,r,gf,ga,{pk:res.pkw?{winner:res.pkw,h:res.pa,a:res.ph}:null,forfeit:res.wo==='guest',won:res.wo==='host'});
    stSave({pub:true});stTopRefresh();
    stResultModal(out,{h:m.a,a:m.h});
  };
  setTimeout(finish,ST_ON.gqBusy?4000:1200);
}
/* pênaltis (convidado) */
function stOnGuestPkQ(ev){
  const shoot=ev.sd==='away';
  PK={mirror:1,busy:false,mode:ev.mode,title:ev.title,teams:{home:M.h,away:M.a},sc:ev.sc,kicks:{home:stOnFix(ev.kk&&ev.kk.home),away:stOnFix(ev.kk&&ev.kk.away)},sd:ev.sd,id:ev.id,ctl:{home:false,away:true},how:shoot?'shoot':'dive'};
  $('pk-title').textContent=ev.title;$('pk-done').style.display='none';$('pk-msg').textContent='';$('pk-order').innerHTML='';
  pkScore();resetPkView();
  $('pk-info').textContent=shoot?`${ev.lbl}${ev.tm} cobra. Toque no canto do gol (15s).`:`${ev.lbl}${ev.kn} (${ev.tm}) vai cobrar. Toque no canto onde o goleiro vai pular (15s)!`;
  $('m-pk').classList.add('on');
}
function stOnGuestPk(z){stOnSend({t:'pk',id:PK.id,z});$('pk-info').textContent='Aguardando o adversário…'}
function stOnGuestPkR(ev){
  if(!PK||!PK.mirror)return;
  const z=ev.z,g=ev.g,b=$('pk-ball'),gk=$('pk-gk'),note=ev.note;
  if(ev.res==='miss'){b.style.left=z%3===1?ZX[1]+'%':(z%3===0?'-8%':'108%');b.style.top=z%3===1?'-14%':ZY[z/3|0]+'%'}
  else{b.style.left=(ZX[z%3]+(note?(z%3===2?-7:7):0))+'%';b.style.top=ZY[z/3|0]+'%'}
  gk.style.left=ZX[g%3]+'%';gk.style.top=ZY[g/3|0]+'%';
  PK.sc=ev.sc;PK.kicks={home:stOnFix(ev.kk&&ev.kk.home),away:stOnFix(ev.kk&&ev.kk.away)};
  $('pk-msg').innerHTML=ev.res==='goal'?'⚽ GOOOL!':ev.res==='saved'?'🧤 DEFENDEU!':'❌ PRA FORA!';
  pkScore();
  if(PK.mode==='single'){const pk=PK;setTimeout(()=>{if(PK===pk)$('m-pk').classList.remove('on')},1700)}
}
/* abandonar (convidado): derrota 0 x 3 e vitória do anfitrião */
(function(){
  const f=STA.forfeit;
  STA.forfeit=function(){
    if(!(M&&M.mirror))return f.apply(this,arguments);
    stConfirm('Abandonar a partida? Conta como derrota por 0 x 3.',()=>{stOnSend({t:'leave'});stOnGuestEnd({sh:3,sa:0,wo:'guest'})},'Abandonar');
  };
})();
