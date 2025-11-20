import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import Table from 'cli-table3';
import { logger } from '../utils/logger;
import { api } from '../utils/api;
import { hasApiKey } from '../utils/config;

export const keysCommand = new Command('keys')
  .description('Manage API keys');

keysCommand
  .command('list')
  .alias('ls')
  .description('List all API keys')
  .option('-f, --format <format>', 'Output format (table, json)', 'table')
  .action(async (options) => {
    try {
      if (!hasApiKey()) {
        logger.error('Not logged in. Run: z402 login');
        process.exit(1);
      }

      const spinner = ora('Fetching API keys...').start();

      const keys = await api.listApiKeys();
      spinner.stop();

      if (keys.length === 0) {
        logger.info('No API keys found');
        logger.log('Create one with: z402 keys create');
        return;
      }

      if (options.format === 'json') {
        console.log(JSON.stringify(keys, null, 2));
        return;
      }

      // Table format
      const table = new Table({
        head: ['ID', 'Name', 'Prefix', 'Created', 'Last Used', 'Expires'],
        colWidths: [20, 25, 15, 20, 20, 20],
      });

      keys.forEach((key) => {
        table.push([
          key.id.substring(0, 17) + '...',
          key.name,
          key.keyPrefix,
          new Date(key.createdAt).toLocaleDateString(),
          key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never',
          key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : 'Never',
        ]);
      });

      console.log(table.toString());
      logger.log('');
      logger.dim(`Total: ${keys.length} key${keys.length === 1 ? '' : 's'}`);
    } catch (error) {
      logger.error(`Failed to list API keys: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

keysCommand
  .command('create')
  .description('Create a new API key')
  .option('-n, --name <name>', 'Name for the API key')
  .option('--expires <days>', 'Expiration in days')
  .action(async (options) => {
    try {
      if (!hasApiKey()) {
        logger.error('Not logged in. Run: z402 login');
        process.exit(1);
      }

      let name = options.name;

      if (!name) {
        const answer = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'API key name:',
            default: 'CLI Key',
            validate: (input: string) => input.length > 0 || 'Name is required',
          },
        ]);
        name = answer.name;
      }

      const spinner = ora('Creating API key...').start();

      const { apiKey, id } = await api.createApiKey(name);

      spinner.succeed('API key created');

      logger.log('');
      logger.warning('Save this API key securely - it will not be shown again:');
      logger.log('');
      logger.log(`  ${logger.cyan(apiKey)}`);
      logger.log('');
      logger.log(`  ID: ${logger.dim(id)}`);
      logger.log('');
      logger.info('Add it to your .env file:');
      logger.log(`  Z402_API_KEY=${apiKey}`);
      logger.log('');
    } catch (error: any) {
      logger.error(`Failed to create API key: ${error.response?.data?.error || error.message}`);
      process.exit(1);
    }
  });

keysCommand
  .command('revoke <key-id>')
  .description('Revoke an API key')
  .option('-f, --force', 'Skip confirmation')
  .action(async (keyId: string, options) => {
    try {
      if (!hasApiKey()) {
        logger.error('Not logged in. Run: z402 login');
        process.exit(1);
      }

      if (!options.force) {
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to revoke key ${keyId}?`,
            default: false,
          },
        ]);

        if (!confirm) {
          logger.info('Operation cancelled');
          return;
        }
      }

      const spinner = ora('Revoking API key...').start();

      await api.revokeApiKey(keyId);

      spinner.succeed('API key revoked');
    } catch (error: any) {
      logger.error(`Failed to revoke API key: ${error.response?.data?.error || error.message}`);
      process.exit(1);
    }
  });
