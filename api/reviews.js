
/**
 * ONE FILE = POORA BACKEND.
 * Vercel pe deploy karo, bas 2 environment variables set karne hain.
 * Koi Express, koi extra setup nahi. Koi Shopify App Proxy bhi nahi chahiye —
 * ye function seedha apne khud ke URL (https://xxx.vercel.app/api/reviews)
 * par requests leta hai, theme se seedha fetch hoga.
 *
 * ENV VARS (Vercel dashboard > Settings > Environment Variables):
 *   SHOPIFY_STORE_DOMAIN = yourstore.myshopify.com
 *   SHOPIFY_ADMIN_TOKEN  = shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
 */

const METAFIELD_NAMESPACE = "reviews_app";
const METAFIELD_KEY = "reviews_data";
const ADMIN_API_VERSION = "2024-10";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function shopifyGraphQL(query, variables) {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_TOKEN;

  const r = await fetch(`https://${domain}/admin/api/${ADMIN_API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await r.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

function toGid(id) {
  return id.toString().startsWith("gid://") ? id : `gid://shopify/Product/${id}`;
}

async function getReviews(gid) {
  const data = await shopifyGraphQL(
    `query($id: ID!) {
      product(id: $id) {
        metafield(namespace: "${METAFIELD_NAMESPACE}", key: "${METAFIELD_KEY}") { value }
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
      metafieldsSet(metafields: $metafields) { userErrors { field message } }
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
  if (errs?.length) throw new Error(JSON.stringify(errs));
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const productId = req.query.productId;
  if (!productId) return res.status(400).json({ error: "productId missing" });

  const gid = toGid(productId);

  try {
    if (req.method === "GET") {
      const reviews = (await getReviews(gid)).filter((r) => r.approved !== false);
      const total = reviews.length;
      const average = total
        ? Number((reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(1))
        : 0;
      const breakdown = [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: reviews.filter((r) => r.rating === star).length,
      }));
      return res.status(200).json({ average, total, breakdown, reviews });
    }

    if (req.method === "POST") {
      const { name, rating, title, body } = req.body || {};
      if (!name || !rating || !body) {
        return res.status(400).json({ error: "Naam, rating aur review likhna zaroori hai" });
      }
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Rating 1 se 5 ke beech honi chahiye" });
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
      return res.status(200).json({ success: true, review: newReview });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error, dobara try karein" });
  }
}
