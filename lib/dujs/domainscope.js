/*
 * DomainScope module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-07-28
 */
var Scope = require('./scope');

/**
 * DomainScope
 * @param {Object} cfg Graph of the domain scope
 * @constructor
 */
function DomainScope(cfg) {
	"use strict";
	Scope.call(this, cfg, Scope.DOMAIN_SCOPE_NAME, Scope.DOMAIN_TYPE, null);
}

DomainScope.prototype = Object.create(Scope.prototype);
Object.defineProperty(DomainScope.prototype, 'constructor', {
	value: DomainScope
});

/* start-public-data-members */
Object.defineProperties(DomainScope.prototype, {
	/**
	 * Array of build-in objects
	 * @type {Array}
	 * @memberof DomainScope.prototype
	 * @inheritdoc
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
/* end-public-data-members */

module.exports = DomainScope;