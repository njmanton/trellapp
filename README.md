# trellapp

## get stuff from the Trello API

Trello is a very useful app for organising cards, but not very good at some tasks, like sorting a list by due date.
This is a small Node/express app to pull card data from the Trello API for a given board/list and view overdue and upcoming cards.

To use
1. extract files from git into a folder
2. run `npm update` from that folder
3. create an `index.js` file in config to hold and export Trello API key & user token (I've also added board/list IDs)
4. `node index` from the root folder to start the server, and view from `localhost:1977`

