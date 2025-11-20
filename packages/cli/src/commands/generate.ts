import { Command } from 'commander';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import Handlebars from 'handlebars';
import { logger } from '../utils/logger';

export const generateCommand = new Command('generate')
  .alias('g')
  .description('Generate code snippets and files');

generateCommand
  .command('middleware')
  .description('Generate Z402 middleware')
  .option('-f, --framework <framework>', 'Framework (express, nextjs, fastapi, nestjs)')
  .option('-o, --output <path>', 'Output file path')
  .action(async (options) => {
    try {
      let framework = options.framework;

      if (!framework) {
        const { selected } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selected',
            message: 'Select framework:',
            choices: ['express', 'nextjs', 'fastapi', 'nestjs'],
          },
        ]);
        framework = selected;
      }

      const outputPath =
        options.output ||
        (await getOutputPath('middleware', framework));

      const content = getMiddlewareTemplate(framework);

      await fs.ensureFile(outputPath);
      await fs.writeFile(outputPath, content);

      logger.success(`Middleware generated: ${outputPath}`);
    } catch (error) {
      logger.error(
        `Failed to generate middleware: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      process.exit(1);
    }
  });

generateCommand
  .command('route')
  .description('Generate a protected route')
  .option('-p, --path <path>', 'Route path (e.g., /api/premium)')
  .option('-a, --amount <amount>', 'Payment amount', '0.01')
  .option('-o, --output <file>', 'Output file path')
  .action(async (options) => {
    try {
      const questions: any[] = [];

      if (!options.path) {
        questions.push({
          type: 'input',
          name: 'path',
          message: 'Route path:',
          default: '/api/premium',
        });
      }

      if (!options.amount) {
        questions.push({
          type: 'input',
          name: 'amount',
          message: 'Payment amount (ZEC):',
          default: '0.01',
        });
      }

      const answers = await inquirer.prompt(questions);

      const routePath = options.path || answers.path;
      const amount = options.amount || answers.amount;

      const content = getRouteTemplate(routePath, amount);

      const outputPath = options.output || path.join(process.cwd(), 'src', 'routes', 'premium.ts');

      await fs.ensureFile(outputPath);
      await fs.writeFile(outputPath, content);

      logger.success(`Route generated: ${outputPath}`);
      logger.log('');
      logger.info('Import and use in your app:');
      logger.log(`  import premiumRouter from './routes/premium';`);
      logger.log(`  app.use('/api', premiumRouter);`);
      logger.log('');
    } catch (error) {
      logger.error(
        `Failed to generate route: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      process.exit(1);
    }
  });

generateCommand
  .command('webhook-handler')
  .description('Generate webhook event handler')
  .option('-o, --output <path>', 'Output file path')
  .action(async (options) => {
    try {
      const content = getWebhookHandlerTemplate();

      const outputPath =
        options.output ||
        path.join(process.cwd(), 'src', 'webhooks', 'handler.ts');

      await fs.ensureFile(outputPath);
      await fs.writeFile(outputPath, content);

      logger.success(`Webhook handler generated: ${outputPath}`);
      logger.log('');
      logger.info('Use in your app:');
      logger.log(`  import { handleWebhook } from './webhooks/handler';`);
      logger.log(`  app.post('/webhooks/z402', handleWebhook);`);
      logger.log('');
    } catch (error) {
      logger.error(
        `Failed to generate webhook handler: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      process.exit(1);
    }
  });

async function getOutputPath(type: string, framework: string): Promise<string> {
  const defaults: Record<string, string> = {
    express: `src/middleware/z402.ts`,
    nextjs: `lib/z402-middleware.ts`,
    fastapi: `middleware/z402.py`,
    nestjs: `src/middleware/z402.middleware.ts`,
  };

  const { outputPath } = await inquirer.prompt([
    {
      type: 'input',
      name: 'outputPath',
      message: 'Output path:',
      default: defaults[framework] || `src/${type}.ts`,
    },
  ]);

  return path.join(process.cwd(), outputPath);
}

function getMiddlewareTemplate(framework: string): string {
  const templates: Record<string, string> = {
    express: `import { Request, Response, NextFunction } from 'express';
import { Z402 } from '@z402/sdk';

const z402 = new Z402({
  apiKey: process.env.Z402_API_KEY,
  network: process.env.Z402_NETWORK || 'testnet',
});

export const requirePayment = (amount: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authorization = req.headers.authorization;

      if (!authorization) {
        return res.status(402).json({
          error: 'Payment required',
          paymentUrl: await z402.createPaymentIntent({
            amount,
            resourceUrl: req.originalUrl,
          }),
        });
      }

      // Verify payment
      const isValid = await z402.verifyPayment(authorization);

      if (!isValid) {
        return res.status(401).json({
          error: 'Invalid payment authorization',
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
`,
    nextjs: `import { NextRequest, NextResponse } from 'next/server';
import { Z402 } from '@z402/sdk';

const z402 = new Z402({
  apiKey: process.env.Z402_API_KEY,
  network: process.env.Z402_NETWORK || 'testnet',
});

export async function z402Middleware(req: NextRequest, amount: number) {
  const authorization = req.headers.get('authorization');

  if (!authorization) {
    const paymentUrl = await z402.createPaymentIntent({
      amount,
      resourceUrl: req.url,
    });

    return NextResponse.json(
      {
        error: 'Payment required',
        paymentUrl,
      },
      { status: 402 }
    );
  }

  const isValid = await z402.verifyPayment(authorization);

  if (!isValid) {
    return NextResponse.json(
      { error: 'Invalid payment authorization' },
      { status: 401 }
    );
  }

  return null; // Continue processing
}
`,
    fastapi: `from fastapi import Header, HTTPException
from z402 import Z402
import os

z402 = Z402(
    api_key=os.getenv("Z402_API_KEY"),
    network=os.getenv("Z402_NETWORK", "testnet")
)

async def require_payment(
    amount: float,
    resource_url: str,
    authorization: str = Header(None)
):
    """Middleware to require payment for a resource"""
    if not authorization:
        payment_url = await z402.create_payment_intent(
            amount=amount,
            resource_url=resource_url
        )
        raise HTTPException(
            status_code=402,
            detail={
                "error": "Payment required",
                "payment_url": payment_url
            }
        )

    is_valid = await z402.verify_payment(authorization)
    if not is_valid:
        raise HTTPException(
            status_code=401,
            detail="Invalid payment authorization"
        )

    return True
`,
    nestjs: `import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Z402 } from '@z402/sdk';

@Injectable()
export class Z402Middleware implements NestMiddleware {
  private z402: Z402;

  constructor() {
    this.z402 = new Z402({
      apiKey: process.env.Z402_API_KEY,
      network: process.env.Z402_NETWORK || 'testnet',
    });
  }

  async use(req: Request, res: Response, next: NextFunction) {
    const authorization = req.headers.authorization;
    const amount = (req as any).paymentAmount || 0.01; // Set payment amount per route

    if (!authorization) {
      const paymentUrl = await this.z402.createPaymentIntent({
        amount,
        resourceUrl: req.originalUrl,
      });

      throw new HttpException(
        {
          error: 'Payment required',
          paymentUrl,
        },
        HttpStatus.PAYMENT_REQUIRED
      );
    }

    const isValid = await this.z402.verifyPayment(authorization);

    if (!isValid) {
      throw new HttpException(
        'Invalid payment authorization',
        HttpStatus.UNAUTHORIZED
      );
    }

    next();
  }
}
`,
  };

  return templates[framework] || templates.express;
}

function getRouteTemplate(routePath: string, amount: string): string {
  return `import { Router, Request, Response } from 'express';
import { requirePayment } from '../middleware/z402';

const router = Router();

// Protected route - requires payment
router.get('${routePath}', requirePayment(${amount}), async (req: Request, res: Response) => {
  // This code only runs after payment is verified
  res.json({
    message: 'Premium content',
    data: {
      // Your premium content here
      secret: 'This content requires payment!',
    },
  });
});

export default router;
`;
}

function getWebhookHandlerTemplate(): string {
  return `import { Request, Response } from 'express';
import { Z402 } from '@z402/sdk';

const z402 = new Z402({
  apiKey: process.env.Z402_API_KEY,
  network: process.env.Z402_NETWORK || 'testnet',
});

export async function handleWebhook(req: Request, res: Response) {
  try {
    const signature = req.headers['x-z402-signature'] as string;
    const event = req.body;

    // Verify webhook signature
    const isValid = z402.verifyWebhook(event, signature);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Handle different event types
    switch (event.type) {
      case 'payment.created':
        console.log('Payment created:', event.data.id);
        // Handle payment created
        break;

      case 'payment.pending':
        console.log('Payment pending:', event.data.id);
        // Payment submitted to blockchain
        break;

      case 'payment.verified':
        console.log('Payment verified:', event.data.id);
        // Payment verified on blockchain
        // Grant access to content
        await grantAccess(event.data.paymentId);
        break;

      case 'payment.settled':
        console.log('Payment settled:', event.data.id);
        // Payment fully confirmed
        break;

      case 'payment.failed':
        console.log('Payment failed:', event.data.id);
        // Handle payment failure
        break;

      case 'payment.refunded':
        console.log('Payment refunded:', event.data.id);
        // Revoke access
        await revokeAccess(event.data.paymentId);
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

async function grantAccess(paymentId: string) {
  // Implement your access granting logic
  console.log(\`Granting access for payment: \${paymentId}\`);
}

async function revokeAccess(paymentId: string) {
  // Implement your access revocation logic
  console.log(\`Revoking access for payment: \${paymentId}\`);
}
`;
}
