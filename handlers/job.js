'use strict';

var path = require('path');
var Hapi = require('hapi');
var async = require('async');
var db = require('../lib/db');
var runner = require('../lib/runner');

exports.act = function(request, reply) {
  var SLUM = request.params.slug + '-' + request.params.num;
  if (runner.open[SLUM]) {
    reply.view('job/run', runner.open[SLUM].data);
  } else {
    reply.redirect('/' + path.join('job', request.params.slug, request.params.num));
  }
};

exports.list = function(request, reply) {
  var fns = [];
  db.job.find({}).sort({
    SLUG: 1
  }).exec(function(err, jobs) {
    if (err) {
      return reply(Hapi.error.internal(err));
    }
    jobs.forEach(function(job) {
      fns.push(function(cb) {
        db.run.find({
          SLUG: job.SLUG,
          ACT: {
            $exists: false
          }
        }).sort({
          NUM: -1
        }).limit(5).exec(function(err, runs) {
          job.runs = runs;
          cb(err, job);
        });
      });
    });
    async.parallel(fns, function(err) {
      if (err) {
        return reply(Hapi.error.internal(err));
      }
      reply.view('job/list', {
        jobs: jobs
      });
    });
  });
};

exports.open = function(request, reply) {
  var runs = [];
  for (var run in runner.open) {
    runs.push(runner.open[run].data.run);
  }
  reply.view('job/open', {
    runs: runs
  });
};

exports.runs = function(request, reply) {
  async.parallel({
    job: function(cb) {
      db.job.findOne({
        SLUG: request.params.slug
      }, function(err, job) {
        cb(err, job);
      });
    },
    runs: function(cb) {
      db.run.find({
        SLUG: request.params.slug
      }).sort({
        NUM: -1
      }).exec(function(err, runs) {
        cb(err, runs);
      });
    }
  }, function(err, res) {
    if (err) {
      return reply(Hapi.error.internal(err));
    }
    if (!res.job) {
      return reply(Hapi.error.notFound('job not found'));
    }
    reply.view('job/runs', {
      job: res.job,
      runs: res.runs
    });
  });
};

exports.run = function(request, reply) {
  runner.run({
    SLUG: request.params.slug
  }, function(err, res) {
    if (err) {
      return reply(Hapi.error.internal(err));
    }
    if (!res) {
      return reply(Hapi.error.notFound('error initiating run'));
    }
    reply.view('job/run', res);
  });
};
