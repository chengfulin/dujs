// Feature detection for JS source: node feat.js <espreePath> ; exported for require
const espree = require(process.env.ESPREE);
function parse(code){
  for (const st of ['script','module']) { try { return espree.parse(code,{ecmaVersion:'latest',sourceType:st,range:true}); } catch(e){ var err=e; } }
  return {error: String(err && err.message)};
}
function walk(n,f,p){ if(!n||typeof n.type!=='string')return; f(n,p); for(const k in n){ if(k==='parent')continue; const v=n[k]; if(Array.isArray(v))v.forEach(x=>walk(x,f,n)); else if(v&&typeof v.type==='string')walk(v,f,n);} }
const APIS = {
 DOM:/\b(document\.|querySelector|getElementById|createElement|appendChild|textContent|innerHTML|classList|\.style\.|\.append\(|removeChild|setAttribute|\.value\b)/,
 Events:/\b(addEventListener|\.on(click|load|change|submit|keydown|mouseover|focus|blur|input|timeupdate|ended|success|error|upgradeneeded|complete)\s*=|preventDefault|stopPropagation|event\.target|\be\.target)/,
 Timers:/\b(setTimeout|setInterval|requestAnimationFrame|clearInterval|cancelAnimationFrame)\b/,
 fetch:/\bfetch\(/,
 Canvas:/\b(getContext\(|fillRect|beginPath|drawImage|ctx\.)/,
 WebAudio:/\b(AudioContext|createMediaElementSource|createGain|createAnalyser)\b/,
 Media:/\b(\.play\(\)|\.pause\(\)|currentTime|HTMLMediaElement|\.duration\b)/,
 WebStorage:/\b(localStorage|sessionStorage)\b/,
 IndexedDB:/\b(indexedDB|IDBKeyRange|objectStore|createObjectStore|transaction\()/,
 Cache_SW:/\b(caches\.|serviceWorker|self\.addEventListener|navigator\.serviceWorker)/,
 Geolocation:/\bgeolocation\b/,
 ThreeJS:/\bTHREE\./,
 ThirdParty:/\b(YT\.|google\.maps|mapquest|L\.map|onYouTubeIframeAPIReady)\b/,
 Console:/\bconsole\./, Alert:/\b(alert|prompt|confirm)\(/,
 JSON:/\bJSON\.(parse|stringify)/, Math_random:/Math\.random/, Date:/new Date\(/,
 Blob_URL:/\b(Blob|URL\.createObjectURL|FileReader)\b/,
 MediaDevices:/\b(getUserMedia|mediaDevices)\b/,
};
function features(code){
  const ast=parse(code); const f=new Set();
  if(ast.error) return {parseError:ast.error, syntax:[], apis:apis(code), loc:code.split('\n').length};
  if(ast.sourceType==='module') f.add('module');
  walk(ast,n=>{
    const t=n.type;
    if(t==='VariableDeclaration'&&n.kind!=='var') f.add(n.kind);
    if(t==='VariableDeclaration'&&n.kind==='var') f.add('var');
    if(t==='ArrowFunctionExpression') f.add('arrow');
    if(t==='ClassDeclaration'||t==='ClassExpression') f.add('class');
    if(t==='Super') f.add('super');
    if(t==='PropertyDefinition') f.add(n.key.type==='PrivateIdentifier'?'private-field':'class-field');
    if(t==='MethodDefinition'&&n.key.type==='PrivateIdentifier') f.add('private-method');
    if(t==='MethodDefinition'&&n.static) f.add('static-method');
    if(t==='MethodDefinition'&&(n.kind==='get'||n.kind==='set')) f.add('accessor');
    if(t==='ObjectPattern'||t==='ArrayPattern') f.add('destructuring');
    if(t==='AssignmentPattern') f.add('default-param/pattern-default');
    if(t==='RestElement') f.add('rest');
    if(t==='SpreadElement') f.add('spread');
    if(t==='TemplateLiteral') f.add('template');
    if(t==='TaggedTemplateExpression') f.add('tagged-template');
    if(t==='ForOfStatement') f.add('for-of');
    if(t==='ForInStatement') f.add('for-in');
    if(t==='ChainExpression') f.add('optional-chaining');
    if(t==='LogicalExpression'&&n.operator==='??') f.add('nullish');
    if(t==='AssignmentExpression'&&['&&=','||=','??='].includes(n.operator)) f.add('logical-assign');
    if((t==='FunctionDeclaration'||t==='FunctionExpression'||t==='ArrowFunctionExpression')&&n.async) f.add('async');
    if(t==='AwaitExpression') f.add('await');
    if((t==='FunctionDeclaration'||t==='FunctionExpression')&&n.generator) f.add('generator');
    if(t==='ImportDeclaration'||t==='ExportNamedDeclaration'||t==='ExportDefaultDeclaration') f.add('import/export');
    if(t==='ImportExpression') f.add('dynamic-import');
    if(t==='NewExpression'&&n.callee.name==='Promise') f.add('Promise-ctor');
    if(t==='MemberExpression'&&n.property&&['then','catch','finally'].includes(n.property.name)) f.add('Promise.then');
    if(t==='TryStatement') f.add('try/catch');
    if(t==='ThrowStatement') f.add('throw');
    if(t==='SwitchStatement') f.add('switch');
    if(t==='ConditionalExpression') f.add('?:');
    if(t==='LabeledStatement') f.add('label(§1)');
    if(t==='WithStatement') f.add('with(§1)');
    if(t==='DebuggerStatement') f.add('debugger(§1)');
    if(t==='DoWhileStatement') f.add('do-while');
    if(t==='WhileStatement') f.add('while');
    if(t==='ForStatement') f.add('for');
    if(t==='BreakStatement'||t==='ContinueStatement') f.add('break/continue');
    if(t==='NewExpression') f.add('new');
    if(t==='ThisExpression') f.add('this');
    if(t==='Property'&&n.shorthand) f.add('shorthand-prop');
    if(t==='Property'&&n.method) f.add('method-shorthand');
    if(t==='Property'&&n.computed) f.add('computed-key');
    if(t==='Literal'&&n.regex) f.add('regex');
    if(t==='UpdateExpression') f.add('++/--');
    if(t==='FunctionExpression'||t==='ArrowFunctionExpression') f.add('anon-fn(callback)');
    if(t==='MemberExpression'&&n.object.type==='Identifier'&&n.object.name==='Object'&&n.property.name) f.add('Object.'+n.property.name);
    if(t==='Identifier'&&n.name==='prototype') f.add('.prototype');
    if(t==='Identifier'&&n.name==='__proto__') f.add('__proto__');
    if(t==='ExpressionStatement'&&n.expression.type==='AssignmentExpression'&&n.expression.left.type==='MemberExpression') f.add('prop-assign(a.b=)');
  });
  const L=new Set(); const fnNames=new Set(), methodNames=new Set();
  walk(ast,n=>{ if(n.type==='FunctionDeclaration'&&n.id) fnNames.add(n.id.name); if(n.type==='VariableDeclarator'&&n.id.type==='Identifier'&&n.init&&/Function/.test(n.init.type)) fnNames.add(n.id.name); if(n.type==='MethodDefinition'&&n.key.name&&n.kind==='method') methodNames.add(n.key.name); });
  const CB=/^(forEach|map|filter|reduce|find|findIndex|some|every|sort|then|catch|finally|setTimeout|setInterval|requestAnimationFrame|replace)$/;
  walk(ast,(n,p)=>{
    const t=n.type;
    if(t==='AssignmentExpression'&&n.left.type==='MemberExpression'&&n.left.property&&/^on[a-z]+$/.test(n.left.property.name||'')) L.add('onX-handler');
    if(t==='CallExpression'&&n.callee.type==='MemberExpression'&&n.callee.property.name==='addEventListener') L.add('addEventListener');
    if(t==='CallExpression'){ const nm=n.callee.type==='Identifier'?n.callee.name:(n.callee.property&&n.callee.property.name); if(nm&&CB.test(nm)&&n.arguments.some(a=>/Function/.test(a.type)||(a.type==='Identifier'&&fnNames.has(a.name)))) L.add('callback:'+nm); }
    if(t==='CallExpression'&&/Function/.test(n.callee.type)) L.add('IIFE');
    if(t==='CallExpression'&&n.callee.type==='Identifier'&&fnNames.has(n.callee.name)&&!(p&&p.type==='ExpressionStatement')) L.add('user-call-in-expr');
    if(t==='CallExpression'&&n.callee.type==='Identifier'&&fnNames.has(n.callee.name)&&p&&p.type==='ExpressionStatement') L.add('user-call-stmt');
    if(t==='CallExpression'&&n.callee.type==='MemberExpression'&&methodNames.has(n.callee.property.name)) L.add('class-method-call(§7)');
    if(t==='ExpressionStatement'&&n.expression.type==='NewExpression') L.add('new-stmt(§21)');
    if(t==='CatchClause'&&n.param) L.add('catch-param');
    if(t==='PropertyDefinition'&&!n.static) L.add('instance-field');
    if(['IfStatement','WhileStatement','DoWhileStatement','ForStatement','ConditionalExpression'].includes(t)&&n.test){
      const atoms=[]; (function split(e){ if(e.type==='LogicalExpression'){split(e.left);split(e.right);} else if(e.type==='ConditionalExpression'){split(e.test);split(e.consequent);split(e.alternate);} else atoms.push(e); })(n.test);
      for(const test of atoms){ let endNested=-1;
        walk(test,m=>{ if(m!==test&&['BinaryExpression','CallExpression','UnaryExpression'].includes(m.type)&&endNested<0) endNested=m.range[1]; });
        let hit=false; if(endNested>=0) walk(test,m=>{ if(m.type==='Identifier'&&m.range[0]>endNested) hit=true; });
        if(hit) L.add('cond-after-nested(§20)'); }
    }
    if(t==='AssignmentPattern'&&/Function/.test(n.right.type)) L.add('fn-default(§10)');
  });
  try { const es=require(process.env.ESPREE.replace(/espree$/,'eslint-scope')); const sm=es.analyze(ast,{ecmaVersion:2025,sourceType:ast.sourceType}); 
    for(const sc of sm.scopes){ if(sc.type!=='function') continue; let up=sc.upper; let inFn=false; while(up){ if(up.type==='function'){inFn=true;break;} up=up.upper; } if(!inFn) continue;
      for(const r of sc.through){ const v=r.resolved; if(v&&v.scope&&v.scope.type!=='global'&&v.scope.type!=='module'&&v.scope!==sc) { L.add('closure'); break; } } }
  } catch(e){ L.add('scope-err:'+e.message.slice(0,30)); }
  walk(ast,n=>{ if(/Function/.test(n.type)&&n.body&&n.body.type==='BlockStatement'){ let hit=false; n.body.body.forEach(st=>walk(st,m=>{ if(m.type==='SwitchStatement'||m.type==='ForInStatement'||m.type==='ForOfStatement') hit=true; })); if(hit) L.add('entry-uses(§18)'); } });
  return {syntax:[...f].sort(), limits:[...L].sort(), apis:apis(code), loc:code.split('\n').length};
}
function apis(code){ return Object.keys(APIS).filter(k=>APIS[k].test(code)); }
module.exports={features,parse};
