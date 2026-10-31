/* ===================== NUVEM / SINCRONIZAÇÃO ===================== */
const DEFAULT_DB='https://stars-simulator-default-rtdb.firebaseio.com';
const DEFAULT_CODE='publico';
let CL=load('stars_cloud',{url:'',code:''}),clT=null;
if(!CL.url)CL.url=DEFAULT_DB;
if(!CL.code)CL.code=DEFAULT_CODE;
const KEYS=['stars_teams','stars_players','stars_logs','stars_leagues','stars_season','stars_ads','stars_totw'];
const cloudOn=()=>!!(CL.url&&CL.code);
const cloudUrl=()=>CL.url.replace(/\/+$/,'')+'/stars/'+encodeURIComponent(CL.code)+'.json';
function cloudStatus(m){const e=$('cl-status');if(e)e.textContent=m}
function cloudDirty(){if(!cloudOn())return;clearTimeout(clT);clT=setTimeout(sync,1500)}
function cloudApply(d){KEYS.forEach(k=>{if(d[k]!=null)localStorage.setItem(k,d[k]);else localStorage.removeItem(k)});localStorage.setItem('stars_ts',d._ts||Date.now());location.reload()}
function openCloud(){if(!isAdmin())return toast(MSG_ADM);$('cl-url').value=CL.url;$('cl-code').value=CL.code;$('m-cloud').classList.add('on');cloudStatus(cloudOn()?'Nuvem configurada.':'Nuvem desligada.')}
function saveCloud(){
  if(!isAdmin())return toast(MSG_ADM);
  CL={url:$('cl-url').value.trim(),code:$('cl-code').value.trim()};
  localStorage.setItem('stars_cloud',JSON.stringify(CL));
  if(cloudOn()){cloudStatus('Conectando...');sync()}else cloudStatus('Nuvem desligada.');
}
function exportData(){const d={};KEYS.forEach(k=>d[k]=localStorage.getItem(k));const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(d)],{type:'application/json'}));a.download='stars-simulator-backup.json';a.click()}
function importData(ev){
  if(!isAdmin())return toast(MSG_ADM);
  const f=ev.target.files[0];if(!f)return;const r=new FileReader();
  r.onload=e=>{try{const d=JSON.parse(e.target.result);cloudApply({...d,_ts:Date.now()})}catch(x){toast('Arquivo de backup inválido.')}};
  r.readAsText(f);
}
const mergeLists=(a,b,del)=>{
  const loc=new Map(a.map(o=>[o.id,o])),cl=new Map(b.map(o=>[o.id,o])),res=[];
  a.forEach(o=>{const co=cl.get(o.id);res.push(co&&(co._m||0)>(o._m||0)?co:o)});
  b.forEach(o=>{if(!loc.has(o.id))res.push(o)});
  return res.filter(o=>!(del[o.id]&&del[o.id]>(o._m||0)));
};
function mergeLogs(a,b){
  const seen=new Set(),out=[];
  [...a,...b].forEach(l=>{const key=l.date+'|'+l.user+'|'+l.text;if(!seen.has(key)){seen.add(key);out.push(l)}});
  return out.slice(0,500);
}
function syncBusy(){
  if(ST_LIVE)return true;
  if(M&&['running','hold','paused','event','pen','injury','break'].includes(M.status))return true;
  if(M&&M.ctx)return true;
  return !!document.querySelector('.modal.on:not(#m-cloud):not(#m-ads):not(#m-coach)');
}
async function sync(){
  if(!cloudOn()||SYNC||syncBusy())return;
  SYNC=true;
  try{
    const r=await fetch(cloudUrl());
    if(!r.ok)throw new Error('HTTP '+r.status+(r.status===401||r.status===403?' — regras do Firebase bloqueando (libere leitura/escrita)':''));
    const c=(await r.json())||{};
    if(syncBusy())return;
    const cd=JSON.parse(c.stars_del||'{}'),del={...cd};
    Object.keys(DEL).forEach(i=>{del[i]=Math.max(del[i]||0,DEL[i])});
    const res={};let diff=false;
    MK.forEach(k=>{
      const m=mergeLists(JSON.parse(localStorage.getItem(k)||'[]'),JSON.parse(c[k]||'[]'),del),s=JSON.stringify(m);
      res[k]=s;if(s!==localStorage.getItem(k))diff=true;
    });
    const lg=JSON.stringify(mergeLogs(JSON.parse(localStorage.getItem('stars_logs')||'[]'),JSON.parse(c.stars_logs||'[]')));
    res.stars_logs=lg;if(lg!==localStorage.getItem('stars_logs'))diff=true;
    const personal=CL.code!==DEFAULT_CODE;
    if(personal)['stars_season'].forEach(k=>{
      if(c[k]!=null&&(+c._ts||0)>(+localStorage.getItem('stars_ts')||0)){res[k]=c[k];if(c[k]!==localStorage.getItem(k))diff=true}
    });
    const delS=JSON.stringify(del);
    if(diff){
      MERGING=true;
      try{
        HID.teams=[];HID.players=[];
        Object.entries(res).forEach(([k,v])=>localStorage.setItem(k,v));
        localStorage.setItem('stars_del',delS);DEL=del;
        localStorage.setItem('stars_ts',Math.max(+c._ts||0,+localStorage.getItem('stars_ts')||0));
      }finally{MERGING=false}
      teams=load('stars_teams',[]);players=load('stars_players',[]);leagues=load('stars_leagues',[]);logs=load('stars_logs',[]);
      if(personal)S=load('stars_season',null);
      applyVis();rebuildSnap();refreshAll();renderLogs();
    }else DEL=del;
    const body={_ts:+localStorage.getItem('stars_ts')||Date.now(),stars_del:delS};
    let need=c.stars_del!==delS;
    [...MK,'stars_logs'].forEach(k=>{body[k]=localStorage.getItem(k)||'[]';if(c[k]!==body[k])need=true});
    if(personal)['stars_season'].forEach(k=>{const v=localStorage.getItem(k);if(v!=null){body[k]=v;if(c[k]!==v)need=true}});
    if(need){
      const w=await fetch(cloudUrl(),{method:'PATCH',body:JSON.stringify(body)});
      if(!w.ok)throw new Error('HTTP '+w.status+(w.status===401||w.status===403?' — regras do Firebase bloqueando a escrita':''));
    }
    cloudStatus('☁️ Sincronizado às '+new Date().toLocaleTimeString('pt-BR')+(personal?' (conta própria)':' (banco padrão)'));
  }catch(e){cloudStatus('⚠️ Falha na sincronização: '+e.message)}
  finally{SYNC=false}
}
const cloudPush=()=>sync(),cloudPull=()=>sync();
setInterval(sync,20000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){sync();adSync();twSync()}});
window.addEventListener('online',()=>{sync();adSync();twSync()});
