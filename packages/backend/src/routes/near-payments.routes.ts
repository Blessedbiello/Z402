import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { X402Protocol } from '../core/x402-protocol';
import { nearIntentsService } from '../services/near-intents.service';
import { VerificationService } from '../services/verify.service';
import prisma from '../db';
import { logger } from '../config/logger';

const router = Router();

/**
 * Validation schemas
 */
const createNearPaymentIntentSchema = z.object({
  amount: z.string().or(z.number()).transform((val) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num) || num <= 0) {
      throw new Error('Amount must be a positive number');
    }
    return num;
  }),
  resourceUrl: z.string().url('Invalid resource URL'),
  originAsset: z.string().min(1, 'Origin asset ID is required'), // e.g., "evm-1-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" (USDC)
  originAmount: z.string().min(1, 'Origin amount is required'), // Amount user wants to pay in origin token
  refundAddress: z.string().min(1, 'Refund address is required'),
  refundChainType: z.string().min(1, 'Refund chain type is required'),
  metadata: z.record(z.unknown()).optional(),
  slippageBps: z.number().positive().optional(),
  deadlineMinutes: z.number().positive().optional(),
});

const submitDepositSchema = z.object({
  nearIntentId: z.string().min(1, 'NEAR intent ID is required'),
  depositTxHash: z.string().min(1, 'Deposit transaction hash is required'),
});

const checkStatusSchema = z.object({
  nearIntentId: z.string().min(1, 'NEAR intent ID is required'),
});

/**
 * POST /api/v1/near-payments/intents
 * Create a new payment intent with NEAR cross-chain support
 * Allows users to pay with any token (ETH, USDC, SOL, BTC) and merchant receives ZEC
 */
router.post(
  '/intents',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      const validatedData = createNearPaymentIntentSchema.parse(req.body);

      // Step 1: Generate standard Z402 payment challenge
      const challenge = await X402Protocol.generateChallenge({
        merchantId: req.user!.id,
        resourceUrl: validatedData.resourceUrl,
        amount: validatedData.amount,
        metadata: {
          ...validatedData.metadata,
          paymentMethod: 'near-intents',
          originAsset: validatedData.originAsset,
        },
      });

      // Step 2: Get merchant's Zcash address
      const merchant = await prisma.merchant.findUnique({
        where: { id: req.user!.id },
        select: { zcashAddress: true },
      });

      if (!merchant?.zcashAddress) {
        return res.status(400).json({ error: 'Merchant Zcash address not configured' });
      }

      // Step 3: Get quote from NEAR Intents for cross-chain swap
      const quote = await nearIntentsService.getQuoteToZec({
        originAsset: validatedData.originAsset,
        amountOrigin: validatedData.originAmount,
        recipientZcashAddress: merchant.zcashAddress,
        refundAddress: validatedData.refundAddress,
        refundChainType: validatedData.refundChainType,
        slippageBps: validatedData.slippageBps,
        deadlineMinutes: validatedData.deadlineMinutes,
      });

      // Step 4: Store NEAR intent information in database
      const nearIntent = await prisma.nearIntent.create({
        data: {
          id: quote.requestId,
          paymentIntentId: challenge.paymentId,
          merchantId: req.user!.id,
          originAsset: validatedData.originAsset,
          originAmount: validatedData.originAmount,
          destinationAsset: quote.quote.destinationAsset,
          destinationAmount: quote.quote.destinationAmount,
          depositAddress: quote.quote.depositAddress,
          memo: quote.quote.memo,
          status: 'PENDING',
          expiresAt: new Date(quote.quote.expiresAt),
          estimatedTimeSeconds: quote.quote.estimatedTimeSeconds,
          recipientAddress: quote.recipient.address,
          refundAddress: quote.refund.address,
          refundChainType: quote.refund.chainType,
        },
      });

      logger.info('NEAR payment intent created', {
        merchantId: req.user!.id,
        paymentId: challenge.paymentId,
        nearIntentId: nearIntent.id,
        depositAddress: quote.quote.depositAddress,
      });

      res.status(201).json({
        // Standard Z402 payment intent fields
        id: challenge.paymentId,
        amount: challenge.amount,
        currency: challenge.currency,
        merchantAddress: challenge.merchantAddress,
        resourceUrl: challenge.resourceUrl,
        expiresAt: challenge.expiresAt,

        // NEAR Intents cross-chain payment fields
        nearIntent: {
          id: nearIntent.id,
          originAsset: validatedData.originAsset,
          originAmount: validatedData.originAmount,
          destinationAmount: quote.quote.destinationAmount,
          depositAddress: quote.quote.depositAddress,
          memo: quote.quote.memo,
          estimatedTimeSeconds: quote.quote.estimatedTimeSeconds,
          expiresAt: quote.quote.expiresAt,
          instructions: {
            step1: `Send ${validatedData.originAmount} of ${validatedData.originAsset} to deposit address`,
            step2: 'NEAR Intents will automatically convert to ZEC and send to merchant',
            step3: 'Z402 will verify ZEC receipt and grant access to resource',
          },
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      }
      logger.error('Failed to create NEAR payment intent', error);
      next(error);
    }
  }
);

/**
 * POST /api/v1/near-payments/deposit
 * Submit deposit transaction hash to speed up NEAR intent processing
 */
router.post(
  '/deposit',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedData = submitDepositSchema.parse(req.body);

      // Get NEAR intent from database
      const nearIntent = await prisma.nearIntent.findUnique({
        where: { id: validatedData.nearIntentId },
      });

      if (!nearIntent) {
        return res.status(404).json({ error: 'NEAR intent not found' });
      }

      // Verify merchant ownership
      if (nearIntent.merchantId !== req.user!.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Submit deposit to NEAR Intents
      const result = await nearIntentsService.submitDeposit({
        depositAddress: nearIntent.depositAddress,
        txHash: validatedData.depositTxHash,
        memo: nearIntent.memo || undefined,
      });

      // Update database
      await prisma.nearIntent.update({
        where: { id: validatedData.nearIntentId },
        data: {
          depositTxHash: validatedData.depositTxHash,
          status: 'PROCESSING',
        },
      });

      logger.info('Deposit transaction submitted for NEAR intent', {
        nearIntentId: validatedData.nearIntentId,
        depositTxHash: validatedData.depositTxHash,
      });

      res.json({
        success: result.success,
        message: result.success
          ? 'Deposit submitted, swap will process automatically'
          : 'Deposit recorded, but submission to NEAR Intents failed (non-critical)',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      }
      next(error);
    }
  }
);

/**
 * GET /api/v1/near-payments/status/:id
 * Check status of NEAR intent cross-chain swap
 */
router.get(
  '/status/:id',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      // Get NEAR intent from database
      const nearIntent = await prisma.nearIntent.findUnique({
        where: { id },
        include: {
          paymentIntent: true,
        },
      });

      if (!nearIntent) {
        return res.status(404).json({ error: 'NEAR intent not found' });
      }

      // Verify merchant ownership
      if (nearIntent.merchantId !== req.user!.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Get status from NEAR Intents
      const status = await nearIntentsService.getSwapStatus(
        nearIntent.depositAddress,
        nearIntent.memo || undefined
      );

      // Update database with latest status
      await prisma.nearIntent.update({
        where: { id },
        data: {
          status: status.state,
          outputTxHash: status.outputTxHash,
          errorMessage: status.errorMessage,
          updatedAt: new Date(),
        },
      });

      // If swap completed successfully, verify ZEC transaction with Z402
      if (status.state === 'SUCCESS' && status.outputTxHash && !nearIntent.verified) {
        try {
          // Create transaction record if it doesn't exist
          const transaction = await prisma.transaction.upsert({
            where: { txid: status.outputTxHash },
            create: {
              txid: status.outputTxHash,
              paymentIntentId: nearIntent.paymentIntentId,
              merchantId: nearIntent.merchantId,
              amount: nearIntent.destinationAmount,
              status: 'PENDING',
              confirmations: 0,
            },
            update: {},
          });

          // Verify on Zcash blockchain
          const verification = await VerificationService.verifyPayment({
            authorization: {
              paymentId: nearIntent.paymentIntentId,
              txid: status.outputTxHash,
              clientAddress: nearIntent.recipientAddress, // ZEC address
              signature: '', // Not needed for cross-chain verification
            },
            skipBlockchainCheck: false,
          });

          if (verification.success) {
            // Mark NEAR intent as verified
            await prisma.nearIntent.update({
              where: { id },
              data: { verified: true },
            });

            logger.info('NEAR intent verified successfully', {
              nearIntentId: id,
              zcashTxHash: status.outputTxHash,
            });
          }
        } catch (error) {
          logger.error('Failed to verify NEAR intent ZEC transaction', {
            nearIntentId: id,
            error,
          });
        }
      }

      res.json({
        nearIntentId: id,
        paymentIntentId: nearIntent.paymentIntentId,
        status: status.state,
        depositAddress: nearIntent.depositAddress,
        depositTxHash: nearIntent.depositTxHash,
        outputTxHash: status.outputTxHash,
        originAmount: nearIntent.originAmount,
        destinationAmount: nearIntent.destinationAmount,
        verified: nearIntent.verified,
        errorMessage: status.errorMessage,
        createdAt: nearIntent.createdAt,
        updatedAt: status.updatedAt,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/near-payments/supported-tokens
 * Get list of tokens supported for cross-chain payments
 */
router.get(
  '/supported-tokens',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tokens = await nearIntentsService.getSupportedTokens();

      // Filter to show most common tokens for better UX
      const commonTokens = tokens.filter((token) =>
        ['ETH', 'USDC', 'USDT', 'BTC', 'SOL', 'NEAR', 'DAI', 'WETH'].includes(
          token.symbol.toUpperCase()
        )
      );

      res.json({
        tokens: commonTokens.length > 0 ? commonTokens : tokens.slice(0, 20), // Fallback to first 20
        total: tokens.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
