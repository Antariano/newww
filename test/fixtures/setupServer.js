var Hapi = require('hapi'),
    config = require('../../config'),
    metricsConfig = config.metrics,
    MetricsClient = require('newww-metrics');

module.exports = function (done) {
  process.env.NODE_ENV = 'dev';

  var metrics = new MetricsClient(metricsConfig);

  var server = Hapi.createServer();
  server.views(config.views);
  server.methods = require('./mock-server-methods')(server);

  server.pack.register(require('hapi-auth-cookie'), function (err) {
    if (err) throw err;

    server.app.cache = server.cache('sessions', {
      expiresIn: 30
    });

    server.auth.strategy('session', 'cookie', 'try', {
      password: '12345'
    });

    server.pack.register({
      plugin: require('crumb'),
      options: { cookieOptions: { isSecure: true } }
    }, function (err) {
      server.route(require('../../routes'));

      // manually start the cache
      server.app.cache._cache.connection.start(done);
    });

  });

  return server;
}
