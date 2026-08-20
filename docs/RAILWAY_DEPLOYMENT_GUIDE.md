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
BASE_RPC_URL=https://mainnet.base.org
V4_START_BLOCK=49719008
V4_EPOCH_LENGTH_SECONDS=900
V4_MAX_EPOCH_BACKLOG=8
V4_NARA_TOKEN=0xB6333F5D4cEd8dffA80F3F13697D6aA3BB3f19c1
V4_ENGINE=0x98ab6406D6B548F37dEF7110961bb45A399e5aFC
V4_LIQUIDITY_GROWTH_HOOK=0x59AEf9799DEA01A7FB7dA73BEA10dfB08858A088
V4_LIQUIDITY_GROWTH_VAULT=0xD7f7b44BF65EBa3E90fDe0642687ed22A323084D
V4_LIQUIDITY_COMPOUNDER=0xfeFcc45C0454D022586eaA8a5c51BD25DCe713DF
V4_UNISWAP_V4_POOL_ID=0x83edced1f39e6adf7469cd718eeb409824d948959263408d4cfb6e745c8db464
V4_TREASURY_ADDRESS=0xd65c0e390Dc187A22c52c03816591CC736C0D755
V4_FINAL_ADMIN=0xd65c0e390Dc187A22c52c03816591CC736C0D755
DEPLOYER_ADDRESS=0x1994eeb95013063C79A46e962886a19fFf78F096
NOTIFICATION_CHANNELS=console
```

*(Note: If you have an Alchemy or QuickNode Base RPC URL, replace `BASE_RPC_URL` with your private key endpoint).*

#### Step 4: Generate Public Domain (Optional — For API Access)
1. Go to the **"Settings"** tab of the `nara-swarm-monitor` service.
2. Under **"Networking"**, click **"Generate Domain"**.
3. You now have a live HTTPS endpoint (e.g. `https://nara-swarm-monitor-production.up.railway.app`) serving live GraphQL and REST queries!

---

### 🔍 How to Verify It's Running
1. Click the **"Deployments"** tab on Railway and open **"View Logs"**.
2. You will see Ponder syncing blocks on Base from block `49719008`:
   ```text
   [Ponder] Syncing historical events from block 49719008...
   [Ponder] Indexed NARAToken, NARAEngine, NARALiquidityGrowthHook
   [Ponder] Real-time indexing active on Base mainnet (chainId: 8453)
   ```
