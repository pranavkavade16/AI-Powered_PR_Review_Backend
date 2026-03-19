import Groq from "groq-sdk";
import { asyncHandler } from "../middleware/errorHandler.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Build the prompt from files array ──
const buildPrompt = (files) => {
  const fileSummaries = files
    .map(
      (f) =>
        `File: ${f.filename} (${f.status}, +${f.additions} -${f.deletions})\n\n${f.patch}`,
    )
    .join("\n\n---\n\n");

  return `Review the following code diff from a Pull Request. Analyze each file carefully.

${fileSummaries}

Return ONLY a valid JSON object with this exact structure — no extra text, no markdown, no explanation:
{
  "summary": "2-3 sentence overview of what this PR does",
  "score": 7,
  "issues": [
    {
      "severity": "critical",
      "message": "Clear description of the issue",
      "suggestion": "How to fix it"
    }
  ],
  "positives": ["What was done well"],
  "suggestions": ["General improvement tips"]
}

Severity levels:
- critical: bugs, security issues, breaking changes, missing error handling
- warning: code smell, missing tests, performance issues, bad naming
- info: style issues, minor improvements, best practice suggestions

Score guide: 1-3 (major issues), 4-6 (some issues), 7-8 (good with minor issues), 9-10 (excellent)`;
};

// ── Parse LLM response safely ──
const parseReviewJSON = (text) => {
  // Strategy 1: direct parse
  try {
    return JSON.parse(text);
  } catch {
    /* continue */
  }

  // Strategy 2: extract JSON from markdown code block
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      /* continue */
    }
  }

  // Strategy 3: find first { ... } block
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      /* continue */
    }
  }

  return null;
};

// ── Validate and sanitize the parsed review ──
const sanitizeReview = (raw) => {
  return {
    summary:
      typeof raw.summary === "string" ? raw.summary : "No summary provided",
    score:
      typeof raw.score === "number"
        ? Math.min(10, Math.max(1, Math.round(raw.score)))
        : 5,
    issues: Array.isArray(raw.issues)
      ? raw.issues.map((i) => ({
          severity: ["critical", "warning", "info"].includes(i.severity)
            ? i.severity
            : "info",
          message: typeof i.message === "string" ? i.message : "Issue detected",
          suggestion: typeof i.suggestion === "string" ? i.suggestion : "",
        }))
      : [],
    positives: Array.isArray(raw.positives)
      ? raw.positives.filter((p) => typeof p === "string")
      : [],
    suggestions: Array.isArray(raw.suggestions)
      ? raw.suggestions.filter((s) => typeof s === "string")
      : [],
  };
};

// ── POST /api/review ──
// Body: { files: [...], prUrl: "..." }
// Returns: { review: { summary, score, issues, positives, suggestions } }

export const reviewCode = asyncHandler(async (req, res) => {
  const { files, prUrl } = req.body;

  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: "files array is required" });
  }

  // Filter out files with no patch (binary files etc.)
  const reviewableFiles = files.filter(
    (f) => f.patch && f.patch !== "Binary file or no diff available",
  );

  if (reviewableFiles.length === 0) {
    return res
      .status(400)
      .json({
        error: "No reviewable files found. PR may contain only binary files.",
      });
  }

  // Truncate very large diffs to stay within token limits
  const truncatedFiles = reviewableFiles.map((f) => ({
    ...f,
    patch:
      f.patch.length > 3000
        ? f.patch.substring(0, 3000) + "\n... (truncated)"
        : f.patch,
  }));

  // Call Groq API
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.3,
    max_tokens: 1500,
    messages: [
      {
        role: "system",
        content:
          "You are an expert senior software engineer specializing in code review. Always respond with ONLY a valid JSON object — no markdown, no extra text, no explanation outside the JSON.",
      },
      {
        role: "user",
        content: buildPrompt(truncatedFiles),
      },
    ],
  });

  const rawText = completion.choices[0]?.message?.content || "";

  // Parse the response
  const parsed = parseReviewJSON(rawText);

  if (!parsed) {
    console.error("Failed to parse LLM response:", rawText);
    return res
      .status(500)
      .json({ error: "AI returned an invalid response. Please try again." });
  }

  const review = sanitizeReview(parsed);

  res.json({ review });
});
