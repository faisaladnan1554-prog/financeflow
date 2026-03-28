import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center h-full min-h-64">
      <div className="text-center">
        <p className="text-6xl font-bold text-gray-200 mb-2">404</p>
        <p className="text-gray-500 mb-4">Page not found</p>
        <Link href="/dashboard">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            Go to Dashboard
          </button>
        </Link>
      </div>
    </div>
  );
}
