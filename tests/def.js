/**
 * Created by chengfulin on 2015/4/16.
 */
var Def = require('../lib/dujs').Def;

describe('Def class', function () {
    it('should create by constructor well', function () {
        var def = new Def('x', 1);
        def.name.should.eql('x');
        def.from.should.eql(1);

        var emptyDef = new Def();
        (emptyDef.name === undefined).should.be.ok;
        (emptyDef.from === undefined).should.be.ok;
    });
});