/* ===================== STARSTEAM — PAINEL DO ADMIN (somente MingauCoach) ===================== */
const ST_ADM={list:{},clubs:{},tab:'access',f:{},form:null,uc:null,ucKey:'',cq:'',cflt:{q:'',src:'all',rar:'',pos:''}};
const ST_ADM_TABS=[['access','Acesso beta'],['cards','Cartas'],['mgrs','Técnicos'],['clubs','Clubes'],['ann','Anúncios'],['cfg','Configurações']];
const stFileData=(file,max,cb,type)=>{const r=new FileReader();r.onload=e=>shrinkImg(e.target.result,max,cb,type);r.readAsDataURL(file)};
const ST_THEMES=[['ouro','Ouro especial'],['rubi','Rubi'],['safira','Safira'],['esmeralda','Esmeralda'],['obsidiana','Obsidiana'],['holo','Holográfico']];

async function stAdmLoad(){
  const box=$('stadm-body');if(!box)return;
  if(!isAdmin()){box.innerHTML='<p>Acesso restrito ao MingauCoach.</p>';return}
  if(!stCloudOk()){box.innerHTML='<div class="st-notice">Conecte a nuvem (☁️) para gerenciar o StarsTeam.</div>';return}
  box.innerHTML='<div class="st-load"><div class="st-spin"></div></div>';
  const [a,cl,cf]=await Promise.all([stGet('/access'),stGet('/pub'),stGet('/cfg')]);
  await stCatLoad(true);
  if(!a.ok){box.innerHTML=`<div class="st-notice">Erro ao ler a nuvem: ${esc(a.err)}</div>`;return}
  ST_ADM.list=a.data||{};ST_ADM.clubs=(cl.ok&&cl.data)||{};
  if(cf.ok&&cf.data)ST.cfg={champOpen:!!cf.data.champOpen,useReg:cf.data.useReg!==false,notice:cf.data.notice||''};
  stAdmRender();
}
function stAdmRender(){
  const box=$('stadm-body');if(!box)return;
  const tabs=`<div class="st-tabs">${ST_ADM_TABS.map(([k,n])=>`<button class="${ST_ADM.tab===k?'on':''}" data-act="adm-tab" data-v="${k}">${n}</button>`).join('')}</div>`;
  const fn={access:stAdmAccess,cards:stAdmCards,mgrs:stAdmMgrs,clubs:stAdmClubs,ann:stAdmAnn,cfg:stAdmCfg}[ST_ADM.tab]||stAdmAccess;
  box.innerHTML=tabs+'<div id="adm-pane">'+fn()+'</div>';
}
function stAdmPane(){const p=$('adm-pane');if(p){const fn={access:stAdmAccess,cards:stAdmCards,mgrs:stAdmMgrs,clubs:stAdmClubs,ann:stAdmAnn,cfg:stAdmCfg}[ST_ADM.tab];p.innerHTML=fn()}}
STA['adm-tab']=el=>{ST_ADM.tab=el.dataset.v;stAdmRender()};
const stAdmBtn=(act,k,t,cls,extra)=>`<button class="btn sm ${cls||''}" data-act="${act}" data-k="${stAttr(k)}"${extra||''}>${t}</button>`;

/* ---------- Acesso ---------- */
function stAdmAccess(){
  const L=Object.entries(ST_ADM.list).map(([k,v])=>({k,...v})).filter(x=>x.name),by=s=>L.filter(x=>x.status===s).sort((a,b)=>(b.ts||0)-(a.ts||0));
  const row=(x,btns)=>`<div class="st-admrow"><div><b>${esc(x.name)}</b><small>${x.ts?new Date(x.ts).toLocaleString('pt-BR'):''}${ST_ADM.clubs[x.k]?' • clube: '+esc(ST_ADM.clubs[x.k].name):''}</small></div><div class="row" style="gap:.4rem">${btns}</div></div>`;
  const B=stAdmBtn;
  return `<div class="st-card"><h3 class="t">Pedidos pendentes (${by('pending').length})</h3>${by('pending').map(x=>row(x,B('adm-ok',x.k,'✔ Aprovar')+B('adm-no',x.k,'✖ Recusar','sec'))).join('')||'<p class="st-fine">Nenhum pedido pendente.</p>'}</div>
  <div class="st-card"><h3 class="t">Aprovados (${by('approved').length})</h3>${by('approved').map(x=>row(x,B('adm-gift',x.k,'🎁 Presente')+B('adm-pin',x.k,'Resetar PIN','sec')+B('adm-rev',x.k,'Revogar','sec'))).join('')||'<p class="st-fine">Ninguém aprovado ainda.</p>'}</div>
  <div class="st-card"><h3 class="t">Recusados / revogados (${by('rejected').length+by('revoked').length})</h3>${[...by('rejected'),...by('revoked')].map(x=>row(x,B('adm-ok',x.k,'Aprovar'))).join('')||'<p class="st-fine">Vazio.</p>'}</div>`;
}
async function stAdmSet(k,patch){
  const cur=ST_ADM.list[k]||{};const r=await stPatch('/access/'+k,patch);
  if(!r.ok)return toast('Erro: '+r.err);
  ST_ADM.list[k]={...cur,...patch};stAdmPane();
}
STA['adm-ok']=el=>stAdmSet(el.dataset.k,{status:'approved',by:currentUser,at:Date.now()}).then(()=>toast('Acesso aprovado.'));
STA['adm-no']=el=>stAdmSet(el.dataset.k,{status:'rejected'});
STA['adm-rev']=el=>stConfirm('Revogar o acesso deste técnico?',()=>stAdmSet(el.dataset.k,{status:'revoked'}),'Revogar');
STA['adm-pin']=el=>stConfirm('Apagar o PIN? O técnico criará um novo no próximo acesso.',async()=>{const r=await stReq('PATCH','/access/'+el.dataset.k,{pin:null});if(r.ok){delete ST_ADM.list[el.dataset.k].pin;toast('PIN apagado.')}else toast(r.err)},'Resetar');
STA['adm-gift']=el=>{
  const k=el.dataset.k,u=(ST_ADM.list[k]||{}).name||k;
  stModal(`<h3 class="t">Presente para ${esc(u)}</h3><label class="st-lbl">Moedas</label><input class="fc" id="g-coins" type="number" value="5000"><label class="st-lbl">Pacote</label><select class="fc" id="g-pack"><option value="">(nenhum)</option>${Object.keys(ST_PACKS).filter(p=>p!=='inicial').map(p=>`<option value="${p}">${esc(ST_PACKS[p].n)}</option>`).join('')}</select>
  <div class="row" style="margin-top:.8rem"><button class="btn" data-act="adm-giftgo" data-u="${stAttr(u)}">Enviar</button><button class="btn sec" data-act="mclose">Cancelar</button></div>`);
};
STA['adm-giftgo']=async el=>{
  const coins=Math.max(0,Math.round(+$('g-coins').value||0)),pk=$('g-pack').value;
  const r=await stSendInbox(el.dataset.u,{type:'gift',coins,packs:pk?[pk]:[]});
  stModalClose();toast(r.ok?'Presente enviado.':'Erro: '+r.err);
};

/* ---------- Configurações ---------- */
function stAdmCfg(){
  return `<div class="st-card"><h3 class="t">Configurações do StarsTeam</h3>
    <label class="st-chk"><input type="checkbox" ${ST.cfg.champOpen?'checked':''} data-ch="adm-cfg" data-k="champOpen"> Abrir o Champions fora do fim de semana (teste)</label>
    <label class="st-chk"><input type="checkbox" ${ST.cfg.useReg?'checked':''} data-ch="adm-cfg" data-k="useReg"> Atletas cadastrados no jogo também entram nos pacotes</label>
    <label class="st-lbl">Aviso rápido (faixa no topo do hub)</label><div class="row" style="gap:.5rem"><input class="fc" id="adm-notice" value="${stAttr(ST.cfg.notice)}" maxlength="140" style="flex:1"><button class="btn sm" data-act="adm-notice">Publicar</button></div></div>
  <p class="st-fine">Aviso de segurança: o controle de acesso é feito pelo cliente e pelas regras do seu Firebase. Para proteção real, configure as regras do Realtime Database.</p>`;
}
STA['adm-cfg']=async el=>{const r=await stPatch('/cfg',{[el.dataset.k]:el.checked});if(!r.ok)toast(r.err);else{ST.cfg[el.dataset.k]=el.checked;toast('Salvo.')}};
STA['adm-notice']=async()=>{const v=$('adm-notice').value.trim();const r=await stPatch('/cfg',{notice:v});if(r.ok){ST.cfg.notice=v;toast('Aviso publicado.')}else toast(r.err)};

/* ---------- Catálogo de cartas ---------- */
const stBaseName=p=>({g:'Genérica',c:'Criada',r:'Cadastrada'})[p.src]||(p.rar==='heroi'?'Herói':p.rar==='idolo'?'Ídolo':'—');
function stCatSearch(){
  const f=ST_ADM.cflt,q=f.q.toLowerCase();
  let L=ST_DB.players.slice();
  if(f.src==='g')L=L.filter(p=>p.src==='g');else if(f.src==='c')L=L.filter(p=>p.src==='c');else if(f.src==='s')L=L.filter(p=>p.rar==='heroi'||p.rar==='idolo');
  if(f.rar)L=L.filter(p=>p.rar===f.rar);if(f.pos)L=L.filter(p=>p.pos===f.pos);
  if(q)L=L.filter(p=>p.name.toLowerCase().includes(q)||(p.club||'').toLowerCase().includes(q)||(p.leagueN||'').toLowerCase().includes(q));
  return L.sort((a,b)=>b.ovr-a.ovr);
}
function stAdmCards(){
  const f=ST_ADM.cflt,L=stCatSearch(),rem=Object.keys(ST.cat.removed||{});
  const nameOf=id=>{const p=ST_ORIG.players.find(x=>x.id===id)||ST_ORIG.mgrs.find(x=>x.id===id);return p?p.name:id};
  return `<div class="st-card"><div class="row" style="justify-content:space-between"><h3 class="t">Catálogo (${ST_DB.players.length} cartas de jogador)</h3><button class="btn" data-act="adm-newcard">➕ Nova carta</button></div>
  <div class="st-filters"><input class="fc" id="adm-cq" placeholder="Buscar nome, clube ou liga…" value="${stAttr(f.q)}" data-in="adm-cq" style="max-width:240px">
    <select class="fc" data-ch="adm-cflt" data-k="src"><option value="all">Todas</option><option value="g" ${f.src==='g'?'selected':''}>Genéricas</option><option value="c" ${f.src==='c'?'selected':''}>Criadas por você</option><option value="s" ${f.src==='s'?'selected':''}>Heróis e Ídolos</option></select>
    <select class="fc" data-ch="adm-cflt" data-k="rar"><option value="">Raridade</option>${['comum','raro','heroi','idolo','especial'].map(r=>`<option ${f.rar===r?'selected':''}>${r}</option>`).join('')}</select>
    <select class="fc" data-ch="adm-cflt" data-k="pos"><option value="">Posição</option>${Object.keys(ST_PROFILE).map(r=>`<option ${f.pos===r?'selected':''}>${r}</option>`).join('')}</select>
    ${L.length&&L.length<ST_DB.players.length?`<button class="btn sec sm" data-act="adm-rmall">🗑 Remover os ${L.length} resultados do jogo</button>`:''}</div>
  <div class="st-admlist" id="adm-clist">${stAdmCardRows(L)}</div></div>
  <div class="st-card"><h3 class="t">Removidas do jogo (${rem.length})</h3>${rem.length?rem.map(id=>`<div class="st-admrow"><div><b>${esc(nameOf(id))}</b>${ST.cat.purged[id]?'<small>também removida dos clubes</small>':''}</div>${stAdmBtn('adm-restore',id,'Restaurar','sec')}</div>`).join(''):'<p class="st-fine">Nada removido.</p>'}</div>`;
}
function stAdmCardRows(L){
  return L.slice(0,40).map(p=>`<div class="st-admrow st-cardrow"><div class="st-admcard">${stCardHTML(stPreviewCard(p),{size:'xs',tilt:false})}</div><div style="flex:1;min-width:0"><b>${esc(p.name)}</b> <small>${stBaseName(p)} • ${p.pos} ${p.ovr}</small><small>${esc(p.club||'')} • ${esc(p.leagueN||'')}</small></div>
    <div class="row" style="gap:.3rem">${p.src==='c'?stAdmBtn('adm-editcard',p.id,'✏️','sec'):''}${stAdmBtn('adm-rmcard',p.id,'🗑 Remover','sec')}</div></div>`).join('')+(L.length>40?`<p class="st-fine">Mostrando 40 de ${L.length}. Refine a busca.</p>`:'');
}
const stPreviewCard=p=>({id:'pv'+p.id,pid:p.id,kind:'player',name:p.name,pos:p.pos,alt:p.alt||[],ovr:p.ovr,nat:p.nat,league:p.league,leagueN:p.leagueN,club:p.club,clubId:p.clubId,stats:p.stats,rar:p.rar,face:p.face,hue:p.hue,src:p.src});
STA['adm-cq']=el=>{ST_ADM.cflt.q=el.value;clearTimeout(ST_ADM.qt);ST_ADM.qt=setTimeout(()=>{const l=$('adm-clist');if(l)l.innerHTML=stAdmCardRows(stCatSearch())},250)};
STA['adm-cflt']=el=>{ST_ADM.cflt[el.dataset.k]=el.value;stAdmPane()};
STA['adm-rmcard']=el=>{
  const id=el.dataset.k,p=ST_DB.byId[id];if(!p)return;
  stModal(`<h3 class="t">Remover ${esc(p.name)} do jogo?</h3><p class="st-fine">A carta deixa de cair em pacotes, mercado do sistema, draft e DME.</p>
    <label class="st-chk"><input type="checkbox" id="rm-purge"> Remover também dos clubes de quem já tem (eles recebem a venda rápida)</label>
    <div class="row" style="margin-top:.8rem"><button class="btn" data-act="adm-rmgo" data-k="${stAttr(id)}">Remover</button><button class="btn sec" data-act="mclose">Cancelar</button></div>`);
};
async function stAdmRemove(ids,purge){
  const C=ST.cat;
  for(const id of ids){
    if(C.custom[id]){await stCatSet('custom/'+id,null);delete C.custom[id]}
    else{C.removed[id]=1;await stCatSet('removed/'+id,1)}
    if(purge){C.purged[id]=1;await stCatSet('purged/'+id,1)}
  }
  stCatApply();ST.catT=Date.now();try{localStorage.setItem(ST_CAT_LS,JSON.stringify({cat:C,ann:ST.ann}))}catch(e){}
  stAdmPane();
}
STA['adm-rmgo']=async el=>{const purge=$('rm-purge').checked;stModalClose();await stAdmRemove([el.dataset.k],purge);toast('Carta removida do jogo.')};
STA['adm-rmall']=()=>{
  const L=stCatSearch();
  stModal(`<h3 class="t">Remover ${L.length} cartas do jogo?</h3><p class="st-fine">Todas as cartas que aparecem nos filtros atuais.</p><label class="st-chk"><input type="checkbox" id="rm-purge"> Remover também dos clubes (venda rápida)</label>
    <div class="row" style="margin-top:.8rem"><button class="btn" data-act="adm-rmallgo">Remover todas</button><button class="btn sec" data-act="mclose">Cancelar</button></div>`);
};
STA['adm-rmallgo']=async()=>{const purge=$('rm-purge').checked,ids=stCatSearch().map(p=>p.id);stModalClose();toast('Removendo '+ids.length+'…');await stAdmRemove(ids,purge);toast('Pronto.')};
STA['adm-restore']=async el=>{const id=el.dataset.k;delete ST.cat.removed[id];delete ST.cat.purged[id];await stCatSet('removed/'+id,null);await stCatSet('purged/'+id,null);stCatApply();stAdmPane()};

/* ---------- Formulário de carta de jogador ---------- */
function stNatOptions(sel){return Object.entries(ST_NATIONS).map(([k,v])=>`<option value="${k}" ${k===sel?'selected':''}>${esc(v.n)} (${k})</option>`).join('')+'<option value="__new">➕ Nova nação…</option>'}
function stLeagueOptions(sel){return ST_DB.leagues.map(l=>`<option value="${l.id}" ${l.id===sel?'selected':''}>${esc(l.n)}</option>`).join('')+Object.entries(ST_EXTRA_LG).map(([k,n])=>`<option value="${k}" ${k===sel?'selected':''}>${esc(n)}</option>`).join('')+`<option value="__new">➕ Outra liga…</option>`}
STA['adm-newcard']=()=>stCardForm(null);
STA['adm-editcard']=el=>stCardForm(ST.cat.custom[el.dataset.k]);
function stCardForm(d){
  const e=!!d;d=d||{name:'',pos:'ST',alt:[],ovr:75,nat:'BRA',league:ST_DB.leagues[0].id,club:'',rar:'comum',theme:'ouro'};
  ST_ADM.form={id:d.id||('c'+stUid()),img:d.img||'',crestImg:d.crestImg||'',frame:d.frame||'',nflag:''};
  const stats=d.stats&&d.stats.length===6?d.stats:ST_PROFILE[d.pos].map(o=>stClamp(Math.round(+d.ovr+o),18,99));
  stModal(`<h3 class="t">${e?'Editar':'Nova'} carta de jogador</h3><div class="st-form">
   <div class="fg"><label>Nome</label><input class="fc" id="cf-name" maxlength="28" value="${stAttr(d.name)}"></div>
   <div class="row" style="gap:.6rem"><div class="fg" style="flex:1"><label>Posição principal</label><select class="fc" id="cf-pos" data-ch="adm-cfpos">${Object.keys(ST_PROFILE).map(p=>`<option ${p===d.pos?'selected':''}>${p}</option>`).join('')}</select></div>
     <div class="fg" style="width:100px"><label>OVR</label><input class="fc" id="cf-ovr" type="number" min="40" max="99" value="${d.ovr}" data-ch="adm-cfauto"></div></div>
   <div class="fg"><label>Posições alternativas</label><div class="st-chips-sel">${Object.keys(ST_PROFILE).map(p=>`<label class="st-chk"><input type="checkbox" class="cf-alt" value="${p}" ${(d.alt||[]).includes(p)?'checked':''}>${p}</label>`).join('')}</div></div>
   <div class="row" style="gap:.6rem"><div class="fg" style="flex:1"><label>Nação</label><select class="fc" id="cf-nat" data-ch="adm-cfnat">${stNatOptions(d.nat)}</select></div>
     <div class="fg" style="flex:1"><label>Liga</label><select class="fc" id="cf-lg" data-ch="adm-cflg">${stLeagueOptions(d.league)}</select></div></div>
   <div id="cf-newnat" style="display:none" class="row"><input class="fc" id="cf-nname" placeholder="Nome da nação" style="flex:1"><label class="upl st-upl">🏳️ Bandeira<input type="file" accept="image/*" hidden data-ch="adm-cfflag"></label></div>
   <div id="cf-newlg" style="display:none"><input class="fc" id="cf-lname" placeholder="Nome da nova liga"></div>
   <div class="fg"><label>Clube (nome)</label><input class="fc" id="cf-club" list="cf-clubs" maxlength="30" value="${stAttr(d.club||'')}"><datalist id="cf-clubs">${ST_DB.clubs.map(c=>`<option value="${stAttr(c.n)}">`).join('')}</datalist></div>
   <div class="row" style="gap:.6rem"><div class="fg" style="flex:1"><label>Tipo / raridade</label><select class="fc" id="cf-rar" data-ch="adm-cfrar">${[['comum','Comum'],['raro','Raro'],['heroi','Herói'],['idolo','Ídolo'],['especial','Especial (design próprio)']].map(([k,n])=>`<option value="${k}" ${d.rar===k?'selected':''}>${n}</option>`).join('')}</select></div>
     <div class="fg" style="flex:1" id="cf-themebox" ${d.rar==='especial'?'':'style="display:none"'}><label>Estilo do especial</label><select class="fc" id="cf-theme">${ST_THEMES.map(([k,n])=>`<option value="${k}" ${d.theme===k?'selected':''}>${n}</option>`).join('')}</select></div></div>
   <div class="fg"><label>Estatísticas (${stSq&&0?'':'RIT FIN PAS DRI DEF FIS · goleiro: MER MAN CHU REF VEL POS'}) <button type="button" class="btn sec sm" data-act="adm-cfautobtn">Gerar pelo OVR</button></label><div class="st-stats6">${stats.map((v,i)=>`<input class="fc cf-st" type="number" min="1" max="99" value="${v}">`).join('')}</div></div>
   <div class="row" style="gap:.8rem;align-items:flex-start">
     <div class="st-upbox"><label>Foto do jogador</label><img id="cf-img" src="${stAttr(ST_ADM.form.img||PH)}" width="80"><label class="upl st-upl">Enviar<input type="file" accept="image/*" hidden data-ch="adm-cfimg" data-k="img"></label></div>
     <div class="st-upbox"><label>Escudo do clube</label><img id="cf-crestImg" src="${stAttr(ST_ADM.form.crestImg||PH)}" width="50"><label class="upl st-upl">Enviar<input type="file" accept="image/*" hidden data-ch="adm-cfimg" data-k="crestImg"></label></div>
     <div class="st-upbox"><label>Moldura da carta (opcional)</label><img id="cf-frame" src="${stAttr(ST_ADM.form.frame||PH)}" width="50"><label class="upl st-upl">Enviar<input type="file" accept="image/*" hidden data-ch="adm-cfimg" data-k="frame"></label></div></div>
   <label class="st-chk"><input type="checkbox" id="cf-nopack" ${d.noPack?'checked':''}> Não cai em pacotes (só por presente ou DME/recompensa)</label>
   <div class="row" style="margin-top:.8rem"><button class="btn" data-act="adm-cfsave" data-e="${e?1:''}">Salvar carta</button><button class="btn sec" data-act="mclose">Cancelar</button></div></div>`,'wide');
  stCfSync();
}
function stCfSync(){
  const lg=$('cf-lg'),nat=$('cf-nat'),rar=$('cf-rar');
  if(lg)$('cf-newlg').style.display=lg.value==='__new'?'':'none';
  if(nat)$('cf-newnat').style.display=nat.value==='__new'?'':'none';
  if(rar)$('cf-themebox').style.display=rar.value==='especial'?'':'none';
}
STA['adm-cfnat']=stCfSync;STA['adm-cflg']=stCfSync;STA['adm-cfrar']=stCfSync;
STA['adm-cfpos']=()=>STA['adm-cfautobtn']();
STA['adm-cfauto']=()=>{};
STA['adm-cfautobtn']=()=>{const pos=$('cf-pos').value,ovr=+$('cf-ovr').value||70;document.querySelectorAll('.cf-st').forEach((e,i)=>{e.value=stClamp(Math.round(ovr+ST_PROFILE[pos][i]),18,99)})};
STA['adm-cfimg']=el=>{
  const f=el.files[0];if(!f)return;const k=el.dataset.k,max=k==='img'?360:k==='frame'?420:120;
  stFileData(f,max,d=>{ST_ADM.form[k]=d;const i=$('cf-'+k);if(i)i.src=d});el.value='';
};
STA['adm-cfflag']=el=>{const f=el.files[0];if(!f)return;stFileData(f,90,d=>{ST_ADM.form.nflag=d;toast('Bandeira carregada.')});el.value=''};
STA['adm-cfsave']=async el=>{
  const F=ST_ADM.form,name=$('cf-name').value.trim(),pos=$('cf-pos').value,ovr=Math.round(+$('cf-ovr').value);
  if(name.length<2)return toast('Informe o nome da carta.');if(!(ovr>=40&&ovr<=99))return toast('OVR entre 40 e 99.');
  let nat=$('cf-nat').value;
  if(nat==='__new'){
    const nn=$('cf-nname').value.trim();if(!nn)return toast('Informe o nome da nova nação.');if(!F.nflag)return toast('Envie a bandeira da nova nação.');
    nat=('X'+stSlug(nn).replace(/-/g,'').toUpperCase()).slice(0,6);
    const r=await stCatSet('nations/'+nat,{n:nn,img:F.nflag});if(!r.ok)return toast('Erro: '+r.err);ST.cat.nations[nat]={n:nn,img:F.nflag};
  }
  let league=$('cf-lg').value,leagueN='';
  if(league==='__new'){const ln=$('cf-lname').value.trim();if(!ln)return toast('Informe o nome da nova liga.');league='x:'+stSlug(ln);leagueN=ln}
  else leagueN=ST_LEAGUE_NAME(league);
  const alt=[...document.querySelectorAll('.cf-alt:checked')].map(c=>c.value).filter(p=>p!==pos);
  const club=$('cf-club').value.trim();
  const def={id:F.id,kind:'player',name,pos,alt,ovr,nat,league,leagueN,club,clubId:'cx:'+stSlug(club),stats:[...document.querySelectorAll('.cf-st')].map(i=>stClamp(Math.round(+i.value||50),1,99)),rar:$('cf-rar').value,theme:$('cf-theme').value,noPack:$('cf-nopack').checked,img:F.img,crestImg:F.crestImg,frame:F.frame,hue:ST_ORIG_HUE(name),face:{sk:2,hr:1,st:1},ts:Date.now()};
  Object.keys(def).forEach(k=>{if(def[k]===''||def[k]===undefined)delete def[k]});
  const r=await stCatSet('custom/'+def.id,def);if(!r.ok)return toast('Erro ao salvar: '+r.err+' (o tamanho das imagens pode estar grande)');
  ST.cat.custom[def.id]=def;stCatApply();ST.catT=Date.now();try{localStorage.setItem(ST_CAT_LS,JSON.stringify({cat:ST.cat,ann:ST.ann}))}catch(e){}
  stModalClose();toast('Carta salva e publicada para todos.');stAdmPane();
};
const ST_ORIG_HUE=n=>stHash(n)%360;

/* ---------- Técnicos ---------- */
function stAdmMgrs(){
  const L=ST_MANAGERS.slice().sort((a,b)=>(b.special?1:0)-(a.special?1:0)||a.name.localeCompare(b.name,'pt'));
  return `<div class="st-card"><div class="row" style="justify-content:space-between"><h3 class="t">Técnicos (${L.length})</h3><button class="btn" data-act="adm-newmgr">➕ Novo técnico</button></div>
  <p class="st-fine">Todos os técnicos têm fundo azul-acinzentado. Os especiais têm design próprio e só são mais raros: não mudam nada no jogo.</p>
  <div class="st-admlist">${L.map(m=>`<div class="st-admrow st-cardrow"><div class="st-admcard">${stCardHTML({...m,pid:m.id,id:'pv'+m.id,kind:'manager'},{size:'xs',tilt:false})}</div><div style="flex:1;min-width:0"><b>${esc(m.name)}</b> ${m.special?'<span class="st-beta">ESPECIAL</span>':''}<small>${esc(m.leagueN||'')} • ${esc((ST_NATIONS[m.nat]||{n:m.nat}).n)}</small></div>
    <div class="row" style="gap:.3rem">${ST.cat.mgrs[m.id]?stAdmBtn('adm-editmgr',m.id,'✏️','sec'):''}${stAdmBtn('adm-rmmgr',m.id,'🗑','sec')}</div></div>`).join('')}</div></div>`;
}
STA['adm-newmgr']=()=>stMgrForm(null);
STA['adm-editmgr']=el=>stMgrForm(ST.cat.mgrs[el.dataset.k]);
function stMgrForm(d){
  const e=!!d;d=d||{name:'',nat:'BRA',league:ST_DB.leagues[0].id,special:false,theme:'ouro'};
  ST_ADM.form={id:d.id||('cm'+stUid()),img:d.img||'',frame:d.frame||'',nflag:''};
  stModal(`<h3 class="t">${e?'Editar':'Novo'} técnico</h3><div class="st-form">
   <div class="fg"><label>Nome</label><input class="fc" id="mf-name" maxlength="28" value="${stAttr(d.name)}"></div>
   <div class="row" style="gap:.6rem"><div class="fg" style="flex:1"><label>País</label><select class="fc" id="cf-nat" data-ch="adm-cfnat">${stNatOptions(d.nat)}</select></div>
     <div class="fg" style="flex:1"><label>Liga</label><select class="fc" id="cf-lg" data-ch="adm-cflg">${stLeagueOptions(d.league)}</select></div></div>
   <div id="cf-newnat" style="display:none" class="row"><input class="fc" id="cf-nname" placeholder="Nome da nação" style="flex:1"><label class="upl st-upl">🏳️ Bandeira<input type="file" accept="image/*" hidden data-ch="adm-cfflag"></label></div>
   <div id="cf-newlg" style="display:none"><input class="fc" id="cf-lname" placeholder="Nome da nova liga"></div>
   <div class="row" style="gap:.8rem;align-items:flex-start"><div class="st-upbox"><label>Imagem 100×100</label><img id="cf-img" src="${stAttr(ST_ADM.form.img||PH)}" width="80"><label class="upl st-upl">Enviar<input type="file" accept="image/*" hidden data-ch="adm-cfimg" data-k="img"></label></div></div>
   <label class="st-chk"><input type="checkbox" id="mf-special" ${d.special?'checked':''} data-ch="adm-mfspecial"> Técnico especial (design diferente, mais raro)</label>
   <div id="mf-spbox" style="display:${d.special?'':'none'}"><div class="row" style="gap:.8rem;align-items:flex-end"><div class="fg" style="flex:1"><label>Estilo</label><select class="fc" id="cf-theme">${ST_THEMES.map(([k,n])=>`<option value="${k}" ${d.theme===k?'selected':''}>${n}</option>`).join('')}</select></div>
     <div class="st-upbox"><label>Moldura própria (opcional)</label><img id="cf-frame" src="${stAttr(ST_ADM.form.frame||PH)}" width="50"><label class="upl st-upl">Enviar<input type="file" accept="image/*" hidden data-ch="adm-cfimg" data-k="frame"></label></div></div></div>
   <div class="row" style="margin-top:.8rem"><button class="btn" data-act="adm-mfsave">Salvar técnico</button><button class="btn sec" data-act="mclose">Cancelar</button></div></div>`,'wide');
  stCfSync();
}
STA['adm-mfspecial']=el=>{$('mf-spbox').style.display=el.checked?'':'none'};
STA['adm-mfsave']=async()=>{
  const F=ST_ADM.form,name=$('mf-name').value.trim();if(name.length<2)return toast('Informe o nome do técnico.');
  if(!F.img)return toast('Envie a imagem do técnico (100×100).');
  let nat=$('cf-nat').value;
  if(nat==='__new'){const nn=$('cf-nname').value.trim();if(!nn)return toast('Informe o nome da nova nação.');if(!F.nflag)return toast('Envie a bandeira da nova nação.');nat=('X'+stSlug(nn).replace(/-/g,'').toUpperCase()).slice(0,6);const r=await stCatSet('nations/'+nat,{n:nn,img:F.nflag});if(!r.ok)return toast('Erro: '+r.err);ST.cat.nations[nat]={n:nn,img:F.nflag}}
  let league=$('cf-lg').value,leagueN='';
  if(league==='__new'){const ln=$('cf-lname').value.trim();if(!ln)return toast('Informe o nome da nova liga.');league='x:'+stSlug(ln);leagueN=ln}else leagueN=ST_LEAGUE_NAME(league);
  const sp=$('mf-special').checked,def={id:F.id,kind:'manager',name,nat,league,leagueN,img:F.img,special:sp,theme:sp?$('cf-theme').value:'',frame:sp?F.frame:'',ts:Date.now()};
  Object.keys(def).forEach(k=>{if(def[k]===''||def[k]===undefined)delete def[k]});
  const r=await stCatSet('mgrs/'+def.id,def);if(!r.ok)return toast('Erro ao salvar: '+r.err);
  ST.cat.mgrs[def.id]=def;stCatApply();try{localStorage.setItem(ST_CAT_LS,JSON.stringify({cat:ST.cat,ann:ST.ann}))}catch(e){}
  stModalClose();toast('Técnico salvo e publicado.');stAdmPane();
};
STA['adm-rmmgr']=el=>{
  const id=el.dataset.k,m=ST_MANAGERS.find(x=>x.id===id);if(!m)return;
  stModal(`<h3 class="t">Remover ${esc(m.name)}?</h3><label class="st-chk"><input type="checkbox" id="rm-purge"> Remover também dos clubes (compensação em moedas)</label><div class="row" style="margin-top:.8rem"><button class="btn" data-act="adm-rmgo" data-k="${stAttr(id)}">Remover</button><button class="btn sec" data-act="mclose">Cancelar</button></div>`);
};
(function(){const o=STA['adm-rmgo'];STA['adm-rmgo']=async el=>{const id=el.dataset.k,purge=$('rm-purge').checked;stModalClose();
  const isMgr=!!ST_MANAGERS.find(x=>x.id===id);
  if(isMgr&&ST.cat.mgrs[id]){await stCatSet('mgrs/'+id,null);delete ST.cat.mgrs[id];if(purge){ST.cat.purged[id]=1;await stCatSet('purged/'+id,1)}stCatApply();stAdmPane();return toast('Técnico removido.')}
  await stAdmRemove([id],purge);toast('Removido do jogo.')}})();

/* ---------- Clubes: adicionar e remover cartas ---------- */
function stAdmClubs(){
  const users=Object.entries(ST_ADM.list).filter(([,v])=>v&&v.name&&v.status==='approved').map(([k,v])=>({k,n:v.name}));
  if(isAdmin()&&!users.find(u=>u.n===currentUser))users.unshift({k:stKey(currentUser),n:currentUser});
  const uc=ST_ADM.uc;
  let body='<p class="st-fine">Escolha um técnico para ver e alterar as cartas dele.</p>';
  if(uc==='loading')body='<div class="st-load"><div class="st-spin"></div></div>';
  else if(uc){
    const cards=Object.values(uc.cards||{}).sort((a,b)=>(b.ovr||0)-(a.ovr||0));
    body=`<h4 class="st-h4">${esc(uc.name)} — ${stFmt(uc.coins||0)} 🪙 • ${cards.length} cartas</h4>
    <div class="st-card"><h4 class="st-h4">Adicionar carta ao clube</h4><div class="row" style="gap:.5rem"><input class="fc" id="adm-addq" placeholder="Buscar jogador, técnico ou estádio…" data-in="adm-addq" style="flex:1"></div><div class="st-admlist" id="adm-addlist"><p class="st-fine">Digite para buscar.</p></div></div>
    <div class="st-card"><h4 class="st-h4">Cartas do clube</h4><div class="st-admlist">${cards.map(c=>`<div class="st-admrow"><div><b>${esc(c.name)}</b><small>${c.kind==='player'?c.pos+' • OVR '+c.ovr:c.kind==='manager'?'Técnico':'Estádio'}</small></div>${stAdmBtn('adm-rmuc',c.id,'🗑 Remover','sec')}</div>`).join('')||'<p class="st-fine">Clube sem cartas.</p>'}</div></div>
    <p class="st-fine">As alterações chegam ao técnico na próxima vez que ele abrir ou atualizar o StarsTeam.</p>`;
  }
  return `<div class="st-card"><h3 class="t">Clubes dos técnicos</h3><select class="fc" data-ch="adm-uc" style="max-width:300px"><option value="">Escolher técnico…</option>${users.map(u=>`<option value="${stAttr(u.k)}" ${ST_ADM.ucKey===u.k?'selected':''}>${esc(u.n)}</option>`).join('')}</select>${body}</div>`;
}
STA['adm-uc']=async el=>{
  const k=el.value;ST_ADM.ucKey=k;if(!k){ST_ADM.uc=null;return stAdmPane()}
  ST_ADM.uc='loading';stAdmPane();
  const r=await stGet('/clubs/'+k);
  if(!r.ok||!r.data){ST_ADM.uc=null;stAdmPane();return toast('Este técnico ainda não tem clube na nuvem.')}
  const c=r.data;c.cards=c.cards||{};ST_ADM.uc=c;ST_ADM.ucUser=(ST_ADM.list[k]||{}).name||c.user||k;stAdmPane();
};
function stAdmAddSearch(q){
  q=q.toLowerCase();if(q.length<2)return [];
  const out=[];
  ST_DB.players.forEach(p=>{if(p.name.toLowerCase().includes(q))out.push({id:p.id,t:`${p.name} • ${p.pos} ${p.ovr}`,k:'Jogador'})});
  ST_MANAGERS.forEach(m=>{if(m.name.toLowerCase().includes(q))out.push({id:m.id,t:m.name,k:'Técnico'})});
  stStadiumsAll().forEach(s=>{if(s.name.toLowerCase().includes(q))out.push({id:s.id,t:s.name,k:'Estádio'})});
  return out.slice(0,30);
}
STA['adm-addq']=el=>{const l=$('adm-addlist');if(!l)return;const r=stAdmAddSearch(el.value);l.innerHTML=r.map(x=>`<div class="st-admrow"><div><b>${esc(x.t)}</b><small>${x.k}</small></div>${stAdmBtn('adm-adduc',x.id,'➕ Adicionar')}</div>`).join('')||'<p class="st-fine">Nada encontrado.</p>'};
STA['adm-adduc']=async el=>{
  const u=ST_ADM.ucUser;if(!u)return;
  const r=await stSendInbox(u,{type:'addcard',pid:el.dataset.k});toast(r.ok?'Carta enviada ao clube de '+u+'.':'Erro: '+r.err);
};
STA['adm-rmuc']=async el=>{
  const u=ST_ADM.ucUser;if(!u)return;
  const r=await stSendInbox(u,{type:'rmcard',cardId:el.dataset.k});
  if(r.ok){delete ST_ADM.uc.cards[el.dataset.k];toast('Remoção enviada para '+u+'.');stAdmPane()}else toast('Erro: '+r.err);
};

/* ---------- Anúncios ---------- */
function stAdmAnn(){
  return `<div class="st-card"><h3 class="t">Novo anúncio</h3><div class="st-form"><div class="fg"><label>Título</label><input class="fc" id="an-title" maxlength="70"></div>
   <div class="fg"><label>Texto</label><textarea class="fc" id="an-text" rows="4" maxlength="800"></textarea></div>
   <div class="row" style="gap:.8rem;align-items:flex-start"><div class="st-upbox"><label>Imagem (opcional)</label><img id="an-img" src="${stAttr(ST_ADM.f.annImg||PH)}" width="120"><label class="upl st-upl">Enviar<input type="file" accept="image/*" hidden data-ch="adm-annimg"></label></div></div>
   <div class="fg"><label>Coleção de cartas em destaque (opcional)</label><input class="fc" id="an-search" placeholder="Buscar carta para destacar…" data-in="adm-annq"><div class="st-admlist" id="an-res"></div><div class="st-chips" id="an-sel">${(ST_ADM.f.annCards||[]).map(id=>`<span>${esc((ST_DB.byId[id]||{name:id}).name)} <a data-act="adm-annrm" data-k="${id}" style="cursor:pointer">✖</a></span>`).join('')}</div></div>
   <button class="btn" data-act="adm-annpub">📢 Publicar anúncio</button></div></div>
  <div class="st-card"><h3 class="t">Anúncios publicados (${ST.ann.length})</h3>${ST.ann.map(a=>`<div class="st-admrow"><div><b>${esc(a.title)}</b><small>${a.ts?new Date(a.ts).toLocaleString('pt-BR'):''}</small></div>${stAdmBtn('adm-anndel',a.id,'🗑 Apagar','sec')}</div>`).join('')||'<p class="st-fine">Nenhum anúncio.</p>'}</div>`;
}
STA['adm-annimg']=el=>{const f=el.files[0];if(!f)return;stFileData(f,900,d=>{ST_ADM.f.annImg=d;const i=$('an-img');if(i)i.src=d},'jpeg');el.value=''};
STA['adm-annq']=el=>{const r=el.value.length<2?[]:ST_DB.players.filter(p=>p.name.toLowerCase().includes(el.value.toLowerCase())).slice(0,10);$('an-res').innerHTML=r.map(p=>`<div class="st-admrow"><div><b>${esc(p.name)}</b><small>${p.pos} ${p.ovr}</small></div>${stAdmBtn('adm-annadd',p.id,'➕')}</div>`).join('')};
STA['adm-annadd']=el=>{const a=ST_ADM.f.annCards=ST_ADM.f.annCards||[];if(!a.includes(el.dataset.k))a.push(el.dataset.k);const t=$('an-title').value,x=$('an-text').value;stAdmPane();$('an-title').value=t;$('an-text').value=x};
STA['adm-annrm']=el=>{ST_ADM.f.annCards=(ST_ADM.f.annCards||[]).filter(i=>i!==el.dataset.k);const t=$('an-title').value,x=$('an-text').value;stAdmPane();$('an-title').value=t;$('an-text').value=x};
STA['adm-annpub']=async()=>{
  const title=$('an-title').value.trim(),text=$('an-text').value.trim();if(!title)return toast('Dê um título ao anúncio.');
  const a={title,text,img:ST_ADM.f.annImg||'',cards:ST_ADM.f.annCards||[],ts:Date.now()};if(!a.img)delete a.img;if(!a.cards.length)delete a.cards;
  const r=await stPost('/ann',a);if(!r.ok)return toast('Erro: '+r.err);
  ST_ADM.f.annImg='';ST_ADM.f.annCards=[];ST.catT=0;await stCatLoad(true);toast('Anúncio publicado!');stAdmPane();
};
STA['adm-anndel']=el=>stConfirm('Apagar este anúncio?',async()=>{await stDel('/ann/'+el.dataset.k);ST.catT=0;await stCatLoad(true);stAdmPane()},'Apagar');
