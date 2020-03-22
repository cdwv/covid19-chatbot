'use strict';

const request = require('request-promise');
const fetch = require('node-fetch');

var options = {
  method: 'GET',
  url: 'https://api.flotiq.com/api/v1/content/question',
  qs: {hydrate: '1'},
  headers: {'x-auth-token': 'YOUR_KEY'}
};

var pullQuestions = async function(){
  
  var questions = [];
  var startId = '';

  var r = await request(options, function (error, response, body) {
    if (error) throw new Error(error);
    var res = JSON.parse(body);
    res.data.forEach(async function(item){

	item.answers = item.answers.split(/\r?\n/);
        for(var i=0; i<item.answers.length; i++){
	    item.answers[i] = item.answers[i].split('|')[0];
	}
	questions[item.id] = item;

	if(item.type =='start'){
		startId = item.id;
	}
    });
       
  });

 
  

  return {questions: questions, startId: startId};
};

var convertSingle = function(q){
	console.log(q);
	var label = q.text;
        var name = q.text.replace(/\s/g, "_");
        
	return {label: label, name: name, answers: q.answers, next: q.nextQuestions, type: q.type};
};

var appendQuestion = function(arr,q,questions){
	
	arr.push(convertSingle(q));
	if(typeof(q.nextQuestions) !== 'undefined'){
		var nxt = questions[q.nextQuestions[0].id];
		arr = appendQuestion(arr,nxt,questions);
	}
	return arr;
}
var convertQuestions = function(questions){
	var symptoms = [];
        symptoms = appendQuestion(symptoms, questions.questions[questions.startId], questions.questions);
	return symptoms;
};

const machina = require('machina');
let ChatFSM = machina.Fsm.extend({
  fbservice: null,
  symptoms: [],

  initialize: async function(){
	var questions = await pullQuestions();
	var symptoms = convertQuestions(questions);
        this.symptoms = symptoms;
	console.log(this.symptoms);
  },
  initialState: 'begin',
  states:{

    begin: {
        _onEnter: function(client) {

        },
        /*
         * Wildcard handlers pass event as first argument, then [arg1, arg2,...]
         */
        "*" : function(event, payload, userStates){
          userStates[payload.sender].counter = 0;
          this.fbservice.txt(payload.sender,
            `Jak masz na imie?`);
            this.transition('getAnswers');
          //this.fbservice.txt(payload.sender, `Hi there, you just said ${payload.text}`);
        }
    },
    getAnswers: {
        _onEnter: function () {
            console.log("entering getAnswers state");
        },
        incoming: function(payload, userStates){
          let replyText = "";
          if(userStates[payload.sender].counter == 0){
            replyText = `Hey ${payload.text}!\u000A`;
          }
          replyText += this.symptoms[userStates[payload.sender].counter].label;
	  var q = this.symptoms[userStates[payload.sender].counter];
          this.fbservice.sendYesNo(payload.sender,
				    q,
                                    //replyText,
                                    `{ symptom: ${this.symptoms[userStates[payload.sender].counter].name}, value: 1}`,
                                    `{ symptom: ${this.symptoms[userStates[payload.sender].counter].name}, value:0}`);
          userStates[payload.sender].counter++;

          if(q.type == 'end') {
            this.transition('informAboutProduct');
          }

        }
    },
    informAboutProduct: {
      _onEnter: function() {

        console.log('entering informAboutProduct');

      },
      incoming: function(payload) {
	this.fbservice.txt(payload.sender, "");
        this.transition('end');
      }
    },
    getLocalisation: {
      _onEnter: function() {
        console.log('entering getLocalisation');
      },
      incoming: function(payload) {

      }
    },
    end: {
      _onEnter: function(){
        // Loop to beginning so we can have another conversation
        this.transition('begin');
      }
    }
  }
});

module.exports = ChatFSM;
