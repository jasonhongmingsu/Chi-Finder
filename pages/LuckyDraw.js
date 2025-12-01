import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, History, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import LuckyWheel from "../components/rewards/LuckyWheel";

const SPIN_COST = 50;

export default function LuckyDraw() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [wonPrize, setWonPrize] = useState(null);
  const [showWinModal, setShowWinModal] = useState(false);

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

  const { data: prizes = [] } = useQuery({
    queryKey: ["luckyDrawPrizes"],
    queryFn: () => base44.entities.LuckyDrawPrize.filter({ is_active: true }),
    initialData: [],
  });

  const { data: history = [] } = useQuery({
    queryKey: ["luckyDrawHistory", user?.email],
    queryFn: () =>
      base44.entities.LuckyDrawHistory.filter(
        { user_email: user?.email },
        "-created_date",
        10
      ),
    enabled: !!user?.email,
    initialData: [],
  });

  const spinMutation = useMutation({
    mutationFn: async (selectedPrize) => {
      // Deduct points
      await base44.entities.PointsTransaction.create({
        user_email: user.email,
        points_amount: -SPIN_COST,
        transaction_type: "redeemed",
        description: `Lucky Draw Spin`,
      });

      // Record draw history
      await base44.entities.LuckyDrawHistory.create({
        user_email: user.email,
        prize_id: selectedPrize.id,
        prize_name: selectedPrize.name,
        prize_value: selectedPrize.prize_value,
        points_spent: SPIN_COST,
        draw_date: new Date().toISOString(),
      });

      // Award prize based on type
      if (selectedPrize.prize_type === "points") {
        const pointsValue = parseInt(selectedPrize.prize_value);
        await base44.entities.PointsTransaction.create({
          user_email: user.email,
          points_amount: pointsValue,
          transaction_type: "bonus",
          description: `Lucky Draw Prize: ${selectedPrize.name}`,
        });
      } else if (selectedPrize.prize_type === "coupon" || selectedPrize.prize_type === "discount") {
        // Create coupon automatically
        const discountAmount = parseInt(selectedPrize.prize_value.replace(/[^\d]/g, '')) || 5;
        await base44.entities.Coupon.create({
          user_email: user.email,
          code: `LUCKY${Date.now()}`,
          title: selectedPrize.name,
          discount_amount: discountAmount,
          discount_type: "fixed",
          min_purchase: 10,
          expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: "active",
        });
      }

      return selectedPrize;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["luckyDrawHistory"]);
      queryClient.invalidateQueries(["pointsTransactions"]);
      queryClient.invalidateQueries(["coupons"]);
    },
  });

  const handleSpin = async () => {
    if (!user || calculatedPoints < SPIN_COST) {
      alert("Insufficient points! You need at least 50 points to spin.");
      return;
    }

    setSpinning(true);

    // Weighted random selection based on probability
    const totalProbability = prizes.reduce((sum, p) => sum + (p.probability || 10), 0);
    let random = Math.random() * totalProbability;
    let selectedPrize = prizes[0];

    for (const prize of prizes) {
      random -= prize.probability || 10;
      if (random <= 0) {
        selectedPrize = prize;
        break;
      }
    }

    // Wait for animation
    setTimeout(async () => {
      await spinMutation.mutateAsync(selectedPrize);
      setWonPrize(selectedPrize);
      
      const updatedUser = await base44.auth.me();
      setUser(updatedUser);
      
      setSpinning(false);
      setShowWinModal(true);

      // Hide win modal after 5 seconds
      setTimeout(() => {
        setShowWinModal(false);
        setWonPrize(null);
      }, 5000);
    }, 4000);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-[#00C781]">Loading...</div>
      </div>
    );
  }

  const canSpin = calculatedPoints >= SPIN_COST;

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm z-10 border-b border-gray-100">
        <div className="flex items-center justify-between px-6 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            Lucky Draw
          </h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="pt-20 px-6 pb-32">
        {/* Points Balance */}
        <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 mb-6 border-none shadow-lg rounded-3xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/90 mb-1 font-medium">Your Points</p>
              <p className="text-4xl font-bold">{calculatedPoints || 0}</p>
            </div>
            <Trophy className="w-16 h-16 text-yellow-300" />
          </div>
          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-sm text-white/90 font-medium">
              {canSpin
                ? `🎰 You can spin ${Math.floor(calculatedPoints / SPIN_COST)} more times!`
                : `❌ You need ${SPIN_COST - calculatedPoints} more points to spin`}
            </p>
          </div>
        </Card>

        {/* Lucky Wheel */}
        <div className="mb-8">
          {prizes.length > 0 ? (
            <LuckyWheel
              prizes={prizes}
              onSpin={handleSpin}
              spinning={spinning}
              wonPrize={wonPrize}
            />
          ) : (
            <Card className="p-8 text-center rounded-3xl">
              <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No prizes available at the moment</p>
            </Card>
          )}
        </div>

        {/* Available Prizes */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Available Prizes
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {prizes.map((prize) => (
              <Card key={prize.id} className="p-4 border-2 border-gray-100 rounded-2xl hover:shadow-lg transition-all">
                <div className="aspect-square bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg mb-3 flex items-center justify-center">
                  {prize.image_url ? (
                    <img
                      src={prize.image_url}
                      alt={prize.name}
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <Trophy className="w-12 h-12 text-purple-500" />
                  )}
                </div>
                <h3 className="font-semibold text-sm text-gray-900 mb-1 line-clamp-2">
                  {prize.name}
                </h3>
                <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                  {prize.prize_value}
                </Badge>
              </Card>
            ))}
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-gray-600" />
              Recent Wins
            </h2>
            <Card className="divide-y border-none shadow-md rounded-3xl overflow-hidden">
              {history.map((record) => (
                <div key={record.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">
                        {record.prize_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(record.created_date), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {record.prize_value}
                  </Badge>
                </div>
              ))}
            </Card>
          </div>
        )}
      </div>

      {/* Win Modal with CSS Confetti Animation */}
      <AnimatePresence>
        {showWinModal && wonPrize && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6"
          >
            {/* CSS Confetti Effect */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
              {[...Array(30)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-3 h-3 rounded-full animate-bounce"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: '-20px',
                    backgroundColor: ['#00D9FF', '#00C781', '#FFB800', '#FF6B9D', '#9B6BFF'][i % 5],
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${2 + Math.random() * 2}s`,
                  }}
                />
              ))}
            </div>

            <motion.div
              initial={{ scale: 0.5, rotate: -10, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.5, rotate: 10, opacity: 0 }}
              transition={{ type: "spring", duration: 0.6 }}
              className="bg-white rounded-3xl p-8 text-center max-w-sm shadow-2xl relative z-10"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 360, 0]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-24 h-24 gradient-rainbow rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <Trophy className="w-12 h-12 text-white" />
              </motion.div>
              <h3 className="text-3xl font-black text-gray-900 mb-2">
                Congratulations! 🎉
              </h3>
              <p className="text-gray-600 mb-4 text-lg font-semibold">
                You won:
              </p>
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-2xl mb-4 border-2 border-yellow-200">
                <p className="text-2xl font-black text-gray-900 mb-1">
                  {wonPrize.name}
                </p>
                <Badge className="text-lg gradient-lemon text-white border-none px-4 py-1">
                  {wonPrize.prize_value}
                </Badge>
              </div>
              {(wonPrize.prize_type === "coupon" || wonPrize.prize_type === "discount") && (
                <p className="text-sm text-gray-500 font-medium">
                  ✅ Coupon added to "My Coupons"
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
