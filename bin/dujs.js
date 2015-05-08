/**
 * Created by ChengFuLin on 2015/5/7.
 */
var FunctionScopeTree = require('../lib/dujs').FunctionScopeTree,
    CFGExt = require('../lib/dujs').CFGExt,
    data = '';

process.stdin.resume();
process.stdin.setEncoding('utf8');

process.stdin.on('data', function (chunk) {
    'use strict';
    data += chunk;
});

process.stdin.on('end', function () {
    'use strict';
    var source = data,
        scopeTree = new FunctionScopeTree(CFGExt.parseAST(source));
    console.log('====== Tree ======');
    console.log(scopeTree.toString());
    console.log('\n');

    scopeTree.getFunctionScopes().forEach(function (scope) {
        console.log('=== CFG(' + scope.toString() + ') ===');
        console.log(scope.cfgToString());
        console.log('\n');
    });

    scopeTree.findVars();
    scopeTree.findRDs();

    scopeTree.getFunctionScopes().forEach(function (scope) {
        console.log('=== ReachIns(' + scope.toString() + ') ===');
        console.log(scope.reachInsToString());
        console.log('\n');
    });

    scopeTree.findDUpairs();
    console.log('=== DUpairs ===');
    console.log(scopeTree.dupairsToString());
});