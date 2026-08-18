
document.addEventListener("DOMContentLoaded", function () {
  const root = document.getElementById("reviews-app");
  if (!root) return;

  const productId = root.dataset.productId;
  const apiUrl = root.dataset.apiUrl; // e.g. https://your-app.vercel.app/api/reviews

  const summaryStarsEl = document.getElementById("reviews-summary-stars");
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
    const full = Math.round(rating);
    return "★".repeat(full) + "☆".repeat(5 - full);
  }

  function renderStarInput(selected) {
    starInput.querySelectorAll("span").forEach((s) => {
      s.textContent = Number(s.dataset.star) <= selected ? "★" : "☆";
    });
  }

  starInput.addEventListener("click", (e) => {
    const star = e.target.dataset.star;
    if (!star) return;
    ratingValue.value = star;
    renderStarInput(Number(star));
  });

  openBtn.addEventListener("click", () => {
    formWrap.hidden = false;
    formWrap.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  cancelBtn.addEventListener("click", () => {
    formWrap.hidden = true;
    form.reset();
    renderStarInput(0);
  });

  async function loadReviews() {
    try {
      const res = await fetch(`${apiUrl}?productId=${productId}`);
      const data = await res.json();

      summaryStarsEl.textContent = `${starString(data.average)} (${data.average || 0} / 5, ${data.total} reviews)`;

      breakdownEl.innerHTML = data.breakdown
        .map((row) => {
          const pct = data.total ? Math.round((row.count / data.total) * 100) : 0;
          return `
            <div class="reviews-app__breakdown-row">
              <span>${row.star}★</span>
              <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
              <span>${row.count}</span>
            </div>`;
        })
        .join("");

      if (!data.reviews.length) {
        listEl.innerHTML = `<p class="reviews-app__empty">Abhi tak koi review nahi. Sabse pehle review likhein!</p>`;
        return;
      }

      listEl.innerHTML = data.reviews
        .map(
          (r) => `
        <div class="reviews-app__list-item">
          <div class="stars">${starString(r.rating)}</div>
          <div class="rname">${escapeHtml(r.name)} ${r.verified ? "✅" : ""}</div>
          <div class="rdate">${new Date(r.date).toLocaleDateString()}</div>
          ${r.title ? `<div class="rtitle">${escapeHtml(r.title)}</div>` : ""}
          <div class="rbody">${escapeHtml(r.body)}</div>
        </div>`
        )
        .join("");
    } catch (err) {
      listEl.innerHTML = `<p class="reviews-app__empty">Reviews load nahi ho sake.</p>`;
      console.error(err);
    }
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msgEl.textContent = "";

    if (!ratingValue.value) {
      msgEl.textContent = "Please select a star rating.";
      return;
    }

    const payload = {
      name: document.getElementById("review-name").value,
      title: document.getElementById("review-title").value,
      body: document.getElementById("review-body").value,
      rating: Number(ratingValue.value),
    };

    const submitBtn = document.getElementById("submit-review");
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    try {
      const res = await fetch(`${apiUrl}?productId=${productId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        msgEl.textContent = data.error || "Kuch galat ho gaya.";
      } else {
        msgEl.textContent = "Shukriya! Aapka review submit ho gaya.";
        form.reset();
        renderStarInput(0);
        formWrap.hidden = true;
        loadReviews();
      }
    } catch (err) {
      msgEl.textContent = "Network error, dobara try karein.";
      console.error(err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Review";
    }
  });

  loadReviews();
});
