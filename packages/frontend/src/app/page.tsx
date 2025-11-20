export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Welcome to Z402
        </h1>
        <p className="text-center text-lg mb-8">
          x402 payment facilitator for Zcash with Stripe-like developer
          experience
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="border border-gray-300 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Fast Integration</h2>
            <p className="text-gray-600">
              Start accepting Zcash payments in minutes with our simple SDK
            </p>
          </div>
          <div className="border border-gray-300 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Developer-Friendly</h2>
            <p className="text-gray-600">
              Stripe-like API design you already know and love
            </p>
          </div>
          <div className="border border-gray-300 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Privacy First</h2>
            <p className="text-gray-600">
              Leverage Zcash's privacy features for your customers
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
