import express from "express";
import { fetchPR } from "../controllers/prController.js";

const router = express.Router();

// POST /api/fetch-pr
// Fetches the code diff from GitHub API for a given PR URL
router.post("/fetch-pr", fetchPR);

export default router;
