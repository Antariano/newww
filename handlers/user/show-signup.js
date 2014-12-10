var Joi = require('joi'),
    userValidate = require('npm-user-validate'),
    Hapi = require('hapi'),
    log = require('bole')('user-signup'),
    uuid = require('node-uuid'),
    metrics = require('newww-metrics')(),
    log = require('bole')('show-signup');

module.exports = function signup (request, reply) {
  var getUser = request.server.methods.user.getUser,
      signupUser = request.server.methods.user.signupUser,
      setSession = request.server.methods.user.setSession(request),
      delSession = request.server.methods.user.delSession(request),
      showError = request.server.methods.errors.showError(reply),
      addMetric = metrics.addMetric,
      addLatencyMetric = metrics.addPageLatencyMetric,
      timer = { start: Date.now() };

  var opts = {
    user: request.auth.credentials,
    errors: [],

    namespace: 'user-signup'
  };

  if (request.method === 'post') {
    var schema = Joi.object().keys({
      name: Joi.string().required(),
      password: Joi.string().required(),
      verify: Joi.string().required(),
      email: Joi.string().email().required()
    });

    var joiOptions = {
      convert: false,
      abortEarly: false
    };

    var data = request.payload;

    Joi.validate(data, schema, joiOptions, function (err, validatedUser) {

      if (err) {
        opts.errors = err.details;
      }

      if (validatedUser.password !== validatedUser.verify) {
        opts.errors.push({message: new Error("passwords don't match").message});
      }

      userValidate.username(validatedUser.name) && opts.errors.push({ message: userValidate.username(validatedUser.name).message});

      getUser(validatedUser.name, function (err, userExists) {
        if (userExists) {
          opts.errors.push({message: new Error("username already exists").message})
        }

        if (opts.errors.length) {

          timer.end = Date.now();
          addLatencyMetric(timer, 'signup-form-error');

          addMetric({name: 'signup-form-error'});

          return reply.view('user/signup-form', opts).code(400);
        }

        delSession(validatedUser, function (er) {

          if (er) {
            log.error(String(er));
          }

          signupUser(validatedUser, function (er, user) {

            if (er) {
              return showError(er, 403, 'Failed to create account', opts);
            }

            setSession(user, function (err) {

              if (err) {
                return showError(err, 500, 'Unable to set the session for user ' + opts.user.name, opts);
              }

              timer.end = Date.now();
              addLatencyMetric(timer, 'signup');

              addMetric({name: 'signup'});

              return reply.redirect('/profile-edit');
            });
          });

        });
      });
    });

  }


  if (request.method === 'get' || request.method === 'head') {

    timer.end = Date.now();
    addLatencyMetric(timer, 'signup-form');

    addMetric({ name: 'signup-form' });
    return reply.view('user/signup-form', opts);
  }
};
