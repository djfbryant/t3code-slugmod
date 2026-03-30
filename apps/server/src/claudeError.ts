export function normalizeClaudeErrorMessage(message: string): string {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  if (
    lower.includes("rate limit reached") ||
    lower.includes("rate limit exceeded") ||
    lower.includes("too many requests") ||
    lower.includes("status code 429") ||
    lower.includes("http 429") ||
    lower.includes("api error: rate limit")
  ) {
    return [
      "Claude SDK reported a rate limit from Anthropic.",
      "Your plan usage meter can still look low if this session is authenticated to a different workspace/account,",
      "or if the SDK hit a separate request bucket.",
      "Retry later or run `claude auth status` to confirm the active Claude account.",
    ].join(" ");
  }

  return trimmed;
}
