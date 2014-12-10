var path = require('path'),
    fs = require('fs'),
    exec = require('child_process').exec;

var root = process.cwd();

var todo = 'install --color=always';

if (process.argv[2] === 't' || process.argv[2] === 'test') {
  todo = 'test'
}

var paths = {}

paths.facets = fs.readdirSync(path.join(root, 'handlers'));
paths.services = fs.readdirSync(path.join(root, 'services'));

Object.keys(paths).forEach(function (type) {
  paths[type].forEach(function (plugin) {
    if (plugin !== '.DS_Store' &&
	(todo !== 'test' || fs.existsSync(path.join(root, type, plugin, 'test'))) ) {
      process.chdir(path.join(root, type, plugin));
      exec('npm ' + todo, cb);
    }
  })
})

function cb (err, stdout, stderr) {
  if (stderr) console.log(stderr);

  if (stdout) console.log(stdout);

  if (err) console.log(err);
};
