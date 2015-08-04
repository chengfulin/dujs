/*
 * DomainScope module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-07-28
 */
var Scope = require('./scope');

/**
 * DomainScope
 * @constructor
 */
function DomainScope() {
	"use strict";
	Scope.call(this, null, Scope.DOMAIN_SCOPE_NAME, Scope.DOMAIN_TYPE, null);
}

DomainScope.prototype = Object.create(Scope.prototype);
Object.defineProperty(DomainScope.prototype, 'constructor', {
	value: DomainScope
});

/* start-static-data-members */
Object.defineProperties(DomainScope, {
	/**
	 * Array of build-in objects
	 * @type {Array}
	 * @memberof DomainScope
	 */
	builtInObjects: {
		get: function () {
			"use strict";
			/* manual */
			return [
				{name: "localStorage", def: "localStorage"}
			];
		}
	}
});
/* end-static-data-members */

module.exports = DomainScope;