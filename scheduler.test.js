const assert=require('node:assert/strict');
const {createSchedule,scheduleResult}=require('./scheduler');
const p=(id,at,bt,pr=1)=>({id,at,bt,pr});
const ps=[p('P1',0,8,3),p('P2',1,4,2),p('P3',2,2,1),p('P4',3,1,4)];
for(const [alg,mode,expected] of [['fcfs','np',[8,12,14,15]],['sjf','np',[8,15,11,9]],['sjf','p',[15,8,4,5]],['priority','np',[8,14,10,15]],['priority','p',[14,7,4,15]],['rr','p',[15,11,6,9]]]){
 const result=scheduleResult(ps,{alg,mode,q:2,lower:true});
 assert.deepEqual(ps.map(p=>result.r[p.id].ct),expected,alg+mode);
 for(const x of Object.values(result.r)){assert.ok(x.wt>=0);assert.ok(x.rt>=0);}
}
const model=createSchedule([p('P1',2,2),p('P2',4,1)],{alg:'rr',q:2});
assert.equal(model.snapshot().cpu,null);model.tick();model.tick();assert.equal(model.snapshot().cpu,'P1');model.tick();model.tick();assert.equal(model.snapshot().cpu,'P2');model.tick();assert.ok(model.done());
const rr=scheduleResult([p('P1',0,4),p('P2',2,1)],{alg:'rr',q:2});assert.deepEqual(rr.g.map(x=>x.id),['P1','P2','P1']);
console.log('PASS: six modes, metrics invariants, idle, and quantum-boundary arrival');

