var rp = require('request-promise');
var jar = rp.jar();
var rp = rp.defaults({
  jar: jar,
  followAllRedirects: true
});

var $ = require('cheerio');
const puppeteer = require('puppeteer');
const fs = require('fs');
const chalk = require('chalk');
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
}

function getTerm(date) {
  if (date === null) {
    throw new Error('Date is null!');
  }
  if (date.getMonth() >= 9 && date.getMonth() <= 11) {
    console.log(chalk.cyan('Entering into Winter quarter since it is month ' + date.getMonth() + '...'));
    return (parseInt(date.getFullYear()) + 1) + '01';
  }
  else if (date.getMonth() >= 1 && date.getMonth() <= 3) {
    console.log(chalk.cyan('Entering into Spring quarter since it is month ' + date.getMonth() + '...'));
    return (parseInt(date.getFullYear())) + '03';
  }
  else if (date.getMonth() >= 4 && date.getMonth() <= 6) {  // NOt sure how summer registration works, will confirm later
    console.log(chalk.cyan('Entering into Summer Session I since it is month ' + date.getMonth() + '...'));
    return 'Summer Session I ' + (parseInt(date.getFullYear()));
  }
  else if (date.getMonth() >= 7 && date.getMonth() <= 9) {
    console.log(chalk.cyan('Entering into Fall Quarter since it is month ' + date.getMonth() + '...'));
    return (parseInt(date.getFullYear()) + 1) + '10';
  }
  else {
    console.log(chalk.red('It\'s a bit early to set up this program right now for Spring quarter registration...\nTry again next month'));
    throw new Error('Too early!');
  }
}

// Had to use a headless browser since request wasn't good enough to load the client-side javascript
async function sbInit() {
  console.log(chalk.cyan('Attempting to log into Schedule Builder...'));

  await puppeteer.launch().then(async browser => {
    try {
      var username = tokens.username;
      var password = tokens.password;
      const page = await browser.newPage();
      // Login
      await page.goto(sburl);
      await page.evaluate((tokens) => {
        document.querySelector('#username').value = tokens.username;
        document.querySelector('#password').value = tokens.password;
        document.querySelector('#submit').click();
      }, tokens);
      await page.waitForNavigation();
      // Enter a quarter
      var date = new Date;
      var dateString = getTerm(date);
      await Promise.all([
        page.select('select#termCode1', dateString),
        page.waitForNavigation(),
        page.click('button')
      ]);

      console.log(chalk.cyan('Successfully entered the quarter\n'));
      var resultsJSON = {
        'classes': {},
        'specific_sections': {}
      };

      console.log(chalk.cyan('Beginning to query for general classes...'));
      // For the non-specific section classes
      for (const currClass of classes.classes) {
        await page.$eval('#inline_course_number', (ele, currClass) => ele.value = currClass, currClass);
        await page.click('button[onclick="javascript:UCD.SAOT.COURSES_SEARCH_INLINE.textSearch();"]');
        await page.waitFor(1000);
        var divs = await page.$$('.data-item-short');
        while (divs.length == 0) {
            // Theres a weird bug here where the results don't show up sometime
            console.log(chalk.red('Could not load the search results, trying again...'));
            await page.screenshot({path: './debug/screenshots/error.png'});
            await fs.writeFileSync('./debug/error.json', await page.evaluate(() => document.body.innerHTML), 'utf8');
            await Promise.all([
              page.waitFor(3000),
              page.click('button[onclick="javascript:UCD.SAOT.COURSES_SEARCH_INLINE.textSearch();"]')
            ]);
            divs = await page.$$('.data-item-short');
        }

        var classesJSON = [];
        for (const div of divs) {  // Separate the class divs and break it down into JSON objects
          var currObj = await (await div.getProperty('innerHTML')).jsonValue();
          $ = $.load(currObj);
          var className = $('.data-row').eq(0).text().split(':')[1].split('-')[1].substring(1);
          className = className.substring(0, className.length - 1);
          var classSpots = $('.data-column').eq(1).text().split(':')[1].substring(1).split(' ')[0];
          var parsedObj = {
            'class_name': className,
            'class_spots': classSpots
          }
          classesJSON.push(parsedObj);
        }

        console.log(chalk.cyan('Logging JSON for ' + currClass + ' into results.json...'));
        resultsJSON['classes'][currClass] = classesJSON;
      }

      console.log(chalk.cyan('\nBeginning to query for specific sections...'));
      // For the specific sections
      for (const currSection of classes.specific_sections) {
        var class_name = currSection.split(' ').splice(0, 2).join(' ');
        await page.$eval('#inline_course_number', (ele, currSection) => ele.value = currSection, class_name);
        await page.click('button[onclick="javascript:UCD.SAOT.COURSES_SEARCH_INLINE.textSearch();"]');
        await page.waitFor(1000);
        var divs = await page.$$('.data-item-short');
        while (divs.length == 0) {
            console.log(chalk.red('Could not load the search results, trying again...'));
            await page.screenshot({path: './debug/screenshots/error.png'});
            await fs.writeFileSync('./debug/error.json', await page.evaluate(() => document.body.innerHTML), 'utf8');
            await Promise.all([
              page.waitFor(3000),
              page.click('button[onclick="javascript:UCD.SAOT.COURSES_SEARCH_INLINE.textSearch();"]')
            ]);
            divs = await page.$$('.data-item-short');
        }

        var classesJSON;
        for (const div of divs) {
          var currObj = await (await div.getProperty('innerHTML')).jsonValue();
          $ = $.load(currObj);
          var className = $('.data-row').eq(0).text().split(':')[1].split('-')[1].substring(1);
          className = className.substring(0, className.length - 1);
          if (className == currSection) {
            var classSpots = $('.data-column').eq(1).text().split(':')[1].substring(1).split(' ')[0];
            classesJSON = {
              'class_name': className,
              'class_spots': classSpots
            }
          }
        }

        console.log(chalk.cyan('Logging JSON for ' + currSection + ' into results.json...'));
        resultsJSON['specific_sections'][currSection] = classesJSON;
      }

      await fs.writeFileSync('results.json', JSON.stringify(resultsJSON, null, 2), 'utf8');
      await browser.close();
    }
    catch (err) {
      console.log(chalk.red('Something went wrong inside of Puppeteer...'));
      console.log(chalk.red(err.stack));
      console.log(chalk.red('Closing Puppeteer...'));
      await browser.close();
    }
  });
  // Posting to the search url results in some really really hard to parse (unreadable) information, so we'll just use puppeteer to scrape
}

async function start()
{
  console.log(chalk.cyan('Starting the server now...'));
  console.log(chalk.cyan('Attempting to read tokens.json file...'));
  console.log(chalk.blueBright('Username: ') + tokens.username);
  console.log(chalk.blueBright('Password: ') + tokens.password);
  console.log(chalk.blueBright('PushBullet Token: ') + tokens.pushbullet_token + '\n');
  console.log(chalk.cyan('Attempting to read classes.json file...'));
  console.log(chalk.blueBright('Classes (non-specific section): ') + classes.classes);
  console.log(chalk.blueBright('Specific Sections: ') + classes.specific_sections + '\n');
  await sbInit();  // Good ol' procedural programming
  exit();
}

function exit()
{
  console.log(chalk.red('Closing server now...'));
}

start();
