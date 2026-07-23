/**
 * Shared expense form constants — currency options and category
 * icon/label pairs. Previously defined only inside ExpenseTracker.tsx;
 * extracted so AddExpenseModal can offer the identical option set
 * without a second, independently-maintained copy drifting out of sync.
 *
 * Colors are NOT here — those come from categoryStyles.ts's
 * getExpenseCategoryStyle(). This module only owns icon + value/label,
 * same split ExpenseTracker.tsx already used internally.
 */
import type { ExpenseCategory } from '../types';

export const CURRENCIES = ['SGD', 'USD', 'JPY', 'EUR', 'GBP', 'THB', 'MYR', 'AUD', 'HKD', 'KRW'];

export const CATEGORIES: {
  value: ExpenseCategory;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: 'food',
    label: 'Food & Drink',
    Icon: ({ className = "w-4 h-4" }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    ),
  },
  {
    value: 'transport',
    label: 'Transport',
    Icon: ({ className = "w-4 h-4" }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  {
    value: 'activities',
    label: 'Activities',
    Icon: ({ className = "w-4 h-4" }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    value: 'shopping',
    label: 'Shopping',
    Icon: ({ className = "w-4 h-4" }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
  },
  {
    value: 'accommodation',
    label: 'Accommodation',
    Icon: ({ className = "w-4 h-4" }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    value: 'other',
    label: 'Other',
    Icon: ({ className = "w-4 h-4" }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
    ),
  },
];
