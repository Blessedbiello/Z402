export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Welcome to Z402</h1>
        <p className="text-lg text-gray-600 mb-8">
          A payment-enabled Next.js application powered by Zcash
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-2">Public Content</h2>
            <p className="text-gray-600 mb-4">
              This content is free and accessible to everyone.
            </p>
            <a
              href="/api/public"
              className="text-blue-600 hover:underline"
            >
              View API →
            </a>
          </div>

          <div className="p-6 border rounded-lg bg-yellow-50">
            <h2 className="text-2xl font-semibold mb-2">Premium Content</h2>
            <p className="text-gray-600 mb-4">
              This content requires a small payment to access.
            </p>
            <a
              href="/api/premium"
              className="text-blue-600 hover:underline"
            >
              Access Premium →
            </a>
          </div>
        </div>

        <div className="mt-12 p-6 bg-gray-50 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Quick Start</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Configure your Z402 API key in <code className="bg-gray-200 px-2 py-1 rounded">.env.local</code></li>
            <li>Test the public endpoint at <code className="bg-gray-200 px-2 py-1 rounded">/api/public</code></li>
            <li>Try accessing premium content at <code className="bg-gray-200 px-2 py-1 rounded">/api/premium</code></li>
            <li>Follow the payment flow to unlock content</li>
          </ol>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <a
            href="https://docs.z402.io"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Documentation
          </a>
          {' · '}
          <a
            href="https://github.com/z402/z402"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            GitHub
          </a>
        </div>
      </div>
    </main>
  );
}
