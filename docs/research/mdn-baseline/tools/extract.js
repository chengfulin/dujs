const fs=require('fs'),path=require('path');const {features}=require('./feat.js');
const root=process.argv[2]; const files=process.argv.slice(3);
const norm=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
const out=[];
for(const rel of files){
  const md=fs.readFileSync(path.join(root,rel),'utf8').split('\n');
  const heads=[]; const blocks=[]; const embeds=[];
  let inF=null, buf=[], start=0;
  md.forEach((line,i)=>{
    if(inF){ if(/^\s*```\s*$/.test(line)){ blocks.push({...inF,code:buf.join('\n'),line:start+1, head:heads.length-1}); inF=null;} else buf.push(line); return; }
    const m=line.match(/^\s*```([a-z-]+)(.*)$/); if(m){ inF={lang:m[1],flags:m[2].trim()}; buf=[]; start=i; return; }
    const h=line.match(/^(#{2,6})\s+(.*)$/); if(h){ heads.push({lvl:h[1].length,text:h[2],slug:norm(h[2]),line:i+1}); return; }
    const e=[...line.matchAll(/\{\{\s*EmbedLiveSample\(\s*["']([^"']+)["']/gi)]; e.forEach(x=>embeds.push({id:x[1],line:i+1}));
  });
  // map heading index -> section heading indices under it
  const idsOf=b=>[...b.flags.matchAll(/live-sample___(\S+)/g)].map(x=>'ls:'+x[1]); const sampleOf=b=>idsOf(b)[0]||null;
  const groups={};
  for(const e of embeds){
    const id=e.id; const key='ls:'+id;
    let bs=blocks.filter(b=>idsOf(b).includes(key));
    if(!bs.length){ // heading based
      const hi=heads.findIndex(h=>h.slug===norm(id)); if(hi>=0){ const lvl=heads[hi].lvl; let end=heads.findIndex((h,j)=>j>hi&&h.lvl<=lvl); if(end<0)end=heads.length; bs=blocks.filter(b=>b.head>=hi&&b.head<end&&!sampleOf(b)); }
    }
    groups[id]={embedLine:e.line,blocks:bs};
  }
  const used=new Set(); Object.values(groups).forEach(g=>g.blocks.forEach(b=>used.add(b)));
  for(const [id,g] of Object.entries(groups)){
    const js=g.blocks.map(b=>/^js/.test(b.lang)?b.code:(b.lang==='html'?[...b.code.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n'):'')).filter(x=>x.trim()).join('\n');
    const langs=[...new Set(g.blocks.map(b=>b.lang+(b.flags.includes('hidden')?'(hidden)':'')))];
    const f=js?features(js):{syntax:[],apis:[],loc:0};
    out.push({article:rel,kind:'live',id,embedLine:g.embedLine,langs,heading:(heads[g.blocks[0]?.head]||{}).text,jsLines:js?js.split('\n').length:0,...f});
  }
  const snips=blocks.filter(b=>/^js/.test(b.lang)&&!used.has(b)&&!/example-bad/.test(b.flags));
  if(snips.length){ const all=snips.map(b=>features(b.code)); const syn=new Set(),ap=new Set(),lim=new Set(); let pe=0; all.forEach(x=>{x.syntax.forEach(s=>syn.add(s));(x.limits||[]).forEach(s=>lim.add(s));x.apis.forEach(s=>ap.add(s)); if(x.parseError)pe++;});
    out.push({article:rel,kind:'snippets',count:snips.length,parseErrors:pe,lines:snips.map(b=>b.line),jsLines:snips.reduce((a,b)=>a+b.code.split('\n').length,0),syntax:[...syn].sort(),limits:[...lim].sort(),apis:[...ap]}); }
}
console.log(JSON.stringify(out,null,1));
