import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Search, Bot, ScanLine, Camera, GitCompare, Settings, Menu, X, Leaf } from 'lucide-react';
import { useComparison } from '../context/ComparisonContext';

const NavLink = ({ to, icon: Icon, children, badge }) => {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to) && (to !== '/' || location.pathname === '/');
  
  return (
    <Link 
      to={to} 
      className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        isActive 
          ? 'bg-green-50 text-green-700 shadow-sm' 
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <Icon className={`w-4 h-4 mr-2 ${isActive ? 'text-green-600' : 'text-gray-500'}`} />
      {children}
      {badge !== undefined && badge > 0 && (
        <span className={`ml-2 flex items-center justify-center min-w-5 h-5 px-1.5 text-[10px] font-bold rounded-full ${
          isActive ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-700'
        }`}>
          {badge}
        </span>
      )}
    </Link>
  );
};

const MainLayout = () => {
  const { getProductCount } = useComparison();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { to: '/search', icon: Search, label: 'Search' },
    { to: '/assistant', icon: Bot, label: 'AI Assistant' },
    { to: '/scanner', icon: ScanLine, label: 'Scan Barcode' },
    { to: '/ocr', icon: Camera, label: 'Scan Label' },
    { to: '/compare', icon: GitCompare, label: 'Compare', badge: getProductCount() },
    { to: '/preferences', icon: Settings, label: 'Preferences' }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 font-sans selection:bg-green-100">
      {/* Header with glassmorphism */}
      <header className="sticky top-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0 flex items-center gap-2 group">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-700 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300 transform group-hover:-translate-y-0.5">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-green-700 to-emerald-900">
                SmartChoice
              </span>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex space-x-2 items-center">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} icon={item.icon} badge={item.badge}>
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* Mobile menu button */}
            <div className="lg:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500 transition-colors"
                aria-expanded={mobileMenuOpen}
              >
                <span className="sr-only">Open main menu</span>
                {mobileMenuOpen ? (
                  <X className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${mobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-4 pt-2 pb-4 space-y-1 bg-white border-t border-gray-100 shadow-inner">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center w-full px-3 py-3 rounded-lg text-base font-medium text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
                >
                  <Icon className="w-5 h-5 mr-3 text-gray-400" />
                  {item.label}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-auto bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0 opacity-80">
              <Leaf className="w-4 h-4 text-green-600" />
              <span className="font-bold text-gray-900 tracking-tight">SmartChoice</span>
            </div>
            <p className="text-center text-sm text-gray-500">
              &copy; {new Date().getFullYear()} SmartChoice. Product intelligence platform.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
