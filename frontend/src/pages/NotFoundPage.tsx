import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center px-4 py-12">
      <div className="text-center">
        <div className="flex justify-center">
          <div className="h-24 w-24 bg-error-100 rounded-full flex items-center justify-center text-error-600">
            <AlertTriangle size={48} />
          </div>
        </div>
        
        <h1 className="mt-6 text-3xl font-extrabold text-gray-900 sm:text-5xl">Page not found</h1>
        <p className="mt-3 text-xl text-gray-500">Sorry, we couldn't find the page you're looking for.</p>
        
        <div className="mt-8">
          <Link
            to="/"
            className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-6 rounded-md transition duration-150 ease-in-out"
          >
            Go back home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;