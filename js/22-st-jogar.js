/* ===================== STARSTEAM — MODOS DE JOGO E INTEGRAÇÃO COM O MOTOR DE PARTIDA ===================== */
const ST_SIDES=['home','away'];
const stColorRGB=(()=>{let cx=null;return s=>{try{if(!cx){const cv=document.createElement('canvas');cv.width=cv.height=1;cx=cv.getContext('2d',{willReadFrequently:true})}cx.clearRect(0,0,1,1);cx.fillStyle='#000';cx.fillStyle=s;cx.fillRect(0,0,1,1);const d=cx.getImageData(0,0,1,1).data;return[d[0],d[1],d[2]]}catch(e){return[0,0,0]}}})();
const stColorDist=(a,b)=>{const A=stColorRGB(a),B=stColorRGB(b);return Math.hypot(A[0]-B[0],A[1]-B[1],A[2]-B[2])};

/* ---------- Esquadrões (especificação comum: usuário, amigo publicado ou CPU) ---------- */
function stUserSpec(){
  const c=ST.club,sq=c.squads[c.sq],xi=sq.slots.map(id=>c.cards[id]),st=c.cards[c.stad],mg=c.cards[c.mgr];
  const ch=stChem(xi,sq.formation,mg);
  return{user:currentUser,name:c.name,code:c.code,crest:c.crest,kits:c.kits,ball:c.ball,formation:sq.formation,atk:sq.atk,def:sq.def,xi,bench:sq.bench.map(id=>c.cards[id]||null),captain:sq.captain,pk:sq.pk,mgr:mg||null,stad:st?{name:st.name,cap:st.cap,hue:st.hue,pid:st.pid}:null,ovr:stTeamOvr(xi),chem:ch.total,div:c.rv.div,rating:Math.round(c.rv.rating)};
}
function stGenAi(target,tag){
  const rng=stRng('ai:'+tag+':'+Date.now()+':'+Math.random());
  const forms=['4-3-3','4-4-2','4-2-3-1','4-1-2-1-2','3-5-2'].filter(f=>FORMS[f]),form=rng.pick(forms),F=FORMS[form];
  const pool=target>=84?ST_DB.players:ST_DB.players.filter(p=>p.src==='g'||p.src==='c'),club=rng.pick(ST_DB.clubs),used=new Set();
  const pickFor=(pos,tg)=>{
    let cand=pool.filter(p=>!used.has(p.id)&&(p.pos===pos||(p.alt||[]).includes(pos)));
    if(!cand.length)cand=pool.filter(p=>!used.has(p.id)&&((pos==='GK')===(p.pos==='GK')));
    cand=cand.map(p=>({p,s:Math.abs(p.ovr-tg)+rng()*7})).sort((a,b)=>a.s-b.s);
    if(!cand.length)cand=ST_DB.players.map(p=>({p,s:Math.random()}));
    const p=cand[0].p;used.add(p.id);return p;
  };
  let xiB=F.map(([pos])=>pickFor(pos,target));
  const mean=xiB.reduce((s,p)=>s+p.ovr,0)/11,delta=stClamp(Math.round(target-mean),-9,9);
  const adj=(p,d)=>{const c=stMakeCard(p);c.ovr=stClamp(c.ovr+d,35,99);c.stats=c.stats.map(v=>stClamp(v+d,18,99));return c};
  const xi=xiB.map(p=>adj(p,delta));
  const bench=Array.from({length:7},(_,i)=>{const pos=i===0?'GK':['CB','CM','LW','ST','CDM','RB'][i-1];return adj(pickFor(pos,target-6),delta)});
  const chem=stChem(xi,form,null).total;
  const pat=rng.pick(ST_KIT_PATTERNS)[0],h=club.hue;
  const best=xi.slice().sort((a,b)=>b.ovr-a.ovr)[0],pk=xi.slice().sort((a,b)=>b.stats[1]-a.stats[1])[0];
  return{user:null,bot:true,name:club.n,code:club.n.replace(/[^A-Za-zÀ-ú]/g,'').slice(0,3).toUpperCase().padEnd(3,'X'),crest:club.crest,
    kits:{home:{pat,c1:`hsl(${h} 62% 40%)`,c2:'#ffffff'},away:{pat:'liso',c1:'#f1f1f1',c2:`hsl(${h} 62% 40%)`}},ball:'b1',formation:form,atk:rng.pick(['eq','posse','counter','pontas']),def:rng.pick(['eq','press','recuar','linha']),
    xi,bench,captain:best.id,pk:pk.id,mgr:null,stad:null,ovr:stTeamOvr(xi),chem,div:null,rating:null};
}
function stSpecFromPub(p){
  return{user:p.user,name:p.name,code:p.code,crest:p.crest,kits:p.kits,ball:p.ball,formation:p.formation,atk:p.atk||'eq',def:p.def||'eq',xi:p.xi,bench:p.bench.map(x=>x||null),captain:p.captain,pk:p.pk,mgr:p.mgr&&p.mgr.id?p.mgr:null,stad:p.stad||null,ovr:p.ovr,chem:p.chem,div:p.div,rating:p.rating};
}
/* adversário humano parecido (matchmaking) ou CPU quando ninguém está disponível */
function stPickOpponent(mode,opts){
  opts=opts||{};const c=ST.club,me=currentUser,hist=(c.rv.hist||[]).slice(-3).map(h=>h.u);
  let L=Object.values(ST.pubs).filter(p=>p.user&&p.user!==me&&p.xi.every(Boolean)&&!hist.includes(p.user));
  if(mode==='rivals')L=L.filter(p=>Math.abs((p.rating||1000)-c.rv.rating)<=300&&Math.abs((p.div==null?10:p.div)-c.rv.div)<=2);
  if(mode==='champ')L=L.filter(p=>Math.abs((p.chw||0)-c.ch.wins)<=4);
  if(L.length&&Math.random()<.65){L.sort((a,b)=>Math.abs((a.rating||1000)-c.rv.rating)-Math.abs((b.rating||1000)-c.rv.rating));return stSpecFromPub(L[Math.floor(Math.random()*Math.min(3,L.length))])}
  return stGenAi(opts.ovr||70,mode);
}

/* ---------- Times temporários para o motor ---------- */
function stBuildTeam(side,spec,opts){
  opts=opts||{};
  const F=FORMS[spec.formation]||FORMS['4-3-3'],eff=stEffective(spec.xi,spec.formation,spec.mgr),tid='st:'+side,pm={},ps=[];
  const mk=(c,pos,ovr)=>{const id='stp:'+side+':'+c.id;pm[c.id]=id;ps.push({id,name:c.name,teamId:tid,ovr:ovr,pos,foot:'R',skills:3,photo:stCardPhoto(c),sk:(c.stats||[]).slice(),author:'startsteam'});return id};
  const tactics={};
  spec.xi.forEach((c,i)=>{tactics['s'+i]=mk(c,F[i][0],eff[i].eff)});
  spec.bench.forEach(c=>{if(c)mk(c,c.pos,c.ovr)});
  const best=k=>spec.xi.slice().sort((a,b)=>b.stats[k]-a.stats[k])[0];
  const cap=pm[spec.captain]||pm[best(5).id],pk=pm[spec.pk]||pm[best(1).id],pas=pm[best(2).id];
  let c1=spec.kits[opts.kit||'home'];
  const t={id:tid,name:spec.name,code:spec.code,logo:stCrestURL(spec.crest,160),formation:spec.formation,tactics,color:c1.c1,color2:c1.c2,leagueId:'',atk:spec.atk||'eq',def:spec.def||'eq',captain:cap,pk,corner:pas,fk:pas,cor:pas,stadium:spec.stad?spec.stad.name:'',stadiumImg:spec.stad?stStadiumImg(spec.stad):'',fans:spec.stad?spec.stad.cap:0,priv:false,_st:1};
  return{team:t,players:ps};
}
/* ---------- Início de partida ---------- */
function stReady(){const r=stSquadReady();if(!r.ok){toast(r.msg);stGo('squad',null);return false}return true}
function stMatchActive(){return !!(ST_LIVE&&M&&M.stx&&!M.stx.done)}
function stVsIntro(H,A,title,done){
  if(ST.reduceMotion)return done&&done();
  const ov=document.createElement('div');ov.className='st-ov st-scope st-vs';if(ST_ART.matchIntroBg)ov.style.backgroundImage=`url('${stAttr(ST_ART.matchIntroBg)}')`;
  ov.innerHTML=`<div class="vs-title">${esc(title)}</div><div class="vs-row"><div class="vs-side l">${stCrest(H.crest,150)}<b>${esc(H.name)}</b><small>OVR ${H.ovr} • ENT ${H.chem}</small></div><div class="vs-x">VS</div><div class="vs-side r">${stCrest(A.crest,150)}<b>${esc(A.name)}</b><small>OVR ${A.ovr} • ENT ${A.chem}</small></div></div>`;
  document.body.appendChild(ov);const end=()=>{if(ov.dataset.e)return;ov.dataset.e=1;ov.classList.add('out');setTimeout(()=>{ov.remove();done&&done()},450)};
  ov.addEventListener('click',end);setTimeout(end,2800);
}
function stStartMatch(cfg){
  if(stMatchActive())return toast('Já existe uma partida do StarsTeam em andamento.');
  if(M&&M.status&&['running','paused','break','hold'].includes(M.status)&&!ST_LIVE)return toast('Termine a partida em andamento (Partida Rápida/Ligas) antes.');
  const c=ST.club,home=cfg.home,away=cfg.away;
  let akit='home';
  if(stColorDist(home.kits.home.c1,away.kits.home.c1)<110)akit='away';
  const H=stBuildTeam('home',home,{kit:'home'}),A=stBuildTeam('away',away,{kit:akit});
  ST.tmp={teams:[H.team,A.team],players:[...H.players,...A.players]};
  ST_LIVE=true;teams.push(H.team,A.team);players.push(...ST.tmp.players);
  $('sel-home').innerHTML=`<option value="${H.team.id}">${esc(H.team.name)}</option>`;$('sel-away').innerHTML=`<option value="${A.team.id}">${esc(A.team.name)}</option>`;
  $('sel-home').value=H.team.id;$('sel-away').value=A.team.id;
  $('ctl').value='home';$('et-mode').value=cfg.etMode||'none';
  onTeamChange();
  M.ctl={home:true,away:false};M.etMode=cfg.etMode||'none';M.ctx=null;M.lg=0;
  M.stx={mode:cfg.mode,title:cfg.title,done:false,home,away,onEnd:cfg.onEnd};
  c.pend={mode:cfg.mode,title:cfg.title,meta:cfg.meta||{},opp:{user:away.user||null,name:away.name,rating:away.rating},t:Date.now()};stSave();
  stBallOn(c.ball);
  lockSel(true);paint();layoutDots();buildTac();btns();renderStats();renderStadium();
  stGo('match',null);stVsIntro(home,away,cfg.title,()=>{});
}
function stBallOn(id){
  let s=$('st-ballstyle');if(!s){s=document.createElement('style');s.id='st-ballstyle';document.head.appendChild(s)}
  const u='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(stBall(id,128));s.textContent=`.ball{background-image:url("${u}")!important}.htb{background-image:url("${u}")!important}`;
}
function stMatchCleanup(){
  const t=ST.tmp;
  if(t){t.teams.forEach(x=>{const i=teams.indexOf(x);if(i>=0)teams.splice(i,1)});const ids=new Set(t.players.map(p=>p.id));for(let i=players.length-1;i>=0;i--)if(ids.has(players[i].id))players.splice(i,1)}
  ST.tmp=null;
  const s=$('st-ballstyle');if(s)s.remove();
  if(M&&M.timer)stopTimer();
  ST_LIVE=false;
  try{stRestoreGrid();fillSelects();M=null;onTeamChange();renderStadium()}catch(e){console.error(e)}
}
/* gancho de fim de partida */
(function(){
  const fin=finishFT;
  finishFT=function(){
    const m=M;fin.apply(this,arguments);
    if(m&&m.stx&&!m.stx.done){
      if(m.sh===m.sa&&m.etPen)m.stx.waitPK=true;
      else setTimeout(()=>stMatchEnd(m),1500);
    }
  };
  const opk=openPK;
  openPK=function(cfg){
    if(M&&M.stx&&!M.stx.done){const cb=cfg.cb,m=M;cfg.cb=r=>{try{cb(r)}catch(e){console.error(e)}setTimeout(()=>stMatchEnd(m,r),800)}}
    return opk.call(this,cfg);
  };
  const gt=goTab;
  goTab=function(id){
    if(stMatchActive()&&id!=='st'&&id!=='home'){toast('Termine (ou abandone) a partida do StarsTeam primeiro.');id='st'}
    return gt.call(this,id);
  };
})();

function stMatchEnd(m,pk,forced){
  if(!m||!m.stx||m.stx.done)return;
  m.stx.done=true;if(m.timer)stopTimer();
  const c=ST.club;let gf=m.sh,ga=m.sa,res=gf>ga?'W':gf<ga?'L':'D';
  if(pk)res=pk.winner==='home'?'W':'L';
  if(forced){gf=0;ga=3;res='L'}
  const p=c.pend||{mode:m.stx.mode,title:m.stx.title,meta:{},opp:{}};c.pend=null;
  const out=stApplyResult(p,res,gf,ga,{pk,forfeit:!!forced});
  if(p.opp&&p.opp.user&&!forced)stSendInbox(p.opp.user,{type:'duel',from:currentUser,mode:p.title,gf:ga,ga:gf}).catch&&0;
  stSave({pub:true});stTopRefresh();
  stResultModal(out,m);
}
STA.forfeit=()=>{
  if(!stMatchActive())return;
  stConfirm('Abandonar a partida? Conta como derrota por 0 x 3.',()=>{if(M.timer)stopTimer();stMatchEnd(M,null,true)},'Abandonar');
};

/* ---------- Aplicação do resultado por modo ---------- */
function stApplyResult(p,res,gf,ga,x){
  x=x||{};const c=ST.club,lines=[],mode=p.mode,out={res,gf,ga,title:p.title,lines,mode,next:'play'};
  if(mode!=='friend'){
    c.st.p++;c.st.gf+=gf;c.st.ga+=ga;c.st[res==='W'?'w':res==='D'?'d':'l']++;
    stEvent('play');if(res==='W')stEvent('win');if(gf)stEvent('goal',gf);
  }
  if(mode==='rivals'){
    const r=c.rv,pts=res==='W'?3:res==='D'?1:0;r.games++;if(res==='W'){r.wins++;r.streak=(r.streak||0)+1;stEvent('rivalsWin')}else r.streak=0;
    const orat=(p.opp&&p.opp.rating)||ST_DIV_AI[r.div]*14,E=1/(1+Math.pow(10,(orat-r.rating)/400)),S=res==='W'?1:res==='D'?.5:0,d=Math.round(24*(S-E));
    r.rating=Math.max(0,r.rating+d);r.hist.push({u:p.opp&&p.opp.user||'',r:res,t:Date.now()});if(r.hist.length>20)r.hist.shift();
    lines.push(`Pontos de divisão +${pts} • Rating ${d>=0?'+':''}${d}`);
    if(r.div>0){r.pts+=pts;if(r.pts>=ST_DIV_PTS[r.div]){r.pts-=ST_DIV_PTS[r.div];r.div--;stEvent('promo');lines.push(`⬆️ PROMOVIDO para ${ST_DIV_NAME(r.div)}!`);stNote('⬆️ Você subiu para '+ST_DIV_NAME(r.div)+' no StarsRivals!');out.promo=true}}
    out.next='rivals';
  }else if(mode==='sb'){
    const lv=ST_SB_LEVELS[p.meta.level],pts=res==='W'?lv.pts:res==='D'?Math.round(lv.pts*.3):0;
    c.sb.pts+=pts;c.sb.played++;
    if(res==='W'){c.coins+=lv.coins;lines.push(`+${stFmt(lv.coins)} moedas`)}
    lines.push(`Squad Battles: +${pts} pontos semanais`);out.next='sb';
  }else if(mode==='champ'){
    const ch=c.ch,pts=res==='W'?4:res==='D'?2:1;ch.played++;if(res==='W')ch.wins++;ch.pts+=pts;ch.res.push(res);
    lines.push(`Champions: +${pts} pontos (${ch.played}/${ST_CH_GAMES} jogos, ${ch.wins} vitórias)`);
    if(ch.played>=ST_CH_GAMES)lines.push('🏁 Você completou os 20 jogos! Resgate o prêmio na tela do Champions.');
    out.next='champ';
  }else if(mode==='champ_po'){
    if(res==='W'){c.ch.qual=true;c.ch.po=true;c.ch.active=true;c.ch.wk=stWeekId();lines.push('✅ Classificado para o StarsChampions!')}
    else lines.push('Você não passou do playoff.');
    c.ch.po=true;out.next='champ';
  }else if(mode==='draft'){
    const d=c.draft;
    if(d){
      if(res==='W'){d.wins++;lines.push(d.wins>=4?'🏆 Campeão do Draft!':`Avançou para a rodada ${d.wins+1}.`)}
      else{d.over=true;lines.push('Eliminado do Draft.')}
      if(d.wins>=4)d.over=true;
      d.stage=d.over?'done':'play';
    }
    out.next='draft';
  }else if(mode==='friend'){out.next='comm'}
  if(x.forfeit)lines.unshift('Partida abandonada: derrota por 0 x 3.');
  stLog(`${p.title}: ${res==='W'?'vitória':res==='D'?'empate':'derrota'} ${gf} x ${ga}`);
  return out;
}
function stResultModal(o,m){
  const col=o.res==='W'?'#2ecc71':o.res==='D'?'#f2b01e':'#e5603a',txt=o.res==='W'?'VITÓRIA':o.res==='D'?'EMPATE':'DERROTA';
  const ov=document.createElement('div');ov.className='st-ov st-scope st-result';ov.id='st-result';
  ov.innerHTML=`<div class="str-card" style="--rc:${col}"><div class="str-t">${esc(o.title)}</div><div class="str-r">${txt}</div><div class="str-s">${m?esc(m.h.name):''} <b>${o.gf} x ${o.ga}</b> ${m?esc(m.a.name):''}</div>
    <div class="str-l">${o.lines.map(l=>`<div>${esc(l)}</div>`).join('')}</div><button class="btn" data-act="resdone" data-n="${o.next}">Continuar</button></div>`;
  document.body.appendChild(ov);requestAnimationFrame(()=>ov.classList.add('in'));
}
STA.resdone=el=>{
  const o=$('st-result');if(o)o.remove();
  stMatchCleanup();stGo(el.dataset.n||'play',null);
};

/* ---------- Tela da partida ---------- */
STV.match=()=>{
  if(!stMatchActive())return `<div class="st-card"><p>Nenhuma partida em andamento.</p><button class="btn" data-act="go" data-v="play">Jogar</button></div>`;
  return `<div class="st-matchbar"><b>${esc(M.stx.title)}</b><button class="btn sec sm" data-act="forfeit">🏳️ Abandonar</button></div><div id="st-match-host"></div>`;
};
STP.match=()=>{const g=document.querySelector('#tab-match .match-grid'),h=$('st-match-host');if(g&&h){h.appendChild(g);try{layoutDots();renderStats();btns()}catch(e){}}};

/* ---------- Tela Jogar ---------- */
STV.play=()=>{
  const c=ST.club,a=stActiveInfo(),champ=stChampOpen();
  const pend=c.chPending.length;
  const tiles=[
    ['rivals','🛡️','StarsRivals',`${ST_DIV_NAME(c.rv.div)} • ${c.rv.wins} vitórias na semana`,'Suba de divisão e ganhe recompensas semanais.'],
    ['champ','🏆','StarsChampions',champ?(c.ch.active?`${c.ch.played}/${ST_CH_GAMES} jogos • ${c.ch.pts} pts`:'Fim de semana aberto'):'Abre no fim de semana','Classifique-se e jogue 20 partidas. Vitória +4, derrota +1.'],
    ['draft','🎲','StarsDraft',c.draft&&c.draft.stage!=='done'?'Em andamento':'Entrada: '+stFmt(ST_DRAFT_FEE)+' 🪙','Monte um time do zero e vá até a 4ª vitória no mata-mata.'],
    ['sb','⚔️','Squad Battles',`${c.sb.pts} pts na semana`,'Enfrente a CPU em 6 níveis de dificuldade.'],
    ['friends','👥','Amistoso com amigos','Sem prêmios','Enfrente o elenco publicado de um amigo.']
  ];
  if(!a.full)return `<div class="st-card"><h3 class="t">Complete o seu elenco</h3><p>Você precisa dos 11 titulares para jogar.</p><button class="btn" data-act="go" data-v="squad">Ir ao Elenco</button></div>`;
  return `<h2 class="t">Jogar</h2><div class="st-modes">${tiles.map(([k,ic,n,s,d],i)=>`<button class="st-mode tilt" style="--i:${i}" data-act="go" data-v="${k}"><span>${ic}</span><b>${n}</b><em>${esc(s)}</em><small>${esc(d)}</small>${k==='champ'&&pend?'<i class="st-pill">prêmio!</i>':''}</button>`).join('')}</div>
  <p class="st-fine">Online com amigos: a partida contra um amigo é assíncrona. O time dele é controlado pela CPU usando o elenco e a tática que ele deixou publicados.</p>`;
};

/* ---------- Squad Battles ---------- */
STV.sb=()=>{
  const c=ST.club;
  return `<div class="row" style="justify-content:space-between"><h2 class="t">Squad Battles</h2><button class="btn sec sm" data-act="go" data-v="play">‹ Voltar</button></div><p class="st-sub">Pontos semanais: <b>${c.sb.pts}</b> • ${c.sb.played} jogos</p>
  <div class="st-sbl">${ST_SB_LEVELS.map(l=>`<div class="st-card st-lvl tilt"><h4>${l.n}</h4><b>OVR ${l.ovr}</b><small>Vitória: +${l.pts} pts • ${l.coins} 🪙</small><button class="btn" data-act="sbplay" data-i="${l.id}">Jogar</button></div>`).join('')}</div>
  <div class="st-card"><h3 class="t">Recompensas da semana</h3><div class="st-rw">${ST_SB_REWARDS.map(r=>{const ok=c.sb.pts>=r.p,cl=c.sb.claimed[r.p];return `<div class="st-rwi${cl?' done':''}"><b>${r.p} pts</b><small>${esc(stRewardText(r))}</small>${cl?'<em>✔</em>':`<button class="btn sm" data-act="sbclaim" data-p="${r.p}" ${ok?'':'disabled'}>Resgatar</button>`}</div>`}).join('')}</div></div>`;
};
STA.sbplay=el=>{
  if(!stReady())return;const lv=ST_SB_LEVELS[+el.dataset.i];
  stStartMatch({mode:'sb',title:'Squad Battles • '+lv.n,home:stUserSpec(),away:stGenAi(lv.ovr,'sb'+lv.id),meta:{level:lv.id}});
};
STA.sbclaim=el=>{const r=ST_SB_REWARDS.find(x=>x.p===+el.dataset.p),c=ST.club;if(!r||c.sb.pts<r.p||c.sb.claimed[r.p])return;c.sb.claimed[r.p]=1;stGrant(r);stSave();toast('🎁 '+stRewardText(r));stTopRefresh();stGo('sb',null,true)};

/* ---------- Rivals ---------- */
STV.rivals=()=>{
  const c=ST.club,r=c.rv,need=ST_DIV_PTS[r.div],mult=1+(10-r.div)*.15;
  return `<div class="row" style="justify-content:space-between"><h2 class="t">StarsRivals</h2><button class="btn sec sm" data-act="go" data-v="play">‹ Voltar</button></div>
  <div class="st-card st-rivhead"><div><small>Divisão</small><b>${ST_DIV_NAME(r.div)}</b></div><div><small>Rating</small><b>${Math.round(r.rating)}</b></div><div><small>Pontos p/ subir</small><b>${r.div>0?r.pts+'/'+need:'—'}</b></div><div><small>Vitórias na semana</small><b>${r.wins}</b></div><div><small>Sequência</small><b>${r.streak||0}</b></div></div>
  <div class="st-card"><button class="btn" style="font-size:1.1rem;padding:.8rem 2rem" data-act="rvplay">⚔️ Procurar partida</button><p class="st-fine">O sistema procura um técnico do beta com rating parecido. Se não houver ninguém, você enfrenta um rival da CPU da sua divisão. Vitória +3 pts, empate +1.</p>
    ${r.wins>=ST_RIVALS_QUALIFY_WINS?'<p class="st-ok">✔ Com '+ST_RIVALS_QUALIFY_WINS+' vitórias, você está classificado para o Champions desta semana.</p>':`<p class="st-fine">Faltam ${ST_RIVALS_QUALIFY_WINS-r.wins} vitória(s) para se classificar ao Champions pelo Rivals.</p>`}</div>
  <div class="st-card"><h3 class="t">Recompensas semanais (×${mult.toFixed(2)} moedas pela divisão)</h3><div class="st-rw">${ST_RIVALS_REWARDS.map(x=>{const ok=r.wins>=x.w,cl=r.claimed[x.w];const rw={...x,coins:Math.round(x.coins*mult)};return `<div class="st-rwi${cl?' done':''}"><b>${x.w} vitórias</b><small>${esc(stRewardText(rw))}</small>${cl?'<em>✔</em>':`<button class="btn sm" data-act="rvclaim" data-w="${x.w}" ${ok?'':'disabled'}>Resgatar</button>`}</div>`}).join('')}</div></div>`;
};
STA.rvplay=()=>{
  if(!stReady())return;const c=ST.club,opp=stPickOpponent('rivals',{ovr:ST_DIV_AI[c.rv.div]});
  stStartMatch({mode:'rivals',title:'StarsRivals • '+ST_DIV_NAME(c.rv.div),home:stUserSpec(),away:opp,meta:{}});
};
STA.rvclaim=el=>{
  const c=ST.club,x=ST_RIVALS_REWARDS.find(v=>v.w===+el.dataset.w);if(!x||c.rv.wins<x.w||c.rv.claimed[x.w])return;
  const mult=1+(10-c.rv.div)*.15,rw={...x,coins:Math.round(x.coins*mult)};c.rv.claimed[x.w]=1;stGrant(rw);stSave();toast('🎁 '+stRewardText(rw));stTopRefresh();stGo('rivals',null,true);
};

/* ---------- Champions ---------- */
STV.champ=()=>{
  const c=ST.club,ch=c.ch,open=stChampOpen(),wk=stWeekId();
  const pend=c.chPending.map((p,i)=>{const t=stChampTier(p.pts);return `<div class="st-rwi"><b>Semana ${p.wk}</b><small>${p.played} jogos • ${p.wins} vitórias • ${p.pts} pts → ${esc(stRewardText(t))}</small><button class="btn sm" data-act="chclaimp" data-i="${i}">Resgatar</button></div>`}).join('');
  const qualified=ch.qual||c.rv.wins>=ST_RIVALS_QUALIFY_WINS,tier=stChampTier(ch.pts),done=ch.played>=ST_CH_GAMES;
  let main='';
  if(!open)main=`<div class="st-card"><h3 class="t">Fechado</h3><p>O StarsChampions abre no <b>sábado e domingo</b>. Até lá, se classifique pelo Rivals (${ST_RIVALS_QUALIFY_WINS} vitórias na semana, você tem ${c.rv.wins}).</p></div>`;
  else if(!qualified)main=`<div class="st-card"><h3 class="t">Classificação</h3><p>Você ainda não está classificado. Vença ${ST_RIVALS_QUALIFY_WINS} jogos no Rivals na semana (${c.rv.wins}/${ST_RIVALS_QUALIFY_WINS}) ou dispute o <b>playoff</b> de acesso contra um rival forte.</p><button class="btn" data-act="chpo" ${c.coins<2000?'disabled':''}>Disputar playoff (2.000 🪙)</button></div>`;
  else main=`<div class="st-card st-rivhead"><div><small>Jogos</small><b>${ch.played}/${ST_CH_GAMES}</b></div><div><small>Vitórias</small><b>${ch.wins}</b></div><div><small>Pontos</small><b>${ch.pts}</b></div><div><small>Prêmio atual</small><b style="font-size:.8rem">${esc(stRewardText(tier))}</b></div></div>
    <div class="st-card">${done?`<p>Fase concluída! <button class="btn" data-act="chclaim" ${ch.claimed?'disabled':''}>${ch.claimed?'Prêmio resgatado':'Resgatar prêmio'}</button></p>`:`<button class="btn" style="font-size:1.1rem;padding:.8rem 2rem" data-act="chplay">🏆 Jogar partida</button>`}<div class="st-resrow">${ch.res.map(r=>`<i class="${r}">${r}</i>`).join('')}</div></div>`;
  return `<div class="row" style="justify-content:space-between"><h2 class="t">StarsChampions</h2><button class="btn sec sm" data-act="go" data-v="play">‹ Voltar</button></div>${pend?`<div class="st-card"><h3 class="t">Prêmios pendentes de semanas anteriores</h3><div class="st-rw">${pend}</div></div>`:''}${main}
  <div class="st-card"><h3 class="t">Faixas de prêmio</h3><div class="st-rw">${ST_CH_TIERS.map(t=>`<div class="st-rwi${ch.pts>=t.p&&ch.played?' done':''}"><b>${t.p}+ pts</b><small>${esc(stRewardText(t))}</small></div>`).join('')}</div></div>`;
};
STA.chplay=()=>{
  if(!stReady())return;const c=ST.club;if(!stChampOpen())return toast('O Champions está fechado.');
  if(!c.ch.active){c.ch.active=true;c.ch.wk=wkSafe()}
  stStartMatch({mode:'champ',title:'StarsChampions • jogo '+(c.ch.played+1),home:stUserSpec(),away:stPickOpponent('champ',{ovr:72+Math.min(16,c.ch.wins*1.3)}),meta:{}});
};
const wkSafe=()=>stWeekId();
STA.chpo=()=>{
  if(!stReady())return;const c=ST.club;if(c.coins<2000)return toast('Moedas insuficientes.');
  stConfirm('Pagar 2.000 🪙 e disputar o playoff? Se vencer, você entra no Champions.',()=>{c.coins-=2000;stSave();stStartMatch({mode:'champ_po',title:'Playoff do Champions',home:stUserSpec(),away:stGenAi(82,'po'),meta:{}})},'Disputar');
};
STA.chclaim=()=>{const c=ST.club,ch=c.ch;if(ch.claimed||ch.played<ST_CH_GAMES)return;ch.claimed=true;const t=stChampTier(ch.pts);stGrant(t);stLog('Resgatou prêmio do Champions');stSave();toast('🎁 '+stRewardText(t));stTopRefresh();stGo('champ',null,true)};
STA.chclaimp=el=>{const c=ST.club,p=c.chPending[+el.dataset.i];if(!p)return;c.chPending.splice(+el.dataset.i,1);const t=stChampTier(p.pts);stGrant(t);stSave();toast('🎁 '+stRewardText(t));stTopRefresh();stGo('champ',null,true)};

/* ---------- Draft ---------- */
const ST_DRAFT_FORMS=['4-3-3','4-4-2','4-2-3-1','3-5-2','4-1-2-1-2'];
function stDraftOptions(pos,round){
  const pool=stPool().filter(p=>p.pos===pos||(p.alt||[]).includes(pos)),out=[],used=new Set();
  const bands=[[60,72],[70,79],[78,84],[82,88],[86,96]];
  for(let i=0;i<5;i++){
    const b=bands[Math.min(4,Math.max(0,Math.floor(Math.random()*Math.random()*5)+(round<2?0:0)))];
    const c=stPickFrom(pool,b[0],b[1],{exclude:used})||stPickFrom(pool,55,99,{exclude:used});
    if(c){used.add(c.base||c.id);out.push(stMakeCard(c))}
  }
  return out;
}
STV.draft=()=>{
  const c=ST.club,d=c.draft;
  if(!d||d.stage==='done'&&!d.over)return stDraftEntry();
  if(d.stage==='form')return `<div class="row" style="justify-content:space-between"><h2 class="t">Draft • escolha a formação</h2></div><div class="st-modes">${d.forms.map(f=>`<button class="st-mode tilt" data-act="drform" data-f="${f}"><b>${f}</b></button>`).join('')}</div>`;
  if(d.stage==='pick'){
    const F=FORMS[d.form],i=d.picked.length,pos=F[i][0];
    return `<h2 class="t">Draft • posição ${i+1}/11: ${pos}</h2><div class="st-nums"><div><small>ESCOLHIDOS</small><b>${i}/11</b></div></div>
      <div class="st-draftopts">${d.opts.map((x,k)=>`<div class="tilt" data-act="drpick" data-k="${k}">${stCardHTML(x,{size:'md',tilt:false})}</div>`).join('')}</div>
      <div class="st-selrow">${d.picked.map(x=>stCardHTML(x,{size:'xs',tilt:false})).join('')}</div>`;
  }
  return stDraftPlay();
};
function stDraftEntry(){
  const c=ST.club,d=c.draft;
  return `<div class="row" style="justify-content:space-between"><h2 class="t">StarsDraft</h2><button class="btn sec sm" data-act="go" data-v="play">‹ Voltar</button></div>
  <div class="st-card"><p>Pague a entrada de <b>${stFmt(ST_DRAFT_FEE)} 🪙</b>, monte um time escolhendo 1 entre 5 jogadores para cada posição e dispute um mata-mata de 4 jogos. Quanto mais vitórias, melhor o prêmio. Perdeu, acabou. Os jogadores do Draft não ficam com você.</p>
  <div class="st-rw">${ST_DRAFT_REWARDS.map((r,i)=>`<div class="st-rwi"><b>${i} vitória${i===1?'':'s'}</b><small>${esc(stRewardText(r))}</small></div>`).join('')}</div>
  <button class="btn" data-act="drstart" ${c.coins<ST_DRAFT_FEE?'disabled':''}>Entrar (${stFmt(ST_DRAFT_FEE)} 🪙)</button></div>`;
}
STA.drstart=()=>{
  const c=ST.club;if(c.coins<ST_DRAFT_FEE)return toast('Moedas insuficientes.');
  c.coins-=ST_DRAFT_FEE;const forms=ST_DRAFT_FORMS.filter(f=>FORMS[f]).sort(()=>Math.random()-.5).slice(0,3);
  c.draft={stage:'form',forms,form:'',picked:[],opts:[],wins:0,over:false};stSave();stTopRefresh();stGo('draft',null,true);
};
STA.drform=el=>{const d=ST.club.draft;d.form=el.dataset.f;d.stage='pick';d.opts=stDraftOptions(FORMS[d.form][0][0],0);stSave();stGo('draft',null,true)};
STA.drpick=el=>{
  const d=ST.club.draft,x=d.opts[+el.dataset.k];if(!x)return;d.picked.push(x);
  if(d.picked.length>=11){d.stage='play';d.opts=[];
    const bench=['GK','CB','CM','LW','ST','CDM','RB'].map(p=>{const c=stPickFrom(stPool().filter(z=>z.pos===p),62,74,{});return c?stMakeCard(c):null});d.bench=bench}
  else d.opts=stDraftOptions(FORMS[d.form][d.picked.length][0],d.picked.length);
  stSave();stGo('draft',null,true);
};
function stDraftSpec(){
  const d=ST.club.draft,xi=d.picked,ch=stChem(xi,d.form,null);
  const best=xi.slice().sort((a,b)=>b.ovr-a.ovr)[0];
  return{user:currentUser,name:'Draft de '+ST.club.name,code:ST.club.code,crest:ST.club.crest,kits:ST.club.kits,ball:ST.club.ball,formation:d.form,atk:'eq',def:'eq',xi,bench:d.bench||Array(7).fill(null),captain:best.id,pk:best.id,mgr:null,stad:null,ovr:stTeamOvr(xi),chem:ch.total};
}
function stDraftPlay(){
  const d=ST.club.draft,sp=stDraftSpec(),over=d.over,rw=ST_DRAFT_REWARDS[Math.min(4,d.wins)];
  return `<div class="row" style="justify-content:space-between"><h2 class="t">Draft • ${over?'fim':'rodada '+(d.wins+1)+'/4'}</h2></div>
  <div class="st-nums"><div><small>OVR</small><b>${sp.ovr}</b></div><div><small>ENT</small><b>${sp.chem}</b></div><div><small>VITÓRIAS</small><b>${d.wins}/4</b></div></div>
  ${stPitchHTML({formation:d.form,captain:'',pk:''},d.picked,null)}
  <div class="st-card">${over?`<p>${d.wins>=4?'🏆 Campeão!':'Eliminado.'} Prêmio: <b>${esc(stRewardText(rw))}</b></p><button class="btn" data-act="drclaim">Resgatar prêmio</button>`:`<button class="btn" style="font-size:1.1rem;padding:.8rem 2rem" data-act="drplay">▶ Jogar a rodada ${d.wins+1}</button>`}</div>`;
}
STA.drplay=()=>{
  const d=ST.club.draft,sp=stDraftSpec();
  stStartMatch({mode:'draft',title:'StarsDraft • rodada '+(d.wins+1),home:sp,away:stGenAi(Math.max(60,sp.ovr-3+d.wins*2.5),'dr'+d.wins),etMode:'et_pen',meta:{round:d.wins}});
};
STA.drclaim=()=>{const c=ST.club,d=c.draft,rw=ST_DRAFT_REWARDS[Math.min(4,d.wins)];stGrant(rw);stLog('Draft: '+d.wins+' vitórias');c.draft=null;stSave();toast('🎁 '+stRewardText(rw));stTopRefresh();stGo('draft',null,true)};

/* ---------- Amistoso com amigos ---------- */
STV.friends=()=>`<div class="row" style="justify-content:space-between"><h2 class="t">Amistoso com amigos</h2><button class="btn sec sm" data-act="go" data-v="play">‹ Voltar</button></div><p class="st-sub">Escolha um clube na Comunidade e toque em Desafiar.</p><div id="st-commbody" class="st-load"><div class="st-spin"></div></div>`;
STP.friends=STP.comm;
STA.challenge=el=>{
  if(!stReady())return;const p=ST.pubs[stKey(el.dataset.u)];
  if(!p||!p.xi.every(Boolean))return toast('Este técnico ainda não publicou um elenco completo.');
  stStartMatch({mode:'friend',title:'Amistoso contra '+p.user,home:stUserSpec(),away:stSpecFromPub(p),meta:{}});
};
