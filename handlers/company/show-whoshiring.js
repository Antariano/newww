var metrics = metrics = require('newww-metrics')();

module.exports = function (request, reply) {
  var timer = { start: Date.now() };

  var opts = {
    user: request.auth.credentials
  };

  timer.end = Date.now();
  metrics.addPageLatencyMetric(timer, 'whoshiring');

  metrics.addMetric({name: 'whoshiring'});

  reply.view('company/whoshiring', opts);
};
