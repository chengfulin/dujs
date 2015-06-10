/**
 * Created by ChengFuLin on 2015/5/20.
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
        mochaTest: {
            test: {
                options: {
                    reporter: 'spec',
                    require: 'coverage/blanket'
                },
                src: ['tests/dujs/*.js', 'tests/analyses/*.js', 'tests/esgraph/*.js']
            },
            coverage: {
                options: {
                    reporter: 'html-cov',
                    quiet: true,
                    captureFile: 'coverage/coverage.html'
                },
                src: ['tests/dujs/*.js', 'tests/analyses/*.js', 'tests/esgraph/*.js']
            }
        }
    });

    grunt.loadNpmTasks('grunt-strip-code');
    grunt.loadNpmTasks('grunt-mocha-test');

    grunt.registerTask('default', ['mochaTest']);
    //grunt.registerTask('deploy', ['strip_code']);
    grunt.registerTask('test', ['mochaTest']);
};