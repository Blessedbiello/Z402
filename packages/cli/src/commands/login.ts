import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import open from 'open';
import { logger } from '../utils/logger';
import { api } from '../utils/api';
import { setApiKey, setMerchantId, setConfig } from '../utils/config';

export const loginCommand = new Command('login')
  .description('Authenticate with Z402 account')
  .option('--email <email>', 'Email address')
  .option('--password <password>', 'Password (not recommended, use prompt instead)')
  .option('--api-key <key>', 'Use API key directly')
  .action(async (options) => {
    try {
      // If API key provided, use it directly
      if (options.apiKey) {
        const spinner = ora('Validating API key...').start();
        try {
          setApiKey(options.apiKey);
          const profile = await api.getProfile();
          setMerchantId(profile.id);
          spinner.succeed('API key validated');
          logger.success(`Logged in as ${profile.name} (${profile.email})`);
          return;
        } catch (error) {
          spinner.fail('Invalid API key');
          throw error;
        }
      }

      // Interactive login
      logger.info('Login to Z402');
      logger.log('');

      const { loginMethod } = await inquirer.prompt([
        {
          type: 'list',
          name: 'loginMethod',
          message: 'How would you like to login?',
          choices: [
            { name: 'Email & Password', value: 'credentials' },
            { name: 'API Key', value: 'apikey' },
            { name: 'Browser (OAuth)', value: 'browser' },
          ],
        },
      ]);

      if (loginMethod === 'browser') {
        await loginWithBrowser();
      } else if (loginMethod === 'apikey') {
        const { apiKey } = await inquirer.prompt([
          {
            type: 'password',
            name: 'apiKey',
            message: 'Enter your API key:',
            validate: (input: string) => input.length > 0 || 'API key is required',
          },
        ]);

        const spinner = ora('Validating API key...').start();
        try {
          setApiKey(apiKey);
          const profile = await api.getProfile();
          setMerchantId(profile.id);
          spinner.succeed('API key validated');
          logger.success(`Logged in as ${profile.name} (${profile.email})`);
        } catch (error) {
          spinner.fail('Invalid API key');
          throw error;
        }
      } else {
        // Credentials login
        const questions: any[] = [];

        if (!options.email) {
          questions.push({
            type: 'input',
            name: 'email',
            message: 'Email:',
            validate: (input: string) =>
              /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input) || 'Invalid email address',
          });
        }

        if (!options.password) {
          questions.push({
            type: 'password',
            name: 'password',
            message: 'Password:',
            validate: (input: string) => input.length > 0 || 'Password is required',
          });
        }

        const answers = await inquirer.prompt(questions);
        const email = options.email || answers.email;
        const password = options.password || answers.password;

        const spinner = ora('Logging in...').start();

        try {
          const { token, merchantId } = await api.login(email, password);
          setApiKey(token);
          setMerchantId(merchantId);
          spinner.succeed('Login successful');

          const profile = await api.getProfile();
          logger.success(`Logged in as ${profile.name} (${profile.email})`);
        } catch (error: any) {
          spinner.fail('Login failed');
          if (error.response?.status === 401) {
            logger.error('Invalid email or password');
          } else {
            throw error;
          }
        }
      }

      // Ask if they want to create an API key
      const { createKey } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'createKey',
          message: 'Would you like to create a new API key for this project?',
          default: true,
        },
      ]);

      if (createKey) {
        const { keyName } = await inquirer.prompt([
          {
            type: 'input',
            name: 'keyName',
            message: 'API key name:',
            default: 'CLI Key',
          },
        ]);

        const spinner = ora('Creating API key...').start();
        try {
          const { apiKey } = await api.createApiKey(keyName);
          spinner.succeed('API key created');
          logger.log('');
          logger.warning('Save this API key securely - it will not be shown again:');
          logger.log('');
          logger.log(`  ${logger.cyan(apiKey)}`);
          logger.log('');
          logger.info('Add it to your .env file:');
          logger.log(`  Z402_API_KEY=${apiKey}`);
          logger.log('');
        } catch (error) {
          spinner.fail('Failed to create API key');
          logger.warning('You can create one later with: z402 keys create');
        }
      }
    } catch (error) {
      logger.error(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

async function loginWithBrowser(): Promise<void> {
  logger.info('Opening browser for authentication...');
  logger.dim('If the browser does not open, visit: https://dashboard.z402.io/cli-auth');

  // In a real implementation, this would:
  // 1. Start a local server to receive the OAuth callback
  // 2. Generate a state token for security
  // 3. Open browser to OAuth URL
  // 4. Wait for callback with auth code
  // 5. Exchange code for access token

  const authUrl = 'https://dashboard.z402.io/cli-auth';

  try {
    await open(authUrl);
  } catch (error) {
    logger.warning('Could not open browser automatically');
    logger.info(`Please visit: ${authUrl}`);
  }

  const { code } = await inquirer.prompt([
    {
      type: 'input',
      name: 'code',
      message: 'Enter the authorization code from your browser:',
      validate: (input: string) => input.length > 0 || 'Code is required',
    },
  ]);

  const spinner = ora('Verifying authorization code...').start();

  // Simulate OAuth flow
  // In real implementation, exchange code for token
  try {
    // This would call: POST /api/v1/auth/oauth/token
    // For now, we'll simulate success
    spinner.fail('OAuth flow not yet implemented');
    logger.warning('Please use Email & Password or API Key login method for now');
    throw new Error('OAuth not implemented');
  } catch (error) {
    throw error;
  }
}

export const logoutCommand = new Command('logout')
  .description('Logout from Z402 account')
  .action(async () => {
    try {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure you want to logout?',
          default: false,
        },
      ]);

      if (!confirm) {
        logger.info('Operation cancelled');
        return;
      }

      // Clear stored credentials
      setConfig('apiKey', undefined);
      setConfig('merchantId', undefined);

      logger.success('Logged out successfully');
    } catch (error) {
      logger.error(`Logout failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });
