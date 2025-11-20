import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';
import { logger } from '../utils/logger;
import { hasApiKey, getApiKey, getMerchantId } from '../utils/config;

export const deployCommand = new Command('deploy')
  .description('Deploy your Z402-integrated application')
  .option('-p, --platform <platform>', 'Deployment platform (railway, render, vercel, fly)')
  .option('--skip-build', 'Skip build step')
  .action(async (options) => {
    try {
      if (!hasApiKey()) {
        logger.error('Not logged in. Run: z402 login');
        process.exit(1);
      }

      // Detect platform if not specified
      let platform = options.platform;

      if (!platform) {
        platform = await detectPlatform();

        if (!platform) {
          const { selectedPlatform } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedPlatform',
              message: 'Select deployment platform:',
              choices: [
                { name: 'Railway', value: 'railway' },
                { name: 'Render', value: 'render' },
                { name: 'Vercel', value: 'vercel' },
                { name: 'Fly.io', value: 'fly' },
                { name: 'Heroku', value: 'heroku' },
                { name: 'Manual', value: 'manual' },
              ],
            },
          ]);
          platform = selectedPlatform;
        } else {
          logger.info(`Detected platform: ${logger.cyan(platform)}`);
        }
      }

      // Check if platform CLI is installed
      if (platform !== 'manual') {
        const isInstalled = await checkPlatformCLI(platform);
        if (!isInstalled) {
          logger.warning(`${platform} CLI not found`);
          logger.info(`Install it from: ${getPlatformInstallUrl(platform)}`);
          process.exit(1);
        }
      }

      // Confirm deployment
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Deploy to ${platform}?`,
          default: true,
        },
      ]);

      if (!confirm) {
        logger.info('Deployment cancelled');
        return;
      }

      // Set environment variables
      const envVars = {
        Z402_API_KEY: getApiKey(),
        Z402_MERCHANT_ID: getMerchantId(),
        Z402_NETWORK: 'mainnet', // Default to mainnet for production
        NODE_ENV: 'production',
      };

      logger.log('');
      logger.info('Setting environment variables...');

      await setEnvironmentVariables(platform, envVars);

      // Build if needed
      if (!options.skipBuild && fs.existsSync('package.json')) {
        const buildSpinner = ora('Building application...').start();

        try {
          await execa('npm', ['run', 'build'], {
            cwd: process.cwd(),
            stdio: 'inherit',
          });
          buildSpinner.succeed('Build completed');
        } catch (error) {
          buildSpinner.fail('Build failed');
          logger.warning('Continuing without build...');
        }
      }

      // Deploy
      const deploySpinner = ora(`Deploying to ${platform}...`).start();

      try {
        await deployToPlatform(platform);
        deploySpinner.succeed('Deployment successful');

        logger.log('');
        logger.success('Application deployed successfully!');
        logger.log('');
        logger.info('Next steps:');
        logger.log('  • Test your deployment');
        logger.log('  • Configure custom domain (if needed)');
        logger.log('  • Set up monitoring');
        logger.log('');
      } catch (error) {
        deploySpinner.fail('Deployment failed');
        throw error;
      }
    } catch (error) {
      logger.error(
        `Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      process.exit(1);
    }
  });

async function detectPlatform(): Promise<string | null> {
  // Check for platform-specific config files
  if (fs.existsSync('railway.json') || fs.existsSync('railway.toml')) {
    return 'railway';
  }

  if (fs.existsSync('render.yaml')) {
    return 'render';
  }

  if (fs.existsSync('vercel.json')) {
    return 'vercel';
  }

  if (fs.existsSync('fly.toml')) {
    return 'fly';
  }

  if (fs.existsSync('Procfile')) {
    return 'heroku';
  }

  // Check for Dockerfile
  if (fs.existsSync('Dockerfile')) {
    return 'fly'; // Fly.io is a good default for Docker
  }

  return null;
}

async function checkPlatformCLI(platform: string): Promise<boolean> {
  const commands: Record<string, string> = {
    railway: 'railway',
    render: 'render',
    vercel: 'vercel',
    fly: 'flyctl',
    heroku: 'heroku',
  };

  const command = commands[platform];
  if (!command) return true;

  try {
    await execa(command, ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function getPlatformInstallUrl(platform: string): string {
  const urls: Record<string, string> = {
    railway: 'https://docs.railway.app/develop/cli',
    render: 'https://render.com/docs/cli',
    vercel: 'https://vercel.com/download',
    fly: 'https://fly.io/docs/hands-on/install-flyctl/',
    heroku: 'https://devcenter.heroku.com/articles/heroku-cli',
  };

  return urls[platform] || 'https://docs.z402.io/deployment';
}

async function setEnvironmentVariables(
  platform: string,
  envVars: Record<string, any>
): Promise<void> {
  const commands: Record<string, (key: string, value: string) => string[]> = {
    railway: (key, value) => ['variables', '--set', `${key}=${value}`],
    render: (key, value) => ['env', 'set', key, value],
    vercel: (key, value) => ['env', 'add', key, 'production'],
    fly: (key, value) => ['secrets', 'set', `${key}=${value}`],
    heroku: (key, value) => ['config:set', `${key}=${value}`],
  };

  const commandBuilder = commands[platform];
  if (!commandBuilder) {
    logger.warning('Manual environment variable configuration required');
    logger.log('');
    logger.info('Set these environment variables in your platform dashboard:');
    Object.entries(envVars).forEach(([key, value]) => {
      logger.log(`  ${key}=${value}`);
    });
    logger.log('');
    return;
  }

  for (const [key, value] of Object.entries(envVars)) {
    if (!value) continue;

    try {
      const args = commandBuilder(key, value);
      const command = args[0];

      // Special handling for Vercel which requires interactive input
      if (platform === 'vercel') {
        logger.info(`Set ${key} via Vercel dashboard or run:`);
        logger.log(`  vercel env add ${key}`);
        continue;
      }

      await execa(platform === 'fly' ? 'flyctl' : platform === 'heroku' ? 'heroku' : platform, args, {
        stdio: 'ignore',
      });

      logger.success(`Set ${key}`);
    } catch (error) {
      logger.warning(`Failed to set ${key}`);
    }
  }
}

async function deployToPlatform(platform: string): Promise<void> {
  const deployCommands: Record<string, { cmd: string; args: string[] }> = {
    railway: { cmd: 'railway', args: ['up'] },
    render: { cmd: 'render', args: ['deploy'] },
    vercel: { cmd: 'vercel', args: ['--prod'] },
    fly: { cmd: 'flyctl', args: ['deploy'] },
    heroku: { cmd: 'git', args: ['push', 'heroku', 'main'] },
  };

  if (platform === 'manual') {
    logger.info('Manual deployment selected');
    logger.log('');
    logger.info('Build and deploy your application using your preferred method');
    logger.log('');
    logger.info('Make sure to set the required environment variables:');
    logger.log('  • Z402_API_KEY');
    logger.log('  • Z402_MERCHANT_ID');
    logger.log('  • Z402_NETWORK');
    logger.log('');
    return;
  }

  const { cmd, args } = deployCommands[platform];

  try {
    await execa(cmd, args, {
      cwd: process.cwd(),
      stdio: 'inherit',
    });
  } catch (error) {
    throw new Error(`Deployment command failed: ${cmd} ${args.join(' ')}`);
  }
}
