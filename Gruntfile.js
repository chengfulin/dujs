/*
 * Gruntfile
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015/5/20
 */
module.exports = function (grunt) {
    "use strict";
    grunt.initConfig({
        strip_code: {
            options: {
                start_comment: 'start-test-block',
                end_comment: 'end-test-block'
            },
            your_target: {
                src: ['lib/**/*.js']
            }
        },
        mocha_istanbul: {
            options: {
                timeout: 3000
            },
            coverage: {
                src: [
	                'tests/analyses/*.js',
	                'tests/dujs/*.js',
	                'tests/esgraph/flownodetest.js',
	                'tests/esgraph/flownodefactory.js',
	                'tests/esgraph/test.js'
                ],
            },
            coveralls: {
                src: ['tests'], // multiple folders also works
                options: {
                    coverage: true, // this will make the grunt.event.on('coverage') event listener to be triggered
                    check: {
                        lines: 75,
                        statements: 75
                    },
                    root: './lib', // define where the cover task should consider the root of libraries that are covered by tests
                    reportFormats: ['cobertura', 'lcovonly']
                }
            }
        },
        istanbul_check_coverage: {
            default: {
                options: {
                    coverageFolder: 'coverage*', // will check both coverage folders and merge the coverage results
                    check: {
                        lines: 80,
                        statements: 80
                    }
                }
            }
        },
	    jsdoc: {
		    dist : {
			    src: [
				    'lib/namespace.js',
				    'lib/dujs/*.js',
				    'lib/esgraph/flownode.js',
				    'lib/esgraph/flownodefactory.js'
			    ],
			    jsdoc: './node_modules/.bin/jsdoc'
		    }
	    }
    });

    grunt.event.on('coverage', function(lcovFileContents, done){
        // Check below on the section "The coverage event"
        done();
    });

    grunt.loadNpmTasks('grunt-strip-code');
    grunt.loadNpmTasks('grunt-mocha-istanbul');
	grunt.loadNpmTasks('grunt-jsdoc');

    grunt.registerTask('default', ['mocha_istanbul:coverage']);
    //grunt.registerTask('deploy', ['strip_code']);
    grunt.registerTask('coverage', ['mocha_istanbul:coverage']);
	grunt.registerTask('doc', ['jsdoc']);
};