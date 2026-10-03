import fs from 'node:fs';
const log=fs.readFileSync(process.argv[2]??'audit.log','utf8');
const policy=JSON.parse(fs.readFileSync(process.argv[3]??'security/known-upstream-findings.json','utf8'));
const allowed=new Set((policy.known_upstream_findings??[]).filter(x=>x.severity==='high'&&x.status==='UPSTREAM_UNPATCHED').map(x=>x.advisory));
for(const id of allowed) if(!log.includes(id)) throw new Error('SECURITY_ALLOWLIST_ADVISORY_MISSING:'+id);
const high=(log.match(/(^|\n)│\s*high\s*│/g)||[]).length;
if(high!==allowed.size) throw new Error('UNALLOWLISTED_HIGH_ADVISORIES:'+high);
console.log('SECURITY AUDIT PASS WITH EXPLICIT UPSTREAM EXCEPTION');
