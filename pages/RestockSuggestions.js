import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, Package, Users, MapPin, Brain, Zap, RefreshCw, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

export default function RestockSuggestions() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  const { data: wishlistItems = [] } = useQuery({
    queryKey: ["allWishlists"],
    queryFn: () => base44.entities.Wishlist.list("-created_date"),
    initialData: [],
  });

  const { data: machines = [] } = useQuery({
    queryKey: ["machines"],
    queryFn: () => base44.entities.VendingMachine.list(),
    initialData: [],
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["allPurchases"],
    queryFn: () => base44.entities.Purchase.list("-created_date", 200),
    initialData: [],
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
    initialData: [],
  });

  const generateAIInsights = async () => {
    if (!user || user.role !== "admin" || products.length === 0 || machines.length === 0) {
      return;
    }

    try {
      setIsLoadingAI(true);

      // Analyze sales data
      const salesData = {};
      purchases.forEach((purchase) => {
        purchase.products?.forEach((item) => {
          if (!salesData[item.product_name]) {
            salesData[item.product_name] = {
              product_id: item.product_id,
              quantity: 0,
              revenue: 0,
              frequency: 0,
            };
          }
          salesData[item.product_name].quantity += item.quantity || 0;
          salesData[item.product_name].revenue += (item.price || 0) * (item.quantity || 0);
          salesData[item.product_name].frequency += 1;
        });
      });

      const topSellingProducts = Object.entries(salesData)
        .sort(([, a], [, b]) => b.revenue - a.revenue)
        .slice(0, 15)
        .map(([name, data]) => `${name}: ¥${data.revenue.toFixed(0)} revenue, ${data.quantity} units, ${data.frequency} orders`);

      // Analyze machine stock levels
      const machineStockAnalysis = machines.map((m) => {
        const totalStock = m.products_inventory?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
        const lowStockProducts = m.products_inventory?.filter(item => item.quantity < (item.low_stock_threshold || 5)) || [];
        return {
          name: m.name,
          totalStock,
          productCount: m.products_inventory?.length || 0,
          lowStockCount: lowStockProducts.length,
          status: m.status,
        };
      });

      const criticalMachines = machineStockAnalysis
        .filter(m => m.totalStock < 20 || m.lowStockCount > 2)
        .map(m => `${m.name}: ${m.totalStock} total items, ${m.lowStockCount} products low`);

      // Analyze wishlist demand
      const wishlistDemand = {};
      wishlistItems.forEach((item) => {
        wishlistDemand[item.product_name] = (wishlistDemand[item.product_name] || 0) + 1;
      });

      const topWishlist = Object.entries(wishlistDemand)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 15)
        .map(([name, count]) => `${name}: ${count} user requests`);

      const prompt = `You are an AI inventory optimization expert for Genki Forest vending machines. Analyze the data and provide strategic, actionable recommendations.

📊 BUSINESS OVERVIEW:
- Total Machines: ${machines.length}
- Active Machines: ${machines.filter(m => m.status === 'active').length}
- Total Sales Orders: ${purchases.length}
- Product Catalog: ${products.length} SKUs

🔥 TOP SELLING PRODUCTS (by revenue):
${topSellingProducts.length > 0 ? topSellingProducts.join("\n") : "No sales data available"}

⚠️ CRITICAL STOCK ALERTS:
${criticalMachines.length > 0 ? criticalMachines.join("\n") : "All machines adequately stocked"}

💝 CUSTOMER DEMAND (Wishlist Analytics):
${topWishlist.length > 0 ? topWishlist.join("\n") : "No wishlist data available"}

🎯 YOUR TASK:
Provide data-driven recommendations to maximize revenue and customer satisfaction:

1. PRIORITY RESTOCK (3-5 items): Products that urgently need restocking due to high sales velocity + current low stock. Include product name, specific reason (cite the data), and urgency level (high/medium/low).

2. EXPANSION OPPORTUNITIES (3-5 items): Products to add to inventory based on strong wishlist demand. Include product name, demand score (1-10), and rationale with data points.

3. MACHINE PRIORITIES (2-4 machines): Specific machines requiring immediate attention. Include machine name and specific action needed.

4. STRATEGIC INSIGHTS (4-6 insights): Actionable business intelligence like:
   - Sales trends and patterns
   - Category performance analysis
   - Price optimization opportunities
   - Seasonal recommendations
   - Customer preference shifts
   - Revenue maximization strategies

Be specific, use the actual data provided, and make your recommendations immediately actionable for operators.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            priority_restock: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  product: { type: "string" },
                  reason: { type: "string" },
                  urgency: { type: "string", enum: ["high", "medium", "low"] },
                },
                required: ["product", "reason", "urgency"]
              },
            },
            new_products_to_add: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  product: { type: "string" },
                  demand_score: { type: "number" },
                  rationale: { type: "string" },
                },
                required: ["product", "demand_score", "rationale"]
              },
            },
            machine_priorities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  machine: { type: "string" },
                  action: { type: "string" },
                },
                required: ["machine", "action"]
              },
            },
            insights: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["priority_restock", "new_products_to_add", "machine_priorities", "insights"]
        },
      });

      setAiInsights(response);
    } catch (error) {
      console.error("Failed to generate AI insights:", error);
      setAiInsights({
        priority_restock: [],
        new_products_to_add: [],
        machine_priorities: [],
        insights: ["Unable to generate AI insights at this time. Please try refreshing."],
      });
    } finally {
      setIsLoadingAI(false);
    }
  };

  useEffect(() => {
    if (user && user.role === "admin" && products.length > 0 && machines.length > 0) {
      generateAIInsights();
    }
  }, [user, purchases, wishlistItems, machines, products]);

  const aggregatedData = wishlistItems.reduce((acc, item) => {
    if (!acc[item.product_id]) {
      acc[item.product_id] = {
        product_id: item.product_id,
        product_name: item.product_name,
        product_image: item.product_image,
        product_price: item.product_price,
        request_count: 0,
        unique_users: new Set(),
      };
    }
    acc[item.product_id].request_count++;
    acc[item.product_id].unique_users.add(item.user_email);
    return acc;
  }, {});

  const suggestions = Object.values(aggregatedData)
    .map((item) => ({
      ...item,
      unique_users_count: item.unique_users.size,
    }))
    .sort((a, b) => b.unique_users_count - a.unique_users_count);

  const checkAvailability = (productId) => {
    const availableMachines = machines.filter((machine) =>
      machine.products_inventory?.some((item) => item.product_id === productId)
    );
    return availableMachines.length;
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-20 h-20 gradient-rainbow rounded-full flex items-center justify-center float-animation">
          <div className="animate-pulse text-white font-bold">Loading...</div>
        </div>
      </div>
    );
  }

  const isAdmin = user.role === "admin";

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen px-6">
        <div className="text-center">
          <Package className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Admin Access Only
          </h2>
          <p className="text-gray-500 mb-6">
            This page is only accessible to operators and administrators.
          </p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="fixed top-0 left-0 right-0 glassmorphism z-10 border-b border-white shadow-vibrant">
        <div className="flex items-center justify-between px-6 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="hover:bg-white/50 rounded-2xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-black text-gray-900 text-xl">AI Restock Advisor 🤖</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={generateAIInsights}
            disabled={isLoadingAI}
            className="hover:bg-white/50 rounded-2xl"
          >
            <RefreshCw className={`w-5 h-5 ${isLoadingAI ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="pt-20 px-6 pb-6">
        {isLoadingAI ? (
          <Card className="p-8 mb-6 border-2 border-white shadow-colorful rounded-3xl gradient-sky text-white gradient-animate">
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg"
              >
                <Brain className="w-8 h-8" />
              </motion.div>
              <div className="flex-1">
                <p className="font-black text-xl mb-1">Analyzing Inventory Data...</p>
                <p className="text-sm text-white/90">AI is processing sales trends, stock levels, and customer demand patterns</p>
              </div>
            </div>
          </Card>
        ) : aiInsights ? (
          <>
            {aiInsights.priority_restock && aiInsights.priority_restock.length > 0 && (
              <Card className="p-6 mb-6 border-2 border-white shadow-colorful rounded-3xl bg-gradient-to-br from-red-50 to-orange-50">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-14 h-14 gradient-peach rounded-2xl flex items-center justify-center shadow-lg">
                    <Zap className="w-7 h-7 text-white" fill="currentColor" />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 text-xl">🚨 Priority Restock</h3>
                    <p className="text-xs text-gray-600 font-semibold">Immediate action required</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {aiInsights.priority_restock.map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-4 bg-white rounded-2xl shadow-md hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold text-gray-900 flex-1">{item.product}</h4>
                        <Badge
                          className={`${
                            item.urgency.toLowerCase() === "high"
                              ? "gradient-peach"
                              : item.urgency.toLowerCase() === "medium"
                              ? "gradient-lemon"
                              : "bg-blue-500"
                          } text-white border-none font-bold shadow-md`}
                        >
                          {item.urgency.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{item.reason}</p>
                    </motion.div>
                  ))}
                </div>
              </Card>
            )}

            {aiInsights.new_products_to_add && aiInsights.new_products_to_add.length > 0 && (
              <Card className="p-6 mb-6 border-2 border-white shadow-colorful rounded-3xl bg-gradient-to-br from-green-50 to-emerald-50">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-14 h-14 gradient-mint rounded-2xl flex items-center justify-center shadow-lg">
                    <Package className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 text-xl">✨ Expansion Opportunities</h3>
                    <p className="text-xs text-gray-600 font-semibold">High-demand products to stock</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {aiInsights.new_products_to_add.map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-4 bg-white rounded-2xl shadow-md hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold text-gray-900 flex-1">{item.product}</h4>
                        <div className="flex items-center gap-1 px-3 py-1 gradient-lemon rounded-full shadow-md">
                          <TrendingUp className="w-3 h-3 text-white" />
                          <span className="text-xs font-black text-white">{item.demand_score}/10</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{item.rationale}</p>
                    </motion.div>
                  ))}
                </div>
              </Card>
            )}

            {aiInsights.machine_priorities && aiInsights.machine_priorities.length > 0 && (
              <Card className="p-6 mb-6 border-2 border-white shadow-colorful rounded-3xl bg-gradient-to-br from-yellow-50 to-orange-50">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-14 h-14 gradient-lemon rounded-2xl flex items-center justify-center shadow-lg">
                    <MapPin className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 text-xl">🎯 Machine Priorities</h3>
                    <p className="text-xs text-gray-600 font-semibold">Locations needing attention</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {aiInsights.machine_priorities.map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-4 bg-white rounded-2xl shadow-md hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 mb-1">{item.machine}</h4>
                          <p className="text-sm text-gray-700 leading-relaxed">{item.action}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>
            )}

            {aiInsights.insights && aiInsights.insights.length > 0 && (
              <Card className="p-6 mb-6 border-2 border-white shadow-colorful rounded-3xl bg-gradient-to-br from-blue-50 to-cyan-50">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-14 h-14 gradient-turquoise rounded-2xl flex items-center justify-center shadow-lg">
                    <Brain className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 text-xl">💡 Strategic Insights</h3>
                    <p className="text-xs text-gray-600 font-semibold">AI-powered business intelligence</p>
                  </div>
                </div>
                <ul className="space-y-3">
                  {aiInsights.insights.map((insight, idx) => (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-start gap-3 p-3 bg-white rounded-xl hover:shadow-md transition-all"
                    >
                      <div className="w-2 h-2 gradient-sky rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-800 leading-relaxed">{insight}</span>
                    </motion.li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        ) : (
          <Card className="p-12 text-center border-2 border-dashed border-gray-300 rounded-3xl bg-white/50 mb-6">
            <div className="w-20 h-20 gradient-sky rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Generate AI Insights</h3>
            <p className="text-gray-600 mb-6">Click refresh to analyze current data and get recommendations</p>
            <Button onClick={generateAIInsights} className="gradient-sky text-white shadow-lg">
              <Brain className="w-4 h-4 mr-2" />
              Generate Insights
            </Button>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="p-5 gradient-turquoise text-white border-none shadow-lg rounded-2xl">
            <TrendingUp className="w-8 h-8 mb-2" />
            <p className="text-3xl font-black">{suggestions.length}</p>
            <p className="text-sm text-white/90 font-semibold">Wishlist Products</p>
          </Card>
          <Card className="p-5 gradient-peach text-white border-none shadow-lg rounded-2xl">
            <Users className="w-8 h-8 mb-2" />
            <p className="text-3xl font-black">
              {new Set(wishlistItems.map((w) => w.user_email)).size}
            </p>
            <p className="text-sm text-white/90 font-semibold">Unique Customers</p>
          </Card>
        </div>

        {suggestions.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-5 flex items-center gap-2">
              <span className="text-3xl">📊</span>
              Customer Demand Data
            </h2>
            {suggestions.map((suggestion, index) => {
              const availableAt = checkAvailability(suggestion.product_id);
              const priority =
                suggestion.unique_users_count >= 10
                  ? "high"
                  : suggestion.unique_users_count >= 5
                  ? "medium"
                  : "low";

              return (
                <motion.div
                  key={suggestion.product_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                >
                  <Card className="p-5 hover:shadow-colorful transition-all duration-300 border-2 border-white rounded-3xl bg-white/90 backdrop-blur-sm">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md">
                        {suggestion.product_image ? (
                          <img
                            src={suggestion.product_image}
                            alt={suggestion.product_name}
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <div className="text-3xl">🥤</div>
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-bold text-gray-900 text-base">
                            {suggestion.product_name}
                          </h3>
                          <Badge
                            className={`${
                              priority === "high"
                                ? "gradient-peach"
                                : priority === "medium"
                                ? "gradient-lemon"
                                : "gradient-turquoise"
                            } text-white border-none shadow-md font-bold`}
                          >
                            {priority.toUpperCase()}
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-8 h-8 gradient-mint rounded-lg flex items-center justify-center shadow-sm">
                              <Users className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-gray-700 font-medium">
                              <span className="font-black text-[#00C781] text-lg">
                                {suggestion.unique_users_count}
                              </span>{" "}
                              customers want this
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-lg flex items-center justify-center shadow-sm">
                              <MapPin className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-gray-700 font-medium">
                              Available in{" "}
                              <span className="font-black text-gray-900">{availableAt}</span>{" "}
                              {availableAt === 1 ? "machine" : "machines"}
                            </span>
                          </div>
                        </div>

                        {availableAt === 0 && (
                          <Badge
                            className="mt-3 bg-red-500 text-white border-none shadow-md font-bold"
                          >
                            ⚠️ Not stocked anywhere - High demand!
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Customer Requests Yet
            </h3>
            <p className="text-gray-500">
              Wishlist data will appear here to help optimize inventory
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
