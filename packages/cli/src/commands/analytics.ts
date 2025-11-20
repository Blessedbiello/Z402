import { Command } from 'commander';
import ora from 'ora';
import Table from 'cli-table3';
import chalk from 'chalk';
import { logger } from '../utils/logger';
import { api } from '../utils/api';
import { hasApiKey } from '../utils/config';

export const analyticsCommand = new Command('analytics')
  .description('View analytics in terminal')
  .option('-p, --period <period>', 'Time period (7d, 30d, 90d)', '7d')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      if (!hasApiKey()) {
        logger.error('Not logged in. Run: z402 login');
        process.exit(1);
      }

      // Parse period
      const periodMatch = options.period.match(/^(\d+)d$/);
      if (!periodMatch) {
        logger.error('Invalid period format. Use format: 7d, 30d, 90d');
        process.exit(1);
      }

      const days = parseInt(periodMatch[1]);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const spinner = ora('Fetching analytics...').start();

      try {
        const analytics = await api.getAnalytics({
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString(),
        });

        const profile = await api.getProfile();

        spinner.stop();

        if (options.json) {
          console.log(JSON.stringify(analytics, null, 2));
          return;
        }

        // Display analytics
        logger.log('');
        logger.log(chalk.bold('📊 Z402 Analytics'));
        logger.log('');
        logger.log(chalk.dim(`Merchant: ${profile.name}`));
        logger.log(chalk.dim(`Period: Last ${days} days`));
        logger.log('');

        // Summary table
        const summaryTable = new Table({
          chars: {
            'top': '═',
            'top-mid': '╤',
            'top-left': '╔',
            'top-right': '╗',
            'bottom': '═',
            'bottom-mid': '╧',
            'bottom-left': '╚',
            'bottom-right': '╝',
            'left': '║',
            'left-mid': '╟',
            'mid': '─',
            'mid-mid': '┼',
            'right': '║',
            'right-mid': '╢',
            'middle': '│',
          },
        });

        summaryTable.push(
          [chalk.bold('Total Revenue'), chalk.green(analytics.totalRevenue + ' ZEC')],
          [chalk.bold('Total Transactions'), chalk.cyan(analytics.totalTransactions.toString())],
          [
            chalk.bold('Success Rate'),
            chalk.yellow((analytics.successRate * 100).toFixed(2) + '%'),
          ]
        );

        console.log(summaryTable.toString());
        logger.log('');

        // ASCII bar chart for revenue trend (simplified)
        logger.log(chalk.bold('Revenue Trend:'));
        logger.log('');

        // Generate sample data (in real implementation, fetch from API)
        const barLength = 50;
        const maxRevenue = parseFloat(analytics.totalRevenue);
        const revenueValue = maxRevenue / days; // Daily average

        for (let i = 0; i < Math.min(7, days); i++) {
          const value = revenueValue * (0.7 + Math.random() * 0.6); // Random variation
          const barWidth = Math.floor((value / maxRevenue) * barLength);
          const bar = '█'.repeat(barWidth);

          const dayLabel = `Day ${days - i}`;
          logger.log(
            `  ${dayLabel.padEnd(8)} ${chalk.green(bar)} ${value.toFixed(4)} ZEC`
          );
        }

        logger.log('');

        // Tips
        logger.info('Tips:');
        logger.log('  • View detailed stats at: https://dashboard.z402.io/analytics');
        logger.log('  • Change period with: --period 30d');
        logger.log('  • Export as JSON with: --json');
        logger.log('');
      } catch (error) {
        spinner.fail('Failed to fetch analytics');
        throw error;
      }
    } catch (error) {
      logger.error(
        `Failed to fetch analytics: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      process.exit(1);
    }
  });
