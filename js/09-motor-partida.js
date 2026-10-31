/* ===================== MOTOR DA PARTIDA ===================== */
const newHs=()=>({goals:0,yc:0,rc:0,subs:0,var:0,pen:0,pauses:0});
const G={fwd:['ST','CF','LW','RW'],mid:['CM','CAM','CDM','LM','RM'],def:['CB','LB','RB','LWB','RWB']};
const POSW={GK:0,CB:.4,LB:.6,RB:.6,LWB:.7,RWB:.7,CDM:.8,CM:1.3,CAM:2.5,LM:2,RM:2,LW:3.2,RW:3.2,CF:4.5,ST:5};
const HW={GK:0,CB:2.4,LB:.4,RB:.4,LWB:.4,RWB:.4,CDM:1,CM:.8,CAM:.6,LM:.5,RM:.5,LW:.7,RW:.7,CF:3,ST:3.2};
const FOULW={GK:.2,CB:3,LB:2.5,RB:2.5,LWB:2.3,RWB:2.3,CDM:3.2,CM:3,CAM:1.5,LM:1.5,RM:1.5,LW:1.2,RW:1.2,CF:1.2,ST:1.2};
const AW={GK:.1,CB:.3,LB:1.6,RB:1.6,LWB:1.8,RWB:1.8,CDM:1,CM:2.2,CAM:3,LM:2.2,RM:2.2,LW:2.6,RW:2.6,CF:1.5,ST:1};
const WING=['LB','RB','LWB','RWB','LW','RW','LM','RM'];
const roleW=lb=>G.fwd.includes(lb)?1:G.mid.includes(lb)?.6:G.def.includes(lb)?.35:.2;
const gkOf=l=>l.on.find(p=>p.pos==='GK');
const bestOf=(l,ps)=>l.on.filter(p=>ps.includes(p.pos)).sort((a,b)=>b.ovr-a.ovr)[0]||l.on.filter(p=>p.pos!=='GK').sort((a,b)=>b.ovr-a.ovr)[0]||null;
const pick=(l,W)=>{const f=l.on.filter(p=>p.pos!=='GK');if(!f.length)return null;const w=f.map(p=>(W[p.pos]??1)*Math.pow(p.ovr/70,2));let r=Math.random()*w.reduce((a,b)=>a+b,0);for(let i=0;i<f.length;i++){r-=w[i];if(r<=0)return f[i]}return f[0]};
const wpick=(arr,wf)=>{const w=arr.map(wf);let r=Math.random()*w.reduce((a,b)=>a+b,0);for(let i=0;i<arr.length;i++){r-=w[i];if(r<=0)return arr[i]}return arr[0]};
const sectorOf=p=>Object.values(G).find(a=>a.includes(p.pos))||[];
/* Atletas com atributos (cartas do StarsTeam: p.sk = [RIT,FIN,PAS,DRI,DEF,FIS]) rendem conforme o setor onde jogam.
   Atletas comuns (sem p.sk) continuam valendo só o OVR. */
const SECT_MIX={fwd:[.25,.35,.1,.2,0,.1],mid:[.15,.05,.35,.25,.15,.05],def:[.1,0,.15,0,.5,.25]};
const rateIn=(p,sec)=>{if(!p.sk)return p.ovr;const w=SECT_MIX[sec];let s=0;for(let i=0;i<6;i++)s+=(p.sk[i]||0)*w[i];return p.ovr*.5+s*.5};
function pw(l,t){
  const avg=(ps,sec)=>{const x=l.on.filter(p=>ps.includes(p.pos));return x.length?x.reduce((s,p)=>s+rateIn(p,sec),0)/x.length:68};
  const cap=l.on.some(p=>p.id===t.captain)?1.5:0,gk=gkOf(l);
  return{fwd:avg(G.fwd,'fwd')+cap,mid:avg(G.mid,'mid')+cap,def:avg(G.def,'def')+cap,gk:(gk?gk.ovr:66)+cap};
}
function lineup(team){
  const inLeague=!!(S&&S.teamIds&&S.teamIds.includes(team.id));
  const roster=players.filter(p=>p.teamId===team.id).map(boost);
  const avail=inLeague?roster.filter(p=>!isSusV(p.id)):roster;
  const used=new Set(),on=[];
  for(let i=0;i<11;i++){const p=avail.find(x=>x.id===(team.tactics||{})['s'+i]);if(p&&!used.has(p.id)){on.push(p);used.add(p.id)}}
  const rest=avail.filter(p=>!used.has(p.id)).sort((a,b)=>b.ovr-a.ovr);
  while(on.length<11&&rest.length)on.push(rest.shift());
  return{on,bench:rest.sort(byPos)};
}
const clock=()=>M.inExtra?`${M.half===1?45:90}+${M.ex}'`:`${M.min}'`;
function paint(){[['home',M.h],['away',M.a]].forEach(([s,t])=>{const e=$('side-'+s);e.style.setProperty('--tc',c1(t));e.style.setProperty('--tc2',c2(t))})}
function initTac(){
  M.tac={home:{atk:(M.h&&M.h.atk)||'eq',def:(M.h&&M.h.def)||'eq'},away:{atk:(M.a&&M.a.atk)||'eq',def:(M.a&&M.a.def)||'eq'}};
  M.tacT={home:-99,away:-99};
  M.st={home:{shots:0,fouls:0,poss:0,on:0,corners:0,yc:0,rc:0,off:0},away:{shots:0,fouls:0,poss:0,on:0,corners:0,yc:0,rc:0,off:0}};
}
function newMatch(){
  const h=teamOf($('sel-home').value),a=teamOf($('sel-away').value),m=$('ctl').value;
  QQ.length=0;playing=false;
  M={status:'idle',timer:null,half:1,min:0,inExtra:false,ex:0,extraTotal:0,h,a,sh:0,sa:0,lh:h?lineup(h):null,la:a?lineup(a):null,subs:{home:5,away:5},pauses:{home:3,away:3},side:null,pen:null,forced:null,gkMode:null,attack:'home',cards:{},hid:{home:new Set(),away:new Set()},dots:{home:[],away:[]},hs:newHs(),ctx:null,bx:50,by:50,gb:{},lcs:{home:-9,away:-9},redCards:[],yelCards:[],open:openness(),etMode:$('et-mode').value,ctl:{home:m==='both'||m==='home',away:m==='both'||m==='away'}};
  initTac();
  $('s-home').textContent=$('s-away').textContent='0';$('m-time').textContent="0'";
  const tg=$('attack');tg.textContent='Aguardando início';tg.style.color=tg.style.background=tg.style.borderColor='';
  $('ball').style.left=$('ball').style.top='50%';
  $('ticker').innerHTML='<div class="tick"><span>📢</span>Aguardando início da partida...</div>';
  if(M.h&&M.a){paint();layoutDots()}
  buildTac();btns();renderRoundBox();renderStats();renderOvr();renderStadium();
}
/* formação “viva”: a CPU pode mudar a função de uma posição durante o jogo */
function curF(s){
  const t=s==='home'?M.h:M.a,base=FORMS[t.formation]||FORMS['4-3-3'];
  M.fm=M.fm||{};
  if(!M.fm[s]||M.fm[s].tid!==t.id||M.fm[s].F.length!==base.length)M.fm[s]={tid:t.id,F:base.map(x=>x.slice()),ch:0};
  return M.fm[s].F;
}
function layoutDots(){
  let h='';M.dots={home:[],away:[]};
  [['home',M.h],['away',M.a]].forEach(([s,t])=>{if(!t)return;
    (FORMS[t.formation]||FORMS['4-3-3']).forEach((_,i)=>{h+=`<i class="dot ${s}" id="d-${s[0]}-${i}" style="--c:${c1(t)};--c2:${c2(t)}">${i+1}</i>`});
  });
  $('dots').innerHTML=h;moveDots(50,50);
}
function moveDots(bx,by){
  if(!M||!$('dots'))return;
  const rest=M.min<1&&M.half===1&&!M.et;
  ['home','away'].forEach(s=>{
    const t=s==='home'?M.h:M.a;if(!t)return;
    const F=curF(s),att=M.attack===s,pb=s==='home'?bx/100:1-bx/100;
    const mapX=dE=>s==='home'?4+dE*88:96-dE*88;
    let chaser=-1,best=1e9;
    if(!rest)F.forEach(([lb,lat,y],i)=>{
      if(i===0||M.hid[s].has(i))return;
      const dd=Math.hypot(mapX((88-y)/74)-bx,lat-by);
      if(dd<best){best=dd;chaser=i}
    });
    F.forEach(([lb,lat,y],i)=>{
      const el=$(`d-${s[0]}-${i}`);if(!el)return;
      el.style.display=M.hid[s].has(i)?'none':'';
      const d0=(88-y)/74;
      if(lb==='GK'){el.style.left=(s==='home'?4:96)+'%';el.style.top=Math.max(38,Math.min(62,lat+(by-lat)*.15))+'%';return}
      if(rest){el.style.left=mapX(d0*.5)+'%';el.style.top=lat+'%';return}
      const role=roleW(lb);
      const push=att?role*(.08+.3*pb):-role*(.1+.14*(1-pb));
      const dE=Math.max(0,Math.min(1,d0+push));
      let px=mapX(dE),py=lat+(by-lat)*(.15+.25*role);
      if(i===chaser){px+=(bx-px)*.55;py+=(by-py)*.55}
      px+=rnd(-1.2,1.2);py+=rnd(-2,2);
      el.style.left=Math.max(3,Math.min(97,px))+'%';el.style.top=Math.max(6,Math.min(94,py))+'%';
    });
  });
}
function onTeamChange(){
  if(M&&M.ctx)return;
  const h=teamOf($('sel-home').value),a=teamOf($('sel-away').value);
  $('logo-home').src=h?h.logo:PH;$('logo-away').src=a?a.logo:PH;
  $('logo-home').onerror=$('logo-away').onerror=function(){this.src=PH};
  if(M&&M.timer)stopTimer();
  newMatch();
}
function btns(){
  const b=$('btn-main'),s=M.status;
  b.disabled=s!=='idle'&&s!=='paused'&&s!=='break'&&s!=='finished';
  b.textContent=s==='idle'?'▶ Iniciar partida':s==='paused'?'▶ Continuar':s==='break'?`▶ Iniciar ${M.half}º tempo`:s==='finished'?'🔄 Nova partida':'⏳ Em andamento';
  const hb=$('btn-hold');hb.disabled=s!=='running'&&s!=='hold';hb.textContent=s==='hold'?'▶ Retomar jogo':'⏸ Pausar jogo';
  ['home','away'].forEach(k=>{
    $('pause-'+k).disabled=s!=='running'||M.pauses[k]<=0||M.subs[k]<=0||!M.ctl[k];
    $('sub-'+k).disabled=(s!=='paused'&&s!=='break')||M.subs[k]<=0||!M.ctl[k];
    $(k+'-p').textContent=M.pauses[k];$(k+'-s').textContent=M.subs[k];
  });
  renderMBoard();
}
function stopTimer(){clearInterval(M.timer);M.timer=null}
function resumeClock(){stopTimer();M.status='running';M.timer=setInterval(step,+$('speed').value);btns()}
function lockSel(b){['sel-home','sel-away','lg-home','lg-away','ctl','et-mode'].forEach(i=>$(i).disabled=b)}
function startOrResume(){
  if(!M.h||!M.a)return toast('Cadastre e selecione os dois times para iniciar.');
  if(M.status==='finished')newMatch();
  if(M.status==='idle')tick(`🏁 Apita o árbitro! ${M.h.name} x ${M.a.name}`);
  else if(M.status==='break'){M.hs=newHs();tick('▶ Começa o 2º tempo!')}
  else if(M.status!=='paused')return;
  resumeClock();
}
function changeSpeed(){if(M&&M.status==='running')resumeClock()}
function etChg(v){
  if(M&&(M.status==='idle'||M.status==='finished')){M.etMode=v;return}
  toast('Escolha a opção de empate antes de iniciar a partida.');$('et-mode').value=M.etMode||'none';
}
function pauseBy(side){
  if(M.status!=='running')return;
  if(M.subs[side]<=0)return toast('Substituições esgotadas: não há mais paradas técnicas.');
  if(M.pauses[side]<=0)return toast('Limite de 3 paradas técnicas esgotado.');
  M.pauses[side]--;M.hs.pauses++;stopTimer();M.status='paused';
  tick(`⏱ Parada técnica pedida pelo ${side==='home'?M.h.name:M.a.name}`);btns();
}
function toggleHold(){
  if(M.status==='running'){stopTimer();M.status='hold';$('attack').textContent='⏸ JOGO PAUSADO';tick('⏸ Jogo pausado pelo técnico')}
  else if(M.status==='hold'){resumeClock();tick('▶ Jogo retomado')}
  btns();
}
function tick(text){
  if(M&&M.st&&M.lastSh&&/defende!/.test(text))M.st[M.lastSh].on++;
  if(M&&M.st&&/Escanteio cobrado/.test(text))M.st[M.attack].corners++;
  $('ticker').insertAdjacentHTML('afterbegin',`<div class="tick"><span>⏱️</span><div>${esc(text)}</div></div>`);
}

/* ---- Anúncios estilo transmissão (fila: o relógio fica parado) ---- */
function Q(item){item.m=M;QQ.push(item);if(!playing)playNext()}
function playNext(){
  const it=QQ.shift();if(!it){playing=false;return}
  playing=true;
  if(it.m!==M){playNext();return}
  const prev=M.status;
  stopTimer();M.status='event';btns();it.show();
  setTimeout(()=>{
    it.hide();if(it.m===M&&it.after)it.after();
    if(QQ.length)playNext();else{playing=false;if(it.m===M&&M.status==='event'){if(it.keep){M.status=prev;btns()}else resumeClock()}}
  },it.ms);
}
const cellH=(t,hit,left)=>`<div class="${hit?'hit':''}" style="background:${c1(t)};color:${c2(t)}">${left?`<img src="${esc(t.logo)}" alt="">${esc(t.code)}`:`${esc(t.code)}<img src="${esc(t.logo)}" alt="">`}</div>`;
const sbHtml=hit=>`<div class="gscore">${cellH(M.h,hit==='home',true)}<div class="sc">${M.sh} - ${M.sa}</div>${cellH(M.a,hit==='away',false)}</div>`;
function banner(c){
  const ms=c.ms||2200;
  return{ms,after:c.after,keep:c.keep,hide(){$('bn-ov').classList.remove('on','tw','og')},show(){
    const t=c.team,bn=$('bn');
    bn.className='bn '+(c.side==='away'?'r':'l');bn.style.setProperty('--d',ms+'ms');
    bn.style.setProperty('--tc',c.neutral?'#10151c':c1(t));bn.style.setProperty('--tc2',c.neutral?'#fff':c2(t));
    const face=ph=>`<div class="face sm"><img src="${esc(ph||PH)}" onerror="this.src='${PH}'" alt=""></div>`;
    $('bn-in').innerHTML=`<div class="bn-word ${c.cls||''}">${esc(c.word)}</div><div class="bn-info">${c.card?`<div class="c3 ${c.card}" style="width:60px;height:84px"></div>`:''}${c.pair?`<div class="pair">${c.pair.map(p=>`<div class="pp ${p.cls}">${face(p.photo)}<small>${p.label}</small><b>${esc(p.name)}</b></div>`).join('<span class="arr">➜</span>')}</div>`:''}${c.photo?face(c.photo):''}<div class="gname"><small>${esc(c.sub||'')}</small>${esc(c.name||'')}${c.extra?`<small style="margin-top:.3rem">${esc(c.extra)}</small>`:''}</div></div>${c.score?sbHtml(c.hit):''}`;
    const ov=$('bn-ov');ov.classList.add('on');
    if(c.name&&twNames().has(c.name)){
      ov.classList.add('tw');
      if(c.word==='GOOOL'){const info=ov.querySelector('.bn-info');if(info&&!info.querySelector('.twscr'))info.insertAdjacentHTML('beforeend','<div class="twscr"><span>Jogador</span><span>da Semana</span></div>')}
    }
  }};
}
function htShow(p,team,gold){
  let ov=$('htov');
  if(!ov){document.body.insertAdjacentHTML('beforeend','<div id="htov"></div>');ov=$('htov')}
  const balls=Array.from({length:24},(_,i)=>`<i class="htb" style="--x0:${Math.round(rnd(-44,44))}vw;--y0:${Math.round(rnd(20,60))}vh;--d:${(i*.09).toFixed(2)}s"></i>`).join('');
  ov.innerHTML=`<div class="htnet">${balls}</div><div class="htt ${gold?'g':''}">HAT-TRICK!</div><div class="htn">${esc(p.name)} • ${esc(team.name)}</div>`;
  ov.classList.add('on');
}
function htHide(){const ov=$('htov');if(ov)ov.classList.remove('on')}
function goalItem(side,p,pen,varOk,as,how){
  const team=side==='home'?M.h:M.a,name=p?p.name:'Craque do time';
  const b=banner({word:'GOOOL',team,side,photo:p&&p.photo?p.photo:PH,name,sub:`${team.name.toUpperCase()} • ${clock()}${pen?' • PÊNALTI':''}${varOk?' • VAR: GOL VÁLIDO':''}`,extra:as?`🅰 Assistência: ${as.name}${how?' ('+how+')':''}`:'',score:1,hit:side,ms:3600});
  const show=b.show,hide=b.hide;
  b.show=function(){
    if(side==='home'){M.sh++;$('s-home').textContent=M.sh}else{M.sa++;$('s-away').textContent=M.sa}
    M.hs.goals++;M.st[side].on++;
    show();renderRoundBox();
    tick(`⚽ GOL${pen?' (pênalti)':''} do ${team.name.toUpperCase()}! ${name} (${clock()})${as?` — assistência de ${as.name}${how?' ('+how+')':''}`:''}`);
    if(p){
      M.gb[p.id]=(M.gb[p.id]||0)+1;
      if(M.gb[p.id]===3){const gold=isTotw(p.id);Q({ms:4200,show(){htShow(p,team,gold)},hide(){htHide()}})}
    }
  };
  b.hide=function(){hide();setBall(50,50)};
  return b;
}
function ownGoalItem(sd,d){
  const dside=sd==='home'?'away':'home';
  const defT=dside==='home'?M.h:M.a,attT=sd==='home'?M.h:M.a,m=M;
  return{ms:4600,
    show(){
      if(sd==='home'){M.sh++;$('s-home').textContent=M.sh}else{M.sa++;$('s-away').textContent=M.sa}
      M.hs.goals++;M.st[sd].on++;renderRoundBox();
      tick(`😱 GOL CONTRA! ${d.name} (${defT.name}) marca contra o próprio gol (${clock()})`);
      const b=banner({word:'GOOOL',team:defT,side:dside,photo:d.photo||PH,name:d.name,sub:`${defT.name.toUpperCase()} • ${clock()}`,score:1,hit:sd,ms:4600});
      b.show();
      setTimeout(()=>{
        if(M!==m)return;
        const bn=$('bn');bn.style.setProperty('--tc',c1(attT));bn.style.setProperty('--tc2',c2(attT));
        const w=$('bn-in').querySelector('.bn-word');if(w)w.innerHTML='<span class="mir">LOOOG</span>';
        $('bn-ov').classList.add('og');
      },1200);
      setTimeout(()=>{
        if(M!==m)return;
        const g=$('bn-in').querySelector('.gname');
        if(g)g.innerHTML=`<small>GOL CONTRA</small>${esc(d.name)} (${esc(defT.name)}) contra o próprio gol`;
      },2400);
    },
    hide(){$('bn-ov').classList.remove('on','og');setBall(50,50)}
  };
}

/* ---- Bola, lesões, faltas, cartões, assistências, trocas ---- */
const setBall=(x,y)=>{$('ball').style.left=x+'%';$('ball').style.top=y+'%';if(M){M.bx=x;M.by=y}};
function ballSeq(pts,st){pts.forEach(([x,y],i)=>setTimeout(()=>{if(M){setBall(x,y);if(i===pts.length-2)moveDots(x,y)}},i*st))}
function netHit(sd){const e=$('g3d-'+(sd==='home'?'r':'l'));e.classList.remove('wave');void e.offsetWidth;e.classList.add('wave');setTimeout(()=>e.classList.remove('wave'),1100)}
function playBall(pts,sd,goal){
  if(goal){const ex=sd==='home'?103:-3;pts=[...pts,[ex,50]]}
  const st=380;Q({ms:pts.length*st+500,show(){ballSeq(pts,st);if(goal)setTimeout(()=>netHit(sd),(pts.length-1)*st)},hide(){}});
}
function pickAssist(l,sh){
  if(Math.random()<.27)return null;
  const f=l.on.filter(p=>p!==sh&&p.pos!=='GK');if(!f.length)return null;
  const w=f.map(p=>(AW[p.pos]??1)*Math.pow(p.ovr/70,2));let r=Math.random()*w.reduce((a,b)=>a+b,0);
  for(let i=0;i<f.length;i++){r-=w[i];if(r<=0)return f[i]}return f[0];
}
function assistHow(a,sh,atkS){
  if(!a)return'';const x=Math.random();
  if(atkS===ATK.counter&&x<.4)return'contra-ataque em velocidade';
  if(WING.includes(a.pos))return x<.55&&sh&&['ST','CF','CB','CAM'].includes(sh.pos)?'cruzamento':x<.8?'passe rasteiro da linha de fundo':'passe em diagonal';
  if(['CAM','CM','LM','RM'].includes(a.pos))return x<.55?'passe em profundidade':x<.8?'tabela':'passe açucarado';
  return x<.6?'lançamento':'passe longo';
}
function pathFor(kind,home,as,shx,shy){
  if(kind==='corner')return[[home?97:3,Math.random()<.5?5:95],[shx,shy]];
  if(kind==='fk')return[[home?72:28,rnd(30,70)],[shx,shy]];
  const wing=as&&WING.includes(as.pos);
  const from=wing?[home?rnd(62,80):rnd(20,38),Math.random()<.5?6:94]:[home?rnd(50,66):rnd(34,50),rnd(30,70)];
  return[[home?35:65,rnd(30,70)],from,[shx,shy]];
}
function removeFromPitch(side,p){
  const l=side==='home'?M.lh:M.la,i=l.on.indexOf(p);if(i<0)return;
  l.on.splice(i,1);
  const vis=[...Array(11).keys()].filter(j=>!M.hid[side].has(j));M.hid[side].add(vis[Math.min(i,vis.length-1)]);
}
/* cartão: base */
function baseCard(p,side,why,forceRed){
  const l=side==='home'?M.lh:M.la,team=side==='home'?M.h:M.a;
  if(l.on.indexOf(p)<0)return;
  const had=M.cards[p.id]||0;
  if(had>=1&&!forceRed&&Math.random()<.5){tick(`🗣️ O árbitro conversa com ${p.name} e evita o segundo amarelo. (${clock()})`);return}
  const red=forceRed||had>=1;
  M.cards[p.id]=had+1;
  const sub=`${team.name.toUpperCase()} • ${clock()}`;
  if(red){
    M.hs.rc++;removeFromPitch(side,p);
    Q(banner({word:had&&!forceRed?'2º AMARELO':'VERMELHO',card:'red',team,side,name:p.name,sub:sub+' • EXPULSO',extra:why,photo:p.photo||PH,ms:2500}));
    tick(`🟥 ${had&&!forceRed?'Segundo amarelo e expulsão':'Cartão vermelho'} para ${p.name} (${team.name}) — ${why}! (${clock()})`);
  }else{
    M.hs.yc++;
    Q(banner({word:'AMARELO',card:'yellow',team,side,name:p.name,sub,extra:why,photo:p.photo||PH,ms:2200}));
    tick(`🟨 Cartão amarelo para ${p.name} (${team.name}) — ${why}. (${clock()})`);
  }
}
/* cartão: VAR em expulsões, contagem de estatísticas e goleiro expulso */
function cardCore(p,side,why,forceRed){
  if(!forceRed&&(M.cards[p.id]||0)>=1&&Math.random()<.5){tick(`🗣️ O árbitro conversa com ${p.name} e segura o segundo amarelo. (${clock()})`);return}
  const r0=M.hs.rc,y0=M.hs.yc;
  let done=false;
  if(forceRed&&Math.random()<.4){
    const team=side==='home'?M.h:M.a;M.hs.var++;
    tick(`📺 VAR revisa a expulsão de ${p.name} (${team.name})... (${clock()})`);
    Q(banner({word:'VAR',neutral:1,cls:'var',sub:`Revisando a expulsão de ${p.name}`,ms:2600}));
    if(Math.random()<.3){
      tick(`❌ VAR ANULA a expulsão de ${p.name}! (${clock()})`);
      Q(banner({word:'EXPULSÃO ANULADA',neutral:1,cls:'annul',sub:`${p.name} segue em campo`,ms:2300}));
      if((M.cards[p.id]||0)===0&&Math.random()<.6)baseCard(p,side,why,false);
      done=true;
    }else Q(banner({word:'EXPULSÃO MANTIDA',neutral:1,sub:'Decisão confirmada pelo VAR',ms:1700}));
  }
  if(!done)baseCard(p,side,why,forceRed);
  if(M.hs.yc>y0)M.st[side].yc++;
  if(M.hs.rc>r0){M.st[side].rc++;if(p.pos==='GK')Q({ms:50,hide(){},show(){gkChoice(side)}})}
}
function giveCardTo(p,side,why,forceRed){
  if(!forceRed&&Math.random()<.35){tick(`🟡 Falta de ${p.name} sem cartão. (${clock()})`);return}
  const r0=M.hs.rc,y0=M.hs.yc;
  cardCore(p,side,why,forceRed);
  if(M.hs.rc>r0)M.redCards.push(p.id);
  if(M.hs.yc>y0)M.yelCards.push(p.id);
}
function foul(c){
  if(Math.random()<.22)return;
  M.st[c.home?'away':'home'].fouls++;
  const dside=c.home?'away':'home',aside=c.home?'home':'away';
  const f=pick(c.def,FOULW),v=pick(c.atk,POSW)||c.atk.on[0];if(!f||!v)return;
  const s=Math.random();let kind='normal',inj=.004;
  if(s>.996){kind='violent';inj=.5}else if(s>.95){kind='tactical';inj=.015}else if(s>.82){kind='reckless';inj=.03}
  tick(`🚩 ${kind==='violent'?'Entrada violenta':kind==='tactical'?'Falta tática':'Falta'} de ${f.name} (${c.defT.name}) em ${v.name}. (${clock()})`);
  if(kind==='violent')giveCardTo(f,dside,'Entrada violenta',Math.random()<.55);
  else if(kind==='tactical'){if(Math.random()<.6)giveCardTo(f,dside,'Falta tática para cortar o contra-ataque')}
  else if(kind==='reckless'&&Math.random()<.7)giveCardTo(f,dside,'Falta imprudente');
  if(Math.random()<inj)injure(aside,v);
}
function cpuPick(l,out){
  const g=sectorOf(out);
  const pool=l.bench.filter(p=>out.pos==='GK'?p.pos==='GK':g.includes(p.pos));
  return pool.length?wpick(pool,p=>Math.pow(p.ovr/70,3)+.3):null;
}
/* ---------- Substituições da CPU: leem o jogo (placar, minuto, cartões, cansaço) ---------- */
const DEPTH={GK:0,CB:1,LB:1.3,RB:1.3,LWB:1.9,RWB:1.9,CDM:2,CM:3,LM:3.2,RM:3.2,CAM:4,LW:4.6,RW:4.6,CF:5,ST:5};
const SIDEOF=p=>/^L/.test(p)?'L':/^R/.test(p)?'R':'C';
function cpuPers(side){
  M.cp=M.cp||{};
  if(!M.cp[side])M.cp[side]={risk:rnd(.15,.95),fresh:rnd(.6,1.4),early:rnd(0,1)};
  return M.cp[side];
}
function cpuSituation(side){
  const my=side==='home'?M.sh:M.sa,th=side==='home'?M.sa:M.sh,lead=my-th,min=M.min;
  const l=side==='home'?M.lh:M.la,ol=side==='home'?M.la:M.lh,men=l.on.length-ol.on.length;
  if(men<0&&min>=30)return 'cover';
  if(lead>0&&min>=58)return 'protect';
  if(lead<0&&min>=48)return 'chase';
  if(lead===0&&min>=70&&Math.random()<.55)return 'push';
  return 'fresh';
}
function cpuPairW(mode,out,inn,P){
  const d0=DEPTH[out.pos]??3,d1=DEPTH[inn.pos]??3,dd=d1-d0;
  let w=1;
  if(mode==='protect'){            // atacante → meia mais recuado, ponta → lateral/marcador, meia → volante
    w=dd<=-.4?(dd>=-2.4?3.2:1.6):(dd>-.4&&dd<.4?.9:.12);
    if(out.pos==='ST'||out.pos==='CF'||out.pos==='LW'||out.pos==='RW'||out.pos==='CAM')w*=1.8;
  }else if(mode==='chase'){        // volante/zagueiro/lateral → mais ofensivo
    w=dd>=.4?(dd<=2.6?3.2:2.2*P.risk+.4):(dd>-.4?.9:.1);
    if(out.pos==='CDM'||out.pos==='CM'||out.pos==='LB'||out.pos==='RB'||out.pos==='LWB'||out.pos==='RWB')w*=1.6;
    if(out.pos==='CB')w*=(M.min>=75?(.6+P.risk):.25);
  }else if(mode==='cover'){        // time com um a menos: fecha a casa
    w=dd<=-.4?3:dd<.4?1:.2;
    if(DEPTH[out.pos]>=4)w*=1.8;
  }else if(mode==='push'){
    w=dd>=.4?2.6:dd>-.4?1.2:.3;
  }else{                            // troca de rotina: mesma função (ou muito próxima)
    w=Math.abs(dd)<.4?3:Math.abs(dd)<1.3?1.6:.35;
  }
  if(SIDEOF(out.pos)===SIDEOF(inn.pos))w*=1.5;else if(SIDEOF(out.pos)!=='C'&&SIDEOF(inn.pos)!=='C')w*=.5;
  return w*Math.pow(inn.ovr/70,2);
}
function cpuMaybeSub(side){
  if(M.ctl[side]||M.subs[side]<=0||M.inExtra||M.et||M.min<46)return;
  if(M.min-M.lcs[side]<4)return;
  const P=cpuPers(side),st=M.st[side],mode=cpuSituation(side);
  const used=5-M.subs[side],fat=Math.max(0,M.min-50)/40;
  let chance=(M.min<56?.012:M.min<66?.04:M.min<78?.07:.06)*(.6+P.fresh*.5);
  if(mode==='chase'||mode==='protect'||mode==='cover')chance*=1.5;
  if(st.rc>0)chance+=.05;
  if(used===0&&M.min>=68)chance+=.05;       // ainda não mexeu: hora de mexer
  if(M.min>=84&&used>=3)chance*=.5;
  chance*=.55+M.subs[side]/6;
  if(Math.random()>chance)return;
  const l=side==='home'?M.lh:M.la,team=side==='home'?M.h:M.a;
  M.inAt=M.inAt||{};
  const outs=l.on.filter(p=>p.pos!=='GK'&&!(p.id in M.inAt&&M.min-M.inAt[p.id]<40));
  const ins=l.bench.filter(p=>p.pos!=='GK');
  if(!outs.length||!ins.length)return;
  const cnt=(arr,pos)=>arr.filter(x=>pos.includes(x.pos)).length;
  const cands=[];
  outs.forEach(o=>{
    const ow=.5+fat*1.2*P.fresh+Math.max(0,(80-o.ovr)/35)+(M.cards[o.id]?.7:0)+rnd(0,.7);
    ins.forEach(i=>{
      const after=l.on.map(x=>x===o?i:x);
      if(cnt(after,G.def)<(mode==='chase'&&M.min>=80?2:3)&&cnt(after,G.def)<cnt(l.on,G.def))return;
      if(cnt(after,G.fwd)<1&&mode!=='cover')return;
      cands.push({o,i,w:ow*cpuPairW(mode,o,i,P)});
    });
  });
  if(!cands.length)return;
  const c=wpick(cands,x=>x.w),out=c.o,inn=c.i;
  const why={protect:'para proteger o resultado',chase:'em busca do gol',cover:'para se ajustar com um a menos',push:'para tentar a vitória',fresh:'por desgaste físico'}[mode];
  M.lcs[side]=M.min;
  // a posição em campo muda de função quando o reserva é de outro setor (ex.: atacante sai, meia entra)
  if(DEPTH[out.pos]!==DEPTH[inn.pos]||SIDEOF(out.pos)!==SIDEOF(inn.pos)){
    const F=curF(side),vis=[...Array(11).keys()].filter(j=>!M.hid[side].has(j));let slot=vis.find(j=>F[j][0]===out.pos);
    if(slot==null)slot=vis[Math.min(l.on.indexOf(out),vis.length-1)];
    if(slot!=null&&F[slot]&&F[slot][0]!=='GK'){
      const sect=G.fwd.includes(inn.pos)?'fwd':G.mid.includes(inn.pos)?'mid':'def';
      const same=F.filter((f,j)=>j!==slot&&f[0]!=='GK'&&G[sect].includes(f[0])&&!M.hid[side].has(j));
      const y=same.length?Math.round(same.reduce((a,f)=>a+f[2],0)/same.length):{fwd:14,mid:39,def:63}[sect];
      const lat=SIDEOF(inn.pos)==='L'?Math.min(F[slot][1],24):SIDEOF(inn.pos)==='R'?Math.max(F[slot][1],76):(SIDEOF(F[slot][0])==='C'?F[slot][1]:50);
      F[slot]=[inn.pos,lat,y];
    }
  }
  tick(`🔁 ${team.name} mexe ${why}: ${out.pos} ${out.name} dá lugar a ${inn.pos} ${inn.name} (${clock()})`);
  swapPlayer(side,out,inn,false);
}
function swapPlayer(side,out,inn,keep){
  const l=side==='home'?M.lh:M.la,team=side==='home'?M.h:M.a;
  const oi=l.on.indexOf(out);if(oi<0)return;
  l.on[oi]=inn;const bi=l.bench.indexOf(inn);if(bi>=0)l.bench.splice(bi,1);
  (M.inAt=M.inAt||{})[inn.id]=M.min;(M.outAt=M.outAt||{})[out.id]=M.min;
  M.subs[side]--;M.hs.subs++;
  tick(`🔄 ${team.name}: sai ${out.name}, entra ${inn.name} (${clock()})`);
  Q(banner({word:'SUBSTITUIÇÃO',team,side,pair:[{photo:out.photo,name:out.name,label:'SAI',cls:'out'},{photo:inn.photo,name:inn.name,label:'ENTRA',cls:'in'}],sub:`${team.name.toUpperCase()} • ${clock()}`,ms:2500,keep}));
}
function injure(side,p){
  const l=side==='home'?M.lh:M.la,team=side==='home'?M.h:M.a;
  if(!l.on.includes(p)||l.on.length<=7)return;
  tick(`🚑 ${p.name} (${team.name}) se machucou e não tem condições de continuar. (${clock()})`);
  Q(banner({word:'LESÃO',neutral:1,cls:'annul',sub:`${team.name.toUpperCase()} • ${clock()}`,name:p.name,photo:p.photo||PH,ms:2300,after(){
    if(M.ctl[side]&&M.subs[side]>0&&l.bench.length){M.status='injury';btns();openSub(side,p)}
    else{const inn=M.subs[side]>0?cpuPick(l,p):null;if(inn)swapPlayer(side,p,inn,false);else{removeFromPitch(side,p);tick(`${team.name} segue com um a menos (sem substituições).`)}}
  }}));
}
function pickOutfieldForGK(l){
  return [...l.on].filter(p=>p.pos!=='GK').sort((a,b)=>(G.def.includes(a.pos)?0:1)-(G.def.includes(b.pos)?0:1)||a.ovr-b.ovr)[0]||null;
}
function gkSet(side,p){
  if(!p)return;
  const l=side==='home'?M.lh:M.la,t=side==='home'?M.h:M.a,i=l.on.indexOf(p);
  if(i>=0)l.on[i]={...p,pos:'GK',_gk:1};
  tick(`🧤 ${p.name} vai para o gol (${clock()})`);
  Q(banner({word:'NOVO GOLEIRO',neutral:1,sub:`${t.name.toUpperCase()} • ${clock()}`,name:p.name,photo:p.photo||PH,ms:2200}));
}
function gkChoice(side){
  const l=side==='home'?M.lh:M.la;
  const gks=l.bench.filter(p=>p.pos==='GK');
  if(!M.ctl[side]){
    const out=pickOutfieldForGK(l);
    if(gks.length&&M.subs[side]>0&&out)swapPlayer(side,out,gks[0],false);
    else gkSet(side,out);
    return;
  }
  M.status='injury';btns();
  M.gkMode=gks.length&&M.subs[side]>0?'sub':'pick';
  openSub(side);
}
function flow(){
  const s=M.hs,i=s.goals*2+s.yc+s.rc*3+s.var*2+s.pen*2;
  return i>=9?{txt:'Jogo muito pegado e quente',hot:1}:i>=5?{txt:'Jogo movimentado e faltoso',hot:1}:i>=2?{txt:'Jogo equilibrado'}:{txt:'Jogo tranquilo'};
}
function calcExtra(){
  const s=M.hs;let e=1+Math.round(s.goals*.7+s.yc*.5+s.rc*1.5+s.subs*.4+s.var*1.5+s.pen*.8+s.pauses*.3+rnd(0,1.5));
  if(M.half===2)e+=1;
  return Math.min(15,Math.max(1,e));
}
const needET=()=>M.ctx?!!(S&&S.phase==='ko'&&(S.tb||SM.tb)==='et_pen'):(M.etMode==='et'||M.etMode==='et_pen');
function finishFT(){
  const m=M;m.status='finished';
  log(`Partida finalizada: ${m.h.name} ${m.sh} x ${m.sa} ${m.a.name}${m.et?' (após prorrogação)':''}`,'match');
  const ko=!!(m.ctx&&S&&S.phase==='ko');
  if(m.sh===m.sa&&(ko||m.etPen)){
    openPK({mode:'shootout',title:'🥅 DISPUTA DE PÊNALTIS',teams:{home:m.h,away:m.a},ls:{home:m.lh,away:m.la},ctl:m.ctl,cb(r){
      if(m.ctx)recordResult(m,r);else log(`Pênaltis: ${m.h.name} ${r.h} x ${r.a} ${m.a.name}`);
      lockSel(false);btns();
    }});
  }else{
    if(m.ctx)recordResult(m);
    lockSel(false);
  }
  btns();
}
function endHalf(){
  const m=M;
  if(m.et){
    if(m.etHalf===1){
      tick(`⏱ Fim do 1º tempo da prorrogação: ${m.h.name} ${m.sh} x ${m.sa} ${m.a.name}`);
      Q(banner({word:'FIM DO 1º TEMPO',neutral:1,sub:'Prorrogação',score:1,ms:2800,after(){m.etHalf=2;m.etLimit=120;m.min=105;m.inExtra=false;m.ex=0;btns()}}));
    }else{
      tick(`🏁 Fim da prorrogação: ${m.h.name} ${m.sh} x ${m.sa} ${m.a.name}`);
      Q(banner({word:'FIM DE JOGO',neutral:1,sub:'Após a prorrogação',score:1,ms:3400,after(){finishFT()}}));
    }
    return;
  }
  if(m.half===1){
    tick(`⏱ Fim do 1º tempo: ${m.h.name} ${m.sh} x ${m.sa} ${m.a.name}`);
    Q(banner({word:'INTERVALO',neutral:1,sub:'Fim do 1º tempo',score:1,ms:3200,after(){m.status='break';m.half=2;m.min=45;m.inExtra=false;m.ex=0;btns()}}));
    return;
  }
  tick(`🏁 Fim do tempo normal: ${m.h.name} ${m.sh} x ${m.sa} ${m.a.name}`);
  if(m.sh===m.sa&&needET()){
    m.etPen=!!m.ctx||m.etMode==='et_pen';
    tick('⏱ Empate: vai para a prorrogação!');
    Q(banner({word:'PRORROGAÇÃO',neutral:1,cls:'extra',sub:'30 minutos de jogo extra',ms:2600,after(){m.et=true;m.etHalf=1;m.etLimit=105;m.inExtra=false;m.ex=0;m.min=90}}));
    return;
  }
  Q(banner({word:'FIM DE JOGO',neutral:1,sub:'Apito final',score:1,ms:3400,after(){finishFT()}}));
}
const fatigue=side=>{const used=Math.min(1,(5-M.subs[side])/3),k=(DEF[M.tac[side].def]||DEF.eq).fat||1;return 1-Math.max(0,M.min-55)*.0012*(1-.5*used)*k};
function step(){
  if(M.inExtra)M.ex++;else M.min++;
  $('m-time').textContent=clock();
  if(!M.et){
    const base=M.half===1?45:90;
    if(!M.inExtra&&M.min>=base){
      M.extraTotal=calcExtra();M.inExtra=true;M.ex=0;
      const f=flow();
      tick(`🔔 Acréscimos: ${M.extraTotal} minuto(s). ${f.txt}.`);
      Q(banner({word:'+'+M.extraTotal,neutral:1,cls:'extra',sub:`${f.txt} • ${M.extraTotal} min de acréscimo`,ms:2600}));
    }else if(M.inExtra&&M.ex>M.extraTotal){endHalf();btns();return}
  }else if(M.min>=M.etLimit){endHalf();btns();return}
  const A=pw(M.lh,M.h),B=pw(M.la,M.a),fa=fatigue('home'),fb=fatigue('away');
  ['fwd','mid','def'].forEach(k=>{A[k]*=fa;B[k]*=fb});
  const ah=ATK[M.tac.home.atk]||ATK.eq,aa=ATK[M.tac.away.atk]||ATK.eq,dh=DEF[M.tac.home.def]||DEF.eq,da=DEF[M.tac.away.def]||DEF.eq;
  const men=M.lh.on.length-M.la.on.length,ha=.02+Math.min(.02,(M.h.fans||0)/4e6);
  const ph=Math.min(.8,Math.max(.2,.5+(A.mid-B.mid)/110+ha+ah.poss+dh.poss-aa.poss-da.poss+men*.035));
  const home=Math.random()<ph;M.attack=home?'home':'away';M.st[M.attack].poss++;
  const mAtk=home?men:-men;
  const c={home,atkT:home?M.h:M.a,defT:home?M.a:M.h,atkS:home?ah:aa,defS:home?da:dh,P:home?A:B,D:home?B:A,atk:home?M.lh:M.la,def:home?M.la:M.lh};
  const tg=$('attack');tg.textContent='ATAQUE: '+c.atkT.name.toUpperCase();tg.style.color=c2(c.atkT);tg.style.background=c1(c.atkT);tg.style.borderColor=c2(c.atkT);
  setBall(home?rnd(50,92):rnd(8,50),rnd(12,88));
  const trail=(home?M.sa-M.sh:M.sh-M.sa)>0&&M.min>70?1.25:1;
  c.pow=.55*c.P.fwd+.45*c.P.mid+mAtk*2.5;c.dpow=.5*c.D.def+.2*c.D.mid+.3*c.D.gk-mAtk*2.5;
  const pressM=mAtk<0?.5:mAtk>0?1.35:1;
  const shotP=Math.min(.4,.13*c.atkS.shots*Math.pow(c.pow/c.dpow,1.4)*c.defS.opp*trail*pressM);
  let pen=false;
  if(Math.random()<shotP){if(chance(c)==='pen')pen=true}
  moveDots(M.bx,M.by);
  if(pen){tacTick();renderStats();btns();return}
  if(Math.random()<.26*c.defS.foul)foul(c);
  if(Math.random()<.0015){const side=Math.random()<.5?'home':'away',p=pick(side==='home'?M.lh:M.la,FOULW);if(p)injure(side,p)}
  ['home','away'].forEach(s=>cpuMaybeSub(s));
  if(M.min%3===0)cpuTac();
  tacTick();renderStats();btns();
}
/* lance: camada externa (clima do jogo) → filtros → núcleo */
function chance(c){
  const op=M.open||1;
  if(Math.random()>op*.88)return;
  let r=chance1(c);
  if(op>1.15&&Math.random()<Math.min(.85,(op-1)*.7)){const r2=chance1(c);if(r2==='pen')r='pen'}
  return r;
}
function chance1(c){
  if(Math.random()<.12)return;
  if(Math.random()<.015){
    const sd=c.home?'home':'away',d=pick(c.def,FOULW);
    if(d){M.lastSh=sd;Q(ownGoalItem(sd,d));return}
  }
  const sd=c.home?'home':'away';M.lastSh=sd;
  if(Math.random()<.05){
    M.st[sd].off++;
    const w=c.atk.on.filter(p=>p.pos!=='GK')[0];
    tick(`🚩 Impedimento marcado contra ${w?w.name:'o atacante'} (${clock()})`);
    return;
  }
  M.st[sd].shots++;
  return chanceCore(c);
}
function chanceCore(c){
  const home=c.home,sd=home?'home':'away',r=Math.random();
  const gx=home?98.3:1.7,shx=home?rnd(80,89):rnd(11,20),shy=rnd(35,65);
  if(r<.03){
    M.hs.pen++;tick(`🚨 PÊNALTI para o ${c.atkT.name}! (${clock()})`);setBall(home?83:17,50);
    Q(banner({word:'PÊNALTI',team:c.atkT,side:sd,sub:`${c.atkT.name.toUpperCase()} • ${clock()}`,ms:1900,after(){M.pen=sd;M.status='pen';btns();matchPenalty(sd)}}));
    return'pen';
  }
  const gk=gkOf(c.def),gq=gk?gk.ovr:70;
  let sh,as=null,base=.2,pre='',kind='open';
  if(r<.15){kind='corner';as=c.atk.on.find(p=>p.id===c.atkT.corner)||bestOf(c.atk,['CAM','CM','LM','RM','LW','RW']);sh=pick(c.atk,HW);base=.075;pre=`📐 Escanteio cobrado por ${as?as.name:'um jogador'}. `}
  else if(r<.25){kind='fk';sh=c.atk.on.find(p=>p.id===c.atkT.fk)||bestOf(c.atk,['CAM','ST','CM','LW','RW']);base=.06;pre='🎯 Falta perigosa! '}
  else{sh=pick(c.atk,POSW);as=pickAssist(c.atk,sh)}
  if(as===sh)as=null;
  const how=kind==='corner'?'escanteio':kind==='fk'?'':assistHow(as,sh,c.atkS);
  const who=sh?sh.name:'O atacante',via=as&&kind==='open'?`${as.name} (${how}) para ${who}. `:'';
  const conv=Math.min(.45,Math.max(.03,base*c.atkS.q*c.defS.oq+((sh?sh.ovr:70)-75)/450-(gq-75)/650+(c.pow-c.dpow)/450));
  const o=Math.random();
  if(o<conv){
    playBall(pathFor(kind,home,as,shx,shy).concat([[gx,50+rnd(-7,7)]]),sd,true);
    const ga=kind==='fk'?null:as;
    if(Math.random()<.12){
      M.hs.var++;const ok=Math.random()>.28;
      tick(`📺 VAR revisa o lance de gol de ${who}...`);
      Q(banner({word:'VAR',neutral:1,cls:'var',sub:`Analisando o gol de ${who}`,ms:2600}));
      if(ok)Q(goalItem(sd,sh,false,true,ga,how));
      else{tick(`❌ VAR anula o gol de ${who}! (${clock()})`);Q(banner({word:'ANULADO',neutral:1,cls:'annul',sub:'Decisão do VAR',ms:2200}))}
    }else Q(goalItem(sd,sh,false,false,ga,how));
  }else{
    let msg;
    if(o<conv+.3){setBall(home?92:8,50+rnd(-9,9));msg=`🧤 ${who} finaliza e ${gk?gk.name:'o goleiro'} defende!`}
    else if(o<conv+.55){setBall(home?100:0,rnd(20,80));msg=`😬 ${who} chuta para fora!`}
    else{setBall(shx,shy);msg=`🛡️ ${who} tem a finalização bloqueada.`}
    if(kind==='corner'&&Math.random()<.5)setBall(home?98:2,Math.random()<.5?4:96);
    tick(`${pre}${via}${msg} (${clock()})`);
  }
}
