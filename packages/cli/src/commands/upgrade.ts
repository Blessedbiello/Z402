import { Command } from 'commander';
import ora from 'ora';
import inquirer from 'inquirer';
import execa = require('execa');
import fs from 'fs-extra';
import path from 'path';
import semver from 'semver';
import { logger } from '../utils/logger';

export const upgradeCommand = new Command('upgrade')
  .description('Upgrade Z402 dependencies')
  .option('--dry-run', 'Show what would be upgraded without actually upgrading')
  .option('-y, --yes', 'Skip confirmation')
  .action(async (options) => {
    try {
      // Check if package.json exists
      const packageJsonPath = path.join(process.cwd(), 'package.json');

      if (!fs.existsSync(packageJsonPath)) {
        logger.error('No package.json found in current directory');
        process.exit(1);
      }

      const packageJson = await fs.readJson(packageJsonPath);

      // Find Z402 packages
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      const z402Packages = Object.keys(allDeps).filter((pkg) =>
        pkg.startsWith('@z402/')
      );

      if (z402Packages.length === 0) {
        logger.info('No Z402 packages found in package.json');
        return;
      }

      logger.log('');
      logger.info('Found Z402 packages:');
      z402Packages.forEach((pkg) => {
        logger.log(`  • ${pkg} ${logger.dim('(v' + allDeps[pkg] + ')')}`);
      });
      logger.log('');

      // Check for updates
      const spinner = ora('Checking for updates...').start();

      const updates: { pkg: string; current: string; latest: string }[] = [];

      for (const pkg of z402Packages) {
        try {
          const { stdout } = await execa('npm', ['view', pkg, 'version']);
          const latestVersion = stdout.trim();
          const currentVersion = allDeps[pkg].replace(/^[\^~]/, '');

          if (semver.gt(latestVersion, currentVersion)) {
            updates.push({
              pkg,
              current: currentVersion,
              latest: latestVersion,
            });
          }
        } catch (error) {
          // Package might not exist on npm yet
          logger.warning(`Could not check version for ${pkg}`);
        }
      }

      spinner.stop();

      if (updates.length === 0) {
        logger.success('All Z402 packages are up to date!');
        return;
      }

      logger.log('');
      logger.info('Available updates:');
      logger.log('');

      updates.forEach(({ pkg, current, latest }) => {
        logger.log(
          `  ${pkg}  ${logger.dim(current)} → ${logger.green(latest)}`
        );
      });

      logger.log('');

      if (options.dryRun) {
        logger.info('Dry run mode - no packages were upgraded');
        return;
      }

      if (!options.yes) {
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Upgrade ${updates.length} package${updates.length === 1 ? '' : 's'}?`,
            default: true,
          },
        ]);

        if (!confirm) {
          logger.info('Upgrade cancelled');
          return;
        }
      }

      // Perform upgrade
      const upgradeSpinner = ora('Upgrading packages...').start();

      try {
        // Update package.json
        updates.forEach(({ pkg, latest }) => {
          if (packageJson.dependencies?.[pkg]) {
            packageJson.dependencies[pkg] = `^${latest}`;
          }
          if (packageJson.devDependencies?.[pkg]) {
            packageJson.devDependencies[pkg] = `^${latest}`;
          }
        });

        await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });

        // Install updated packages
        await execa('npm', ['install'], {
          cwd: process.cwd(),
          stdio: 'ignore',
        });

        upgradeSpinner.succeed('Packages upgraded successfully');

        logger.log('');
        logger.success(
          `Upgraded ${updates.length} package${updates.length === 1 ? '' : 's'}`
        );
        logger.log('');

        // Check if migrations are needed
        const { runMigrations } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'runMigrations',
            message: 'Run database migrations?',
            default: true,
          },
        ]);

        if (runMigrations) {
          const migrateSpinner = ora('Running migrations...').start();

          try {
            await execa('npm', ['run', 'db:migrate'], {
              cwd: process.cwd(),
              stdio: 'inherit',
            });
            migrateSpinner.succeed('Migrations completed');
          } catch (error) {
            migrateSpinner.warn('No migration script found');
            logger.info('You can run migrations manually if needed');
          }
        }
      } catch (error) {
        upgradeSpinner.fail('Upgrade failed');
        throw error;
      }
    } catch (error) {
      logger.error(
        `Upgrade failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      process.exit(1);
    }
  });
