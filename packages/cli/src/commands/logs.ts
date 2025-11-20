import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { logger } from '../utils/logger;
import { api } from '../utils/api;
import { hasApiKey } from '../utils/config;

export const logsCommand = new Command('logs')
  .description('Stream live transaction logs')
  .option('-n, --tail <number>', 'Number of recent entries to show', '100')
  .option('-f, --follow', 'Follow log output')
  .option('--status <status>', 'Filter by status (PENDING, VERIFIED, SETTLED, FAILED)')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      if (!hasApiKey()) {
        logger.error('Not logged in. Run: z402 login');
        process.exit(1);
      }

      const limit = parseInt(options.tail);
      if (isNaN(limit) || limit <= 0) {
        logger.error('Invalid tail number');
        process.exit(1);
      }

      const spinner = ora('Fetching logs...').start();

      try {
        const { transactions } = await api.listTransactions({
          limit,
          status: options.status,
        });

        spinner.stop();

        if (transactions.length === 0) {
          logger.info('No transactions found');
          return;
        }

        if (options.json) {
          console.log(JSON.stringify(transactions, null, 2));
          return;
        }

        // Display logs
        logger.log('');
        logger.log(chalk.bold('Recent Transactions:'));
        logger.log('');

        transactions.forEach((tx) => {
          const statusColor =
            tx.status === 'SETTLED'
              ? chalk.green
              : tx.status === 'VERIFIED'
              ? chalk.blue
              : tx.status === 'FAILED'
              ? chalk.red
              : chalk.yellow;

          const timestamp = new Date(tx.createdAt).toLocaleString();

          logger.log(
            `${chalk.dim(timestamp)} ${statusColor(tx.status.padEnd(10))} ${chalk.cyan(tx.amount + ' ' + tx.currency)} ${chalk.dim(tx.resourceUrl)}`
          );

          if (tx.transactionId) {
            logger.log(`  ${chalk.dim('→')} txid: ${chalk.dim(tx.transactionId)}`);
          }

          logger.log('');
        });

        logger.dim(`Showing ${transactions.length} transaction(s)`);
        logger.log('');

        if (options.follow) {
          logger.info('Following logs... (Press Ctrl+C to stop)');
          logger.log('');

          // Poll for new transactions
          let lastCheck = new Date();

          const pollInterval = setInterval(async () => {
            try {
              const { transactions: newTxs } = await api.listTransactions({
                limit: 10,
              });

              const recent = newTxs.filter(
                (tx) => new Date(tx.createdAt) > lastCheck
              );

              if (recent.length > 0) {
                recent.forEach((tx) => {
                  const statusColor =
                    tx.status === 'SETTLED'
                      ? chalk.green
                      : tx.status === 'VERIFIED'
                      ? chalk.blue
                      : tx.status === 'FAILED'
                      ? chalk.red
                      : chalk.yellow;

                  const timestamp = new Date(tx.createdAt).toLocaleString();

                  logger.log(
                    `${chalk.dim(timestamp)} ${statusColor(tx.status.padEnd(10))} ${chalk.cyan(tx.amount + ' ' + tx.currency)} ${chalk.dim(tx.resourceUrl)}`
                  );

                  if (tx.transactionId) {
                    logger.log(
                      `  ${chalk.dim('→')} txid: ${chalk.dim(tx.transactionId)}`
                    );
                  }

                  logger.log('');
                });

                lastCheck = new Date();
              }
            } catch (error) {
              // Silently fail on poll errors
            }
          }, 5000); // Poll every 5 seconds

          // Handle Ctrl+C
          process.on('SIGINT', () => {
            clearInterval(pollInterval);
            logger.log('');
            logger.info('Stopped following logs');
            process.exit(0);
          });
        }
      } catch (error) {
        spinner.fail('Failed to fetch logs');
        throw error;
      }
    } catch (error) {
      logger.error(`Failed to fetch logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });
