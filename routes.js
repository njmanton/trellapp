//jshint node: true, esversion: 6
'use strict';

const moment  = require('moment'),
      Promise = require('bluebird'),
      chalk   = require('chalk'),
      winston = require('winston'),
      config  = require('./config');

// regex to split up the card title
const re = /(\w+)\s(\d+)\]\s(.*)$/i;

// function to add custom labels to the handlebars data, based on Trello labels
const getLabels = cards => {

  return cards.map(card => {
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
      if (card.labels[x].color == 'pink') {
        card.ons = 'ONS';
      }
      if (card.labels[x].color == 'orange') {
        card.onspop = 'ONS pop';
      }
      if (card.labels[x].color == 'lime') {
        card.pri = true;
      }
    }
  })

}

const getPeople = cards => {

  return cards.map(card => {
    card.people = [];
    for (let x = 0; x < card.idMembers.length; x++) {
      let person = config.members.find(item => card.idMembers[x] == item.id ) || null;
      if (person) {
        card.people.push(person);
      }
    }
  })
}

const routes = (app, trello) => {

  // redirect from app
  app.get('/', (req, res) => {
    res.redirect('/all/');
  })

  // main page
  app.get('/all/:dept?', (req, res) => {

    let cardList = trello.getCardsOnBoard(config.board);

    cardList.then(cards => {

      let depts = {};
      getLabels(cards);

      cards.map(card => {
        card.fdate = moment(card.due).format('MMM Do');
        card.matches = re.exec(card.name) || [];
        let dept = card.matches[1];
        if (dept in depts) {
          depts[dept]++;
        } else {
          depts[dept] = 1;
        }
      })

      // don't include cards in out of scope list
      cards = cards.filter(c => { return c.idList != '58e75ed1a39ca5a7fd801b76'; });

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
      // iterate through cards to build a array of departmental counts
      let depts = {};
      getLabels(cards);
      cards.map(card => {
        card.fdate = moment(card.due).format('MMM Do');
        card.matches = re.exec(card.name) || [];
        let dept = card.matches[1];
        if (dept) {
          if (dept in depts) {
            depts[dept]++;
          } else {
            depts[dept] = 1;
          }          
        }
      })

      cards = cards.filter(card => card.matches.length );

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

  });

  // overdue
  app.get('/special/late/:dept?', (req, res) => {

    let cardList = trello.getCardsOnList(config.snr_list);
    cardList.then(cards => {
      
      // filter cards to get overdue items
      const now = moment();
      let od = cards.filter(card => { return (now > moment(card.due) && !card.dueComplete && card.idList != '58e75ed1a39ca5a7fd801b76') });

      // sort cards on basis of due date
      od.sort((a, b) => {
        return (moment(a.due) > moment(b.due));
      })

      let gtotal = od.length; // unfiltered card total
      
      // object to hold dept counts
      let depts = {};
      getLabels(od);
      
      //iterate over cards to create labels and columns
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

  });

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
      getLabels(cards_this_week);  

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

  });

  // flow
  app.get('/dept/:dept', (req, res) => {

    let cardList = trello.getCardsOnBoard(config.board);
    const now = moment();
    let chkLists = [];

    cardList.then(cards => {

      getLabels(cards);
      cards.map(card => {
        card.fdate = moment(card.due).format('MMM Do');
        card.matches = re.exec(card.name) || [];
        let dept = card.matches[1];
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

      })

    })
    
  });

  app.get('/checklist/:item', (req, res) => {

    trello.makeRequest('get', '/1/boards/' + config.board + '/checklists').then(chks => {

      let completedLists = chks.filter(chk => {
        return (chk.name == 'Progress checklist' && chk.checkItems[req.params.item].state == 'complete');
      })

      let cards = [];
      completedLists.map(chk => { cards.push(trello.getCard(config.board, chk.idCard)); });

      Promise.all(cards).then(cards => {

        completedLists.map(list => {
          list.card = cards.find(item => { return item.idChecklists == list.id; });
          if (list.card) {
            list.card.matches = re.exec(list.card.name);
          }
        })

        // split cards into an array for each Trello list
        let lists = {};
        for (var x = 0; x < completedLists.length; x++) {
          let list = config.lists[completedLists[x].card.idList] || null;
          if (list in lists) {
            lists[list].push(completedLists[x]);
          } else {
            lists[list] = [completedLists[x]];
          }
        }

        res.render('check', {
          title: 'Measures with completed checkbox: ' + config.checklist[req.params.item],
          data: lists,
          total: completedLists.length
        })        
      })

    })

  }),

  app.get('/progress', (req, res) => {

    trello.getCardsOnBoard(config.board).then(cards => {

      let lists = [];
      for (let list in config.lists) {
        lists.push(list);
      }
      // only get lists 'commentary + data' -> 'ready for approval'
      lists = lists.slice(4, 14);

      // filter cards and exclude 'instruction' cards that begin with a left square bracket
      cards = cards.filter(card => ~lists.indexOf(card.idList) && card.name.slice(0,1) == '[');
      getLabels(cards);
      getPeople(cards);

      let cardLists = {
        commentary: [],
        content_designers: [],
        content_design_in_progress: [],
        sign_off: [],
        ready_for_upload: [],
        uploaded: [],
        sent: [],
        published: []
      }

      // map through cards, putting them in new arrays based on list
      cards.map(card => {
        card.matches = re.exec(card.name) || [];
        card.list = lists[card.idList];
        switch (card.idList) {
          case '5942ae6eaab0cccfb006a44f':
            cardLists.commentary.push(card);
            break;
          case '5942ae94a56b96427a394b25':
            cardLists.content_designers.push(card);
            break;
          case '58f9e56539034820c80450ec':
            cardLists.content_design_in_progress.push(card);
            break;
          case '5942aed2e2c0f17d962d32ae':
            cardLists.sign_off.push(card);
            break;
          case '58f9e55459a33050d74ca18e':
            cardLists.ready_for_upload.push(card);
            break;
          case '5942af4098b5900c8f261ac6':
          case '59831605e4134db75644ce86':          
            cardLists.uploaded.push(card);
            break;
          case '58e76046893294e85be058ab':
            cardLists.sent.push(card);
            break;
          case '58e7604e6dbfb65b96f3a1f6':
            cardLists.published.push(card);
            break;
        }
      });

      //res.send(`<pre>${ JSON.stringify(cardLists, null, 2) }</pre>`);
      res.render('chart', {
        title: 'Measure Upload Progress',
        lists: cardLists
      })   

    })

  })

  app.get('/test', (req, res) => {
    trello.getListsOnBoard(config.board).then(lists => {
      console.log(lists);
    })
  })


}

module.exports = routes; 
