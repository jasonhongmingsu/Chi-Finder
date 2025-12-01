
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, MapPin, Star, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PersonalizedRecommendations from "../components/recommendations/PersonalizedRecommendations";

export default function ProductDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [user, setUser] = useState(null);
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get("id");

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

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      const products = await base44.entities.Product.list();
      return products.find((p) => p.id === productId);
    },
    enabled: !!productId,
  });

  const { data: machines = [] } = useQuery({
    queryKey: ["machines"],
    queryFn: () => base44.entities.VendingMachine.list(),
    initialData: [],
  });

  const { data: wishlistItems = [] } = useQuery({
    queryKey: ["wishlist", user?.email],
    queryFn: () => base44.entities.Wishlist.filter({ user_email: user?.email }),
    enabled: !!user?.email,
    initialData: [],
  });

  const addToWishlistMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Wishlist.create({
        user_email: user.email,
        product_id: product.id,
        product_name: product.name,
        product_image: product.image_url,
        product_price: product.price,
        reason: "Interested in this product",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["wishlist"]);
    },
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: async () => {
      const item = wishlistItems.find((w) => w.product_id === productId);
      if (item) {
        await base44.entities.Wishlist.delete(item.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["wishlist"]);
    },
  });

  const toggleWishlist = () => {
    if (!user) {
      alert("Please login to use wishlist");
      return;
    }

    const isWishlisted = wishlistItems.some((w) => w.product_id === productId);
    if (isWishlisted) {
      removeFromWishlistMutation.mutate();
    } else {
      addToWishlistMutation.mutate();
    }
  };

  if (isLoading || !product) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-[#00C781]">Loading...</div>
      </div>
    );
  }

  const availableMachines = machines.filter((machine) =>
    machine.products_inventory?.some((item) => item.product_id === productId && item.is_on_shelf !== false)
  );

  const isWishlisted = wishlistItems.some((w) => w.product_id === productId);

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
          <h1 className="font-semibold text-gray-900">Product Details</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="pt-16">
        {/* Product Image */}
        <div className="bg-gradient-to-br from-[#E8F9F3] to-white p-8 flex items-center justify-center min-h-[300px]">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="max-h-64 object-contain"
            />
          ) : (
            <div className="text-9xl">🥤</div>
          )}
        </div>

        {/* Product Info */}
        <div className="px-6 py-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">
                  {product.name}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleWishlist}
                  className="text-gray-400 hover:text-yellow-500"
                  disabled={addToWishlistMutation.isLoading || removeFromWishlistMutation.isLoading}
                >
                  <Star
                    className={`w-6 h-6 ${isWishlisted ? "fill-yellow-500 text-yellow-500" : "text-gray-400"}`}
                  />
                </Button>
              </div>
              {product.flavor && (
                <p className="text-gray-600 mb-2">{product.flavor}</p>
              )}
              {product.size && (
                <Badge variant="outline" className="mb-3">
                  {product.size}
                </Badge>
              )}
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-[#00C781]">
                ¥{product.price.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500">+{product.points_value} points</p>
            </div>
          </div>

          {product.description && (
            <Card className="p-4 bg-gray-50 border-none mb-6">
              <p className="text-sm text-gray-700 leading-relaxed">
                {product.description}
              </p>
            </Card>
          )}

          {/* Quantity Selector */}
          <div className="mb-8">
            <p className="text-sm font-medium text-gray-700 mb-3">Quantity</p>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="h-12 w-12 rounded-full"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <div className="text-2xl font-bold text-gray-900 w-16 text-center">
                {quantity}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(quantity + 1)}
                className="h-12 w-12 rounded-full"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Available Locations */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Available At ({availableMachines.length})
              </h3>
            </div>

            {availableMachines.length > 0 ? (
              <div className="space-y-3">
                {availableMachines.map((machine) => {
                  const inventoryItem = machine.products_inventory.find(
                    (item) => item.product_id === productId
                  );
                  return (
                    <Link
                      key={machine.id}
                      to={`${createPageUrl("MachineDetail")}?id=${machine.id}`}
                    >
                      <Card className="p-4 hover:shadow-lg transition-all duration-300 border-gray-100">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-[#E8F9F3] rounded-full flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-5 h-5 text-[#00C781]" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">
                              {machine.name}
                            </h4>
                            <p className="text-sm text-gray-600 mb-2">
                              {machine.address}
                            </p>
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-200"
                            >
                              {inventoryItem?.quantity || 0} in stock
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <Card className="p-8 text-center border-dashed">
                <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  Not currently available at any nearby machines
                </p>
              </Card>
            )}
          </div>
        </div>

        {/* Add AI recommendations at the bottom, before closing divs */}
        <div className="px-6 pb-6">
          {user && <PersonalizedRecommendations user={user} />}
        </div>
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-20 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-md mx-auto flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate(createPageUrl("BulkOrder"))}
          >
            Bulk Order
          </Button>
          <Button className="flex-1 genki-gradient text-white hover:opacity-90">
            Find Nearest Machine
          </Button>
        </div>
      </div>
    </div>
  );
}
