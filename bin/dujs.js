/**
 * Created by ChengFuLin on 2015/5/7.
 */
var FunctionScopeTree = require('../lib/dujs').FunctionScopeTree,
    CFGExt = require('../lib/dujs').CFGExt,
    Graphics = require('../lib/dujs').Graphics,
    graphviz = require('graphviz'),
    exec = require('child_process').exec,
    fs = require('fs'),
    open = require('open'),
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
    //console.log('====== Tree ======');
    //console.log(scopeTree.toString());
    //console.log('\n');

    //scopeTree.getFunctionScopes().forEach(function (scope) {
    //    console.log('=== CFG(' + scope.toString() + ') ===');
    //    console.log(scope.cfgToString());
    //    console.log('\n');
    //});

    scopeTree.findVars();
    scopeTree.findRDs();

    //scopeTree.getFunctionScopes().forEach(function (scope) {
    //    console.log('=== ReachIns(' + scope.toString() + ') ===');
    //    console.log(scope.reachInsToString());
    //    console.log('\n');
    //});

    scopeTree.findDUpairs();
    //console.log('=== DUpairs ===');
    //console.log(scopeTree.dupairsToString());

    /// output intra-CFGs
    fs.writeFile('cfgs.dot', Graphics.cfgs(scopeTree), function (err) {
        if (!!err) {
            throw err;
        }
    });
    exec('cat cfgs.dot | dot -Tpng > cfgs.png', function (error) {
        if (!!error) {
            throw error;
        }
        fs.unlink('cfgs.dot', function (err) {
            if (!!err) {
                throw err;
            }
        });
    });

    /// output Def-Use pairs
    fs.writeFile('dupairs.dot', Graphics.dupairs(scopeTree.getDUpairs()), function (err) {
        if (!!err) {
            throw err;
        }
    });
    exec('cat dupairs.dot | dot -Tpng > dupairs.png', function (error) {
        if (!!error) {
            throw error;
        }
        fs.unlink('dupairs.dot', function (err) {
            if (!!err) {
                throw err;
            }
        });
    });

    fs.writeFile(
        'result.html',
        '<html>' +
            '<head><title>Def-Use Analysis Report</title></head>' +
            '<body><h1>Def-Use Analysis Report</h1>' +
            '<h2>CFG</h2>' +
            '<img src="cfgs.png">' +
            '<h2>Def-Use pairs</h2>' +
            '<img src="dupairs.png">' +
        '</html>'
    );

    open('result.html', function (err) {
        if (!!err) {
            throw err;
        }
    });
});