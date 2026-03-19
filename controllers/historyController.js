import Review from "../models/review.model.js";
import { asyncHandler } from "../middleware/errorHandler.js";

// ── GET /api/history ──
// Returns all saved reviews, newest first
export const getHistory = asyncHandler(async (req, res) => {
  const reviews = await Review.find().sort({ createdAt: -1 }).select("-__v");

  res.json({ reviews });
});

// ── POST /api/history ──
// Body: { prUrl, owner, repo, prNumber, review, filesChanged, additions, deletions }
// Saves a review to MongoDB
export const saveReview = asyncHandler(async (req, res) => {
  const {
    prUrl,
    owner,
    repo,
    prNumber,
    review,
    filesChanged,
    additions,
    deletions,
  } = req.body;

  // Validate required fields
  if (!prUrl || !owner || !repo || !prNumber || !review) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Check for duplicate — same PR URL already saved
  const existing = await Review.findOne({ prUrl: prUrl.trim() });
  if (existing) {
    return res.status(409).json({
      error: "This PR has already been saved to history",
      review: existing,
    });
  }

  const saved = await Review.create({
    prUrl: prUrl.trim(),
    owner,
    repo,
    prNumber,
    summary: review.summary,
    score: review.score,
    issues: review.issues || [],
    positives: review.positives || [],
    suggestions: review.suggestions || [],
    filesChanged: filesChanged || 0,
    additions: additions || 0,
    deletions: deletions || 0,
  });

  res.status(201).json({ review: saved });
});

// ── DELETE /api/history/:id ──
// Deletes a single review by MongoDB _id
export const deleteReview = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const review = await Review.findByIdAndDelete(id);

  if (!review) {
    return res.status(404).json({ error: "Review not found" });
  }

  res.json({ message: "Review deleted successfully", id });
});

// ── GET /api/history/:id ──
// Get a single review by id
export const getReviewById = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id).select("-__v");

  if (!review) {
    return res.status(404).json({ error: "Review not found" });
  }

  res.json({ review });
});
