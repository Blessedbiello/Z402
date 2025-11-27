/**
 * Blockchain Monitor Service Tests
 *
 * Tests the blockchain monitoring service including:
 * - Starting and stopping monitoring
 * - Scanning blockchain for new transactions
 * - Mempool monitoring
 * - Payment matching
 * - Blockchain reorganization handling
 * - Event emission
 */

import { BlockchainMonitorService } from '../blockchain-monitor.service';
import { ZcashRPCClient, ZcashTransaction } from '../../integrations/zcash';
import prisma from '../../db';
import { Decimal } from '@prisma/client/runtime/library';

// Mock dependencies
jest.mock('../../integrations/zcash');
jest.mock('../../db', () => ({
  __esModule: true,
  default: {
    transaction: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    paymentIntent: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('BlockchainMonitorService', () => {
  let monitorService: BlockchainMonitorService;
  let mockZcashClient: jest.Mocked<ZcashRPCClient>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock Zcash client
    mockZcashClient = {
      getBlockHeight: jest.fn(),
      getTransaction: jest.fn(),
      listTransactions: jest.fn(),
    } as any;

    // Create service instance with mock client
    monitorService = new BlockchainMonitorService(mockZcashClient, {
      scanInterval: 1000,
      mempoolInterval: 500,
      requiredConfirmations: 6,
      maxBlocksToScan: 100,
    });
  });

  afterEach(async () => {
    // Stop monitoring if running
    if (monitorService.getStatus().isMonitoring) {
      monitorService.stop();
    }
  });

  describe('Service Lifecycle', () => {
    it('should initialize with correct config', () => {
      const status = monitorService.getStatus();
      expect(status.isMonitoring).toBe(false);
      expect(status.config.scanInterval).toBe(1000);
      expect(status.config.requiredConfirmations).toBe(6);
    });

    it('should start monitoring successfully', async () => {
      // Mock initial setup
      (prisma.transaction.findFirst as jest.Mock).mockResolvedValue({
        blockHeight: 1000,
      });
      mockZcashClient.getBlockHeight.mockResolvedValue(1005);
      (prisma.paymentIntent.findMany as jest.Mock).mockResolvedValue([]);

      await monitorService.start();

      const status = monitorService.getStatus();
      expect(status.isMonitoring).toBe(true);
      expect(status.lastScannedBlock).toBeGreaterThan(0);
    });

    it('should stop monitoring successfully', async () => {
      // Mock initial setup
      (prisma.transaction.findFirst as jest.Mock).mockResolvedValue(null);
      mockZcashClient.getBlockHeight.mockResolvedValue(1000);
      (prisma.paymentIntent.findMany as jest.Mock).mockResolvedValue([]);

      await monitorService.start();
      monitorService.stop();

      const status = monitorService.getStatus();
      expect(status.isMonitoring).toBe(false);
    });

    it('should emit started event when monitoring starts', async () => {
      const startedHandler = jest.fn();
      monitorService.on('started', startedHandler);

      (prisma.transaction.findFirst as jest.Mock).mockResolvedValue(null);
      mockZcashClient.getBlockHeight.mockResolvedValue(1000);
      (prisma.paymentIntent.findMany as jest.Mock).mockResolvedValue([]);

      await monitorService.start();

      expect(startedHandler).toHaveBeenCalled();
    });

    it('should emit stopped event when monitoring stops', async () => {
      const stoppedHandler = jest.fn();
      monitorService.on('stopped', stoppedHandler);

      (prisma.transaction.findFirst as jest.Mock).mockResolvedValue(null);
      mockZcashClient.getBlockHeight.mockResolvedValue(1000);
      (prisma.paymentIntent.findMany as jest.Mock).mockResolvedValue([]);

      await monitorService.start();
      monitorService.stop();

      expect(stoppedHandler).toHaveBeenCalled();
    });

    it('should not start if already monitoring', async () => {
      (prisma.transaction.findFirst as jest.Mock).mockResolvedValue(null);
      mockZcashClient.getBlockHeight.mockResolvedValue(1000);
      (prisma.paymentIntent.findMany as jest.Mock).mockResolvedValue([]);

      await monitorService.start();
      const status1 = monitorService.getStatus();

      // Try to start again
      await monitorService.start();
      const status2 = monitorService.getStatus();

      expect(status1).toEqual(status2);
    });
  });

  describe('Payment Matching', () => {
    const mockPaymentIntent = {
      id: 'payment_123',
      merchantId: 'merchant_456',
      amount: new Decimal('1.5'),
      zcashAddress: 't1TestAddress123',
      transactionId: 'txid_789',
      clientAddress: null,
    };

    const mockTransaction: ZcashTransaction = {
      txid: 'txid_789',
      amount: 1.5,
      confirmations: 3,
      blockHeight: 1100,
      timestamp: Date.now() / 1000,
      from: 't1ClientAddress456',
      to: 't1TestAddress123',
    };

    it('should match transaction to payment intent with correct amount', async () => {
      const paymentDetectedHandler = jest.fn();
      monitorService.on('payment_detected', paymentDetectedHandler);

      (prisma.paymentIntent.findUnique as jest.Mock).mockResolvedValue(mockPaymentIntent);
      mockZcashClient.getTransaction.mockResolvedValue(mockTransaction);
      (prisma.paymentIntent.update as jest.Mock).mockResolvedValue({});
      (prisma.transaction.upsert as jest.Mock).mockResolvedValue({});

      const result = await monitorService.scanPaymentIntent('payment_123');

      expect(result).toBe(true);
      expect(paymentDetectedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentIntentId: 'payment_123',
          txid: 'txid_789',
          confirmations: 3,
        })
      );
    });

    it('should confirm payment when confirmations reach threshold', async () => {
      const paymentConfirmedHandler = jest.fn();
      monitorService.on('payment_confirmed', paymentConfirmedHandler);

      const confirmedTx = { ...mockTransaction, confirmations: 6 };

      (prisma.paymentIntent.findUnique as jest.Mock).mockResolvedValue(mockPaymentIntent);
      mockZcashClient.getTransaction.mockResolvedValue(confirmedTx);
      (prisma.paymentIntent.update as jest.Mock).mockResolvedValue({});
      (prisma.transaction.upsert as jest.Mock).mockResolvedValue({});

      await monitorService.scanPaymentIntent('payment_123');

      expect(paymentConfirmedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentIntentId: 'payment_123',
          txid: 'txid_789',
          confirmations: 6,
        })
      );
    });

    it('should reject transaction with incorrect amount', async () => {
      const wrongAmountTx: ZcashTransaction = { ...mockTransaction, amount: 2.0 };

      (prisma.paymentIntent.findUnique as jest.Mock).mockResolvedValue(mockPaymentIntent);
      mockZcashClient.getTransaction.mockResolvedValue(wrongAmountTx);

      await monitorService.scanPaymentIntent('payment_123');

      // Should not update payment intent
      expect(prisma.paymentIntent.update).not.toHaveBeenCalled();
    });

    it('should reject transaction to wrong address', async () => {
      const wrongAddressTx: ZcashTransaction = { ...mockTransaction, to: 't1WrongAddress999' };

      (prisma.paymentIntent.findUnique as jest.Mock).mockResolvedValue(mockPaymentIntent);
      mockZcashClient.getTransaction.mockResolvedValue(wrongAddressTx);

      await monitorService.scanPaymentIntent('payment_123');

      // Should not update payment intent
      expect(prisma.paymentIntent.update).not.toHaveBeenCalled();
    });

    it('should update payment intent with transaction details', async () => {
      (prisma.paymentIntent.findUnique as jest.Mock).mockResolvedValue(mockPaymentIntent);
      mockZcashClient.getTransaction.mockResolvedValue(mockTransaction);
      (prisma.paymentIntent.update as jest.Mock).mockResolvedValue({});
      (prisma.transaction.upsert as jest.Mock).mockResolvedValue({});

      await monitorService.scanPaymentIntent('payment_123');

      expect(prisma.paymentIntent.update).toHaveBeenCalledWith({
        where: { id: 'payment_123' },
        data: expect.objectContaining({
          status: 'PROCESSING',
          transactionId: 'txid_789',
          clientAddress: 't1ClientAddress456',
        }),
      });
    });

    it('should create transaction record when payment matched', async () => {
      (prisma.paymentIntent.findUnique as jest.Mock).mockResolvedValue(mockPaymentIntent);
      mockZcashClient.getTransaction.mockResolvedValue(mockTransaction);
      (prisma.paymentIntent.update as jest.Mock).mockResolvedValue({});
      (prisma.transaction.upsert as jest.Mock).mockResolvedValue({});

      await monitorService.scanPaymentIntent('payment_123');

      expect(prisma.transaction.upsert).toHaveBeenCalledWith({
        where: { transactionId: 'txid_789' },
        create: expect.objectContaining({
          merchantId: 'merchant_456',
          amount: expect.any(Decimal),
          status: 'PENDING',
          transactionId: 'txid_789',
          blockHeight: 1100,
          confirmations: 3,
        }),
        update: expect.objectContaining({
          confirmations: 3,
          blockHeight: 1100,
        }),
      });
    });
  });

  describe('Blockchain Reorganization', () => {
    it('should handle blockchain reorg correctly', async () => {
      const affectedTx = {
        id: 'tx_123',
        transactionId: 'txid_reorg',
        paymentIntentId: 'payment_123',
        blockHeight: 1050,
        status: 'VERIFIED',
      };

      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([affectedTx]);
      mockZcashClient.getTransaction.mockResolvedValue(null); // Transaction lost in reorg
      (prisma.transaction.update as jest.Mock).mockResolvedValue({});
      (prisma.paymentIntent.update as jest.Mock).mockResolvedValue({});

      const reorgHandler = jest.fn();
      const txLostHandler = jest.fn();
      monitorService.on('reorg_handled', reorgHandler);
      monitorService.on('transaction_lost', txLostHandler);

      await monitorService.handleReorg(1060, 1045);

      expect(txLostHandler).toHaveBeenCalledWith('txid_reorg');
      expect(reorgHandler).toHaveBeenCalledWith({
        oldHeight: 1060,
        newHeight: 1045,
      });
    });

    it('should re-verify existing transactions after reorg', async () => {
      const affectedTx = {
        id: 'tx_123',
        transactionId: 'txid_exists',
        paymentIntentId: 'payment_123',
        blockHeight: 1050,
        status: 'VERIFIED',
      };

      const updatedTx: ZcashTransaction = {
        txid: 'txid_exists',
        confirmations: 4,
        blockHeight: 1048,
        amount: 1.5,
        timestamp: Date.now() / 1000,
        from: 't1From',
        to: 't1To',
      };

      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([affectedTx]);
      mockZcashClient.getTransaction.mockResolvedValue(updatedTx);
      (prisma.transaction.update as jest.Mock).mockResolvedValue({});

      await monitorService.handleReorg(1060, 1045);

      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: 'tx_123' },
        data: expect.objectContaining({
          confirmations: 4,
          blockHeight: 1048,
          status: 'PENDING', // Less than required confirmations
        }),
      });
    });

    it('should mark payment intent as unpaid if transaction lost', async () => {
      const affectedTx = {
        id: 'tx_123',
        transactionId: 'txid_lost',
        paymentIntentId: 'payment_123',
        blockHeight: 1050,
        status: 'VERIFIED',
      };

      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([affectedTx]);
      mockZcashClient.getTransaction.mockResolvedValue(null);
      (prisma.transaction.update as jest.Mock).mockResolvedValue({});
      (prisma.paymentIntent.update as jest.Mock).mockResolvedValue({});

      await monitorService.handleReorg(1060, 1045);

      expect(prisma.paymentIntent.update).toHaveBeenCalledWith({
        where: { id: 'payment_123' },
        data: {
          status: 'CREATED',
          transactionId: null,
          paidAt: null,
          verifiedAt: null,
          completedAt: null,
        },
      });
    });

    it('should reset last scanned block after reorg', async () => {
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);

      await monitorService.handleReorg(1060, 1045);

      const newStatus = monitorService.getStatus();
      expect(newStatus.lastScannedBlock).toBe(1035); // 1045 - 10 blocks safety margin
    });
  });

  describe('Error Handling', () => {
    it('should handle missing payment intent gracefully', async () => {
      (prisma.paymentIntent.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await monitorService.scanPaymentIntent('nonexistent_payment');

      expect(result).toBe(false);
      expect(mockZcashClient.getTransaction).not.toHaveBeenCalled();
    });

    it('should handle missing transaction gracefully', async () => {
      (prisma.paymentIntent.findUnique as jest.Mock).mockResolvedValue({
        id: 'payment_123',
        transactionId: 'txid_missing',
      });
      mockZcashClient.getTransaction.mockResolvedValue(null);

      const result = await monitorService.scanPaymentIntent('payment_123');

      expect(result).toBe(false);
    });

    it('should handle payment intent without transaction ID', async () => {
      (prisma.paymentIntent.findUnique as jest.Mock).mockResolvedValue({
        id: 'payment_123',
        transactionId: null,
      });

      const result = await monitorService.scanPaymentIntent('payment_123');

      expect(result).toBe(false);
      expect(mockZcashClient.getTransaction).not.toHaveBeenCalled();
    });

    it('should emit error event on scan failure', async () => {
      const errorHandler = jest.fn();
      monitorService.on('error', errorHandler);

      (prisma.transaction.findFirst as jest.Mock).mockResolvedValue(null);
      mockZcashClient.getBlockHeight
        .mockResolvedValueOnce(1000) // Initial call in start()
        .mockResolvedValueOnce(1000) // Initial scan
        .mockRejectedValue(new Error('RPC error')); // Subsequent calls fail
      (prisma.paymentIntent.findMany as jest.Mock).mockResolvedValue([]);

      await monitorService.start();

      // Wait for next scan to run and fail
      await new Promise((resolve) => setTimeout(resolve, 1200));

      expect(errorHandler).toHaveBeenCalled();
    });
  });

  describe('Status and Monitoring', () => {
    it('should track processed transactions', async () => {
      const mockPayment = {
        id: 'payment_123',
        merchantId: 'merchant_456',
        amount: new Decimal('1.5'),
        zcashAddress: 't1TestAddress123',
        transactionId: 'txid_789',
        clientAddress: null,
      };

      const mockTx: ZcashTransaction = {
        txid: 'txid_789',
        amount: 1.5,
        confirmations: 1,
        timestamp: Date.now() / 1000,
        from: 't1From',
        to: 't1TestAddress123',
      };

      (prisma.paymentIntent.findUnique as jest.Mock).mockResolvedValue(mockPayment);
      mockZcashClient.getTransaction.mockResolvedValue(mockTx);
      (prisma.paymentIntent.update as jest.Mock).mockResolvedValue({});
      (prisma.transaction.upsert as jest.Mock).mockResolvedValue({});

      const statusBefore = monitorService.getStatus();
      expect(statusBefore.processedTransactions).toBe(0);

      await monitorService.scanPaymentIntent('payment_123');

      const statusAfter = monitorService.getStatus();
      expect(statusAfter.processedTransactions).toBeGreaterThan(statusBefore.processedTransactions);
    });

    it('should return accurate monitoring status', () => {
      const status = monitorService.getStatus();

      expect(status).toHaveProperty('isMonitoring');
      expect(status).toHaveProperty('lastScannedBlock');
      expect(status).toHaveProperty('processedTransactions');
      expect(status).toHaveProperty('config');
    });
  });
});
