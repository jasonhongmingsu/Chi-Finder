import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Wallet, Zap, Gift, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

const RECHARGE_OPTIONS = [
  { amount: 50, bonus: 0, popular: false },
  { amount: 100, bonus: 5, popular: true },
  { amount: 200, bonus: 15, popular: false },
  { amount: 500, bonus: 50, popular: false },
];

export default function Recharge() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  const rechargeMutation = useMutation({
    mutationFn: async (option) => {
      const totalAmount = option.amount + option.bonus;
      
      // Create transaction record
      await base44.entities.PointsTransaction.create({
        user_email: user.email,
        points_amount: totalAmount,
        transaction_type: "bonus",
        description: `Wallet Recharge: ¥${option.amount}${option.bonus > 0 ? ` (+¥${option.bonus} bonus)` : ''}`,
      });

      // Update user balance
      await base44.auth.updateMe({
        points_balance: (user.points_balance || 0) + totalAmount,
        wallet_balance: (user.wallet_balance || 0) + option.amount,
      });

      return totalAmount;
    },
    onSuccess: (totalAmount) => {
      queryClient.invalidateQueries(["pointsTransactions"]);
      setShowSuccess(true);

      // Update local user state
      const updatedUser = {
        ...user,
        points_balance: (user.points_balance || 0) + totalAmount,
        wallet_balance: (user.wallet_balance || 0) + selectedAmount.amount,
      };
      setUser(updatedUser);

      // Hide success modal after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
        setSelectedAmount(null);
      }, 3000);
    },
  });

  const handleRecharge = () => {
    if (!selectedAmount) {
      alert("Please select a recharge amount");
      return;
    }
    rechargeMutation.mutate(selectedAmount);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-[#00C781]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
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
            <Wallet className="w-5 h-5 text-[#00C781]" />
            Recharge Wallet
          </h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="pt-20 px-6 pb-32">
        {/* Current Balance */}
        <Card className="gradient-rainbow text-white p-6 mb-8 border-none shadow-colorful rounded-3xl gradient-animate">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/90 mb-1 font-medium">Current Balance</p>
              <p className="text-4xl font-black">¥{user.wallet_balance || 0}</p>
              <p className="text-sm text-white/95 mt-2 font-semibold">
                Points: {user.points_balance || 0}
              </p>
            </div>
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Wallet className="w-10 h-10" />
            </div>
          </div>
        </Card>

        {/* Recharge Options */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-5 flex items-center gap-2">
            <span className="text-3xl">💰</span>
            Select Amount
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {RECHARGE_OPTIONS.map((option, index) => (
              <motion.div
                key={option.amount}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Card
                  onClick={() => setSelectedAmount(option)}
                  className={`p-6 cursor-pointer transition-all duration-300 rounded-3xl relative overflow-hidden ${
                    selectedAmount?.amount === option.amount
                      ? "border-4 border-[#00C781] shadow-colorful bg-gradient-to-br from-green-50 to-emerald-50"
                      : "border-2 border-gray-200 hover:border-[#00D9FF] hover:shadow-vibrant"
                  }`}
                >
                  {option.popular && (
                    <Badge className="absolute top-2 right-2 bg-gradient-to-r from-orange-400 to-red-500 text-white border-none shadow-lg">
                      🔥 Popular
                    </Badge>
                  )}
                  {selectedAmount?.amount === option.amount && (
                    <div className="absolute top-2 left-2 w-8 h-8 bg-[#00C781] rounded-full flex items-center justify-center">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div className="text-center mt-4">
                    <p className="text-4xl font-black text-gray-900 mb-2">¥{option.amount}</p>
                    {option.bonus > 0 ? (
                      <div className="space-y-1">
                        <Badge className="gradient-lemon text-white border-none shadow-md">
                          <Gift className="w-3 h-3 mr-1" />
                          +¥{option.bonus} Bonus
                        </Badge>
                        <p className="text-xs text-gray-500 font-semibold">
                          Get ¥{option.amount + option.bonus} total
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 font-medium">Basic recharge</p>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Benefits */}
        <Card className="p-6 mb-8 border-2 border-gray-200 rounded-3xl bg-gradient-to-br from-purple-50 to-pink-50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 gradient-sky rounded-2xl flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6 text-white" fill="currentColor" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-3 text-lg">Recharge Benefits</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#00C781]" />
                  <span className="font-medium">Get bonus credits on larger recharges</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#00D9FF]" />
                  <span className="font-medium">Use balance for vending purchases</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#FFB800]" />
                  <span className="font-medium">Earn points with every transaction</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#FF6B9D]" />
                  <span className="font-medium">Never run out of credit at machines</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-20 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-md mx-auto">
          <Button
            onClick={handleRecharge}
            disabled={!selectedAmount || rechargeMutation.isPending}
            className="w-full h-14 text-lg font-black rounded-2xl gradient-mint text-white shadow-colorful hover:opacity-90 disabled:opacity-50"
          >
            {rechargeMutation.isPending ? (
              "Processing..."
            ) : selectedAmount ? (
              <>
                Recharge ¥{selectedAmount.amount}
                {selectedAmount.bonus > 0 && ` (+¥${selectedAmount.bonus} Bonus)`}
              </>
            ) : (
              "Select an Amount"
            )}
          </Button>
        </div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6"
          >
            {/* Success Particles */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ y: -20, opacity: 1 }}
                  animate={{ 
                    y: window.innerHeight + 20, 
                    opacity: 0,
                    x: [0, Math.random() * 100 - 50]
                  }}
                  transition={{
                    duration: 2 + Math.random() * 2,
                    delay: Math.random() * 0.5,
                    ease: "easeOut"
                  }}
                  className="absolute w-3 h-3 rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    backgroundColor: ['#00D9FF', '#00C781', '#FFB800', '#FF6B9D', '#9B6BFF'][i % 5],
                  }}
                />
              ))}
            </div>

            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="bg-white rounded-3xl p-8 text-center max-w-sm shadow-2xl relative z-10"
            >
              <div className="w-20 h-20 gradient-mint rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">
                Recharge Successful! 🎉
              </h3>
              <p className="text-gray-600 mb-4">
                Your wallet has been topped up successfully.
              </p>
              <Badge className="text-lg gradient-rainbow text-white border-none px-4 py-2">
                New Balance: ¥{user.wallet_balance || 0}
              </Badge>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
