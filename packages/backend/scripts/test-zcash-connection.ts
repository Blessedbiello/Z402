#!/usr/bin/env tsx

/**
 * Zcash Connection Diagnostic Script
 *
 * This script tests the Zcash RPC connection and provides detailed diagnostics.
 *
 * Usage:
 *   npm run test:zcash
 *   # or directly:
 *   tsx scripts/test-zcash-connection.ts
 */

import { ZcashRPCClient } from '../src/integrations/zcash';
import { config } from '../src/config';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN' | 'SKIP';
  message?: string;
  data?: any;
  error?: any;
}

const results: TestResult[] = [];

function logResult(result: TestResult) {
  const icons = {
    PASS: '✓',
    FAIL: '✗',
    WARN: '⚠',
    SKIP: '⊘',
  };

  const colors = {
    PASS: '\x1b[32m', // Green
    FAIL: '\x1b[31m', // Red
    WARN: '\x1b[33m', // Yellow
    SKIP: '\x1b[36m', // Cyan
  };

  const reset = '\x1b[0m';
  const icon = icons[result.status];
  const color = colors[result.status];

  console.log(`${color}${icon}${reset} ${result.name}`);

  if (result.message) {
    console.log(`  ${result.message}`);
  }

  if (result.data) {
    console.log(`  Data:`, JSON.stringify(result.data, null, 2).split('\n').join('\n  '));
  }

  if (result.error) {
    console.log(`  Error: ${result.error.message || result.error}`);
  }

  results.push(result);
}

async function testConfiguration() {
  console.log('\n━━━ Configuration Check ━━━\n');

  const requiredVars = {
    ZCASH_NETWORK: config.zcash.network,
    ZCASH_RPC_URL: config.zcash.rpcUrl,
    ZCASH_RPC_USER: config.zcash.rpcUser,
    ZCASH_RPC_PASSWORD: config.zcash.rpcPassword ? '***' : undefined,
  };

  let allConfigured = true;

  for (const [key, value] of Object.entries(requiredVars)) {
    if (!value || value === 'undefined') {
      logResult({
        name: `Environment Variable: ${key}`,
        status: 'FAIL',
        message: 'Not configured',
      });
      allConfigured = false;
    } else {
      logResult({
        name: `Environment Variable: ${key}`,
        status: 'PASS',
        message: key === 'ZCASH_RPC_PASSWORD' ? 'Configured (hidden)' : value,
      });
    }
  }

  if (!allConfigured) {
    console.log('\n⚠ Configuration incomplete. Please set all required environment variables in your .env file.');
    console.log('\nExample .env configuration:');
    console.log('  ZCASH_NETWORK=testnet');
    console.log('  ZCASH_RPC_URL=http://localhost:18232');
    console.log('  ZCASH_RPC_USER=zcashrpc');
    console.log('  ZCASH_RPC_PASSWORD=your-secure-password');
    return false;
  }

  return true;
}

async function testConnection(client: ZcashRPCClient) {
  console.log('\n━━━ Connection Tests ━━━\n');

  try {
    const health = await client.healthCheck();

    if (health.connected) {
      logResult({
        name: 'RPC Connection',
        status: 'PASS',
        message: `Connected to ${health.network} network`,
        data: {
          blockHeight: health.blockHeight,
          connections: health.connections,
          synced: health.synced,
        },
      });

      if (!health.synced) {
        logResult({
          name: 'Node Sync Status',
          status: 'WARN',
          message: 'Node is not fully synced. Some operations may be delayed.',
        });
      } else {
        logResult({
          name: 'Node Sync Status',
          status: 'PASS',
          message: 'Node is fully synced',
        });
      }

      return true;
    } else {
      logResult({
        name: 'RPC Connection',
        status: 'FAIL',
        message: 'Could not connect to Zcash node',
      });
      return false;
    }
  } catch (error: any) {
    logResult({
      name: 'RPC Connection',
      status: 'FAIL',
      message: 'Connection failed',
      error,
    });
    return false;
  }
}

async function testAddressValidation(client: ZcashRPCClient) {
  console.log('\n━━━ Address Validation Tests ━━━\n');

  const testAddresses = [
    {
      address: 't1Hsc1LR8yKnbbe3twRp88p6vFfC5t7DLbs',
      network: 'testnet',
      type: 'transparent',
      description: 'Testnet transparent address',
    },
    {
      address: 't1V9mnkcte6BjwKVAqY3kpz5yRhqKmwNwv8',
      network: 'mainnet',
      type: 'transparent',
      description: 'Mainnet transparent address',
    },
    {
      address: 'zs1z7rejlpsa98s2rrrfkwmaxu53e4ue0ulcrw0h4x5g8jl04tak0d3mm47vdtahatqrlkngh9sly',
      network: 'mainnet',
      type: 'shielded',
      description: 'Mainnet shielded address',
    },
    {
      address: 'invalid_address',
      network: 'any',
      type: 'invalid',
      description: 'Invalid address',
    },
  ];

  for (const test of testAddresses) {
    try {
      const result = await client.validateAddress(test.address);

      if (test.type === 'invalid') {
        if (!result.isvalid) {
          logResult({
            name: `Validate ${test.description}`,
            status: 'PASS',
            message: 'Correctly identified as invalid',
          });
        } else {
          logResult({
            name: `Validate ${test.description}`,
            status: 'FAIL',
            message: 'Should be invalid but was marked valid',
          });
        }
      } else {
        if (result.isvalid && result.type === test.type) {
          logResult({
            name: `Validate ${test.description}`,
            status: 'PASS',
            message: `Valid ${result.type} address`,
          });
        } else if (!result.isvalid) {
          logResult({
            name: `Validate ${test.description}`,
            status: 'SKIP',
            message: `Address may not be valid on ${config.zcash.network}`,
          });
        } else {
          logResult({
            name: `Validate ${test.description}`,
            status: 'FAIL',
            message: `Expected ${test.type}, got ${result.type}`,
          });
        }
      }
    } catch (error: any) {
      logResult({
        name: `Validate ${test.description}`,
        status: 'FAIL',
        error,
      });
    }
  }
}

async function testAddressGeneration(client: ZcashRPCClient) {
  console.log('\n━━━ Address Generation Tests ━━━\n');

  try {
    const tAddr = await client.createTransparentAddress();
    const validation = await client.validateAddress(tAddr);

    if (validation.isvalid && validation.type === 'transparent') {
      logResult({
        name: 'Generate Transparent Address',
        status: 'PASS',
        message: `Generated: ${tAddr}`,
      });
    } else {
      logResult({
        name: 'Generate Transparent Address',
        status: 'FAIL',
        message: 'Generated address is not valid',
      });
    }
  } catch (error: any) {
    logResult({
      name: 'Generate Transparent Address',
      status: 'FAIL',
      error,
    });
  }

  try {
    const zAddr = await client.createShieldedAddress();
    const validation = await client.validateAddress(zAddr);

    if (validation.isvalid && validation.type === 'shielded') {
      logResult({
        name: 'Generate Shielded Address',
        status: 'PASS',
        message: `Generated: ${zAddr}`,
      });
    } else {
      logResult({
        name: 'Generate Shielded Address',
        status: 'FAIL',
        message: 'Generated address is not valid',
      });
    }
  } catch (error: any) {
    logResult({
      name: 'Generate Shielded Address',
      status: 'FAIL',
      error,
    });
  }
}

async function testBalanceQuery(client: ZcashRPCClient) {
  console.log('\n━━━ Balance Query Tests ━━━\n');

  try {
    const balance = await client.getBalance();

    logResult({
      name: 'Query Wallet Balance',
      status: 'PASS',
      data: {
        total: `${balance.total} ZEC`,
        transparent: `${balance.transparent} ZEC`,
        shielded: `${balance.shielded} ZEC`,
      },
    });
  } catch (error: any) {
    logResult({
      name: 'Query Wallet Balance',
      status: 'FAIL',
      error,
    });
  }
}

async function testTransactionQuery(client: ZcashRPCClient) {
  console.log('\n━━━ Transaction Query Tests ━━━\n');

  try {
    const transactions = await client.listTransactions(undefined, 5);

    if (transactions.length > 0) {
      logResult({
        name: 'List Recent Transactions',
        status: 'PASS',
        message: `Found ${transactions.length} transaction(s)`,
        data: transactions.map(tx => ({
          txid: tx.txid.substring(0, 16) + '...',
          amount: `${tx.amount} ZEC`,
          confirmations: tx.confirmations,
        })),
      });
    } else {
      logResult({
        name: 'List Recent Transactions',
        status: 'WARN',
        message: 'No transactions found (wallet may be empty)',
      });
    }
  } catch (error: any) {
    logResult({
      name: 'List Recent Transactions',
      status: 'FAIL',
      error,
    });
  }
}

async function printSummary() {
  console.log('\n━━━ Test Summary ━━━\n');

  const counts = {
    PASS: results.filter(r => r.status === 'PASS').length,
    FAIL: results.filter(r => r.status === 'FAIL').length,
    WARN: results.filter(r => r.status === 'WARN').length,
    SKIP: results.filter(r => r.status === 'SKIP').length,
  };

  console.log(`✓ Passed:  ${counts.PASS}`);
  console.log(`✗ Failed:  ${counts.FAIL}`);
  console.log(`⚠ Warnings: ${counts.WARN}`);
  console.log(`⊘ Skipped: ${counts.SKIP}`);
  console.log(`━ Total:   ${results.length}`);

  if (counts.FAIL === 0 && counts.PASS > 0) {
    console.log('\n✓ All tests passed! Zcash integration is working correctly.\n');
    return true;
  } else if (counts.FAIL > 0) {
    console.log('\n✗ Some tests failed. Please review the errors above.\n');
    return false;
  } else {
    console.log('\n⚠ No tests were able to run. Check your configuration.\n');
    return false;
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║   Z402 Zcash Connection Diagnostic Tool   ║');
  console.log('╚═══════════════════════════════════════════╝');

  // Test configuration
  const configOk = await testConfiguration();

  if (!configOk) {
    process.exit(1);
  }

  // Initialize client
  const client = new ZcashRPCClient();

  // Test connection
  const connectionOk = await testConnection(client);

  if (!connectionOk) {
    console.log('\n⚠ Cannot proceed with further tests without a working connection.');
    console.log('\nTroubleshooting:');
    console.log('  1. Ensure Zcash node (zcashd or zebrad) is running');
    console.log('  2. Check ZCASH_RPC_URL is correct');
    console.log('  3. Verify ZCASH_RPC_USER and ZCASH_RPC_PASSWORD match your zcash.conf');
    console.log('  4. Check firewall/network connectivity\n');
    process.exit(1);
  }

  // Run all tests
  await testAddressValidation(client);
  await testAddressGeneration(client);
  await testBalanceQuery(client);
  await testTransactionQuery(client);

  // Print summary
  const success = await printSummary();

  process.exit(success ? 0 : 1);
}

// Run the diagnostic
main().catch((error) => {
  console.error('\n✗ Fatal error:', error);
  process.exit(1);
});
