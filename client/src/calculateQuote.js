import {
  HOSPITAL_TIER_PRICES,
  EXTRAS_TIER_PRICES,
  COVER_TYPE_ADULTS,
  FAMILY_UPGRADE_FEE,
  LHC_AGE_THRESHOLD,
  LHC_LOADING_PER_YEAR,
} from './pricingConfig';

function getLhcLoading(age, hospitalHistory, hospitalCoverLevel) {
  if (hospitalCoverLevel === 'None') {
    return { loading: 0, unknown: false };
  }
  if (hospitalHistory === 'Yes') {
    return { loading: 0, unknown: false };
  }
  if (hospitalHistory === 'Not sure') {
    return { loading: 0, unknown: true };
  }
  if (age > LHC_AGE_THRESHOLD) {
    return { loading: (age - LHC_AGE_THRESHOLD) * LHC_LOADING_PER_YEAR, unknown: false };
  }
  return { loading: 0, unknown: false };
}

export function calculateQuote(data) {
  const isSingle = data.cover_type === 'Single';
  const isYearly = data.payment_frequency === 'Yearly';

  const adultCount = COVER_TYPE_ADULTS[data.cover_type] ?? 1;
  const hospitalCoverPrice = HOSPITAL_TIER_PRICES[data.hospital_cover_level] ?? 0;
  const extrasCoverPrice = EXTRAS_TIER_PRICES[data.extras_cover_level] ?? 0;
  const familyFee = data.cover_type === 'Family' ? FAMILY_UPGRADE_FEE : 0;

  let applicant1LoadingCost = 0;
  let applicant2LoadingCost = 0;

  const warnings = [];

  const applicant1 = getLhcLoading(
    Number(data.applicant_1_age),
    data.applicant_1_hospital_history,
    data.hospital_cover_level
  );

  if (applicant1.unknown) {
    warnings.push('Applicant 1: Cover history is unknown — LHC loading has not been applied. This quote may be inaccurate.');
  }

  if (applicant1.loading > 0) {
    applicant1LoadingCost = hospitalCoverPrice + (hospitalCoverPrice * applicant1.loading);
  }

  let applicant2 = null;
  if (!isSingle) {
    applicant2 = getLhcLoading(
      Number(data.applicant_2_age),
      data.applicant_2_hospital_history,
      data.hospital_cover_level
    );
    if (applicant2.unknown) {
      warnings.push( 'Applicant 2: Cover history is unknown — LHC loading has not been applied. This quote may be inaccurate.');
    }
    if (applicant2.loading > 0) {
      applicant2LoadingCost = hospitalCoverPrice + (hospitalCoverPrice * applicant2.loading);
    }
  }

  const hospitalCoverTotal = hospitalCoverPrice * adultCount;
  const extrasCoverTotal = extrasCoverPrice * adultCount;
  const loadingTotal = applicant1LoadingCost + applicant2LoadingCost;

  const monthlyCost = hospitalCoverTotal + extrasCoverTotal + familyFee + loadingTotal;
  const yearlyCost = monthlyCost * 12;

  const discountPercent = isYearly ? Number(data.annual_discount_percent || 0) : 0;
  const discountAmount = isYearly ? yearlyCost * (discountPercent / 100) : 0;

  const finalTotal = isYearly ? (yearlyCost - discountAmount) : monthlyCost;

  return {
    isYearly,
    adultCount,
    hospitalCoverPrice,
    extrasCoverPrice,
    familyFee,
    extrasCoverTotal,
    loadingTotal,
    monthlyCost,
    yearlyCost,
    discountPercent,
    discountAmount,
    finalTotal,
    applicant1LoadingCost,
    applicant2LoadingCost,
    applicant1LoadingPercent: applicant1.loading * 100,
    applicant2LoadingPercent: applicant2 ? applicant2.loading * 100 : null,
    hospitalCoverLevel: data.hospital_cover_level,
    extrasCoverLevel: data.extras_cover_level,
    warnings,
  };
}