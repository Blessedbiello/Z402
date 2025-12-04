'use client';

import { useState } from 'react';

export default function Dashboard() {
  const [stats] = useState({
    totalPayments: 127,
    totalVolume: 3.42,
    successRate: 98.4,
    activeCustomers: 45,
  });

  const demoTransactions = [
    {
      id: 1,
      type: 'ZEC Direct',
      amount: '0.025 ZEC',
      status: 'Completed',
      time: '2 minutes ago',
      from: 'zs1...7kq3',
      statusColor: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      id: 2,
      type: 'NEAR Intent (USDC → ZEC)',
      amount: '1.00 USDC → 0.015 ZEC',
      status: 'Processing',
      time: '5 minutes ago',
      from: '0x742d...0bEb',
      statusColor: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      nearIntent: true,
    },
    {
      id: 3,
      type: 'NEAR Intent (ETH → ZEC)',
      amount: '0.001 ETH → 0.032 ZEC',
      status: 'Completed',
      time: '12 minutes ago',
      from: '0x8B3A...94Fc',
      statusColor: 'text-green-600',
      bgColor: 'bg-green-100',
      nearIntent: true,
    },
    {
      id: 4,
      type: 'ZEC Direct',
      amount: '0.010 ZEC',
      status: 'Completed',
      time: '1 hour ago',
      from: 't1...9xk2',
      statusColor: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      id: 5,
      type: 'NEAR Intent (SOL → ZEC)',
      amount: '0.05 SOL → 0.008 ZEC',
      status: 'Completed',
      time: '2 hours ago',
      from: 'HN7...J8A',
      statusColor: 'text-green-600',
      bgColor: 'bg-green-100',
      nearIntent: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Z402 Dashboard
              </h1>
              <nav className="hidden md:flex items-center space-x-6">
                <a href="/dashboard" className="text-gray-900 font-medium">Overview</a>
                <a href="/dashboard/transactions" className="text-gray-600 hover:text-gray-900">Transactions</a>
                <a href="/dashboard/analytics" className="text-gray-600 hover:text-gray-900">Analytics</a>
                <a href="/dashboard/developers" className="text-gray-600 hover:text-gray-900">API Keys</a>
                <a href="/dashboard/settings" className="text-gray-600 hover:text-gray-900">Settings</a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Demo Mode
              </span>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium transition">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* New Feature Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 mb-8 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-flex items-center px-3 py-1 bg-white/20 rounded-full text-xs font-semibold mb-3">
                ✨ NEW: Cross-Chain Payments
              </div>
              <h2 className="text-2xl font-bold mb-2">NEAR Intents Integration Live!</h2>
              <p className="text-blue-100 text-lg mb-4">
                Your customers can now pay with ETH, USDC, SOL, BTC, or 150+ tokens. You receive ZEC privately.
              </p>
              <div className="flex items-center space-x-4">
                <a
                  href="http://localhost:3001/api/v1/near-payments/supported-tokens"
                  target="_blank"
                  className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-blue-50 transition"
                >
                  View Supported Tokens
                </a>
                <a
                  href="http://localhost:3001/api/v1/docs"
                  target="_blank"
                  className="text-white border-2 border-white px-6 py-2 rounded-lg font-semibold hover:bg-white/10 transition"
                >
                  View API Docs
                </a>
              </div>
            </div>
            <div className="text-6xl">🌐</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-600 text-sm font-medium">Total Payments</p>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalPayments}</p>
            <p className="text-sm text-green-600 mt-2">↑ 12% from last week</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-600 text-sm font-medium">Total Volume (ZEC)</p>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalVolume.toFixed(2)}</p>
            <p className="text-sm text-green-600 mt-2">↑ 8% from last week</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-600 text-sm font-medium">Success Rate</p>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.successRate}%</p>
            <p className="text-sm text-gray-500 mt-2">Industry leading</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-600 text-sm font-medium">Active Customers</p>
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.activeCustomers}</p>
            <p className="text-sm text-green-600 mt-2">↑ 24% from last week</p>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Recent Transactions</h2>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                3 Cross-Chain via NEAR
              </span>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">View All →</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">From</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {demoTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {tx.nearIntent && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-800 mr-2">
                            🌐 NEAR
                          </span>
                        )}
                        <span className="text-sm font-medium text-gray-900">{tx.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-900">{tx.amount}</td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-600">{tx.from}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${tx.bgColor} ${tx.statusColor}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{tx.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Integration Code Example */}
        <div className="mt-8 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-xl overflow-hidden">
          <div className="bg-gray-800 px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-white font-semibold">Quick Start: Accept Cross-Chain Payments</h3>
            <span className="text-gray-400 text-sm">TypeScript</span>
          </div>
          <pre className="p-6 overflow-x-auto">
            <code className="text-sm text-gray-300 leading-relaxed">
{`// Accept payments from ANY token - users pay with USDC, ETH, SOL, etc.
// You receive ZEC privately!

import { requireX402Payment } from '@z402/middleware';

app.get('/api/premium-data',
  requireX402Payment({
    payTo: 'zs1your-shielded-address',  // Privacy-first
    amount: '1000000',                  // 0.01 ZEC
    acceptCrossChain: true,              // NEW: Enable NEAR intents
    supportedTokens: ['ETH', 'USDC', 'SOL', 'BTC'] // Optional filter
  }),
  (req, res) => {
    // Payment verified - grant access
    res.json({ data: 'Your premium content' });
  }
);

// That's it! Users can pay with 150+ tokens 🎉`}
            </code>
          </pre>
        </div>
      </main>
    </div>
  );
}
