'use client';

import { useState } from 'react';

export default function Dashboard() {
  const [stats] = useState({
    totalPayments: 0,
    totalVolume: 0,
    successRate: 0,
    activeCustomers: 0,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold">Z402 Dashboard</h1>
            <button className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-500 text-sm">Total Payments</p>
            <p className="text-3xl font-bold mt-2">{stats.totalPayments}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-500 text-sm">Total Volume (ZEC)</p>
            <p className="text-3xl font-bold mt-2">{stats.totalVolume}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-500 text-sm">Success Rate</p>
            <p className="text-3xl font-bold mt-2">{stats.successRate}%</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-500 text-sm">Active Customers</p>
            <p className="text-3xl font-bold mt-2">{stats.activeCustomers}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Recent Payments</h2>
          </div>
          <div className="p-6">
            <p className="text-gray-500 text-center py-8">
              No payments yet. Start by integrating the Z402 SDK.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
