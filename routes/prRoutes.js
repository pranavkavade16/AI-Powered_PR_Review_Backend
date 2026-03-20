const express = require("express");
const { fetchPR } = require("../controllers/prController.js");

const router = express.Router();

// POST /api/fetch-pr
// Fetches the code diff from GitHub API for a given PR URL
router.post("/fetch-pr", fetchPR);

module.exports = router;