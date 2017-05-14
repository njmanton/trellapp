//jshint node: true, esversion: 6
'use strict';

const moment  = require('moment'),
      Promise = require('bluebird'),
      config  = require('./config');

// regex to split up the card title
const re = /(\w+)\s(\d+)\]\s(.*)$/i;

const routes = (app, trello) => {

  app.get('/', (req, res) => {
    res.redirect('/all/');
  })

  // main page
  app.get('/all/:dept?', (req, res) => {

    let cardList = trello.getCardsOnBoard(config.board);

    cardList.then(cards => {

      let depts = {};
      cards.map(card => {
        card.fdate = moment(card.due).format('MMM Do');
        card.matches = re.exec(card.name) || [];
        let dept = card.matches[1];
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
          if (card.labels[x].color == 'black') {
            card.lab = card.labels[x].name;
          }
        }
      })

      let fcards = [];
      if (req.params.dept) {
        fcards = cards.filter(card => { return card.matches[1] == req.params.dept; });
      }

      res.render('list', {
        title: 'All Measures',
        data: (fcards.length) ? fcards : cards,
        total: (fcards.length) ? fcards.length : cards.length,
        gtotal: cards.length,
        depts: depts,
        link: '/all/'
      })
    })

  });

  app.get('/list/:list/:dept?', (req, res) => {

    // get all cards in the list, plus the list details
    let cardList = null, listInfo = null;
    cardList = trello.getCardsOnList(req.params.list);
    listInfo = trello.makeRequest('get', '/1/lists/' + req.params.list);
    
    // join the two promises to handle both together
    Promise.join(cardList, listInfo, (cards, list) => {
      // iterate therough cards to build a array of departmental counts
      let depts = {};
      cards.map(card => {
        card.fdate = moment(card.due).format('MMM Do');
        card.matches = re.exec(card.name) || [];
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
          if (card.labels[x].color == 'black') {
            card.lab = card.labels[x].name;
          }
        }
      })

      // if a filter was applied through the url, apply to cards array
      let fcards = [];
      if (req.params.dept) {
        fcards = cards.filter(card => { return card.matches[1] == req.params.dept; });
      }

      res.render('list', {
        title: 'Measures in ' + list.name,
        data: (fcards.length) ? fcards : cards,
        total: (fcards.length) ? fcards.length : cards.length,
        gtotal: cards.length,
        depts: depts,
        link: '/list/' + list.id + '/'
      })        
    })

  })

  // overdue
  app.get('/special/late/:dept?', (req, res) => {

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
        card.fdate = moment(card.due).format('MMM Do');
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
      if (req.params.dept) {
        od = od.filter(card => { return card.matches[1] == req.params.dept; });
      }
      res.render('list', {
        title: 'Overdue Items',
        data: od,
        total: od.length,
        gtotal: gtotal,
        depts: depts,
        link: '/special/late/'
      })        
    })

  })

  // cards due this week
  app.get('/special/upcoming/:dept?', (req, res) => {

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
        card.fdate = moment(card.due).format('MMM Do');
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
      if (req.params.dept) {
        cards_this_week = cards_this_week.filter(card => { return card.matches[1] == req.params.dept; });
      }       
      res.render('list', {
        title: 'Measures due this week',
        data: cards_this_week,
        gtotal: gtotal,
        depts: depts,
        total: cards_this_week.length,
        link: '/special/upcoming/'
      })      

    })

  })

  // flow
  app.get('/dept/:dept', (req, res) => {

    let cardList = trello.getCardsOnBoard(config.board);
    const now = moment();
    let chkLists = [];

    cardList.then(cards => {

      cards.map(card => {
        card.fdate = moment(card.due).format('MMM Do');
        card.matches = re.exec(card.name) || [];
        let dept = card.matches[1];
        for (let x = 0; x < card.labels.length; x++) {
          if (card.labels[x].color == 'purple') { // geography
            card.geog = card.labels[x].name;
          }
          if (card.labels[x].color == 'red') {
            card.pub = true;
          }
          if (card.labels[x].color == 'black') {
            card.lab = card.labels[x].name;
          }
        }
        card.overdue = (moment(card.due) < now && !card.dueComplete);
      });

      // filter cards by department
      let fcards = [];
      if (req.params.dept) {
        fcards = cards.filter(card => { return card.matches[1] == req.params.dept; });
      }

      // get an array of Promise for checklist items from cards
      fcards.map(card => { chkLists.push(trello.getChecklistsOnCard(card.id)); });

      // handle the returned promises
      Promise.all(chkLists).then(chk => {

        // flatten the checklist array
        let chks = [];
        for (let x = 0; x < chk.length; x++) {
          if (chk[x].length > 0) {
            chks.push(chk[x][0]);
          }
        }

        // map the fcards array to attach the correct checklist
        fcards.map(card => {
          card.checklist = chks.find(item => { return item.idCard == card.id }) || false;
          if (card.checklist) {
            card.checklist.checkItems.map(item => {
              item.done = (item.state == 'complete');
            })              
          }
        })

         // split cards into an array for each Trello list
        let lists = {};
        for (var x = 0; x < fcards.length; x++) {
          let list = config.lists[fcards[x].idList];
          if (list in lists) {
            lists[list].push(fcards[x]);
          } else {
            lists[list] = [fcards[x]];
          }
        }

        res.render('dept', {
          title: 'Measures for ' + req.params.dept,
          data: lists,
          total: fcards.length
        })
        //res.sendStatus(200);

      })

    })
    
  })

  app.get('/test', (req, res) => {

    let cardList = trello.getCardsOnList('58e75fd54a3c6b1c00ebdf21');

    cardList.then(cards => {
      // build array of promises for checklist on each card
      let chkLists = [];
      cards.map(card => {
        chkLists.push(trello.getChecklistsOnCard(card.id));

      })
      // collect all promises and resolve them
      Promise.all(chkLists).then(chk => {
        // find the checklist that corresponds to the card, and attch it to card object
        cards.map(card => {
          card.fdate = moment(card.due).format('MMM Do');
          card.matches = re.exec(card.name) || [];
          card.checklist = chk.find(list => { return list[0].idCard == card.id })[0];
          card.checklist.checkItems.map(item => {
            item.done = (item.state == 'complete');
          })
        })
        res.render('checklist', {
          title: 'test',
          data: cards
        })
        //res.sendStatus(200);
      })
    })
  })

  app.get('/testcheck', (req, res) => {
    trello.makeRequest('get', '/1/checklists/5901f2bafd6249d80559f273').then(c => { console.log(c); res.sendStatus(200); })
  })
} 

module.exports = routes; 
