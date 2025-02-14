const shell = require('shelljs');
const commander = require('commander');
const merge = require('lodash/merge');
const isGit = require('is-git-repository');
const { Table } = require('console-table-printer');

const {
  printer,
  getPrintTableData,
  getAllConfigInfo,
  getGumrcInfo,
  setGumrcInfo,
  getGlobalGitUserConfig,
  getUsingGitUserConfig,
} = require('./utils');

const pkg = require('../package.json');

const program = new commander.Command('gum');

program.version(pkg.version);

program.command('list').description('List all the user config group').action(onList);

program
  .command('set <group-name>')
  .description('Set one group for user config')
  .option('--name <user-name>', 'user name')
  .option('--email <user-email>', 'user email')
  .action(onSet);

program
  .command('use <group-name>')
  .description('Use one group name for user config')
  .option('--global', 'git global config')
  .action(onUse);

program.command('delete <group-name>').description('Delete one group').action(onDelete);

program
  .command('current')
  .description('Show user config in current directory')
  .action(onCurrent);

program.parse(process.argv);

function printCurrentUser(using) {
  printer(`Currently used name=${using.name} email=${using.email}`, 'yellow');
}

function onList() {
  const allConfig = getAllConfigInfo();
  const using = getUsingGitUserConfig();
  const tableData = getPrintTableData(allConfig);

  // currently used user info
  printCurrentUser(using);

  // git user config group list
  const pt = new Table();
  pt.addRows(tableData, { color: 'cyan' });
  pt.printTable();
}

function onSet(groupName, options) {
  const newGroup = {
    [groupName]: options,
  };

  if (groupName === 'global') {
    printer(`Group name can't be 'global'`, 'red');
    console.log(' ');
    return process.exit(1);
  }

  if (!options.name && !options.email) {
    printer(`Name and Email option must have one`, 'red');
    console.log(' ');
    return process.exit(1);
  }

  const gumrcInfo = getGumrcInfo();
  const finalGumrcInfo = merge(gumrcInfo, newGroup);

  setGumrcInfo(finalGumrcInfo, (err) => {
    if (err) {
      return process.exit(1);
    }
    printer(`Set ${groupName} group success`, 'green');
    console.log(' ');
  });
}

function onUse(groupName, options) {
  const allConfigInfo = getAllConfigInfo();
  const user = allConfigInfo[groupName];

  if (!shell.which('git')) {
    shell.echo('Sorry, this script requires git');
    shell.exit(1);
  }

  if (!options.global && !isGit()) {
    printer(`Current project not a git repository (or any of the parent directories)`, 'red');
    console.log(' ');
    process.exit(1);
  }

  if (user) {
    const g = options.global ? `--global` : '';

    if (shell.exec(`git config ${g} user.name "${user.name}"`).code !== 0) {
      shell.echo('Error: Git config user.name failed');
    }

    if (shell.exec(`git config ${g} user.email ${user.email}`).code !== 0) {
      shell.echo('Error: Git config user.email failed');
    }

    const using = getUsingGitUserConfig();

    if (options.global) {
      const globalGitUser = getGlobalGitUserConfig();
      printer(`Global using name=${globalGitUser.name} email=${globalGitUser.email}`, 'green');
    }

    printCurrentUser(using);
    console.log(' ');
  } else {
    printer(`${groupName} is invalid group name`, 'red');
    console.log(' ');
  }
}

function onDelete(groupName) {
  if (groupName === 'global') {
    printer(`Can't delete global`, 'red');
    console.log(' ');
    return process.exit(1);
  }

  const gumrcInfo = getGumrcInfo();
  gumrcInfo[groupName] && delete gumrcInfo[groupName];

  setGumrcInfo(gumrcInfo, (err) => {
    if (err) {
      return process.exit(1);
    }
    printer(`Delete ${groupName} group success`, 'green');
    console.log(' ');
  });
}

function onCurrent() {
  const using = getUsingGitUserConfig();
  printCurrentUser(using);
}
