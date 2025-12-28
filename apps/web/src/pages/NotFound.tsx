export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-xl mb-6">Page not found</p>
        <a href="#/" className="px-6 py-3 bg-white text-black rounded-full inline-block hover:bg-gray-200">Go Home</a>
      </div>
    </div>
  );
}
