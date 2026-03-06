export function toUserErrorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (!(error instanceof Error) || !error.message) {
    return fallback;
  }

  const lower = error.message.toLowerCase();
  if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("network request failed")) {
    return "Connection issue. Check your signal and try again.";
  }

  if (lower.includes("abort")) {
    return "Request was cancelled. Please try again.";
  }

  return fallback;
}
