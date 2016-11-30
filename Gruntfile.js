module.exports = function(grunt) {

  require('load-grunt-tasks')(grunt);

  grunt.loadNpmTasks('grunt-execute');
  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.initConfig({

    clean: ["dist"],

    copy: {
      src_to_dist: {
        cwd: 'src',
        expand: true,
        src: ['**/*', '!**/*.js', '!**/*.scss'],
        dest: 'dist'
      },
      node_modules_to_dist: {
        cwd: 'node_modules',
        expand: true,
        src: [
          'lodash/lodash.js',
          'crypto-js/crypto-js.js', 
          'moment/moment.js'
        ],
        dest: 'dist',
        flatten: true
      },
      pluginDef: {
        expand: true,
        src: ['plugin.json', 'src/README.md'],
        dest: 'dist',
      }
    },

    watch: {
      rebuild_all: {
        files: ['src/**/*', 'plugin.json', 'README.md'],
        tasks: ['default'],
        options: {spawn: false}
      },
    },

    babel: {
      options: {
        sourceMap: true,
        presets:  ["es2015"],
        plugins: ['transform-es2015-modules-systemjs', "transform-es2015-for-of"],
      },
      dist: {
        files: [{
          cwd: 'src',
          expand: true,
          src: ['**/*.js'],
          dest: 'dist',
          ext:'.js'
        }]
      },
    },

    jshint: {
      source: {
        files: {
          src: ['src/**/*.js'],
        }
      },
      options: {
        jshintrc: true,
        reporter: require('jshint-stylish'),
        ignores: [
          'node_modules/*',
          'dist/*',
        ]
      }
    },

    jscs: {
      src: ['src/**/*.js'],
      options: {
        config: ".jscs.json",
      },
    }

  });

  grunt.registerTask('default', [
    'clean',
    'copy:src_to_dist',
    'copy:node_modules_to_dist',
    'copy:pluginDef',
    'babel'
  ]);

  grunt.registerTask('test', [
    'clean',
    'copy:src_to_dist',
    'copy:node_modules_to_dist',
    'copy:pluginDef',
    'babel',
    'jshint',
    'jscs'
  ]);

};
