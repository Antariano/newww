var TWO_WEEKS = 1000 * 60 * 60 * 24 * 14; // in milliseconds

var Hapi = require('hapi'),
    log = require('bole')('company-homepage'),
    uuid = require('node-uuid'),
    metrics = require('newww-metrics')(),
    parseLanguageHeader = require('accept-language-parser').parse,
    fmt = require('util').format,
    moment = require('moment');

module.exports = function (request, reply) {
  var timer = { start: Date.now() };

  var yetAnotherPackagePresenter = function(pkg) {
    pkg.installCommand = "npm install " + pkg.name + (pkg.preferGlobal ? " -g" : "")
    pkg.starCount = pkg.users ? Object.keys(pkg.users).length : 0
    pkg.url = "/package/" + pkg.name

    pkg.version = pkg['dist-tags'].latest
    if (pkg.versions) {
      pkg.version = pkg.versions[pkg.version].version
      pkg.publishedBy = pkg.versions[pkg.version]._npmUser
    }
    pkg.lastPublished = moment(pkg.time[pkg.version]).fromNow()
    delete pkg.versions
    delete pkg.readme
    return pkg
  }

  load(request, function (err, cached) {

    var opts = {
      user: request.auth.credentials,
      updated: cached.updated || [],
      depended: cached.depended || [],
      starred: cached.starred || [],
      authors: cached.authors || [],
      downloads: cached.downloads,
      totalPackages: cached.totalPackages,
      explicit: require("npm-collection-explicit-installs")
        .packages
        .slice(0,15)
        .map(yetAnotherPackagePresenter),
      staffPicks: require("npm-collection-staff-picks")
        .packages
        .slice(0,15)
        .map(yetAnotherPackagePresenter),
    };

    timer.end = Date.now();
    metrics.addPageLatencyMetric(timer, 'homepage');

    metrics.addMetric({name: 'homepage'});

    // Return raw context object if `json` query param is present
    if (String(process.env.NODE_ENV).match(/dev|staging/) &&  'json' in request.query) {
      return reply(opts);
    }

    return reply.view('company/index', opts);

  });
}

// ======= functions =======

function load (request, cb) {
  var registry = request.server.methods.registry,
      recentAuthors = registry.getRecentAuthors,
      addMetric = metrics.addMetric,
      downloads = request.server.methods.downloads.getAllDownloads;

  var n = 5,
      cached = {};

  // registry.getStarredPackages(false, 0, 12, next('starred'));
  registry.getDependedUpon(false, 0, 12, next('depended'));
  registry.getUpdated(0, 12, next('updated'));
  recentAuthors(TWO_WEEKS, 0, 12, next('authors'));
  downloads(next('downloads'));
  registry.packagesCreated(next('totalPackages'));

  function next (which) {
    return function (err, data) {

      if (err) {
        log.warn(uuid.v1() + ' ' + Hapi.error.internal('download error for ' + which), err);
      }

      cached[which] = data;
      if (--n === 0) {
        return cb(null, cached);
      }
    }
  }
}
