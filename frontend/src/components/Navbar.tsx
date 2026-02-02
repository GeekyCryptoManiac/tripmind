import type { FC } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar: FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const linkClasses = (path: string) => {
    const base = "px-4 py-2 rounded-lg font-medium transition-colors";
    if (isActive(path)) {
      return `${base} bg-blue-600 text-white`;
    }
    return `${base} text-gray-700 hover:bg-gray-100`;
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <span className="text-xl font-bold text-gray-900">TripMind</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-2">
            <Link to="/" className={linkClasses('/')}>
              Home
            </Link>
            <Link to="/trips" className={linkClasses('/trips')}>
              My Trips
            </Link>
            <Link to="/chat" className={linkClasses('/chat')}>
              Chat
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;