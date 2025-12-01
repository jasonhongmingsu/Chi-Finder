import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom"; // Added useNavigate
import { createPageUrl } from "@/utils";
import {
  User as UserIcon,
  ChevronRight,
  Star,
  Ticket,
  History,
  ShoppingBag,
  LogOut,
  Settings,
  Phone,
  Mail,
  Trophy,
  Sparkles,
  Zap,
  Heart,
  Package,
  Gauge,
  Wallet, // Added Wallet icon
  TrendingUp, // Added TrendingUp icon
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import PointsBalance from "../components/rewards/PointsBalance";
import { useQuery } from "@tanstack/react-query";

export default function Profile() {
  const navigate = useNavigate(); // Declared useNavigate
  const [user, setUser] = useState(null);

  const { data: allTransactions = [] } = useQuery({
    queryKey: ["allPointsTransactions", user?.email],
    queryFn: () =>
      base44.entities.PointsTransaction.filter(
        { user_email: user?.email }
      ),
    enabled: !!user?.email,
    initialData: [],
  });

  const calculatedPoints = allTransactions.reduce((sum, t) => sum + (t.points_amount || 0), 0);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  const { data: wishlistCount = 0 } = useQuery({
    queryKey: ["wishlistCount", user?.email],
    queryFn: async () => {
      const items = await base44.entities.Wishlist.filter({ user_email: user?.email });
      return items.length;
    },
    enabled: !!user?.email,
    initialData: 0,
  });

  const handleLogout = async () => {
    if (confirm("Are you sure you want to logout?")) {
      await base44.auth.logout();
      navigate("/login"); // Redirect after logout
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-20 h-20 gradient-rainbow rounded-full flex items-center justify-center float-animation">
          <div className="animate-pulse text-[#00C781] font-bold">Loading...</div> {/* Updated loading UI */}
        </div>
      </div>
    );
  }

  const menuItems = [
    {
      title: "Purchase History",
      icon: ShoppingBag,
      path: createPageUrl("PurchaseHistory"),
      color: "#00D9FF",
      badge: user.total_purchases || 0,
    },
    {
      title: "My Wishlist",
      icon: Heart,
      path: createPageUrl("Wishlist"),
      color: "#FF6B9D",
      badge: wishlistCount,
    },
    {
      title: "My Coupons",
      icon: Ticket,
      path: createPageUrl("Rewards"),
      color: "#FFB800",
    },
    {
      title: "Wallet & Recharge",
      icon: Wallet,
      path: createPageUrl("Recharge"),
      color: "#00C781",
      badge: `¥${user.wallet_balance || 0}`,
    },
  ];

  if (user.role === "admin") {
    menuItems.push({
      title: "Operator Dashboard",
      icon: Gauge, // Changed from Settings to Gauge for consistency with prev implementation if Gauge icon was for this.
      path: createPageUrl("OperatorDashboard"),
      color: "#9B6BFF",
    });
    menuItems.push({
      title: "AI Analytics",
      icon: TrendingUp,
      path: createPageUrl("AIAnalytics"),
      color: "#6366F1",
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="gradient-rainbow text-white px-6 pt-8 pb-6 gradient-animate">
        <h1 className="text-3xl font-bold mb-6" style={{textShadow: '0 2px 10px rgba(0,0,0,0.1)'}}>
          My Profile 👤
        </h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
        >
          <Card className="glassmorphism text-gray-900 p-6 border-2 border-white shadow-colorful rounded-3xl">
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback className="gradient-sky text-white text-3xl font-black">
                  {user.full_name?.charAt(0) || user.email?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-2xl font-black mb-1">{user.full_name || "User"}</h2>
                <p className="text-gray-600 text-sm font-medium">{user.email}</p>
                {user.role === "admin" && (
                  <Badge className="gradient-lemon text-white border-none shadow-lg mt-2 font-bold">
                    ⭐ Operator
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-4 border-t-2 border-gray-200">
              <Link to={createPageUrl("Rewards")} className="text-center">
                <div className="w-14 h-14 gradient-lemon rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-lg">
                  <Star className="w-7 h-7 text-white" fill="currentColor" />
                </div>
                <p className="text-2xl font-black text-gray-900">{calculatedPoints || 0}</p>
                <p className="text-xs text-gray-500 mt-1 font-semibold">Points</p>
              </Link>
              <Link to={createPageUrl("PurchaseHistory")} className="text-center">
                <div className="w-14 h-14 gradient-turquoise rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-lg">
                  <ShoppingBag className="w-7 h-7 text-white" />
                </div>
                <p className="text-2xl font-black text-gray-900">{user.total_purchases || 0}</p>
                <p className="text-xs text-gray-500 mt-1 font-semibold">Orders</p>
              </Link>
              <Link to={createPageUrl("Wishlist")} className="text-center">
                <div className="w-14 h-14 gradient-peach rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-lg">
                  <Heart className="w-7 h-7 text-white" fill="currentColor" />
                </div>
                <p className="text-2xl font-black text-gray-900">{wishlistCount}</p>
                <p className="text-xs text-gray-500 mt-1 font-semibold">Wishlist</p>
              </Link>
            </div>
          </Card>
        </motion.div>
      </div>

      <div className="px-6 py-6">
        <Link to={createPageUrl("Rewards")}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.03, y: -5 }}
            whileTap={{ scale: 0.98 }}
            className="mb-6"
          >
            <Card className="p-6 border-none shadow-colorful gradient-rainbow text-white overflow-hidden relative rounded-3xl gradient-animate">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-16 -translate-x-16" />
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg">
                      <Trophy className="w-9 h-9 text-yellow-200" />
                    </div>
                    <div>
                      <p className="text-sm text-white/95 font-bold">Total Points</p>
                      <p className="text-4xl font-black mt-1" style={{textShadow: '0 2px 8px rgba(0,0,0,0.2)'}}>{calculatedPoints || 0}</p>
                    </div>
                  </div>
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  >
                    <Zap className="w-10 h-10 text-yellow-200" fill="currentColor" />
                  </motion.div>
                </div>
                <p className="text-sm text-white/95 mt-4 font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Tap to redeem amazing rewards! 🎉
                </p>
              </div>
            </Card>
          </motion.div>
        </Link>

        <Card className="mb-6 border-2 border-white shadow-vibrant overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm">
          <div className="divide-y-2 divide-gray-100">
            {menuItems.map((item, index) => (
              <Link key={item.title} to={item.path}>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ x: 5 }}
                  className="flex items-center gap-4 p-5 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200"
                >
                  <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg" style={{ backgroundColor: item.color }}>
                    <item.icon className="w-7 h-7 text-white" />
                    {item.badge !== undefined && (typeof item.badge === 'string' || item.badge > 0) && (
                      <Badge className="absolute -top-2 -right-2 min-w-[20px] h-[20px] p-0 flex items-center justify-center text-xs font-bold bg-white text-gray-800 border border-gray-200 rounded-full">
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-base">{item.title}</p>
                    {item.badge !== undefined && typeof item.badge === 'string' && (
                        <p className="text-xs text-gray-500 font-medium mt-0.5">{item.badge}</p>
                    )}
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-400" />
                </motion.div>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-5 mb-6 border-2 border-white shadow-md rounded-3xl bg-white/80 backdrop-blur-sm">
          <h3 className="font-black text-gray-900 mb-4 text-lg">Account Info 📋</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-5 h-5 text-[#00D9FF]" />
              <span className="text-gray-600 font-semibold">Email:</span>
              <span className="text-gray-900 font-bold">{user.email}</span>
            </div>
            {user.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-5 h-5 text-[#FF6B9D]" />
                <span className="text-gray-600 font-semibold">Phone:</span>
                <span className="text-gray-900 font-bold">{user.phone}</span>
              </div>
            )}
            {user.role && (
              <div className="flex items-center gap-3 text-sm">
                <Settings className="w-5 h-5 text-[#9B6BFF]" />
                <span className="text-gray-600 font-semibold">Role:</span>
                <span className="text-gray-900 font-bold capitalize">{user.role}</span>
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-14 rounded-2xl border-2 font-semibold hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50"
          >
            <Settings className="w-6 h-6 text-[#9B6BFF]" />
            <span className="flex-1 text-left">Settings</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Button>
          
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-14 rounded-2xl text-red-500 border-2 border-red-200 hover:bg-red-50 font-semibold"
            onClick={handleLogout}
          >
            <LogOut className="w-6 h-6" />
            <span className="flex-1 text-left">Logout</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
