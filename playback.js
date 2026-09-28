let playback=null, frame=0, lastFrame=0, fraction=0, playing=false;
const el=id=>document.getElementById(id);
const fmt=n=>Number(n.toFixed(1));
const live=document.createElement('section');
live.className='card live-card';live.hidden=true;
live.innerHTML=`<div class="card-header"><span class="card-title">CPU • Live Simulation</span><span id="live-label"></span></div>
<div class="card-body"><div class="play-controls"><button class="btn btn-ghost" id="back">◀ Step</button><button class="btn btn-accent" id="play">▶ Play / เล่นต่อ</button><button class="btn btn-accent" id="pause" disabled>⏸ หยุดชั่วคราว</button><button class="btn btn-ghost" id="next">Step ▶</button><label>ความเร็ว <select id="speed"><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="4">4×</option></select></label><strong class="clock">t = <span id="clock">0</span></strong></div>
<div class="text-muted text-sm">1× = 1 วินาทีต่อ time unit · Step เดินครั้งละ 1 หน่วย · ย้อนกลับเพื่อดูเหตุการณ์ซ้ำได้</div>
<div class="machine"><div><div class="fl">Ready Queue → CPU</div><div id="ready" class="queue"></div></div><div id="cpu" class="cpu"></div></div>
<div id="process-progress"></div><div id="events" class="event-log" aria-live="polite"></div>
<p class="text-muted text-sm">Tie: Arrival ก่อน → PID · Preempt เฉพาะค่าที่ดีกว่า · RR: Process ที่มาถึงตรงขอบ Quantum เข้าคิวก่อนตัวที่ถูกส่งกลับ · ไม่คิดเวลา Context Switch</p></div>`;
el('gantt-card').before(live);
function config(){return {alg:el('algo-sel').value,mode:document.querySelector('[name="mode"]:checked').value,q:Number(el('rr-q').value),lower:document.querySelector('[name="pconv"]:checked').value==='lower'};}
function syncPlaybackControls(){
  const done=playback && finished();
  el('play').disabled=!playback || playing || done;
  el('pause').disabled=!playing;
  if(playback)el('run-status').textContent=done ? 'เสร็จสิ้นที่ t = '+current().t : playing ? 'กำลังจำลอง — ผลลัพธ์ปรากฏตามเวลาที่ผ่านไป' : 'หยุดชั่วคราว — กด Play เพื่อเล่นต่อจากเวลาเดิม';
}
function pause(){playing=false;cancelAnimationFrame(frame);syncPlaybackControls();}
function advance(){
  if(playback.index<playback.history.length-1)playback.index++;
  else if(!playback.model.done()){playback.history.push(playback.model.tick());playback.index++;}
}
function current(){return playback.history[playback.index];}
function finished(){return current().ps.every(p=>p.ct!==null);}
function play(){if(!playback||playing||finished())return;playing=true;lastFrame=performance.now();syncPlaybackControls();frame=requestAnimationFrame(animate);}
function animate(now){
  if(!playing)return;
  fraction+=Math.min((now-lastFrame)/1000,0.2)*Number(el('speed').value);lastFrame=now;
  while(fraction>=1&&!finished()){fraction-=1;advance();}
  if(finished()){fraction=0;pause();}
  draw();if(playing)frame=requestAnimationFrame(animate);
}
el('play').onclick=play;
el('pause').onclick=pause;
el('next').onclick=()=>{pause();fraction=0;advance();draw();};
el('back').onclick=()=>{pause();fraction=0;playback.index=Math.max(0,playback.index-1);draw();};
runSimulation=function(){
  if(!procs.length){toast('เพิ่ม Process ก่อน');return;}
  const cfg=config();
  if(!Number.isInteger(cfg.q)||cfg.q<1||cfg.q>99){toast('Quantum ต้องเป็นจำนวนเต็ม 1–99');return;}
  pause();fraction=0;
  const model=createSchedule(procs,cfg);playback={model,history:[model.snapshot()],index:0,cfg};
  lastSim=null;live.hidden=false;el('placeholder-card').hidden=true;el('gantt-card').hidden=false;el('results-area').hidden=false;
  el('algo-badge').textContent=getLabel();el('live-label').textContent=getLabel();el('run-status').textContent='กำลังจำลอง — ผลลัพธ์ปรากฏตามเวลาที่ผ่านไป';
  draw();play();live.scrollIntoView({behavior:'smooth',block:'start'});
};
const originalReset=resetResults;
resetResults=function(){pause();playback=null;fraction=0;live.hidden=true;originalReset();};
function draw(){
  const s=current(),time=s.t+fraction,done=finished(),active=s.ps.find(p=>p.id===s.cpu);
  el('clock').textContent=fmt(time);el('back').disabled=s.t===0;el('next').disabled=done;syncPlaybackControls();
  el('cpu').style.borderColor=active?.color||'var(--border)';el('cpu').innerHTML=`<span class="fl">${done?'Completed':'CPU'}</span><strong>${s.cpu||(done?'✓':'Idle')}</strong><span>${active?`เหลือ ${fmt(active.remaining-fraction)} / ${active.bt} units`:done?'ทุก Process เสร็จแล้ว':'รอ Process มาถึง'}</span>${playback.cfg.alg==='rr'&&active?`<small>Quantum ${fmt(s.slice+fraction)} / ${playback.cfg.q}</small>`:''}`;
  const queueHTML=s.queue.map((id,i)=>{const p=s.ps.find(p=>p.id===id);return `<div class="queue-item" style="border-color:${p.color}"><b>${id}</b><small>เหลือ ${p.remaining} · Pr ${p.pr}</small>${i===0?'<small>ถัดไป</small>':''}</div>`;}).join('')||'<span class="text-muted">คิวว่าง</span>';
  if(el('ready').innerHTML!==queueHTML)el('ready').innerHTML=queueHTML;
  el('process-progress').innerHTML=s.ps.map(p=>{
    const used=p.used+(p.id===s.cpu?fraction:0),status=p.ct!==null?'เสร็จแล้ว':p.id===s.cpu?'กำลังใช้ CPU':p.at>s.t?'ยังไม่มาถึง':'รอ CPU';
    const waiting=Math.max(0,Math.min(time,p.ct??time)-p.at-used);
    return `<div class="process-line"><b>${p.id}</b><div><div class="progress-caption"><span>${status}</span><span>ใช้ ${fmt(used)} / ${p.bt} · รอ ${fmt(waiting)}</span></div><div class="track"><div style="width:${used/p.bt*100}%;background:${p.color}"></div></div></div></div>`;
  }).join('');
  const messages=playback.history.slice(0,playback.index+1).filter(x=>x.events.length).slice(-5).reverse();
  const eventHTML=messages.map(x=>`<div><b>t=${x.t}</b> ${x.events.join(' · ')}</div>`).join('');
  if(el('events').innerHTML!==eventHTML)el('events').innerHTML=eventHTML;
  const g=[];
  for(let i=0;i<=playback.index;i++){
    const h=playback.history[i],end=i===playback.index?time:h.t+1;if(end<=h.t)continue;
    const id=h.cpu||'idle',last=g[g.length-1];
    if(last&&last.id===id&&!(playback.cfg.alg==='rr'&&h.slice===0&&h.cpu))last.e=end;else g.push({id,s:h.t,e:end});
  }
  el('gantt-inner').innerHTML=`<div class="live-gantt" style="width:${Math.max(600,time*44+60)}px">${g.map(b=>`<div class="live-block" style="left:${b.s*44}px;width:${(b.e-b.s)*44}px;background:${s.ps.find(p=>p.id===b.id)?.color||'var(--idle-bg)'}" title="${b.id}: ${b.s} → ${fmt(b.e)}"><span>${b.id}</span><small>${b.s}</small></div>`).join('')}<div class="playhead" style="left:${time*44}px"><small>${fmt(time)}</small></div></div>`;
  el('gantt-legend').textContent='Timeline ที่เกิดขึ้นแล้ว · หน่วยเวลาเท่ากันมีความกว้างเท่ากัน';
  if(playing){const scroll=el('gantt-inner').parentElement;scroll.scrollLeft=Math.max(0,time*44-scroll.clientWidth+80);}
  el('res-tbody').innerHTML=s.ps.map(p=>`<tr><td>${p.id}</td><td>${p.at}</td><td>${p.bt}</td><td>${p.pr}</td><td>${p.ct??'—'}</td><td>${p.ct===null?'—':p.ct-p.at}</td><td>${p.ct===null?'—':p.ct-p.at-p.bt}</td><td>${p.first===null?'—':p.first-p.at}</td></tr>`).join('');
  if(done){const r=Object.fromEntries(s.ps.map(p=>[p.id,{ct:p.ct,tat:p.ct-p.at,wt:p.ct-p.at-p.bt,rt:p.first-p.at}]));renderMetrics(r);renderResTbl(r);el('run-status').textContent=`เสร็จสิ้นที่ t = ${s.t}`;}
  else {el('metrics-grid').innerHTML='<div class="info-chip">ค่าเฉลี่ยสรุปจะแสดงเมื่อทุก Process เสร็จ · CT / TAT / WT แสดงเมื่อ Process นั้นเสร็จ · RT แสดงเมื่อเริ่มใช้ CPU ครั้งแรก</div>';el('run-status').textContent='กำลังจำลอง — ผลลัพธ์ปรากฏตามเวลาที่ผ่านไป';}
  syncPlaybackControls();
  el('cmp-card').hidden=!(done&&el('chk-cmp').checked);if(done&&el('chk-cmp').checked)renderCmp();
}
// Changing the problem invalidates its timeline, including any pending animation.
for(const name of ['addProcess','removeProc','loadPreset']){const fn=window[name];window[name]=function(...args){resetResults();return fn(...args);};}
document.querySelectorAll('#algo-sel,#rr-q,[name="mode"],[name="pconv"]').forEach(input=>input.addEventListener('change',resetResults));
el('chk-cmp').addEventListener('change',()=>{if(playback)draw();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
