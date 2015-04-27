/**
 * Created by chengfulin on 2015/4/16.
 */
var DUPair = require('../../lib/dujs/index').DUPair;

describe('DUPair class', function () {
    it('should be created by constructor well', function () {
        var pair = new DUPair(1, 2);
        pair.def.should.eql(1);
        pair.use.should.eql(2);

        var emptyPair = new DUPair();
        (emptyPair.def === undefined).should.be.ok;
        (emptyPair.use === undefined).should.be.ok;
    });
});