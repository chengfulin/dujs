/**
 * Created by chengfulin on 2015/4/24.
 */
module.exports = Range;

var Namespace = require('./namespace'),
    internal = Namespace();

/**
 * Construct a Range with a pair of numbers, an two elements array of numbers or a Range object
 * @param {Range|*} start
 * @param end
 * @constructor
 * @throws {Error} when the value is invalid
 */
function Range(start, end) {
    'use strict';
    Range.validate(start, end);
    if (Range.isRange(start)) {
        internal(this)._start = start.start;
        internal(this)._end = start.end;
    } else if (start instanceof Array) {
        internal(this)._start = start[0];
        internal(this)._end = start[1];
    } else {
        internal(this)._start = start;
        internal(this)._end = end;
    }

    /* start-test-block */
    this._testonly_ = internal(this);
    /* end-test-block */
}

/**
 * Compare two Range are the same or not
 * @param {Range} range1
 * @param {Range} range2
 * @returns {boolean}
 * @function
 */
Range.equals = function (range1, range2) {
    "use strict";
    if (Range.isRange(range1) && Range.isRange(range2)) {
        return (range1 === range2) || (range1.start === range2.start && range1.end === range2.end);
    }
    return false;
};

Object.defineProperty(Range, 'GLOBAL_RANGE_START', {
    get: function () {
        "use strict";
        return 0;
    }
});

Object.defineProperty(Range, 'GLOBAL_RANGE_END', {
    get: function () {
        "use strict";
        return 0;
    }
});

/**
 * Check the value of Range
 * @param start
 * @param end
 * @returns {boolean}
 */
Range.isValidValue = function (start, end) {
    'use strict';
    if (Range.isRange(start)) {
        return true;
    } else if (start instanceof Array && start.length === 2) {
        return (typeof start[0] === 'number' && typeof start[1] === 'number' && start[0] === Range.GLOBAL_RANGE_START && start[1] === Range.GLOBAL_RANGE_END) ||
            ((typeof start[0] === 'number' && start[0] >= 0) && (typeof start[1] === 'number' && start[1] > start[0]));
    }
    return (typeof start === 'number' && typeof end === 'number' && start === Range.GLOBAL_RANGE_START && end === Range.GLOBAL_RANGE_END) ||
        ((typeof start === 'number' && start >= 0) && (typeof end === 'number' && end > start));
};

/**
 * Check an object is a Range or not
 * @param obj
 * @returns {boolean}
 */
Range.isRange = function (obj) {
    'use strict';
    return obj instanceof Range;
};

/**
 * Validator for checking valid value of Range
 * @param start
 * @param end
 * @param msg custom error message
 * @throws {Error} when the value is invalid
 */
Range.validate = function (start, end, msg) {
    'use strict';
    if (!Range.isValidValue(start, end)) {
        throw new Error(msg || 'Invalid Range value');
    }
};

/**
 * Validator for checking an object is a Range or not
 * @param obj
 * @param msg custom error message
 * @throws {Error} when the object is not a Range
 */
Range.validateType = function (obj, msg) {
    'use strict';
    if (!Range.isRange(obj)) {
        throw new Error(msg || 'Not a Range');
    }
};

Object.defineProperty(Range.prototype, 'start', {
    get: function () {
        'use strict';
        return internal(this)._start;
    }
});

Object.defineProperty(Range.prototype, 'end', {
    get: function () {
        'use strict';
        return internal(this)._end;
    }
});

/**
 * Convert Range to an Array
 * @returns {*[]}
 */
Range.prototype.toArray = function () {
    'use strict';
    return [internal(this)._start, internal(this)._end];
};

/**
 * Represent Range as a string
 * @returns {string}
 */
Range.prototype.toString = function () {
    'use strict';
    return '[' + internal(this)._start + ',' + internal(this)._end + ']';
};

/**
 * Check for current Range object is equal to another
 * @param range
 * @returns {boolean}
 * @function
 */
Range.prototype.isEqualTo = function (range) {
    "use strict";
    return Range.equals(this, range);
};