/**
 * Created by ChengFuLin on 2015/5/26.
 */
var namespace = require('../namespace'),
    internal = namespace();

/**
 * Initialize Path
 * @param [sequence] Sequence of elements of the path
 * @constructor
 */
function Path(sequence) {
    "use strict";
    if (arguments.length !== 0) {
        Path.validateSequenceValue(sequence);
        internal(this)._nodeSequences = [].concat(sequence);
    } else {
        internal(this)._nodeSequences = [];
    }

    /* start-test-block */
    this._testonly_ = internal(this);
    /* end-test-block */
}

/**
 * Check for the sequence is valid for the path or not
 * @param sequence
 * @returns {boolean}
 * @static
 * @function
 */
Path.isValidSequence = function (sequence) {
    "use strict";
    if (sequence instanceof Array) {
        var typeOfElem, valid = false;
        sequence.forEach(function (elem, index) {
            if (index === 0) {
                typeOfElem = typeof elem;
            } else {
                valid = (typeof elem === typeOfElem);
            }
        });
        return valid;
    }
    return false;
};

/**
 * Check for the object is a Path or not
 * @param obj
 * @returns {boolean}
 * @static
 * @function
 */
Path.isPath = function (obj) {
    "use strict";
    return obj instanceof Path;
};

/**
 * Validate for the sequence for the path
 * @param sequence
 * @param {string} msg Custom error message
 * @throws {Error} When the value is invalid
 * @static
 * @function
 */
Path.validateSequenceValue = function (sequence, msg) {
    "use strict";
    if (!Path.isValidSequence(sequence)) {
        throw new Error(msg || 'Invalid value for the sequence of the path');
    }
};

/**
 * Represent the path as string
 * @returns {string}
 * @function
 */
Path.prototype.toString = function () {
    "use strict";
    var text = '';
    internal(this)._nodeSequences.forEach(function (elem, index) {
        if (index === 0) {
            text += elem;
        } else {
            text += '-' + elem;
        }
    });
    return text;
};

/**
 * Set the sequence
 * @param {Array} sequence
 * @function
 */
Path.prototype.setSequence = function (sequence) {
    "use strict";
    if (Path.isValidSequence(sequence)) {
        internal(this)._nodeSequences = [].concat(sequence);
    }
};

/**
 * Add a node into the sequence
 * @param node
 * @function
 */
Path.prototype.addNodePassedThrough = function (node) {
    "use strict";
    if (internal(this)._nodeSequences.length === 0 || (internal(this)._nodeSequences.length > 0 && (typeof internal(this)._nodeSequences[0] === typeof node))) {
        internal(this)._nodeSequences.push(node);
    }
};

/**
 * Check the node is in the path
 * @param node
 * @returns {boolean}
 * @function
 */
Path.prototype.isInPath = function (node) {
    "use strict";
    return internal(this)._nodeSequences.indexOf(node) !== -1;
};

module.exports = Path;