// pages/api/logout.js
export default async function handler(req, res) {
  res.setHeader("Set-Cookie", "sb-access-token=; Max-Age=0; path=/;");
  res.status(200).json({ message: "Logged out" });
}
