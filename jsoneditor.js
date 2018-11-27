const fs = require('fs');
const chalk = require('chalk');
const readlineSync = require('readline-sync');

var classes;

function getClasses() {
  try {
    classes = require('./classes.json');
  }
  catch (err) {
    classes = null;
  }
  var classesJSON = classes;
  if (classes === null) {
    console.log(chalk.red('classes.json file was not found... Making a new one for you <3.'));
    classesJSON = {
      'classes': [],
      'specific_sections': []
    };
    fs.writeFileSync('./classes.json', JSON.stringify(classesJSON, null, 2));
    console.log(chalk.blueBright('Successfully made a new classes.json file with lots of love <3.'));
  }
  else {
    classesJSON = classes;
  }
  return classesJSON;
}

function writeClasses(classesJSON) {
  fs.writeFileSync('./classes.json', JSON.stringify(classesJSON, null, 2), err => {
    if (err != null) {
      console.log(chalk.red('Error: Could not make a new classes.json file.'));
      throw new Error(err.stack);
    }
  });
}

async function readClasses() {

  var classesJSON = getClasses();

  console.log(chalk.underline.cyan('Contents of classes.json'));
  message = chalk.cyan('Classes (non-specific sections): ');
  if (classes.classes != null && classes.classes.length > 0)
    message += classes.classes;
  else
    message += chalk.red('None found');

  message = message.replace(/,/g, ', ');
  console.log(message);

  message = chalk.cyan('Specific Sections: ');
  if (classes.specific_sections != null && classes.specific_sections.length > 0)
    message += classes.specific_sections
  else
    message += chalk.red('None found');

  message = message.replace(/,/g, ', ');
  console.log(message);
  console.log(''); // New line
}

function addClass() {
  var question = chalk.cyan('\nPlease enter the name of the class as it appears on schedule builder\n') + chalk.red('(No section number needed)...\n') + '>> ';
  var input = readlineSync.question(question);
  var classesJSON = getClasses();
  classesJSON['classes'].push(input);

  writeClasses(classesJSON);
  console.log(chalk.cyan('Added the class ') + chalk.blueBright(input) + chalk.cyan('...'));
  console.log(chalk.red('Warning: The class has not been checked for validity inside Schedule Builder, ' +
  'please ensure that it is a valid class.\n'));
}

function addSection() {
  var question = chalk.cyan('\nPlease enter the name of the section as it appears on schedule builder...\n') + chalk.red('(INCLUDE SECTION NUMBER)\n') + '>> ';
  var input = readlineSync.question(question);
  var classesJSON = getClasses();
  classesJSON['specific_sections'].push(input);

  writeClasses(classesJSON);
  console.log(chalk.cyan('Added the class ') + chalk.blueBright(input) + chalk.cyan('...'));
  console.log(chalk.red('Warning: The class has not been checked for validity inside Schedule Builder, ' +
  'please ensure that it is a valid class.\n'));
}

function deleteClass() {
  var classesJSON = getClasses();
  var i = 0;
  var question;
  if (classesJSON['classes'].length != 0 || classesJSON['specific_sections'].length != 0) {
    question = chalk.cyan('Which class would you like to delete? (Pick a number)\n');
  }
  else {
    console.log(chalk.red('Error, there is nothing to delete...\n'));
    return;
  }

  if (classesJSON['classes'].length != 0) {
    question += chalk.cyan('Classes (non-specific):\n');
    for (; i < classesJSON['classes'].length; i++) {
      question += chalk.blueBright((i + 1) + '.') + ' ' + classesJSON['classes'][i] + '\n';
    }
  }
  if (classesJSON['specific_sections'].length != 0) {
    question += chalk.cyan('\nSpecific section:\n');
    for (; i < classesJSON['specific_sections'].length + classesJSON['classes'].length; i++) {
      question += chalk.blueBright((i + 1) + '.') + ' ' + classesJSON['specific_sections'][i - classesJSON['classes'].length] + '\n';
    }
  }

  var input = parseInt(readlineSync.question(question)) - 1;

  if (input < classesJSON['classes'].length) {
    console.log(chalk.cyan('Successfully removed ' + classes['classes'][input] + '...'));
    classesJSON['classes'].splice(input, 1);
  }
  else {
    console.log(chalk.cyan('Successfully removed ' + classes['specific_sections'][input - classes['classes'].length] + '...'));
    classesJSON['specific_sections'].splice(input - classesJSON['classes'].length, 1);
  }
  writeClasses(classesJSON);
}

function ask() {
  // Since question is async and doesn't like blocking, we have to use a recursive loop
  readClasses();
  var question = chalk.cyan('What would you like to do? (Select a number)\n' +
  '1. Add a class (non-specific)\n' +
  '2. Add a specific section\n' +
  '3. Delete a class\n' +
  '4. Edit tokens.json\n' +
  '5. Exit the program\n') +
  '>> ';
  var input = readlineSync.question(question);

  switch (parseInt(input)) {
    case 1:
      addClass();
      break;
    case 2:
      addSection();
      break;
    case 3:
      deleteClass();
      break;
    case 4:

      break;
    case 5:
      exit();
      break;
    default:
      console.log(chalk.red('Error: Please select a valid number 1-5.\n'));
      break;
  }
}

function start() {
  getClasses();
    while (true) {
      ask();
    }

}

function exit() {
  console.log(chalk.red('Exiting...'));
  process.exit();
}

start();
