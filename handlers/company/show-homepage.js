var TWO_WEEKS = 1000 * 60 * 60 * 24 * 14; // in milliseconds

var async = require('async'),
    Hapi = require('hapi'),
    log = require('bole')('company-homepage'),
    uuid = require('node-uuid'),
    metrics = require('newww-metrics')(),
    parseLanguageHeader = require('accept-language-parser').parse,
    fmt = require('util').format,
    moment = require('moment'),
    once = require('once');

module.exports = function (request, reply) {
  var timer = { start: Date.now() };

  load(request, function (err, cached) {

    var opts = {
      user: request.auth.credentials,
      updated: cached.updated || [],
      depended: cached.depended || [],
      starred: cached.starred || [],
      // authors: cached.authors || [],
      downloads: cached.downloads,
      totalPackages: cached.totalPackages,
      explicit: require("../../lib/explicit-installs.json").slice(0,15).map(function(pkg) {
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

        // Add logos
        var logos = {
          bower: "https://i.cloudup.com/Ka0R3QvWRs.png",
          browserify: "https://d21ii91i3y6o6h.cloudfront.net/gallery_images/from_proof/1647/small/1405586570/browserify-2-hexagon-sticker.png",
          "coffee-script": "https://cldup.com/kyDqUBuW3k.png",
          cordova: "https://cldup.com/q5Jmvu10tV.png",
          dat: "https://d21ii91i3y6o6h.cloudfront.net/gallery_images/from_proof/1497/large/1403068242/dat-data.png",
          express: "https://cldup.com/wpGXm1cWwB.png",
          forever: "https://cldup.com/iSilAlBYLW.svg",
          gulp: "https://raw.githubusercontent.com/gulpjs/artwork/master/gulp-2x.png",
          grunt: "https://i.cloudup.com/bDkmXyEmr5.png",
          "grunt-cli": "https://i.cloudup.com/bDkmXyEmr5.png",
          karma: "https://cldup.com/0286W-2y27.png",
          less: "https://i.cloudup.com/LYSQDzsBKK.png",
          npm: "https://cldup.com/Rg6WLgqccB.svg",
          pm2: "https://cldup.com/PKpktytKH9.png",
          statsd: "https://cldup.com/3s3hGntQAy.svg",
          yo: "https://cldup.com/P3MQgWdDyG.png",
        }

        for (var name in logos) {
          if (name === pkg.name) {
            pkg.logo = logos[name]
          }
        }

        return pkg
      })
    };

    timer.end = Date.now();
    metrics.addPageLatencyMetric(timer, 'homepage');
    metrics.addMetric({name: 'homepage'});

    return reply.view('company/index', opts);
  });
}

// ======= functions =======

function load (request, cb) {
  var registry = request.server.methods.registry,
      // recentAuthors = registry.getRecentAuthors,
      addMetric = metrics.addMetric,
      downloads = request.server.methods.downloads.getAllDownloads,
      cached = {};

  async.parallel([
    function(cb) { cbWithTimeout('depended', registry.getDependedUpon, [false, 0, 12], cached, cb); },
    function(cb) { cbWithTimeout('updated', registry.getUpdated, [0, 12], cached, cb); },
    function(cb) { cbWithTimeout('downloads', downloads, [], cached, cb); },
    function(cb) { cbWithTimeout('totalPackages', registry.packagesCreated, [], cached, cb); }
  ], function(err) {
    if (err) log.warn(uuid.v1() + ' ' + Hapi.error.internal('download error'), err);
    return cb(null, cached);
  });
}

function cbWithTimeout(which, method, args, cached, cb) {
  var timeout = process.env.API_TIMEOUT ? parseInt(process.env.API_TIMEOUT) : 3000; // maximum execution time when loading data.

  cb = once(cb); // make it so CB can only be executed once.

  args.push(function(err, data) {
    if (err) log.warn(uuid.v1() + ' ' + Hapi.error.internal('download error for ' + which), err);
    if (data) cached[which] = data;
    return cb();
  });

  setTimeout(function() {
    if (!cb.called) log.warn(uuid.v1() + ' ' + Hapi.error.internal('timeout loading ' + which));
    return cb();
  }, timeout);

  method.apply(this, args); // actually execute the method passed in.
}
