import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Heart, Trash2, MapPin, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

export default function Wishlist() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  const { data: wishlistItems = [], isLoading } = useQuery({
    queryKey: ["wishlist", user?.email],
    queryFn: () => base44.entities.Wishlist.filter({ user_email: user?.email }),
    enabled: !!user?.email,
    initialData: [],
  });

  const { data: machines = [] } = useQuery({
    queryKey: ["machines"],
    queryFn: () => base44.entities.VendingMachine.list(),
    initialData: [],
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: async (itemId) => {
      await base44.entities.Wishlist.delete(itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["wishlist"]);
    },
  });

  const handleRemove = (itemId) => {
    if (confirm("Remove this item from your wishlist?")) {
      removeFromWishlistMutation.mutate(itemId);
    }
  };

  const findNearestMachine = (productId) => {
    const availableMachines = machines.filter((machine) =>
      machine.products_inventory?.some((item) => item.product_id === productId)
    );
    return availableMachines[0];
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-[#00C781]">Loading...</div>
      </div>
    );
  }

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
          <h1 className="font-semibold text-gray-900 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" fill="currentColor" />
            My Wishlist
          </h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="pt-20 px-6 pb-6">
        {/* Info Card */}
        <Card className="p-4 mb-6 bg-gradient-to-br from-pink-50 to-red-50 border-red-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Heart className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">About Wishlist</h3>
              <p className="text-sm text-gray-700">
                Add products you can't find nearby. Your wishlist helps us understand 
                demand and restock machines accordingly.
              </p>
            </div>
          </div>
        </Card>

        {/* Wishlist Items */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="h-32 animate-pulse bg-gray-100" />
            ))}
          </div>
        ) : wishlistItems.length > 0 ? (
          <div className="space-y-4">
            <AnimatePresence>
              {wishlistItems.map((item) => {
                const nearestMachine = findNearestMachine(item.product_id);
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <Card className="overflow-hidden border-gray-100 shadow-md hover:shadow-lg transition-all duration-300">
                      <div className="flex gap-4 p-4">
                        {/* Product Image */}
                        <Link
                          to={`${createPageUrl("ProductDetail")}?id=${item.product_id}`}
                          className="flex-shrink-0"
                        >
                          <div className="w-24 h-24 bg-gradient-to-br from-[#E8F9F3] to-white rounded-xl flex items-center justify-center">
                            {item.product_image ? (
                              <img
                                src={item.product_image}
                                alt={item.product_name}
                                className="w-full h-full object-contain p-2"
                              />
                            ) : (
                              <div className="text-4xl">🥤</div>
                            )}
                          </div>
                        </Link>

                        {/* Product Info */}
                        <div className="flex-1">
                          <Link
                            to={`${createPageUrl("ProductDetail")}?id=${item.product_id}`}
                          >
                            <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                              {item.product_name}
                            </h3>
                          </Link>
                          <p className="text-lg font-bold text-[#00C781] mb-2">
                            ¥{item.product_price?.toFixed(2)}
                          </p>

                          {nearestMachine ? (
                            <Link
                              to={`${createPageUrl("MachineDetail")}?id=${nearestMachine.id}`}
                            >
                              <Badge
                                variant="outline"
                                className="bg-green-50 text-green-700 border-green-200 mb-2"
                              >
                                <MapPin className="w-3 h-3 mr-1" />
                                Available nearby
                              </Badge>
                            </Link>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-orange-50 text-orange-700 border-orange-200 mb-2"
                            >
                              Not available nearby
                            </Badge>
                          )}

                          {item.reason && (
                            <p className="text-xs text-gray-500">{item.reason}</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemove(item.id)}
                            className="text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-16">
            <Heart className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Your wishlist is empty
            </h3>
            <p className="text-gray-500 mb-6">
              Browse our products and add items you'd like to see in nearby machines
            </p>
            <Link to={createPageUrl("Products")}>
              <Button className="genki-gradient text-white">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Browse Products
              </Button>
            </Link>
          </div>
        )}

        {/* Restock Info */}
        {wishlistItems.length > 0 && (
          <Card className="p-5 mt-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-100">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <span className="text-2xl">📊</span>
              Help Us Serve You Better
            </h3>
            <p className="text-sm text-gray-700 mb-3">
              Your wishlist items are being tracked. We use this data to understand 
              customer demand and optimize our vending machine inventory.
            </p>
            <p className="text-xs text-gray-600">
              💡 Tip: The more users wishlist an item, the higher priority it gets 
              for restocking in your area!
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
