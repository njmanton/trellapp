# NO LONGER USED

# trellapp

## get stuff from the Trello API

Trello is a very useful app for organising cards, but not very good at some tasks, like sorting a list by due date.
This is a small Node/express app to pull card data from the Trello API for a given board/list and view overdue and upcoming cards.

To use
1. extract files from git into a folder
2. run `npm update` from that folder
3. ~~create an `index.js` file in config to hold and export Trello API key & user token (I've also added board/list IDs)~~ credentials now moved to environment variables. Trello object IDs are still in the config file. 
4. `node index` from the root folder to start the server, and view from `localhost:1977`

Versions

_0.23.0_
Add media queries to scale jumbotron headers

_0.22.0_
Add progress carousel

_0.20.0_
Add commentary progress view

_0.19.0_
Checklist view now splits cards by list

_0.18.1_
Add correct class to table headers for checklist view

_0.18.0_
Filter out out-of-scope cards from all/overdue views

_0.17.0_
add views for cards with certain checklist boxes completed

_0.16.0_
add additional labels to card views
