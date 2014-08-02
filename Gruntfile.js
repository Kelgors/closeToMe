var
  grunt = require('grunt');

grunt.loadNpmTasks('grunt-contrib-connect');

grunt.initConfig({
  connect: {
    server: {
      options: {
        port: 3000,
        base: './',
        keepalive: true
      }
    }
  }
});