const express = require("express");
const {
  getHistory,
  saveReview,
  deleteReview,
  getReviewById,
} = require("../controllers/historyController.js");

const router = express.Router();

// GET  /api/history        → get all saved reviews
// POST /api/history        → save a new review
router.route("/history").get(getHistory).post(saveReview);

// GET    /api/history/:id  → get single review
// DELETE /api/history/:id  → delete a review
router.route("/history/:id").get(getReviewById).delete(deleteReview);

module.exports = router;
