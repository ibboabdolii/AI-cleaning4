export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <nav className="p-6 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">CleanAI</h1>
          <a href="#/login" className="px-4 py-2 bg-white text-black rounded-full hover:bg-gray-200">Login</a>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="text-6xl font-bold mb-6">AI-Powered Cleaning</h2>
        <p className="text-xl text-gray-400 mb-8">Smart booking across Europe</p>
        <a href="#/pricing" className="px-8 py-3 bg-white text-black rounded-full font-semibold inline-block hover:bg-gray-200">
          View Pricing
        </a>
      </main>
    </div>
  );
}
