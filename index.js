#!/usr/bin/env node

//jshint node: true, esversion: 6
'use strict';

const config  = require('./config'),
      inq     = require('inquirer'),
      Trello  = require('node-trello'),
      chalk   = require('chalk');

const t = new Trello(config.api, config.token);

t.get('/1/boards/' + config.board + '/cards', (err, data) => {
  if (err) throw err;
  console.log(data[17]);
})

