document.addEventListener("DOMContentLoaded", function () {
  const root = document.getElementById("reviews-app");

  if (!root) return;

  const productId = root.dataset.productId;
  const apiUrl = root.dataset.apiUrl;

  const summaryStarsEl = document.getElementById(
    "reviews-summary-stars"
  );

  const breakdownEl = document.getElementById(
    "reviews-breakdown"
  );

  const listEl = document.getElementById(
    "reviews-list"
  );

  const formWrap = document.getElementById(
    "review-form-wrap"
  );

  const openBtn = document.getElementById(
    "open-review-form"
  );

  const cancelBtn = document.getElementById(
    "cancel-review"
  );

  const form = document.getElementById(
    "review-form"
  );

  const msgEl = document.getElementById(
    "review-msg"
  );

  const starInput = document.getElementById(
    "star-input"
  );

  const ratingValue = document.getElementById(
    "rating-value"
  );

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value || "";
    return div.innerHTML;
  }

  function starString(rating) {
    const full = Math.max(
      0,
      Math.min(5, Math.round(Number(rating) || 0))
    );

    return (
      "★".repeat(full) +
      "☆".repeat(5 - full)
    );
  }

  function formatDate(date) {
    try {
      return new Date(date).toLocaleDateString(
        undefined,
        {
          year: "numeric",
          month: "long",
          day: "numeric",
        }
      );
    } catch {
      return "";
    }
  }

  function renderStarInput(selected) {
    starInput
      .querySelectorAll("span")
      .forEach((star) => {
        star.textContent =
          Number(star.dataset.star) <= selected
            ? "★"
            : "☆";
      });
  }

  // ==========================================
  // STAR SELECT
  // ==========================================

  starInput.addEventListener("click", function (e) {
    const star = e.target.dataset.star;

    if (!star) return;

    ratingValue.value = star;

    renderStarInput(Number(star));
  });

  // ==========================================
  // OPEN FORM
  // ==========================================

  openBtn.addEventListener("click", function () {
    formWrap.hidden = false;

    formWrap.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  });

  // ==========================================
  // CANCEL FORM
  // ==========================================

  cancelBtn.addEventListener("click", function () {
    formWrap.hidden = true;

    form.reset();

    ratingValue.value = "";

    renderStarInput(0);

    msgEl.textContent = "";
  });

  // ==========================================
  // LOAD REVIEWS
  // ==========================================

  async function loadReviews() {
    try {
      const response = await fetch(
        `${apiUrl}?productId=${encodeURIComponent(
          productId
        )}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to load reviews"
        );
      }

      const average = Number(
        data.average || 0
      );

      const total = Number(
        data.total || 0
      );

      summaryStarsEl.innerHTML = `
        <span class="reviews-rating-stars">
          ${starString(average)}
        </span>
        <span class="reviews-rating-number">
          ${average.toFixed(1)}
        </span>
        <span class="reviews-rating-count">
          (${total} ${
            total === 1 ? "review" : "reviews"
          })
        </span>
      `;

      // ========================================
      // BREAKDOWN
      // ========================================

      breakdownEl.innerHTML =
        (data.breakdown || [])
          .map((row) => {
            const percentage = total
              ? Math.round(
                  (row.count / total) * 100
                )
              : 0;

            return `
              <div class="reviews-app__breakdown-row">
                <span>${row.star}★</span>

                <div class="bar-track">
                  <div
                    class="bar-fill"
                    style="width:${percentage}%"
                  ></div>
                </div>

                <span>${row.count}</span>
              </div>
            `;
          })
          .join("");

      // ========================================
      // NO REVIEWS
      // ========================================

      if (!data.reviews || !data.reviews.length) {
        listEl.innerHTML = `
          <div class="reviews-app__empty">
            <p>Abhi tak koi review nahi.</p>
            <p>Sabse pehle review likhein!</p>
          </div>
        `;

        return;
      }

      // ========================================
      // RENDER REVIEWS
      // ========================================

      listEl.innerHTML = data.reviews
        .map(renderReview)
        .join("");

      attachReviewEvents();
    } catch (error) {
      console.error(
        "LOAD REVIEWS ERROR:",
        error
      );

      listEl.innerHTML = `
        <p class="reviews-app__empty">
          Reviews load nahi ho sake.
        </p>
      `;
    }
  }

  // ==========================================
  // RENDER SINGLE REVIEW
  // ==========================================

  function renderReview(review) {
    const comments = Array.isArray(
      review.comments
    )
      ? review.comments
      : [];

    const likes = Number(
      review.likes || 0
    );

    return `
      <article
        class="reviews-app__list-item"
        data-review-id="${escapeHtml(
          review.id
        )}"
      >

        <div class="review-top">

          <div class="review-author">

            <div class="review-avatar">
              ${escapeHtml(
                (review.name || "G")
                  .charAt(0)
                  .toUpperCase()
              )}
            </div>

            <div>
              <div class="rname">
                ${escapeHtml(
                  review.name
                )}
                ${
                  review.verified
                    ? `<span class="verified">✓</span>`
                    : ""
                }
              </div>

              <div class="rmeta">
                ${formatDate(
                  review.date
                )}
              </div>
            </div>

          </div>

          <div class="review-date">
            ${formatDate(review.date)}
          </div>

        </div>

        <div class="stars">
          ${starString(review.rating)}
        </div>

        ${
          review.title
            ? `
              <div class="rtitle">
                ${escapeHtml(
                  review.title
                )}
              </div>
            `
            : ""
        }

        <div class="rbody">
          ${escapeHtml(review.body)}
        </div>

        <!-- ACTIONS -->

        <div class="review-actions">

          <button
            type="button"
            class="review-action like-review"
            data-review-id="${escapeHtml(
              review.id
            )}"
          >
            <span class="action-icon">♡</span>
            <span>Like</span>
            <span class="like-count">
              ${likes}
            </span>
          </button>

          <button
            type="button"
            class="review-action comment-toggle"
            data-review-id="${escapeHtml(
              review.id
            )}"
          >
            <span class="action-icon">◯</span>
            <span>Comment</span>
            <span class="comment-count">
              ${comments.length}
            </span>
          </button>

        </div>

        <!-- COMMENTS -->

        <div
          class="review-comments"
          data-comments-for="${escapeHtml(
            review.id
          )}"
        >

          <div class="comments-list">
            ${comments
              .map(renderComment)
              .join("")}
          </div>

          <form
            class="comment-form"
            data-review-id="${escapeHtml(
              review.id
            )}"
          >

            <input
              type="text"
              name="name"
              placeholder="Your name"
              maxlength="80"
            />

            <input
              type="text"
              name="comment"
              placeholder="Write a comment..."
              maxlength="1000"
              required
            />

            <button type="submit">
              Post
            </button>

          </form>

        </div>

      </article>
    `;
  }

  // ==========================================
  // RENDER COMMENT
  // ==========================================

  function renderComment(comment) {
    return `
      <div class="review-comment">

        <div class="comment-avatar">
          ${escapeHtml(
            (comment.name || "G")
              .charAt(0)
              .toUpperCase()
          )}
        </div>

        <div class="comment-content">

          <div class="comment-header">
            <strong>
              ${escapeHtml(
                comment.name || "Guest"
              )}
            </strong>

            <span>
              ${formatDate(
                comment.date
              )}
            </span>
          </div>

          <div class="comment-body">
            ${escapeHtml(
              comment.body
            )}
          </div>

        </div>

      </div>
    `;
  }

  // ==========================================
  // ATTACH EVENTS
  // ==========================================

  function attachReviewEvents() {
    // LIKE BUTTONS
    document
      .querySelectorAll(".like-review")
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => handleLike(button)
        );
      });

    // COMMENT BUTTONS
    document
      .querySelectorAll(".comment-toggle")
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            const reviewId =
              button.dataset.reviewId;

            const box =
              document.querySelector(
                `[data-comments-for="${CSS.escape(
                  reviewId
                )}"]`
              );

            if (!box) return;

            box.classList.toggle(
              "is-open"
            );
          }
        );
      });

    // COMMENT FORMS
    document
      .querySelectorAll(".comment-form")
      .forEach((form) => {
        form.addEventListener(
          "submit",
          handleComment
        );
      });
  }

  // ==========================================
  // LIKE
  // ==========================================

  async function handleLike(button) {
    const reviewId =
      button.dataset.reviewId;

    if (!reviewId) return;

    button.disabled = true;

    try {
      const response = await fetch(
        `${apiUrl}?productId=${encodeURIComponent(
          productId
        )}`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action: "like",
            reviewId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Like failed"
        );
      }

      const count =
        button.querySelector(
          ".like-count"
        );

      if (count) {
        count.textContent =
          data.likes;
      }

      button.classList.add(
        "liked"
      );
    } catch (error) {
      console.error(
        "LIKE ERROR:",
        error
      );
    } finally {
      button.disabled = false;
    }
  }

  // ==========================================
  // COMMENT
  // ==========================================

  async function handleComment(e) {
    e.preventDefault();

    const commentForm = e.currentTarget;

    const reviewId =
      commentForm.dataset.reviewId;

    const nameInput =
      commentForm.querySelector(
        '[name="name"]'
      );

    const commentInput =
      commentForm.querySelector(
        '[name="comment"]'
      );

    const submitButton =
      commentForm.querySelector(
        "button"
      );

    const name =
      nameInput.value.trim() ||
      "Guest";

    const comment =
      commentInput.value.trim();

    if (!comment) return;

    submitButton.disabled = true;
    submitButton.textContent =
      "Posting...";

    try {
      const response = await fetch(
        `${apiUrl}?productId=${encodeURIComponent(
          productId
        )}`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action: "comment",
            reviewId,
            name,
            body: comment,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Comment failed"
        );
      }

      // Clear inputs
      commentInput.value = "";

      // Add comment immediately
      const commentsList =
        commentForm.parentElement.querySelector(
          ".comments-list"
        );

      if (commentsList && data.comment) {
        commentsList.insertAdjacentHTML(
          "beforeend",
          renderComment(
            data.comment
          )
        );
      }

      // Update comment count
      const article =
        commentForm.closest(
          ".reviews-app__list-item"
        );

      const commentCount =
        article.querySelector(
          ".comment-count"
        );

      if (commentCount) {
        commentCount.textContent =
          data.comments.length;
      }

      commentForm.parentElement.classList.add(
        "is-open"
      );
    } catch (error) {
      console.error(
        "COMMENT ERROR:",
        error
      );

      alert(
        "Comment save nahi ho saka. Dobara try karein."
      );
    } finally {
      submitButton.disabled = false;
      submitButton.textContent =
        "Post";
    }
  }

  // ==========================================
  // SUBMIT REVIEW
  // ==========================================

  form.addEventListener(
    "submit",
    async function (e) {
      e.preventDefault();

      msgEl.textContent = "";

      if (!ratingValue.value) {
        msgEl.textContent =
          "Please select a star rating.";

        return;
      }

      const payload = {
        action: "review",

        name: document.getElementById(
          "review-name"
        ).value,

        title: document.getElementById(
          "review-title"
        ).value,

        body: document.getElementById(
          "review-body"
        ).value,

        rating: Number(
          ratingValue.value
        ),
      };

      const submitBtn =
        document.getElementById(
          "submit-review"
        );

      submitBtn.disabled = true;

      submitBtn.textContent =
        "Submitting...";

      try {
        const response = await fetch(
          `${apiUrl}?productId=${encodeURIComponent(
            productId
          )}`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(
              payload
            ),
          }
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Review submit failed"
          );
        }

        msgEl.textContent =
          "Shukriya! Aapka review submit ho gaya.";

        form.reset();

        ratingValue.value = "";

        renderStarInput(0);

        formWrap.hidden = true;

        await loadReviews();
      } catch (error) {
        console.error(
          "REVIEW SUBMIT ERROR:",
          error
        );

        msgEl.textContent =
          error.message ||
          "Server error, dobara try karein.";
      } finally {
        submitBtn.disabled = false;

        submitBtn.textContent =
          "Submit Review";
      }
    }
  );

  // INITIAL LOAD
  loadReviews();
});
