
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft,
  MapPin,
  Activity,
  TrendingUp,
  Package,
  AlertCircle,
  Plus,
  Settings,
  BarChart3,
  DollarSign,
  Brain, // Added Brain icon import
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

const COLORS = ["#00C781", "#0066FF", "#FF6B6B", "#FFB800", "#9B59B6", "#3498DB", "#E74C3C", "#1ABC9C"];

export default function OperatorDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [timeRange, setTimeRange] = useState("7");

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  const { data: machines = [] } = useQuery({
    queryKey: ["machines"],
    queryFn: () => base44.entities.VendingMachine.list(),
    initialData: [],
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["allPurchases"],
    queryFn: () => base44.entities.Purchase.list("-created_date", 500),
    initialData: [],
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
    initialData: [],
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-[#00C781]">Loading...</div>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-screen px-6">
        <div className="text-center">
          <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500 mb-6">
            This dashboard is only accessible to operators and administrators.
          </p>
          <Button onClick={() => navigate("/")}>Go to Home</Button>
        </div>
      </div>
    );
  }

  const daysAgo = parseInt(timeRange);
  const startDate = startOfDay(subDays(new Date(), daysAgo));
  const filteredPurchases = purchases.filter((p) => {
    const purchaseDate = new Date(p.purchase_date || p.created_date);
    return purchaseDate >= startDate;
  });

  const activeMachines = machines.filter((m) => m.status === "active").length;
  const maintenanceMachines = machines.filter((m) => m.status === "maintenance").length;
  const offlineMachines = machines.filter((m) => m.status === "offline").length;

  const totalRevenue = filteredPurchases.reduce((sum, p) => sum + (p.total_amount || 0), 0);
  const totalOrders = filteredPurchases.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const lowStockMachines = machines.filter((m) => {
    const totalStock = m.products_inventory?.reduce(
      (sum, item) => sum + (item.quantity || 0),
      0
    );
    return totalStock < 10;
  }).length;

  const salesByMachine = machines.map((machine) => {
    const machinePurchases = filteredPurchases.filter(
      (p) => p.vending_machine_id === machine.id
    );
    const revenue = machinePurchases.reduce((sum, p) => sum + (p.total_amount || 0), 0);
    return {
      name: machine.name.split("-")[0].trim(),
      revenue: revenue,
      orders: machinePurchases.length,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  const salesTrend = [];
  for (let i = daysAgo - 1; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const dayPurchases = purchases.filter((p) => {
      const purchaseDate = new Date(p.purchase_date || p.created_date);
      return purchaseDate >= dayStart && purchaseDate <= dayEnd;
    });

    salesTrend.push({
      date: format(date, "MMM dd"),
      revenue: dayPurchases.reduce((sum, p) => sum + (p.total_amount || 0), 0),
      orders: dayPurchases.length,
    });
  }

  const productSales = {};
  filteredPurchases.forEach((purchase) => {
    purchase.products?.forEach((item) => {
      if (!productSales[item.product_id]) {
        productSales[item.product_id] = {
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: 0,
          revenue: 0,
        };
      }
      productSales[item.product_id].quantity += item.quantity;
      productSales[item.product_id].revenue += item.price * item.quantity;
    });
  });

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const uptimeData = machines.map((machine) => ({
    name: machine.name.split("-")[0].trim(),
    uptime: machine.status === "active" ? 100 : machine.status === "maintenance" ? 50 : 0,
    status: machine.status,
  }));

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white px-6 pt-8 pb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Operator Dashboard</h1>
            <p className="text-white/90 text-sm">Real-time analytics & management</p>
          </div>
          <Button
            size="icon"
            onClick={() => navigate("/")}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border-none"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 bg-white/10 backdrop-blur-sm border-white/20 text-white">
            <DollarSign className="w-6 h-6 mb-2 text-green-300" />
            <p className="text-2xl font-bold">¥{totalRevenue.toFixed(0)}</p>
            <p className="text-sm text-white/90">Total Revenue</p>
          </Card>
          <Card className="p-4 bg-white/10 backdrop-blur-sm border-white/20 text-white">
            <Package className="w-6 h-6 mb-2 text-blue-300" />
            <p className="text-2xl font-bold">{totalOrders}</p>
            <p className="text-sm text-white/90">Total Orders</p>
          </Card>
          <Card className="p-4 bg-white/10 backdrop-blur-sm border-white/20 text-white">
            <Activity className="w-6 h-6 mb-2 text-yellow-300" />
            <p className="text-2xl font-bold">{activeMachines}</p>
            <p className="text-sm text-white/90">Active Machines</p>
          </Card>
          <Card className="p-4 bg-white/10 backdrop-blur-sm border-white/20 text-white">
            <TrendingUp className="w-6 h-6 mb-2 text-purple-300" />
            <p className="text-2xl font-bold">¥{averageOrderValue.toFixed(2)}</p>
            <p className="text-sm text-white/90">Avg Order</p>
          </Card>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Analytics Overview</h2>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24 hours</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="p-6 mb-6 border-none shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Sales Trend</h3>
              <p className="text-sm text-gray-500">Revenue and orders over time</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#666" fontSize={12} />
              <YAxis stroke="#666" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#00C781"
                strokeWidth={3}
                dot={{ fill: "#00C781", r: 4 }}
                name="Revenue (¥)"
              />
              <Line
                type="monotone"
                dataKey="orders"
                stroke="#0066FF"
                strokeWidth={3}
                dot={{ fill: "#0066FF", r: 4 }}
                name="Orders"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 mb-6 border-none shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Sales by Machine</h3>
              <p className="text-sm text-gray-500">Performance comparison</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesByMachine}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#666" fontSize={12} />
              <YAxis stroke="#666" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar dataKey="revenue" fill="#00C781" name="Revenue (¥)" radius={[8, 8, 0, 0]} />
              <Bar dataKey="orders" fill="#0066FF" name="Orders" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <Card className="p-6 border-none shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Top Products</h3>
                <p className="text-sm text-gray-500">Most popular items</p>
              </div>
            </div>
            {topProducts.length > 0 ? (
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div
                    key={product.product_id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">
                          {product.product_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {product.quantity} units sold
                        </p>
                      </div>
                    </div>
                    <p className="font-bold text-[#00C781]">
                      ¥{product.revenue.toFixed(0)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No sales data available</p>
              </div>
            )}
          </Card>

          <Card className="p-6 border-none shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <Activity className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Machine Status</h3>
                <p className="text-sm text-gray-500">Uptime percentage</p>
              </div>
            </div>
            <div className="space-y-3">
              {uptimeData.map((machine, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      {machine.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">
                        {machine.uptime}%
                      </span>
                      <Badge
                        className={`${
                          machine.status === "active"
                            ? "bg-green-100 text-green-700 border-green-200"
                            : machine.status === "maintenance"
                            ? "bg-orange-100 text-orange-700 border-orange-200"
                            : "bg-red-100 text-red-700 border-red-200"
                        }`}
                        variant="outline"
                      >
                        {machine.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        machine.uptime === 100
                          ? "bg-green-500"
                          : machine.uptime > 0
                          ? "bg-orange-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${machine.uptime}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <Link to={createPageUrl("AddMachine")}>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Card className="p-5 text-center hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-green-500 to-emerald-500 text-white border-none rounded-3xl">
                <Plus className="w-10 h-10 mx-auto mb-2" />
                <p className="font-semibold">Add Machine</p>
              </Card>
            </motion.div>
          </Link>
          <Link to={createPageUrl("AIAnalytics")}>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Card className="p-5 text-center hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none rounded-3xl">
                <Brain className="w-10 h-10 mx-auto mb-2" />
                <p className="font-semibold">AI Analytics</p>
              </Card>
            </motion.div>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <Link to={createPageUrl("RestockSuggestions")}>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Card className="p-5 text-center hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-blue-500 to-cyan-500 text-white border-none rounded-3xl">
                <BarChart3 className="w-10 h-10 mx-auto mb-2" />
                <p className="font-semibold">Restock Insights</p>
              </Card>
            </motion.div>
          </Link>
          <div className="opacity-50">
            <Card className="p-5 text-center bg-gradient-to-br from-gray-300 to-gray-400 text-white border-none rounded-3xl">
              <Package className="w-10 h-10 mx-auto mb-2" />
              <p className="font-semibold text-sm">More Coming Soon</p>
            </Card>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Machine Status Summary</h2>
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4 border-2 border-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-green-600">{activeMachines}</p>
                  <p className="text-sm text-gray-600">Active</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Activity className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </Card>
            <Card className="p-4 border-2 border-orange-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-orange-600">
                    {maintenanceMachines}
                  </p>
                  <p className="text-sm text-gray-600">Maintenance</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Settings className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </Card>
            <Card className="p-4 border-2 border-red-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-red-600">{offlineMachines}</p>
                  <p className="text-sm text-gray-600">Offline</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">All Machines</h2>
          <div className="space-y-3">
            {machines.map((machine, index) => {
              const totalStock = machine.products_inventory?.reduce(
                (sum, item) => sum + (item.quantity || 0),
                0
              );
              const isLowStock = totalStock < 10;
              const machineRevenue = salesByMachine.find(
                (s) => s.name === machine.name.split("-")[0].trim()
              );

              return (
                <motion.div
                  key={machine.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link to={`${createPageUrl("ManageMachine")}?id=${machine.id}`}>
                    <Card className="p-4 hover:shadow-lg transition-all duration-300 border-gray-100">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-6 h-6 text-indigo-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">
                              {machine.name}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2 line-clamp-1">
                              {machine.address}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                className={`${
                                  machine.status === "active"
                                    ? "bg-green-100 text-green-700 border-green-200"
                                    : machine.status === "maintenance"
                                    ? "bg-orange-100 text-orange-700 border-orange-200"
                                    : "bg-red-100 text-red-700 border-red-200"
                                }`}
                                variant="outline"
                              >
                                {machine.status}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {machine.products_inventory?.length || 0} SKUs
                              </Badge>
                              {machineRevenue && machineRevenue.revenue > 0 && (
                                <Badge
                                  variant="outline"
                                  className="bg-green-50 text-green-700 border-green-200"
                                >
                                  ¥{machineRevenue.revenue.toFixed(0)} revenue
                                </Badge>
                              )}
                              {isLowStock && (
                                <Badge
                                  variant="outline"
                                  className="bg-red-50 text-red-700 border-red-200"
                                >
                                  Low Stock
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">
                            {totalStock || 0}
                          </p>
                          <p className="text-xs text-gray-500">Total Items</p>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {machines.length === 0 && (
            <Card className="p-8 text-center border-dashed border-2">
              <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No machines added yet</p>
              <Link to={createPageUrl("AddMachine")}>
                <Button className="genki-gradient text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Machine
                </Button>
              </Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
