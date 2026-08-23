/* ============================================================================
   Wonderland Escrow — net sheet fee schedule.

   ⚠️  EVERY NUMBER IN THIS FILE IS A PLACEHOLDER BASED ON TYPICAL SOUTHERN
   CALIFORNIA PRACTICE. Replace them with Wonderland's actual published escrow
   fee schedule and your title underwriter's current rate card before launch.
   This is the ONLY file that needs editing to make the calculator accurate —
   net-sheet.js contains no hard-coded dollar amounts.
   ========================================================================== */

export const SCHEDULE = {
  /* ---- Wonderland escrow fee ----
     Common SoCal structure: a base fee plus a rate per $1,000 of price.
     Split 50/50 between buyer and seller unless the contract says otherwise. */
  escrow: {
    base: 250,
    perThousand: 2.0,
    minimum: 795,
    label: 'Escrow fee',
  },

  /* ---- Title insurance ----
     CLTA owner's policy is customarily paid by the SELLER in Southern California.
     ALTA lender's policy is customarily paid by the BUYER.
     Real rate cards are banded tables; this is a base + marginal rate approximation. */
  titleOwner: { base: 1100, upTo: 300000, perThousandOver: 2.2, label: "Owner's title policy (CLTA)" },
  titleLender: { base: 550, upTo: 300000, perThousandOver: 0.9, label: "Lender's title policy (ALTA)" },

  /* ---- Transfer taxes ----
     County documentary transfer tax is $1.10 per $1,000 statewide.
     City transfer taxes vary enormously and change by ballot measure —
     have counsel confirm these before launch. */
  countyTransferPerThousand: 1.1,
  cityTransferTax: {
    'none':          { label: 'No city transfer tax', perThousand: 0 },
    'los-angeles':   { label: 'City of Los Angeles', perThousand: 4.5 },
    'santa-monica':  { label: 'Santa Monica', perThousand: 6.0 },
    'culver-city':   { label: 'Culver City', perThousand: 4.5 },
    'pomona':        { label: 'Pomona', perThousand: 2.2 },
    'redondo-beach': { label: 'Redondo Beach', perThousand: 2.2 },
  },

  /* ---- Seller line items (flat estimates) ---- */
  sellerFlat: {
    recording:        { amount: 95,  label: 'Recording &amp; reconveyance fees' },
    nhd:              { amount: 125, label: 'Natural hazard disclosure report' },
    payoffDemand:     { amount: 175, label: 'Loan payoff demand &amp; subordination' },
    wireCourier:      { amount: 150, label: 'Wire, courier &amp; notary' },
    countyTaxCert:    { amount: 75,  label: 'County tax certificate' },
  },

  /* ---- Buyer line items (flat estimates) ---- */
  buyerFlat: {
    recording:     { amount: 125,  label: 'Recording fees' },
    appraisal:     { amount: 750,  label: 'Appraisal' },
    creditReport:  { amount: 75,   label: 'Credit report' },
    underwriting:  { amount: 1095, label: 'Lender underwriting &amp; processing' },
    taxService:    { amount: 85,   label: 'Tax service contract' },
    floodCert:     { amount: 25,   label: 'Flood certification' },
    wireCourier:   { amount: 150,  label: 'Wire, courier &amp; notary' },
  },

  /* ---- Defaults the user can override in the form ---- */
  defaults: {
    listingCommissionPct: 2.5,
    sellingCommissionPct: 2.5,
    homeWarranty: 650,
    termite: 0,
    hoaDocs: 0,
    annualPropertyTaxRate: 1.25,     // % of price, CA Prop 13 baseline plus typical assessments
    downPaymentPct: 20,
    interestRatePct: 6.5,
    originationPct: 1.0,
    hazardInsuranceAnnual: 1800,
    impoundMonths: 2,
  },

  /* ---- The disclaimer that must appear on screen and on every PDF ---- */
  disclaimer:
    'This is a good-faith estimate only, prepared for planning purposes. It is not a ' +
    'commitment, a guarantee, or a substitute for a closing statement. Actual figures depend ' +
    'on the executed purchase agreement, your lender, your title underwriter, payoff demands, ' +
    'the recording date, and county and city taxes in effect at closing. Wonderland Escrow, ' +
    'Inc. does not provide legal, tax, or accounting advice.',
};

/* Escrow fee for one side of the transaction. */
export function escrowFee(price) {
  const s = SCHEDULE.escrow;
  const full = s.base + (price / 1000) * s.perThousand;
  return Math.max(full, s.minimum) / 2;
}

/* Banded base + marginal rate, used for both title policies. */
export function titlePremium(price, band) {
  if (price <= 0) return 0;
  if (price <= band.upTo) return band.base;
  return band.base + ((price - band.upTo) / 1000) * band.perThousandOver;
}

export function countyTransferTax(price) {
  return (price / 1000) * SCHEDULE.countyTransferPerThousand;
}

export function cityTransferTax(price, key) {
  const city = SCHEDULE.cityTransferTax[key] || SCHEDULE.cityTransferTax.none;
  return (price / 1000) * city.perThousand;
}

/* Property tax proration.
   California's fiscal year runs 1 July – 30 June. The seller owes tax through the day
   before closing; the buyer owes it from the closing date forward. */
export function taxProration(annualTax, closingDate) {
  if (!annualTax || !closingDate) return { sellerDays: 0, sellerAmount: 0, buyerDays: 0, buyerAmount: 0 };
  const d = new Date(closingDate + 'T00:00:00');
  const fiscalStart = new Date(d.getFullYear(), 6, 1);
  if (d < fiscalStart) fiscalStart.setFullYear(d.getFullYear() - 1);
  const fiscalEnd = new Date(fiscalStart.getFullYear() + 1, 5, 30);
  const dayMs = 86400000;
  const totalDays = Math.round((fiscalEnd - fiscalStart) / dayMs) + 1;
  const sellerDays = Math.max(0, Math.round((d - fiscalStart) / dayMs));
  const perDay = annualTax / totalDays;
  return {
    sellerDays,
    sellerAmount: sellerDays * perDay,
    buyerDays: totalDays - sellerDays,
    buyerAmount: (totalDays - sellerDays) * perDay,
  };
}
