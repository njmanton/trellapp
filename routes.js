//jshint node: true, esversion: 6
'use strict';

const moment = require('moment'),
      config = require('./config');

// regex to split up the card title
const re = /(\w+)\s(\d+)\]\s(.*)$/i;

const routes = (app, trello) => {

  // pattern
  app.get('/some_route', (req, res) => {

    t.get('/1/lists/<list id>/cards', (err, cards) => {
      // cards holds array of card data from Trello API
      // 
      if (err) {
        res.sendStatus(400);
      } else {
        res.sendStatus(200);
      }      
    })

  })

  // main page
  app.get('/', (req, res) => {

    let cardList = trello.getCardsOnList(config.snr_list);
    cardList.then(cards => {

      let depts = {};
      cards.map(card => { 
        card.fdate = moment(card.due).format('MMM Do YY');
        card.matches = re.exec(card.name);
        let dept = card.matches[1];
        if (dept in depts) {
          depts[dept]++;
        } else {
          depts[dept] = 1;
        }
        for (var x = 0; x < card.labels.length; x++) {
          if (card.labels[x].color == 'purple') { // geography
            card.geog = card.labels[x].name;
          }
          if (card.labels[x].color == 'red') {
            card.pub = true;
          }
        }
      })

      // if a filter was applied through the url, apply to cards array
      let fcards = [];
      if (req.query.d) {
        fcards = cards.filter(card => { return card.matches[1] == req.query.d; });
      }
      res.render('main', {
        title: 'All Measures',
        data: (fcards.length) ? fcards : cards,
        total: (fcards.length) ? fcards.length : cards.length,
        gtotal: cards.length,
        depts: depts,
        page: req.url
      })        
    })

  })

  // overdue
  app.get('/late', (req, res) => {

    let cardList = trello.getCardsOnList(config.snr_list);
    cardList.then(cards => {
      
      // filter cards to get overdue items
      const now = moment();
      let od = cards.filter(card => { return (now > moment(card.due) && !card.dueComplete ) });

      // sort cards on basis of due date
      od.sort((a, b) => {
        return (moment(a.due) > moment(b.due));
      })

      let gtotal = od.length; // unfiltered card total
      
      // object to hold dept counts
      let depts = {};
      
      // iterate over cards to create labels and columns
      od.map(card => {
        card.fdate = moment(card.due).format('MMM Do YY');
        card.matches = re.exec(card.name);
        let dept = card.matches[1];
        // count each department
        if (dept in depts) {
          depts[dept]++;
        } else {
          depts[dept] = 1;
        }
          for (let x = 0; x < card.labels.length; x++) {
            if (card.labels[x].color == 'purple') { // geography
              card.geog = card.labels[x].name;
            }
            if (card.labels[x].color == 'red') {
              card.pub = true;
            }
          }
      })

      // if a filter was applied through the url, apply to cards array
      if (req.query.d) {
        od = od.filter(card => { return card.matches[1] == req.query.d; });
      }
      res.render('main', {
        title: 'Overdue Items',
        data: od,
        total: od.length,
        gtotal: gtotal,
        depts: depts,
        page: req.url
      })        
    })

  })

  // cards due this week
  app.get('/upcoming', (req, res) => {

    let cardList = trello.getCardsOnList(config.snr_list);
    cardList.then(cards => {

      const eow = moment().endOf('isoweek'),
            sow = moment().startOf('isoweek');
      let cards_this_week = [];

      for (var y = 0; y < cards.length; y++) {
        const due = moment(cards[y].due);
        if (due > sow && due < eow) {
          cards_this_week.push(cards[y]);
        } 
      }
      const gtotal = cards_this_week.length;
      let depts = {};        
      cards_this_week.map(card => { 
        card.fdate = moment(card.due).format('MMM Do YY');
        card.matches = re.exec(card.name);

        let dept = card.matches[1];
        // count each department
        if (dept in depts) {
          depts[dept]++;
        } else {
          depts[dept] = 1;
        }

        for (var x = 0; x < card.labels.length; x++) {
          if (card.labels[x].color == 'purple') { // geography
            card.geog = card.labels[x].name;
          }
          if (card.labels[x].color == 'red') {
            card.pub = true;
          }
        }
      })

      // if a filter was applied through the url, apply to cards array
      if (req.query.d) {
        cards_this_week = cards_this_week.filter(card => { return card.matches[1] == req.query.d; });
      }       
      res.render('main', {
        title: 'Measures due this week',
        data: cards_this_week,
        gtotal: gtotal,
        depts: depts,
        total: cards_this_week.length,
        page: req.url
      })      

    })

  })

  // flow
  app.get('/test', (req, res) => {

  })

} 

module.exports = routes; 
