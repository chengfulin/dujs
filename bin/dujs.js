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

    scopeTree.findVars();
    scopeTree.findRDs();
    scopeTree.findDUpairs();

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
            '<head><meta charset="utf-8"><title>Def-Use Analysis Report</title>' +
                '<script>var cfgImgSrc = "cfgs.png", dupairsImgSrc = "dupairs.png";' +
                'window.onload = function () {' +
                'document.querySelector("#cfgImg").src = cfgImgSrc;' +
                'document.querySelector("#dupairsImg").src = dupairsImgSrc;}' +
                '</script>' +
            '</head>' +
            '<body><h1>Def-Use Analysis Report</h1>' +
            '<h2>CFG</h2>' +
            '<img id="cfgImg">' +
            '<h2>Def-Use pairs</h2>' +
            '<img id="dupairsImg">' +
        '</html>'
    );

    open('result.html', function (err) {
        if (!!err) {
            throw err;
        }
    });
});