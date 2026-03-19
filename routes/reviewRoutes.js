const express = require("express");
const { reviewCode } = require("../controllers/reviewController.js");

const router = express.Router();

// POST /api/review
// Sends the PR diff to Groq LLM and returns structured AI review
router.post("/review", reviewCode);

export default router;
