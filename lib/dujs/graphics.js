/**
 * Created by ChengFuLin on 2015/5/11.
 */
var cfgGraphConverter = require('./cfggraphconverter'),
    AnalyzedCFG = require('./model'),
    Scope = require('./scope');

function Graphics() {
}

/**
 * Output the representation of CFGs of all function scopes with dot language format
 * @param {Model} analysisItem
 * @param {Function} dotConverter
 * @returns {string} dot formatted
 */
Graphics.prototype.analysisItemToCFG = function (analysisItem, option) {
    'use strict';
    var graph = 'digraph CFG {\n' + 'node [shape="box"]';
    var converter = cfgGraphConverter.toDotWithLabelLoc;
    var dotOption = option || {'toDot': false, 'toDotWithLabelId': false, 'toDotWithLabelLine': true, 'toDotWithLabelLoc': false};
    if (dotOption.toDot) {
        converter = cfgGraphConverter.toDot;
    } else if (dotOption.toDotWithLabelId) {
        converter = cfgGraphConverter.toDotWithLabelId;
    } else if (dotOption.toDotWithLabelLine) {
        converter = cfgGraphConverter.toDotWithLabelLine;
    } else if (dotOption.toDotWithLabelLoc) {
        converter = cfgGraphConverter.toDotWithLabelLoc;
    } else {
        converter = cfgGraphConverter.toDotWithLabelLine;
    }

    if (AnalyzedCFG.isModel(analysisItem)) {
        graph += '\nlabel = "';
        if (analysisItem.scopeWrappers.length === 1) {
            graph += analysisItem.scopeWrappers[0].scope.type;
            if (analysisItem.scopeWrappers[0].scope.type === Scope.FUNCTION_TYPE) {
                graph += ' ' + analysisItem.scopeWrappers[0].scope.value;
            } else if (analysisItem.scopeWrappers[0].scope.type === Scope.ANONYMOUS_FUN_TYPE) {
                graph += '[ ' + analysisItem.scopeWrappers[0].scope.value + ' ]';
            }
        }
        graph += '"\n';
    }
    graph += converter(analysisItem.cfg);
    graph += '}';
    return graph;
};

/**
 * Output the representation of Def-Use pairs
 * @param inDUpairs
 * @returns {string}
 */
Graphics.prototype.dupairsToTable = function (inDUpairs) {
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
        table += '<tr><td>' + key.name + '</td>';
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

var singleton = new Graphics();
module.exports = singleton;