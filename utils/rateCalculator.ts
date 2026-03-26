/**
 * Shift price-breakdown calculator
 *
 * Day-type rules (based on the calendar date the hour falls on)
 * -------------------------------------------------------------
 * weekday  : Monday – Thursday  (getDay 1-4)
 * fri      : Friday             (getDay 5)
 * sat      : Saturday           (getDay 6)
 * sun      : Sunday             (getDay 0)
 *
 * Each day type has separate rates for day (06:00–18:00) and night (18:00–06:00).
 * The shift is split at midnight, 06:00, and 18:00 so each segment is billed
 * at the correct day-type + slot rate.
 */

// ─── Types & Interfaces ─────────────────────────────────────────────────────

export type DayType = 'weekday' | 'fri' | 'sat' | 'sun';
export type Slot = 'day' | 'night';

export interface RateSlot {
    day: number;
    night: number;
}

export interface RatesConfig {
    pay: Record<DayType, RateSlot>;
    charge: Record<DayType, RateSlot>;
}

export interface ShiftSegment {
    key: string;
    label: string;
    hours: number;
    payRate: number;
    chargeRate: number;
    payAmount: number;
    chargeAmount: number;
}

export interface ShiftBreakdown {
    segments: ShiftSegment[];
    totalHours: number;
    payTotal: number;
    chargeTotal: number;
    numGuards: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const STATIC_RATES: RatesConfig = {
    pay: {
        weekday: { day: 25.0, night: 30.0 },
        fri: { day: 28.0, night: 33.0 },
        sat: { day: 32.0, night: 38.0 },
        sun: { day: 32.0, night: 38.0 },
    },
    charge: {
        weekday: { day: 35.0, night: 42.0 },
        fri: { day: 40.0, night: 47.0 },
        sat: { day: 45.0, night: 52.0 },
        sun: { day: 45.0, night: 52.0 },
    },
};

const SEGMENT_LABELS: Record<string, string> = {
    weekday_day: 'Mon–Thu (Day 06:00–18:00)',
    weekday_night: 'Mon–Thu (Night 18:00–06:00)',
    fri_day: 'Friday (Day 06:00–18:00)',
    fri_night: 'Friday (Night 18:00–06:00)',
    sat_day: 'Saturday (Day 06:00–18:00)',
    sat_night: 'Saturday (Night 18:00–06:00)',
    sun_day: 'Sunday (Day 06:00–18:00)',
    sun_night: 'Sunday (Night 18:00–06:00)',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Return 'sun' | 'weekday' | 'fri' | 'sat' for a Date object */
export function getDayType(date: Date): DayType {
    const d = date.getDay(); // 0=Sun 1=Mon … 5=Fri 6=Sat
    if (d === 0) return 'sun';
    if (d === 5) return 'fri';
    if (d === 6) return 'sat';
    return 'weekday';
}

/** Return 'day' | 'night' for a given hour (0–23) */
export function getSlot(hour: number): Slot {
    return hour >= 6 && hour < 18 ? 'day' : 'night';
}

/**
 * Given a Date cursor `t`, return the next rate-boundary.
 * Splits at 06:00, 18:00, and midnight (calendar-day change).
 */
function nextBoundary(t: Date): Date {
    const h = t.getHours();
    const next = new Date(t);
    next.setSeconds(0, 0);

    if (h < 6) {
        next.setHours(6, 0, 0, 0);
    } else if (h < 18) {
        next.setHours(18, 0, 0, 0);
    } else {
        // 18:00–23:59 → advance to midnight (new calendar day)
        next.setDate(next.getDate() + 1);
        next.setHours(0, 0, 0, 0);
    }

    return next;
}

// ─── Main Export ────────────────────────────────────────────────────────────

/**
 * Compute the pay & charge cost breakdown for a shift.
 *
 * @param startDate  "YYYY-MM-DD"
 * @param startTime  "HH:MM"
 * @param endDate    "YYYY-MM-DD"
 * @param endTime    "HH:MM"
 * @param numGuards  Number of guards (defaults to 1)
 * @param rates      Defaults to STATIC_RATES. Pass API data here later.
 *
 * @returns ShiftBreakdown or null when input is incomplete or shift has no duration.
 */
export function computeShiftBreakdown(
    startDate: string,
    startTime: string,
    endDate: string,
    endTime: string,
    numGuards: number = 1,
    rates: RatesConfig = STATIC_RATES
): ShiftBreakdown | null {
    // ── validation ──────────────────────────────────────────────────────────
    if (!startDate || !startTime || !endDate || !endTime) return null;

    const [sy, sm, sd] = startDate.split('-').map(Number);
    const [sh, smin] = startTime.split(':').map(Number);
    const [ey, em, ed] = endDate.split('-').map(Number);
    const [eh, emin] = endTime.split(':').map(Number);

    const start = new Date(sy, sm - 1, sd, sh, smin, 0, 0);
    const end = new Date(ey, em - 1, ed, eh, emin, 0, 0);

    const durationMs = end.getTime() - start.getTime();
    if (isNaN(durationMs) || durationMs <= 0) return null;

    const guards = Math.max(1, Number(numGuards) || 1);

    // ── walk the shift in "rate-zone" segments ──────────────────────────────
    // accumulated hours per key, preserving insertion order
    const hoursMap = new Map<string, number>();
    const keyOrder: string[] = [];

    let t = new Date(start);

    while (t < end) {
        const boundary = nextBoundary(t);
        const segEnd = boundary < end ? boundary : end;

        const dayType = getDayType(t);
        const slot = getSlot(t.getHours());
        const key = `${dayType}_${slot}`;

        const segHours = (segEnd.getTime() - t.getTime()) / 3_600_000;

        if (!hoursMap.has(key)) {
            hoursMap.set(key, 0);
            keyOrder.push(key);
        }
        hoursMap.set(key, (hoursMap.get(key) || 0) + segHours);

        t = new Date(segEnd);
    }

    // ── build segment rows ─────────────────────────────────────────────────
    let paySubtotalPerGuard = 0;
    let chargeSubtotalPerGuard = 0;
    let totalHours = 0;

    const segments: ShiftSegment[] = keyOrder.map((key) => {
        // Asserting types here because we know the key was built from `${DayType}_${Slot}`
        const [dayTypeStr, slotStr] = key.split('_');
        const dayType = dayTypeStr as DayType;
        const slot = slotStr as Slot;

        const hours = Math.round((hoursMap.get(key) || 0) * 100) / 100;

        const payRate = rates.pay[dayType]?.[slot] ?? 0;
        const chargeRate = rates.charge[dayType]?.[slot] ?? 0;

        const payAmtPerGuard = payRate * hours;
        const chargeAmtPerGuard = chargeRate * hours;

        paySubtotalPerGuard += payAmtPerGuard;
        chargeSubtotalPerGuard += chargeAmtPerGuard;
        totalHours += hours;

        return {
            key,
            label: SEGMENT_LABELS[key] ?? key,
            hours,
            payRate,
            chargeRate,
            payAmount: payAmtPerGuard * guards,
            chargeAmount: chargeAmtPerGuard * guards,
        };
    });

    // ── totals ──────────────────────────────────────────────────────────────
    const payTotal = paySubtotalPerGuard * guards;
    const chargeTotal = chargeSubtotalPerGuard * guards;

    return {
        segments,
        totalHours: Math.round(totalHours * 100) / 100,
        payTotal,
        chargeTotal,
        numGuards: guards,
    };
}