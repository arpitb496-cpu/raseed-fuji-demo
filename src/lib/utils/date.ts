/**
 * Unambiguous Date Formatter for Raseed Protocol.
 * Standardizes dates across dashboard, payment pages, and PDF generation
 * into an unambiguous format (e.g. "11 Oct 2026" / "11 अक्तू॰ 2026")
 * to eliminate DD/MM/YYYY vs MM/DD/YYYY confusion.
 */
export function formatUnambiguousDate(
  dateInput: Date | string | number,
  locale: "en" | "hi" | string = "en"
): string {
  const d = typeof dateInput === "object" ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return "";

  if (locale === "hi") {
    return d.toLocaleDateString("hi-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
