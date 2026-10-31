/* ===================== STARSTEAM — PAINEL DO ADMIN (aprovação do beta) ===================== */
const ST_ADM={list:{},clubs:{},busy:false,msg:''};
async function stAdmLoad(){
  const box=$('stadm-body');if(!box)return;
  if(!isAdmin()){box.innerHTML='<p>Acesso restrito ao MingauCoach.</p>';return}
  if(!stCloudOk()){box.innerHTML='<div class="st-notice">Conecte a nuvem (☁️) para gerenciar o beta.</div>';return}
  box.innerHTML='<div class="st-load"><div class="st-spin"></div></div>';
  const [a,cl,cf]=await Promise.all([stGet('/access'),stGet('/pub'),stGet('/cfg')]);
  if(!a.ok){box.innerHTML=`<div class="st-notice">Erro ao ler a nuvem: ${esc(a.err)}</div>`;return}
  ST_ADM.list=a.data||{};ST_ADM.clubs=(cl.ok&&cl.data)||{};
  if(cf.ok&&cf.data)ST.cfg={champOpen:!!cf.data.champOpen,useReg:cf.data.useReg!==false,notice:cf.data.notice||''};
  stAdmRender();
}
function stAdmRender(){
  const box=$('stadm-body');if(!box)return;
  const L=Object.entries(ST_ADM.list).map(([k,v])=>({k,...v})).filter(x=>x.name),by=s=>L.filter(x=>x.status===s).sort((a,b)=>(b.ts||0)-(a.ts||0));
  const row=(x,btns)=>`<div class="st-admrow"><div><b>${esc(x.name)}</b><small>${x.ts?new Date(x.ts).toLocaleString('pt-BR'):''}${ST_ADM.clubs[x.k]?' • clube: '+esc(ST_ADM.clubs[x.k].name):''}</small></div><div class="row" style="gap:.4rem">${btns}</div></div>`;
  const B=(act,k,t,cls)=>`<button class="btn sm ${cls||''}" data-act="${act}" data-k="${stAttr(k)}">${t}</button>`;
  box.innerHTML=`
  <div class="st-card"><h3 class="t">Pedidos pendentes (${by('pending').length})</h3>${by('pending').map(x=>row(x,B('adm-ok',x.k,'✔ Aprovar')+B('adm-no',x.k,'✖ Recusar','sec'))).join('')||'<p class="st-fine">Nenhum pedido pendente.</p>'}</div>
  <div class="st-card"><h3 class="t">Aprovados (${by('approved').length})</h3>${by('approved').map(x=>row(x,B('adm-gift',x.k,'🎁 Presente')+B('adm-pin',x.k,'Resetar PIN','sec')+B('adm-rev',x.k,'Revogar','sec'))).join('')||'<p class="st-fine">Ninguém aprovado ainda.</p>'}</div>
  <div class="st-card"><h3 class="t">Recusados / revogados (${by('rejected').length+by('revoked').length})</h3>${[...by('rejected'),...by('revoked')].map(x=>row(x,B('adm-ok',x.k,'Aprovar'))).join('')||'<p class="st-fine">Vazio.</p>'}</div>
  <div class="st-card"><h3 class="t">Configurações do StarsTeam</h3>
    <label class="st-chk"><input type="checkbox" ${ST.cfg.champOpen?'checked':''} data-ch="adm-cfg" data-k="champOpen"> Abrir o Champions fora do fim de semana (teste)</label>
    <label class="st-chk"><input type="checkbox" ${ST.cfg.useReg?'checked':''} data-ch="adm-cfg" data-k="useReg"> Atletas cadastrados no jogo também entram nos pacotes</label>
    <label class="st-lbl">Aviso para todos</label><div class="row" style="gap:.5rem"><input class="fc" id="adm-notice" value="${stAttr(ST.cfg.notice)}" maxlength="140" style="flex:1"><button class="btn sm" data-act="adm-notice">Publicar</button></div></div>
  <p class="st-fine">Aviso de segurança: o controle de acesso é feito pelo cliente e pelas regras do seu Firebase. Para proteção real, configure as regras do Realtime Database.</p>`;
}
async function stAdmSet(k,patch){
  const cur=ST_ADM.list[k]||{};const r=await stPatch('/access/'+k,patch);
  if(!r.ok)return toast('Erro: '+r.err);
  ST_ADM.list[k]={...cur,...patch};stAdmRender();
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
STA['adm-cfg']=async el=>{const r=await stPatch('/cfg',{[el.dataset.k]:el.checked});if(!r.ok)toast(r.err);else{ST.cfg[el.dataset.k]=el.checked;toast('Salvo.')}};
STA['adm-notice']=async()=>{const v=$('adm-notice').value.trim();const r=await stPatch('/cfg',{notice:v});if(r.ok){ST.cfg.notice=v;toast('Aviso publicado.')}else toast(r.err)};
