document.addEventListener("DOMContentLoaded", function () {
  const root = document.getElementById("reviews-app");
  if (!root) return;

  const productId = root.dataset.productId;
  const apiUrl = root.dataset.apiUrl;

  const summaryStarsEl = document.getElementById("reviews-summary-stars");
  const summaryCountEl = document.getElementById("reviews-summary-count");
  const breakdownEl = document.getElementById("reviews-breakdown");
  const listEl = document.getElementById("reviews-list");

  const formWrap = document.getElementById("review-form-wrap");
  const openBtn = document.getElementById("open-review-form");
  const cancelBtn = document.getElementById("cancel-review");
  const form = document.getElementById("review-form");
  const msgEl = document.getElementById("review-msg");

  const starInput = document.getElementById("star-input");
  const ratingValue = document.getElementById("rating-value");

  function starString(rating) {
    const full = Math.round(Number(rating) || 0);
    return "★".repeat(full) + "☆".repeat(5 - full);
  }

  function renderStarInput(selected) {
    if (!starInput) return;

    starInput.querySelectorAll("span").forEach((s) => {
      s.textContent =
        Number(s.dataset.star) <= selected ? "★" : "☆";
    });
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value == null ? "" : String(value);
    return div.innerHTML;
  }

  function getInitials(name) {
    const cleanName = String(name || "User").trim();

    if (!cleanName) return "U";

    const parts = cleanName.split(/\s+/);

    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }

    return (
      parts[0].charAt(0) +
      parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }

  function formatDate(date) {
    try {
      return new Date(date).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  }

  function renderReview(review, index) {
    const name = escapeHtml(review.name || "Anonymous");
    const title = escapeHtml(review.title || "");
    const body = escapeHtml(review.body || "");
    const date = formatDate(review.date);

    const reviewId =
      review.id ||
      `review-${index}-${Date.now()}`;

    const rating = Number(review.rating) || 0;

    /*
      These are frontend-only values for now.

      IMPORTANT:
      Likes/comments are NOT permanently saved yet.
      They will reset when the page reloads.
    */
    const likes = Number(review.likes || 0);
    const comments = Number(review.comments || 0);

    return `
      <article
        class="reviews-app__list-item"
        data-review-id="${escapeHtml(reviewId)}"
      >

        <!-- Reviewer -->
        <div class="reviews-app__reviewer">

          <div class="reviews-app__avatar">
            ${escapeHtml(getInitials(review.name))}
          </div>

          <div class="reviews-app__reviewer-info">
            <div class="reviews-app__reviewer-name">
              ${name}
              ${
                review.verified
                  ? '<span class="reviews-app__verified">✓</span>'
                  : ""
              }
            </div>

            <div class="reviews-app__reviewer-meta">
              ${review.reviewCount || 0} reviews
              ${
                review.followers
                  ? ` · ${review.followers} followers`
                  : ""
              }
            </div>
          </div>

          <button
            type="button"
            class="reviews-app__follow-btn"
            data-follow
          >
            Follow
          </button>

        </div>

        <!-- Review content -->
        <div class="reviews-app__review-content">

          <div class="stars">
            ${starString(rating)}
          </div>

          <div class="rdate">
            ${escapeHtml(date)}
          </div>

          ${
            title
              ? `<div class="rtitle">${title}</div>`
              : ""
          }

          <div
            class="rbody"
            data-review-body
          >
            ${body}
          </div>

          ${
            body.length > 280
              ? `
                <button
                  type="button"
                  class="reviews-app__show-more"
                  data-show-more
                >
                  Show more
                </button>
              `
              : ""
          }

        </div>

        <!-- Engagement -->
        <div class="reviews-app__engagement">
          <span data-like-count>${likes}</span> likes
          <span> · </span>
          <span data-comment-count>${comments}</span> comments
        </div>

        <!-- Actions -->
        <div class="reviews-app__actions">

          <button
            type="button"
            class="reviews-app__action-btn"
            data-like
          >
            <span class="reviews-app__action-icon">♡</span>
            <span>Like</span>
          </button>

          <button
            type="button"
            class="reviews-app__action-btn"
            data-comment
          >
            <span class="reviews-app__action-icon">💬</span>
            <span>Comment</span>
          </button>

          <button
            type="button"
            class="reviews-app__more-btn"
            data-more
            aria-label="More options"
          >
            •••
          </button>

        </div>

        <!-- Comment box -->
        <div
          class="reviews-app__comment-box"
          data-comment-box
          hidden
        >
          <input
            type="text"
            placeholder="Write a comment..."
            maxlength="500"
            data-comment-input
          >

          <button
            type="button"
            data-comment-submit
          >
            Post
          </button>
        </div>

      </article>
    `;
  }

  function attachReviewInteractions() {
    /*
      LIKE
    */
    listEl.querySelectorAll("[data-like]").forEach((button) => {
      button.addEventListener("click", () => {
        const card = button.closest(
          ".reviews-app__list-item"
        );

        if (!card) return;

        const countEl = card.querySelector(
          "[data-like-count]"
        );

        const icon = button.querySelector(
          ".reviews-app__action-icon"
        );

        let count = Number(countEl.textContent) || 0;

        if (button.classList.contains("is-liked")) {
          count = Math.max(0, count - 1);

          button.classList.remove("is-liked");

          if (icon) {
            icon.textContent = "♡";
          }
        } else {
          count += 1;

          button.classList.add("is-liked");

          if (icon) {
            icon.textContent = "♥";
          }
        }

        countEl.textContent = count;
      });
    });

    /*
      COMMENT BUTTON
    */
    listEl.querySelectorAll("[data-comment]").forEach((button) => {
      button.addEventListener("click", () => {
        const card = button.closest(
          ".reviews-app__list-item"
        );

        if (!card) return;

        const box = card.querySelector(
          "[data-comment-box]"
        );

        if (!box) return;

        box.hidden = !box.hidden;

        if (!box.hidden) {
          const input = box.querySelector(
            "[data-comment-input]"
          );

          if (input) {
            input.focus();
          }
        }
      });
    });

    /*
      COMMENT SUBMIT
    */
    listEl
      .querySelectorAll("[data-comment-submit]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const card = button.closest(
            ".reviews-app__list-item"
          );

          if (!card) return;

          const input = card.querySelector(
            "[data-comment-input]"
          );

          const countEl = card.querySelector(
            "[data-comment-count]"
          );

          if (!input || !countEl) return;

          const comment = input.value.trim();

          if (!comment) return;

          let count = Number(countEl.textContent) || 0;

          count += 1;

          countEl.textContent = count;

          input.value = "";

          alert(
            "Comment added. Permanent comment storage will be added in the backend later."
          );
        });
      });

    /*
      FOLLOW BUTTON
    */
    listEl
      .querySelectorAll("[data-follow]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          if (button.classList.contains("is-following")) {
            button.classList.remove("is-following");
            button.textContent = "Follow";
          } else {
            button.classList.add("is-following");
            button.textContent = "Following";
          }
        });
      });

    /*
      SHOW MORE
    */
    listEl
      .querySelectorAll("[data-show-more]")
      .forEach((button) => {
        const body = button
          .closest(".reviews-app__review-content")
          ?.querySelector("[data-review-body]");

        if (!body) return;

        /*
          Start collapsed if review is long.
        */
        if (body.textContent.length > 280) {
          body.style.maxHeight = "115px";
          body.style.overflow = "hidden";
        }

        button.addEventListener("click", () => {
          if (body.style.maxHeight) {
            body.style.maxHeight = "";
            body.style.overflow = "";
            button.textContent = "Show less";
          } else {
            body.style.maxHeight = "115px";
            body.style.overflow = "hidden";
            button.textContent = "Show more";
          }
        });
      });

    /*
      MORE MENU
    */
    listEl
      .querySelectorAll("[data-more]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          alert("More options coming soon.");
        });
      });
  }

  /*
    STAR INPUT
  */
  if (starInput) {
    starInput.addEventListener("click", (e) => {
      const star = e.target.dataset.star;

      if (!star) return;

      ratingValue.value = star;

      renderStarInput(Number(star));
    });
  }

  /*
    OPEN FORM
  */
  if (openBtn) {
    openBtn.addEventListener("click", () => {
      formWrap.hidden = false;

      formWrap.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }

  /*
    CANCEL FORM
  */
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      formWrap.hidden = true;

      form.reset();

      renderStarInput(0);

      msgEl.textContent = "";
    });
  }

  /*
    LOAD REVIEWS
  */
  async function loadReviews() {
    try {
      const res = await fetch(
        `${apiUrl}?productId=${encodeURIComponent(productId)}`
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Reviews load failed"
        );
      }

      /*
        Summary
      */
      summaryStarsEl.textContent = starString(
        data.average
      );

      if (summaryCountEl) {
        summaryCountEl.textContent =
          `${data.average || 0} / 5 · ${data.total || 0} reviews`;
      }

      /*
        Rating breakdown
      */
      breakdownEl.innerHTML = (
        data.breakdown || []
      )
        .map((row) => {
          const pct = data.total
            ? Math.round(
                (row.count / data.total) * 100
              )
            : 0;

          return `
            <div class="reviews-app__breakdown-row">

              <span>${row.star}★</span>

              <div class="bar-track">
                <div
                  class="bar-fill"
                  style="width:${pct}%"
                ></div>
              </div>

              <span>${row.count}</span>

            </div>
          `;
        })
        .join("");

      /*
        Empty state
      */
      if (
        !data.reviews ||
        !data.reviews.length
      ) {
        listEl.innerHTML = `
          <p class="reviews-app__empty">
            Abhi tak koi review nahi.
            Sabse pehle review likhein!
          </p>
        `;

        return;
      }

      /*
        Render reviews
      */
      listEl.innerHTML = data.reviews
        .map(renderReview)
        .join("");

      /*
        Activate buttons
      */
      attachReviewInteractions();

    } catch (err) {
      listEl.innerHTML = `
        <p class="reviews-app__empty">
          Reviews load nahi ho sake.
        </p>
      `;

      console.error(
        "Reviews load error:",
        err
      );
    }
  }

  /*
    SUBMIT REVIEW
  */
  if (form) {
    form.addEventListener(
      "submit",
      async (e) => {
        e.preventDefault();

        msgEl.textContent = "";

        if (!ratingValue.value) {
          msgEl.textContent =
            "Please select a star rating.";

          return;
        }

        const payload = {
          name:
            document.getElementById(
              "review-name"
            ).value,

          title:
            document.getElementById(
              "review-title"
            ).value,

          body:
            document.getElementById(
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
          const res = await fetch(
            `${apiUrl}?productId=${encodeURIComponent(
              productId
            )}`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify(payload),
            }
          );

          const data = await res.json();

          if (!res.ok) {
            msgEl.textContent =
              data.error ||
              "Kuch galat ho gaya.";

            return;
          }

          msgEl.textContent =
            "Shukriya! Aapka review submit ho gaya.";

          form.reset();

          renderStarInput(0);

          formWrap.hidden = true;

          /*
            Reload reviews so the new review
            immediately appears.
          */
          await loadReviews();

        } catch (err) {
          msgEl.textContent =
            "Network error, dobara try karein.";

          console.error(
            "Review submit error:",
            err
          );

        } finally {
          submitBtn.disabled = false;

          submitBtn.textContent =
            "Submit Review";
        }
      }
    );
  }

  /*
    Initial load
  */
  loadReviews();
});
