import React from "react";
import { Card } from "@/components/ui/card";
import { Star, TrendingUp, Zap, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function PointsBalance({ points, onTap }) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4 }}
      whileHover={{ scale: 1.03, y: -5 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        className="gradient-rainbow text-white p-8 border-none shadow-colorful cursor-pointer overflow-hidden relative rounded-3xl gradient-animate"
        onClick={onTap}
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-16 -translate-x-16" />
        <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-white/5 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg"
              >
                <Star className="w-8 h-8 text-yellow-200" fill="currentColor" />
              </motion.div>
              <div>
                <p className="text-sm text-white/95 font-bold mb-1">My Points Balance</p>
                <p className="text-xs text-white/80 font-medium">Tap to spend 💰</p>
              </div>
            </div>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Zap className="w-8 h-8 text-yellow-200" fill="currentColor" />
            </motion.div>
          </div>

          <div className="mb-4">
            <motion.p
              key={points}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-6xl font-black mb-2"
              style={{textShadow: '0 4px 12px rgba(0,0,0,0.2)'}}
            >
              {points || 0}
            </motion.p>
            <p className="text-white/90 text-base font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Total Points Available
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-3">
            <TrendingUp className="w-5 h-5" />
            <span className="text-white/95 font-semibold">Keep earning to unlock exclusive rewards!</span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
