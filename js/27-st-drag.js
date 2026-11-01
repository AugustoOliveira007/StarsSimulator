/* ===================== STARSTEAM — ARRASTAR E SOLTAR (mouse e toque) ===================== */
(function(){
  let D=null,ghost=null,hover=null;
  ST.dragEnd=0;
  const clear=()=>{if(hover){hover.classList.remove('drop');hover=null}};
  document.addEventListener('pointerdown',e=>{
    const el=e.target.closest&&e.target.closest('[data-drag]');
    if(!el||!el.closest('.st-scope')||(e.pointerType==='mouse'&&e.button!==0))return;
    D={id:el.dataset.drag,x:e.clientX,y:e.clientY,el,started:false};
  },true);
  document.addEventListener('pointermove',e=>{
    if(!D)return;
    if(!D.started){
      if(Math.hypot(e.clientX-D.x,e.clientY-D.y)<8)return;
      const c=ST.club&&ST.club.cards[D.id];if(!c){D=null;return}
      D.started=true;
      ghost=document.createElement('div');ghost.className='st-ghost st-scope';ghost.innerHTML=stCardHTML(c,{size:'sm',tilt:false});
      document.body.appendChild(ghost);D.el.classList.add('dragging');document.body.classList.add('st-dragging');
    }
    e.preventDefault();
    ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';
    ghost.style.display='none';const t=document.elementFromPoint(e.clientX,e.clientY);ghost.style.display='';
    const tg=t&&t.closest&&t.closest('[data-t][data-i],.st-colpanel');
    if(tg!==hover){clear();hover=tg;if(tg)tg.classList.add('drop')}
  },{passive:false,capture:true});
  const end=e=>{
    if(!D)return;
    const was=D;D=null;
    if(!was.started)return;
    const tg=hover;clear();
    if(ghost){ghost.remove();ghost=null}
    was.el.classList.remove('dragging');document.body.classList.remove('st-dragging');
    ST.dragEnd=Date.now();
    if(!tg||!ST.club)return;
    const sq=ST.club.squads[ST.club.sq];
    if(tg.classList.contains('st-colpanel')){stUnplace(sq,was.id)}
    else{
      const t=tg.dataset.t,i=+tg.dataset.i;
      if(!stPlace(sq,was.id,t,i)){toast('Essa carta não pode ocupar essa posição (goleiro só no gol).');return}
    }
    stSave({pub:true});stGo('squad',null,true);
  };
  document.addEventListener('pointerup',end,true);
  document.addEventListener('pointercancel',end,true);
  document.addEventListener('click',e=>{if(Date.now()-ST.dragEnd<350&&e.target.closest&&e.target.closest('.st-scope')){e.stopPropagation();e.preventDefault()}},true);
  document.addEventListener('dragstart',e=>{if(e.target.closest&&e.target.closest('[data-drag]'))e.preventDefault()},true);
})();
