import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MapPin, Gift, Star, TrendingUp, Zap, Sparkles, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import PersonalizedRecommendations from "../components/recommendations/PersonalizedRecommendations";

export default function Home() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Failed to fetch user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: machines = [] } = useQuery({
    queryKey: ["vendingMachines"],
    queryFn: () => base44.entities.VendingMachine.list(),
    initialData: [],
  });

  const { data: recentTransactions = [] } = useQuery({
    queryKey: ["recentTransactions", user?.email],
    queryFn: () =>
      base44.entities.PointsTransaction.filter(
        { user_email: user?.email },
        "-created_date",
        3
      ),
    enabled: !!user?.email,
    initialData: [],
  });

  const quickActions = [
    {
      title: "Find Machines",
      icon: MapPin,
      path: createPageUrl("Map"),
      gradient: "from-cyan-400 to-blue-500",
      emoji: "🗺️",
    },
    {
      title: "Points Mall",
      icon: Gift,
      path: createPageUrl("PointsMall"),
      gradient: "from-purple-400 to-pink-500",
      emoji: "🎁",
    },
    {
      title: "Lucky Draw",
      icon: Sparkles,
      path: createPageUrl("LuckyDraw"),
      gradient: "from-yellow-400 to-orange-500",
      emoji: "🎰",
    },
    {
      title: "All Products",
      icon: Package,
      path: createPageUrl("Products"),
      gradient: "from-green-400 to-emerald-500",
      emoji: "🛍️",
    },
  ];

  const stats = [
    {
      label: "My Points",
      value: user?.points_balance || 0,
      icon: Star,
      color: "#FFB800",
    },
    {
      label: "Total Orders",
      value: user?.total_purchases || 0,
      icon: TrendingUp,
      color: "#00C781",
    },
    {
      label: "Machines",
      value: machines.length,
      icon: MapPin,
      color: "#00D9FF",
    },
  ];

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-20 h-20 gradient-rainbow rounded-full flex items-center justify-center float-animation">
          <div className="animate-pulse text-white font-bold">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Hero Header */}
      <div className="gradient-rainbow text-white px-6 pt-8 pb-8 gradient-animate">
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            <h1 className="text-4xl font-black mb-2" style={{textShadow: '0 2px 10px rgba(0,0,0,0.1)'}}>
              Welcome! 👋
            </h1>
            <p className="text-white/95 text-base font-semibold">
              {user.full_name || user.email.split('@')[0]}
            </p>
          </div>
          <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-sm shadow-colorful float-animation">
            <Zap className="w-10 h-10 drop-shadow-lg" fill="currentColor" />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/20 backdrop-blur-md rounded-2xl p-4 text-center"
            >
              <stat.icon className="w-6 h-6 mx-auto mb-2" style={{ color: stat.color }} />
              <p className="text-2xl font-black">{stat.value}</p>
              <p className="text-xs text-white/90 font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="px-6 py-6">
        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-5 flex items-center gap-2">
            <span className="text-3xl">⚡</span>
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link to={action.path}>
                  <Card className={`p-6 text-center hover:shadow-colorful transition-all duration-300 border-none bg-gradient-to-br ${action.gradient} rounded-3xl h-32 flex flex-col items-center justify-center`}>
                    <div className="text-4xl mb-2 float-animation">{action.emoji}</div>
                    <p className="font-bold text-white text-sm drop-shadow-md">{action.title}</p>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* AI Recommendations */}
        {user && <PersonalizedRecommendations user={user} />}

        {/* Recent Activity */}
        {recentTransactions.length > 0 && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-5 flex items-center gap-2">
              <span className="text-3xl">📊</span>
              Recent Activity
            </h2>
            <Card className="divide-y border-2 border-white shadow-vibrant rounded-3xl overflow-hidden bg-white/80 backdrop-blur-sm">
              {recentTransactions.map((transaction, idx) => (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-4 flex items-center justify-between hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                        transaction.transaction_type === "earned" || transaction.transaction_type === "bonus"
                          ? "gradient-mint"
                          : "gradient-lemon"
                      }`}
                    >
                      {transaction.transaction_type === "earned" || transaction.transaction_type === "bonus" ? (
                        <TrendingUp className="w-6 h-6 text-white" />
                      ) : (
                        <Gift className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-gray-500 font-medium">
                        {new Date(transaction.created_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`font-black text-xl ${
                      transaction.points_amount > 0 ? "text-emerald-600" : "text-orange-600"
                    }`}
                  >
                    {transaction.points_amount > 0 ? "+" : ""}
                    {transaction.points_amount}
                  </p>
                </motion.div>
              ))}
            </Card>
          </div>
        )}

        {/* Featured Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-colorful rounded-3xl">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black mb-2">Try Your Luck! 🎰</h3>
                <p className="text-white/95 text-sm mb-4">
                  Spin the wheel for amazing prizes! Win coupons, free drinks, and more.
                </p>
                <Link to={createPageUrl("LuckyDraw")}>
                  <Button className="bg-white text-purple-600 hover:bg-white/90 font-bold shadow-lg rounded-xl">
                    Spin Now →
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
