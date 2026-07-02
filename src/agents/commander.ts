import {
  buildCommanderReport,
  type CommanderReport,
} from "./reportBuilder";
import type {
  CommanderInputs,
  CommanderRow,
} from "./evidence";

export const COMMANDER_VIEW_NAMES = [
  "open_alerts",
  "critical_alerts",
  "protocol_risk_summary",
  "wallet_risk_ranking",
  "wallet_conviction_ranking",
  "wallet_position_summary",
  "wallet_unlock_risk",
  "position_current_state",
  "unlock_cliffs_24h",
  "unlock_cliffs_7d",
  "admin_alert_summary",
  "treasury_alert_summary",
  "router_alert_summary",
  "failed_tx_recent",
  "failed_tx_admin_risk",
  "failed_tx_spikes",
  "failed_tx_alert_summary",
] as const;

export type CommanderViewName = (typeof COMMANDER_VIEW_NAMES)[number];

export type CommanderReader = {
  readView(viewName: CommanderViewName, limit: number): Promise<CommanderRow[]>;
};

const DEFAULT_LIMITS: Record<CommanderViewName, number> = {
  open_alerts: 100,
  critical_alerts: 50,
  protocol_risk_summary: 1,
  wallet_risk_ranking: 25,
  wallet_conviction_ranking: 25,
  wallet_position_summary: 50,
  wallet_unlock_risk: 50,
  position_current_state: 50,
  unlock_cliffs_24h: 50,
  unlock_cliffs_7d: 50,
  admin_alert_summary: 50,
  treasury_alert_summary: 50,
  router_alert_summary: 50,
  failed_tx_recent: 50,
  failed_tx_admin_risk: 50,
  failed_tx_spikes: 50,
  failed_tx_alert_summary: 50,
};

export async function readCommanderInputs(reader: CommanderReader): Promise<CommanderInputs> {
  const entries = await Promise.all(
    COMMANDER_VIEW_NAMES.map(async (viewName) => [
      viewName,
      await reader.readView(viewName, DEFAULT_LIMITS[viewName]),
    ] as const),
  );

  return Object.fromEntries(entries) as CommanderInputs;
}

export async function generateCommanderReport(
  reader: CommanderReader,
  options: { chainId?: number; createdAt?: number } = {},
): Promise<CommanderReport> {
  const inputs = await readCommanderInputs(reader);
  return buildCommanderReport(inputs, options);
}

