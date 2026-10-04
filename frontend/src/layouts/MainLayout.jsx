import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Search, Heart, User, ScanLine, Camera, GitCompare } from 'lucide-react';
import { useComparison } from '../context/ComparisonContext';

const MainLayout = () => {
  const { getProductCount } = useComparison();
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="font-bold text-xl text-green-600">SmartChoice</span>
            </Link>
            <nav className="flex space-x-4">
              <Link to="/search" className="text-gray-600 hover:text-green-600 flex items-center"><Search className="w-5 h-5 mr-1"/> Search</Link>
              <Link to="/scanner" className="text-gray-600 hover:text-green-600 flex items-center"><ScanLine className="w-5 h-5 mr-1"/> Scan</Link>
              <Link to="/compare" className="text-gray-600 hover:text-green-600 flex items-center">
                <GitCompare className="w-5 h-5 mr-1"/> 
                Compare {getProductCount() > 0 && <span className="ml-1 bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded-full">{getProductCount()}</span>}
              </Link>
              <Link to="/preferences" className="text-gray-600 hover:text-green-600 flex items-center">Preferences</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} SmartChoice. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
