/*
 * Test cases for Pair module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-07
 */
var should = require('should');
var Pair = require('../../lib/dujs/pair');

describe('Pair', function () {
	"use strict";
	describe('constructor', function () {
		it('should construct with two elements', function () {
			var elem1 = {value: 1}, elem2 = {value: 2};
			var num1 = 1, num2 = 2;

			var pair1 = new Pair(elem1, elem2);
			pair1._testonly_._first.should.eql(elem1);
			pair1._testonly_._second.should.eql(elem2);
			var pair2 = new Pair(num1, num2);
			pair2._testonly_._first.should.eql(1);
			pair2._testonly_._second.should.eql(2);
		});
	});

	describe('public data members', function () {
		var pair;
		beforeEach(function () {
			pair = new Pair(0, 1);
		});

		describe('first', function () {
			it('should support to retrieve the value', function () {
				pair.first.should.eql(0);
			});

			it('should not be modified directly', function () {
				should(function () {
					pair.first = 1;
				}).throw();
			});
		});

		describe('second', function () {
			it('should support to retrieve the value', function () {
				pair.second.should.eql(1);
			});

			it('should not be modified directly', function () {
				should(function () {
					pair.second = 0;
				}).throw();
			});
		});
	});

	describe('public methods', function () {
		describe('toString', function () {
			it('should represent pair with string well', function () {
				var num1 = 1, num2 = 2;
				var pair1 = new Pair(num1, num2);
				pair1.toString().should.eql('(1,2)');

				var str1 = 'key', str2 = 'val';
				var pair2 = new Pair(str1, str2);
				pair2.toString().should.eql('(key,val)');
			});
		});
	});
});