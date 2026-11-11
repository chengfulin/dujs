/*
 * Derived from analyses 0.2.1 (https://github.com/Swatinem/analyses), upstream lib/set.js
 * Original author: Arpad Borsos (Swatinem) <arpad.borsos@googlemail.com>
 * SPDX-License-Identifier: LGPL-3.0-only
 * Licensed under the GNU LGPL v3, see LICENSES/LGPL-3.0.txt and
 * LICENSES/GPL-3.0.txt. This file is NOT covered by the dujs MIT license.
 *
 * Modified by ChengFuLin (chengfulin0806@gmail.com):
 *   2015-04: license header only
 * See THIRD_PARTY_NOTICES.md for details.
 */
module.exports = Set;

/**
 * ES6 Sets in `node --harmony` do not provide `.values()` or `for of` iteration
 * yet, so they are pretty useless :-(
 * This Set also does not use `Object.is`; we do not care about NaN, -0, +0
 */
function Set(elements) {
	this._values = [];
	if (Array.isArray(elements))
		elements.forEach(this.add.bind(this));
	else if (elements instanceof Set)
		elements._values.forEach(this.add.bind(this));
}
Object.defineProperty(Set.prototype, 'size', {
	enumerable: false,
	configurable: false,
	get: function () {
		return this._values.length;
	}
});
Set.prototype._i = function Set__i(elem) {
	return this._values.indexOf(elem);
};
Set.prototype.add = function Set_add(elem) {
	if (!this.has(elem))
		this._values.push(elem);
};
Set.prototype.has = function Set_has(elem) {
	return !!~this._i(elem);
};
Set.prototype.delete = function Set_delete(elem) {
	var i = this._i(elem);
	if (!~i)
		return;
	this._values.splice(i, 1);
};
Set.prototype.values = function Set_values() {
	return [].concat(this._values);
};

// forward some convenience functions from Array.prototype
[
	'some',
	'map',
	'every',
	'filter',
	'forEach'
].forEach(function (method) {
	Set.prototype[method] = function () {
		return Array.prototype[method].apply(this._values, arguments);
	}
});

// some convenience functions
Set.prototype.first = function Set_first() {
	return this._values[0];
};
Set.intersect = function intersect(a, b) {
	if (!a && b)
		return new Set(b);
	if (!b && a)
		return new Set(a);
	var s = new Set();
	a.forEach(function (val) {
		if (b.has(val))
			s.add(val);
	});
	return s;
};
Set.union = function union(a, b) {
	if (!a && b)
		return new Set(b);
	var s = new Set(a);
	if (b)
		b.forEach(s.add.bind(s));
	return s;
};
Set.equals = function equals(a, b) {
	if (a.size != b.size)
		return false;
	return a.every(function (val) {
		return b.has(val);
	});
};
Set.minus = function minus(a, b) {
	var s = new Set(a);
	b.forEach(s.delete.bind(s));
	return s;
};

