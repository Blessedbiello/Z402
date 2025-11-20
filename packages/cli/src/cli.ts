#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import boxen from 'boxen';
import updateNotifier from 'update-notifier';
import fs from 'fs-extra';
import path from 'path';

// Import commands
import { initCommand } from './commands/init';
import { loginCommand, logoutCommand } from './commands/login';
import { keysCommand } from './commands/keys';
import { deployCommand } from './commands/deploy';
import { testCommand } from './commands/test';
import { logsCommand } from './commands/logs';
import { analyticsCommand } from './commands/analytics';
import { webhooksCommand } from './commands/webhooks';
import { generateCommand } from './commands/generate';
import { upgradeCommand } from './commands/upgrade';
import { logger } from './utils/logger';

// Read package.json
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = fs.readJsonSync(packageJsonPath);

// Check for updates
const notifier = updateNotifier({
  pkg: packageJson,
  updateCheckInterval: 1000 * 60 * 60 * 24, // 24 hours
});

if (notifier.update) {
  const message = `Update available: ${chalk.dim(notifier.update.current)} → ${chalk.green(notifier.update.latest)}\n\nRun ${chalk.cyan('npm install -g @z402/cli')} to update`;

  console.log(
    boxen(message, {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'yellow',
    })
  );
}

const program = new Command();

program
  .name('z402')
  .description('Command-line interface for Z402 payment facilitator')
  .version(packageJson.version)
  .addHelpText(
    'after',
    `
${chalk.bold('Examples:')}
  ${chalk.cyan('$ z402 init my-api')}          Create a new Z402-integrated project
  ${chalk.cyan('$ z402 login')}                Authenticate with Z402 account
  ${chalk.cyan('$ z402 keys create')}          Generate a new API key
  ${chalk.cyan('$ z402 test payment')}         Test a payment flow locally
  ${chalk.cyan('$ z402 deploy')}               Deploy your application

${chalk.bold('Documentation:')}
  ${chalk.blue('https://docs.z402.io')}

${chalk.bold('Support:')}
  ${chalk.blue('https://github.com/z402/z402/issues')}
    `
  );

// Register commands
program.addCommand(initCommand);
program.addCommand(loginCommand);
program.addCommand(logoutCommand);
program.addCommand(keysCommand);
program.addCommand(deployCommand);
program.addCommand(testCommand);
program.addCommand(logsCommand);
program.addCommand(analyticsCommand);
program.addCommand(webhooksCommand);
program.addCommand(generateCommand);
program.addCommand(upgradeCommand);

// Add whoami command
program
  .command('whoami')
  .description('Display current logged-in user')
  .action(async () => {
    try {
      const { hasApiKey, getConfig } = require('./utils/config');
      const { api } = require('./utils/api');

      if (!hasApiKey()) {
        logger.error('Not logged in. Run: z402 login');
        process.exit(1);
      }

      const config = getConfig();
      const profile = await api.getProfile();

      logger.log('');
      logger.log(chalk.bold('Logged in as:'));
      logger.log(`  Name: ${chalk.cyan(profile.name)}`);
      logger.log(`  Email: ${chalk.dim(profile.email)}`);
      logger.log(`  Merchant ID: ${chalk.dim(profile.id)}`);
      logger.log(`  Environment: ${chalk.yellow(config.environment || 'testnet')}`);
      logger.log('');
    } catch (error) {
      logger.error(`Failed to get user info: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

// Add config command
program
  .command('config')
  .description('Manage CLI configuration')
  .argument('[key]', 'Configuration key to view')
  .option('--set <key=value>', 'Set a configuration value')
  .option('--list', 'List all configuration')
  .action(async (key, options) => {
    try {
      const { getConfig, setConfig, getEnvironment } = require('./utils/config');

      if (options.set) {
        const [configKey, value] = options.set.split('=');
        setConfig(configKey as any, value);
        logger.success(`Set ${configKey} = ${value}`);
        return;
      }

      const config = getConfig();

      if (options.list || !key) {
        logger.log('');
        logger.log(chalk.bold('Configuration:'));
        logger.log('');
        logger.log(`  Environment: ${chalk.cyan(config.environment || 'testnet')}`);
        logger.log(`  API URL: ${chalk.dim(config.apiUrl || 'https://api.z402.io')}`);
        logger.log(`  Telemetry: ${config.telemetry ? chalk.green('enabled') : chalk.red('disabled')}`);
        logger.log(`  Merchant ID: ${chalk.dim(config.merchantId || 'Not set')}`);
        logger.log('');
        return;
      }

      const value = config[key as keyof typeof config];
      if (value !== undefined) {
        logger.log(`${key}: ${value}`);
      } else {
        logger.error(`Configuration key '${key}' not found`);
      }
    } catch (error) {
      logger.error(`Config error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

// Add docs command
program
  .command('docs')
  .description('Open documentation in browser')
  .argument('[page]', 'Specific documentation page')
  .action(async (page) => {
    try {
      const open = require('open');
      const baseUrl = 'https://docs.z402.io';
      const url = page ? `${baseUrl}/${page}` : baseUrl;

      logger.info(`Opening documentation: ${url}`);
      await open(url);
    } catch (error) {
      logger.error('Failed to open browser');
      logger.info('Visit https://docs.z402.io manually');
    }
  });

// Add dashboard command
program
  .command('dashboard')
  .alias('dash')
  .description('Open Z402 dashboard in browser')
  .action(async () => {
    try {
      const open = require('open');
      const url = 'https://dashboard.z402.io';

      logger.info('Opening dashboard...');
      await open(url);
    } catch (error) {
      logger.error('Failed to open browser');
      logger.info('Visit https://dashboard.z402.io manually');
    }
  });

// Error handling
program.exitOverride((err) => {
  if (err.code === 'commander.help' || err.code === 'commander.version') {
    process.exit(0);
  }
  throw err;
});

// Parse arguments
try {
  program.parse(process.argv);

  // Show help if no command provided
  if (program.args.length === 0) {
    program.help();
  }
} catch (error) {
  if (error instanceof Error) {
    logger.error(error.message);
  } else {
    logger.error('An unknown error occurred');
  }
  process.exit(1);
}
