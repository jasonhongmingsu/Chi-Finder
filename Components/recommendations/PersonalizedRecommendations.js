import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Sparkles, TrendingUp, Brain, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function PersonalizedRecommendations({ user }) {
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [aiReasoning, setAiReasoning] = useState("");
  const [showReasoningDialog, setShowReasoningDialog] = useState(false);

  const { data: purchases = [] } = useQuery({
    queryKey: ["userPurchases", user?.email],
    queryFn: () =>
      base44.entities.Purchase.filter({ user_email: user?.email }, "-created_date", 20),
    enabled: !!user?.email,
    initialData: [],
  });

  const { data: wishlist = [] } = useQuery({
    queryKey: ["userWishlist", user?.email],
    queryFn: () => base44.entities.Wishlist.filter({ user_email: user?.email }),
    enabled: !!user?.email,
    initialData: [],
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ["allProducts"],
    queryFn: () => base44.entities.Product.list(),
    initialData: [],
  });

  useEffect(() => {
    const generateRecommendations = async () => {
      if (!user || allProducts.length === 0) return;

      try {
        setIsLoading(true);

        // Build comprehensive user profile
        const purchasedProductIds = new Set();
        const categoryPreferences = {};
        let totalSpent = 0;

        purchases.forEach((purchase) => {
          totalSpent += purchase.total_amount || 0;
          purchase.products?.forEach((item) => {
            purchasedProductIds.add(item.product_id);
            const product = allProducts.find(p => p.id === item.product_id);
            if (product?.category) {
              categoryPreferences[product.category] = (categoryPreferences[product.category] || 0) + item.quantity;
            }
          });
        });

        const topCategories = Object.entries(categoryPreferences)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([cat]) => cat);

        const wishlistProducts = wishlist.map((w) => w.product_name);
        const wishlistCategories = wishlist
          .map(w => allProducts.find(p => p.id === w.product_id)?.category)
          .filter(Boolean);

        const averagePrice = purchases.length > 0 ? totalSpent / purchases.length : 0;

        const prompt = `You are an AI recommendation engine for Genki Forest vending machines. Analyze user behavior and suggest products they'll love.

USER PROFILE:
- Purchase History: ${purchases.length} orders
- Total Spent: ¥${totalSpent.toFixed(2)}
- Average Order Value: ¥${averagePrice.toFixed(2)}
- Favorite Categories: ${topCategories.join(", ") || "None yet"}
- Recent Purchases: ${purchases.slice(0, 5).map(p => p.products?.map(item => item.product_name).join(", ")).join(" | ")}
- Wishlist: ${wishlistProducts.join(", ") || "Empty"}
- Wishlist Categories: ${wishlistCategories.join(", ") || "None"}

AVAILABLE PRODUCTS (${allProducts.length} items):
${allProducts.map((p) => `ID: ${p.id} | ${p.name} | ${p.category} | ¥${p.price} | Tags: ${p.tags?.join(", ") || "none"}`).join("\n")}

TASK:
1. Recommend 5-6 products the user would love based on:
   - Their purchase patterns and favorite categories
   - Complementary items to what they've bought
   - Items similar to their wishlist but they haven't purchased
   - Popular items they haven't tried yet
   - Products within their typical price range

2. Exclude products they've already purchased (IDs: ${Array.from(purchasedProductIds).join(", ")})

3. Provide a brief reasoning for your recommendations (2-3 sentences).

Return JSON with recommended product IDs and reasoning.`;

        const response = await base44.integrations.Core.InvokeLLM({
          prompt: prompt,
          response_json_schema: {
            type: "object",
            properties: {
              recommended_product_ids: {
                type: "array",
                items: { type: "string" },
                description: "Array of product IDs recommended for the user"
              },
              reasoning: {
                type: "string",
                description: "Brief explanation of why these products were recommended"
              },
            },
            required: ["recommended_product_ids", "reasoning"]
          },
        });

        const recommendedIds = response.recommended_product_ids || [];
        const recommendedProducts = recommendedIds
          .map((id) => allProducts.find((p) => p.id === id))
          .filter(Boolean)
          .slice(0, 6);

        setRecommendations(recommendedProducts);
        setAiReasoning(response.reasoning || "Personalized picks based on your taste!");
      } catch (error) {
        console.error("Failed to generate recommendations:", error);
        // Fallback: show popular products user hasn't bought
        const purchasedIds = new Set(purchases.flatMap(p => p.products?.map(item => item.product_id) || []));
        const fallback = allProducts
          .filter((p) => !purchasedIds.has(p.id) && (p.tags?.includes("Popular") || p.tags?.includes("Recommended")))
          .slice(0, 5);
        setRecommendations(fallback);
        setAiReasoning("Trending products you might enjoy!");
      } finally {
        setIsLoading(false);
      }
    };

    if (user && allProducts.length > 0) {
      generateRecommendations();
    }
  }, [user, purchases, wishlist, allProducts]);

  if (!user || (recommendations.length === 0 && !isLoading)) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 gradient-sky rounded-2xl flex items-center justify-center shadow-lg float-animation">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Just For You ✨</h2>
            <p className="text-xs text-gray-500 font-medium">AI-powered picks</p>
          </div>
        </div>
        {!isLoading && aiReasoning && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowReasoningDialog(true)}
            className="h-8 text-xs font-semibold text-[#9B6BFF] hover:bg-purple-50"
          >
            <Brain className="w-3 h-3 mr-1" />
            Why?
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[...Array(4)].map((_, i) => (
            <Card
              key={i}
              className="min-w-[140px] h-48 animate-pulse bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl border-2 border-white"
            />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {recommendations.map((product, idx) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link to={`${createPageUrl("ProductDetail")}?id=${product.id}`}>
                <Card className="min-w-[140px] overflow-hidden hover:shadow-colorful transition-all duration-300 border-2 border-white bg-white rounded-3xl">
                  <div className="aspect-square bg-gradient-to-br from-purple-100 to-pink-100 p-4 flex items-center justify-center relative">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-contain drop-shadow-lg"
                      />
                    ) : (
                      <div className="text-4xl">🥤</div>
                    )}
                    <div className="absolute top-2 right-2">
                      <Badge className="gradient-lemon text-white border-none shadow-lg text-xs font-bold">
                        AI Pick
                      </Badge>
                    </div>
                    {product.tags && product.tags.length > 0 && (
                      <div className="absolute bottom-2 left-2">
                        <Badge className="bg-white/90 text-gray-800 border-none shadow-md text-xs font-bold">
                          {product.tags[0]}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-xs text-gray-900 mb-1 line-clamp-2">
                      {product.name}
                    </h3>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black bg-gradient-to-r from-[#00C781] to-[#00D9FF] bg-clip-text text-transparent">
                        ¥{product.price.toFixed(2)}
                      </p>
                      <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white border-none shadow-sm text-xs">
                        +{product.points_value}
                      </Badge>
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={showReasoningDialog} onOpenChange={setShowReasoningDialog}>
        <DialogContent className="rounded-3xl border-none shadow-colorful">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="w-12 h-12 gradient-sky rounded-2xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              AI Recommendation Insights
            </DialogTitle>
            <DialogDescription className="pt-4">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-2xl border-2 border-purple-200">
                <p className="text-gray-800 leading-relaxed font-medium">
                  {aiReasoning}
                </p>
              </div>
              <div className="mt-4 flex items-start gap-2 text-xs text-gray-600">
                <Info className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                <p className="leading-relaxed">
                  Our AI analyzes your purchase history, wishlist, and category preferences to suggest products you'll love. The more you shop, the better the recommendations!
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
