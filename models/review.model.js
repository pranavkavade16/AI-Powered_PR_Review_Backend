const mongoose = require("mongoose");

const IssueSchema = new mongoose.Schema({
  severity: {
    type: String,
    enum: ["critical", "warning", "info"],
    required: true,
  },
  message: { type: String, required: true },
  suggestion: { type: String },
});

const ReviewSchema = new mongoose.Schema(
  {
    prUrl: {
      type: String,
      required: true,
      trim: true,
    },
    owner: { type: String, required: true },
    repo: { type: String, required: true },
    prNumber: { type: String, required: true },

    // The AI review fields
    summary: { type: String, required: true },
    score: { type: Number, min: 1, max: 10, required: true },
    issues: [IssueSchema],
    positives: [String],
    suggestions: [String],

    // PR stats from GitHub
    filesChanged: { type: Number, default: 0 },
    additions: { type: Number, default: 0 },
    deletions: { type: Number, default: 0 },
  },
  {
    timestamps: true, // auto adds createdAt and updatedAt
  },
);

module.exports = mongoose.model("Review", ReviewSchema);
