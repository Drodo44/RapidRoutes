// /pages/404.js
export default function Custom404() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center">
      <h1 className="text-6xl text-red-400 font-bold">404</h1>
      <p className="text-xl mt-4">Page Not Found</p>
      <a href="/" className="mt-6 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white">
        Go Home
      </a>
    </main>
  );
}
