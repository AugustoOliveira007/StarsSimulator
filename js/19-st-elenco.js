/* ===================== STARSTEAM — ELENCO, CLUBE E COLEÇÃO ===================== */
const stSq=()=>ST.club.squads[ST.club.sq];

/* ---------- Campo 3D com as cartas ---------- */
function stPitchHTML(sq,cards,mgr,o){
  o=o||{};
  const F=FORMS[sq.formation]||FORMS['4-3-3'],eff=stEffective(cards,sq.formation,mgr),bg=ST_ART.pitchBg?`style="--pitch-img:url('${stAttr(ST_ART.pitchBg)}')"`:'';
  const slots=F.map(([lb,x,y],i)=>{
    const c=cards[i],e=eff[i];
    return `<div class="st-slot${o.pick&&o.pick.t==='xi'&&o.pick.i===i?' pick':''}" style="left:${x}%;top:${y}%" data-act="slot" data-t="xi" data-i="${i}"${c&&!o.static?` data-drag="${c.id}"`:''}>
      ${c?stCardHTML(c,{size:'xs',eff:e.eff,chem:e.chem,tilt:false,badge:sq.captain===c.id?'©':sq.pk===c.id?'P':''}):`<div class="stc xs empty"><span>${lb}</span></div>`}
      ${c&&e.pen?`<em class="st-pen">${lb}</em>`:''}</div>`;
  }).join('');
  return `<div class="st-pitch-wrap"><div class="st-pitch" ${bg}><div class="st-lines"><i class="c"></i><i class="a1"></i><i class="a2"></i><i class="b1"></i><i class="b2"></i></div>${slots}</div></div>`;
}
function stChemSummary(sq,cards,mgr){
  const ch=stChem(cards,sq.formation,mgr);
  const top=(m,lim)=>Object.entries(m).filter(([,v])=>v>=lim).sort((a,b)=>b[1]-a[1]).slice(0,4);
  const lgN=id=>(id&&id.startsWith('rl:'))?((leagues.find(l=>l.id===id.slice(3))||{}).name||id):ST_LEAGUE_NAME(id);
  const natN=id=>(ST_NATIONS[id]||{n:id}).n;
  return{ch,txt:[...top(ch.club,2).map(([k,v])=>`${esc(k)} ×${v}`),...top(ch.league,3).map(([k,v])=>`${esc(lgN(k))} ×${v}`),...top(ch.nat,2).map(([k,v])=>`${esc(natN(k))} ×${v}`)]};
}
STV.squad=()=>{
  const c=ST.club,sq=stSq(),cards=sq.slots.map(id=>c.cards[id]),mgr=c.cards[c.mgr],a=stActiveInfo(),sm=stChemSummary(sq,cards,mgr);
  const full=cards.every(Boolean);
  const bench=sq.bench.map((id,i)=>`<div class="st-slot b" data-act="slot" data-t="bn" data-i="${i}"${c.cards[id]?` data-drag="${id}"`:''}>${c.cards[id]?stCardHTML(c.cards[id],{size:'xs',tilt:false}):`<div class="stc xs empty"><span>R${i+1}</span></div>`}</div>`).join('');
  const xi=cards.filter(Boolean);
  return `<div class="st-sqtop"><h2 class="t">Elenco</h2>
    <div class="st-tabs">${c.squads.map((s,i)=>`<button class="${i===c.sq?'on':''}" data-act="sqtab" data-i="${i}">${esc(s.name)}</button>`).join('')}<button data-act="sqname" title="Renomear">✏️</button></div></div>
  <div class="st-sq-g"><div class="st-sq-main">
    <div class="st-nums"><div><small>OVR</small><b>${full?a.ovr:'–'}</b></div><div><small>ENTROSAMENTO</small><b>${sm.ch.total}<i>/33</i></b></div><div><small>TITULARES</small><b>${xi.length}<i>/11</i></b></div></div>
    ${stPitchHTML(sq,cards,mgr)}
    <div class="st-bench"><h4 class="st-h4">Reservas</h4><div class="st-benchrow">${bench}</div></div>
    <div class="st-card st-colpanel"><h4 class="st-h4">Suas cartas <small class="st-fine">— arraste para o campo ou para o banco. Solte aqui para tirar do elenco.</small></h4>
      <div class="st-filters"><input class="fc" placeholder="Buscar…" value="${stAttr(ST.sqcol.q)}" data-in="sqcolq" style="max-width:180px"><select class="fc" data-ch="sqcolpos"><option value="">Todas posições</option>${['GK','DEF','MEI','ATA'].concat(Object.keys(ST_PROFILE)).map(p=>`<option ${ST.sqcol.pos===p?'selected':''}>${p}</option>`).join('')}</select></div>
      <div class="st-colgrid st-sqcol" id="st-sqcol">${stSqColHTML()}</div></div>
  </div><div class="st-sq-side">
    <div class="st-card"><h4 class="st-h4">Formação e tática</h4>
      <label class="st-lbl">Formação</label><select class="fc" data-ch="sqform">${Object.keys(FORMS).map(k=>`<option ${k===sq.formation?'selected':''}>${k}</option>`).join('')}</select>
      <label class="st-lbl">Estilo de jogo</label><select class="fc" data-ch="sqatk">${Object.entries(ATK).map(([k,v])=>`<option value="${k}" ${k===sq.atk?'selected':''}>${v.n}</option>`).join('')}</select>
      <label class="st-lbl">Sistema defensivo</label><select class="fc" data-ch="sqdef">${Object.entries(DEF).map(([k,v])=>`<option value="${k}" ${k===sq.def?'selected':''}>${v.n}</option>`).join('')}</select>
      <label class="st-lbl">Capitão</label><select class="fc" data-ch="sqcap"><option value="">(automático)</option>${xi.map(p=>`<option value="${p.id}" ${sq.captain===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select>
      <label class="st-lbl">Batedor de pênaltis</label><select class="fc" data-ch="sqpk"><option value="">(automático)</option>${xi.map(p=>`<option value="${p.id}" ${sq.pk===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select>
      <div class="row" style="margin-top:.8rem;gap:.5rem"><button class="btn" data-act="sqauto">⚡ Montar automático</button><button class="btn sec" data-act="sqclear">Limpar</button></div></div>
    <div class="st-card"><h4 class="st-h4">Treinador e estádio</h4>
      <div class="st-staffrow"><div data-act="pickstaff" data-k="manager">${mgr?stCardHTML(mgr,{size:'xs',tilt:false}):'<div class="stc xs empty"><span>TEC</span></div>'}</div>
      <div data-act="pickstaff" data-k="stadium">${c.cards[c.stad]?stCardHTML(c.cards[c.stad],{size:'xs',tilt:false}):'<div class="stc xs empty"><span>EST</span></div>'}</div></div>
      <small class="st-fine">O treinador soma +1 à contagem da sua liga e da sua nação. O estádio aparece nas partidas em casa.</small></div>
    <div class="st-card"><h4 class="st-h4">Entrosamento</h4>
      <small class="st-fine">Clube 2/4/7, liga 3/5/8 e nação 2/5/8 dão 1/2/3 pontos. Máximo 3 por jogador; fora de posição, zero. Cada ponto de entrosamento soma +1 no OVR em jogo.</small>
      <div class="st-chips">${sm.txt.map(t=>`<span>${t}</span>`).join('')||'<span>Nenhuma ligação ainda</span>'}</div></div>
  </div></div>`;
};
ST.sqcol={q:'',pos:''};
function stSqColHTML(){
  const c=ST.club,sq=stSq(),f=ST.sqcol,q=f.q.toLowerCase();
  let L=stPlayersOwned();
  if(q)L=L.filter(x=>x.name.toLowerCase().includes(q)||(x.club||'').toLowerCase().includes(q));
  if(f.pos)L=L.filter(x=>x.pos===f.pos||(f.pos==='DEF'&&ST_SECTOR(x.pos)==='def'&&x.pos!=='GK')||(f.pos==='MEI'&&ST_SECTOR(x.pos)==='mid')||(f.pos==='ATA'&&ST_SECTOR(x.pos)==='fwd'));
  L.sort((a,b)=>b.ovr-a.ovr);
  return L.slice(0,80).map(x=>`<div class="st-dragc" data-drag="${x.id}" data-act="cardinfo" data-id="${x.id}">${stCardHTML(x,{size:'sm',tilt:false,badge:sq.slots.includes(x.id)?'XI':sq.bench.includes(x.id)?'RES':''})}</div>`).join('')||'<p class="st-fine">Nenhuma carta.</p>';
}
STA.sqcolq=el=>{ST.sqcol.q=el.value;const g=$('st-sqcol');if(g)g.innerHTML=stSqColHTML()};
STA.sqcolpos=el=>{ST.sqcol.pos=el.value;const g=$('st-sqcol');if(g)g.innerHTML=stSqColHTML()};
STA.sqtab=el=>{ST.club.sq=+el.dataset.i;stSave();stGo('squad',null,true)};
STA.sqname=()=>stPrompt('Nome do esquadrão',stSq().name,v=>{v=v.trim().slice(0,20);if(v){stSq().name=v;stSave();stGo('squad',null,true)}},{max:20});
STA.sqform=el=>{stRearrange(stSq(),el.value);stSave({pub:true});stGo('squad',null,true)};
STA.sqatk=el=>{stSq().atk=el.value;stSave({pub:true})};
STA.sqdef=el=>{stSq().def=el.value;stSave({pub:true})};
STA.sqcap=el=>{stSq().captain=el.value;stSave({pub:true});stGo('squad',null,true)};
STA.sqpk=el=>{stSq().pk=el.value;stSave({pub:true});stGo('squad',null,true)};
STA.sqauto=()=>{
  if(stPlayersOwned().length<11)return toast('Você precisa de pelo menos 11 jogadores.');
  stAutoSquad(stSq());stSave({pub:true});toast('Elenco montado com o melhor entrosamento possível.');stGo('squad',null,true);
};
STA.sqclear=()=>stConfirm('Remover todos os jogadores deste esquadrão?',()=>{const s=stSq();s.slots=Array(11).fill('');s.bench=Array(7).fill('');s.captain=s.pk='';stSave({pub:true});stGo('squad',null,true)},'Limpar');

/* ---------- Escolha de carta para uma posição ---------- */
ST.pick=null;
STA.slot=el=>{
  const t=el.dataset.t,i=+el.dataset.i,sq=stSq(),id=(t==='xi'?sq.slots:sq.bench)[i];
  ST.pick={t,i,q:'',all:false};stPickerOpen(id);
};
function stPickerList(){
  const c=ST.club,sq=stSq(),p=ST.pick,pos=p.t==='xi'?stSlotPos(sq.formation,p.i):null,q=(p.q||'').toLowerCase();
  let L=stPlayersOwned();
  if(pos==='GK')L=L.filter(x=>x.pos==='GK');else if(pos)L=L.filter(x=>x.pos!=='GK');
  if(q)L=L.filter(x=>x.name.toLowerCase().includes(q)||(x.club||'').toLowerCase().includes(q));
  const cards=sq.slots.map(id=>c.cards[id]),mgr=c.cards[c.mgr];
  const score=x=>{const el=pos?stEligible(x,pos):true;return (el?1000:0)+x.ovr-(pos?stPosPenalty(x,pos):0)};
  if(pos&&!p.all)L=L.filter(x=>stEligible(x,pos)||q);
  L.sort((a,b)=>score(b)-score(a)||b.ovr-a.ovr);
  return{L:L.slice(0,60),pos,total:L.length,cards,mgr};
}
function stPickerOpen(curId){
  const sq=stSq(),p=ST.pick,pos=p.t==='xi'?stSlotPos(sq.formation,p.i):'Banco';
  const m=stModal(`<h3 class="t">Escolher jogador — ${esc(pos)}</h3>
    <div class="row" style="gap:.5rem;margin-bottom:.6rem"><input class="fc" id="st-pq" placeholder="Buscar por nome ou clube…" data-in="pickq" style="flex:1">${p.t==='xi'?`<label class="st-chk"><input type="checkbox" data-ch="pickall"> Mostrar fora de posição</label>`:''}${curId?`<button class="btn sec sm" data-act="pickremove">Remover atual</button>`:''}</div>
    <div class="st-pickgrid" id="st-pickgrid"></div>`,'wide');
  stPickerFill();setTimeout(()=>{const i=$('st-pq');if(i)i.focus()},50);
}
function stPickerFill(){
  const g=$('st-pickgrid');if(!g)return;
  const sq=stSq(),{L,pos,total,cards,mgr}=stPickerList();
  if(!L.length){g.innerHTML='<p class="st-fine">Nenhum jogador disponível para esta posição. Abra pacotes ou compre no Mercado.</p>';return}
  g.innerHTML=L.map(x=>{
    const inXi=sq.slots.includes(x.id),inBn=sq.bench.includes(x.id);
    let chemInfo='';
    if(ST.pick.t==='xi'){
      const test=cards.slice();test[ST.pick.i]=x;const e=stEffective(test,sq.formation,mgr)[ST.pick.i];
      chemInfo=`<div class="st-pk-i"><b>${e.eff}</b><small>ENT ${e.chem}${e.pen?' • fora de posição':''}</small></div>`;
    }
    return `<div class="st-pk${inXi||inBn?' used':''}"><div data-act="pickcard" data-id="${x.id}">${stCardHTML(x,{size:'sm',tilt:false,badge:inXi?'XI':inBn?'RES':''})}</div>${chemInfo}</div>`;
  }).join('')+(total>60?`<p class="st-fine" style="grid-column:1/-1">Mostrando 60 de ${total}. Use a busca.</p>`:'');
}
STA.pickq=el=>{ST.pick.q=el.value;stPickerFill()};
STA.pickall=el=>{ST.pick.all=el.checked;stPickerFill()};
STA.pickcard=el=>{
  const p=ST.pick,sq=stSq();
  if(!stPlace(sq,el.dataset.id,p.t,p.i))return toast('Esta carta não pode ocupar essa posição.');
  stSave({pub:true});stModalClose();stGo('squad',null,true);
};
STA.pickremove=()=>{const p=ST.pick,sq=stSq(),arr=p.t==='xi'?sq.slots:sq.bench,id=arr[p.i];if(id)stUnplace(sq,id);stSave({pub:true});stModalClose();stGo('squad',null,true)};
STA.pickstaff=el=>{
  const k=el.dataset.k,c=ST.club,cur=k==='manager'?c.mgr:c.stad,L=stClubCards().filter(x=>x.kind===k);
  stModal(`<h3 class="t">${k==='manager'?'Escolher treinador':'Escolher estádio'}</h3>${L.length?`<div class="st-pickgrid">${L.map(x=>`<div class="st-pk"><div data-act="staffset" data-k="${k}" data-id="${x.id}">${stCardHTML(x,{size:'sm',tilt:false,sel:x.id===cur})}</div></div>`).join('')}</div>`:`<p>Você ainda não tem ${k==='manager'?'treinadores':'estádios'}. Compre um ${k==='manager'?'Pacote de Treinador':'Pacote de Estádio'} na Loja.</p>`}${cur?`<button class="btn sec" data-act="staffset" data-k="${k}" data-id="">Remover</button>`:''}`,'wide');
};
STA.staffset=el=>{const c=ST.club;if(el.dataset.k==='manager')c.mgr=el.dataset.id;else c.stad=el.dataset.id;stSave({pub:true});stModalClose();stGo('squad',null,true)};

/* ---------- Clube: coleção, identidade, detalhes de carta ---------- */
ST.col={q:'',pos:'',rar:'',sort:'ovr',sel:new Set(),kind:'player'};
function stColList(){
  const f=ST.col,q=f.q.toLowerCase();
  let L=stClubCards().filter(c=>f.kind==='player'?c.kind==='player':c.kind===f.kind);
  if(q)L=L.filter(c=>c.name.toLowerCase().includes(q)||(c.club||'').toLowerCase().includes(q));
  if(f.pos)L=L.filter(c=>c.pos===f.pos||(f.pos==='DEF'&&ST_SECTOR(c.pos)==='def'&&c.pos!=='GK')||(f.pos==='MEI'&&ST_SECTOR(c.pos)==='mid')||(f.pos==='ATA'&&ST_SECTOR(c.pos)==='fwd'));
  if(f.rar)L=L.filter(c=>f.rar==='raro'?c.rar!=='comum':c.rar===f.rar);
  const sf={ovr:(a,b)=>b.ovr-a.ovr,val:(a,b)=>stValue(b)-stValue(a),new:(a,b)=>(b.got||0)-(a.got||0),nome:(a,b)=>a.name.localeCompare(b.name,'pt')}[f.sort]||((a,b)=>b.ovr-a.ovr);
  return L.sort(sf);
}
function stUsed(id){return ST.club.squads.some(s=>s.slots.includes(id)||s.bench.includes(id))||ST.club.mgr===id||ST.club.stad===id}
STV.club=()=>{
  const c=ST.club,f=ST.col,L=stColList(),sel=[...f.sel].filter(id=>c.cards[id]),selv=sel.reduce((s,id)=>s+(c.cards[id].kind==='player'?stQuickSell(c.cards[id]):200),0);
  const totalValue=stPlayersOwned().reduce((s,x)=>s+stValue(x),0);
  return `<div class="st-clubhead"><div class="st-hero-cr tilt">${stCrest(c.crest,96)}</div><div><h2 class="t">${esc(c.name)} <small>(${esc(c.code)})</small></h2>
    <div class="st-hero-s"><span>${stPlayersOwned().length} jogadores</span><span>Valor do elenco ${stFmt(totalValue)} 🪙</span><span>${c.st.p} J • ${c.st.w}V ${c.st.d}E ${c.st.l}D</span></div>
    <div class="row" style="gap:.5rem;margin-top:.5rem"><button class="btn sec sm" data-act="editid">✏️ Editar identidade</button>${isAdmin()?'':''}</div></div>
    <div class="st-kits"><div class="tilt">${stKit(c.kits.home,70)}</div><div class="tilt">${stKit(c.kits.away,70)}</div><div class="tilt">${stBall(c.ball,56)}</div></div></div>
  <div class="st-card"><div class="st-filters">
    <div class="st-tabs">${[['player','Jogadores'],['manager','Treinadores'],['stadium','Estádios']].map(([k,n])=>`<button class="${f.kind===k?'on':''}" data-act="colkind" data-v="${k}">${n} (${stClubCards().filter(x=>x.kind===k).length})</button>`).join('')}</div>
    <input class="fc" placeholder="Buscar…" value="${stAttr(f.q)}" data-in="colq" style="max-width:200px">
    ${f.kind==='player'?`<select class="fc" data-ch="colpos"><option value="">Todas posições</option>${['GK','DEF','MEI','ATA','CB','LB','RB','CDM','CM','CAM','LW','RW','ST'].map(p=>`<option ${f.pos===p?'selected':''}>${p}</option>`).join('')}</select>
    <select class="fc" data-ch="colrar"><option value="">Todas raridades</option><option value="comum" ${f.rar==='comum'?'selected':''}>Comum</option><option value="raro" ${f.rar==='raro'?'selected':''}>Raras+</option><option value="totw" ${f.rar==='totw'?'selected':''}>TOTW</option><option value="heroi" ${f.rar==='heroi'?'selected':''}>Heróis</option><option value="idolo" ${f.rar==='idolo'?'selected':''}>Ídolos</option></select>`:''}
    <select class="fc" data-ch="colsort"><option value="ovr" ${f.sort==='ovr'?'selected':''}>Maior OVR</option><option value="val" ${f.sort==='val'?'selected':''}>Maior valor</option><option value="new" ${f.sort==='new'?'selected':''}>Mais recentes</option><option value="nome" ${f.sort==='nome'?'selected':''}>Nome</option></select></div>
    ${sel.length?`<div class="st-selbar"><b>${sel.length}</b> selecionada(s) <button class="btn sm" data-act="qsell">💰 Venda rápida (+${stFmt(selv)} 🪙)</button><button class="btn sec sm" data-act="colclear">Limpar seleção</button></div>`:'<small class="st-fine">Toque numa carta para ver detalhes. Use "Selecionar" nos detalhes para vender várias de uma vez.</small>'}
    <div class="st-colgrid">${L.length?L.map(x=>stCardHTML(x,{size:'sm',id:true,act:'cardinfo',sel:f.sel.has(x.id),badge:stUsed(x.id)?'XI':''})).join(''):'<p class="st-fine">Nenhuma carta encontrada.</p>'}</div></div>`;
};
STA.colkind=el=>{ST.col.kind=el.dataset.v;ST.col.sel.clear();stGo('club',null,true)};
STA.colq=el=>{ST.col.q=el.value;stColSoft()};
STA.colpos=el=>{ST.col.pos=el.value;stGo('club',null,true)};
STA.colrar=el=>{ST.col.rar=el.value;stGo('club',null,true)};
STA.colsort=el=>{ST.col.sort=el.value;stGo('club',null,true)};
STA.colclear=()=>{ST.col.sel.clear();stGo('club',null,true)};
function stColSoft(){const g=document.querySelector('.st-colgrid');if(!g)return;const L=stColList(),f=ST.col;g.innerHTML=L.length?L.map(x=>stCardHTML(x,{size:'sm',id:true,act:'cardinfo',sel:f.sel.has(x.id),badge:stUsed(x.id)?'XI':''})).join(''):'<p class="st-fine">Nenhuma carta encontrada.</p>'}
STA.editid=()=>{ST.crEdit=true;ST.cr=stCrFromClub(ST.club);stGo('create',null)};
STA.qsell=()=>{
  const ids=[...ST.col.sel].filter(id=>ST.club.cards[id]),used=ids.filter(stUsed);
  const tot=ids.reduce((s,id)=>s+(ST.club.cards[id].kind==='player'?stQuickSell(ST.club.cards[id]):200),0);
  stConfirm(`Vender ${ids.length} carta(s) por <b>${stFmt(tot)} 🪙</b>?${used.length?`<br><small>${used.length} delas estão no seu elenco e serão removidas dele.</small>`:''}`,()=>{
    const g=stQuickSellCards(ids);ST.col.sel.clear();toast('+'+stFmt(g)+' moedas');stGo('club',null,true);
  },'Vender');
};
STA.card=el=>STA.cardinfo(el);
STA.cardinfo=el=>{
  const c=ST.club.cards[el.dataset.id];if(!c)return;
  const val=c.kind==='player'?stValue(c):0,rg=c.kind==='player'?stRange(c):null;
  const gk=c.pos==='GK',lb=gk?ST_STAT_LBL_GK:ST_STAT_LBL,nat=ST_NATIONS[c.nat];
  const bars=c.kind==='player'?c.stats.map((v,i)=>`<div class="st-bar-r"><span>${lb[i]}</span><div><i style="width:${v}%;background:${v>=85?'#2ecc71':v>=70?'#f2b01e':'#e5603a'}"></i></div><b>${v}</b></div>`).join(''):'';
  const lgN=c.league&&c.league.startsWith('rl:')?c.leagueN:ST_LEAGUE_NAME(c.league);
  stModal(`<div class="st-detail"><div class="st-detail-c">${stCardHTML(c,{size:'lg'})}</div><div class="st-detail-i">
    <h3 class="t">${esc(c.name)}</h3><div class="st-chips"><span>${esc(stRarLabel(c))}</span>${c.kind==='player'?`<span>${esc(c.pos)}${c.alt&&c.alt.length?' (+'+c.alt.join(', ')+')':''}</span><span>${stTierName(c)}</span>`:''}</div>
    ${c.kind==='player'?`<p class="st-fine">${nat?esc(nat.n):''} • ${esc(lgN||'')} • ${esc(c.club||'')}</p>${bars}<p><b>Valor de mercado:</b> ${stFmt(val)} 🪙 <small class="st-fine">(faixa ${stFmt(rg.min)} a ${stFmt(rg.max)})</small></p>`:`<p class="st-fine">${esc(c.leagueN||'')} ${nat?'• '+esc(nat.n):''}</p>`}
    <div class="row" style="gap:.5rem;flex-wrap:wrap">
      <button class="btn sm" data-act="cselect" data-id="${c.id}">${ST.col.sel.has(c.id)?'✔ Selecionada':'Selecionar'}</button>
      <button class="btn sm" data-act="clist" data-id="${c.id}">💱 Vender no mercado</button>
      <button class="btn sec sm" data-act="cquick" data-id="${c.id}">Venda rápida (${stFmt(c.kind==='player'?stQuickSell(c):200)} 🪙)</button>
    </div></div></div>`,'wide');
};
STA.cselect=el=>{const s=ST.col.sel;s.has(el.dataset.id)?s.delete(el.dataset.id):s.add(el.dataset.id);stModalClose();stGo(ST.view,ST.arg,true)};
STA.cquick=el=>{const c=ST.club.cards[el.dataset.id];if(!c)return;stConfirm(`Vender <b>${esc(c.name)}</b> por ${stFmt(c.kind==='player'?stQuickSell(c):200)} 🪙?`,()=>{const g=stQuickSellCards([c.id]);toast('+'+stFmt(g)+' moedas');stGo(ST.view,ST.arg,true)},'Vender')};
