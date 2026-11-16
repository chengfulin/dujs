// usage: node x.js <md> <id>  -> prints JS of the live sample (same rules as tools/extract.js)
const fs=require('fs');
const [md,id]=process.argv.slice(2);
const norm=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
const lines=fs.readFileSync(md,'utf8').split('\n');const heads=[],blocks=[];let inF=null,buf=[];
lines.forEach((line,i)=>{ if(inF){ if(/^\s*```\s*$/.test(line)){blocks.push({...inF,code:buf.join('\n'),line:inF.start+1,head:heads.length-1});inF=null;} else buf.push(line);return;}
 const m=line.match(/^\s*```([a-z-]+)(.*)$/); if(m){inF={lang:m[1],flags:m[2].trim(),start:i};buf=[];return;}
 const h=line.match(/^(#{2,6})\s+(.*)$/); if(h) heads.push({lvl:h[1].length,slug:norm(h[2])}); });
const ids=b=>[...b.flags.matchAll(/live-sample___(\S+)/g)].map(x=>x[1]);
let bs=blocks.filter(b=>ids(b).includes(id));
if(!bs.length){const hi=heads.findIndex(h=>h.slug===norm(id)); if(hi<0) throw new Error('no '+id); const lvl=heads[hi].lvl; let end=heads.findIndex((h,j)=>j>hi&&h.lvl<=lvl); if(end<0)end=heads.length; bs=blocks.filter(b=>b.head>=hi&&b.head<end&&!ids(b).length);}
const js=bs.map(b=>/^js/.test(b.lang)?b.code:(b.lang==='html'?[...b.code.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n'):'')).filter(x=>x.trim()).join('\n');
process.stderr.write(id+': fences at lines '+bs.map(b=>b.line+'('+b.lang+')').join(',')+'\n');
process.stdout.write(js.replace(/^\n+/,'')+'\n');
