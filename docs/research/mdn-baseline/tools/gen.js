const fs=require('fs'),path=require('path');const {features}=require('./feat.js');
const CROOT='dl/content/files/en-us/learn_web_development/', LROOT='dl/learning-area/';
const CC='74f6e26e70721281aeb500ba4f8c1f06f20b0100', LC='21973263ba859ff3477919087b488157f9d618a6';
const live=require('../out/live.json');
const commits=Object.fromEntries(fs.readFileSync('out/content-commits.txt','utf8').trim().split('\n').map(l=>{const [p,h,d]=l.split(' ');return [p,h+' '+d];}));
const slug=a=>(fs.readFileSync(CROOT+a,'utf8').match(/^slug:\s*(.*)$/m)||[])[1];
const mod=a=>a.startsWith('core/scripting')?'S':a.includes('client-side_apis')?'C':'O';
const NOTABLE=['let','const','arrow','class','super','class-field','private-field','static-method','accessor','destructuring','default-param/pattern-default','rest','spread','template','tagged-template','for-of','optional-chaining','nullish','logical-assign','async','await','generator','import/export','dynamic-import','Promise-ctor','Promise.then','try/catch','throw','switch','?:','for-in','do-while','regex','method-shorthand','shorthand-prop','computed-key','.prototype','Object.create','Object.assign','Object.getPrototypeOf','Object.hasOwn','Object.keys','label(§1)','with(§1)','debugger(§1)'];
const ES6=new Set(['let','const','arrow','class','super','class-field','private-field','static-method','destructuring','default-param/pattern-default','rest','spread','template','tagged-template','for-of','optional-chaining','nullish','logical-assign','async','await','generator','import/export','dynamic-import','Promise-ctor','Promise.then','method-shorthand','shorthand-prop','computed-key','Object.assign','Object.hasOwn']);
const SHORT={'default-param/pattern-default':'default','Promise.then':'.then','Promise-ctor':'new Promise','private-field':'#private','class-field':'field','static-method':'static'};
function syn(x){ const s=(x.syntax||[]).filter(k=>NOTABLE.includes(k)); const es6=s.filter(k=>ES6.has(k)); const v=s.map(k=>SHORT[k]||k); return {txt:v.join(', ')||'—', level: es6.length?(s.some(k=>['async','await','optional-chaining','nullish','logical-assign','private-field','class-field','Object.hasOwn'].includes(k))?'ES2017+':'ES2015'):'ES5'}; }
const REASON={'callback':'README「Anonymous function call」（callback 不連結）','user-call-in-expr':'README「Only call statements…」','closure':'README「Closure」','catch-param':'README「catch parameters」','instance-field':'README「Instance field initializers」','onX-handler':'on* 屬性 handler 不是事件註冊（只辨識 addEventListener）','class-method-call(§7)':'§7','new-stmt(§21)':'§21','cond-after-nested(§20)':'§20','entry-uses(§18)':'§18','fn-default(§10)':'§10','IIFE':'README「Anonymous function call」','objprop':'README「Object properties, this…」（資料經物件屬性流動）'};
function classify(x, override){
  if(override) return override;
  if(x.parseError) return ['C','解析失敗（刻意含錯誤，供學習者修正）'];
  if(!x.jsLines && !x.loc) return ['C','無 JS（只有 HTML/CSS）'];
  const L=new Set((x.limits||[]).map(l=>l.startsWith('callback:')?'callback':l));
  const s=new Set(x.syntax||[]); if(s.has('this')||s.has('class')||s.has('.prototype')||s.has('Object.create')) L.add('objprop');
  const rs=[...new Set([...L].map(l=>REASON[l]).filter(Boolean))];
  if(rs.length) return ['B',rs.join('；')];
  return ['A','只觸及「a.b= 視為定義 a」與 DOM 只當 I/O'];
}
const apis=x=>(x.apis||[]).filter(a=>!['Console','Math_random','Date','JSON','Alert'].includes(a)).join(', ')||'—';
const rows=[];
// live samples, merge -finish
const byArt={}; live.forEach(x=>{(byArt[x.article]=byArt[x.article]||[]).push(x);});
for(const [a,xs] of Object.entries(byArt)){
  const lv=xs.filter(x=>x.kind==='live'); const fin=Object.fromEntries(lv.filter(x=>/-finish$/.test(x.id)).map(x=>[x.id.replace(/-finish$/,''),x]));
  for(const x of lv){ if(/-finish$/.test(x.id)&&lv.some(y=>y.id===x.id.replace(/-finish$/,''))) continue;
    const f=fin[x.id]; const base=f||x; const needH=(x.langs||[]).some(l=>/^html/.test(l))||(f&&(f.langs||[]).some(l=>/^html/.test(l)));
    const isTYS=a.includes('test_your_skills'); const isCh=/silly_story|image_gallery|house_data|adding_bouncing/.test(a);
    const [cls,why]=classify(base);
    rows.push({mod:mod(a),article:a,slug:slug(a),id:x.id+(f?' (+-finish)':''),kind:isTYS?'TYS':isCh?'Challenge':'Live',src:`content@${(commits[a]||'').split(' ')[0]} ${a}#L${x.embedLine}`,html:needH?'需要':'否',loc:(x.jsLines||0)+(f?'/'+f.jsLines:''),syn:syn(base),apis:apis(base),cls,why: (x.parseError&&f?'起始碼刻意含錯；解答版：':'')+(x.parseError&&f?classify(f)[1]:why), cls2: x.parseError&&f?classify(f)[0]:cls});
  }
  for(const x of xs.filter(x=>x.kind==='snippets')){ const [cls,why]=classify({...x,loc:1}); rows.push({mod:mod(a),article:a,slug:slug(a),id:`內嵌片段 ×${x.count}`,kind:'Snippets',src:`content ${a} L${x.lines.slice(0,1)}…`,html:'否（多數可在 console 跑）',loc:x.jsLines,syn:syn(x),apis:apis(x),cls:x.parseErrors?cls+'*':cls,why:(x.parseErrors?`${x.parseErrors} 段無法解析（刻意錯誤或不完整）；`:'')+why,cls2:cls}); }
}
// repo files
const REPO=[
 ['S','core/scripting/a_first_splash/index.md','javascript/introduction-to-js-1/first-splash/number-guessing-game.html','Repo（完成版）'],
 ['S','core/scripting/a_first_splash/index.md','javascript/introduction-to-js-1/first-splash/number-guessing-game-start.html','Repo（起始版）'],
 ['S','core/scripting/what_went_wrong/index.md','javascript/introduction-to-js-1/troubleshooting/number-game-errors.html','Repo（刻意錯誤）',['C','刻意含錯誤（runtime 錯字與邏輯錯誤），預期行為不明確，不宜當基準']],
 ['S','core/scripting/functions/index.md','javascript/building-blocks/functions/first.js','Repo（conflict.html 的第 1 檔）'],
 ['S','core/scripting/functions/index.md','javascript/building-blocks/functions/second.js','Repo（conflict.html 的第 2 檔）'],
 ['S','core/scripting/events/index.md','javascript/building-blocks/preventdefault/index.html','Repo'],
 ['S','core/scripting/dom_scripting/index.md','javascript/apis/document-manipulation/dom-example-manipulated.html','Repo'],
 ['S','core/scripting/dom_scripting/index.md','javascript/apis/document-manipulation/shopping-list-finished.html','Repo（challenge 解答）'],
 ['S','core/scripting/network_requests/index.md','javascript/apis/fetching-data/fetch-finish.html','Repo'],
 ['S','core/scripting/network_requests/index.md','javascript/apis/fetching-data/can-store/can-script.js','Repo'],
 ['S','core/scripting/json/index.md','javascript/oojs/json/JSONTest.html','Repo'],
 ['S','core/scripting/json/index.md','javascript/oojs/json/heroes-finished.html','Repo'],
 ['S','core/scripting/json/index.md','javascript/oojs/json/heroes-finished-json-parse.html','Repo'],
 ['S','core/scripting/debugging_javascript/index.md','tools-testing/cross-browser-testing/javascript/bad-for-loop.html','Repo（刻意錯誤）'],
 ['S','core/scripting/debugging_javascript/index.md','tools-testing/cross-browser-testing/javascript/good-for-loop.html','Repo'],
 ['S','core/scripting/debugging_javascript/index.md','tools-testing/cross-browser-testing/javascript/fetch-broken/script.js','Repo（刻意錯誤）'],
 ['S','core/scripting/debugging_javascript/index.md','tools-testing/cross-browser-testing/javascript/fetch-fixed/script.js','Repo'],
 ['O','extensions/advanced_javascript_objects/object_building_practice/index.md','javascript/oojs/bouncing-balls/main.js','Repo（起始版）'],
 ['O','extensions/advanced_javascript_objects/object_building_practice/index.md','javascript/oojs/bouncing-balls/main-finished.js','Repo（完成版）'],
 ['O','extensions/advanced_javascript_objects/adding_bouncing_balls_features/index.md','javascript/oojs/assessment/main.js','Repo（challenge 解答）'],
 ['C','extensions/client-side_apis/introduction/index.md','javascript/apis/introduction/web-audio/index.html','Repo'],
 ['C','extensions/client-side_apis/introduction/index.md','javascript/apis/introduction/main.js','Repo（bouncing-balls.html）'],
 ['C','extensions/client-side_apis/video_and_audio_apis/index.md','javascript/apis/video-audio/finished/custom-player.js','Repo（= live sample custom-video-player）'],
 ['C','extensions/client-side_apis/drawing_graphics/index.md','javascript/apis/threejs-video-cube/script.js','Repo',['C','依賴 three.js（全域 THREE）與 getUserMedia Promise；render 迴圈靠 requestAnimationFrame，主要流程都在不連結的 callback 中']],
 ['C','extensions/client-side_apis/client-side_storage/index.md','javascript/apis/client-side-storage/web-storage/index.js','Repo',['B','localStorage.removeItem 不是 localStorage 的定義（lib/dujs/globalscopectrl.js 的 localStorageSetterNames 只有 setItem）；其餘只觸及 a.b= 約定']],
 ['C','extensions/client-side_apis/client-side_storage/index.md','javascript/apis/client-side-storage/indexeddb/notes/index-start.js','Repo（起始版）'],
 ['C','extensions/client-side_apis/client-side_storage/index.md','javascript/apis/client-side-storage/indexeddb/notes/index.js','Repo（完成版）'],
 ['C','extensions/client-side_apis/client-side_storage/index.md','javascript/apis/client-side-storage/indexeddb/video-store/index.js','Repo'],
 ['C','extensions/client-side_apis/client-side_storage/index.md','javascript/apis/client-side-storage/cache-sw/video-store-offline/index.js','Repo'],
 ['C','extensions/client-side_apis/client-side_storage/index.md','javascript/apis/client-side-storage/cache-sw/video-store-offline/sw.js','Repo（service worker）',['C','service worker 在獨立的 worker 全域環境執行（self、caches、fetch 事件），不是頁面；dujs 沒有 worker 模型']],
 ['C','extensions/client-side_apis/third_party_apis/index.md','javascript/apis/third-party-apis/youtube/script.js','Repo',['C','流程由外部 Google/YouTube 函式庫回呼驅動（gapi.client.load 的 callback、YT.Player 事件），進入點不在頁面程式內，幾乎全部函式不連結']],
];
for(const [m,a,f,kind,ov] of REPO){
  const s=fs.readFileSync(LROOT+f,'utf8'); let js=s; let srcs=[];
  if(f.endsWith('.html')){ const parts=[...s.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)]; js=parts.filter(p=>!/src=/.test(p[1])).map(p=>p[2]).join('\n'); }
  const x=js.trim()?features(js):{syntax:[],apis:[],limits:[],loc:0};
  x.jsLines=js.trim()?js.trim().split('\n').length:0;
  const [cls,why]=classify(x,ov);
  rows.push({mod:m,article:a,slug:slug(a),id:path.basename(f),kind,src:`learning-area ${f}`,html:f.endsWith('.html')?'需要（內嵌 script）':'需要（另有 HTML）',loc:x.jsLines,syn:syn(x),apis:apis(x),cls,why,cls2:cls});
}

const DUP={'9-webgl-cube':'依賴 HTML 以 script 載入的外部 three.js（全域 THREE）；主要繪製在 loader.load 與 requestAnimationFrame callback 中','github-search':'執行時呼叫 GitHub REST API（網路結果非決定性，但不影響靜態分析）','guess-the-number':'與 Repo number-guessing-game.html 相同','custom-video-player':'與 Repo video-audio/finished/custom-player.js 相同','bouncing-balls':'與 oojs/bouncing-balls/main-finished.js 相同程式'};
rows.forEach(r=>{ if(DUP[r.id]) r.why+='（'+DUP[r.id]+'）'; });
const MODN={S:'Core / Dynamic scripting with JavaScript',C:'Extensions / Client-side web APIs',O:'Extensions / Advanced JavaScript objects'};
let md='';
for(const m of ['S','C','O']){
  for(const snip of [false,true]){
    const rs=rows.filter(r=>r.mod===m&&(r.kind==='Snippets')===snip);
    md+=`\n#### ${MODN[m]} — ${snip?'文章內嵌片段（彙總，非獨立範例）':'可執行範例'}\n\n| # | 文章 | 範例 | 類型 | 原始碼權威位置 | 執行需 HTML/CSS | JS 行數 | JS 語言功能（層級） | 瀏覽器 API | 分類 | 依據 |\n|---|---|---|---|---|---|---|---|---|---|---|\n`;
    rs.forEach((r,i)=>{
      const art=`[${r.article.split('/').slice(-2,-1)[0]}](https://developer.mozilla.org/en-US/docs/${r.slug})`;
      let src;
      if(r.src.startsWith('learning-area')){ const f=r.src.split(' ')[1]; src=`[${f.replace(/^javascript\//,'')}](https://github.com/mdn/learning-area/blob/${LC.slice(0,12)}/${f})`; }
      else { const ln=(r.src.match(/#L(\d+)|L(\d+)/)||[]); const l=ln[1]||ln[2]; src=`[content ${r.article.split('/').slice(-2,-1)[0]}/index.md#L${l}](https://github.com/mdn/content/blob/${CC.slice(0,12)}/files/en-us/learn_web_development/${r.article}#L${l})`+(snip?' 起':''); }
      md+=`| ${i+1} | ${art} | ${r.id.replace(/\|/g,'\\|')} | ${r.kind} | ${src} | ${r.html} | ${r.loc} | ${r.syn.txt} (${r.syn.level}) | ${r.apis} | **${r.cls}** | ${r.why} |\n`;
    });
  }
}
fs.writeFileSync('out/tables.md',md);
fs.writeFileSync('out/rows.json',JSON.stringify(rows,null,1));
const cnt={}; rows.forEach(r=>{const k=r.mod+'|'+(r.kind==='Snippets'?'snip':'ex')+'|'+r.cls2.replace('*',''); cnt[k]=(cnt[k]||0)+1;}); console.log(cnt);
