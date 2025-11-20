import chalk from 'chalk';
import logSymbols from 'log-symbols';

export const logger = {
  success: (message: string) => {
    console.log(`${logSymbols.success} ${chalk.green(message)}`);
  },

  error: (message: string) => {
    console.log(`${logSymbols.error} ${chalk.red(message)}`);
  },

  warning: (message: string) => {
    console.log(`${logSymbols.warning} ${chalk.yellow(message)}`);
  },

  info: (message: string) => {
    console.log(`${logSymbols.info} ${chalk.blue(message)}`);
  },

  log: (message: string) => {
    console.log(message);
  },

  bold: (message: string) => chalk.bold(message),
  dim: (message: string) => chalk.dim(message),
  cyan: (message: string) => chalk.cyan(message),
  green: (message: string) => chalk.green(message),
  yellow: (message: string) => chalk.yellow(message),
  red: (message: string) => chalk.red(message),
  blue: (message: string) => chalk.blue(message),
};
