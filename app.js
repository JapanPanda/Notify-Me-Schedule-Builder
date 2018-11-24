var rp = require('request-promise');
var jar = rp.jar();
var rp = rp.defaults({
  jar: jar,
  followAllRedirects: true
});

const puppeteer = require('puppeteer');
const $ = require('cheerio');
const fs = require('fs');
const tokens = require('./tokens.json');
const classes = require('./classes.json');
const pushbulleturl = 'https://api.pushbullet.com/v2/pushes';
const sburl = 'https://cas.ucdavis.edu/cas/login?service=https%3A%2F%2Fmy%2Eucdavis%2Eedu%2Fschedulebuilder%2Findex%2Ecfm%3Fsb';

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
    .then((res) => {
      console.log('PushBullet Post Succeeded!');
      console.log(JSON.stringify(parsedBody, null, 2));
    })
    .catch((err) => {
      console.log('PushBullet Post Failed!');
      console.log(err);
    });
  exit();
}

function getTerm(date) {
  if (date === null) {
    throw new Error('Date is null!');
  }
  if (date.getMonth() >= 9 && date.getMonth() <= 11) {
    console.log('Entering into Winter quarter since it is month ' + date.getMonth() + '...');
    return (parseInt(date.getFullYear()) + 1) + '01';
  }
  else if (date.getMonth() >= 1 && date.getMonth() <= 3) {
    console.log('Entering into Spring quarter since it is month ' + date.getMonth() + '...');
    return (parseInt(date.getFullYear())) + '03';
  }
  else if (date.getMonth() >= 4 && date.getMonth() <= 6) {  // NOt sure how summer registration works, will confirm later
    console.log('Entering into Summer Session I since it is month ' + date.getMonth() + '...');
    return 'Summer Session I ' + (parseInt(date.getFullYear()));
  }
  else if (date.getMonth() >= 7 && date.getMonth() <= 9) {
    console.log('Entering into Fall Quarter since it is month ' + date.getMonth() + '...');
    return (parseInt(date.getFullYear()) + 1) + '10';
  }
  else {
    console.log('It\'s a bit early to set up this program right now for Spring quarter registration...\nTry again next month');
    throw new Error('Too early!');
  }
}

// Had to use a headless browser since request wasn't good enough to load the client-side javascript
async function schedulebuilderLogin() {
  console.log('Attempting to log into Schedule Builder...');

  await puppeteer.launch().then(async browser => {
    try {
      var username = tokens.username;
      var password = tokens.password;
      const page = await browser.newPage();
      await page.goto(sburl);
      await page.evaluate((tokens) => {
        document.querySelector('#username').value = tokens.username;
        document.querySelector('#password').value = tokens.password;
        document.querySelector('#submit').click();
      }, tokens);
      await page.waitForNavigation();
      console.log('Logged into Schedule Builder successfully!');
      var date = new Date;
      var dateString = getTerm(date);
      console.log(dateString);
      // TO DO: redirect to the main picking schedule page
      await Promise.all([
        page.select('select#termCode1', dateString),
        page.waitForNavigation(),
        page.click('button')
      ]);
      await page.screenshot({path: './debug/screenshots/screenshot.png'});
      await browser.close();
    }
    catch (err) {
      console.log('Something went wrong inside of Puppeteer...');
      console.log(err);
      console.log('Closing Puppeteer...');
      await browser.close();
    }
  });
  // Posting to the search url results in some really really hard to parse (unreadable) information, so we'll just use puppeteer to scrape
  // see if theres a way to be cool and use request (i think this is a pain and should not be so)
}

async function start()
{
  console.log('Starting the server now...');
  console.log('Attempting to read tokens.json file...');
  console.log('Username: ' + tokens.username);
  console.log('Password: ' + tokens.password);
  console.log('PushBullet Token: ' + tokens.pushbullet_token + '\n');
  console.log('Attempting to read classes.json file...');
  console.log('Classes (non-specific section): ' + classes.classes);
  console.log('Specific Sections: ' + classes.specific_sections + '\n');
  console.log('Logging into Schedule Builder...');
  await schedulebuilderLogin();  // Good ol' procedural programming
  exit();
}

function exit()
{
  console.log('Closing server now...');
}

start();
