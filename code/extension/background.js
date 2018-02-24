console.log('starting background');

function randomToken() {
  return Math.floor((1 + Math.random()) * 1e16).toString(16).substring(1);
}

var dataController = new P2PController('key1', 'prvtk', 'http://localhost:3000');