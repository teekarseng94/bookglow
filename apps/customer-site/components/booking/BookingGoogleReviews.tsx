import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchGoogleReviews, type GoogleReviewsPage } from "../../services/googleReviewsApi";
import {
  GOOGLE_REVIEW_SORTS,
  appendUniqueReviews,
  formatAggregateRating,
  formatReviewCount,
  formatReviewDate,
  isLongComment,
  parseReviewComment,
  reviewerInitials,
  starFillPercents,
  truncateComment,
  type GoogleReview,
  type GoogleReviewSort,
} from "../../services/googleReviewFormat";

/** Official Google mark, used for the required source attribution. */
function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const percents = starFillPercents(rating);
  return (
    <span
      className={`booking-google-stars booking-google-stars--${size}`}
      role="img"
      aria-label={`${rating.toFixed(1)} out of 5 stars`}
    >
      {percents.map((percent, index) => (
        <span key={index} className="booking-google-star">
          <span className="booking-google-star__base">★</span>
          <span className="booking-google-star__fill" style={{ width: `${percent}%` }} aria-hidden>
            ★
          </span>
        </span>
      ))}
    </span>
  );
}

function ReviewCard({ review }: { review: GoogleReview }) {
  const [expanded, setExpanded] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const parsed = useMemo(() => parseReviewComment(review.comment), [review.comment]);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const body = showOriginal && parsed.original ? parsed.original : parsed.text;
  const long = isLongComment(body);
  const visible = long && !expanded ? truncateComment(body) : body;
  const dateLabel = formatReviewDate(review.updateTime || review.createTime);

  return (
    <li className="booking-google-review">
      <div className="booking-google-review__head">
        {review.avatarUrl && !avatarFailed ? (
          <img
            src={review.avatarUrl}
            alt=""
            className="booking-google-review__avatar"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setAvatarFailed(true)}
          />
        ) : (
          <span className="booking-google-review__avatar booking-google-review__avatar--fallback" aria-hidden>
            {reviewerInitials(review.authorName)}
          </span>
        )}
        <div className="booking-google-review__meta">
          <p className="booking-google-review__author">{review.authorName}</p>
          <p className="booking-google-review__submeta">
            {dateLabel ? <span>{dateLabel}</span> : null}
            {dateLabel ? <span aria-hidden>·</span> : null}
            <span>From Google</span>
          </p>
        </div>
      </div>

      {typeof review.rating === "number" ? <Stars rating={review.rating} /> : null}

      {visible ? (
        <>
          <p className="booking-google-review__text">{visible}</p>
          <div className="booking-google-review__actions">
            {long ? (
              <button type="button" onClick={() => setExpanded((value) => !value)}>
                {expanded ? "Show less" : "Read more"}
              </button>
            ) : null}
            {parsed.translated ? (
              parsed.original ? (
                <button type="button" onClick={() => setShowOriginal((value) => !value)}>
                  {showOriginal ? "Show translation" : "Show original"}
                </button>
              ) : (
                <span className="booking-google-review__note">Translated by Google</span>
              )
            ) : null}
          </div>
          {parsed.translated && parsed.original ? (
            <p className="booking-google-review__note">
              {showOriginal ? "Original language" : "Translated by Google"}
            </p>
          ) : null}
        </>
      ) : (
        <p className="booking-google-review__note">Rating only — this reviewer did not leave a comment.</p>
      )}
    </li>
  );
}

function ReviewSkeleton() {
  return (
    <div className="booking-google-skeleton" aria-hidden>
      <div className="booking-google-skeleton__summary" />
      <div className="booking-google-skeleton__line" />
      <div className="booking-google-skeleton__line booking-google-skeleton__line--short" />
    </div>
  );
}

export interface BookingGoogleReviewsProps {
  bookingSlug: string;
  /** Rendered when the integration is off, so the section can disappear cleanly. */
  fallback?: React.ReactNode;
}

export function BookingGoogleReviews({ bookingSlug, fallback = null }: BookingGoogleReviewsProps) {
  const [page, setPage] = useState<GoogleReviewsPage | null>(null);
  const [reviews, setReviews] = useState<GoogleReview[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [sort, setSort] = useState<GoogleReviewSort>("newest");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const requestRef = useRef(0);

  const loadFirstPage = useCallback(
    async (orderBy: GoogleReviewSort) => {
      const requestId = requestRef.current + 1;
      requestRef.current = requestId;
      setLoading(true);
      setFailed(false);
      try {
        const result = await fetchGoogleReviews({ bookingSlug, orderBy });
        if (requestRef.current !== requestId) return;
        setPage(result);
        setReviews(result.state === "ready" ? result.reviews : []);
        setCursor(result.state === "ready" ? result.nextCursor : null);
      } catch {
        if (requestRef.current !== requestId) return;
        setFailed(true);
        setReviews([]);
        setCursor(null);
      } finally {
        if (requestRef.current === requestId) setLoading(false);
      }
    },
    [bookingSlug],
  );

  useEffect(() => {
    if (!bookingSlug) return;
    void loadFirstPage(sort);
  }, [bookingSlug, sort, loadFirstPage]);

  const handleLoadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await fetchGoogleReviews({ bookingSlug, orderBy: sort, cursor });
      if (result.state === "ready") {
        setReviews((current) => appendUniqueReviews(current, result.reviews));
        setCursor(result.nextCursor);
      } else {
        setCursor(null);
      }
    } catch {
      setCursor(null);
      setFailed(true);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading && !page) {
    return (
      <div className="booking-google">
        <ReviewSkeleton />
      </div>
    );
  }

  // Disabled, disconnected, or a slug we could not resolve: show nothing extra.
  if (failed && !page) return <>{fallback}</>;
  if (!page || page.state === "disabled") return <>{fallback}</>;

  if (page.state === "unavailable") {
    return (
      <div className="booking-google">
        <div className="booking-google__header">
          <h3 className="booking-google__title">Google reviews</h3>
          <span className="booking-google__brand">
            <GoogleMark className="booking-google__mark" />
            <span>Google</span>
          </span>
        </div>
        <p className="booking-google__message">
          Google reviews are temporarily unavailable.
          {page.mapsUri ? (
            <>
              {" "}
              <a href={page.mapsUri} target="_blank" rel="noopener noreferrer">
                View them on Google
              </a>
              .
            </>
          ) : null}
        </p>
      </div>
    );
  }

  const ratingLabel = formatAggregateRating(page.averageRating);
  const countLabel = formatReviewCount(page.totalReviewCount);
  const sortOptions = GOOGLE_REVIEW_SORTS.filter((option) => page.supportedSorts.includes(option.id));

  return (
    <div className="booking-google">
      <div className="booking-google__header">
        <h3 className="booking-google__title">Google reviews</h3>
        {/* Only orders Google applies across the whole collection are offered. */}
        {sortOptions.length > 1 ? (
          <label className="booking-google__sort">
            <span className="sr-only">Sort Google reviews</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as GoogleReviewSort)}
              disabled={loading}
            >
              {sortOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="booking-google__summary">
        <div className="booking-google__score">
          {ratingLabel ? (
            <>
              <span className="booking-google__score-value">{ratingLabel}</span>
              <Stars rating={page.averageRating ?? 0} size="lg" />
            </>
          ) : (
            <span className="booking-google__score-value booking-google__score-value--empty">—</span>
          )}
          <span className="booking-google__count">
            {countLabel ? `${countLabel} Google ${page.totalReviewCount === 1 ? "review" : "reviews"}` : "Rating unavailable"}
          </span>
        </div>
        <div className="booking-google__attribution">
          <span className="booking-google__brand">
            <GoogleMark className="booking-google__mark" />
            <span>Reviews from Google</span>
          </span>
          {page.mapsUri ? (
            <a href={page.mapsUri} target="_blank" rel="noopener noreferrer" className="booking-google__link">
              View on Google Maps
            </a>
          ) : null}
        </div>
      </div>

      {page.stale ? (
        <p className="booking-google__message booking-google__message--soft">
          Showing recently saved Google data while Google is unreachable.
        </p>
      ) : null}

      {loading ? (
        <ReviewSkeleton />
      ) : reviews.length === 0 ? (
        <p className="booking-google__message">
          This business has no Google reviews with comments yet.
        </p>
      ) : (
        <ul className="booking-google__list">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </ul>
      )}

      {cursor && !loading ? (
        <button type="button" className="booking-google__more" onClick={handleLoadMore} disabled={loadingMore}>
          {loadingMore ? "Loading…" : "Load more reviews"}
        </button>
      ) : null}

      {failed && reviews.length > 0 ? (
        <p className="booking-google__message booking-google__message--soft">
          More Google reviews could not be loaded right now.
        </p>
      ) : null}
    </div>
  );
}

export default BookingGoogleReviews;
