
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Search, Filter, ShoppingCart, Heart, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import PersonalizedRecommendations from "../components/recommendations/PersonalizedRecommendations";

const categoryColors = {
  sparkling_water: "from-cyan-400 to-blue-500",
  tea: "from-green-400 to-emerald-500",
  juice: "from-orange-400 to-amber-500",
  energy_drink: "from-red-400 to-rose-500",
  snacks: "from-purple-400 to-pink-500",
};

const categoryNames = {
  sparkling_water: "Sparkling Water",
  tea: "Tea",
  juice: "Juice",
  energy_drink: "Energy Drink",
  snacks: "Snacks",
};

export default function Products() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

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

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
    initialData: [],
  });

  const { data: wishlistItems = [] } = useQuery({
    queryKey: ["wishlist", user?.email],
    queryFn: () => base44.entities.Wishlist.filter({ user_email: user?.email }),
    enabled: !!user?.email,
    initialData: [],
  });

  const addToWishlistMutation = useMutation({
    mutationFn: async (product) => {
      await base44.entities.Wishlist.create({
        user_email: user.email,
        product_id: product.id,
        product_name: product.name,
        product_image: product.image_url,
        product_price: product.price,
        reason: "Not available in nearby machines",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["wishlist"]);
    },
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: async (productId) => {
      const item = wishlistItems.find((w) => w.product_id === productId);
      if (item) {
        await base44.entities.Wishlist.delete(item.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["wishlist"]);
    },
  });

  const toggleWishlist = (product) => {
    if (!user) {
      alert("Please login to use wishlist");
      return;
    }

    const isWishlisted = wishlistItems.some((w) => w.product_id === product.id);
    if (isWishlisted) {
      removeFromWishlistMutation.mutate(product.id);
    } else {
      addToWishlistMutation.mutate(product);
    }
  };

  const isProductWishlisted = (productId) => {
    return wishlistItems.some((w) => w.product_id === productId);
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="gradient-rainbow text-white px-6 pt-8 pb-6 gradient-animate">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-1" style={{textShadow: '0 2px 10px rgba(0,0,0,0.1)'}}>
              Product Catalog ✨
            </h1>
            <p className="text-white/95 text-sm font-medium">
              {filteredProducts.length} delicious items
            </p>
          </div>
          <div className="flex gap-2">
            <Link to={createPageUrl("Wishlist")}>
              <Button
                size="icon"
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border-none relative shadow-lg h-12 w-12 rounded-2xl"
              >
                <Heart className="w-5 h-5" />
                {wishlistItems.length > 0 && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 gradient-peach rounded-full flex items-center justify-center text-xs font-bold shadow-lg">
                    {wishlistItems.length}
                  </div>
                )}
              </Button>
            </Link>
            <Link to={createPageUrl("BulkOrder")}>
              <Button
                size="icon"
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border-none shadow-lg h-12 w-12 rounded-2xl"
              >
                <ShoppingCart className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="pl-12 bg-white border-none h-14 rounded-2xl shadow-lg text-gray-900"
          />
        </div>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="bg-white/90 border-none text-gray-900 backdrop-blur-sm h-12 rounded-2xl shadow-lg font-medium">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="sparkling_water">💧 Sparkling Water</SelectItem>
            <SelectItem value="tea">🍵 Tea</SelectItem>
            <SelectItem value="juice">🧃 Juice</SelectItem>
            <SelectItem value="energy_drink">⚡ Energy Drink</SelectItem>
            <SelectItem value="snacks">🍿 Snacks</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="px-6 pb-6">
        {/* AI Recommendations Section */}
        {user && <PersonalizedRecommendations user={user} />}

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="h-72 animate-pulse bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <AnimatePresence>
              {filteredProducts.map((product, idx) => {
                const wishlisted = isProductWishlisted(product.id);
                const hasTag = product.tags && product.tags.length > 0;
                
                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ scale: 1.05, y: -5 }}
                  >
                    <Card className="overflow-hidden hover:shadow-colorful transition-all duration-300 border-2 border-white bg-white rounded-3xl relative">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          toggleWishlist(product);
                        }}
                        className={`absolute top-3 left-3 z-10 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 shadow-lg ${
                          wishlisted
                            ? "gradient-peach text-white scale-110"
                            : "bg-white/90 backdrop-blur-sm text-gray-600 hover:bg-white"
                        }`}
                      >
                        <Heart className="w-4 h-4" fill={wishlisted ? "currentColor" : "none"} />
                      </button>

                      {hasTag && (
                        <Badge className="absolute top-3 right-3 z-10 gradient-lemon text-white border-none shadow-lg font-bold">
                          {product.tags[0]}
                        </Badge>
                      )}

                      <Link to={`${createPageUrl("ProductDetail")}?id=${product.id}`}>
                        <div className={`aspect-square bg-gradient-to-br ${categoryColors[product.category]} p-6 flex items-center justify-center relative`}>
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-contain drop-shadow-2xl"
                            />
                          ) : (
                            <div className="text-7xl drop-shadow-lg">🥤</div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-bold text-sm text-gray-900 mb-2 line-clamp-2">
                            {product.name}
                          </h3>
                          {product.flavor && (
                            <p className="text-xs text-gray-500 mb-2 font-medium">
                              {product.flavor}
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <p className="text-xl font-black bg-gradient-to-r from-[#00C781] to-[#00D9FF] bg-clip-text text-transparent">
                              ¥{product.price.toFixed(2)}
                            </p>
                            <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white border-none shadow-md">
                              +{product.points_value} pts
                            </Badge>
                          </div>
                        </div>
                      </Link>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {!isLoading && filteredProducts.length === 0 && (
          <div className="text-center py-16">
            <div className="text-8xl mb-4">🔍</div>
            <p className="text-gray-600 font-semibold text-lg">No products found</p>
            <p className="text-gray-400 text-sm mt-2">Try a different search or category</p>
          </div>
        )}
      </div>
    </div>
  );
}
