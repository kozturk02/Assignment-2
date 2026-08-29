import { calculateQuote } from './calculateQuote';
import { LHC_STATEMENT } from './pricingConfig';

function formatMoney(amount) {
  return `$${amount.toFixed(2)}`;
}

function formatPercent(value) {
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

function QuoteModal({ record, onClose }) {
  const quote = calculateQuote(record);
  const hasDiscount = quote.discountAmount > 0;
  const headerLabel = quote.isYearly
    ? 'Final estimated yearly premium'
    : 'Final estimated monthly premium';

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h2>Quote details</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close quote details"
          >
            ×
          </button>
        </div>

        <div className="modal-scroll">
          <div className="quote-hero">
            <div className="quote-hero-label">{headerLabel}</div>
            <div className="quote-hero-amount">
              {formatMoney(quote.finalTotal)}
            </div>
          </div>

          <div className="quote-lines">
            <div className="quote-line">
              <span>Hospital Premium ({quote.hospitalCoverLevel} Cover)</span>
              <span>{formatMoney(quote.hospitalCoverPrice)}</span>
            </div>

            {quote.applicant1LoadingCost > 0 && (
              <div className="quote-line">
                <span>
                  LHC Loading Fee (Base +{' '}
                  {formatPercent(quote.applicant1LoadingPercent)})
                </span>
                <span>{formatMoney(quote.applicant1LoadingCost)}</span>
              </div>
            )}

            {quote.adultCount > 1 && (
              <>
                <div className="quote-line">
                  <span>
                    Spouses&apos; Premium ({quote.hospitalCoverLevel} Cover)
                  </span>
                  <span>{formatMoney(quote.hospitalCoverPrice)}</span>
                </div>

                {quote.applicant2LoadingCost > 0 && (
                  <div className="quote-line">
                    <span>
                      LHC Loading Fee (Base +{' '}
                      {formatPercent(quote.applicant2LoadingPercent)})
                    </span>
                    <span>{formatMoney(quote.applicant2LoadingCost)}</span>
                  </div>
                )}
              </>
            )}

            {quote.loadingTotal > 0 && (
              <>
                <div className="quote-line-tip">
                  Lifetime Health Cover Fee (+2% each year after age 30)
                </div>
                <div className="quote-line-tip">{LHC_STATEMENT}</div>
              </>
            )}

            {(quote.extrasCoverTotal > 0 || quote.familyFee > 0) && (
              <>
                <div className="quote-line-divider" />

                {quote.extrasCoverTotal > 0 && (
                  <div className="quote-line">
                    <span>
                      Extras Premium ({quote.extrasCoverLevel} Cover) [
                      {formatMoney(quote.extrasCoverPrice)} ea]
                    </span>
                    <span>{formatMoney(quote.extrasCoverTotal)}</span>
                  </div>
                )}

                {quote.familyFee > 0 && (
                  <div className="quote-line">
                    <span>Family Premium (children included)</span>
                    <span>{formatMoney(quote.familyFee)}</span>
                  </div>
                )}
              </>
            )}

            <div className="quote-line-divider" />

            <div className="quote-line">
              <span>Estimated Monthly Premium</span>
              <span>{formatMoney(quote.monthlyCost)}</span>
            </div>

            <div className="quote-line">
              <span>
                {hasDiscount ? (
                  <s>Estimated Yearly Premium</s>
                ) : (
                  'Estimated Yearly Premium'
                )}
              </span>
              <span>
                {hasDiscount ? (
                  <s>{formatMoney(quote.yearlyCost)}</s>
                ) : (
                  formatMoney(quote.yearlyCost)
                )}
              </span>
            </div>

            {hasDiscount && (
              <>
                <div className="quote-line">
                  <span>Annual-Payment Discount</span>
                  <span>-{formatMoney(quote.discountAmount)}</span>
                </div>
                <div className="quote-line">
                  <span>
                    <b>NEW Yearly Premium (
                    {formatPercent(quote.discountPercent)} OFF)</b>
                  </span>
                  <span><b>{formatMoney(quote.finalTotal)}</b></span>
                </div>
              </>
            )}

            <div className="quote-line-divider" />

            <div className="quote-line quote-line-final">
              <span>Final total</span>
              <span>{formatMoney(quote.finalTotal)}</span>
            </div>
          </div>

          {quote.warnings.length > 0 && (
            <div className="quote-box quote-box-warning">
              <div className="quote-box-title">⚠ Warnings</div>
              {quote.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default QuoteModal;