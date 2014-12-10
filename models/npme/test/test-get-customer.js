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
  server = Hapi.createServer('localhost', '9111');

  server.pack.register([
    {
      plugin: npme,
      options: config
    }
  ], function () {
    server.start(done);
  });
});


describe('getting a customer from hubspot', function () {
  it('returns a customer when hubspot returns a customer', function (done) {
    var email = 'boom@bam.com';

    var hubspot = nock('https://billing.website.com')
      .get('/customer/' + email)
      .reply(200, {name: "boom"})

    server.methods.npme.getCustomer(email, function (err, customer) {

      expect(err).to.be.null;
      expect(customer).to.exist;
      expect(customer.name).to.equal("boom");
      done();
    });
  });

  it('returns null when hubspot does not find the customer', function (done) {
    var email = 'boom@bam.com';

    var hubspot = nock('https://billing.website.com')
      .get('/customer/' + email)
      .reply(404)

    server.methods.npme.getCustomer(email, function (err, customer) {

      expect(err).to.be.null;
      expect(customer).to.be.null;
      done();
    });
  });

  it('returns an error when hubspot returns an odd status code', function (done) {
    var email = 'boom@bam.com';

    var hubspot = nock('https://billing.website.com')
      .get('/customer/' + email)
      .reply(400)

    server.methods.npme.getCustomer(email, function (err, customer) {

      expect(err).to.exist;
      expect(err.message).to.equal("unexpected status code: 400")
      expect(customer).to.not.exist;
      done();
    });
  });
});