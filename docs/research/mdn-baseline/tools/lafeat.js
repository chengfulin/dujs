const fs=require('fs');const {features}=require('./feat.js');
for(const f of process.argv.slice(2)){
  const s=fs.readFileSync(f,'utf8'); let js=s, srcs=[];
  if(f.endsWith('.html')){ const parts=[...s.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)]; srcs=parts.filter(p=>/src=/.test(p[1])).map(p=>(p[1].match(/src=["']([^"']+)/)||[])[1]+(/type=["']module/.test(p[1])?'(module)':'')); js=parts.filter(p=>!/src=/.test(p[1])).map(p=>p[2]).join('\n'); }
  const r=js.trim()?features(js):{syntax:[],apis:[],loc:0};
  console.log([f.replace('dl/learning-area/',''), 'jsLOC='+(js.trim()?js.trim().split('\n').length:0), srcs.length?'src:'+srcs.join(','):'', r.parseError?'PARSEERR:'+r.parseError:'', r.syntax.join(' '),'|',(r.limits||[]).join(' '),'|',r.apis.join(' ')].join('\t'));
}
