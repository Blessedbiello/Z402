# Z402 Demo Video Script (3 Minutes)

## 🎬 Opening (0:00 - 0:20)

**[Screen: Landing page at http://localhost:3000]**

**Script:**
"Hi, I'm presenting Z402 - implementation of the X-402 Payment Required protocol, built on Zcash for privacy-first payments.

Z402 solves a critical problem: How do you monetize APIs and digital services while preserving user privacy? No accounts, no subscriptions, just pay-per-use with cryptocurrency."

**Visual Actions:**
- Scroll slowly through landing page
- Highlight the tagline: "Privacy-First API Monetization"
- Show the key features section briefly


## 🌐 Cross-Chain Innovation (0:20 - 0:50)

**[Screen: Dashboard at http://localhost:3000/dashboard]**

**Script:**
"Here's what makes Z402 unique: We've integrated NEAR Intents to enable cross-chain payments.

Users can pay with ANY token - USDC, Ethereum, Solana, Bitcoin - over 150 supported tokens. But merchants? They receive Zcash privately using shielded transactions.

Look at these recent transactions - you can see payments coming in from USDC, Ethereum, and Solana, all automatically converted to ZEC. This removes the biggest barrier to adoption: users don't need to acquire ZEC first."

**Visual Actions:**
- Point to the NEAR Intents banner at the top
- Scroll to the transaction table
- Highlight the NEAR badge on cross-chain transactions
- Show the different payment types (USDC → ZEC, ETH → ZEC, SOL → ZEC)
- Point to the stats: 127 payments, 3.42 ZEC volume, 98.4% success rate


## 💡 Real-World Use Cases (0:50 - 1:40)

**[Screen: Navigate to http://localhost:3000/dashboard/use-cases]**

**Script:**
"Z402 enables four game-changing use cases:

**First, AI Model Inference** - AI companies can charge per API call. Pay 0.001 ZEC per inference, no monthly subscriptions needed. Perfect for GPT-4, Stable Diffusion, or Whisper APIs."

**Visual Actions:**
- Click on AI Model Inference card (🤖)
- Scroll through the demo transactions (GPT-4, Stable Diffusion, Whisper)
- Show the code example briefly
- Point to stats: "1,247 inferences today"

**Script (continued):**
"**Second, Agent-to-Agent Payments** - Autonomous AI agents can pay for services automatically. No human intervention needed. Trading bots, data scrapers, research assistants - all paying for APIs autonomously."

**Visual Actions:**
- Click on Agent-to-Agent Payments card (⚡)
- Show demo transactions (Data Scraper Bot, Trading Algorithm)
- Briefly show the code with `AIAgent` class

**Script (continued):**
"**Third, Premium Content** - Publishers can charge per article, video, or research paper. True micropayments enable pay-per-view models that were impossible before."

**Visual Actions:**
- Click on Premium Content card (📰)
- Show transactions (Technical Article 0.0001 ZEC, Research Paper 0.0005 ZEC)

**Script (continued):**
"**Fourth, IoT and Machine Payments** - Smart devices paying for cloud storage, drones accessing map data, factory bots ordering inventory - all automatically."

**Visual Actions:**
- Click on IoT card (🔧)
- Show transactions (Smart Sensor, Autonomous Drone)
- Point to "12,847 IoT transactions"


## 🔧 Technical Implementation (1:40 - 2:20)

**[Screen: Scroll to code example on dashboard]**

**Script:**
"Implementation is incredibly simple. Here's the complete code to accept cross-chain payments:

Just wrap your Express route with our middleware, specify your Zcash address and price, and enable cross-chain support. That's it.

Users can pay with USDC, ETH, SOL, or 150+ tokens. NEAR Intents handles the conversion automatically. You receive ZEC privately. No KYC, no accounts, instant settlement in about 75 seconds."

**Visual Actions:**
- Scroll to the code example on the dashboard
- Highlight key lines:
  - `requireX402Payment`
  - `acceptCrossChain: true`
  - `supportedTokens: ['ETH', 'USDC', 'SOL', 'BTC']`
- Show the comment: "Users can pay with 150+ tokens"


## 🎯 API Demo (2:20 - 2:45)

**[Screen: Terminal or Postman showing API calls]**

**Script:**
"Let me show you the API in action. Here's how developers create a cross-chain payment:

First, check supported tokens - we have Ethereum, USDC, Tether, Solana, Bitcoin, and 145 more.

Now create a payment intent. The API returns a unique deposit address. Users send their token to this address, NEAR converts it to ZEC automatically, and Z402 verifies the ZEC receipt on the blockchain.

Everything is tracked in real-time - you can monitor the swap status, verify completion, and grant access once ZEC is confirmed."

**Visual Actions:**
- Show: `GET /api/v1/near-payments/supported-tokens`
- Display response showing tokens (ETH on near, USDC on near, etc.)
- Show: `POST /api/v1/near-payments/intents` with payload
- Display response with deposit address
- Show: `GET /api/v1/near-payments/status/:id`


## 🏆 Closing (2:45 - 3:00)

**[Screen: Back to landing page or dashboard overview]**

**Script:**
"Z402 makes privacy-first payments accessible to everyone. No ZEC required, no accounts, no subscriptions - just frictionless pay-per-use.

We've built the complete X-402 protocol implementation with full NEAR Intents integration, comprehensive documentation, and production-ready code.

This is the future of API monetization: private, cross-chain, and simple.

Thank you!"

**Visual Actions:**
- Quick montage of key screens:
  - Dashboard with stats
  - Use cases page
  - Code examples
  - Transaction table
- End on Z402 logo or landing page


---

## 📋 Recording Checklist

### Before Recording:
- [ ] Both servers running (backend on 3001, frontend on 3000)
- [ ] Clear browser cache to ensure fresh load
- [ ] Prepare terminal with API calls ready to execute
- [ ] Set browser zoom to 100%
- [ ] Close unnecessary tabs/windows
- [ ] Test audio/microphone

### Recording Setup:
- [ ] Use 1080p resolution (1920x1080)
- [ ] Record at 30fps minimum
- [ ] Use screen recording tool (OBS, QuickTime, etc.)
- [ ] Test audio levels before full recording
- [ ] Have this script open on second monitor/device

### During Recording:
- [ ] Speak clearly and at moderate pace
- [ ] Pause briefly between sections
- [ ] Use cursor to highlight key elements
- [ ] Avoid hovering aimlessly
- [ ] If you make a mistake, pause and restart that section

### After Recording:
- [ ] Review full video
- [ ] Check audio quality
- [ ] Trim any dead space at start/end
- [ ] Add captions if possible
- [ ] Export in MP4 format
- [ ] Keep file size under 100MB if possible

---

## 🎥 Alternative: Silent Demo Option

If you prefer a silent video with text overlays:

### Text Overlays to Add:

**Slide 1 (0:00-0:10):**
```
Z402: Privacy-First API Monetization
Built on Zcash × NEAR Intents
```

**Slide 2 (0:20-0:30):**
```
Accept 150+ Tokens
Users Pay: USDC, ETH, SOL, BTC
You Receive: Private ZEC
```

**Slide 3 (0:50-1:10):**
```
Real-World Use Cases:
• AI Inference ($0.001/call)
• Autonomous Agents
• Premium Content
• IoT Payments
```

**Slide 4 (1:40-2:00):**
```
3 Lines of Code
requireX402Payment({
  acceptCrossChain: true
})
```

**Slide 5 (2:20-2:40):**
```
Production-Ready API
✓ Cross-chain swaps
✓ Real-time monitoring
✓ Blockchain verification
```

**Slide 6 (2:45-3:00):**
```
Z402: Making Privacy Accessible
github.com/yourusername/Z402
```

---

## 🎯 Key Points to Emphasize

1. **Privacy**: Shielded ZEC transactions, no KYC/accounts
2. **Cross-Chain**: Accept any token via NEAR Intents
3. **Production-Ready**: Complete implementation, not a prototype
4. **Developer-Friendly**: Simple API, Stripe-like experience
5. **Real Use Cases**: AI, agents, content, IoT - not theoretical

---

## 📊 Backup Talking Points

If you need to fill time or add detail:

- "Z402 is the only complete implementation of Coinbase's X-402 standard"
- "We handle webhook events, signature verification, and automatic retries"
- "Built on TimescaleDB for real-time analytics"
- "HMAC-signed webhooks ensure security"
- "~75 second finality on Zcash testnet"
- "No chargebacks - blockchain finality guarantees payment"
- "Global access - accept payments from anywhere"

---

## 🎬 Video File Naming

Save as: `Z402_Demo_NEAR_Hackathon_2024.mp4`

Target length: 2:45 - 3:00
Maximum length: 3:30
Minimum length: 2:30

---

**Good luck with your recording! 🎉**
