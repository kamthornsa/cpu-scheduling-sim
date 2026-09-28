/* Integer-time scheduling model. Each snapshot is the state after dispatch at t. */
function createSchedule(input, config) {
  const ps = input.map(p => ({...p, remaining:p.bt, used:0, first:null, ct:null}));
  let t=0, cpu=null, slice=0, queue=[], events=[];
  const tie=(a,b)=>a.at-b.at || a.id.localeCompare(b.id, 'en', {numeric:true});
  const rank=(a,b)=> (config.alg==='sjf' ? a.remaining-b.remaining : config.alg==='priority' ? (a.pr-b.pr)*(config.lower?1:-1) : 0) || tie(a,b);
  function dispatch(previous=null) {
    const arrivals=ps.filter(p=>p.at===t).sort(tie);
    arrivals.forEach(p=>{queue.push(p);events.push(`${p.id} เข้าสู่ Ready Queue`);});
    if(cpu && cpu.remaining===0){cpu.ct=t;events.push(`${cpu.id} ทำงานเสร็จ`);cpu=null; slice=0;}
    if(cpu && config.alg==='rr' && slice===config.q){events.push(`${cpu.id} หมด Quantum → กลับท้ายคิว`);queue.push(cpu);cpu=null;slice=0;}
    if(config.alg!=='rr') queue.sort(rank);
    if(cpu && config.mode==='p' && ['sjf','priority'].includes(config.alg) && queue.length){
      const better=config.alg==='sjf' ? queue[0].remaining<cpu.remaining : (queue[0].pr-cpu.pr)*(config.lower?1:-1)<0;
      if(better){events.push(`${queue[0].id} แย่ง CPU จาก ${cpu.id} (preempt)`);queue.push(cpu);queue.sort(rank);cpu=null;}
    }
    if(!cpu && queue.length){cpu=queue.shift();slice=0;if(cpu.first===null)cpu.first=t;events.push(`CPU → ${cpu.id}`);}
    if(!cpu && ps.some(p=>p.ct===null)) events.push('CPU Idle — รอ Process มาถึง');
  }
  dispatch();
  function snapshot(){return {t,cpu:cpu?.id||null,slice,queue:queue.map(p=>p.id),ps:ps.map(p=>({...p})),events:[...events]};}
  return {
    snapshot,
    done:()=>ps.every(p=>p.ct!==null),
    tick(){if(this.done())return snapshot();events=[];if(cpu){cpu.remaining--;cpu.used++;slice++;}t++;dispatch();return snapshot();}
  };
}
function scheduleResult(ps, config){
  const model=createSchedule(ps,config),g=[],r=Object.create(null);
  while(!model.done()){
    const before=model.snapshot(), id=before.cpu||'idle', last=g[g.length-1];
    if(last && last.id===id && !(config.alg==='rr' && before.slice===0 && before.cpu))last.e++;
    else g.push({id,s:before.t,e:before.t+1});
    model.tick();
  }
  model.snapshot().ps.forEach(p=>r[p.id]={ct:p.ct,tat:p.ct-p.at,wt:p.ct-p.at-p.bt,rt:p.first-p.at});
  return {g,r};
}
if(typeof module!=='undefined')module.exports={createSchedule,scheduleResult};
