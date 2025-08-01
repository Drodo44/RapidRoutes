// pages/unauthorized.js
export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#111827] text-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-red-500">Access Denied</h1>
        <p className="text-gray-300">You do not have permission to view this page.</p>
      </div>
    </div>
  );
}
