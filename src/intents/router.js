import express from "express";
import { getOrderStatus } from "./orderStatus.js";

const router = express.Router();

router.get("/order-status", async (req, res, next) => {
  try {
    const { orderId } = req.query;
    if (!orderId) return res.status(400).json({ error: "Missing orderId" });
    const data = await getOrderStatus(String(orderId));
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
