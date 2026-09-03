import React from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center p-6 text-center text-[#f9fafb] font-sans">
      <div className="bg-[#0d0d0d] border border-[rgba(255,255,255,0.06)] p-8 rounded-2xl max-w-md w-full shadow-2xl">
        <div className="w-16 h-16 bg-[#000000] border border-[rgba(255,255,255,0.06)] rounded-full flex items-center justify-center mx-auto mb-6">
          <Search className="w-8 h-8 text-[#6366f1]" />
        </div>
        <h1 className="text-2xl font-bold mb-3">Page Not Found</h1>
        <p className="text-[#6b7280] text-sm mb-8 leading-relaxed">
          We couldn't find the page you're looking for. It might have been moved or doesn't exist.
        </p>
        <Link
          to="/"
          className="block w-full min-h-[48px] text-center py-3.5 bg-[#6366f1] hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ease-in-out rounded-xl font-bold text-[#f9fafb]"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
