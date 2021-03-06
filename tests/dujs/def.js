/**
 * Test cases for Def
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-07-27
 */
var Def = require('../../lib/dujs/def'),
	flownodeFactory = require('../../lib/esgraph/flownodefactory'),
    should = require('should');

describe('Def', function () {
    'use strict';
    beforeEach(function () {
        flownodeFactory.resetCounter();
    });

    describe('static data members', function () {
	    describe('OBJECT_TYPE', function () {
		    it('should have correct value', function () {
				Def.OBJECT_TYPE.should.eql('object');
		    });

		    it('should not support to modify value', function () {
				should(function () {
					Def.OBJECT_TYPE = 'type';
				}).throw();
		    });
	    });

	    describe('FUNCTION_TYPE', function () {
		    it('should have correct value', function () {
			    Def.FUNCTION_TYPE.should.eql('function');
		    });

		    it('should not support to modify value', function () {
			    should(function () {
				    Def.FUNCTION_TYPE = 'type';
			    }).throw();
		    });
	    });

	    describe('LITERAL_TYPE', function () {
		    it('should have correct value', function () {
			    Def.LITERAL_TYPE.should.eql('literal');
		    });

		    it('should not support to modify value', function () {
			    should(function () {
				    Def.LITERAL_TYPE = 'type';
			    }).throw();
		    });
	    });

	    describe('UNDEFINED_TYPE', function () {
		    it('should have correct value', function () {
			    Def.UNDEFINED_TYPE.should.eql('undefined');
		    });

		    it('should not support to modify value', function () {
			    should(function () {
				    Def.UNDEFINED_TYPE = 'type';
			    }).throw();
		    });
	    });

	    describe('HTML_DOM_TYPE', function () {
		    it('should have correct value', function () {
			    Def.HTML_DOM_TYPE.should.eql('htmlDom');
		    });

		    it('should not support to modify value', function () {
			    should(function () {
				    Def.HTML_DOM_TYPE = 'type';
			    }).throw();
		    });
	    });
	    describe('LOCAL_STORAGE_TYPE', function () {
		    it('should have correct value', function () {
			    Def.LOCAL_STORAGE_TYPE.should.eql('localStorage');
		    });

		    it('should not support to modify value', function () {
			    should(function () {
				    Def.LOCAL_STORAGE_TYPE = 'type';
			    }).throw();
		    });
	    });
    });

	describe('static methods', function () {
		describe('fromValidNode', function () {
			it('should return true as the node is a FlowNode', function () {
				var node = flownodeFactory.createNormalNode();
				node.cfgId = 0;
				Def.fromValidNode(node).should.eql(true);
			});

			it('should return false as the node is not a FlowNode', function () {
				Def.fromValidNode({type: 'normal'}).should.eql(false);
			});
		});

		describe('validate', function () {
			it('should not throw as the value is valid', function () {
				should(function () {
					var node = flownodeFactory.createNormalNode();
					node.cfgId = 0;
					Def.validate(
						node,
						'function',
						[0,1]
					);
				}).not.throw();

				should(function () {
					var node = flownodeFactory.createNormalNode();
					node.cfgId = 0;
					Def.validate(
						node,
						'literal',
						[0,1]
					);
				}).not.throw();
			});

			it('should throw as the node is invalid', function () {
				should(function () {
					Def.validate(
						{type: 'normal'},
						'object'
					);
				}).throw('Invalid value for a Def');
			});

			it('should throw as the type is invalid', function () {
				should(function () {
					var node = flownodeFactory.createNormalNode();
					node.cfgId = 0;
					Def.validate(
						node,
						'invalidType'
					);
				}).throw('Invalid value for a Def');
			});
		});

		describe('validateType', function () {
			it('should not throw as the object is a Def', function () {
				should(function () {
					var node = flownodeFactory.createNormalNode();
					node.cfgId = 0;
					Def.validateType(new Def(node, 'object', [0,1]));
				}).not.throw();
			});

			it('should throw an error "Not a Def" as the object is not a Def', function () {
				should(function () {
					Def.validateType({type: 'object', fromNode: null});
				}).throw('Not a Def');
			});

			it('should support to throw custom error', function () {
				should(function () {
					Def.validateType({type: 'object', fromNode: null}, 'Custom Error');
				}).throw('Custom Error');
			});
		});
	});

	describe('public methods', function () {
		describe('toString', function () {
			it('should convert to string correctly', function () {
				var node1 = flownodeFactory.createNormalNode(),
					node2 = flownodeFactory.createNormalNode();
				node1.cfgId = 0;
				node2.cfgId = 1;

				var aDef = new Def(node1, 'object', [0,1]), another = new Def(node2, 'literal', [1,2]);
				aDef.toString().should.eql('object@n0');
				another.toString().should.eql('literal@n1');
			});
		});

		describe('toJSON', function () {
			it('should support to convert the definition to JSON', function () {
				var node = flownodeFactory.createNormalNode();
				var def = new Def(node, 'literal', [0,1]);
				def.toJSON().should.containDeep({
					"fromNode": {
						"cfgId": 0,
						"type": "normal",
						"label": null,
						"prev": [],
						"next": []
					},
					"type": "literal",
					"range": [0,1]
				});
			});
		});
	});

    describe('public data members', function () {
        var node, def;
        beforeEach(function () {
            node = flownodeFactory.createNormalNode();
            node.cfgId = 0;
            def = new Def(node, 'literal', [0,1]);
        });

        describe('fromNode', function () {
            it('should support to retrieve the value correctly', function () {
                should.exist(def.fromNode);
                def.fromNode._testonly_._cfgId.should.eql(0);
                def.fromNode._testonly_._type.should.eql('normal');
                def._testonly_._fromNode.should.eql(def.fromNode);
            });

	        it('should not support to modify value', function () {
		        should(function () {
			        def.fromNode = null;
		        }).throw();
	        });

	        it('should be enumerable', function () {
		        Def.prototype.propertyIsEnumerable('fromNode').should.eql(true);
	        });
        });

        describe('type', function () {
            it('should support to retrieve the value correctly', function () {
                should.exist(def.type);
                def.type.should.eql('literal');
                def._testonly_._type.should.eql(def.type);
            });

	        it('should not support to modify value', function () {
		        should(function () {
			        def.type = 'invalid';
		        }).throw();
	        });

	        it('should be enumerable', function () {
		        Def.prototype.propertyIsEnumerable('type').should.eql(true);
	        });
        });

		describe('range', function () {
			it('should support to retrieve the value correctly', function () {
				should.exist(def.range);
				def.range._testonly_._start.should.eql(0);
				def.range._testonly_._end.should.eql(1);
			});

			it('should not be modified directly', function () {
				should(function () {
					def.range = [1,2];
				}).throw();
			});

			it('should be enumerable', function () {
				var descriptor = Object.getOwnPropertyDescriptor(Def.prototype, 'range');
				descriptor.enumerable.should.eql(true);
			});
		});
    });
});