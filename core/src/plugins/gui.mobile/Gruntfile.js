module.exports = function(grunt) {
    grunt.initConfig({
        copy: {
            smartbannercss: {
                expand: true,
                src: 'node_modules/smart-app-banner/dist/smart-app-banner.css',
                dest: 'res/',
                flatten: true
            },
        },
        babel: {
            options: {},

            dist: {
                files: [
                    {
                        expand: true,
                        cwd: 'res/js/',
                        src: ['**/*.js'],
                        dest: 'res/build/',
                        ext: '.js'
                    }
                ]
            }
        },
        browserify: {
            mobile: {
                files: {
                    'res/build/mobile-build.js': 'res/build/index.js'
                }
            }
        },
        watch: {
            js: {
                files: [
                    "res/**/*"
                ],
                tasks: ['babel'],
                options: {
                    spawn: false
                }
            }
        }
    });
    grunt.loadNpmTasks('grunt-babel');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-browserify');
    grunt.registerTask('default', [
        'copy',
        'babel',
        'browserify'
    ]);

};
