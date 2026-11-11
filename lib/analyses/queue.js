/*
 * Derived from analyses 0.2.1 (https://github.com/Swatinem/analyses), upstream lib/queue.js
 * Original author: Arpad Borsos (Swatinem) <arpad.borsos@googlemail.com>
 * SPDX-License-Identifier: LGPL-3.0-only
 * Licensed under the GNU LGPL v3, see LICENSES/LGPL-3.0.txt and
 * LICENSES/GPL-3.0.txt. This file is NOT covered by the dujs MIT license.
 *
 * Modified by ChengFuLin (chengfulin0806@gmail.com):
 *   2015-04: license header only
 * See THIRD_PARTY_NOTICES.md for details.
 */
module.exports = Queue;

/**
 * This is a really small priority queue that makes sure that duplicate elements
 * are being inserted at the end
 */
function Queue() {
	var q = [];
	q.__proto__ = Queue.prototype;
	return q;
}

Queue.prototype = Object.create(Array.prototype);
Queue.prototype.push = function Queue_push(elem) {
	var pos = this.indexOf(elem);
	if (pos != -1)
		this.splice(pos, 1);
	Array.prototype.push.call(this, elem);
};
