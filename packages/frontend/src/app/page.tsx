import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-md fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Z402
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition">Features</a>
              <a href="#use-cases" className="text-gray-600 hover:text-gray-900 transition">Use Cases</a>
              <a href="http://localhost:3001/api/v1/docs" target="_blank" className="text-gray-600 hover:text-gray-900 transition">Docs</a>
              <a href="/dashboard" className="text-gray-600 hover:text-gray-900 transition">Dashboard</a>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition">
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 rounded-full mb-8">
              <span className="text-blue-700 text-sm font-semibold">The Privacy-First Payment Protocol</span>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Fast, private, and
              <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                developer-friendly payments
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-12 leading-relaxed max-w-3xl mx-auto">
              The onchain payment gateway for APIs, AI models, and digital services.
              Built on X-402 with Zcash's privacy and Stripe's developer experience.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition shadow-lg hover:shadow-xl">
                Start building free
              </button>
              <button className="bg-white hover:bg-gray-50 text-gray-900 px-8 py-4 rounded-lg font-semibold text-lg transition border-2 border-gray-300">
                View live demo
              </button>
            </div>

            {/* Code Preview */}
            <div className="bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-800">
              <div className="bg-gray-800 px-6 py-3 flex items-center justify-between">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <span className="text-gray-400 text-sm">api-server.js</span>
              </div>
              <pre className="p-6 text-left overflow-x-auto">
                <code className="text-sm md:text-base text-gray-300">
{`import { requireX402Payment } from '@z402/middleware';

// Monetize your API endpoint instantly
app.get('/api/premium-data',
  requireX402Payment({
    payTo: 'zs1your-shielded-address',  // Privacy-first
    amount: '1000000',                  // 0.01 ZEC per call
    description: 'Premium API access'
  }),
  (req, res) => {
    res.json({ data: 'Your premium content' });
  }
);`}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Key Benefits Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              The onchain payment gateway for APIs & AI
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to monetize digital services
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Benefit 1 */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border border-blue-200">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Monetize APIs & AI</h3>
              <p className="text-gray-700 leading-relaxed">
                Charge per API call, AI inference, or data access. No subscriptions needed.
              </p>
            </div>

            {/* Benefit 2 */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-8 border border-purple-200">
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">No Chargebacks</h3>
              <p className="text-gray-700 leading-relaxed">
                Instant Zcash payments with finality. No disputes, no middlemen, no reversals.
              </p>
            </div>

            {/* Benefit 3 */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-8 border border-green-200">
              <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Privacy Built-In</h3>
              <p className="text-gray-700 leading-relaxed">
                Shielded transactions protect both payer and payee. True financial privacy.
              </p>
            </div>

            {/* Benefit 4 */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-8 border border-orange-200">
              <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Real-Time Analytics</h3>
              <p className="text-gray-700 leading-relaxed">
                Track revenue, balances, and transactions with built-in dashboards.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section id="use-cases" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              How developers use Z402
            </h2>
            <p className="text-xl text-gray-600">
              Pay-per-use models for the modern internet
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Use Case 1 */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 h-48 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="text-6xl mb-4">🤖</div>
                  <h3 className="text-2xl font-bold">AI Model Inference</h3>
                </div>
              </div>
              <div className="p-8">
                <h4 className="text-xl font-bold text-gray-900 mb-3">Pay-per-inference AI APIs</h4>
                <p className="text-gray-600 mb-4">
                  AI services charge per API call or model inference. No monthly subscriptions, just usage-based pricing.
                </p>
                <div className="bg-gray-50 rounded-lg p-4 text-sm font-mono text-gray-700">
                  POST /api/v1/generate<br/>
                  Cost: 0.001 ZEC per inference
                </div>
              </div>
            </div>

            {/* Use Case 2 */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition">
              <div className="bg-gradient-to-br from-purple-500 to-pink-600 h-48 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="text-6xl mb-4">⚡</div>
                  <h3 className="text-2xl font-bold">Agent-to-Agent Payments</h3>
                </div>
              </div>
              <div className="p-8">
                <h4 className="text-xl font-bold text-gray-900 mb-3">AI agents accessing APIs</h4>
                <p className="text-gray-600 mb-4">
                  Autonomous AI tools pay automatically for data, compute, or cloud services without human intervention.
                </p>
                <div className="bg-gray-50 rounded-lg p-4 text-sm font-mono text-gray-700">
                  Agent → API → Payment → Access<br/>
                  Fully automated workflow
                </div>
              </div>
            </div>

            {/* Use Case 3 */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 h-48 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="text-6xl mb-4">📰</div>
                  <h3 className="text-2xl font-bold">Premium Content</h3>
                </div>
              </div>
              <div className="p-8">
                <h4 className="text-xl font-bold text-gray-900 mb-3">On-demand digital content</h4>
                <p className="text-gray-600 mb-4">
                  Users pay per article, video, research paper, or dataset. Micropayments enable true pay-per-view.
                </p>
                <div className="bg-gray-50 rounded-lg p-4 text-sm font-mono text-gray-700">
                  Access article: 0.0001 ZEC<br/>
                  No subscription required
                </div>
              </div>
            </div>

            {/* Use Case 4 */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 h-48 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="text-6xl mb-4">🔧</div>
                  <h3 className="text-2xl font-bold">IoT & Machine Payments</h3>
                </div>
              </div>
              <div className="p-8">
                <h4 className="text-xl font-bold text-gray-900 mb-3">Autonomous system transactions</h4>
                <p className="text-gray-600 mb-4">
                  IoT devices and autonomous systems transact automatically. Perfect for machine-to-machine commerce.
                </p>
                <div className="bg-gray-50 rounded-lg p-4 text-sm font-mono text-gray-700">
                  Device → Service → Payment<br/>
                  Zero human interaction
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Onchain Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Better payments happen onchain
            </h2>
            <p className="text-xl text-gray-600">
              Why Z402 beats traditional payment rails
            </p>
          </div>

          {/* Comparison Table */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Feature</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-blue-600">Z402 (Onchain)</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-500">Traditional Payments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 text-gray-900 font-medium">Settlement Time</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        ~75 seconds
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600">2-5 business days</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-6 py-4 text-gray-900 font-medium">Chargebacks</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        Not possible
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600">180 days risk window</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-gray-900 font-medium">Privacy</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        Shielded transactions
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600">Full data exposure</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-6 py-4 text-gray-900 font-medium">Global Access</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        Borderless
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600">Restricted by country</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-gray-900 font-medium">Micropayments</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        $0.0001+
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600">Impractical (&lt;$1)</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-6 py-4 text-gray-900 font-medium">Developer Integration</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        5 lines of code
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600">Weeks of integration</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Developer Experience Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Building onchain is hard. We make it easy.
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We're committed to helping builders create incredible products with powerful APIs,
              SDKs, and tools that solve developers' toughest problems.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition">
              <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Stripe-like DX</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Clean APIs, TypeScript SDK, webhook events, and comprehensive documentation you expect from modern payment platforms.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Express.js middleware
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  TypeScript SDK
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  OpenAPI 3.0 spec
                </li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition">
              <div className="w-14 h-14 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">X-402 Compliant</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Full implementation of Coinbase's X-402 Payment Required protocol with real cryptographic verification.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  ECDSA signatures
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Payment verification
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Settlement tracking
                </li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition">
              <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Production Ready</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Battle-tested infrastructure with monitoring, analytics, and everything you need for production deployments.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  TimescaleDB analytics
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Webhook events
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Testnet support
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to monetize your API?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join developers building the next generation of pay-per-use services
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <button className="bg-white hover:bg-gray-100 text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg transition shadow-lg">
              Start building free
            </button>
            <button className="bg-blue-700 hover:bg-blue-800 text-white px-8 py-4 rounded-lg font-semibold text-lg transition border-2 border-blue-400">
              Schedule a demo
            </button>
          </div>
          <p className="text-blue-200 text-sm">
            Free for developers • No credit card required • Deploy in minutes
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-white font-bold text-xl mb-4">Z402</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                The privacy-first payment protocol for APIs, AI models, and digital services.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition">Features</a></li>
                <li><a href="#use-cases" className="hover:text-white transition">Use Cases</a></li>
                <li><a href="#" className="hover:text-white transition">Pricing</a></li>
                <li><a href="/dashboard" className="hover:text-white transition">Dashboard</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Developers</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="http://localhost:3001/api/v1/docs" target="_blank" className="hover:text-white transition">API Documentation</a></li>
                <li><a href="https://github.com/coinbase/x-402-protocol" target="_blank" className="hover:text-white transition">X-402 Spec</a></li>
                <li><a href="https://github.com/bprime/Z402" target="_blank" className="hover:text-white transition">GitHub</a></li>
                <li><a href="#" className="hover:text-white transition">SDK Reference</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="https://github.com/bprime/Z402/issues" target="_blank" className="hover:text-white transition">Support</a></li>
                <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-400">© 2025 Z402. All rights reserved.</p>
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <a href="https://github.com/bprime/Z402" target="_blank" className="text-gray-400 hover:text-white transition">
                <span className="sr-only">GitHub</span>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
