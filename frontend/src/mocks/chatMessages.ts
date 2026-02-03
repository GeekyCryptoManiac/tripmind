/**
 * Mock Response Generator
 * Returns contextual responses based on what the user asks + their trip data.
 * Keyword matching → relevant travel advice. No backend needed.
 */
import type { TripChatContext } from '../types/chat';

export function generateMockTripResponse(
  userMessage: string,
  context?: TripChatContext
): string {
  const msg = userMessage.toLowerCase();
  const dest = context?.destination || 'your destination';
  const budget = context?.budget;
  const travelers = context?.travelersCount || 1;
  const duration = context?.durationDays;

  // ── Budget / Cost questions ─────────────────────────────────
  if (msg.includes('budget') || msg.includes('cost') || msg.includes('money') || msg.includes('price') || msg.includes('expensive')) {
    if (budget) {
      const perPerson = Math.round(budget / travelers);
      const perDay = duration ? Math.round(budget / duration) : null;
      return [
        `Your total budget for the ${dest} trip is **$${budget.toLocaleString()}**. Here's the breakdown:`,
        '',
        `  • Per person: **$${perPerson.toLocaleString()}**${travelers > 1 ? ` (${travelers} travelers)` : ''}`,
        `  • Per day: ${perDay ? `**$${perDay.toLocaleString()}**` : 'Set your duration to calculate this'}`,
        '',
        `For ${dest}, a typical split looks like:`,
        '  • ✈️ Flights — 25–30%',
        '  • 🏨 Accommodation — 35–40%',
        '  • 🍜 Food & Activities — 20–25%',
        '  • 🚗 Transport & Misc — 10–15%',
      ].join('\n');
    }
    return `You haven't set a budget for this trip yet. I can help you estimate realistic costs for ${dest} — just let me know your accommodation preferences and how many activities you're planning!`;
  }

  // ── Flights ─────────────────────────────────────────────────
  if (msg.includes('flight') || msg.includes('fly') || msg.includes('airplane') || msg.includes('airport')) {
    return [
      `Here are some tips for flights to ${dest}:`,
      '',
      '  • ✈️ Book 2–3 months in advance for the best prices',
      '  • 📅 Tuesdays & Wednesdays are usually cheapest',
      '  • 🗺️ Check nearby airports — sometimes significantly cheaper',
      '  • 🔄 One layover can save 20–30% vs direct flights',
      '',
      'Want me to help you add flight details to your trip plan?',
    ].join('\n');
  }

  // ── Hotels / Accommodation ──────────────────────────────────
  if (msg.includes('hotel') || msg.includes('accommodation') || msg.includes('stay') || msg.includes('lodging') || msg.includes('airbnb')) {
    return [
      `For accommodation in ${dest}:`,
      '',
      '  • 🏨 Hotels — best for convenience & amenities',
      `  • 🏠 Rental apartments — great for longer stays${travelers > 2 ? ' and your group size!' : ''}`,
      '  • 🏕️ Hostels — budget-friendly, good for solo travelers',
      '',
      `💡 For a ${duration ? duration + '-day' : 'multi-day'} trip, mixing accommodation types can save money and add variety.`,
      '',
      'Want me to estimate accommodation costs based on your budget?',
    ].join('\n');
  }

  // ── Itinerary / Planning ────────────────────────────────────
  if (msg.includes('itinerary') || msg.includes('plan') || msg.includes('schedule') || msg.includes('day by day') || msg.includes('agenda')) {
    return [
      `Here's how I'd structure your ${dest} trip:`,
      '',
      '  • 📍 **Day 1** — Arrive, settle in, explore nearby area',
      `  • 🎯 **Days 2–${duration ? duration - 1 : 'N-1'}** — Mix must-see spots with downtime`,
      '  • 🏁 **Last Day** — Revisit favorites, prep for departure',
      '',
      'Planning tips:',
      '  • Leave 1–2 free hours daily for spontaneous discovery',
      '  • Group nearby attractions on the same day',
      '  • Check local events happening during your dates',
      '',
      `Want me to create a detailed day-by-day itinerary for ${dest}?`,
    ].join('\n');
  }

  // ── Weather ─────────────────────────────────────────────────
  if (msg.includes('weather') || msg.includes('climate') || msg.includes('temperature') || msg.includes('rain') || msg.includes('season')) {
    const monthName = context?.startDate
      ? new Date(context.startDate).toLocaleDateString('en-US', { month: 'long' })
      : null;
    return [
      `For ${dest}${monthName ? ` in ${monthName}` : ''}:`,
      '',
      '  • 🌤️ Check a forecast 3–5 days before you depart for accuracy',
      '  • 🧥 Always pack a light rain jacket — just in case',
      '  • 👕 Layers work best for most destinations',
      '',
      `Want packing tips tailored to ${dest}?`,
    ].join('\n');
  }

  // ── Packing ─────────────────────────────────────────────────
  if (msg.includes('pack') || msg.includes('luggage') || msg.includes('bring') || msg.includes('suitcase') || msg.includes('clothing') || msg.includes('what to wear')) {
    return [
      `Smart packing list for your ${dest} trip:`,
      '',
      '  • 👕 Clothing — 3–4 outfits, mix & match pieces',
      '  • 🥾 Shoes — comfy walking shoes + 1 nicer option',
      '  • 💊 Health — prescriptions, basic first aid kit',
      '  • 📄 Documents — passport, visa (if needed), insurance, bookings',
      '  • 🔌 Tech — charger, power adapter, portable battery bank',
      '  • 💳 Money — multiple payment methods + some cash',
      '',
      '💡 Pro tip: Roll clothes instead of folding — saves 20% suitcase space!',
    ].join('\n');
  }

  // ── Visa / Documents ────────────────────────────────────────
  if (msg.includes('visa') || msg.includes('passport') || msg.includes('document') || msg.includes('entry') || msg.includes('requirement')) {
    return [
      `Travel documents checklist for ${dest}:`,
      '',
      '  • 📛 Passport — valid 6+ months beyond your travel dates',
      `  • 📋 Visa — check if ${dest} requires one for your nationality`,
      '  • 🛡️ Travel insurance — highly recommended',
      '  • 📸 Passport photos — some countries require them at entry',
      '',
      '⚠️ Always verify entry requirements on your government\'s official travel advisory before you fly.',
    ].join('\n');
  }

  // ── Default / Catch-all ─────────────────────────────────────
  const defaults = [
    [
      `Great question about your ${dest} trip! Here's what I can help with:`,
      '',
      `  • 📋 Planning your ${duration ? duration + '-day ' : ''}itinerary`,
      '  • ✈️ Flights & accommodation advice',
      '  • 🎯 Activity recommendations',
      `  • 💰 Budget management${budget ? ` ($${budget.toLocaleString()} total)` : ''}`,
      '',
      'What would you like to dive into?',
    ].join('\n'),
    [
      `Let's make your ${dest} adventure amazing! 🌍`,
      '',
      `I'm your trip-specific assistant — ask me anything about this trip.`,
      '',
      'Try asking about:',
      `  • Best things to do in ${dest}`,
      '  • How to split your budget',
      '  • What to pack',
      '  • Local food recommendations',
    ].join('\n'),
  ];

  return defaults[Math.floor(Math.random() * defaults.length)];
}