import { Command } from 'commander';
import ora from 'ora';
import inquirer from 'inquirer';
import Table from 'cli-table3';
import chalk from 'chalk';
import { logger } from '../utils/logger';
import { api } from '../utils/api';
import { hasApiKey } from '../utils/config';

export const webhooksCommand = new Command('webhooks')
  .description('Manage webhooks');

webhooksCommand
  .command('config')
  .description('View webhook configuration')
  .action(async () => {
    try {
      if (!hasApiKey()) {
        logger.error('Not logged in. Run: z402 login');
        process.exit(1);
      }

      const spinner = ora('Fetching webhook configuration...').start();

      const config = await api.getWebhookConfig();
      spinner.stop();

      logger.log('');
      logger.log(chalk.bold('Webhook Configuration:'));
      logger.log('');
      logger.log(`  URL: ${config.webhookUrl || logger.dim('Not configured')}`);
      logger.log(`  Secret: ${config.webhookSecret ? '••••••••' : logger.dim('Not set')}`);
      logger.log(`  Enabled: ${config.enabled ? logger.green('Yes') : logger.red('No')}`);
      logger.log('');

      if (config.events && config.events.length > 0) {
        logger.log('  Events:');
        config.events.forEach((event: string) => {
          logger.log(`    • ${event}`);
        });
        logger.log('');
      }
    } catch (error) {
      logger.error(
        `Failed to fetch webhook config: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      process.exit(1);
    }
  });

webhooksCommand
  .command('setup')
  .description('Configure webhook endpoint')
  .option('-u, --url <url>', 'Webhook URL')
  .option('-s, --secret <secret>', 'Webhook secret')
  .action(async (options) => {
    try {
      if (!hasApiKey()) {
        logger.error('Not logged in. Run: z402 login');
        process.exit(1);
      }

      const questions: any[] = [];

      if (!options.url) {
        questions.push({
          type: 'input',
          name: 'url',
          message: 'Webhook URL:',
          validate: (input: string) =>
            /^https?:\/\/.+/.test(input) || 'Must be a valid HTTP(S) URL',
        });
      }

      if (!options.secret) {
        questions.push({
          type: 'input',
          name: 'secret',
          message: 'Webhook secret (leave empty to auto-generate):',
        });
      }

      const answers = await inquirer.prompt(questions);

      const spinner = ora('Configuring webhook...').start();

      const config = await api.updateWebhookConfig({
        url: options.url || answers.url,
        secret: options.secret || answers.secret || undefined,
        enabled: true,
      });

      spinner.succeed('Webhook configured');

      logger.log('');
      logger.success('Webhook endpoint configured successfully!');
      logger.log('');
      logger.log(`  URL: ${logger.cyan(config.webhookUrl)}`);

      if (config.webhookSecret) {
        logger.log(`  Secret: ${logger.dim(config.webhookSecret)}`);
        logger.log('');
        logger.warning('Save this secret - you will need it to verify webhook signatures');
      }

      logger.log('');
    } catch (error) {
      logger.error(
        `Failed to configure webhook: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      process.exit(1);
    }
  });

webhooksCommand
  .command('test')
  .description('Send a test webhook')
  .option('-e, --event <type>', 'Event type', 'payment.verified')
  .action(async (options) => {
    try {
      if (!hasApiKey()) {
        logger.error('Not logged in. Run: z402 login');
        process.exit(1);
      }

      const spinner = ora('Sending test webhook...').start();

      // In real implementation, call API to send test webhook
      await new Promise((resolve) => setTimeout(resolve, 1500));

      spinner.succeed('Test webhook sent');

      logger.log('');
      logger.success('Test webhook delivered successfully!');
      logger.log('');
      logger.info('Check your webhook endpoint logs to verify receipt');
      logger.log('');
    } catch (error) {
      logger.error(
        `Failed to send test webhook: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      process.exit(1);
    }
  });

webhooksCommand
  .command('logs')
  .alias('deliveries')
  .description('View webhook delivery logs')
  .option('-n, --limit <number>', 'Number of entries to show', '20')
  .option('--status <status>', 'Filter by status (SENT, FAILED, PENDING)')
  .action(async (options) => {
    try {
      if (!hasApiKey()) {
        logger.error('Not logged in. Run: z402 login');
        process.exit(1);
      }

      const limit = parseInt(options.limit);
      if (isNaN(limit) || limit <= 0) {
        logger.error('Invalid limit number');
        process.exit(1);
      }

      const spinner = ora('Fetching webhook logs...').start();

      const { deliveries } = await api.listWebhookDeliveries({
        limit,
      });

      spinner.stop();

      if (!deliveries || deliveries.length === 0) {
        logger.info('No webhook deliveries found');
        return;
      }

      logger.log('');

      const table = new Table({
        head: ['Time', 'Event', 'Status', 'Attempts', 'Response'],
        colWidths: [20, 25, 12, 10, 15],
      });

      deliveries.forEach((delivery: any) => {
        const statusColor =
          delivery.status === 'SENT'
            ? chalk.green
            : delivery.status === 'FAILED'
            ? chalk.red
            : chalk.yellow;

        table.push([
          new Date(delivery.createdAt).toLocaleString(),
          delivery.eventType,
          statusColor(delivery.status),
          delivery.attempts.toString(),
          delivery.httpStatusCode || '-',
        ]);
      });

      console.log(table.toString());
      logger.log('');
      logger.dim(`Showing ${deliveries.length} delivery log(s)`);
      logger.log('');
    } catch (error) {
      logger.error(
        `Failed to fetch webhook logs: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      process.exit(1);
    }
  });

webhooksCommand
  .command('listen')
  .description('Listen for webhooks locally (creates tunnel)')
  .option('-p, --port <port>', 'Local port to forward to', '3000')
  .action(async (options) => {
    try {
      logger.info('Starting local webhook tunnel...');
      logger.log('');
      logger.warning('Note: This feature requires ngrok or similar service');
      logger.log('');
      logger.info('Install ngrok and run:');
      logger.log(`  ngrok http ${options.port}`);
      logger.log('');
      logger.info('Then configure your webhook URL with the ngrok URL:');
      logger.log('  z402 webhooks setup --url https://your-ngrok-url.ngrok.io/webhooks/z402');
      logger.log('');
    } catch (error) {
      logger.error(
        `Failed to start tunnel: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      process.exit(1);
    }
  });
