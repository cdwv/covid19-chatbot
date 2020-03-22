'use strict';
const Restify = require('restify');

const server = Restify.createServer({
  name: 'messenger'
});

const PORT = process.env.PORT || 3000;
server.use(Restify.jsonp());
server.use(Restify.bodyParser());

const config = require('./config');
const Chat = require('./chat');
const fbchat = new Chat(config);
const chatFSM = require('./fsm');
const userStates = {};

const fsm = new chatFSM({fbservice: fbchat});

server.get('/', (req, res, next) => {
  fbchat.registerHook(req,res);
  return next();
});


server.post('/', (req, res, next) => {
  console.debug('handling incomming post message')
  fbchat.incoming(req, res, msg => {
    if(!userStates[msg.sender]){
      userStates[msg.sender] = {
        counter: 0
      };
    }
    console.debug(`handling incomming message for ${msg.sender}`)
    fsm.handle('incoming', {sender: msg.sender, text: msg.message.text}, userStates);
  });
  return next();
});

fbchat.subscribe();

server.listen(PORT, () => console.log(`Chatbot running on port ${PORT}`));
