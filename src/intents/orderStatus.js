import { log } from "../utils/logger.js";

export async function getOrderStatus(orderId) {
  if (!orderId || typeof orderId !== "string") {
    throw new Error("getOrderStatus: orderId must be a non-empty string");
  }
  const statuses = ["Processing", "Packed", "Shipped", "Out for delivery", "Delivered", "Delayed"];
  const idx = Math.abs(hash(orderId)) % statuses.length;
  let eta = idx + 1;
  if(statuses[idx]=="Delivered"){
    eta = 0;
  }
  const result = {
    orderId,
    status: statuses[idx],
    etaDays: eta,
    lastUpdate: new Date().toISOString()
  };
  log.info("Order status lookup", result);
  return result;
}

function hash(s) {
  return [...s].reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
}