// /pages/register.js
import { useState } from "react";

export default function Register() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email && name && password) {
      setMessage("Registered! (Demo placeholder)");
    } else {
      setMessage("All fields are required.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="card">
        <img src="/logo.png" alt="RapidRoutes Logo" className="mx-auto w-32 mb-4" />
        <h2 className="text-cyan-400 text-2xl font-bold mb-4">Register for RapidRoutes</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 text-white" />
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 text-white" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 text-white" />
          <button type="submit"
            className="w-full p-3 bg-green-600 hover:bg-green-700 rounded-lg text-white font-semibold">
            Register
          </button>
          {message && <p className="text-cyan-400">{message}</p>}
          <a href="/login" className="text-cyan-400 hover:underline text-center">Back to Login</a>
        </form>
      </div>
    </div>
  );
}
