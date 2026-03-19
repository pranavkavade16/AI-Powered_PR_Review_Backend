import express from "express";
import {
  getHistory,
  saveReview,
  deleteReview,
  getReviewById,
} from "../controllers/historyController.js";

const router = express.Router();

// GET  /api/history        → get all saved reviews
// POST /api/history        → save a new review
router.route("/history").get(getHistory).post(saveReview);

// GET    /api/history/:id  → get single review
// DELETE /api/history/:id  → delete a review
router.route("/history/:id").get(getReviewById).delete(deleteReview);

export default router;
