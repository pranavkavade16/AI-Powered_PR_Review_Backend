const axios = require("axios");
const { asyncHandler } = require("../middleware/errorHandler.js");

// ── Helper: parse GitHub PR URL into parts ──
const parsePRUrl = (url) => {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2], number: match[3] };
};

// ── POST /api/fetch-pr ──
// Body: { prUrl: "https://github.com/owner/repo/pull/123" }
// Returns: { files: [...], meta: { owner, repo, prNumber, filesChanged, additions, deletions } }

const fetchPR = asyncHandler(async (req, res) => {
  const { prUrl } = req.body;

  // Validate input
  if (!prUrl || typeof prUrl !== "string") {
    return res.status(400).json({ error: "prUrl is required" });
  }

  const parsed = parsePRUrl(prUrl.trim());
  if (!parsed) {
    return res.status(400).json({
      error:
        "Invalid GitHub PR URL. Format: https://github.com/owner/repo/pull/123",
    });
  }

  const { owner, repo, number } = parsed;

  // Call GitHub API
  const { data } = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${number}/files`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!data || data.length === 0) {
    return res.status(404).json({
      error: "No files found in this PR. Make sure the PR has code changes.",
    });
  }

  // Extract only what we need — filename, status, patch
  const files = data.map((file) => ({
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    patch: file.patch || "Binary file or no diff available",
  }));

  // Calculate totals
  const totalAdditions = data.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = data.reduce((sum, f) => sum + f.deletions, 0);

  res.json({
    files,
    meta: {
      owner,
      repo,
      prNumber: number,
      filesChanged: files.length,
      additions: totalAdditions,
      deletions: totalDeletions,
    },
  });
});

module.exports = { fetchPR };
