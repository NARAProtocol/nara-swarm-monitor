export function parsePositiveSeconds(raw, name, fallback, minimum = 1) {
  const value = raw === undefined || raw === "" ? fallback : Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`${name} must be an integer of at least ${minimum} seconds`);
  }
  return value;
}

export function decideEpochNotification(previous, status, now, cooldownSeconds) {
  if (!previous) {
    return { notify: status !== "GREEN", force: false, reason: "initial" };
  }
  if (previous.status !== status) {
    return {
      notify: true,
      force: status === "GREEN",
      reason: status === "GREEN" ? "recovered" : "status-change",
    };
  }
  if (status === "GREEN") return { notify: false, force: false, reason: "healthy" };
  const elapsed = now - Number(previous.lastNotifiedAt || 0);
  return {
    notify: elapsed >= cooldownSeconds,
    force: false,
    reason: elapsed >= cooldownSeconds ? "repeat" : "cooldown",
  };
}
