/**
 * Created by chengfulin on 2015/4/22.
 */
var VarTable = require('../lib/dujs').VarTable,
    Var = require('../lib/dujs').Var,
    Set = require('../lib/analyses').Set,
    should = require('should');

describe('VarTable', function () {
    var var1, var2, var3, var4;
    beforeEach(function () {
        var1 = new Var('var1', 'Program');
        var2 = new Var('var2', 'Global');
        var3 = new Var('var3', 'fun');
        var4 = new Var('var4', 0);
    });

    describe('constructor', function () {
        it('should create empty table well', function () {
            var table = new VarTable();
            (table.table instanceof Map).should.be.true;
            table.table.should.be.empty;
        });
        it('should create table initialized by an array of Vars well', function () {
            var table = new VarTable([
                    var1, var2, var3, var4
                ]),
                emptyTable = new VarTable([]);
            (table.table.size).should.eql(4);
            table.table.get(var1).should.be.ok;
            table.table.get(var2).should.be.ok;
            table.table.get(var3).should.be.ok;
            table.table.get(var4).should.be.ok;

            (emptyTable.table).should.be.empty;

            (function () {
                new VarTable([0, 1, 2]);
            }).should.throw('Incorrect type of param as Var for processing');
        });
    });

    describe('methods', function () {
        describe('isParamVar', function () {
            it('should check the parameter well', function () {
                VarTable.isParamVar(new Var('name', 'fun')).should.be.true;
                VarTable.isParamVar({}).should.be.false;
            });
        });

        describe('validate', function () {
            it('should validate well', function () {
                (function () {
                    VarTable.validate(new Var('name', 'fun'));
                }).should.not.throw();
                (function () {
                    VarTable.validate({});
                }).should.throw('Incorrect type of param as Var for processing');
            });
        });

        describe('has', function () {
            it('should support checking the table has a variable', function () {
                var varTable = new VarTable([var1]);

                (function () {
                    varTable.has('var1');
                }).should.throw('Incorrect type of param as Var for processing');
                (function () {
                    varTable.has({});
                }).should.throw('Incorrect type of param as Var for processing');
                (function () {
                    varTable.has();
                }).should.throw('Incorrect type of param as Var for processing');

                varTable.has(var1).should.be.true;
                varTable.has(var2).should.be.false;
            });
        });

        describe('add', function () {
            it('should support adding new Var to the table', function () {
                var varTable = new VarTable();

                (function () {
                    varTable.add('var1');
                }).should.throw('Incorrect type of param as Var for processing');
                (function () {
                    varTable.add({});
                }).should.throw('Incorrect type of param as Var for processing');
                (function () {
                    varTable.add();
                }).should.throw('Incorrect type of param as Var for processing');

                varTable.add(var1);
                varTable.table.size.should.eql(1);
                (varTable.table.get(var1) instanceof Set).should.be.true;
                varTable.table.get(var1).values().should.be.empty;
            });
        });

        describe('get', function () {
            it('should support getting the value since a Var as input', function () {
                var varTable = new VarTable([
                    var2, var3
                ]);

                (function () {
                    varTable.get('var2');
                }).should.throw('Incorrect type of param as Var for processing');
                (function () {
                    varTable.get({});
                }).should.throw('Incorrect type of param as Var for processing');
                (function () {
                    varTable.get();
                }).should.throw('Incorrect type of param as Var for processing');

                should.not.exist(varTable.get(var1));
                (varTable.get(var2) instanceof Set).should.be.true;
                varTable.get(var2).values().should.be.empty;
                (varTable.get(var3) instanceof Set).should.be.true;
                varTable.get(var3).values().should.be.empty;
            });
        });

        describe('delete', function () {
            it('should support deleting the value since a Var as input', function () {
                var varTable = new VarTable([var4]);

                (function () {
                    varTable.delete('var4');
                }).should.throw('Incorrect type of param as Var for processing');
                (function () {
                    varTable.delete({});
                }).should.throw('Incorrect type of param as Var for processing');
                (function () {
                    varTable.delete();
                }).should.throw('Incorrect type of param as Var for processing');

                varTable.delete(var2);
                varTable.table.size.should.eql(1);
                should.exist(varTable.table.get(var4));

                varTable.delete(var4);
                varTable.table.size.should.eql(0);
                should.not.exist(varTable.table.get(var4));
            });
        });

        describe('addSameDefVar', function () {
            it('should support adding a Var to the set of Vars having same Def', function () {
                var varTable = new VarTable([var1]);

                (function () {
                    varTable.addSameDefVar(var2, var3);
                }).should.throw('Accessing not existed Var');

                varTable.addSameDefVar(var1, var1);
                varTable.table.get(var1).values().should.be.empty;

                varTable.addSameDefVar(var1, var3);
                varTable.table.get(var1).values().length.should.eql(1);
                varTable.table.get(var1).values().should.containDeep([var3]);
            });
        });

        describe('removeSameDefVar', function () {
            it('should support removing a Var from the set of Vars having same Def', function () {
                var varTable = new VarTable([var1]);

                (function () {
                    varTable.removeSameDefVar(var2, var3);
                }).should.throw('Accessing not existed Var');

                varTable.table.set(var1, new Set([var3]));
                varTable.table.get(var1).values().length.should.eql(1);
                varTable.table.get(var1).values().should.containDeep([var3]);
                varTable.removeSameDefVar(var1, var3);
                varTable.table.get(var1).values().should.empty;
            });
        });

        describe('hasSameDefVar', function () {
            it('should support finding a Var from the set of Vars having same Def', function () {
                var varTable = new VarTable([var2]);

                (function () {
                    varTable.hasSameDefVar(var1, var4);
                }).should.throw('Accessing not existed Var');

                varTable.table.set(var2, new Set([var4]));
                varTable.table.get(var2).values().length.should.eql(1);
                varTable.table.get(var2).values().should.containDeep([var4]);
                varTable.hasSameDefVar(var2, var4).should.be.true;
            });
        });
    });
});