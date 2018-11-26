var rp = require('request-promise');
var $ = require('cheerio');
const puppeteer = require('puppeteer');
const fs = require('fs');
const chalk = require('chalk');
const _ = require('lodash');
const pushbulleturl = 'https://api.pushbullet.com/v2/pushes';
const sburl = 'https://cas.ucdavis.edu/cas/login?service=https%3A%2F%2Fmy%2Eucdavis%2Eedu%2Fschedulebuilder%2Findex%2Ecfm%3Fsb';
var argv = require('minimist')(process.argv.slice(2));
const verbose = argv['v'];
const updateTime = argv['t'] == null ? 30 : argv['t'];
const reminder = argv['r'];

var tokens;
try {
  tokens = require('./tokens.json');
} catch (err) {
  tokens = null;
}

async function sendPushBullet(title, message) {
  var pushOptions = {
    method: 'POST',
    url: pushbulleturl,
    headers: {
      'Access-Token': tokens.pushbullet_token,
      'Content-Type': 'application/json'
    },
    body: {
      'type': 'note',
      'title': title,
      'body': message,
      'email': tokens.pushbulletEmail
    },
    json: true
  };

  await rp(pushOptions)
    .then((res) => {
      console.log(chalk.cyan('Sent out a PushBullet notification...'));
    })
    .catch((err) => {
      console.log(chalk.red('Sending a PushBullet notification failed!'));
      console.log(chalk.red(err));
    });
}

function getTerm(date) {
  if (date === null) {
    throw new Error('Date is null!');
  }
  if (date.getMonth() >= 9 && date.getMonth() <= 11) {
    if (verbose)
      console.log(chalk.cyan('Entering into Winter quarter since it is month ' + date.getMonth() + '...'));
    return (parseInt(date.getFullYear()) + 1) + '01';
  } else if (date.getMonth() >= 1 && date.getMonth() <= 3) {
    if (verbose)
      console.log(chalk.cyan('Entering into Spring quarter since it is month ' + date.getMonth() + '...'));
    return (parseInt(date.getFullYear())) + '03';
  } else if (date.getMonth() >= 4 && date.getMonth() <= 6) { // Not sure how summer registration works, will confirm later
    if (verbose)
      console.log(chalk.cyan('Entering into Summer Session I since it is month ' + date.getMonth() + '...'));
    return 'Summer Session I ' + (parseInt(date.getFullYear()));
  } else if (date.getMonth() >= 7 && date.getMonth() <= 9) {
    if (verbose)
      console.log(chalk.cyan('Entering into Fall Quarter since it is month ' + date.getMonth() + '...'));
    return (parseInt(date.getFullYear()) + 1) + '10';
  } else {
    console.log(chalk.red('It\'s a bit early to set up this program right now for Spring quarter registration...\nTry again next month'));
    throw new Error('Too early!');
  }
}

async function scrapeClasses(page, resultsJSON) {
  for (const currClass of classes.classes) {
    await page.$eval('#inline_course_number', (ele, currClass) => ele.value = currClass, currClass);
    await page.click('button[onclick="javascript:UCD.SAOT.COURSES_SEARCH_INLINE.textSearch();"]');
    await page.waitFor(1000);
    var divs = await page.$$('.data-item-short');
    var errorCounter = 0;
    while (divs.length == 0 && errorCounter < 10) {
      // Keep pressing the button if the results are empty since we might've not waited long enough
      var error = await (await (await page.$('#inlineCourseResultsDiv')).getProperty('textContent')).jsonValue(); // Check to see if there are no results
      if (error == 'No results found that matched your search criteria') {
        await page.screenshot({
          path: './debug/screenshots/error.png'
        });
        await fs.writeFileSync('./debug/error.json', await page.evaluate(() => document.body.innerHTML), 'utf8');
        throw new Error('Could not find the class ' + chalk.underline(currClass) + '.\nPlease make sure ' + chalk.underline(currClass) + ' is verbatim from Schedule Builder');
      }
      if (verbose)
        console.log(chalk.red(10 - errorCounter + ' tries left: ' + 'Could not load the search results, trying again...'));
      await page.screenshot({
        path: './debug/screenshots/error.png'
      });
      await fs.writeFileSync('./debug/error.json', await page.evaluate(() => document.body.innerHTML), 'utf8');
      await Promise.all([
        page.waitFor(3000),
        page.click('button[onclick="javascript:UCD.SAOT.COURSES_SEARCH_INLINE.textSearch();"]')
      ]);
      divs = await page.$$('.data-item-short');
      errorCounter++;
    }
    if (errorCounter >= 10) { // Time out so we don't get stuck in a loop
      throw new Error('Could not load the search results after 10 attempts\nCheck if ' + chalk.underline(currClass) +
        ' is verbatim from Schedule Builder');
    }

    var classesJSON = [];
    for (const div of divs) { // Separate the class divs and break it down into JSON objects
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
    if (verbose)
      console.log(chalk.cyan('Logging JSON for ' + currClass + ' into results.json...'));
    resultsJSON['classes'][currClass] = classesJSON;
  }
}

// Documentation is the same as the above function pretty much
async function scrapeSpecificSections(page, resultsJSON) {
  for (const currSection of classes.specific_sections) {
    var class_name = currSection.split(' ').splice(0, 2).join(' ');
    await page.$eval('#inline_course_number', (ele, currSection) => ele.value = currSection, class_name);
    await page.click('button[onclick="javascript:UCD.SAOT.COURSES_SEARCH_INLINE.textSearch();"]');
    await page.waitFor(1000);
    var divs = await page.$$('.data-item-short');
    var errorCounter = 0;
    while (divs.length == 0 && errorCounter < 10) {
      var error = await (await (await page.$('#inlineCourseResultsDiv')).getProperty('textContent')).jsonValue();
      if (error == 'No results found that matched your search criteria') {
        await page.screenshot({
          path: './debug/screenshots/error.png'
        });
        await fs.writeFileSync('./debug/error.json', await page.evaluate(() => document.body.innerHTML), 'utf8');
        throw new Error('Could not find the class ' + chalk.underline(currClass) + '.\nPlease make sure ' + chalk.underline(currClass) + ' is verbatim from Schedule Builder');
      }
      if (verbose)
        console.log(chalk.red('Could not load the search results, trying again...'));
      await page.screenshot({
        path: './debug/screenshots/error.png'
      });
      await fs.writeFileSync('./debug/error.json', await page.evaluate(() => document.body.innerHTML), 'utf8');
      await Promise.all([
        page.waitFor(3000),
        page.click('button[onclick="javascript:UCD.SAOT.COURSES_SEARCH_INLINE.textSearch();"]')
      ]);
      divs = await page.$$('.data-item-short');
      errorCounter++;
    }
    if (errorCounter >= 10) {
      throw new Error('Could not load the search results after 10 attempts\nCheck if ' + chalk.underline(currSection) +
        ' is verbatim from Schedule Builder');
    }

    var classesJSON;
    var sectionFound = false;
    for (const div of divs) {
      var currObj = await (await div.getProperty('innerHTML')).jsonValue();
      $ = $.load(currObj);
      var className = $('.data-row').eq(0).text().split(':')[1].split('-')[1].substring(1);
      className = className.substring(0, className.length - 1);
      if (className == currSection) {
        sectionFound = true;
        var classSpots = $('.data-column').eq(1).text().split(':')[1].substring(1).split(' ')[0];
        classesJSON = {
          'class_name': className,
          'class_spots': classSpots
        }
      }
    }

    if (!sectionFound) {
      throw new Error('Could not find the section ' + chalk.underline(currSection) + ' in the search results!\n' +
        'Please make sure ' + chalk.underline(currSection) + ' is verbatim from Schedule Builder');
    }

    if (verbose)
      console.log(chalk.cyan('Logging JSON for ' + currSection + ' into results.json...'));

    resultsJSON['specific_sections'][currSection] = classesJSON;
  }
}

async function sort(resultsJSON) {
  if (verbose)
    console.log(chalk.cyan('\nLogging open classes into results.json...'));
  for (const classes in resultsJSON['classes']) {
    for (const sections in resultsJSON['classes'][classes]) {
      var section = resultsJSON['classes'][classes][sections];
      if (parseInt(section['class_spots']) > 0) {
        if (verbose)
          console.log(chalk.blueBright('- ' + section['class_name']));
        resultsJSON['open_classes'].push(section);
      }
    }
  }
  for (const classes in resultsJSON['specific_sections']) {
    if (parseInt(resultsJSON['specific_sections'][classes]['class_spots']) > 0) {
      if (verbose)
        console.log(chalk.blueBright('- ' + resultsJSON['specific_sections'][classes]['class_name']));
      resultsJSON['open_classes'].push(resultsJSON['specific_sections'][classes]);
    }
  }
}

// Had to use a headless browser since request wasn't good enough to load the client-side javascript
async function sbInit() {
  if (verbose)
    console.log(chalk.cyan('\nAttempting to log into Schedule Builder...'));

  await puppeteer.launch().then(async browser => {
    try {
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

      if (verbose)
        console.log(chalk.cyan('Successfully entered the quarter\n'));

      var resultsJSON = {
        'classes': {},
        'specific_sections': {},
        'open_classes': []
      };

      if (verbose)
        console.log(chalk.cyan('Beginning to query for general classes...'));
      // For the non-specific section classes
      if (classes.hasOwnProperty('classes') && classes['classes'].length > 0)
        await scrapeClasses(page, resultsJSON);
      else if (verbose && classes.hasOwnProperty('classes') && classes['classes'].length === 0)
        console.log(chalk.red('Skipping query for general classes since it\'s empty in classes.json'));
      else if (verbose && !classes.hasOwnProperty('classes'))
        console.log(chalk.red('Skipping query for general classes since it\'s not included in classes.json'));

      if (verbose)
        console.log(chalk.cyan('\nBeginning to query for specific sections...'));
      // For the specific sections
      if (classes.hasOwnProperty('specific_sections') && classes['specific_sections'].length > 0)
        await scrapeSpecificSections(page, resultsJSON);
      else if (verbose && classes.hasOwnProperty('specific_sections') && classes['specific_sections'].length === 0)
        console.log(chalk.red('Skipping query for specific sections since it\'s empty in classes.json'));
      else if (verbose && !classes.hasOwnProperty('specific_sections'))
        console.log(chalk.red('Skipping query for specific sections since it\'s not included in classes.json'));
      // Get the open classes from JSON
      await sort(resultsJSON);

      var prevResults = JSON.parse(fs.readFileSync('./results.json', 'utf-8'));

      if (resultsJSON['open_classes'].length > 0 && !_.isEqual(resultsJSON, prevResults)) {
        var message = 'Some open classes have been found: \n';
        var open_classes = resultsJSON['open_classes'];
        for (const classes in open_classes) {
          message += open_classes[classes]['class_name'] + ': ' + open_classes[classes]['class_spots'] + ' spots left\n';
        }
        message += '\nIf there\'s any issues, please submit an error request on the github repository https://github.com/JapanPanda/Notify-Me-Schedule-Builder';
        title = 'Notify Me! Open Classes Found';
        await sendPushBullet(title, message);
      } else if (resultsJSON['open_classes'].length > 0 && _.isEqual(resultsJSON, prevResults)) {
        console.log(chalk.cyan('No update from previous push notification, so not sending push notification'));
      } else
        console.log(chalk.cyan('\nNo open classes found, so not sending push notification...'));

      await fs.writeFileSync('results.json', JSON.stringify(resultsJSON, null, 2), 'utf8');
      await browser.close();
    } catch (err) {
      console.log(chalk.red('Something went wrong inside of Puppeteer...'));
      console.log(chalk.red(err.stack));
      console.log(chalk.red('Closing Puppeteer...'));
      var message = 'Something went wrong with Notify Me! Please check the logs...';
      var title = 'Notify Me! Error';
      sendPushBullet(title, message);
      await browser.close();
      exit();
    }
  });
  // Posting to the search url results in some really really hard to parse (unreadable) information, so we'll just use puppeteer to scrape
}

function readClasses() {
  try {
    classes = JSON.parse(fs.readFileSync('./classes.json', 'utf8'));
  } catch (err) {
    classes = null;
  }

  if (classes === null) {
    console.log(chalk.red('Error: Could not read classes.json...\nMake sure it exists and follows the format on the github repo!'));
    exit();
  }
  var message = chalk.blueBright('Classes (non-specific section): ');
  if (classes.classes != null && classes.classes.length > 0)
    message += classes.classes;
  else
    message += chalk.red('None found');
  console.log(message);

  message = chalk.blueBright('Specific Sections: ');
  if (classes.specific_sections != null && classes.specific_sections.length > 0)
    message += classes.specific_sections;
  else
    message += chalk.red('None found');
  console.log(message);
}

async function start() {
  if (verbose)
    console.log(chalk.cyan('Verbose mode activated'));
  console.log(chalk.cyan('Starting the server now...'));
  console.log(chalk.cyan('Attempting to read tokens.json file...'));
  if (tokens === null) {
    console.log(chalk.red('Error: Could not read tokens.json...\nMake sure it exists and follows the format on the github repo!'));
    exit();
  }
  console.log(chalk.blueBright('Username: ') + tokens.username);
  console.log(chalk.blueBright('Password: -REDACTED-'));
  console.log(chalk.blueBright('PushBullet Email: ') + tokens.pushbulletEmail);
  console.log(chalk.blueBright('PushBullet Token: ') + tokens.pushbullet_token + '\n');

  console.log(chalk.cyan('Attempting to read classes.json file...'));
  readClasses();

  // Initial sbInit call
  console.log(chalk.cyan('Starting the loop, you will receive updates every ' + updateTime + ' minutes!'));
  var currDate = new Date();
  console.log(chalk.yellow(currDate));
  console.log(chalk.cyan('Starting a query...\n') + chalk.yellow('Press CTRL + C anytime to quit!'));

  await sbInit();

  // Remind user that this is still on
  if (reminder) {
    console.log(chalk.cyan('Sending a daily reminder...'));
    var message = 'This is a daily reminder that Notify Me! is still running!';
    message += '\nIf there\'s any issues, please submit an error request on the github repository https://github.com/JapanPanda/Notify-Me-Schedule-Builder';
    var title = 'Notify Me! Daily Reminder';
    sendPushBullet(title, message);

    setInterval(function() {
      console.log(chalk.cyan('Sending a daily reminder...'));
      var message = 'This is a daily reminder that Notify Me! is still running!\n';
      message += '\nIf there\'s any issues, please submit an error request on the github repository https://github.com/JapanPanda/Notify-Me-Schedule-Builder';
      var title = 'Notify Me! Daily Reminder';
      sendPushBullet(title, message);
    }, 86400000);
  }
  // Start the loop for calling every half an hour!
  setInterval(function() {
    if (verbose)
      console.log(chalk.cyan('Checking for any new changes to classes.json before starting a new query...'));
    readClasses();
    currDate = new Date();
    console.log(chalk.yellow(currDate));
    console.log(chalk.cyan('Starting a query...\n') + chalk.yellow('Press CTRL + C anytime to quit!'));
    sbInit();
  }, updateTime * 60 * 1000);
}

function exit() {
  console.log(chalk.red('Closing server now...'));
  process.exit();
}
start();
