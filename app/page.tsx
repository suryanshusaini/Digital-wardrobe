import UploadCard from "../components/ui/UploadCard";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f8f7f5] text-gray-900 p-8">
      <header className="flex justify-between items-center mb-12">
        <h1 className="text-3xl font-light tracking-tight">My Wardrobe</h1>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {/* The Upload Component */}
        <UploadCard />

        {/* Placeholder for future processed items */}
      </section>
    </main>
  );
}
