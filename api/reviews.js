const METAFIELD_NAMESPACE = "reviews_app";
const METAFIELD_KEY = "reviews_data";
const ADMIN_API_VERSION = "2026-07";

// Shopify Dev Dashboard credentials
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

  // Reuse token while it is still valid
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  const tokenUrl =
    `https://${SHOPIFY_STORE_DOMAIN}/admin/oauth/access_token`;

  const response = await fetch(tokenUrl, {
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
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(
      `Shopify token error: ${JSON.stringify(data)}`
    );
  }

  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + Number(data.expires_in || 86399) * 1000;

  return cachedToken;
}

async function shopifyGraphQL(query, variables) {
  const token = await getShopifyAccessToken();

  const r = await fetch(
    `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${ADMIN_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query, variables }),
    }
  );

  const json = await r.json();

  if (!r.ok) {
    throw new Error(
      `Shopify API HTTP ${r.status}: ${JSON.stringify(json)}`
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

  return raw ? JSON.parse(raw) : [];
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

  const errs = data?.metafieldsSet?.userErrors;

  if (errs?.length) {
    throw new Error(JSON.stringify(errs));
  }
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
    if (req.method === "GET") {
      const reviews = (await getReviews(gid)).filter(
        (r) => r.approved !== false
      );

      const total = reviews.length;

      const average = total
        ? Number(
            (
              reviews.reduce((s, r) => s + Number(r.rating), 0) /
              total
            ).toFixed(1)
          )
        : 0;

      const breakdown = [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: reviews.filter(
          (r) => Number(r.rating) === star
        ).length,
      }));

      return res.status(200).json({
        average,
        total,
        breakdown,
        reviews,
      });
    }

    if (req.method === "POST") {
      const { name, rating, title, body } = req.body || {};

      if (!name || !rating || !body) {
        return res.status(400).json({
          error:
            "Naam, rating aur review likhna zaroori hai",
        });
      }

      if (Number(rating) < 1 || Number(rating) > 5) {
        return res.status(400).json({
          error:
            "Rating 1 se 5 ke beech honi chahiye",
        });
      }

      const reviews = await getReviews(gid);

      const newReview = {
        id: crypto.randomUUID(),
        name: String(name).slice(0, 80),
        rating: Number(rating),
        title: String(title || "").slice(0, 120),
        body: String(body).slice(0, 2000),
        date: new Date().toISOString(),
        approved: true,
      };

      reviews.unshift(newReview);

      await saveReviews(gid, reviews);

      return res.status(200).json({
        success: true,
        review: newReview,
      });
    }

    return res.status(405).json({
      error: "Method not allowed",
    });
  } catch (err) {
    console.error("REVIEWS API ERROR:", err);

    return res.status(500).json({
      error: "Server error, dobara try karein",
    });
  }
}
