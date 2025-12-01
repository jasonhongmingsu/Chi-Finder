import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Gift, Ticket, TrendingUp, Star, Sparkles, Trophy, Zap, Wallet, History as HistoryIcon, Award } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { motion } from "framer-motion";
import PointsBalance from "../components/rewards/PointsBalance";

export default function Rewards() {
  const navigate = useNavigate();
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
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: coupons = [] } = useQuery({
    queryKey: ["coupons", user?.email],
    queryFn: () =>
      base44.entities.Coupon.filter({ user_email: user?.email, status: "active" }),
    enabled: !!user?.email,
    initialData: [],
  });

  const { data: recentTransactions = [] } = useQuery({
    queryKey: ["pointsTransactions", user?.email],
    queryFn: () =>
      base44.entities.PointsTransaction.filter(
        { user_email: user?.email },
        "-created_date",
        5
      ),
    enabled: !!user?.email,
    initialData: [],
  });

  const { data: luckyDrawHistory = [] } = useQuery({
    queryKey: ["luckyDrawHistory", user?.email],
    queryFn: () =>
      base44.entities.LuckyDrawHistory.filter(
        { user_email: user?.email },
        "-created_date",
        3
      ),
    enabled: !!user?.email,
    initialData: [],
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-20 h-20 gradient-rainbow rounded-full flex items-center justify-center float-animation">
          <div className="animate-pulse text-white font-bold">Loading...</div>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: "Points",
      value: calculatedPoints || 0,
      icon: Star,
      color: "#FFB800",
      gradient: "from-yellow-400 to-orange-500",
    },
    {
      label: "Coupons",
      value: coupons.length,
      icon: Ticket,
      color: "#FF6B9D",
      gradient: "from-pink-400 to-rose-500",
    },
    {
      label: "Wallet",
      value: `¥${user.wallet_balance || 0}`,
      icon: Wallet,
      color: "#00C781",
      gradient: "from-green-400 to-emerald-500",
    },
  ];

  const quickActions = [
    {
      icon: Sparkles,
      label: "Lucky Draw",
      path: createPageUrl("LuckyDraw"),
      gradient: "from-yellow-400 via-orange-400 to-red-400",
      emoji: "🎰",
    },
    {
      icon: Gift,
      label: "Points Mall",
      path: createPageUrl("PointsMall"),
      gradient: "from-purple-400 via-pink-400 to-rose-400",
      emoji: "🎁",
    },
    {
      icon: Wallet,
      label: "Recharge",
      path: createPageUrl("Recharge"),
      gradient: "from-blue-400 via-cyan-400 to-teal-400",
      emoji: "💰",
    },
    {
      icon: HistoryIcon,
      label: "History",
      path: createPageUrl("PurchaseHistory"),
      gradient: "from-indigo-400 via-purple-400 to-pink-400",
      emoji: "📊",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="gradient-rainbow text-white px-6 pt-8 pb-6 gradient-animate">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2" style={{textShadow: '0 2px 10px rgba(0,0,0,0.1)'}}>
          <Trophy className="w-8 h-8 drop-shadow-lg" />
          My Rewards 🎉
        </h1>
        <p className="text-white/95 text-sm font-medium">Collect, Win & Redeem!</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mt-6">
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

      <div className="px-6 -mt-8 pb-6">
        <div className="mb-6">
          <PointsBalance points={calculatedPoints || 0} onTap={() => navigate(createPageUrl("PointsMall"))} />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link to={action.path}>
                <Card className={`p-5 text-center hover:shadow-colorful transition-all duration-300 border-none bg-gradient-to-br ${action.gradient} rounded-3xl`}>
                  <div className="text-4xl mb-2 float-animation">{action.emoji}</div>
                  <p className="font-bold text-white text-sm drop-shadow-md">{action.label}</p>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* How to Earn */}
        <Card className="p-6 mb-6 border-2 border-white shadow-vibrant rounded-3xl bg-gradient-to-br from-emerald-50 to-cyan-50">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 gradient-mint rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <Zap className="w-7 h-7 text-white" fill="currentColor" />
            </div>
            <div className="flex-1">
              <h3 className="font-black text-gray-900 mb-3 text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                How to Earn More
              </h3>
              <ul className="space-y-2 text-sm text-gray-700 font-medium">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 gradient-turquoise rounded-full shadow-md" />
                  Purchase from vending machines
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 gradient-peach rounded-full shadow-md" />
                  Recharge wallet for bonus points
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 gradient-lemon rounded-full shadow-md" />
                  Win prizes from lucky draws
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 gradient-sky rounded-full shadow-md" />
                  Place bulk orders for extra rewards
                </li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Recent Lucky Draws */}
        {luckyDrawHistory.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Recent Wins
              </h2>
              <Link to={createPageUrl("LuckyDraw")}>
                <Button variant="ghost" size="sm" className="text-[#00C781] font-semibold">
                  View All →
                </Button>
              </Link>
            </div>
            <Card className="divide-y border-2 border-white shadow-vibrant rounded-3xl overflow-hidden bg-white/80 backdrop-blur-sm">
              {luckyDrawHistory.map((record, idx) => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-4 flex items-center justify-between hover:bg-gradient-to-r hover:from-yellow-50 hover:to-orange-50 transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-2xl flex items-center justify-center shadow-lg">
                      <Trophy className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">
                        {record.prize_name}
                      </p>
                      <p className="text-xs text-gray-500 font-medium">
                        {format(new Date(record.created_date), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 font-semibold">
                    {record.prize_value}
                  </Badge>
                </motion.div>
              ))}
            </Card>
          </div>
        )}

        {/* My Coupons */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-3xl">🎫</span>
              My Coupons
            </h2>
            <Badge className="gradient-peach text-white border-none shadow-lg font-bold px-3 py-1 rounded-full">
              {coupons.length} active
            </Badge>
          </div>

          {coupons.length > 0 ? (
            <div className="space-y-4">
              {coupons.map((coupon, idx) => (
                <motion.div
                  key={coupon.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ scale: 1.03, rotate: 1 }}
                >
                  <Card className="p-0 overflow-hidden border-none shadow-colorful rounded-3xl gradient-peach gradient-animate">
                    <div className="flex items-center">
                      <div className="flex-1 p-5 text-white">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-5 h-5" />
                          <h3 className="font-black text-lg">{coupon.title}</h3>
                        </div>
                        <p className="text-3xl font-black mb-2" style={{textShadow: '0 2px 8px rgba(0,0,0,0.2)'}}>
                          {coupon.discount_type === "percentage"
                            ? `${coupon.discount_amount}% OFF`
                            : `¥${coupon.discount_amount} OFF`}
                        </p>
                        <p className="text-xs text-white/95 font-medium">
                          Min. purchase: ¥{coupon.min_purchase}
                        </p>
                        <p className="text-xs text-white/90 mt-1 font-medium">
                          Valid until: {format(new Date(coupon.expiry_date), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div className="w-28 h-full bg-white/20 backdrop-blur-md flex items-center justify-center p-3">
                        <div className="text-center">
                          <p className="text-xs text-white/90 mb-1 font-semibold">CODE</p>
                          <p className="text-sm font-black text-white break-all bg-white/20 px-2 py-1 rounded-lg">
                            {coupon.code}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="p-10 text-center border-2 border-dashed border-gray-300 rounded-3xl bg-white/50">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <Ticket className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-600 font-semibold mb-2">No coupons yet</p>
              <p className="text-sm text-gray-400 mb-4">
                Try the lucky draw or make purchases to earn coupons!
              </p>
              <Link to={createPageUrl("LuckyDraw")}>
                <Button className="gradient-rainbow text-white font-bold">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Try Lucky Draw
                </Button>
              </Link>
            </Card>
          )}
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-5 flex items-center gap-2">
            <span className="text-3xl">⚡</span>
            Recent Activity
          </h2>
          {recentTransactions.length > 0 ? (
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
                        {format(new Date(transaction.created_date), "MMM d, yyyy h:mm a")}
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
          ) : (
            <Card className="p-10 text-center border-2 border-dashed border-gray-300 rounded-3xl bg-white/50">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-600 font-semibold">No activity yet</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
