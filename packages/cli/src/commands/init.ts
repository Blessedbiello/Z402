import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import execa = require('execa');
import validatePackageName from 'validate-npm-package-name';
import { logger } from '../utils/logger';
import { ProjectConfig } from '../types/index';

export const initCommand = new Command('init')
  .description('Initialize a new Z402-integrated project')
  .argument('[project-name]', 'Name of the project')
  .option('-t, --type <type>', 'Project type (express, nextjs, fastapi, nestjs)')
  .option('-l, --lang <language>', 'Language (typescript, javascript, python)')
  .option('--skip-install', 'Skip dependency installation')
  .action(async (projectName: string | undefined, options) => {
    try {
      // Get project name
      if (!projectName) {
        const { name } = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'Project name:',
            default: 'my-z402-app',
            validate: (input: string) => {
              const validation = validatePackageName(input);
              if (!validation.validForNewPackages) {
                return validation.errors?.[0] || 'Invalid package name';
              }
              return true;
            },
          },
        ]);
        projectName = name;
      }

      const targetDir = path.resolve(process.cwd(), projectName);

      // Check if directory exists
      if (fs.existsSync(targetDir)) {
        const { overwrite } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'overwrite',
            message: `Directory ${projectName} already exists. Overwrite?`,
            default: false,
          },
        ]);

        if (!overwrite) {
          logger.info('Operation cancelled');
          return;
        }

        fs.removeSync(targetDir);
      }

      // Get project configuration
      const config = await getProjectConfig(options);

      // Create project
      const spinner = ora('Creating project...').start();

      await createProject(targetDir, projectName, config);

      spinner.succeed('Project created successfully!');

      // Install dependencies
      if (!options.skipInstall) {
        const installSpinner = ora('Installing dependencies...').start();
        try {
          await installDependencies(targetDir, config.language);
          installSpinner.succeed('Dependencies installed');
        } catch (error) {
          installSpinner.fail('Failed to install dependencies');
          logger.warning('You can install them manually by running:');
          logger.log(`  cd ${projectName}`);
          logger.log(`  ${getPackageManager(config.language)} install`);
        }
      }

      // Show next steps
      displayNextSteps(projectName, config);
    } catch (error) {
      logger.error(`Failed to initialize project: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

async function getProjectConfig(options: any): Promise<ProjectConfig> {
  const questions: any[] = [];

  if (!options.type) {
    questions.push({
      type: 'list',
      name: 'type',
      message: 'Select project type:',
      choices: [
        { name: 'Express.js API', value: 'express' },
        { name: 'Next.js Application', value: 'nextjs' },
        { name: 'FastAPI (Python)', value: 'fastapi' },
        { name: 'NestJS Application', value: 'nestjs' },
        { name: 'Plain Node.js', value: 'nodejs' },
      ],
    });
  }

  if (!options.lang) {
    questions.push({
      type: 'list',
      name: 'language',
      message: 'Select language:',
      choices: (answers: any) => {
        const projectType = options.type || answers.type;
        if (projectType === 'fastapi') {
          return [{ name: 'Python', value: 'python' }];
        }
        return [
          { name: 'TypeScript', value: 'typescript' },
          { name: 'JavaScript', value: 'javascript' },
        ];
      },
    });
  }

  questions.push(
    {
      type: 'checkbox',
      name: 'features',
      message: 'Select features:',
      choices: [
        { name: 'Webhook support', value: 'webhooks', checked: true },
        { name: 'Analytics integration', value: 'analytics', checked: true },
        { name: 'Shielded addresses only', value: 'shieldedOnly', checked: false },
      ],
    },
    {
      type: 'list',
      name: 'network',
      message: 'Select network:',
      choices: [
        { name: 'Testnet (recommended for development)', value: 'testnet' },
        { name: 'Mainnet', value: 'mainnet' },
      ],
      default: 'testnet',
    }
  );

  const answers = await inquirer.prompt(questions);

  return {
    name: '',
    type: options.type || answers.type,
    language: options.lang || answers.language,
    features: {
      webhooks: answers.features.includes('webhooks'),
      analytics: answers.features.includes('analytics'),
      shieldedOnly: answers.features.includes('shieldedOnly'),
    },
    network: answers.network,
  };
}

async function createProject(
  targetDir: string,
  projectName: string,
  config: ProjectConfig
): Promise<void> {
  config.name = projectName;

  // Create directory
  fs.ensureDirSync(targetDir);

  // Copy template based on project type
  const templateDir = path.join(__dirname, '../../templates', config.type, config.language);

  if (fs.existsSync(templateDir)) {
    fs.copySync(templateDir, targetDir);
  } else {
    // Create basic structure if template doesn't exist
    await createBasicStructure(targetDir, config);
  }

  // Update package.json or requirements.txt
  await updateProjectMetadata(targetDir, config);

  // Create .env file
  await createEnvFile(targetDir, config);

  // Create README
  await createReadme(targetDir, config);
}

async function createBasicStructure(targetDir: string, config: ProjectConfig): Promise<void> {
  if (config.language === 'python') {
    // Python structure
    fs.writeFileSync(
      path.join(targetDir, 'main.py'),
      getPythonTemplate(config)
    );
    fs.writeFileSync(
      path.join(targetDir, 'requirements.txt'),
      getPythonDependencies(config)
    );
  } else {
    // JavaScript/TypeScript structure
    fs.ensureDirSync(path.join(targetDir, 'src'));
    fs.writeFileSync(
      path.join(targetDir, 'src', `index.${config.language === 'typescript' ? 'ts' : 'js'}`),
      getNodeTemplate(config)
    );
    fs.writeFileSync(
      path.join(targetDir, 'package.json'),
      JSON.stringify(getPackageJson(config), null, 2)
    );

    if (config.language === 'typescript') {
      fs.writeFileSync(
        path.join(targetDir, 'tsconfig.json'),
        JSON.stringify(getTsConfig(), null, 2)
      );
    }
  }

  // Create .gitignore
  fs.writeFileSync(
    path.join(targetDir, '.gitignore'),
    getGitignore(config.language)
  );
}

async function updateProjectMetadata(targetDir: string, config: ProjectConfig): Promise<void> {
  if (config.language === 'python') {
    // Update requirements.txt if needed
    const requirementsPath = path.join(targetDir, 'requirements.txt');
    if (!fs.existsSync(requirementsPath)) {
      fs.writeFileSync(requirementsPath, getPythonDependencies(config));
    }
  } else {
    // Update package.json
    const packageJsonPath = path.join(targetDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = fs.readJsonSync(packageJsonPath);
      packageJson.name = config.name;
      packageJson.version = '0.1.0';
      packageJson.description = `Z402-integrated ${config.type} application`;
      fs.writeJsonSync(packageJsonPath, packageJson, { spaces: 2 });
    }
  }
}

async function createEnvFile(targetDir: string, config: ProjectConfig): Promise<void> {
  const envContent = `# Z402 Configuration
Z402_API_KEY=your-api-key-here
Z402_MERCHANT_ID=your-merchant-id
Z402_NETWORK=${config.network}

# Application
NODE_ENV=development
PORT=3000

# Zcash Configuration
ZCASH_NETWORK=${config.network}
${config.features.shieldedOnly ? 'ZCASH_SHIELDED_ONLY=true' : '# ZCASH_SHIELDED_ONLY=false'}

${config.features.webhooks ? `# Webhook Configuration
WEBHOOK_URL=http://localhost:3000/webhooks/z402
WEBHOOK_SECRET=your-webhook-secret` : ''}

${config.features.analytics ? `# Analytics
ENABLE_ANALYTICS=true` : ''}
`;

  fs.writeFileSync(path.join(targetDir, '.env.example'), envContent);
  fs.writeFileSync(path.join(targetDir, '.env'), envContent);
}

async function createReadme(targetDir: string, config: ProjectConfig): Promise<void> {
  const readme = `# ${config.name}

A Z402-integrated ${config.type} application built with ${config.language}.

## Features

- ✅ Z402 payment integration
${config.features.webhooks ? '- ✅ Webhook support' : ''}
${config.features.analytics ? '- ✅ Analytics integration' : ''}
${config.features.shieldedOnly ? '- ✅ Shielded addresses only' : ''}
- 🌐 Network: ${config.network}

## Getting Started

1. Install dependencies:
\`\`\`bash
${config.language === 'python' ? 'pip install -r requirements.txt' : 'npm install'}
\`\`\`

2. Configure environment variables:
\`\`\`bash
cp .env.example .env
# Edit .env with your Z402 API credentials
\`\`\`

3. Get your API key from Z402:
\`\`\`bash
z402 login
z402 keys create --name "Development"
\`\`\`

4. Start the development server:
\`\`\`bash
${config.language === 'python' ? 'python main.py' : 'npm run dev'}
\`\`\`

## Documentation

- [Z402 Documentation](https://docs.z402.io)
- [API Reference](https://docs.z402.io/api)
${config.features.webhooks ? '- [Webhook Guide](https://docs.z402.io/webhooks)' : ''}

## Testing

Test a payment flow:
\`\`\`bash
z402 test payment --amount 0.01
\`\`\`

## Deployment

Deploy with one command:
\`\`\`bash
z402 deploy
\`\`\`

## License

MIT
`;

  fs.writeFileSync(path.join(targetDir, 'README.md'), readme);
}

async function installDependencies(targetDir: string, language: string): Promise<void> {
  const cwd = targetDir;

  if (language === 'python') {
    await execa('pip', ['install', '-r', 'requirements.txt'], { cwd });
  } else {
    const packageManager = getPackageManager(language);
    await execa(packageManager, ['install'], { cwd });
  }
}

function getPackageManager(language: string): string {
  if (language === 'python') return 'pip';
  // Check for pnpm, yarn, or fallback to npm
  try {
    execa.sync('pnpm', ['--version']);
    return 'pnpm';
  } catch {
    try {
      execa.sync('yarn', ['--version']);
      return 'yarn';
    } catch {
      return 'npm';
    }
  }
}

function displayNextSteps(projectName: string, config: ProjectConfig): void {
  logger.log('');
  logger.success('Project created successfully!');
  logger.log('');
  logger.log(chalk.bold('Next steps:'));
  logger.log('');
  logger.log(`  ${chalk.cyan('cd')} ${projectName}`);
  logger.log(`  ${chalk.cyan('z402 login')}  ${chalk.dim('# Authenticate with Z402')}`);
  logger.log(`  ${chalk.cyan('z402 keys create --name "Development"')}  ${chalk.dim('# Generate API key')}`);
  logger.log(`  ${chalk.cyan(config.language === 'python' ? 'python main.py' : 'npm run dev')}  ${chalk.dim('# Start development server')}`);
  logger.log('');
  logger.log(chalk.dim('For more information, visit https://docs.z402.io'));
  logger.log('');
}

// Template generators
function getPackageJson(config: ProjectConfig): any {
  const base = {
    name: config.name,
    version: '0.1.0',
    description: `Z402-integrated ${config.type} application`,
    main: config.language === 'typescript' ? 'dist/index.js' : 'src/index.js',
    scripts: {
      dev: config.language === 'typescript' ? 'tsx src/index.ts' : 'node src/index.js',
      build: config.language === 'typescript' ? 'tsc' : 'echo "No build needed"',
      start: config.language === 'typescript' ? 'node dist/index.js' : 'node src/index.js',
    },
    dependencies: {
      '@z402/sdk': '^0.1.0',
      express: '^4.18.2',
      dotenv: '^16.4.1',
    },
    devDependencies: {},
  };

  if (config.language === 'typescript') {
    base.devDependencies = {
      '@types/express': '^4.17.21',
      '@types/node': '^20.11.16',
      tsx: '^4.7.0',
      typescript: '^5.3.3',
    };
  }

  return base;
}

function getTsConfig(): any {
  return {
    compilerOptions: {
      target: 'ES2022',
      module: 'commonjs',
      outDir: './dist',
      rootDir: './src',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
    },
    include: ['src/**/*'],
    exclude: ['node_modules'],
  };
}

function getNodeTemplate(config: ProjectConfig): string {
  const ext = config.language === 'typescript' ? 'ts' : 'js';
  const imports = config.language === 'typescript'
    ? `import express, { Request, Response } from 'express';
import { Z402 } from '@z402/sdk';
import dotenv from 'dotenv';`
    : `const express = require('express');
const { Z402 } = require('@z402/sdk');
const dotenv = require('dotenv');`;

  return `${imports}

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Initialize Z402
const z402 = new Z402({
  apiKey: process.env.Z402_API_KEY,
  network: process.env.Z402_NETWORK || 'testnet',
});

app.use(express.json());

// Public endpoint
app.get('/', async (req${config.language === 'typescript' ? ': Request' : ''}, res${config.language === 'typescript' ? ': Response' : ''}) => {
  res.json({
    message: 'Z402-integrated API',
    docs: 'https://docs.z402.io',
  });
});

// Protected endpoint - requires payment
app.get('/api/premium', z402.requirePayment({ amount: 0.01 }), async (req, res) => {
  res.json({
    message: 'This is premium content!',
    data: { secret: 'Only paid users see this' },
  });
});

${config.features.webhooks ? `// Webhook endpoint
app.post('/webhooks/z402', async (req, res) => {
  const event = req.body;
  console.log('Webhook received:', event.type);

  // Verify webhook signature
  const isValid = z402.verifyWebhook(req.body, req.headers['x-z402-signature']);

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Handle event
  switch (event.type) {
    case 'payment.verified':
      console.log('Payment verified:', event.data.id);
      break;
    case 'payment.settled':
      console.log('Payment settled:', event.data.id);
      break;
    default:
      console.log('Unhandled event type:', event.type);
  }

  res.json({ received: true });
});
` : ''}
app.listen(port, () => {
  console.log(\`Server running on http://localhost:\${port}\`);
  console.log('Protected endpoint: http://localhost:\${port}/api/premium');
});
`;
}

function getPythonTemplate(config: ProjectConfig): string {
  return `from fastapi import FastAPI, Header, HTTPException
from z402 import Z402
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="${config.name}")
z402 = Z402(
    api_key=os.getenv("Z402_API_KEY"),
    network=os.getenv("Z402_NETWORK", "testnet")
)

@app.get("/")
async def root():
    return {
        "message": "Z402-integrated API",
        "docs": "https://docs.z402.io"
    }

@app.get("/api/premium")
async def premium_content(authorization: str = Header(None)):
    """Protected endpoint - requires payment"""
    if not authorization:
        raise HTTPException(status_code=402, detail="Payment required")

    # Verify payment
    is_valid = z402.verify_payment(authorization)
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid payment")

    return {
        "message": "This is premium content!",
        "data": {"secret": "Only paid users see this"}
    }

${config.features.webhooks ? `@app.post("/webhooks/z402")
async def webhook_handler(event: dict, x_z402_signature: str = Header(None)):
    """Handle Z402 webhook events"""
    # Verify signature
    is_valid = z402.verify_webhook(event, x_z402_signature)
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid signature")

    # Handle event
    event_type = event.get("type")
    if event_type == "payment.verified":
        print(f"Payment verified: {event['data']['id']}")
    elif event_type == "payment.settled":
        print(f"Payment settled: {event['data']['id']}")

    return {"received": True}
` : ''}
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 3000)))
`;
}

function getPythonDependencies(config: ProjectConfig): string {
  const deps = ['fastapi>=0.109.0', 'uvicorn>=0.27.0', 'z402>=0.1.0', 'python-dotenv>=1.0.0'];
  return deps.join('\n');
}

function getGitignore(language: string): string {
  if (language === 'python') {
    return `__pycache__/
*.py[cod]
*$py.class
.Python
venv/
ENV/
.env
.venv
*.log
.DS_Store
`;
  }

  return `node_modules/
dist/
.env
.env.local
*.log
.DS_Store
.vscode/
.idea/
`;
}
