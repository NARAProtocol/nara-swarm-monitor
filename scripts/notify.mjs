import {
  buildNotificationReport,
  readLatestAiSummaryForCommander,
  readLatestCommanderReport,
  readRecentNotificationDeliveries,
  routeNotification,
  storeNotificationDeliveries,
} from "./notificationRuntime.mjs";

const commander = await readLatestCommanderReport();
const aiSummary = await readLatestAiSummaryForCommander(commander.id);
const previousDeliveries = await readRecentNotificationDeliveries();
const report = buildNotificationReport(commander, aiSummary);
const deliveries = await routeNotification(report, { previousDeliveries });
await storeNotificationDeliveries(deliveries);

const sent = deliveries.filter((delivery) => delivery.status === "success").length;
const skipped = deliveries.filter((delivery) => delivery.status === "skipped").length;
const failed = deliveries.filter((delivery) => delivery.status === "failed").length;
console.log(`Notification deliveries stored: ${sent} sent, ${skipped} skipped, ${failed} failed.`);

