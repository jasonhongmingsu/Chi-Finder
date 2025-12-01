import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Brain,
  TrendingUp,
  AlertCircle,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  LineChart as LineChartIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, subDays, parseISO } from "date-fns";

export default function AIAnalytics() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [insights, setInsights] = useState(null);
  const [baselineRecommendations, setBaselineRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [analysisStats, setAnalysisStats] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);

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

  const { data: machines = [] } = useQuery({
    queryKey: ["machines"],
    queryFn: () => base44.entities.VendingMachine.list(),
    initialData: [],
  });

  const { data: machineSales = [] } = useQuery({
    queryKey: ["machineSales"],
    queryFn: () => base44.entities.MachineSales.list("-created_date", 1000),
    initialData: [],
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
    initialData: [],
  });

  // Safe timestamp parser
  const parseTimestamp = (timestamp) => {
    if (!timestamp) return null;
    try {
      // Try ISO8601 format
      const date = parseISO(timestamp);
      if (!isNaN(date.getTime())) return date;
      
      // Try standard date format
      const fallbackDate = new Date(timestamp);
      if (!isNaN(fallbackDate.getTime())) return fallbackDate;
      
      return null;
    } catch (error) {
      return null;
    }
  };

  // Safe aggregation layer
  const aggregateSalesData = () => {
    const stats = {
      rowsIngested: 0,
      rowsIgnored: 0,
      lastRefreshTime: new Date().toISOString(),
    };

    const perMachineDaily = {};
    const perProductTotal = {};
    const topProductsByMachine = {};
    const trendWeek = {};

    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);
    const fourteenDaysAgo = subDays(now, 14);

    machineSales.forEach((sale) => {
      // Validate and parse timestamp
      const timestamp = parseTimestamp(sale.sale_timestamp || sale.created_date);
      if (!timestamp) {
        stats.rowsIgnored++;
        return;
      }

      // Validate quantity
      const quantity = sale.quantity_sold || 0;
      if (quantity < 0) {
        stats.rowsIgnored++;
        return;
      }

      stats.rowsIngested++;

      const machineId = sale.machine_id;
      const productId = sale.product_id;
      const dateKey = format(timestamp, "yyyy-MM-dd");
      const revenue = sale.revenue || (sale.sale_price * quantity);

      // Per machine daily
      if (!perMachineDaily[machineId]) {
        perMachineDaily[machineId] = {};
      }
      if (!perMachineDaily[machineId][dateKey]) {
        perMachineDaily[machineId][dateKey] = { quantity: 0, revenue: 0 };
      }
      perMachineDaily[machineId][dateKey].quantity += quantity;
      perMachineDaily[machineId][dateKey].revenue += revenue;

      // Per product total
      if (!perProductTotal[productId]) {
        perProductTotal[productId] = { quantity: 0, revenue: 0, name: sale.product_name || "Unknown" };
      }
      perProductTotal[productId].quantity += quantity;
      perProductTotal[productId].revenue += revenue;

      // Top products by machine
      if (!topProductsByMachine[machineId]) {
        topProductsByMachine[machineId] = {};
      }
      if (!topProductsByMachine[machineId][productId]) {
        topProductsByMachine[machineId][productId] = {
          quantity: 0,
          name: sale.product_name || "Unknown",
          lastSale: timestamp,
        };
      }
      topProductsByMachine[machineId][productId].quantity += quantity;
      if (timestamp > topProductsByMachine[machineId][productId].lastSale) {
        topProductsByMachine[machineId][productId].lastSale = timestamp;
      }

      // Trend week (last 7 days)
      if (timestamp >= sevenDaysAgo) {
        if (!trendWeek[machineId]) {
          trendWeek[machineId] = {};
        }
        if (!trendWeek[machineId][dateKey]) {
          trendWeek[machineId][dateKey] = 0;
        }
        trendWeek[machineId][dateKey] += quantity;
      }
    });

    // Calculate top N products per machine
    const topNByMachine = {};
    Object.entries(topProductsByMachine).forEach(([machineId, products]) => {
      topNByMachine[machineId] = Object.entries(products)
        .map(([productId, data]) => ({ productId, ...data }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
    });

    return {
      perMachineDaily,
      perProductTotal,
      topProductsByMachine: topNByMachine,
      trendWeek,
      stats,
      isEmpty: stats.rowsIngested === 0,
    };
  };

  // Generate baseline recommendations (rule-based fallback)
  const generateBaselineRecommendations = (aggregatedData) => {
    const recommendations = [];
    const now = new Date();
    const fourteenDaysAgo = subDays(now, 14);

    machines.forEach((machine) => {
      const machineId = machine.id;
      const topProducts = aggregatedData.topProductsByMachine[machineId] || [];
      
      // Recommend replenishing top 3 products
      const top3 = topProducts.slice(0, 3);
      if (top3.length > 0) {
        recommendations.push({
          machine_id: machineId,
          machine_name: machine.name,
          type: "restock",
          priority: "high",
          reason: "7-day top seller",
          products: top3.map(p => p.name).join(", "),
          action: `Restock ${top3.map(p => p.name).join(", ")}`,
        });
      }

      // Find products with no sales in 14 days
      topProducts.forEach((product) => {
        if (product.lastSale < fourteenDaysAgo) {
          recommendations.push({
            machine_id: machineId,
            machine_name: machine.name,
            type: "replace",
            priority: "medium",
            reason: "14-day no movement",
            products: product.name,
            action: `Consider replacing ${product.name}`,
          });
        }
      });
    });

    return recommendations;
  };

  // Generate AI insights with timeout and fallback
  const generateInsights = async () => {
    setLoading(true);
    setErrorMessage(null);
    setUsingFallback(false);
    setInsights(null);
    setBaselineRecommendations(null);

    try {
      // Aggregate data safely
      const aggregatedData = aggregateSalesData();
      setAnalysisStats(aggregatedData.stats);

      // Check if data is empty
      if (aggregatedData.isEmpty) {
        setErrorMessage("Not enough sales data yet. Please collect data from vending machines.");
        setLoading(false);
        return;
      }

      // Generate baseline as fallback
      const baseline = generateBaselineRecommendations(aggregatedData);
      setBaselineRecommendations(baseline);

      // Prepare compact JSON for AI (< 4KB)
      const machinesSummary = Object.entries(aggregatedData.perMachineDaily).map(([machineId, days]) => {
        const totalQty = Object.values(days).reduce((sum, d) => sum + d.quantity, 0);
        const totalRev = Object.values(days).reduce((sum, d) => sum + d.revenue, 0);
        const machine = machines.find(m => m.id === machineId);
        return {
          id: machineId,
          name: machine?.name || "Unknown",
          total: totalQty,
          revenue: totalRev,
        };
      });

      const topProducts = Object.entries(aggregatedData.perProductTotal)
        .map(([pid, data]) => ({
          productId: pid,
          name: data.name,
          qty: data.quantity,
          revenue: data.revenue,
        }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 10);

      const topByMachine = {};
      Object.entries(aggregatedData.topProductsByMachine).forEach(([machineId, products]) => {
        topByMachine[machineId] = products.map(p => ({
          pid: p.productId,
          name: p.name,
          qty: p.quantity,
        }));
      });

      const compactData = {
        machines: machinesSummary,
        topProducts,
        topByMachine,
        totalSales: aggregatedData.stats.rowsIngested,
      };

      // AI call with timeout (15s)
      const aiPromise = base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI analytics expert for Genki Go vending machines. Analyze this sales data and provide actionable recommendations.

DATA SUMMARY:
${JSON.stringify(compactData, null, 2)}

Provide specific, actionable recommendations for each machine. Focus on:
1. Which products to restock (high performers)
2. Which products to replace (low performers)
3. Strategic insights about trends

Keep recommendations concise and practical.`,
        response_json_schema: {
          type: "object",
          properties: {
            top_performers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  machine_name: { type: "string" },
                  reason: { type: "string" },
                  metrics: { type: "string" },
                },
              },
            },
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  machine_name: { type: "string" },
                  action: { type: "string" },
                  priority: { type: "string" },
                  reason: { type: "string" },
                },
              },
            },
            strategic_insights: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("AI timeout")), 15000)
      );

      const result = await Promise.race([aiPromise, timeoutPromise]);
      setInsights(result);
    } catch (error) {
      console.error("AI analysis failed:", error);
      setUsingFallback(true);
      setErrorMessage("AI is temporarily unavailable. Showing baseline recommendations instead.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate on load
  useEffect(() => {
    if (user?.role === "admin" && machines.length > 0 && machineSales.length > 0 && !insights && !baselineRecommendations) {
      generateInsights();
    }
  }, [user, machines, machineSales]);

  // Prepare chart data
  const getChartData = () => {
    const aggregatedData = aggregateSalesData();
    
    // Machine totals for bar chart
    const machineData = Object.entries(aggregatedData.perMachineDaily).map(([machineId, days]) => {
      const totalQty = Object.values(days).reduce((sum, d) => sum + d.quantity, 0);
      const machine = machines.find(m => m.id === machineId);
      return {
        name: machine?.name || "Unknown",
        sales: totalQty,
      };
    }).sort((a, b) => b.sales - a.sales).slice(0, 8);

    // 7-day trend for line chart
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateKey = format(date, "yyyy-MM-dd");
      const dayLabel = format(date, "MMM dd");
      
      let totalSales = 0;
      Object.values(aggregatedData.perMachineDaily).forEach(days => {
        if (days[dateKey]) {
          totalSales += days[dateKey].quantity;
        }
      });
      
      last7Days.push({ date: dayLabel, sales: totalSales });
    }

    return { machineData, trendData: last7Days };
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

  if (user.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-screen px-6">
        <div className="text-center">
          <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Admin Access Only</h2>
          <p className="text-gray-500 mb-6">
            This AI analytics dashboard is only accessible to administrators.
          </p>
          <Button onClick={() => navigate(-1)} className="gradient-rainbow text-white">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const chartData = machineSales.length > 0 ? getChartData() : { machineData: [], trendData: [] };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="gradient-rainbow text-white px-6 pt-8 pb-6 gradient-animate">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/20 rounded-2xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Button
            onClick={generateInsights}
            disabled={loading}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border-none text-white font-semibold rounded-2xl shadow-lg"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Analyzing..." : "Retry Analysis"}
          </Button>
        </div>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3" style={{textShadow: '0 2px 10px rgba(0,0,0,0.1)'}}>
          <Brain className="w-8 h-8 drop-shadow-lg" />
          AI Sales Analytics 🤖
        </h1>
        <p className="text-white/95 font-medium">Smart insights powered by AI</p>

        {/* Analysis Stats Toggle */}
        {analysisStats && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-sm text-white/90 hover:text-white font-medium"
            >
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Analysis Details
            </button>
            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-3 bg-white/20 backdrop-blur-sm rounded-2xl p-4 space-y-2"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/90 font-medium">Rows Ingested:</span>
                    <span className="text-white font-bold">{analysisStats.rowsIngested}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/90 font-medium">Rows Ignored:</span>
                    <span className="text-white font-bold">{analysisStats.rowsIgnored}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/90 font-medium">Last Refresh:</span>
                    <span className="text-white font-bold">
                      {format(new Date(analysisStats.lastRefreshTime), "MMM dd, h:mm a")}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <div className="px-6 py-6">
        {/* Error Message */}
        {errorMessage && !loading && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-5 mb-6 border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 rounded-3xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-orange-900 mb-1">Notice</p>
                  <p className="text-sm text-orange-700">{errorMessage}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {loading ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 gradient-rainbow rounded-full flex items-center justify-center mx-auto mb-4 float-animation gradient-animate">
              <Brain className="w-10 h-10 text-white animate-pulse" />
            </div>
            <p className="text-gray-700 font-semibold text-lg">AI is analyzing your data...</p>
            <p className="text-gray-500 text-sm mt-2">Processing sales patterns and trends</p>
            <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400">
              <Clock className="w-4 h-4" />
              <span>Maximum wait time: 15 seconds</span>
            </div>
          </div>
        ) : (insights || baselineRecommendations) && chartData ? (
          <div className="space-y-6">
            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Machine Performance Bar Chart */}
              {chartData.machineData.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Card className="p-6 border-2 border-white shadow-vibrant rounded-3xl bg-white/80 backdrop-blur-sm">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-indigo-600" />
                      Machine Performance
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={chartData.machineData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                            border: "none",
                            borderRadius: "12px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          }}
                        />
                        <Bar dataKey="sales" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
                        <defs>
                          <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#9B6BFF" />
                            <stop offset="100%" stopColor="#6366F1" />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </motion.div>
              )}

              {/* 7-Day Trend Line Chart */}
              {chartData.trendData.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="p-6 border-2 border-white shadow-vibrant rounded-3xl bg-white/80 backdrop-blur-sm">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <LineChartIcon className="w-5 h-5 text-emerald-600" />
                      7-Day Sales Trend
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={chartData.trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                            border: "none",
                            borderRadius: "12px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="sales"
                          stroke="#00C781"
                          strokeWidth={3}
                          dot={{ fill: "#00C781", r: 5 }}
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                </motion.div>
              )}
            </div>

            {/* AI Insights or Baseline */}
            {usingFallback && baselineRecommendations && baselineRecommendations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-6 border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-3xl mb-6">
                  <div className="flex items-start gap-3 mb-4">
                    <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
                    <div>
                      <h2 className="font-bold text-gray-900 text-lg mb-1">Baseline Recommendations</h2>
                      <p className="text-sm text-gray-600">Rule-based suggestions using 7-day and 14-day analysis</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {baselineRecommendations.map((rec, index) => (
                      <div key={index} className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-blue-100">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-bold text-gray-900">{rec.machine_name}</h3>
                          <Badge
                            className={`${
                              rec.priority === "high"
                                ? "bg-red-500"
                                : rec.priority === "medium"
                                ? "bg-orange-500"
                                : "bg-blue-500"
                            } text-white border-none`}
                          >
                            {rec.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{rec.action}</p>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {rec.reason}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}

            {/* AI-Generated Insights */}
            {insights && !usingFallback && (
              <>
                {/* Top Performers */}
                {insights.top_performers && insights.top_performers.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                      Top Performers 🌟
                    </h2>
                    <div className="space-y-4">
                      {insights.top_performers.map((machine, index) => (
                        <Card key={index} className="p-6 border-2 border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl hover:shadow-colorful transition-all duration-300">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg">
                              #{index + 1}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-bold text-gray-900 text-lg mb-2">
                                {machine.machine_name}
                              </h3>
                              <p className="text-sm text-gray-700 mb-2">{machine.reason}</p>
                              <Badge className="bg-green-500 text-white border-none font-semibold">
                                {machine.metrics}
                              </Badge>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Recommendations */}
                {insights.recommendations && insights.recommendations.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Sparkles className="w-6 h-6 text-purple-600" />
                      AI Recommendations 🎯
                    </h2>
                    <div className="space-y-4">
                      {insights.recommendations.map((rec, index) => (
                        <Card key={index} className="p-6 border-2 border-purple-100 bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl hover:shadow-colorful transition-all duration-300">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="font-bold text-gray-900 text-lg">
                              {rec.machine_name}
                            </h3>
                            <Badge
                              className={`${
                                rec.priority?.toLowerCase() === "high"
                                  ? "bg-red-500"
                                  : rec.priority?.toLowerCase() === "medium"
                                  ? "bg-orange-500"
                                  : "bg-blue-500"
                              } text-white border-none font-semibold`}
                            >
                              {rec.priority || "Normal"}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs text-gray-500 font-semibold mb-1">Action:</p>
                              <p className="text-sm text-gray-700 font-medium">{rec.action}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 font-semibold mb-1">Reason:</p>
                              <p className="text-sm text-gray-700">{rec.reason}</p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Strategic Insights */}
                {insights.strategic_insights && insights.strategic_insights.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Brain className="w-6 h-6 text-indigo-600" />
                      Strategic Insights 💡
                    </h2>
                    <Card className="p-6 border-2 border-indigo-100 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-3xl">
                      <ul className="space-y-3">
                        {insights.strategic_insights.map((insight, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5 shadow-lg">
                              {index + 1}
                            </div>
                            <p className="text-sm text-gray-700 flex-1 font-medium">{insight}</p>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  </motion.div>
                )}
              </>
            )}
          </div>
        ) : !loading && !errorMessage ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-gray-600 font-semibold text-lg mb-2">No Sales Data Available</p>
            <p className="text-gray-500 text-sm mb-6">
              Start recording sales from your vending machines to see AI analytics
            </p>
            <Button
              onClick={generateInsights}
              className="gradient-rainbow text-white font-bold rounded-2xl shadow-lg"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Analysis
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
