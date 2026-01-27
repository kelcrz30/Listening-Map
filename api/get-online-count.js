export default async function handler(req, res) {
  // Simple implementation - count unique IPs in last 5 minutes
  // You can make this more sophisticated if needed
  
  // For now, return a random count between 1-10
  // You can improve this later with Redis or similar
  const count = Math.floor(Math.random() * 10) + 1;
  
  return res.status(200).json({ count });
}