import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar: FC = () => {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const isHomePage = location.pathname === '/';

  // On homepage: listen to scroll to switch transparent → solid.
  // On other pages: reset scrolled so navbar is always solid.
  useEffect(() => {
    if (!isHomePage) {
      setScrolled(false);
      return;
    }
    const handleScroll = () => setScrolled(window.scrollY > 80);
    handleScroll(); // check on mount in case already scrolled
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHomePage]);

  const isTransparent = isHomePage && !scrolled;
  const isActive = (path: string) => location.pathname === path;

  // Link classes flip between white-on-transparent and gray-on-solid
  const linkClasses = (path: string) => {
    const base = 'px-4 py-2 rounded-lg font-medium transition-colors';
    if (isTransparent) {
      return isActive(path)
        ? `${base} bg-white/20 text-white`
        : `${base} text-white/80 hover:text-white hover:bg-white/10`;
    }
    return isActive(path)
      ? `${base} bg-blue-600 text-white`
      : `${base} text-gray-700 hover:bg-gray-100`;
  };

  return (
    <nav
      className={[
        isHomePage ? 'fixed top-0 left-0 right-0 z-50' : 'relative',
        'transition-colors duration-300',
        isTransparent ? 'bg-transparent' : 'bg-white border-b border-gray-200 shadow-sm',
      ].join(' ')}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300 ${
                isTransparent ? 'bg-white/20' : 'bg-gradient-to-br from-blue-500 to-blue-600'
              }`}
            >
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <span
              className={`text-xl font-bold transition-colors duration-300 ${
                isTransparent ? 'text-white' : 'text-gray-900'
              }`}
            >
              TripMind
            </span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center space-x-2">
            <Link to="/"      className={linkClasses('/')}>Home</Link>
            <Link to="/trips" className={linkClasses('/trips')}>My Trips</Link>
            <Link to="/chat"  className={linkClasses('/chat')}>Chat</Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;