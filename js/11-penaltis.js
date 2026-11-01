/* ===================== PÊNALTIS ===================== */
const ZW=[1.3,.5,1.3,2,.8,2],DW=[1.2,.5,1.2,1.8,.7,1.8];
const wr=w=>{let r=Math.random()*w.reduce((a,b)=>a+b,0);for(let i=0;i<w.length;i++){r-=w[i];if(r<=0)return i}return 0};
const ZX=[17,50,83],ZY=[28,72];
function pkOrder(side){
  const on=PK.ls[side].on,tm=PK.teams[side];
  if(!on.length)return[{id:'x'+side,name:'Craque do time',ovr:70,pos:'ST'}];
  const sec=p=>G.fwd.includes(p.pos)?0:G.mid.includes(p.pos)?1:G.def.includes(p.pos)?2:3;
  const off=on.find(p=>p.id===tm.pk);
  const rest=on.filter(p=>p!==off).sort((a,b)=>sec(a)-sec(b)||b.ovr-a.ovr);
  return off?[off,...rest]:rest;
}
function openPK(cfg){
  PK={...cfg,sc:{home:0,away:0},kicks:{home:[],away:[]},used:{home:new Set(),away:new Set()},cur:null,busy:true,result:null,on:!!(cfg.rm&&(cfg.rm.home||cfg.rm.away))};
  $('m-pk').classList.add('on');pkNext();
}
function pkScore(){
  const row=s=>`<div class="pkrow"><b>${esc(PK.teams[s].code)}</b>${PK.kicks[s].map(o=>o?'✅':'❌').join(' ')} <span>(${PK.sc[s]})</span></div>`;
  $('pk-score').innerHTML=PK.mode==='shootout'?row('home')+row('away'):'';
}
function pkWinner(){
  const kh=PK.kicks.home.length,ka=PK.kicks.away.length,sh=PK.sc.home,sa=PK.sc.away;
  if(kh>=5&&ka>=5&&kh===ka&&sh!==sa)return sh>sa?'home':'away';
  if(kh<5||ka<5){const rh=5-Math.min(5,kh),ra=5-Math.min(5,ka);if(sh>sa+ra)return'home';if(sa>sh+rh)return'away'}
  return null;
}
function resetPkView(){const g=$('pk-gk'),b=$('pk-ball');g.style.left='50%';g.style.top='62%';b.style.left='50%';b.style.top='128%'}
function pkChips(){
  const n=PK.kicks[PK.sd].length,ord=PK.order,idx=n%ord.length,single=PK.mode==='single'&&PK.ctl[PK.sd];
  $('pk-order').innerHTML=ord.map((p,i)=>{
    const now=single?p===PK.cur.kicker:i===idx,done=!single&&i<idx;
    return `<button type="button" class="pkc ${now?'now':''} ${done?'done':''} ${single?'':'fix'}" ${single?`onclick="pkPick('${p.id}')"`:''}>${esc(p.pos)} • ${esc(p.name)} (${p.ovr})</button>`;
  }).join('');
}
function pkPick(id){
  if(!PK||PK.busy||PK.mode!=='single')return;
  const k=PK.order.find(p=>p.id===id);if(!k)return;
  PK.cur.kicker=k;pkChips();
}
/* ---- Pênaltis online: o anfitrião decide, o adversário remoto escolhe o canto pela rede ---- */
function pkOnline(sd,ds,k,lbl,tm){
  PK.oid=(PK.oid||0)+1;PK.zs=null;PK.zg=null;PK.busy=false;
  const localKick=!PK.rm[sd];
  PK.how=localKick?'shoot':'dive';
  $('pk-info').textContent=localKick?`${lbl}${tm.name} cobra. Toque no canto do gol (15s).`:`${lbl}${k.name} (${tm.name}) vai cobrar. Toque no canto onde o goleiro vai pular (15s)!`;
  if(typeof stOnPush==='function')stOnPush({k:'pkq',id:PK.oid,mode:PK.mode,title:PK.title,sd,kn:k.name,tm:tm.name,lbl,sc:{...PK.sc},kk:{home:[...PK.kicks.home],away:[...PK.kicks.away]}});
  const pk=PK,id=PK.oid;
  clearTimeout(PK.tmo);
  PK.tmo=setTimeout(()=>{if(PK!==pk||PK.oid!==id)return;if(PK.zs==null)PK.zs=wr(ZW);if(PK.zg==null)PK.zg=wr(DW);pkOnTry()},15500);
}
function pkOnTry(){
  if(!PK||!PK.on||PK.zs==null||PK.zg==null)return;
  clearTimeout(PK.tmo);PK.busy=true;
  const z=PK.zs,g=PK.zg;PK.zs=PK.zg=null;PK.how='auto';
  pkResolve(z,g);
}
/* comando remoto de pênalti (vindo do convidado) */
function pkRemote(id,z){
  if(!PK||!PK.on||PK.oid!==id||!(z>=0&&z<=5))return;
  if(PK.how==='shoot'){if(PK.zg==null)PK.zg=z}else{if(PK.zs==null)PK.zs=z}
  pkOnTry();
}
function pkNext(){
  if(PK.mode==='shootout'){const r=pkWinner();if(r)return pkEnd(r)}
  const sd=PK.mode==='single'?PK.side:(PK.kicks.home.length<=PK.kicks.away.length?'home':'away'),ds=sd==='home'?'away':'home';
  PK.sd=sd;PK.ds=ds;
  const tm=PK.teams[sd];
  PK.order=pkOrder(sd);
  let k;
  if(PK.mode==='single'){const off=PK.order.find(p=>p.id===tm.pk);k=off||[...PK.order].sort((a,b)=>b.ovr-a.ovr)[0]}
  else k=PK.order[PK.kicks[sd].length%PK.order.length];
  PK.cur={kicker:k};
  $('pk-title').textContent=PK.title;$('pk-done').style.display='none';$('pk-msg').textContent='';
  pkScore();resetPkView();pkChips();
  const lbl=PK.mode==='shootout'?`Cobrança ${PK.kicks[sd].length+1} • `:'';
  if(PK.on&&(PK.rm[sd]||PK.rm[ds]))return pkOnline(sd,ds,k,lbl,tm);
  if(PK.ctl[sd]){
    PK.how='shoot';PK.busy=false;
    $('pk-info').textContent=`${lbl}${tm.name} cobra.${PK.mode==='single'?' Escolha o batedor acima e':''} Toque no canto do gol.`;
  }else if(PK.ctl[ds]){
    PK.how='dive';PK.busy=false;
    $('pk-info').textContent=`${lbl}${k.name} (${tm.name}) vai cobrar. Toque no canto onde o goleiro vai pular!`;
  }else{
    PK.busy=true;$('pk-info').textContent=`${lbl}${k.name} (${tm.name}) vai para a bola...`;
    setTimeout(()=>pkResolve(wr(ZW),wr(DW)),900);
  }
}
function pkClick(z){
  if(!PK||PK.busy)return;PK.busy=true;
  if(PK.mirror)return stOnGuestPk(z);
  if(PK.on&&PK.how!=='auto'){if(PK.how==='shoot')PK.zs=z;else PK.zg=z;return pkOnTry()}
  if(PK.how==='shoot')pkResolve(z,wr(DW));else pkResolve(wr(ZW),z);
}
function pkResolve(z,g){
  const k=PK.cur.kicker,gkp=gkOf(PK.ls[PK.ds]),gq=gkp?gkp.ovr:70;
  let res='goal',note='';
  const miss=[.12,.07,.12,.05,.03,.05][z]+(75-k.ovr)/500;
  if(Math.random()<Math.max(.01,miss))res='miss';
  else if(g===z){if(Math.random()<Math.min(.9,(z===1||z===4?.8:.72)+(gq-75)/300))res='saved';else note='O goleiro foi no canto certo, mas não alcançou a bola!'}
  else if(Math.floor(g/3)===Math.floor(z/3)&&Math.abs(g%3-z%3)===1&&Math.random()<.1)res='saved';
  PK.used[PK.sd].add(k.id);
  const b=$('pk-ball');
  if(res==='miss'){b.style.left=z%3===1?ZX[1]+'%':(z%3===0?'-8%':'108%');b.style.top=z%3===1?'-14%':ZY[z/3|0]+'%'}
  else{b.style.left=(ZX[z%3]+(note?(z%3===2?-7:7):0))+'%';b.style.top=ZY[z/3|0]+'%'}
  const gk=$('pk-gk');gk.style.left=ZX[g%3]+'%';gk.style.top=ZY[g/3|0]+'%';
  const ok=res==='goal';PK.kicks[PK.sd].push(ok);if(ok)PK.sc[PK.sd]++;
  $('pk-msg').innerHTML=ok?'⚽ GOOOL!'+(note?`<div style="font:600 .9rem var(--fb);color:#cfd8e3;margin-top:.2rem">🧤 ${note}</div>`:''):res==='saved'?'🧤 DEFENDEU!':'❌ PRA FORA!';
  pkScore();
  if(PK.on&&typeof stOnPush==='function')stOnPush({k:'pkr',id:PK.oid,sd:PK.sd,kn:k.name,z,g,res,note,sc:{...PK.sc},kk:{home:[...PK.kicks.home],away:[...PK.kicks.away]}});
  setTimeout(()=>{if(PK.mode==='single'){$('m-pk').classList.remove('on');PK.cb(res,k)}else pkNext()},note?2100:1600);
}
function pkEnd(r){
  PK.result={winner:r,h:PK.sc.home,a:PK.sc.away};
  $('pk-msg').textContent=`🏆 ${PK.teams[r].name} vence nos pênaltis! (${PK.sc.home} x ${PK.sc.away})`;
  $('pk-info').textContent='';$('pk-order').innerHTML='';$('pk-done').style.display='';
  if(PK.on){if(typeof stOnPush==='function')stOnPush({k:'pke',winner:r,h:PK.sc.home,a:PK.sc.away,wn:PK.teams[r].name});const pk=PK;setTimeout(()=>{if(PK===pk&&PK.result&&$('m-pk').classList.contains('on'))pkDone()},4500)}
}
function pkDone(){$('m-pk').classList.remove('on');PK.cb(PK.result)}
function openShootout(){
  const h=teamOf($('sel-home').value),a=teamOf($('sel-away').value),m=$('ctl').value;
  if(!h||!a)return toast('Cadastre e selecione os dois times.');
  openPK({mode:'shootout',title:'🥅 DISPUTA DE PÊNALTIS',teams:{home:h,away:a},ls:{home:lineup(h),away:lineup(a)},ctl:{home:m==='both'||m==='home',away:m==='both'||m==='away'},cb(r){log(`Disputa de pênaltis: ${h.name} ${r.h} x ${r.a} ${a.name}`)}});
}
function matchPenalty(sd){
  const team=sd==='home'?M.h:M.a;
  const go=()=>openPK({mode:'single',title:'⚠️ PÊNALTI',side:sd,teams:{home:M.h,away:M.a},ls:{home:M.lh,away:M.la},ctl:M.ctl,rm:M.rm,cb(res,k){
    M.st[sd].shots++;
    if(res==='goal'){setBall(sd==='home'?98.3:1.7,50);Q(goalItem(sd,k,true))}
    else{if(res==='saved'){M.st[sd].on++;M.st[sd==='home'?'away':'home'].saves++}tick(`❌ ${k.name} ${res==='saved'?'teve o pênalti defendido':'chutou para fora'}! (${clock()})`);Q(banner({word:res==='saved'?'DEFENDEU!':'PRA FORA!',neutral:1,sub:`${k.name} desperdiçou o pênalti`,ms:1800}))}
  }});
  if(Math.random()<.22){
    M.hs.var++;
    tick(`📺 VAR revisa o pênalti a favor do ${team.name}... (${clock()})`);
    Q(banner({word:'VAR',neutral:1,cls:'var',sub:'Revisando o pênalti',ms:2600}));
    if(Math.random()<.35){
      tick(`❌ VAR ANULA o pênalti! O jogo segue. (${clock()})`);
      Q(banner({word:'PÊNALTI ANULADO',neutral:1,cls:'annul',sub:'Decisão do VAR',ms:2300}));
      return;
    }
    Q(banner({word:'PÊNALTI MANTIDO',neutral:1,sub:'Decisão confirmada pelo VAR',ms:1700,after(){M.pen=sd;M.status='pen';btns();go()}}));
    return;
  }
  go();
}
