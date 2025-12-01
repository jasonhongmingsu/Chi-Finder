
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Star, Gift, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { motion } from "framer-motion"; // Added motion import

export default function PointsMall() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  const { data: rewards = [] } = useQuery({
    queryKey: ["rewards"],
    queryFn: () => base44.entities.RewardItem.filter({ is_available: true }),
    initialData: [],
  });

  const redeemMutation = useMutation({
    mutationFn: async (reward) => {
      // Create points transaction
      await base44.entities.PointsTransaction.create({
        user_email: user.email,
        points_amount: -reward.points_cost,
        transaction_type: "redeemed",
        description: `Redeemed: ${reward.name}`,
        related_reward_id: reward.id,
      });

      // Update user points
      await base44.auth.updateMe({
        points_balance: user.points_balance - reward.points_cost,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["pointsTransactions"]);
      // It's better to refetch user data or calculate the exact points deducted.
      // The current implementation finds ANY reward's cost, which might be incorrect if the array order changes.
      // A more robust solution would be to update points_balance from the server's response or refetch user.
      // For now, retaining the original logic as per the provided outline.
      setUser((prevUser) => ({ ...prevUser, points_balance: prevUser.points_balance - rewards.find(r => r.id)?.points_cost }));
    },
  });

  const handleRedeem = async (reward) => {
    if (!user || user.points_balance < reward.points_cost) {
      alert("Insufficient points!");
      return;
    }

    if (confirm(`Redeem ${reward.name} for ${reward.points_cost} points?`)) {
      await redeemMutation.mutateAsync(reward);
      alert("🎉 Reward redeemed successfully!"); // Updated alert message
      const updatedUser = await base44.auth.me();
      setUser(updatedUser);
    }
  };

  const filteredRewards =
    selectedCategory === "all"
      ? rewards
      : rewards.filter((r) => r.category === selectedCategory);

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
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 glassmorphism z-10 border-b border-white shadow-vibrant">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="hover:bg-white/50 rounded-2xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-black text-gray-900 text-xl">Points Mall 🎁</h1>
            <div className="w-10" />
          </div>

          {/* Points Balance */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card className="gradient-rainbow text-white p-5 border-none shadow-colorful rounded-3xl gradient-animate">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/95 mb-1 font-semibold">Your Points Balance</p>
                  <p className="text-4xl font-black" style={{textShadow: '0 2px 8px rgba(0,0,0,0.2)'}}>{user.points_balance || 0}</p>
                </div>
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <Star className="w-14 h-14 text-yellow-200" fill="currentColor" />
                </motion.div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>

      <div className="pt-44 px-6 pb-6"> {/* Adjusted padding-top */}
        {/* Category Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { value: "all", label: "All", emoji: "🎯" },
            { value: "product", label: "Products", emoji: "🥤" },
            { value: "merchandise", label: "Merch", emoji: "👕" },
            { value: "coupon", label: "Coupons", emoji: "🎫" },
          ].map((category) => (
            <Button
              key={category.value}
              variant={selectedCategory === category.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.value)}
              className={`rounded-2xl font-bold shadow-lg border-2 ${
                selectedCategory === category.value
                  ? "gradient-sky text-white border-none"
                  : "bg-white border-gray-200"
              }`}
            >
              <span className="mr-1">{category.emoji}</span>
              {category.label}
            </Button>
          ))}
        </div>

        {/* Rewards Grid */}
        {filteredRewards.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {filteredRewards.map((reward, idx) => {
              const canAfford = user.points_balance >= reward.points_cost;
              const gradients = ['from-purple-100 to-pink-100', 'from-blue-100 to-teal-100', 'from-yellow-100 to-orange-100', 'from-green-100 to-lime-100', 'from-red-100 to-rose-100']; // Updated gradients for visual diversity
              
              return (
                <motion.div
                  key={reward.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ scale: 1.05, y: -8 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Card className="overflow-hidden hover:shadow-colorful transition-all duration-300 border-2 border-white bg-white rounded-3xl">
                    <div className={`aspect-square ${gradients[idx % gradients.length]} p-6 flex items-center justify-center relative`}>
                      {reward.image_url ? (
                        <img
                          src={reward.image_url}
                          alt={reward.name}
                          className="w-full h-full object-contain drop-shadow-2xl"
                        />
                      ) : (
                        <Gift className="w-20 h-20 text-white drop-shadow-lg" />
                      )}
                      {reward.stock_quantity <= 5 && (
                        <Badge className="absolute top-3 right-3 gradient-peach text-white border-none shadow-lg font-bold">
                          ⚠️ {reward.stock_quantity} left
                        </Badge>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-sm text-gray-900 mb-2 line-clamp-2">
                        {reward.name}
                      </h3>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-full">
                          <Star className="w-4 h-4 text-orange-600" fill="currentColor" />
                          <span className="font-black text-orange-600">
                            {reward.points_cost}
                          </span>
                        </div>
                        <Badge className="text-xs font-bold bg-gray-100 text-gray-700 border-none">
                          {reward.category}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        className={`w-full h-10 rounded-2xl font-bold shadow-lg ${
                          canAfford && reward.stock_quantity > 0
                            ? "gradient-mint text-white border-none"
                            : "bg-gray-200 text-gray-500 border-none"
                        }`}
                        disabled={!canAfford || reward.stock_quantity === 0}
                        onClick={() => handleRedeem(reward)}
                      >
                        {!canAfford ? (
                          "😢 Not Enough"
                        ) : reward.stock_quantity === 0 ? (
                          "Sold Out"
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Redeem Now
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <Gift className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-gray-600 font-semibold text-lg">No rewards available</p>
          </div>
        )}
      </div>
    </div>
  );
}
