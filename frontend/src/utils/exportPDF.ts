/**
 * exportPDF.ts
 *
 * Generates and downloads a full trip summary PDF.
 * Called from TripDetailsPage via the 3-dot menu → "Export PDF".
 *
 * PDF structure (each section skipped gracefully if data is missing):
 *   1. Header — trip title, destination, dates, duration, travelers
 *   2. Budget summary — total budget, total spent (USD-normalised), remaining
 *   3. Itinerary — one sub-section per day, activities as a table
 *   4. Flights — table of booked/planned flights
 *   5. Hotels — table of booked/planned hotels
 *   6. Expenses — table with date, description, category, original amount
 *   7. Pre-trip checklist — two-column status grid
 *
 * Dependencies (installed Week 6 Day 3):
 *   npm install jspdf jspdf-autotable
 *
 * Reuses:
 *   - convertToUSD   from utils/currency   (budget normalisation)
 *   - formatDate     from pages/TripDetailsPage/helpers (date strings)
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Trip, ItineraryDay, Activity, Flight, Hotel, Expense, ChecklistItem } from '../types';
import { convertToUSD } from './currency';
import { formatDate } from '../pages/TripDetailsPage/helpers';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const BRAND_BLUE  = [37, 99, 235]  as [number, number, number]; // blue-600
const BRAND_GREEN = [22, 163, 74]  as [number, number, number]; // green-600
const BRAND_RED   = [220, 38, 38]  as [number, number, number]; // red-600
const GRAY_800    = [31, 41, 55]   as [number, number, number];
const GRAY_500    = [107, 114, 128] as [number, number, number];
const GRAY_200    = [229, 231, 235] as [number, number, number];
const WHITE       = [255, 255, 255] as [number, number, number];

const PAGE_MARGIN  = 14;   // mm from page edge
const CONTENT_W    = 182;  // usable width: 210 - 2*14

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/** Return doc.internal.pageSize.height so we can detect near-page-bottom. */
function pageHeight(doc: jsPDF): number {
  return (doc.internal.pageSize as { height: number }).height;
}

/** Add a new page if the current Y position is below the threshold. */
function ensureSpace(doc: jsPDF, y: number, needed: number = 20): number {
  if (y + needed > pageHeight(doc) - PAGE_MARGIN) {
    doc.addPage();
    return PAGE_MARGIN + 6;
  }
  return y;
}

/** Draw a solid horizontal rule across the content width. */
function rule(doc: jsPDF, y: number, color: [number, number, number] = GRAY_200): number {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.3);
  doc.line(PAGE_MARGIN, y, PAGE_MARGIN + CONTENT_W, y);
  return y + 4;
}

/** Section heading: bold coloured label above a rule. */
function sectionHeading(doc: jsPDF, y: number, title: string): number {
  y = ensureSpace(doc, y, 16);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_BLUE);
  doc.text(title.toUpperCase(), PAGE_MARGIN, y);
  y += 1;
  return rule(doc, y, BRAND_BLUE);
}

/** Category emoji → plain-text label for PDF (emojis render inconsistently). */
function categoryLabel(cat: string): string {
  const MAP: Record<string, string> = {
    food:          'Food & Drink',
    transport:     'Transport',
    activities:    'Activities',
    shopping:      'Shopping',
    accommodation: 'Accommodation',
    other:         'Other',
  };
  return MAP[cat] ?? cat;
}

/** Activity type → readable label. */
function activityTypeLabel(type: Activity['type']): string {
  const MAP: Record<Activity['type'], string> = {
    flight:    'Flight',
    hotel:     'Hotel',
    activity:  'Activity',
    dining:    'Dining',
    transport: 'Transport',
  };
  return MAP[type] ?? type;
}

// ─────────────────────────────────────────────────────────────
// SECTION BUILDERS
// ─────────────────────────────────────────────────────────────

/**
 * Section 1 — Header block
 * Large trip title + destination + dates + traveler count.
 */
function addHeader(doc: jsPDF, trip: Trip): number {
  let y = PAGE_MARGIN;

  // TripMind brand label
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY_500);
  doc.text('Generated by TripMind', PAGE_MARGIN, y);

  const today = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(today, PAGE_MARGIN + CONTENT_W, y, { align: 'right' });

  y += 7;

  // Destination (big)
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GRAY_800);
  doc.text(trip.destination, PAGE_MARGIN, y);
  y += 8;

  // Date range + duration
  const dateRange =
    trip.start_date && trip.end_date
      ? `${formatDate(trip.start_date)} – ${formatDate(trip.end_date)}`
      : 'Dates not set';
  const duration = trip.duration_days ? `${trip.duration_days} day${trip.duration_days !== 1 ? 's' : ''}` : '';

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY_500);
  doc.text(`${dateRange}${duration ? '  ·  ' + duration : ''}`, PAGE_MARGIN, y);
  y += 5;

  // Travelers
  if (trip.travelers_count > 0) {
    doc.text(`${trip.travelers_count} traveler${trip.travelers_count !== 1 ? 's' : ''}`, PAGE_MARGIN, y);
    y += 5;
  }

  y += 2;
  return rule(doc, y, GRAY_200) + 2;
}

/**
 * Section 2 — Budget summary
 * Shows budget, total spent (USD-normalised), and remaining.
 * Skipped if no budget and no expenses.
 */
function addBudgetSummary(doc: jsPDF, trip: Trip, startY: number): number {
  const budget   = trip.budget ?? 0;
  const expenses = trip.trip_metadata?.expenses ?? [];

  if (budget === 0 && expenses.length === 0) return startY;

  let y = sectionHeading(doc, startY, '💰  Budget Summary');

  const totalSpentUSD = expenses.reduce(
    (sum, e) => sum + convertToUSD(e.amount, e.currency),
    0
  );
  const remaining = budget > 0 ? budget - totalSpentUSD : null;

  const rows: [string, string][] = [];
  if (budget > 0) {
    rows.push(['Total Budget (USD)', `$${budget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);
  }
  if (expenses.length > 0) {
    const hasMixed = expenses.some((e) => e.currency !== 'USD');
    rows.push([
      hasMixed ? 'Total Spent (USD equiv.)' : 'Total Spent (USD)',
      `$${totalSpentUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    ]);
  }
  if (remaining !== null) {
    const overBudget = remaining < 0;
    rows.push([
      overBudget ? 'Over Budget by' : 'Remaining',
      `$${Math.abs(remaining).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    ]);
  }

  autoTable(doc, {
    startY: y,
    body: rows,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: { top: 2, bottom: 2, left: 0, right: 4 },
      textColor: GRAY_800,
    },
    columnStyles: {
      0: { fontStyle: 'normal', textColor: GRAY_500, cellWidth: 80 },
      1: { fontStyle: 'bold',   halign: 'left' },
    },
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
  });

  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
}

/**
 * Section 3 — Itinerary
 * One sub-heading per day, activities rendered as a table.
 * Skipped if no itinerary has been generated.
 */
function addItinerary(doc: jsPDF, trip: Trip, startY: number): number {
  const itinerary: ItineraryDay[] = trip.trip_metadata?.itinerary ?? [];
  if (itinerary.length === 0) return startY;

  let y = sectionHeading(doc, startY, '📅  Itinerary');

  for (const day of itinerary) {
    y = ensureSpace(doc, y, 24);

    // Day heading
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GRAY_800);
    const dayLabel = `Day ${day.day}${day.date ? '  ·  ' + formatDate(day.date) : ''}${day.title ? '  —  ' + day.title : ''}`;
    doc.text(dayLabel, PAGE_MARGIN, y);
    y += 5;

    if (day.activities.length === 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...GRAY_500);
      doc.text('No activities planned for this day.', PAGE_MARGIN + 2, y);
      y += 6;
      continue;
    }

    const rows = day.activities.map((act) => [
      act.time ?? '—',
      activityTypeLabel(act.type),
      act.title,
      act.location ?? '—',
      act.description ?? '',
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Time', 'Type', 'Activity', 'Location', 'Notes']],
      body: rows,
      theme: 'striped',
      headStyles: {
        fillColor: BRAND_BLUE,
        textColor: WHITE,
        fontSize: 8,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: GRAY_800,
      },
      alternateRowStyles: {
        fillColor: [239, 246, 255] as [number, number, number], // blue-50
      },
      columnStyles: {
        0: { cellWidth: 18 },  // Time
        1: { cellWidth: 22 },  // Type
        2: { cellWidth: 45 },  // Activity
        3: { cellWidth: 40 },  // Location
        4: { cellWidth: 'auto' as unknown as number }, // Notes fills remaining
      },
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
  }

  return y;
}

/**
 * Section 4 — Flights
 * Skipped if no flights have been added.
 */
function addFlights(doc: jsPDF, trip: Trip, startY: number): number {
  const flights: Flight[] = trip.trip_metadata?.flights ?? [];
  if (flights.length === 0) return startY;

  let y = sectionHeading(doc, startY, '✈️  Flights');

  const rows = flights.map((f) => [
    f.flight_number,
    f.airline,
    `${f.from} → ${f.to}`,
    f.departure ? new Date(f.departure).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—',
    f.arrival   ? new Date(f.arrival).toLocaleString('en-US',   { dateStyle: 'medium', timeStyle: 'short' }) : '—',
    f.status.charAt(0).toUpperCase() + f.status.slice(1),
    f.notes ?? '',
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Flight #', 'Airline', 'Route', 'Departure', 'Arrival', 'Status', 'Notes']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: BRAND_BLUE, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: GRAY_800 },
    alternateRowStyles: { fillColor: [239, 246, 255] as [number, number, number] },
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
  });

  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
}

/**
 * Section 5 — Hotels
 * Skipped if no hotels have been added.
 */
function addHotels(doc: jsPDF, trip: Trip, startY: number): number {
  const hotels: Hotel[] = trip.trip_metadata?.hotels ?? [];
  if (hotels.length === 0) return startY;

  let y = sectionHeading(doc, startY, '🏨  Hotels');

  const rows = hotels.map((h) => [
    h.name,
    h.location,
    formatDate(h.check_in),
    formatDate(h.check_out),
    h.status.charAt(0).toUpperCase() + h.status.slice(1),
    h.notes ?? '',
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Hotel', 'Location', 'Check-in', 'Check-out', 'Status', 'Notes']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: BRAND_BLUE, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: GRAY_800 },
    alternateRowStyles: { fillColor: [239, 246, 255] as [number, number, number] },
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
  });

  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
}

/**
 * Section 6 — Expenses
 * Shows each expense in its original currency.
 * Footer row shows USD-normalised total.
 * Skipped if no expenses have been logged.
 */
function addExpenses(doc: jsPDF, trip: Trip, startY: number): number {
  const expenses: Expense[] = trip.trip_metadata?.expenses ?? [];
  if (expenses.length === 0) return startY;

  let y = sectionHeading(doc, startY, '💸  Expenses');

  const rows = [...expenses]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => [
      formatDate(e.date),
      e.description,
      categoryLabel(e.category),
      `${e.currency} ${e.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    ]);

  const totalUSD = expenses.reduce((sum, e) => sum + convertToUSD(e.amount, e.currency), 0);
  const hasMixed = expenses.some((e) => e.currency !== 'USD');

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Description', 'Category', 'Amount']],
    body: rows,
    foot: [[
      { content: '', colSpan: 2 },
      { content: hasMixed ? 'Total (USD equiv.)' : 'Total (USD)', styles: { fontStyle: 'bold', halign: 'right' } },
      {
        content: `USD ${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        styles: { fontStyle: 'bold' },
      },
    ]],
    theme: 'striped',
    headStyles: { fillColor: BRAND_BLUE,  textColor: WHITE,    fontSize: 8, fontStyle: 'bold' },
    footStyles: { fillColor: GRAY_200,    textColor: GRAY_800, fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: GRAY_800 },
    alternateRowStyles: { fillColor: [239, 246, 255] as [number, number, number] },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 'auto' as unknown as number },
      2: { cellWidth: 36 },
      3: { cellWidth: 34, halign: 'right' },
    },
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
  });

  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
}

/**
 * Section 7 — Pre-trip checklist
 * Shows each item with a ✓ or ✗ status.
 * Skipped if no checklist exists on the trip.
 */
function addChecklist(doc: jsPDF, trip: Trip, startY: number): number {
  const checklist: ChecklistItem[] = trip.trip_metadata?.checklist ?? [];
  if (checklist.length === 0) return startY;

  let y = sectionHeading(doc, startY, '✅  Pre-Trip Checklist');

  const rows = checklist.map((item) => [
    item.checked ? '✓' : '✗',
    item.label,
    item.checked_at
      ? new Date(item.checked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : '',
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Status', 'Item', 'Completed On']],
    body: rows,
    theme: 'plain',
    headStyles: { fillColor: BRAND_BLUE, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9, textColor: GRAY_800 },
    didParseCell: (data) => {
      // Colour the status column: green for checked, red for unchecked
      if (data.column.index === 0 && data.section === 'body') {
        const checked = data.cell.raw === '✓';
        data.cell.styles.textColor = checked ? BRAND_GREEN : BRAND_RED;
        data.cell.styles.fontStyle = 'bold';
      }
    },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' },
      1: { cellWidth: 'auto' as unknown as number },
      2: { cellWidth: 32 },
    },
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
  });

  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
}

/**
 * Footer — add page numbers to every page once the document is built.
 */
function addPageNumbers(doc: jsPDF): void {
  const totalPages = (doc.internal as unknown as { pages: unknown[] }).pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY_500);
    doc.text(
      `Page ${i} of ${totalPages}`,
      PAGE_MARGIN + CONTENT_W,
      pageHeight(doc) - 6,
      { align: 'right' }
    );
  }
}

// ─────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────

/**
 * Build and immediately download a trip summary PDF.
 *
 * Filename format: tripmind-{destination-slug}-{YYYY-MM-DD}.pdf
 * Example:         tripmind-tokyo-japan-2025-08-01.pdf
 *
 * Called from TripDetailsPage 3-dot menu → "Export PDF".
 */
export function exportTripPDF(trip: Trip): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  let y = addHeader(doc, trip);
  y = addBudgetSummary(doc, trip, y);
  y = addItinerary(doc, trip, y);
  y = addFlights(doc, trip, y);
  y = addHotels(doc, trip, y);
  y = addExpenses(doc, trip, y);
  y = addChecklist(doc, trip, y);

  addPageNumbers(doc);

  // Build a URL-safe filename from the destination
  const slug = trip.destination
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const date = new Date().toISOString().split('T')[0];
  doc.save(`tripmind-${slug}-${date}.pdf`);
}