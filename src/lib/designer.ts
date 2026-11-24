// Where the customer-facing designer app runs. The back office frames its /embed/item page for template previews.
export const DESIGNER_URL = (process.env.DESIGNER_URL || "https://roomcraft-sable.vercel.app").replace(/\/$/, "");
