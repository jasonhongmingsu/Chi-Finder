import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, MapPin, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const statusColors = {
  completed: "bg-green-100 text-green-700 border-green-200",
  processing: "bg-blue-100 text-blue-700 border-blue-200",
  delivered: "bg-purple-100 text-purple-700 border-purple-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

const statusIcons = {
  completed: CheckCircle2,
  processing: Clock,
  delivered: Package,
  cancelled: Package,
};

export default function PurchaseHistory() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ["purchases", user?.email],
    queryFn: () =>
      base44.entities.Purchase.filter(
        { user_email: user?.email },
        "-purchase_date"
      ),
    enabled: !!user?.email,
    initialData: [],
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-[#00C781]">Loading...</div>
      </div>
    );
  }

  const totalSpent = purchases.reduce((sum, p) => sum + p.total_amount, 0);
  const totalPoints = purchases.reduce((sum, p) => sum + (p.points_earned || 0), 0);

  return (
    <div className="min-h-screen bg-white">
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
          <h1 className="font-semibold text-gray-900">Purchase History</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="pt-16">
        {/* Stats */}
        <div className="genki-gradient text-white p-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{purchases.length}</p>
              <p className="text-xs text-white/90 mt-1">Total Orders</p>
            </div>
            <div>
              <p className="text-2xl font-bold">¥{totalSpent.toFixed(0)}</p>
              <p className="text-xs text-white/90 mt-1">Total Spent</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{totalPoints}</p>
              <p className="text-xs text-white/90 mt-1">Points Earned</p>
            </div>
          </div>
        </div>

        {/* Purchase List */}
        <div className="px-6 py-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="h-32 animate-pulse bg-gray-100" />
              ))}
            </div>
          ) : purchases.length > 0 ? (
            <div className="space-y-4">
              {purchases.map((purchase) => {
                const StatusIcon = statusIcons[purchase.status];
                return (
                  <Card
                    key={purchase.id}
                    className="p-4 hover:shadow-lg transition-all duration-300 border-gray-100"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-[#E8F9F3] rounded-xl flex items-center justify-center">
                          <Package className="w-6 h-6 text-[#00C781]" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            Order #{purchase.id.slice(-8)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(
                              new Date(purchase.purchase_date || purchase.created_date),
                              "MMM d, yyyy • h:mm a"
                            )}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={statusColors[purchase.status]}
                      >
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {purchase.status}
                      </Badge>
                    </div>

                    {/* Products */}
                    <div className="mb-3 pl-15 space-y-2">
                      {purchase.products?.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-700">
                            {item.product_name} x{item.quantity}
                          </span>
                          <span className="text-gray-900 font-medium">
                            ¥{(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Type & Location */}
                    {purchase.purchase_type === "vending" && purchase.vending_machine_id && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-3 pl-15">
                        <MapPin className="w-3 h-3" />
                        <span>Vending Machine Purchase</span>
                      </div>
                    )}
                    {purchase.purchase_type === "delivery" && purchase.delivery_address && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-3 pl-15">
                        <Package className="w-3 h-3" />
                        <span>Delivery: {purchase.delivery_address}</span>
                      </div>
                    )}

                    {/* Total */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <TrendingUp className="w-4 h-4 text-[#00C781]" />
                        <span>+{purchase.points_earned || 0} points</span>
                      </div>
                      <p className="text-lg font-bold text-gray-900">
                        ¥{purchase.total_amount.toFixed(2)}
                      </p>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No purchases yet</p>
              <p className="text-sm text-gray-400">
                Start shopping to see your order history
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
