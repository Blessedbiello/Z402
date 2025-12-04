'use client';

import { useState } from 'react';

export default function UseCasesPage() {
  const [selectedUseCase, setSelectedUseCase] = useState('ai');

  const useCases = {
    ai: {
      icon: '🤖',
      title: 'AI Model Inference',
      subtitle: 'Pay-per-inference AI APIs',
      description: 'AI services charge per API call or model inference. No monthly subscriptions, just usage-based pricing.',
      gradient: 'from-blue-500 to-indigo-600',
      stats: {
        cost: '0.001 ZEC per inference',
        endpoint: 'POST /api/v1/generate',
        avgTime: '~2 seconds',
        volume: '1,247 inferences today'
      },
      demoTransactions: [
        { model: 'GPT-4 Vision', cost: '0.0015 ZEC', tokens: '1,200 tokens', time: '1 min ago' },
        { model: 'Stable Diffusion XL', cost: '0.001 ZEC', tokens: '1 image', time: '3 min ago' },
        { model: 'Whisper API', cost: '0.0005 ZEC', tokens: '45 sec audio', time: '8 min ago' },
      ],
      code: `// AI Model API with Z402 payment
app.post('/api/v1/generate',
  requireX402Payment({
    payTo: 'zs1...',
    amount: '100000',  // 0.001 ZEC per inference
    description: 'AI model inference'
  }),
  async (req, res) => {
    const { prompt } = req.body;

    // Run AI inference
    const result = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }]
    });

    res.json({
      result: result.choices[0].message.content,
      tokensUsed: result.usage.total_tokens
    });
  }
);`,
    },
    agent: {
      icon: '⚡',
      title: 'Agent-to-Agent Payments',
      subtitle: 'AI agents accessing APIs',
      description: 'Autonomous AI tools pay automatically for data, compute, or cloud services without human intervention.',
      gradient: 'from-purple-500 to-pink-600',
      stats: {
        cost: 'Variable by service',
        endpoint: 'Agent → API → Payment → Access',
        avgTime: 'Fully automated',
        volume: '847 autonomous transactions'
      },
      demoTransactions: [
        { agent: 'Data Scraper Bot', service: 'Web API', cost: '0.0002 ZEC', time: '30 sec ago' },
        { agent: 'Trading Algorithm', service: 'Market Data', cost: '0.005 ZEC', time: '2 min ago' },
        { agent: 'Research Assistant', service: 'Academic DB', cost: '0.001 ZEC', time: '5 min ago' },
      ],
      code: `// Autonomous AI Agent
class AIAgent {
  constructor(private z402: Z402Client, private budget: number) {}

  async fetchMarketData() {
    // Agent decides to make payment
    const payment = await this.z402.createPayment({
      amount: '500000',  // 0.005 ZEC
      resource: '/api/market-data',
      description: 'Real-time market data'
    });

    // Make authenticated request
    const response = await fetch('/api/market-data', {
      headers: { 'X-Payment-ID': payment.id }
    });

    const data = await response.json();

    // Agent processes data autonomously
    await this.analyzeAndTrade(data);
  }

  // Agent runs 24/7, pays for services automatically
  async run() {
    setInterval(() => this.fetchMarketData(), 60000);
  }
}`,
    },
    content: {
      icon: '📰',
      title: 'Premium Content',
      subtitle: 'On-demand digital content',
      description: 'Users pay per article, video, research paper, or dataset. Micropayments enable true pay-per-view.',
      gradient: 'from-green-500 to-emerald-600',
      stats: {
        cost: '0.0001 ZEC per article',
        endpoint: 'GET /api/content/:id',
        avgTime: 'Instant access',
        volume: '3,421 content purchases'
      },
      demoTransactions: [
        { content: 'Technical Article', cost: '0.0001 ZEC', type: 'Blog post', time: '2 min ago' },
        { content: 'Research Paper (PDF)', cost: '0.0005 ZEC', type: 'Academic', time: '15 min ago' },
        { content: 'Premium Video', cost: '0.002 ZEC', type: 'Tutorial', time: '1 hour ago' },
      ],
      code: `// Pay-per-article content platform
app.get('/articles/:id',
  requireX402Payment({
    payTo: 'zs1...',
    amount: '10000',  // 0.0001 ZEC per article
    description: 'Article access',
    allowPreview: true  // Show first 200 chars
  }),
  (req, res) => {
    const article = getArticle(req.params.id);
    res.json({
      title: article.title,
      content: article.content,  // Full content after payment
      author: article.author,
      publishedAt: article.publishedAt
    });
  }
);

// No subscriptions, no accounts, just pay and read`,
    },
    iot: {
      icon: '🔧',
      title: 'IoT & Machine Payments',
      subtitle: 'Autonomous system transactions',
      description: 'IoT devices and autonomous systems transact automatically. Perfect for machine-to-machine commerce.',
      gradient: 'from-orange-500 to-red-600',
      stats: {
        cost: 'Usage-based pricing',
        endpoint: 'Device → Service → Payment',
        avgTime: 'Zero human interaction',
        volume: '12,847 IoT transactions'
      },
      demoTransactions: [
        { device: 'Smart Sensor #4721', service: 'Cloud Storage', cost: '0.0001 ZEC', time: '10 sec ago' },
        { device: 'Autonomous Drone', service: 'Map Data', cost: '0.003 ZEC', time: '5 min ago' },
        { device: 'Smart Factory Bot', service: 'Parts Inventory', cost: '0.0008 ZEC', time: '12 min ago' },
      ],
      code: `// IoT Device Payment System
class SmartDevice {
  constructor(private deviceId: string, private z402: Z402Client) {}

  async uploadSensorData(data: SensorData) {
    // Device pays for cloud storage automatically
    const payment = await this.z402.createPayment({
      amount: '10000',  // 0.0001 ZEC per upload
      resource: '/api/storage/upload',
      description: \`Sensor data from \${this.deviceId}\`
    });

    // Upload data with payment proof
    await fetch('/api/storage/upload', {
      method: 'POST',
      headers: { 'X-Payment-ID': payment.id },
      body: JSON.stringify(data)
    });

    // Device continues operating autonomously
  }

  // Runs 24/7 without human intervention
  startMonitoring() {
    setInterval(() => {
      const data = this.readSensors();
      this.uploadSensorData(data);
    }, 300000); // Every 5 minutes
  }
}`,
    },
  };

  const currentCase = useCases[selectedUseCase as keyof typeof useCases];

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
                <a href="/dashboard" className="text-gray-600 hover:text-gray-900">Overview</a>
                <a href="/dashboard/transactions" className="text-gray-600 hover:text-gray-900">Transactions</a>
                <a href="/dashboard/use-cases" className="text-gray-900 font-medium">Use Cases</a>
                <a href="/dashboard/analytics" className="text-gray-600 hover:text-gray-900">Analytics</a>
                <a href="/dashboard/developers" className="text-gray-600 hover:text-gray-900">API Keys</a>
              </nav>
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium transition">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Real-World Use Cases</h1>
          <p className="text-lg text-gray-600">
            See how developers use Z402 to monetize AI models, enable autonomous agents, and build pay-per-use services
          </p>
        </div>

        {/* Use Case Selector */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Object.entries(useCases).map(([key, useCase]) => (
            <button
              key={key}
              onClick={() => setSelectedUseCase(key)}
              className={`text-left p-6 rounded-xl border-2 transition ${
                selectedUseCase === key
                  ? 'border-blue-500 bg-blue-50 shadow-lg'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="text-4xl mb-3">{useCase.icon}</div>
              <h3 className="font-bold text-gray-900 mb-1">{useCase.title}</h3>
              <p className="text-sm text-gray-600">{useCase.subtitle}</p>
            </button>
          ))}
        </div>

        {/* Selected Use Case Details */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Info */}
          <div className="space-y-6">
            {/* Hero Card */}
            <div className={`bg-gradient-to-br ${currentCase.gradient} rounded-2xl p-8 text-white shadow-xl`}>
              <div className="text-6xl mb-4">{currentCase.icon}</div>
              <h2 className="text-3xl font-bold mb-3">{currentCase.title}</h2>
              <p className="text-xl text-white/90 mb-6">{currentCase.description}</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/20 rounded-lg p-4">
                  <p className="text-white/80 text-sm mb-1">Cost per Request</p>
                  <p className="text-lg font-bold">{currentCase.stats.cost}</p>
                </div>
                <div className="bg-white/20 rounded-lg p-4">
                  <p className="text-white/80 text-sm mb-1">Response Time</p>
                  <p className="text-lg font-bold">{currentCase.stats.avgTime}</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Today's Activity</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Volume</span>
                  <span className="font-bold text-gray-900">{currentCase.stats.volume}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">API Endpoint</span>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">{currentCase.stats.endpoint}</code>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Success Rate</span>
                  <span className="font-bold text-green-600">99.2%</span>
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="font-bold text-gray-900">Recent Transactions</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {currentCase.demoTransactions.map((tx, idx) => (
                  <div key={idx} className="px-6 py-4 hover:bg-gray-50 transition">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {tx.model || tx.agent || tx.content || tx.device}
                        </p>
                        <p className="text-sm text-gray-600">
                          {tx.tokens || tx.service || tx.type}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm font-bold text-gray-900">{tx.cost}</p>
                        <p className="text-xs text-gray-500">{tx.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Code */}
          <div className="space-y-6">
            {/* Code Example */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-xl overflow-hidden">
              <div className="bg-gray-800 px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                <h3 className="text-white font-semibold">Implementation Example</h3>
                <span className="text-gray-400 text-sm">TypeScript</span>
              </div>
              <pre className="p-6 overflow-x-auto max-h-[600px]">
                <code className="text-sm text-gray-300 leading-relaxed">{currentCase.code}</code>
              </pre>
            </div>

            {/* Integration Benefits */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Why This Works</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span className="text-gray-700">
                    <strong>No Subscriptions:</strong> Pay only for what you use
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span className="text-gray-700">
                    <strong>Privacy-First:</strong> Shielded ZEC transactions
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span className="text-gray-700">
                    <strong>Instant Settlement:</strong> ~75 second finality
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span className="text-gray-700">
                    <strong>No Chargebacks:</strong> Blockchain finality guarantees payment
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span className="text-gray-700">
                    <strong>Global Access:</strong> Accept payments from anywhere
                  </span>
                </li>
              </ul>
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
              <h3 className="text-xl font-bold mb-2">Ready to implement?</h3>
              <p className="text-blue-100 mb-4">
                Start accepting payments for your {currentCase.title.toLowerCase()} in minutes
              </p>
              <div className="flex space-x-3">
                <a
                  href="http://localhost:3001/api/v1/docs"
                  target="_blank"
                  className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-blue-50 transition"
                >
                  View API Docs
                </a>
                <button className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-2 rounded-lg font-semibold transition border-2 border-white/30">
                  Get API Key
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
