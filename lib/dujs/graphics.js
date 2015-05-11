/**
 * Created by ChengFuLin on 2015/5/11.
 */
var esgraph = require('esgraph'),
    CFGExt = require('./cfgext'),
    Scope = require('./scope');

function Graphics() {

}
/**
 * Output the representation of CFGs of all function scopes with dot language format
 * @param scopeTree
 * @returns {string}
 */
Graphics.cfgs = function (scopeTree) {
    'use strict';
    var graph = 'digraph cfgs {\n' + 'node [shape="box"]';
    //graph += getCFGSubgraphs(scopeTree.getRoot());
    scopeTree.getFunctionScopes().forEach(function (scope, index) {
        graph += getCFGSubgraphs(scope,'',index);
    });
    graph += '}';
    return graph;
};

/**
 * Create the representation of subgraph
 * @param scope
 * @param graph
 * @param index
 * @returns {string}
 */
function getCFGSubgraphs(scope, graph, index) {
    'use strict';
    var subgraph = graph || '',
        subgraphIndex  = index || 0;
    if (!!scope) {
        subgraph += 'subgraph cluster_' + subgraphIndex + '{\n';
        subgraph += 'label = "' + scope.getScope().getType() +
        ((scope.getScope().getType() === Scope.PROGRAM_TYPE || scope.getScope().getType() === Scope.GLOBAL_TYPE)? '' : (' ' + scope.getScope().getValue())) +
        '"\n';
        subgraph += CFGExt.toDotWithLabelId(scope.getCFG());
        subgraph += '}\n';
    }
    return subgraph;
}

/**
 * Output the representation of Def-Use pairs
 * @param inDUpairs
 * @returns {string}
 */
Graphics.dupairs = function (inDUpairs) {
    'use strict';
    var table = 'digraph structs {\n' +
        'node [shape="plaintext"]\n' +
        'struct1 [label=<\n' +
        '<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0">\n',
        maxSize = 0;
    inDUpairs.forEach(function (val) {
        maxSize = (maxSize > val.size)? maxSize : val.size;
    });
    table += '<tr><td>Variable</td><td COLSPAN="' + maxSize + '">Def-Use pairs</td></tr>';
    inDUpairs.forEach(function (val, key) {
        var rowSize = 0;
        table += '<tr><td>' + key + '</td>';
        val.forEach(function (pair) {
            table += '<td>' + pair + '</td>';
            rowSize++;
        });
        while (rowSize < maxSize) {
            table += '<td></td>';
            rowSize++;
        }
        rowSize = 0;
        table += '</tr>\n';
    });
    table += '</TABLE>\n>];\n}';
    return table;
};

module.exports = Graphics;