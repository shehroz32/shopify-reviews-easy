const METAFIELD_NAMESPACE = "reviews_app";
const METAFIELD_KEY = "reviews_data";
const ADMIN_API_VERSION = "2026-07";

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

let cachedToken = null;
let tokenExpiresAt = 0;

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function getShopifyAccessToken() {
  if (!SHOPIFY_STORE_DOMAIN) {
    throw new Error("SHOPIFY_STORE_DOMAIN missing");
  }

  if (!SHOPIFY_CLIENT_ID) {
    throw new Error("SHOPIFY_CLIENT_ID missing");
  }

  if (!SHOPIFY_CLIENT_SECRET) {
    throw new Error("SHOPIFY_CLIENT_SECRET missing");
  }

  if (cachedToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  const response = await fetch(
    `https://${SHOPIFY_STORE_DOMAIN}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: SHOPIFY_CLIENT_ID,
        client_secret: SHOPIFY_CLIENT_SECRET,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(
      `Shopify token error: ${JSON.stringify(data)}`
    );
  }

  cachedToken = data.access_token;
  tokenExpiresAt =
    Date.now() + Number(data.expires_in || 86399) * 1000;

  return cachedToken;
}

async function shopifyGraphQL(query, variables) {
  const token = await getShopifyAccessToken();

  const response = await fetch(
    `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${ADMIN_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    }
  );

  const json = await response.json();

  if (!response.ok) {
    throw new Error(
      `Shopify API HTTP ${response.status}: ${JSON.stringify(json)}`
    );
  }

  if (json.errors) {
    throw new Error(
      `Shopify GraphQL errors: ${JSON.stringify(json.errors)}`
    );
  }

  return json.data;
}

function toGid(id) {
  return id.toString().startsWith("gid://")
    ? id
    : `gid://shopify/Product/${id}`;
}

async function getReviews(gid) {
  const data = await shopifyGraphQL(
    `query($id: ID!) {
      product(id: $id) {
        metafield(
          namespace: "${METAFIELD_NAMESPACE}"
          key: "${METAFIELD_KEY}"
        ) {
          value
        }
      }
    }`,
    { id: gid }
  );

  const raw = data?.product?.metafield?.value;

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((review) => ({
      ...review,
      likes: Number(review.likes || 0),
      comments: Array.isArray(review.comments)
        ? review.comments
        : [],
    }));
  } catch (error) {
    console.error("Invalid reviews JSON:", error);
    return [];
  }
}

async function saveReviews(gid, reviews) {
  const data = await shopifyGraphQL(
    `mutation($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        userErrors {
          field
          message
        }
      }
    }`,
    {
      metafields: [
        {
          ownerId: gid,
          namespace: METAFIELD_NAMESPACE,
          key: METAFIELD_KEY,
          type: "json",
          value: JSON.stringify(reviews),
        },
      ],
    }
  );

  const errors = data?.metafieldsSet?.userErrors;

  if (errors?.length) {
    throw new Error(JSON.stringify(errors));
  }
}

function createId() {
  return crypto.randomUUID();
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const productId = req.query.productId;

  if (!productId) {
    return res.status(400).json({
      error: "productId missing",
    });
  }

  const gid = toGid(productId);

  try {
    // =========================
    // GET REVIEWS
    // =========================

    if (req.method === "GET") {
      const reviews = (await getReviews(gid)).filter(
        (review) => review.approved !== false
      );

      const total = reviews.length;

      const average = total
        ? Number(
            (
              reviews.reduce(
                (sum, review) => sum + Number(review.rating || 0),
                0
              ) / total
            ).toFixed(1)
          )
        : 0;

      const breakdown = [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: reviews.filter(
          (review) => Number(review.rating) === star
        ).length,
      }));

      return res.status(200).json({
        success: true,
        average,
        total,
        breakdown,
        reviews,
      });
    }

    // =========================
    // POST
    // =========================

    if (req.method === "POST") {
      const body = req.body || {};
      const action = body.action;

      const reviews = await getReviews(gid);

      // =====================================
      // ADD NEW REVIEW
      // =====================================

      if (action === "review") {
        const {
          name,
          rating,
          title,
          body: reviewBody,
        } = body;

        if (!name || !rating || !reviewBody) {
          return res.status(400).json({
            error:
              "Naam, rating aur review likhna zaroori hai",
          });
        }

        const numericRating = Number(rating);

        if (
          numericRating < 1 ||
          numericRating > 5
        ) {
          return res.status(400).json({
            error:
              "Rating 1 se 5 ke beech honi chahiye",
          });
        }

        const newReview = {
          id: createId(),
          name: String(name).slice(0, 80),
          rating: numericRating,
          title: String(title || "").slice(0, 120),
          body: String(reviewBody).slice(0, 2000),
          date: new Date().toISOString(),
          approved: true,
          likes: 0,
          comments: [],
        };

        reviews.unshift(newReview);

        await saveReviews(gid, reviews);

        return res.status(200).json({
          success: true,
          review: newReview,
        });
      }

      // =====================================
      // LIKE REVIEW
      // =====================================

      if (action === "like") {
        const reviewId = body.reviewId;

        if (!reviewId) {
          return res.status(400).json({
            error: "reviewId missing",
          });
        }

        const review = reviews.find(
          (item) => item.id === reviewId
        );

        if (!review) {
          return res.status(404).json({
            error: "Review not found",
          });
        }

        review.likes = Number(review.likes || 0) + 1;

        await saveReviews(gid, reviews);

        return res.status(200).json({
          success: true,
          likes: review.likes,
        });
      }

      // =====================================
      // ADD COMMENT
      // =====================================

      if (action === "comment") {
        const {
          reviewId,
          name,
          body: commentBody,
        } = body;

        if (!reviewId || !commentBody) {
          return res.status(400).json({
            error: "Comment likhna zaroori hai",
          });
        }

        const review = reviews.find(
          (item) => item.id === reviewId
        );

        if (!review) {
          return res.status(404).json({
            error: "Review not found",
          });
        }

        if (!Array.isArray(review.comments)) {
          review.comments = [];
        }

        const newComment = {
          id: createId(),
          name: String(name || "Guest").slice(0, 80),
          body: String(commentBody).slice(0, 1000),
          date: new Date().toISOString(),
        };

        review.comments.push(newComment);

        await saveReviews(gid, reviews);

        return res.status(200).json({
          success: true,
          comment: newComment,
          comments: review.comments,
        });
      }

      return res.status(400).json({
        error: "Invalid action",
      });
    }

    return res.status(405).json({
      error: "Method not allowed",
    });
  } catch (error) {
    console.error("REVIEWS API ERROR:", error);

    return res.status(500).json({
      error: "Server error, dobara try karein",
      details:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
}
