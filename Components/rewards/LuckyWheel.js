import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Sparkles, Star, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const COLORS = ["#FF6B9D", "#FFB800", "#00D9FF", "#00C781", "#9B6BFF", "#FF5252", "#FFA500", "#1E90FF"];

export default function LuckyWheel({ prizes, onSpin, spinning, wonPrize }) {
  const [rotation, setRotation] = useState(0);

  const handleSpin = () => {
    if (spinning) return;
    
    // Calculate target rotation (10 full spins + random position)
    const spins = 10;
    const randomDegrees = Math.random() * 360;
    const targetRotation = rotation + (spins * 360) + randomDegrees;
    
    setRotation(targetRotation);
    onSpin();
  };

  const numberOfSlices = prizes.length || 8;
  const sliceAngle = 360 / numberOfSlices;

  return (
    <Card className="p-6 border-2 border-white shadow-colorful rounded-3xl bg-gradient-to-br from-purple-50 to-pink-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-200/30 to-orange-200/30 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-3xl" />

      <div className="relative z-10">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-black text-gray-900 mb-2 flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-yellow-500" />
            Lucky Draw Wheel
            <Sparkles className="w-6 h-6 text-yellow-500" />
          </h3>
          <p className="text-sm text-gray-600 font-medium">
            50 points per spin • Try your luck! 🎰
          </p>
        </div>

        {/* Wheel Container */}
        <div className="relative mx-auto mb-6" style={{ width: "280px", height: "280px" }}>
          {/* Pointer */}
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
            className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-3 z-20"
          >
            <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[30px] border-t-red-500 drop-shadow-lg" />
            <div className="w-10 h-10 bg-red-500 rounded-full -mt-2 mx-auto flex items-center justify-center shadow-lg">
              <Zap className="w-5 h-5 text-white" fill="currentColor" />
            </div>
          </motion.div>

          {/* Spinning Wheel */}
          <motion.div
            className="relative w-full h-full rounded-full overflow-hidden shadow-2xl"
            style={{
              background: "linear-gradient(135deg, #fff 0%, #f8f9fa 100%)",
              border: "8px solid white",
            }}
            animate={{ rotate: rotation }}
            transition={{
              duration: spinning ? 4 : 0,
              ease: spinning ? "easeOut" : "linear",
            }}
          >
            {/* Wheel Center Glow */}
            <div className="absolute inset-0 rounded-full" style={{
              background: "radial-gradient(circle at center, rgba(255,255,255,0.8) 0%, transparent 70%)"
            }} />

            {/* Prize Slices */}
            {prizes.map((prize, index) => {
              const startAngle = index * sliceAngle;
              const color = COLORS[index % COLORS.length];
              
              return (
                <div
                  key={prize.id || index}
                  className="absolute w-full h-full"
                  style={{
                    transform: `rotate(${startAngle}deg)`,
                    transformOrigin: "center center",
                  }}
                >
                  <div
                    className="absolute left-1/2 top-0 w-[140px] h-[140px] origin-bottom"
                    style={{
                      clipPath: `polygon(50% 100%, 0% 0%, 100% 0%)`,
                      background: `linear-gradient(135deg, ${color} 0%, ${color}DD 100%)`,
                      transform: `translateX(-50%) rotate(${sliceAngle / 2}deg)`,
                    }}
                  >
                    <div className="absolute top-8 left-1/2 transform -translate-x-1/2 text-center w-full">
                      <div className="text-2xl mb-1 drop-shadow-md">
                        {prize.prize_type === "points" ? "⭐" : 
                         prize.prize_type === "coupon" ? "🎫" :
                         prize.prize_type === "product" ? "🥤" : "🎁"}
                      </div>
                      <div className="text-[9px] font-bold text-white drop-shadow-md px-1">
                        {prize.name?.length > 15 ? prize.name.substring(0, 13) + "..." : prize.name}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Center Button */}
            <motion.button
              onClick={handleSpin}
              disabled={spinning}
              whileHover={{ scale: spinning ? 1 : 1.1 }}
              whileTap={{ scale: spinning ? 1 : 0.95 }}
              className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full shadow-2xl flex flex-col items-center justify-center z-10 transition-all duration-300 ${
                spinning
                  ? "bg-gradient-to-br from-gray-300 to-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-br from-yellow-400 to-orange-500 cursor-pointer hover:shadow-colorful"
              }`}
              style={{
                border: "4px solid white",
              }}
            >
              <Trophy className={`w-8 h-8 text-white ${spinning ? "" : "animate-pulse"}`} />
              <span className="text-[10px] font-black text-white mt-1">
                {spinning ? "..." : "SPIN"}
              </span>
            </motion.button>
          </motion.div>

          {/* Outer Ring Decoration */}
          <div className="absolute inset-0 rounded-full pointer-events-none" style={{
            background: "conic-gradient(from 0deg, transparent 0deg, rgba(255,215,0,0.3) 45deg, transparent 90deg, rgba(255,215,0,0.3) 135deg, transparent 180deg, rgba(255,215,0,0.3) 225deg, transparent 270deg, rgba(255,215,0,0.3) 315deg, transparent 360deg)",
            animation: spinning ? "spin 2s linear infinite" : "none",
          }} />
        </div>

        {/* Action Button */}
        <Button
          onClick={handleSpin}
          disabled={spinning}
          className={`w-full h-14 text-lg font-black rounded-2xl text-white shadow-lg transition-all duration-300 ${
            spinning
              ? "bg-gray-400 cursor-not-allowed"
              : "gradient-rainbow hover:opacity-90"
          }`}
        >
          {spinning ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-6 h-6 border-3 border-white border-t-transparent rounded-full"
            />
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Spin the Wheel (50 Points)
              <Sparkles className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>

        {/* Probability Info */}
        <p className="text-center text-xs text-gray-500 mt-4 font-medium">
          💡 Each prize has different winning probabilities. Good luck!
        </p>
      </div>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </Card>
  );
}
