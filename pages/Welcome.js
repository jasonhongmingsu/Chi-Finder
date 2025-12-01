import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MapPin, Gift, ShoppingBag, Sparkles, Zap, Trophy, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function Welcome() {
  const navigate = useNavigate();
  const [showContent, setShowContent] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    setTimeout(() => setShowContent(true), 300);
  }, []);

  const handleGetStarted = async () => {
    setProcessing(true);
    
    try {
      const user = await base44.auth.me();
      
      // Check if user already received welcome gift
      if (!user.welcome_gift_received) {
        // Create welcome coupon
        await base44.entities.Coupon.create({
          user_email: user.email,
          code: `WELCOME${Date.now()}`,
          title: "Welcome Gift Coupon",
          discount_amount: 5,
          discount_type: "fixed",
          min_purchase: 10,
          expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: "active",
        });

        // Add welcome points
        await base44.entities.PointsTransaction.create({
          user_email: user.email,
          points_amount: 100,
          transaction_type: "bonus",
          description: "Welcome Gift - 100 Bonus Points 🎉",
        });

        // Update user
        await base44.auth.updateMe({
          welcome_gift_received: true,
          points_balance: (user.points_balance || 0) + 100,
        });

        // Show alert
        alert("🎉 Welcome! You've received a ¥5 coupon and 100 bonus points!");
      }

      // Navigate to Home
      navigate(createPageUrl("Home"));
    } catch (error) {
      console.error("Error processing welcome gift:", error);
      // Navigate anyway
      navigate(createPageUrl("Home"));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen gradient-rainbow flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-white/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: "2s" }} />

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 50 }}
        transition={{ duration: 0.8 }}
        className="max-w-md w-full relative z-10"
      >
        {/* Logo/Brand */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          className="text-center mb-8"
        >
          <div className="w-32 h-32 bg-white rounded-full mx-auto mb-6 flex items-center justify-center shadow-2xl">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <Zap className="w-16 h-16 text-[#00C781]" fill="currentColor" />
            </motion.div>
          </div>
          <h1 className="text-5xl font-black text-white mb-3" style={{textShadow: '0 4px 20px rgba(0,0,0,0.3)'}}>
            Genki Go! 🚀
          </h1>
          <p className="text-xl text-white/95 font-semibold">
            Smart Vending Made Fun
          </p>
        </motion.div>

        {/* Feature Cards */}
        <div className="space-y-4 mb-8">
          {[
            {
              icon: MapPin,
              title: "Find Machines Nearby",
              description: "Locate vending machines with real-time GPS",
              color: "#00D9FF",
              delay: 0.5,
            },
            {
              icon: ShoppingBag,
              title: "Browse Products",
              description: "Explore drinks, snacks & special items",
              color: "#9B6BFF",
              delay: 0.6,
            },
            {
              icon: Star,
              title: "Earn Points",
              description: "Get rewards with every purchase",
              color: "#FFB800",
              delay: 0.7,
            },
            {
              icon: Trophy,
              title: "Lucky Draw & Prizes",
              description: "Win coupons, free items & more!",
              color: "#FF6B9D",
              delay: 0.8,
            },
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: feature.delay }}
              className="bg-white/20 backdrop-blur-md rounded-2xl p-5 flex items-start gap-4 border border-white/30"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg"
                style={{ backgroundColor: feature.color }}
              >
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg mb-1">
                  {feature.title}
                </h3>
                <p className="text-white/90 text-sm font-medium">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1 }}
        >
          <Button
            onClick={handleGetStarted}
            disabled={processing}
            className="w-full h-16 text-xl font-black bg-white text-[#00C781] hover:bg-white/90 rounded-2xl shadow-2xl transition-all duration-300 hover:scale-105"
          >
            {processing ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-6 h-6 border-3 border-[#00C781] border-t-transparent rounded-full"
              />
            ) : (
              <>
                <Sparkles className="w-6 h-6 mr-3" />
                Get Started
                <Sparkles className="w-6 h-6 ml-3" />
              </>
            )}
          </Button>
        </motion.div>

        {/* Welcome Gift Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-6 text-center"
        >
          <div className="bg-yellow-400/30 backdrop-blur-sm border-2 border-yellow-300/50 rounded-2xl p-4">
            <Gift className="w-8 h-8 text-white mx-auto mb-2" />
            <p className="text-white font-bold text-sm">
              🎁 New User Gift
            </p>
            <p className="text-white/95 text-xs font-medium mt-1">
              ¥5 Coupon + 100 Points waiting for you!
            </p>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="text-center text-white/80 text-sm mt-8 font-medium"
        >
          Powered by Genki Forest 🌲
        </motion.p>
      </motion.div>
    </div>
  );
}
