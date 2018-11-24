const rp = require('request-promise');
const $ = require('cheerio');
const fs = require('fs');
const tokens = require('./tokens.json');
const pushbulleturl = 'https://api.pushbullet.com/v2/pushes'

function pushBulletTest() {
  var testOptions = {
    method: 'POST',
    url: pushbulleturl,
    headers: {
      'Access-Token': tokens.pushbullet_token,
      'Content-Type': 'application/json'
    },
    body: {
      'type': 'note',
      'title': 'Notify Me! Pushbullet Test',
      'body': 'UC Davis Schedule Builder Notify Me!\nTesting the pushbullet...',
      'email': tokens.pushbulletEmail
    },
    json: true
  };

  rp(testOptions)
    .then(function (parsedBody) {
      console.log("PushBullet Post Succeeded!");
      console.log(JSON.stringify(parsedBody, null, 2));
    })
    .catch(function (err) {
      console.log("PushBullet Post Failed!");
      console.log(err);
    });
  exit();
}

function start()
{
  console.log('Starting the server now...');
  console.log('Attemping to read tokens.json file...');
  console.log('Username: ' + tokens.username);
  console.log('Password: ' + tokens.password);
  console.log('PushBullet Token: ' + tokens.pushbullet_token);
  pushBulletTest();

}

function exit()
{
  console.log('Closing server now...');
}

start();
