document.addEventListener("DOMContentLoaded", function () {
  const root = document.getElementById("reviews-app");

  if (!root) return;

  const productId = root.dataset.productId;
  const apiUrl = root.dataset.apiUrl;

  const summaryStarsEl =
    document.getElementById("reviews-summary-stars");

  const breakdownEl =
    document.getElementById("reviews-breakdown");

  const listEl =
    document.getElementById("reviews-list");

  const formWrap =
    document.getElementById("review-form-wrap");

  const openBtn =
    document.getElementById("open-review-form");

  const cancelBtn =
    document.getElementById("cancel-review");

  const form =
    document.getElementById("review-form");

  const msgEl =
    document.getElementById("review-msg");

  const starInput =
    document.getElementById("star-input");

  const ratingValue =
    document.getElementById("rating-value");


  /* =========================================================
     HELPERS
     ========================================================= */

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


  function escapeHtml(value) {
    const div = document.createElement("div");

    div.textContent = value == null ? "" : String(value);

    return div.innerHTML;
  }


  function formatDate(date) {
    const d = new Date(date);

    if (isNaN(d.getTime())) {
      return "";
    }

    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }


  function getLikeStorageKey(reviewId) {
    return `shopify-review-liked-${productId}-${reviewId}`;
  }


  /* =========================================================
     STAR INPUT
     ========================================================= */

  starInput.addEventListener("click", function (e) {

    const star = e.target.dataset.star;

    if (!star) return;

    ratingValue.value = star;

    renderStarInput(Number(star));

  });


  /* =========================================================
     OPEN REVIEW FORM
     ========================================================= */

  openBtn.addEventListener("click", function () {

    formWrap.hidden = false;

    formWrap.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

  });


  /* =========================================================
     CANCEL REVIEW
     ========================================================= */

  cancelBtn.addEventListener("click", function () {

    formWrap.hidden = true;

    form.reset();

    ratingValue.value = "";

    renderStarInput(0);

    msgEl.textContent = "";

  });


  /* =========================================================
     LOAD REVIEWS
     ========================================================= */

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


      /* SUMMARY */

      summaryStarsEl.textContent =
        `${starString(data.average)} ${data.average || 0} / 5 (${data.total || 0} reviews)`;


      /* BREAKDOWN */

      const breakdown =
        Array.isArray(data.breakdown)
          ? data.breakdown
          : [];

      breakdownEl.innerHTML =
        breakdown
          .map((row) => {

            const pct =
              data.total
                ? Math.round(
                    (Number(row.count) /
                      Number(data.total)) *
                      100
                  )
                : 0;

            return `
              <div class="reviews-app__breakdown-row">

                <span>
                  ${Number(row.star)}★
                </span>

                <div class="bar-track">
                  <div
                    class="bar-fill"
                    style="width:${pct}%"
                  ></div>
                </div>

                <span>
                  ${Number(row.count)}
                </span>

              </div>
            `;

          })
          .join("");


      /* NO REVIEWS */

      if (
        !Array.isArray(data.reviews) ||
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


      /* REVIEWS */

      listEl.innerHTML =
        data.reviews
          .map((review) => {

            const reviewId =
              escapeHtml(review.id);

            const name =
              escapeHtml(review.name);

            const body =
              escapeHtml(review.body);

            const title =
              escapeHtml(review.title || "");

            const avatar =
              review.avatar
                ? `
                  <img
                    src="${escapeHtml(review.avatar)}"
                    alt="${name}"
                  >
                `
                : escapeHtml(
                    String(review.name || "?")
                      .charAt(0)
                      .toUpperCase()
                  );


            const likes =
              Number(review.likes || 0);

            const comments =
              Array.isArray(review.comments)
                ? review.comments
                : [];


            const liked =
              localStorage.getItem(
                getLikeStorageKey(review.id)
              ) === "true";


            const commentsHtml =
              comments
                .map((comment) => {

                  return `
                    <div class="review-comment">

                      <div class="review-comment-name">
                        ${escapeHtml(comment.name)}
                      </div>

                      <div class="review-comment-body">
                        ${escapeHtml(comment.body)}
                      </div>

                      <div class="review-comment-date">
                        ${formatDate(comment.date)}
                      </div>

                    </div>
                  `;

                })
                .join("");


            return `
              <div
                class="reviews-app__list-item"
                data-review-id="${reviewId}"
              >

                <!-- LEFT USER -->

                <div class="review-user">

                  <div class="review-avatar">
                    ${avatar}
                  </div>

                  <div class="review-name">
                    ${name}
                  </div>

                  <div class="review-count">
                    ${Number(review.reviewCount || 1)}
                    ${Number(review.reviewCount || 1) === 1
                      ? "review"
                      : "reviews"}
                  </div>

                  <div class="review-count">
                    ${Number(review.followers || 0)}
                    followers
                  </div>

                  <button
                    class="review-follow-btn"
                    type="button"
                  >
                    Follow
                  </button>

                </div>


                <!-- RIGHT REVIEW -->

                <div class="review-content">

                  <div class="review-top">

                    <div class="review-stars">
                      ${starString(review.rating)}
                    </div>

                    <div class="review-date">
                      ${formatDate(review.date)}
                    </div>

                  </div>


                  ${
                    title
                      ? `
                        <div class="review-title">
                          ${title}
                        </div>
                      `
                      : ""
                  }


                  <div class="review-body">
                    ${body}
                  </div>


                  <button
                    class="review-show-more"
                    type="button"
                  >
                    Show more
                    <span>⌄</span>
                  </button>


                  <!-- ACTIONS -->

                  <div class="review-actions">

                    <!-- LIKE -->

                    <button
                      class="review-action like-btn ${
                        liked ? "liked" : ""
                      }"
                      type="button"
                    >

                      <svg viewBox="0 0 24 24">
                        <path
                          d="M7 10v10H4V10h3z"
                        ></path>

                        <path
                          d="M7 10l4-7c.5-.9 1.8-.6 1.8.4V7h4.7c1.4 0 2.4 1.3 2 2.6l-1.4 6.8c-.2.9-1 1.6-2 1.6H7"
                        ></path>
                      </svg>

                      <span class="like-text">
                        ${liked ? "Liked" : "Like"}
                      </span>

                      <span class="like-count">
                        ${likes}
                      </span>

                    </button>


                    <!-- COMMENT -->

                    <button
                      class="review-action comment-btn"
                      type="button"
                    >

                      <svg viewBox="0 0 24 24">
                        <path
                          d="M21 11.5a8.4 8.4 0 0 1-9 8.5 9.4 9.4 0 0 1-4.1-.9L3 21l1.9-4.2A8.2 8.2 0 0 1 3 11.5C3 7 7 3 12 3s9 3 9 8.5z"
                        ></path>
                      </svg>

                      <span>
                        Comment
                      </span>

                      <span class="comment-count">
                        ${comments.length}
                      </span>

                    </button>


                    <!-- MORE -->

                    <button
                      class="review-action more-btn"
                      type="button"
                    >
                      •••
                    </button>

                  </div>


                  <!-- COMMENT FORM -->

                  <div class="review-comment-box">

                    <textarea
                      class="comment-input"
                      maxlength="1000"
                      placeholder="Write a comment..."
                    ></textarea>

                    <button
                      type="button"
                      class="submit-comment"
                    >
                      Comment
                    </button>

                  </div>


                  <!-- COMMENTS -->

                  ${
                    comments.length
                      ? `
                        <div class="review-comments">
                          ${commentsHtml}
                        </div>
                      `
                      : ""
                  }

                </div>

              </div>
            `;

          })
          .join("");


    } catch (error) {

      console.error(
        "Reviews load error:",
        error
      );

      listEl.innerHTML = `
        <p class="reviews-app__empty">
          Reviews load nahi ho sake.
        </p>
      `;

    }

  }


  /* =========================================================
     LIKE / COMMENT / FOLLOW / SHOW MORE
     ========================================================= */

  listEl.addEventListener("click", async function (e) {

    const reviewItem =
      e.target.closest(
        ".reviews-app__list-item"
      );

    if (!reviewItem) return;


    const reviewId =
      reviewItem.dataset.reviewId;


    /* -------------------------------------------------------
       FOLLOW
       ------------------------------------------------------- */

    const followBtn =
      e.target.closest(
        ".review-follow-btn"
      );

    if (followBtn) {

      followBtn.classList.toggle(
        "following"
      );

      if (
        followBtn.classList.contains(
          "following"
        )
      ) {
        followBtn.textContent =
          "Following";
      } else {
        followBtn.textContent =
          "Follow";
      }

      return;
    }


    /* -------------------------------------------------------
       SHOW MORE
       ------------------------------------------------------- */

    const showMore =
      e.target.closest(
        ".review-show-more"
      );

    if (showMore) {

      const body =
        reviewItem.querySelector(
          ".review-body"
        );

      body.classList.toggle(
        "expanded"
      );

      if (
        body.classList.contains(
          "expanded"
        )
      ) {

        showMore.innerHTML =
          `Show less <span>⌃</span>`;

      } else {

        showMore.innerHTML =
          `Show more <span>⌄</span>`;

      }

      return;
    }


    /* -------------------------------------------------------
       COMMENT BUTTON
       ------------------------------------------------------- */

    const commentBtn =
      e.target.closest(
        ".comment-btn"
      );

    if (commentBtn) {

      const box =
        reviewItem.querySelector(
          ".review-comment-box"
        );

      box.classList.toggle(
        "active"
      );

      if (
        box.classList.contains(
          "active"
        )
      ) {

        const textarea =
          box.querySelector(
            ".comment-input"
          );

        textarea.focus();

      }

      return;
    }


    /* -------------------------------------------------------
       LIKE
       ------------------------------------------------------- */

    const likeBtn =
      e.target.closest(
        ".like-btn"
      );

    if (likeBtn) {

      if (
        likeBtn.dataset.loading === "true"
      ) {
        return;
      }

      likeBtn.dataset.loading =
        "true";


      const alreadyLiked =
        likeBtn.classList.contains(
          "liked"
        );


      try {

        const res =
          await fetch(apiUrl, {

            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              action: "like",
              productId: productId,
              reviewId: reviewId,
              unlike: alreadyLiked,
            }),

          });


        const data =
          await res.json();


        if (!res.ok) {

          throw new Error(
            data.error ||
              "Like failed"
          );

        }


        const countEl =
          likeBtn.querySelector(
            ".like-count"
          );

        const textEl =
          likeBtn.querySelector(
            ".like-text"
          );


        countEl.textContent =
          Number(data.likes || 0);


        if (alreadyLiked) {

          likeBtn.classList.remove(
            "liked"
          );

          textEl.textContent =
            "Like";

          localStorage.removeItem(
            getLikeStorageKey(
              reviewId
            )
          );

        } else {

          likeBtn.classList.add(
            "liked"
          );

          textEl.textContent =
            "Liked";

          localStorage.setItem(
            getLikeStorageKey(
              reviewId
            ),
            "true"
          );

        }


      } catch (error) {

        console.error(
          "Like error:",
          error
        );

        alert(
          "Like save nahi ho saka."
        );

      } finally {

        likeBtn.dataset.loading =
          "false";

      }

      return;
    }


    /* -------------------------------------------------------
       SUBMIT COMMENT
       ------------------------------------------------------- */

    const commentSubmit =
      e.target.closest(
        ".submit-comment"
      );

    if (commentSubmit) {

      if (
        commentSubmit.dataset.loading ===
        "true"
      ) {
        return;
      }


      const box =
        commentSubmit.closest(
          ".review-comment-box"
        );

      const textarea =
        box.querySelector(
          ".comment-input"
        );


      const commentBody =
        textarea.value.trim();


      if (!commentBody) {

        alert(
          "Please comment likhein."
        );

        return;
      }


      commentSubmit.dataset.loading =
        "true";

      commentSubmit.textContent =
        "Posting...";


      try {

        const res =
          await fetch(apiUrl, {

            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              action: "comment",
              productId: productId,
              reviewId: reviewId,
              name: "Guest",
              body: commentBody,
            }),

          });


        const data =
          await res.json();


        if (!res.ok) {

          throw new Error(
            data.error ||
              "Comment failed"
          );

        }


        /* Reload reviews so the comment
           is shown from Shopify metafield */

        await loadReviews();


      } catch (error) {

        console.error(
          "Comment error:",
          error
        );

        alert(
          error.message ||
            "Comment save nahi ho saka."
        );

      } finally {

        commentSubmit.dataset.loading =
          "false";

        commentSubmit.textContent =
          "Comment";

      }

      return;
    }

  });


  /* =========================================================
     SUBMIT NEW REVIEW
     ========================================================= */

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

        name:
          document.getElementById(
            "review-name"
          ).value.trim(),

        title:
          document.getElementById(
            "review-title"
          ).value.trim(),

        body:
          document.getElementById(
            "review-body"
          ).value.trim(),

        rating:
          Number(
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

        const res =
          await fetch(
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
          await res.json();


        if (!res.ok) {

          throw new Error(
            data.error ||
              "Kuch galat ho gaya."
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
          "Review submit error:",
          error
        );

        msgEl.textContent =
          error.message ||
          "Network error, dobara try karein.";

      } finally {

        submitBtn.disabled = false;

        submitBtn.textContent =
          "Submit Review";

      }

    }
  );


  /* =========================================================
     INITIAL LOAD
     ========================================================= */

  loadReviews();

});
