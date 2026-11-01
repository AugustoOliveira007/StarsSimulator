/* ===================== ESTATÍSTICAS E TÁTICAS AO VIVO ===================== */
function renderStats(){
  const box=$('stbox');if(!box||!M||!M.h||!M.a||!M.st)return;
  const s=M.st,tot=(s.home.poss+s.away.poss)||1,hp=Math.round(s.home.poss/tot*100),ap=100-hp;
  const share=(h,a)=>(h+a)?h/(h+a):.5;
  const c1h=c1(M.h),c1a=c1(M.a);
  const rows=[['Posse de bola',hp+'%',ap+'%',hp/100]];
  [['Chutes','shots'],['Chutes ao alvo','on'],['Escanteios','corners'],['Faltas','fouls'],['Impedimentos','off'],['Cartões amarelos','yc'],['Cartões vermelhos','rc']].forEach(([lab,k])=>{
    const h=s.home[k]||0,a=s.away[k]||0;rows.push([lab,h,a,share(h,a)]);
  });
  const sv1=s.home.saves||0,sv2=s.away.saves||0;
  rows.push(['Defesas',sv1,sv2,share(sv1,sv2)]);
  box.className='hud';box.style.setProperty('--c1',c1h);
  box.innerHTML=`<div class="hdr"><span class="tm" style="color:${c2(M.h)}">${esc(M.h.code)}</span><span class="mid">${esc(M.h.name)} x ${esc(M.a.name)}</span><span class="tm" style="color:${c2(M.a)}">${esc(M.a.code)}</span></div>`+
    rows.map(([lab,hv,av,sr])=>`<div class="hstat"><b>${hv}</b><span>${lab}</span><b>${av}</b></div><div class="hbar"><i style="width:${Math.round(sr*100)}%;background:${c1h}"></i><i style="flex:1;background:${c1a}"></i></div>`).join('');
}
function advise(side){
  const my=side==='home'?M.sh:M.sa,th=side==='home'?M.sa:M.sh,lead=my-th,min=M.min;
  const l=side==='home'?M.lh:M.la,ol=side==='home'?M.la:M.lh;
  const men=l.on.length-ol.on.length,tot=M.st.home.poss+M.st.away.poss,poss=tot?M.st[side].poss/tot:.5;
  const yel=l.on.filter(p=>(M.cards[p.id]||0)>=1).length,cur=M.tac[side];
  let a=null,d=null,why='';
  if(men<=-1){a='counter';d='recuar';why='um jogador a menos: recuar e sair em contra-ataque'}
  else if(men>=1){a='posse';d='eq';why='superioridade numérica: controlar a bola sem abrir espaço'}
  else if(lead<0&&min>=70){a=lead<=-2?'long':'pontas';d='linha';why=`perdendo por ${-lead} nos minutos finais`}
  else if(lead<0&&min>=35){a='pontas';d='eq';why='precisa buscar o resultado'}
  else if(lead>0&&min>=70){a='counter';d='recuar';why='vencendo no fim: segurar o resultado'}
  else if(lead>=2){a='posse';d='eq';why='dois gols de vantagem: controlar o jogo'}
  else if(tot>25&&poss<.4){a='counter';d='recuar';why='adversário domina a posse'}
  else if(tot>25&&poss>.6&&lead<=0){a='pontas';d='eq';why='domina a posse mas não vence: abrir o jogo'}
  if(yel>=3&&(cur.def==='press'||cur.def==='indiv')&&d!=='press'){d='eq';why+=(why?'; ':'')+'risco de expulsões (3+ amarelos)'}
  if(!a&&!d&&min>=75&&cur.def==='press'){d='recuar';why='cansaço: recuar a marcação'}
  if(!a&&!d)return null;
  a=a||cur.atk;d=d||cur.def;
  if(a===cur.atk&&d===cur.def)return null;
  return{atk:a,def:d,why};
}
const tacOk=()=>M&&['running','paused','break','hold'].includes(M.status);
function setTac(side,k,v){
  if(!tacOk()){buildTac();return toast('Mude a tática com o jogo rolando, em pausa ou no intervalo.')}
  M.tac[side][k]=v;M.tacT[side]=M.min;
  const team=side==='home'?M.h:M.a,t=M.tac[side];
  tick(`🧠 ${team.name} muda a tática: ${ATK[t.atk].n} • ${DEF[t.def].n} (${clock()})`);
  tacTick(true);
}
function applyAdvice(side){
  const v=advise(side);if(!v)return;
  if(!tacOk())return toast('Mude a tática com o jogo rolando, em pausa ou no intervalo.');
  M.tac[side].atk=v.atk;M.tac[side].def=v.def;M.tacT[side]=M.min;
  tick(`🧠 ${(side==='home'?M.h:M.a).name} adota a sugestão do auxiliar (${v.why}): ${ATK[v.atk].n} • ${DEF[v.def].n} (${clock()})`);
  buildTac();
}
/* ---------- Estilo de jogo da CPU: escolhe entre várias respostas, conforme o jogo e a “personalidade” de cada time ---------- */
function cpuAdvise(side){
  const my=side==='home'?M.sh:M.sa,th=side==='home'?M.sa:M.sh,lead=my-th,min=M.min,P=cpuPers(side);
  const l=side==='home'?M.lh:M.la,ol=side==='home'?M.la:M.lh,men=l.on.length-ol.on.length;
  const tot=M.st.home.poss+M.st.away.poss,poss=tot?M.st[side].poss/tot:.5;
  const yel=l.on.filter(p=>(M.cards[p.id]||0)>=1).length,cur=M.tac[side],team=side==='home'?M.h:M.a;
  const bA=team.atk||'eq',bD=team.def||'eq',opts=[];
  const add=(a,d,w,why)=>opts.push({a,d,w,why});
  const r=P.risk;
  if(men<=-1){add('counter','recuar',3,'um jogador a menos');add('counter','eq',2,'um jogador a menos');add('long','recuar',1,'um jogador a menos');add('eq','recuar',1.2,'um jogador a menos')}
  else if(men>=1){add('posse','eq',2,'superioridade numérica');add('pontas','linha',1.5+r,'superioridade numérica');add('posse','press',1+r,'superioridade numérica');add('pontas','eq',1.5,'superioridade numérica')}
  if(lead<0){
    if(min>=70){add('long','linha',1+r*2,`perdendo por ${-lead} no fim`);add('pontas','linha',2.5,`perdendo por ${-lead} no fim`);add('pontas','press',1+r*2,`perdendo por ${-lead} no fim`);add('posse','press',1.5,`perdendo por ${-lead} no fim`);if(lead===-1)add('counter','linha',.8,'busca o empate no contra-ataque')}
    else if(min>=30){add('pontas','eq',2,'precisa buscar o resultado');add('posse','eq',2,'precisa buscar o resultado');add('posse','press',1+r,'precisa buscar o resultado');add('pontas','linha',1+r,'precisa buscar o resultado')}
  }else if(lead>0){
    if(min>=70){add('counter','recuar',3,'segura o resultado');add('posse','recuar',2.2,'segura o resultado');add('eq','recuar',1.3,'segura o resultado');add('long','recuar',1,'segura o resultado')}
    else if(min>=30){add('posse','eq',2,'administra a vantagem');add('counter','eq',1.5+(1-r),'administra a vantagem');add(bA,bD,.8,'volta ao plano de jogo')}
    if(lead>=2)add('posse','eq',2,'controla o jogo com folga')
  }else if(min>=30){
    add('pontas','eq',1.5,'jogo parado: abre pelos lados');add('posse','press',1+r,'tenta apertar a saída de bola');add('counter','linha',.6+(1-r),'tenta surpreender');add('long','eq',.8,'muda a forma de chegar ao ataque');add(bA,bD,.8,'volta ao plano de jogo');
  }
  if(tot>25&&poss<.4)add('counter','recuar',1.8,'adversário domina a posse');
  if(tot>25&&poss>.62&&lead<=0)add('pontas','linha',1.6,'domina mas não vence');
  if(min>=70&&cur.def==='press')add(cur.atk,'recuar',2,'cansaço: recua a marcação');
  if(min>=70&&cur.def==='indiv')add(cur.atk,'eq',1.2,'cansaço na marcação');
  let list=opts.filter(o=>!(o.a===cur.atk&&o.d===cur.def));
  if(yel>=3)list=list.map(o=>({...o,d:(o.d==='press'||o.d==='indiv')?'eq':o.d,why:o.why+'; muitos amarelos'})).filter(o=>!(o.a===cur.atk&&o.d===cur.def));
  if(!list.length)return null;
  const c=wpick(list,o=>o.w);
  return{atk:c.a,def:c.d,why:c.why};
}
function cpuTac(){
  ['home','away'].forEach(s=>{
    const P=cpuPers(s);
    if(M.ctl[s]||(M.rm&&M.rm[s])||M.min<12||M.min-M.tacT[s]<(9+Math.round(P.risk*6)+Math.floor(rnd(0,5)))||Math.random()>.45)return;
    const v=cpuAdvise(s);if(!v)return;
    M.tac[s].atk=v.atk;M.tac[s].def=v.def;M.tacT[s]=M.min;
    tick(`🧠 ${(s==='home'?M.h:M.a).name} ajusta a tática (${v.why}): ${ATK[v.atk].n} • ${DEF[v.def].n} (${clock()})`);
  });
}
function buildTac(){
  const box=$('tac-box');if(!box||!M)return;
  const opt=(O,cur,ic)=>Object.entries(O).map(([k,v])=>`<option value="${k}" ${cur===k?'selected':''}>${ic} ${v.n}</option>`).join('');
  box.innerHTML='<h3 class="t" style="font-size:1.3rem;margin-bottom:.4rem">🧠 Táticas ao vivo</h3><div id="tac-stat" class="tacstat"></div>'+['home','away'].map(s=>{
    const team=s==='home'?M.h:M.a;if(!team)return'';
    if(!M.ctl[s])return `<div class="tacrow"><b>${esc(team.name)}</b><span class="cpu" id="tac-cpu-${s}"></span></div>`;
    return `<div class="tacrow"><b>${esc(team.name)}</b><select class="fc" onchange="setTac('${s}','atk',this.value)">${opt(ATK,M.tac[s].atk,'⚔')}</select><select class="fc" onchange="setTac('${s}','def',this.value)">${opt(DEF,M.tac[s].def,'🛡')}</select><div class="tacadv" id="tac-adv-${s}"></div></div>`;
  }).join('');
  tacTick(true);
}
function tacTick(force){
  if(!M||!M.st||!$('tac-stat'))return;
  const st=M.st,tot=st.home.poss+st.away.poss||1,ph=Math.round(st.home.poss/tot*100);
  const h=`Posse <b>${ph}%</b> x <b>${100-ph}%</b> • Finalizações <b>${st.home.shots}</b> x <b>${st.away.shots}</b> • Faltas <b>${st.home.fouls}</b> x <b>${st.away.fouls}</b>`;
  const sEl=$('tac-stat');if(force||sEl._h!==h){sEl.innerHTML=h;sEl._h=h}
  ['home','away'].forEach(s=>{
    const el=M.ctl[s]?$('tac-adv-'+s):$('tac-cpu-'+s);if(!el)return;
    let html;
    if(M.ctl[s]){const v=advise(s);html=v?`💡 Auxiliar: ${esc(v.why)} → <b>${ATK[v.atk].n}</b> + <b>${DEF[v.def].n}</b> <button class="btn sm" onclick="applyAdvice('${s}')">Aplicar</button>`:'<span style="color:var(--muted)">💡 Auxiliar: a tática está adequada ao momento do jogo.</span>'}
    else html=`${ATK[M.tac[s].atk].n} • ${DEF[M.tac[s].def].n} (a CPU adapta conforme o jogo)`;
    if(force||el._h!==html){el.innerHTML=html;el._h=html}
  });
}
