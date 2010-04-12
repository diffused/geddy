var fs = require('fs');
var sys = require('sys');
//var child_process = require('child_process');

var fleegix = require('geddy/lib/fleegix');
var meta = require('geddy/lib/util/meta');
var async = require('geddy/lib/async');
var model = require('geddy/lib/model/model');
var session = require('geddy/lib/session');
var hooks = require('geddy/lib/hooks');

var Init = function (config, callback) {

  var _this = this;
  var _callback = callback;

  GLOBAL.controllerRegistry = {};
  GLOBAL.templateRegistry = {};
  GLOBAL.pluginRegistry = {};
  GLOBAL.config = config;
  GLOBAL.router = require(config.dirname + '/config/router').router;
  GLOBAL.hooks = hooks;

  this.registerControllers = function (err, dirList) {
    if (err) {
      sys.puts('Error: ' + JSON.stringify(err));
    }
    else {
      controllerRegistry = meta.registerConstructors('/app/controllers/', dirList);
    }
  };

  this.registerTemplates = function (err, stdin, stderr) {
    if (err) {
      sys.puts('Error: ' + JSON.stringify(err));
    }
    else if (stderr) {
      sys.puts('Error: ' + stderr);
    }
    else {
      var templates = {};
      var files = stdin.split('\n');
      var file;
      var pat = /\.ejs$/;
      for (var i = 0; i < files.length; i++) {
        file = files[i];
        if (pat.test(file)) {
          file = file.replace(config.dirname + '/', '');
          templates[file] = true;
        }
      }
      templateRegistry = templates;
    }
  };

  this.loadPlugins = function () {
    var plugins = config.plugins;
    var path;
    var pathName;
    var cfg;
    for (var pluginName in plugins) {
      cfg = plugins[pluginName];
      pathName = fleegix.string.deCamelize(pluginName);
      path = config.dirname + '/plugins/' + pathName + '/' + pathName;
      pluginRegistry[pluginName] = new require(path)[pluginName](cfg);
    }
  };

  // Synchronous actions
  // ----------
  this.loadPlugins();

  // Asynchronous actions
  // ----------
  var group = new async.AsyncGroup([
    {
      func: session.createStore,
      args: [config.sessions.store],
      callback: null,
    },
    {
      func: fs.readdir,
      args: [config.dirname + '/app/models'],
      callback: model.registerModels
    },
    {
      func: fs.readdir,
      args: [config.dirname + '/app/controllers'],
      callback: this.registerControllers
    },
    {
      func: sys.exec,
      args: ['find ' + config.dirname + '/app/views'],
      callback: this.registerTemplates
    }
  ]);
  group.last = _callback;
  group.run();

};

exports.Init = Init;