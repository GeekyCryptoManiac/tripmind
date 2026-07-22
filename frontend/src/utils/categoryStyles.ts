/**
 * Shared expense-category color styles.
 *
 * Previously duplicated by hand in ActivityDetailPage.tsx (EXPENSE_CATEGORY_STYLES)
 * and ExpenseTracker.tsx (a second, independently-maintained copy of the same 6
 * categories/colors). Consolidated here as the single source of truth.
 *
 * These are category colors, not status colors — they exist purely to visually
 * distinguish simultaneously-visible expense categories from each other. They do
 * NOT carry warning/success meaning, so they intentionally do not route through
 * status.*, poppy, or sage. Hex values are unchanged from the original Tailwind
 * classes (orange-400/100/700, blue-400/100/700, etc.) — only the raw class
 * strings were replaced with the equivalent explicit hex, and the two copies
 * were merged into one.
 */

export interface CategoryStyle {
  dot: string;
  bg: string;
  text: string;
  label: string;
}

export const EXPENSE_CATEGORY_STYLES: Record<string, CategoryStyle> = {
  food:          { dot: '#FB923C', bg: '#FFEDD5', text: '#C2410C', label: 'Food & Drink' },
  transport:     { dot: '#60A5FA', bg: '#DBEAFE', text: '#1D4ED8', label: 'Transport' },
  activities:    { dot: '#C084FC', bg: '#F3E8FF', text: '#7E22CE', label: 'Activities' },
  shopping:      { dot: '#F472B6', bg: '#FCE7F3', text: '#BE185D', label: 'Shopping' },
  accommodation: { dot: '#4ADE80', bg: '#DCFCE7', text: '#15803D', label: 'Accommodation' },
  other:         { dot: '#9CA3AF', bg: '#F3F4F6', text: '#4B5563', label: 'Other' },
};

// expense.category is string | null — fall back to 'other' config safely
export function getExpenseCategoryStyle(category: string | null): CategoryStyle {
  return EXPENSE_CATEGORY_STYLES[category ?? 'other'] ?? EXPENSE_CATEGORY_STYLES.other;
}
