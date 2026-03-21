const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");
const connectDB = require("./db/db.connect.js");
const prRoutes = require("./routes/prRoutes.js");
const reviewRoutes = require("./routes/reviewRoutes.js");
const historyRoutes = require("./routes/historyRoutes.js");
const { errorHandler } = require("./middleware/errorHandler.js");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── Connect to MongoDB ──
connectDB();

// ── Middleware ──
const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));

// ── Rate limiter — max 30 requests per minute ──
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Too many requests, please slow down." },
});
app.use("/api", limiter);

// ── Routes ──
app.use("/api", prRoutes);
app.use("/api", reviewRoutes);
app.use("/api", historyRoutes);

// ── Health check ──
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "PR Reviewer API is running" });
});

// ── 404 handler ──
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
});

// ── Global error handler ──
app.use(errorHandler);

// ── Start server ──
app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
});
