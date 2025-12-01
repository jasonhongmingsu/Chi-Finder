import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, ShoppingBag, Gift, User, MapPin, Package } from "lucide-react";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();

  const navItems = [
    { name: "Home", path: createPageUrl("Home"), icon: Home, color: "#00D9FF" },
    { name: "Products", path: createPageUrl("Products"), icon: Package, color: "#9B6BFF" },
    { name: "Map", path: createPageUrl("Map"), icon: MapPin, color: "#00C781" },
    { name: "Rewards", path: createPageUrl("Rewards"), icon: Gift, color: "#FFB800" },
    { name: "Profile", path: createPageUrl("Profile"), icon: User, color: "#FF6B9D" },
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 pb-20">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
        
        :root {
          --color-turquoise: #00D9FF;
          --color-peach: #FF6B9D;
          --color-lemon: #FFB800;
          --color-mint: #00C781;
          --color-sky: #9B6BFF;
          --genki-green: #00C781;
        }
        
        * {
          -webkit-tap-highlight-color: transparent;
          font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        .genki-gradient {
          background: linear-gradient(135deg, #00D9FF 0%, #00C781 50%, #FFB800 100%);
        }
        
        .gradient-turquoise {
          background: linear-gradient(135deg, #00D9FF 0%, #00B8D4 100%);
        }
        
        .gradient-peach {
          background: linear-gradient(135deg, #FF6B9D 0%, #FF5252 100%);
        }
        
        .gradient-lemon {
          background: linear-gradient(135deg, #FFB800 0%, #FF9500 100%);
        }
        
        .gradient-mint {
          background: linear-gradient(135deg, #00C781 0%, #00A06E 100%);
        }
        
        .gradient-sky {
          background: linear-gradient(135deg, #9B6BFF 0%, #7C3AED 100%);
        }
        
        .gradient-rainbow {
          background: linear-gradient(135deg, #00D9FF 0%, #00C781 25%, #FFB800 50%, #FF6B9D 75%, #9B6BFF 100%);
        }
        
        .glassmorphism {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.5);
        }
        
        .shadow-vibrant {
          box-shadow: 0 8px 32px rgba(0, 217, 255, 0.15), 0 4px 16px rgba(255, 107, 157, 0.1);
        }
        
        .shadow-colorful {
          box-shadow: 0 10px 40px rgba(155, 107, 255, 0.2);
        }
        
        .nav-active {
          transform: scale(1.1);
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        .float-animation {
          animation: float 3s ease-in-out infinite;
        }
        
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        .gradient-animate {
          background-size: 200% 200%;
          animation: gradient-shift 3s ease infinite;
        }

        @keyframes pulse-ring {
          0% {
            box-shadow: 0 0 0 0 rgba(0, 217, 255, 0.4);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(0, 217, 255, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(0, 217, 255, 0);
          }
        }
        
        .pulse-ring {
          animation: pulse-ring 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite;
        }
      `}</style>

      <main className="min-h-screen">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 glassmorphism z-50 shadow-vibrant">
        <div className="max-w-md mx-auto flex justify-around items-center h-20 px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className="flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 relative"
              >
                <div
                  className={`flex flex-col items-center justify-center transition-all duration-300 ${
                    active ? "nav-active" : ""
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-1 transition-all duration-300 ${
                      active ? "shadow-colorful pulse-ring" : ""
                    }`}
                    style={{
                      background: active
                        ? `linear-gradient(135deg, ${item.color} 0%, ${item.color}DD 100%)`
                        : "transparent",
                    }}
                  >
                    <Icon
                      className={`w-5 h-5 transition-all duration-300 ${
                        active ? "text-white" : "text-gray-400"
                      }`}
                      strokeWidth={active ? 2.5 : 2}
                    />
                  </div>
                  <span
                    className={`text-[10px] font-semibold transition-all duration-300 ${
                      active ? "" : "text-gray-500"
                    }`}
                    style={{ color: active ? item.color : undefined }}
                  >
                    {item.name}
                  </span>
                </div>
                {active && (
                  <div
                    className="absolute bottom-0 h-1 rounded-t-full transition-all duration-300"
                    style={{
                      width: "60%",
                      background: `linear-gradient(90deg, transparent, ${item.color}, transparent)`,
                    }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
