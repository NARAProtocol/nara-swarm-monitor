# 🚀 Deploying NARA Swarm Monitor on Railway (Under 2 Minutes)

This step-by-step guide walks you through deploying **NARA Swarm Monitor** with a managed PostgreSQL database on Railway for **`~$5 / month`**.

---

### 📋 Prerequisites
1. A **Railway Account** ([railway.com](https://railway.com))
2. (Optional but recommended) A Free **Alchemy Base RPC Key** ([alchemy.com](https://alchemy.com))

---

### 🛠️ Step-by-Step 1-Click Deployment

#### Step 1: Create a New Project on Railway
1. Go to [railway.com/dashboard](https://railway.com/dashboard).
2. Click **"+ New Project"**.
3. Select **"Deploy from GitHub repo"**.
4. Choose **`NARAProtocol/nara-swarm-monitor`** (or your repository fork).

#### Step 2: Add PostgreSQL Database
1. In your new Railway project canvas, click **"+ Create"** (or press `Cmd+K` / `Ctrl+K`).
2. Select **"Database"** $\to$ **"Add PostgreSQL"**.
3. Railway will provision a managed PostgreSQL database in ~10 seconds.
4. *Railway automatically connects the `DATABASE_URL` variable to your Swarm Monitor service!*

#### Step 3: Set Environment Variables on the Web Service
Click on your `nara-swarm-monitor` service box, go to the **"Variables"** tab, and click **"RAW Editor"** (or add them individually):

```env
CHAIN_ID=8453
MONITOR_PROFILE=core
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
DATABASE_SCHEMA=nara_v4_monitor
V4_START_BLOCK=49719008
V4_EPOCH_LENGTH_SECONDS=900
V4_MAX_EPOCH_BACKLOG=8
FAILED_TX_SCAN_MAX_BLOCKS=512
V4_NARA_TOKEN=0xB6333F5D4cEd8dffA80F3F13697D6aA3BB3f19c1
V4_ENGINE=0x98ab6406D6B548F37dEF7110961bb45A399e5aFC
V4_LIQUIDITY_GROWTH_HOOK=0x59AEf9799DEA01A7FB7dA73BEA10dfB08858A088
V4_LIQUIDITY_GROWTH_VAULT=0xD7f7b44BF65EBa3E90fDe0642687ed22A323084D
V4_LIQUIDITY_COMPOUNDER=0xfeFcc45C0454D022586eaA8a5c51BD25DCe713DF
V4_UNISWAP_V4_POOL_ID=0x83edced1f39e6adf7469cd718eeb409824d948959263408d4cfb6e745c8db464
V4_TREASURY_ADDRESS=0xfe3A8678A9c729438BB11718bD1391E7Ab491E8e
V4_FINAL_ADMIN=0xd65c0e390Dc187A22c52c03816591CC736C0D755
DEPLOYER_ADDRESS=0xAE9D1667B45558232BeD9d45DcCA53940F892aB5

# Notifications & Telegram Bot Console
NOTIFY_CHANNELS=telegram,console
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
TELEGRAM_CHAT_ID=YOUR_CHAT_ID
NOTIFY_YELLOW=true
MONITOR_CYCLE_INTERVAL_SECONDS=600
```

*(Note: Replace `BASE_RPC_URL`, `TELEGRAM_BOT_TOKEN`, and `TELEGRAM_CHAT_ID` with your own credentials). Keep `DATABASE_SCHEMA` dedicated to this monitor; do not reuse a schema owned by another Ponder app.*

The core profile intentionally leaves `V4_POSITION_NFT` and every other
deferred surface unset until a verified integration-ready manifest and
downstream handoff explicitly enable that surface.

#### Step 4: Link Telegram Bot
1. Open Telegram and search for your bot username (or click your bot's link).
2. Tap **Start** (or send `/start`).
3. The bot will automatically register the native **Menu** button (`/wallet`, `/health`, `/whales`, `/cliffs`, `/status`, `/contracts`, `/ping`) and link your chat for 24/7 security alerts!

#### Step 5: Generate Public Domain (Optional — For GraphQL Explorer & API Access)
1. Go to the **"Settings"** tab of the `nara-swarm-monitor` service on Railway.
2. Under **"Networking"**, click **"Generate Domain"**.
3. You now have a live HTTPS endpoint (e.g. `https://nara-swarm-monitor-production.up.railway.app`) serving live GraphQL (`/graphql`) and REST queries!

---

### 🔍 How to Verify It's Running
1. Click the **"Deployments"** tab on Railway and open **"View Logs"**.
2. You will see:
   * **Ponder Indexer:** Syncing events and live blocks on Base from block `49719008`.
   * **Telegram Console:** `🤖 Telegram bot command listener started with Menu registered...`
   * **Autonomous Swarm Scheduler:** Running the 6-step diagnostic cycle every 10 minutes (`600s`).
