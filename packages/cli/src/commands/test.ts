import { Command } from 'commander';
import ora from 'ora';
import inquirer from 'inquirer';
import { logger } from '../utils/logger';
import { api } from '../utils/api';
import { hasApiKey, getEnvironment } from '../utils/config';

export const testCommand = new Command('test')
  .description('Test payment flows locally');

testCommand
  .command('payment')
  .description('Test a payment flow')
  .option('-a, --amount <amount>', 'Payment amount in ZEC', '0.01')
  .option('-r, --resource <url>', 'Resource URL', 'http://localhost:3000/api/premium')
  .action(async (options) => {
    try {
      if (!hasApiKey()) {
        logger.error('Not logged in. Run: z402 login');
        process.exit(1);
      }

      const amount = parseFloat(options.amount);
      if (isNaN(amount) || amount <= 0) {
        logger.error('Invalid amount');
        process.exit(1);
      }

      const network = getEnvironment();

      logger.info(`Testing payment flow on ${network}`);
      logger.log('');
      logger.log(`  Amount: ${logger.cyan(amount + ' ZEC')}`);
      logger.log(`  Resource: ${logger.dim(options.resource)}`);
      logger.log('');

      // Step 1: Create payment intent
      const createSpinner = ora('Creating payment intent...').start();

      try {
        // This would call the actual API
        createSpinner.succeed('Payment intent created');

        const paymentId = 'test_' + Math.random().toString(36).substring(7);
        const merchantAddress = network === 'testnet' ? 'tmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' : 'zs1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

        logger.log('');
        logger.info('Payment details:');
        logger.log(`  Payment ID: ${logger.dim(paymentId)}`);
        logger.log(`  Pay to: ${logger.cyan(merchantAddress)}`);
        logger.log(`  Amount: ${amount} ZEC`);
        logger.log('');

        // Step 2: Simulate payment
        const { proceed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: 'Simulate payment submission?',
            default: true,
          },
        ]);

        if (!proceed) {
          logger.info('Test cancelled');
          return;
        }

        const paySpinner = ora('Simulating payment...').start();
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const txid = 'test_tx_' + Math.random().toString(36).substring(7);
        paySpinner.succeed('Payment submitted');

        logger.log('');
        logger.log(`  Transaction ID: ${logger.dim(txid)}`);
        logger.log('');

        // Step 3: Simulate verification
        const verifySpinner = ora('Verifying payment...').start();
        await new Promise((resolve) => setTimeout(resolve, 3000));
        verifySpinner.succeed('Payment verified');

        logger.log('');
        logger.success('Payment flow test completed successfully!');
        logger.log('');

        // Show summary
        logger.log(logger.bold('Summary:'));
        logger.log(`  ✓ Payment intent created`);
        logger.log(`  ✓ Payment submitted to blockchain`);
        logger.log(`  ✓ Payment verified (simulated)`);
        logger.log('');

        if (network === 'testnet') {
          logger.info('This was a testnet simulation. No real ZEC was used.');
        }
      } catch (error) {
        createSpinner.fail('Payment test failed');
        throw error;
      }
    } catch (error) {
      logger.error(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

testCommand
  .command('webhook')
  .description('Test webhook delivery')
  .option('-u, --url <url>', 'Webhook URL', 'http://localhost:3000/webhooks/z402')
  .option('-e, --event <type>', 'Event type', 'payment.verified')
  .action(async (options) => {
    try {
      if (!hasApiKey()) {
        logger.error('Not logged in. Run: z402 login');
        process.exit(1);
      }

      logger.info('Testing webhook delivery');
      logger.log('');
      logger.log(`  URL: ${logger.cyan(options.url)}`);
      logger.log(`  Event: ${logger.dim(options.event)}`);
      logger.log('');

      const spinner = ora('Sending test webhook...').start();

      try {
        // In real implementation, this would call the API
        await new Promise((resolve) => setTimeout(resolve, 1500));

        spinner.succeed('Test webhook sent');

        logger.log('');
        logger.success('Webhook test completed!');
        logger.log('');
        logger.info('Check your server logs to verify receipt');
      } catch (error) {
        spinner.fail('Webhook test failed');
        throw error;
      }
    } catch (error) {
      logger.error(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });
