//jshint node: true, esversion: 6
'use strict';

const express         = require('express'),
      app             = express(),
      expressSession  = require('express-session'),
      bars            = require('express-handlebars'),
      flash           = require('connect-flash'),
      pkg             = require('./package.json'),
      winston         = require('winston'),
      apicache        = require('apicache'),
      basicAuth       = require('express-basic-auth'),
      config          = require('./config'),
      Promise         = require('bluebird'),
      moment          = require('moment'),
      cron            = require('node-cron'),
      Trello          = require('trello');

// handlebars as templating engine
app.engine('.hbs', bars({
  defaultLayout: 'layout', extname: '.hbs'
}));
app.set('view engine', '.hbs');

// set static route
app.use(express.static('assets'));

app.use(expressSession({
  secret: 'df5Jdxcx3ghCrgcjb8F565fw',
  resave: false,
  saveUninitialized: false,
  maxAge: 3600000 // 1 hour
}));

app.use(flash());

// set server port
app.set('port', process.env.PORT || 1977);

var pass = process.env.HTTP_PASS,
    user = process.env.HTTP_USER;

app.use(basicAuth({
  users: { 
    [user]: pass,
  },
  challenge: true
}))
 
let logger = new (winston.Logger)({
  transports: [
    new (winston.transports.File)({ filename: 'progress.log', level: 'info', timestamp: false })
  ]
});

// winston.add(
//   winston.transports.File, {
//     filename: 'progress.log',
//     level: 'info',
//     json: false,
//     eol: '\n',
//     timestamp: false
//   }
// )
// setup a cache for the API calls to trello
let cache = apicache.middleware;
app.use(cache('1 minute'));

// create a new Trello object, with supplied credentials
const trello = new Trello(process.env.TRELLO_API, process.env.TRELLO_TOKEN);

cron.schedule('0 1 * * *', () => {
  let upload  = trello.getCardsOnList('58e76046893294e85be058ab'),
      signoff = trello.getCardsOnList('58e7604e6dbfb65b96f3a1f6');

  Promise.join(upload, signoff, (u, s) => {
    logger.info(moment().format('YYYY-MM-DD'), u.length, s.length);
  })
  
});

app.locals.lists = config.lists;
app.locals.deptList = config.deptList;
app.locals.checklist = config.checklist;

// routing
require('./routes')(app, trello);

// start server
const server = app.listen(app.get('port'), () => {
  console.log(pkg.name, 'running on port', server.address().port);
})
