/**
 * What a figure is replaced with when privacy mode has to *withhold* it rather than blur it
 * (TICKET-PRIV-01's screen-reader companion tables, TICKET-STAT-29's rule, extended across Income by
 * TICKET-PRIV-02).
 *
 * `mm-privacy-blur` is a CSS filter, so it only hides what is painted. A chart's `sr-only` table is
 * clipped to a 1px box and read aloud by assistive tech — a blur there paints nothing and hides
 * nothing — and anything handed to echarts (a tooltip formatter's text, an axis label) is data
 * rather than styled DOM. Both have to drop the amount at build time instead, and they all say the
 * same word so a screen-reader user hears one consistent thing rather than a different euphemism per
 * chart.
 */
export const HIDDEN_AMOUNT_TEXT = 'hidden';
