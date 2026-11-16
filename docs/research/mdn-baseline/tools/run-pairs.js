// usage: node run.js <dujsRoot> <file>... ; one page = concatenation of files (as the CLI)
var fs=require('fs'),path=require('path');
var root=process.argv[2], files=process.argv.slice(3);
var analyze=require(path.join(root,'tests/helpers/analyze')),
 scopeCtrl=require(path.join(root,'lib/dujs/scopectrl')), modelCtrl=require(path.join(root,'lib/dujs/modelctrl'));
var code=files.map(function(f){return fs.readFileSync(f,'utf8');}).join('');
try{
 var r=analyze(code);
 var pm=modelCtrl.collectionOfPageModels.get(scopeCtrl.pageScopeTrees[0]);
 console.log('## scopes'); r.scopeNames().forEach(function(s){console.log(s);});
 pm.intraProceduralModels.forEach(function(m){ console.log('## intra '+m.mainlyRelatedScope.name); analyze.pairsOfModel(m).forEach(function(p){console.log(p);}); });
 pm.interProceduralModels.forEach(function(m,i){ console.log('## inter['+i+'] '+m.relatedScopes.map(String).join(' , ')); analyze.pairsOfModel(m).forEach(function(p){console.log(p);}); });
 console.log('## intra-page (nodes '+pm.intraPageModels[0].graph[2].length+')'); r.intraPage().forEach(function(p){console.log(p);});
}catch(e){ console.log('ERROR: '+e.stack.split('\n').slice(0,4).join(' | ')); }
