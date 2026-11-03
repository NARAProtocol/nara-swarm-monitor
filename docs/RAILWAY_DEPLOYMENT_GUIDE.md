# Deploying NARA Swarm Monitor on Railway

This guide covers a read-only operator deployment of **NARA Swarm Monitor**
with a managed PostgreSQL database on Railway. Hosting time and cost depend on
the selected Railway and RPC plans.

> [!WARNING]
> The monitored v4 core and canonical NARA/USDC pool use real assets in a
> technical live-testing phase. A hosted monitor is not evidence of public
> product availability, production readiness, safety, legal approval, or
> availability in any jurisdiction. Its alerts and wallet reports are
> operational telemetry, not investment research, trading signals,
> personalized advice, or recommendations to transact.

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
COMMANDER_SQL_URL=http://127.0.0.1:8080/sql
API_PORT=8080
V4_START_BLOCK=53410681
V4_EPOCH_LENGTH_SECONDS=900
V4_MAX_EPOCH_BACKLOG=1
V4_EPOCH_CRITICAL_BACKLOG=5
EPOCH_SENTINEL_INTERVAL_SECONDS=300
EPOCH_ALERT_REPEAT_SECONDS=1800
FAILED_TX_SCAN_MAX_BLOCKS=512
V4_NARA_TOKEN=0x91FB78A9F46B67f54BbD4489941d19666b2fAe0f
V4_ENGINE=0xd93FbEbFb33FAc9288125074625D4750573B1a53
V4_LIQUIDITY_GROWTH_HOOK=0x201fBD2839bEc513040024b37dAe97B401E96acC
V4_LIQUIDITY_GROWTH_VAULT=0xe63b4BaAF873FC57859bfe13e0e8cFccAaB6AddE
V4_LIQUIDITY_COMPOUNDER=0x01EF9de9f4e9197F2A3944b5B34A90eA2f558b64
V4_UNISWAP_V4_POOL_ID=0x3bd8b60dc9eb37f00afa57585232e4018ae661b2dbd5318562183a67a07ac758
V4_TREASURY_ADDRESS=0xe320C281c86079eA85f2Bc67864E873A61D551E3
V4_FINAL_ADMIN=0xe320C281c86079eA85f2Bc67864E873A61D551E3
DEPLOYER_ADDRESS=0x82fd7b79D4cfd8Fc5B4B9eE57CfD2E2592cE7805

# V5 Modular Stack Extensions
V5_PRINCIPAL_LEDGER=0x7F866a9fbe41D54F0d9C35b6892fcf27Ea766DB2
V5_REWARD_LEDGER=0xC72671D9438388638547444524F6542b650C9264
V5_EMISSION_RESERVE=0xf932178F24b0813C82093985F0Af6Db27Ae25930
V5_FORGE=0x84225aBaBbE7433c736925f9c0ba6f6CcB51551a
V5_POSITION_SALE=0x04Ac83045d26259D46400Ce6beb9bBd0641df225
V5_POOL_ORACLE=0xA2151333BDD77DF2E058f9cE274F63D2e48A5553
V5_TREASURY_RANGE_MANAGER=0xa72557fcBE56B3eC739dF3aF7b6b893B6Db4D288

# Notifications & Telegram Bot Console
NOTIFY_CHANNELS=telegram,console
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
TELEGRAM_CHAT_ID=YOUR_CHAT_ID
LARGE_BUY_ALERT_ENABLED=false
LARGE_BUY_ALERT_MIN_USDC=100
LARGE_BUY_ALERT_START_BLOCK=FIRST_FUTURE_BASE_BLOCK_AT_ACTIVATION
LARGE_BUY_ALERT_POLL_SECONDS=10
LARGE_BUY_ALERT_CONFIRMATIONS=2
LARGE_BUY_ALERT_MAX_BLOCKS_PER_SCAN=500
V4_USDC_TOKEN=VERIFIED_BASE_USDC_ADDRESS
NOTIFY_YELLOW=true
MONITOR_CYCLE_INTERVAL_SECONDS=600
```

*(Note: Replace `BASE_RPC_URL`, `TELEGRAM_BOT_TOKEN`, and `TELEGRAM_CHAT_ID` with your own credentials). Keep `DATABASE_SCHEMA` dedicated to this monitor; do not reuse a schema owned by another Ponder app.*

**The treasury Range Ranger is retired.** Do not set `TREASURY_PRIVATE_KEY` in
any environment, and delete every obsolete `RANGE_RANGER_*` variable from the
service. `npm run start` refuses to start while `TREASURY_PRIVATE_KEY` is set or
`RANGE_RANGER_AUTO_EXECUTE` is enabled, so remove them from the Railway
variables before deploying this version. See `docs/ENVIRONMENT_VARIABLES.md`.

The large-buy watcher reads only the canonical Hook's `PoolFeeTaken` event. It
requires the verified pool ID and USDC address, persists a block cursor and
delivery records in Postgres, retries failed sends, and waits two Base blocks
before notifying. Set `LARGE_BUY_ALERT_START_BLOCK` to the first future block
when enabling it so historical buys cannot generate Telegram alerts. Keep
`LARGE_BUY_ALERT_ENABLED=false` until the pool, currencies, Telegram
destination, and future activation block are all verified. This operator alert
is not a trading signal.

For an existing production schema, a runtime-only deployment may set
`PONDER_EXPERIMENTAL_DB=platform` only after confirming that
`ponder.config.ts`, `ponder.schema.ts`, and indexing handlers are unchanged.
In the pinned Ponder version this permits normal crash recovery across a new
build ID. Never use it to force a schema or indexing-handler migration; use a
new dedicated schema and reviewed backfill plan for those changes.

The core profile intentionally leaves `V4_POSITION_NFT` and every other
deferred surface unset until a verified integration-ready manifest and
downstream handoff explicitly enable that surface.

#### Step 4: Link Telegram Bot
1. Open Telegram and search for your bot username (or click your bot's link).
2. Tap **Start** (or send `/start`).
3. The bot registers the native **Menu** button (`/wallet`, `/health`,
   `/whales`, `/cliffs`, `/status`, `/contracts`, `/ping`) and routes operator
   alerts while the configured service is running.

#### Step 5: Configure Controlled Network Access (Optional)
1. Go to the **"Settings"** tab of the `nara-swarm-monitor` service on Railway.
2. Under **"Networking"**, click **"Generate Domain"**.
3. Treat the generated HTTPS endpoint as operator infrastructure. Before
   exposing GraphQL or REST outside the operator boundary, complete a separate
   access-control, data-exposure, security, and communications review.

---

### 🔍 How to Verify It's Running
1. Click the **"Deployments"** tab on Railway and open **"View Logs"**.
2. You will see:
   * **Ponder Indexer:** Syncing events and live blocks on Base from block `53410681`.
   * **Telegram Console:** `🤖 Telegram bot command listener started with Menu registered...`
   * **Epoch Sentinel:** Reading Base independently every 5 minutes (`300s`), warning at backlog 2 and paging at backlog 5.
   * **Autonomous Swarm Scheduler:** Running the broader 5-step diagnostic cycle every 10 minutes (`600s`).
   * **Range Ranger:** `🏹 Range Ranger is retired and is not started`. No Range Ranger process runs.
