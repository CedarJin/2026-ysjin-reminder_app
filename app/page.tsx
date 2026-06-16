import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-4">Clinical Trial Reminder System</h1>
      <p className="text-gray-600 mb-8">Participant timeline and reminder subscription system</p>
      <Link
        href="/dashboard"
        className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Open Dashboard
      </Link>
    </main>
  );
}
