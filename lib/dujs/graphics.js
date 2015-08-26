/**
 * Graphics module
 * @lastmodifiedBy ChengFuLin
 * @lastmodifiedDate 2015-08-26
 */
var cfgGraphConverter = require('./cfggraphconverter'),
    Scope = require('./scope');

function Graphics() {
}

/**
 * Represent model graph with DOT language
 * @param {Model} model
 * @option {Object} option
 * @returns {string}
 */
Graphics.prototype.convertGraphToDot = function (model, option) {
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

    graph += '\nlabel = "';
    if (model.relatedScopes.length === 1) {
        graph += model.mainlyRelatedScope.type;
        if (model.mainlyRelatedScope.type === Scope.FUNCTION_TYPE) {
            graph += ' ' + model.mainlyRelatedScope.name;
        } else if (model.mainlyRelatedScope.type === Scope.ANONYMOUS_FUN_TYPE) {
            graph += '[ ' + model.mainlyRelatedScope.name + ' ]';
        }
    }
    graph += '"\n';
    graph += converter(model.graph);
    graph += '}';
    return graph;
};

/**
 * Output the representation of Def-Use pairs
 * @param {Map} inDUpairs
 * @returns {string}
 */
Graphics.prototype.convertDUPairsToDot = function (inDUpairs) {
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