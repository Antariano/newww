var Lab = require('lab'),
    lab = exports.lab = Lab.script(),
    describe = lab.experiment,
    before = lab.before,
    after = lab.after,
    it = lab.test,
    expect = Lab.expect;

var Hapi = require('hapi'),
    npme = require('../index'),
    request = require('request'),
    nock = require('nock'),
    config = require('../../../config');

var server;

before(function (done) {
  server = Hapi.createServer('localhost', '9119');

  server.pack.register([
    {
      plugin: npme,
      options: config
    }
  ], function () {
    server.start(done);
  });
});

describe('creating a customer in hubspot', function () {
  it('returns a customer when hubspot creates it', function (done) {
    var data = {
      email: 'boom@bam.com',
      firstname: 'Boom',
      lastname: 'Bam',
      phone: '123-456-7890'
    };

    var dataIn = {
      email: data.email,
      name: data.firstname + ' ' + data.lastname,
      phone: data.phone
    };

    var hubspot = nock('https://billing.website.com')
        .put('/customer', dataIn)
        .reply(200, data);

    server.methods.npme.createCustomer(data, function (err, customer) {
      expect(err).to.not.exist;
      expect(customer).to.equal.data;
      done();
    });
  });

  it('returns an error when hubspot is not successful', function (done) {
    var data = {
      email: 'boom@bam.com',
      firstname: 'Boom',
      lastname: 'Bam',
      phone: '123-456-7890'
    };

    var dataIn = {
      email: data.email,
      name: data.firstname + ' ' + data.lastname,
      phone: data.phone
    };

    var hubspot = nock('https://billing.website.com')
        .put('/customer', dataIn)
        .reply(400);

    server.methods.npme.createCustomer(data, function (err, customer) {
      expect(err).to.exist;
      expect(err.message).to.equal('unable to create customer');
      expect(customer).to.not.exist;
      done();
    });
  });

});

