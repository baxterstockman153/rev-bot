import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const kb = JSON.parse(readFileSync(join(__dirname, '../ref/nrg_knowledge_base.json'), 'utf-8'));

// Flatten all products into a single array with category metadata
const allProducts = Object.entries(kb.products).flatMap(([category, items]) =>
  items.map(item => ({ ...item, _category: category }))
);

// Dummy orders for lookup (knowledge base has no orders section)
const orders = [
  {
    id: 'NRG-10042',
    customer: { name: 'Alex Rivera', email: 'alex.rivera@email.com' },
    status: 'Shipped',
    tracking: '1Z999AA10123456784',
    carrier: 'UPS',
    estimated_delivery: '2026-03-05',
    items: [
      { part_number: 'RST-006RD', name: 'NRG Deep Black Leather 350mm Reinforced Steering Wheel - Red Center', qty: 1, price: 147.40 },
      { part_number: 'QR-S3-BK', name: 'NRG 2.0 Quick Release - Black Body', qty: 1, price: 65.00 },
    ],
    total: 212.40,
    placed_at: '2026-02-26',
  },
  {
    id: 'NRG-10051',
    customer: { name: 'Jordan Lee', email: 'jordan.lee@email.com' },
    status: 'Processing',
    tracking: null,
    carrier: null,
    estimated_delivery: null,
    items: [
      { part_number: 'JJR-2025', name: 'Jeff Jones Racing Signature Steering Wheel 2025', qty: 1, price: 220.00 },
    ],
    total: 220.00,
    placed_at: '2026-03-01',
  },
  {
    id: 'NRG-10038',
    customer: { name: 'Sam Torres', email: 'sam.torres@email.com' },
    status: 'Delivered',
    tracking: '1Z999AA10123456711',
    carrier: 'UPS',
    estimated_delivery: '2026-02-20',
    items: [
      { part_number: 'FRP-501CFBK', name: 'NRG FRP Fiberglass & Suede Bolster Bucket Seat - Medium', qty: 1, price: 599.00 },
    ],
    total: 599.00,
    placed_at: '2026-02-14',
  },
];

/**
 * Find an order by order ID or customer email (case-insensitive).
 */
export function lookupOrder(identifier) {
  const normalized = identifier.trim().toLowerCase();
  const order = orders.find(
    o =>
      o.id.toLowerCase() === normalized ||
      o.customer.email.toLowerCase() === normalized
  );
  if (!order) {
    return { found: false, message: `No order found for "${identifier}". Please double-check the order number or email address.` };
  }
  return { found: true, order };
}

/**
 * Search products by query string across name, part_number, description, material, and color.
 * Optionally filter by category. Returns up to 5 results.
 * If query hints at policies, also returns the relevant policy section.
 */
export function searchProducts(query, category) {
  const q = query.toLowerCase();

  let results = allProducts;
  if (category) {
    // Normalize category: "steering_wheels" or "steering wheels" etc.
    const normalizedCat = category.toLowerCase().replace(/[\s-]/g, '_');
    results = results.filter(p => p._category === normalizedCat);
  }

  results = results.filter(p => {
    const searchable = [
      p.name,
      p.part_number,
      p.description,
      p.material,
      p.color,
      p._category,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return q.split(' ').some(word => word.length > 2 && searchable.includes(word));
  });

  const products = results.slice(0, 5).map(({ _category, ...rest }) => rest);

  // Check if the query relates to a policy topic
  const policyHints = {
    return: kb.policies.returns,
    warranty: kb.policies.warranty,
    ship: kb.policies.shipping,
    delivery: kb.policies.shipping,
  };

  let policy = null;
  for (const [keyword, policyData] of Object.entries(policyHints)) {
    if (q.includes(keyword)) {
      policy = policyData;
      break;
    }
  }

  return { products, policy };
}
