import React, { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setIsProfileDropdownOpen(false); // Close the dropdown
      toast.success("Logged out successfully");
      navigate("/");
    } catch (error) {
      toast.error("Failed to logout");
      console.error("Logout error:", error);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
          profileDropdownRef.current &&
          !profileDropdownRef.current.contains(event.target)
      ) {
        setIsProfileDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getNavLinks = () => {
    const commonLinks = [
      { to: "/", text: "Home" },
      { to: "/events", text: "Events" },
    ];

    if (!user) return commonLinks;

    switch (user.role) {
      case "System Admin":
        return [
          ...commonLinks,
          { to: "/admin/events", text: "Manage Events" },
          { to: "/admin/users", text: "Manage Users" },
        ];
      case "Organizer":
        return [
          ...commonLinks,
          { to: "/my-events", text: "My Events" },
          { to: "/my-events/new", text: "Create Event" },
        ];
      case "Standard User":
        return [
          ...commonLinks,
          { to: "/bookings", text: "My Bookings" },
        ];
      default:
        return commonLinks;
    }
  };

  return (
      <div className="w-full bg-neutral-950 border-b border-amber-500/20 shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <nav className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 group">
              <img
                src="/enactus-logo.png"
                alt="Enactus Logo"
                className="h-10 w-10 rounded-md object-contain border border-amber-500/40 shadow-sm"
              />
              <span className="text-xl font-bold text-amber-400 group-hover:text-amber-300 transition-colors">
                Enactus Event Ticket Manager
              </span>
            </Link>

            {/* Mobile Menu Button */}
            <button
                onClick={toggleMenu}
                className="md:hidden focus:outline-none p-1 rounded hover:bg-neutral-900"
                aria-label="Toggle menu"
            >
              <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-gray-200 hover:text-amber-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
              >
                {isMenuOpen ? (
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                    />
                ) : (
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                    />
                )}
              </svg>
            </button>

            {/* Desktop Navigation Links */}
            <ul className="hidden md:flex space-x-8">
              {getNavLinks().map((link, index) => (
                  <li key={index}>
                    <Link
                        to={link.to}
                        className="text-gray-300 hover:text-amber-400 font-medium transition-colors"
                    >
                      {link.text}
                    </Link>
                  </li>
              ))}
            </ul>

            {/* Profile Icon with Dropdown (desktop) */}
            <div className="hidden md:flex items-center" ref={profileDropdownRef}>
              <button
                  onClick={toggleProfileDropdown}
                  className="p-2 rounded-full hover:bg-neutral-800 text-gray-200 hover:text-amber-400 focus:outline-none transition-colors"
                  aria-label="Account options"
              >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                  <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </button>

              {/* Profile dropdown */}
              {isProfileDropdownOpen && (
                  <div className="absolute right-4 mt-36 w-48 bg-neutral-900 rounded-md shadow-xl py-1 z-50 border border-neutral-700">
                    {user ? (
                        <>
                          <Link
                              to="/profile"
                              className="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-800 hover:text-amber-400"
                          >
                            Profile
                          </Link>
                          <button
                              onClick={handleLogout}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-neutral-800 hover:text-amber-400"
                          >
                            Logout
                          </button>
                        </>
                    ) : (
                        <>
                          <Link
                              to="/login"
                              className="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-800 hover:text-amber-400"
                          >
                            Login
                          </Link>
                          <Link
                              to="/register"
                              className="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-800 hover:text-amber-400"
                          >
                            Register
                          </Link>
                        </>
                    )}
                  </div>
              )}
            </div>
          </nav>

          {/* Mobile Menu */}
          {isMenuOpen && (
              <div className="md:hidden py-4 border-t border-neutral-800">
                <ul className="flex flex-col space-y-4">
                  {getNavLinks().map((link, index) => (
                      <li key={index}>
                        <Link
                            to={link.to}
                            className="block text-gray-300 hover:text-amber-400 font-medium transition-colors"
                        >
                          {link.text}
                        </Link>
                      </li>
                  ))}
                  {user ? (
                      <>
                        <li>
                          <Link
                              to="/profile"
                              className="block text-gray-300 hover:text-amber-400 font-medium transition-colors"
                          >
                            Profile
                          </Link>
                        </li>
                        <li>
                          <button
                              onClick={handleLogout}
                              className="block w-full text-left text-gray-300 hover:text-amber-400 font-medium transition-colors"
                          >
                            Logout
                          </button>
                        </li>
                      </>
                  ) : (
                      <>
                        <li>
                          <Link
                              to="/login"
                              className="block text-gray-300 hover:text-amber-400 font-medium transition-colors"
                          >
                            Login
                          </Link>
                        </li>
                        <li>
                          <Link
                              to="/register"
                              className="block text-gray-300 hover:text-amber-400 font-medium transition-colors"
                          >
                            Register
                          </Link>
                        </li>
                      </>
                  )}
                </ul>
              </div>
          )}
        </div>
      </div>
  );
}

export default Navbar;
