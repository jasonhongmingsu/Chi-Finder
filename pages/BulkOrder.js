import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Minus, Trash2, ShoppingCart, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function BulkOrder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [deliveryAddress, setDeliveryAddress] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
    initialData: [],
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData) => {
      const purchase = await base44.entities.Purchase.create(orderData);
      
      // Create points transaction
      const pointsEarned = orderData.products.reduce(
        (sum, item) => {
          const product = products.find(p => p.id === item.product_id);
          return sum + (product?.points_value || 0) * item.quantity;
        },
        0
      );

      await base44.entities.PointsTransaction.create({
        user_email: user.email,
        points_amount: pointsEarned,
        transaction_type: "earned",
        description: `Earned from bulk order #${purchase.id.slice(-8)}`,
        related_purchase_id: purchase.id,
      });

      // Update user
      await base44.auth.updateMe({
        points_balance: (user.points_balance || 0) + pointsEarned,
        total_purchases: (user.total_purchases || 0) + 1,
      });

      return purchase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["purchases"]);
      queryClient.invalidateQueries(["pointsTransactions"]);
      alert("Order placed successfully!");
      navigate("/");
    },
  });

  const addToCart = (product) => {
    const existing = cart.find((item) => item.product_id === product.id);
    if (existing) {
      setCart(
        cart.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          product_id: product.id,
          product_name: product.name,
          price: product.price,
          quantity: 1,
        },
      ]);
    }
  };

  const updateQuantity = (productId, delta) => {
    setCart(
      cart
        .map((item) =>
          item.product_id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.product_id !== productId));
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalPoints = cart.reduce((sum, item) => {
    const product = products.find(p => p.id === item.product_id);
    return sum + (product?.points_value || 0) * item.quantity;
  }, 0);

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert("Your cart is empty!");
      return;
    }
    if (!deliveryAddress.trim()) {
      alert("Please enter a delivery address!");
      return;
    }

    createOrderMutation.mutate({
      user_email: user.email,
      products: cart,
      total_amount: totalAmount,
      purchase_type: "delivery",
      delivery_address: deliveryAddress,
      status: "processing",
      purchase_date: new Date().toISOString(),
      points_earned: totalPoints,
    });
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
          <h1 className="font-semibold text-gray-900">Bulk Order</h1>
          <div className="relative">
            <ShoppingCart className="w-6 h-6 text-gray-600" />
            {cart.length > 0 && (
              <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                {cart.length}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="pt-16 px-6 pb-32">
        {/* Product Selection */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Select Products</h2>
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => (
              <Card
                key={product.id}
                className="p-3 hover:shadow-lg transition-all duration-300 cursor-pointer border-gray-100"
                onClick={() => addToCart(product)}
              >
                <div className="aspect-square bg-gradient-to-br from-[#E8F9F3] to-white rounded-lg mb-2 flex items-center justify-center">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <div className="text-4xl">🥤</div>
                  )}
                </div>
                <h3 className="font-semibold text-sm text-gray-900 mb-1 line-clamp-1">
                  {product.name}
                </h3>
                <p className="text-[#00C781] font-bold">¥{product.price.toFixed(2)}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Cart */}
        {cart.length > 0 && (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Your Cart</h2>
              <Card className="divide-y border-none shadow-md">
                {cart.map((item) => (
                  <div key={item.product_id} className="p-4 flex items-center gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.product_name}</h3>
                      <p className="text-sm text-gray-600">
                        ¥{item.price.toFixed(2)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.product_id, -1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center font-semibold">{item.quantity}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.product_id, 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-500"
                        onClick={() => removeFromCart(item.product_id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </Card>
            </div>

            {/* Delivery Address */}
            <div className="mb-6">
              <Label className="text-gray-900 font-semibold mb-2 block">
                Delivery Address
              </Label>
              <Textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Enter your delivery address..."
                className="h-24"
              />
            </div>
          </>
        )}
      </div>

      {/* Checkout Footer */}
      {cart.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">¥{totalAmount.toFixed(2)}</p>
                <p className="text-xs text-[#00C781]">+{totalPoints} points</p>
              </div>
              <Button
                size="lg"
                className="genki-gradient text-white hover:opacity-90"
                onClick={handleCheckout}
                disabled={createOrderMutation.isPending}
              >
                <Package className="w-5 h-5 mr-2" />
                {createOrderMutation.isPending ? "Processing..." : "Place Order"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
