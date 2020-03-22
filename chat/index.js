'use strict';
const request = require('request');

var options = {
  method: 'GET',
  url: 'https://api.flotiq.com/api/v1/content/question',
  qs: {hydrate: '1'},
  headers: {'x-auth-token': 'cb1823cd6bd353fe3d29a3a84a53cec4'}
};

var pullQuestions = function(){
  
  request(options, function (error, response, body) {
    if (error) throw new Error(error);
    console.log(body);
  //  foreach(item in body.data){

    //};
  });
};

class Chat {
    constructor(config) {
      try {
        if(!config || config.PAGE_ACCESS_TOKEN === undefined || config.VERIFY_TOKEN === undefined) {
          throw new Error("Unable to access tokens");
        } else {
          this.PAGE_ACCESS_TOKEN = config.PAGE_ACCESS_TOKEN;
          this.VERIFY_TOKEN = config.VERIFY_TOKEN;
        }
      } catch(e) {
        console.log('constructor error ' + e);
      }
    }

    registerHook(req, res) {
      // if req.query.hub.mode == 'subscribe'
      // and if req.query.hub.verify_token is this.VERIFY_TOKEN
      //console.log('HUB');
      //console.log(req.query.hub);
      try {
        let {mode, verify_token, challenge} = req.query.hub;

        if(mode == 'subscribe' && verify_token == this.VERIFY_TOKEN) {
          return res.end(challenge);
        } else {
          console.log('Could not register hook');
          return res.status(403).end();
        }
      } catch(e) {
        console.log(e);
      }
    }

    incoming(req, res, callback) {
      // Extract the body of the POST, thanks to jsonp and bodyParser middleware
      try{
        let data = req.body;
        if(data.object === 'page') {
          // iterate through the page entry array
          data.entry.forEach(pageObj => {
            // Iterate through messaging array
            pageObj.messaging.forEach(msgEvent => {
              let messageObj = {
                sender: msgEvent.sender.id,
                timeOfMessage: msgEvent.timestamp,
                message: msgEvent.message
              }
              callback(messageObj);
            });
          });
        }
        // important for FB, no matter what we receive - we need to return 200
        res.send(200);
      } catch (e) {
        console.log(e);
      }
    }

    subscribe() {
      request({
        uri: 'https://graph.facebook.com/v2.6/me/subscribed_apps',
        qs: {
          access_token: this.PAGE_ACCESS_TOKEN
        },
        method: 'POST'
      }, (error, response, body) => {
        if(!error && JSON.parse(body).success){
          console.log('Successfuly subscribed to the page');
        } else {
          console.log(error);
        }
      }
      );
    }

    sendMessage(payload) {
      return new Promise((resolve, reject) => {
        // Create HTTP POST request
        request({
          uri: 'https://graph.facebook.com/v2.6/me/messages',
          qs:{
            access_token: this.PAGE_ACCESS_TOKEN
          },
          method: 'POST',
          json: payload
        }, (error, response, body) => {
          if(!error && response.statusCoe === 200) {
            resolve({
              messageId: body.message_id
            });
          } else {
            reject(error);
          }
        });
      });
    }

    sendGenericMessage(recipientId, msg){
      let obj = {
        recipient: {
          id: recipientId
        },
        message: msg
      };
      console.log(obj);
      this.sendMessage(obj).catch(error => console.log(error));
    }

    txt(recipientId, text){
      let msg = { text };
      this.sendGenericMessage(recipientId, msg);
    }

    sendQuickReply(recipientId, question, replies){
      this.sendGenericMessage(recipientId, {
          "text": question,
          "quick_replies": replies
        }
      );
    }

    sendYesNo(recipientId, question, yesPayload, noPayload){
      console.log(question.answers);
      var payloads = [yesPayload, noPayload];
      var replies = [];
      question.answers.forEach(function(item){
	replies.push(
        {
          "content_type":"text",
          "title": item,
          "payload": payloads[0]
        });
              
      });
      this.sendQuickReply(recipientId, question.label, replies);
    }
}

module.exports = Chat;
