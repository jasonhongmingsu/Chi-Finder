import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, MapPin, Navigation2, Clock, Edit, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function MachineDetail() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const urlParams = new URLSearchParams(window.location.search);
  const machineId = urlParams.get("id");

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

  const { data: machine, isLoading: machineLoading } = useQuery({
    queryKey: ["machine", machineId],
    queryFn: async () => {
      const machines = await base44.entities.VendingMachine.list();
      return machines.find((m) => m.id === machineId);
    },
    enabled: !!machineId,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
    initialData: [],
  });

  if (machineLoading || !machine) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-[#00C781]">Loading...</div>
      </div>
    );
  }

  const machineProducts = machine.products_inventory
    ?.filter((item) => item.is_on_shelf !== false)
    ?.map((item) => {
      const product = products.find((p) => p.id === item.product_id && p.is_active);
      return product ? { ...product, stock: item.quantity, promo_tag: item.promo_tag } : null;
    })
    .filter(Boolean) || [];

  const openMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${machine.latitude},${machine.longitude}`;
    window.open(url, "_blank");
  };

  const isOperator = user?.role === "admin";

  return (
    <div className="min-h-screen bg-white">
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
          <h1 className="font-semibold text-gray-900">Machine Details</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="pt-16">
        <div className="genki-gradient text-white p-6 pb-12">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm flex-shrink-0">
              <MapPin className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">{machine.name}</h2>
              <p className="text-white/90 text-sm mb-4">{machine.address}</p>
              <div className="flex items-center gap-2">
                <Badge
                  className={`${
                    machine.status === "active"
                      ? "bg-green-500"
                      : "bg-orange-500"
                  } border-none`}
                >
                  {machine.status === "active" ? "Active" : "Maintenance"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              onClick={openMaps}
              className="flex-1 bg-white text-[#00C781] hover:bg-white/90"
            >
              <Navigation2 className="w-4 h-4 mr-2" />
              Get Directions
            </Button>
            {isOperator && (
              <Link
                to={`${createPageUrl("InventoryManagement")}?id=${machineId}`}
                className="flex-1"
              >
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Edit className="w-4 h-4 mr-2" />
                  Manage Inventory
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="px-6 py-6 -mt-6">
          <Card className="p-6 shadow-lg border-none mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Available Products
              </h3>
              <Badge variant="outline" className="bg-[#E8F9F3] text-[#00C781] border-none">
                {machineProducts.length} items
              </Badge>
            </div>

            {machineProducts.length > 0 ? (
              <div className="space-y-3">
                {machineProducts.map((product) => (
                  <Link
                    key={product.id}
                    to={`${createPageUrl("ProductDetail")}?id=${product.id}`}
                  >
                    <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 relative">
                      {product.promo_tag && (
                        <Badge className="absolute -top-2 -right-2 bg-red-500 text-white border-none text-xs">
                          {product.promo_tag}
                        </Badge>
                      )}
                      <div className="w-16 h-16 bg-gradient-to-br from-[#E8F9F3] to-white rounded-xl flex items-center justify-center flex-shrink-0">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <div className="text-2xl">🥤</div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">
                          {product.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          ¥{product.price.toFixed(2)}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`${
                          product.stock > 5
                            ? "bg-green-50 text-green-700 border-green-200"
                            : product.stock > 0
                            ? "bg-orange-50 text-orange-700 border-orange-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }`}
                      >
                        {product.stock > 0 ? `${product.stock} left` : "Out of stock"}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No products available</p>
              </div>
            )}
          </Card>

          <Card className="p-6 border-none shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Machine Information
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Location</span>
                <span className="font-medium text-gray-900">{machine.address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <span className="font-medium text-gray-900 capitalize">
                  {machine.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Products</span>
                <span className="font-medium text-gray-900">
                  {machineProducts.length} items
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
