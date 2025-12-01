import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft,
  Settings,
  Package,
  Plus,
  Minus,
  Trash2,
  Save,
  Activity,
  AlertCircle,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function ManageMachine() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [productQuantity, setProductQuantity] = useState(10);

  const urlParams = new URLSearchParams(window.location.search);
  const machineId = urlParams.get("id");

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
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

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus) => {
      await base44.entities.VendingMachine.update(machineId, {
        status: newStatus,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["machine", machineId]);
      queryClient.invalidateQueries(["machines"]);
    },
  });

  const updateInventoryMutation = useMutation({
    mutationFn: async (newInventory) => {
      await base44.entities.VendingMachine.update(machineId, {
        products_inventory: newInventory,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["machine", machineId]);
      queryClient.invalidateQueries(["machines"]);
    },
  });

  const handleStatusChange = async (newStatus) => {
    if (confirm(`Change machine status to ${newStatus}?`)) {
      await updateStatusMutation.mutateAsync(newStatus);
    }
  };

  const handleQuantityChange = (productId, delta) => {
    const currentInventory = machine.products_inventory || [];
    const updatedInventory = currentInventory.map((item) => {
      if (item.product_id === productId) {
        return {
          ...item,
          quantity: Math.max(0, (item.quantity || 0) + delta),
        };
      }
      return item;
    });
    updateInventoryMutation.mutate(updatedInventory);
  };

  const handleRemoveProduct = (productId) => {
    if (confirm("Remove this product from the machine?")) {
      const currentInventory = machine.products_inventory || [];
      const updatedInventory = currentInventory.filter(
        (item) => item.product_id !== productId
      );
      updateInventoryMutation.mutate(updatedInventory);
    }
  };

  const handleAddProduct = () => {
    if (!selectedProduct) {
      alert("Please select a product");
      return;
    }

    const currentInventory = machine.products_inventory || [];
    const existingProduct = currentInventory.find(
      (item) => item.product_id === selectedProduct
    );

    if (existingProduct) {
      alert("Product already exists in this machine. Adjust quantity instead.");
      return;
    }

    const updatedInventory = [
      ...currentInventory,
      {
        product_id: selectedProduct,
        quantity: productQuantity,
      },
    ];

    updateInventoryMutation.mutate(updatedInventory);
    setShowAddProduct(false);
    setSelectedProduct("");
    setProductQuantity(10);
  };

  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-screen px-6">
        <div className="text-center">
          <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500 mb-6">Operators only</p>
          <Button onClick={() => navigate("/")}>Go to Home</Button>
        </div>
      </div>
    );
  }

  if (machineLoading || !machine) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-[#00C781]">Loading...</div>
      </div>
    );
  }

  const machineProducts = machine.products_inventory?.map((item) => {
    const product = products.find((p) => p.id === item.product_id);
    return product ? { ...product, stock: item.quantity } : null;
  }).filter(Boolean) || [];

  const totalStock = machine.products_inventory?.reduce(
    (sum, item) => sum + (item.quantity || 0),
    0
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm z-10 border-b border-gray-100">
        <div className="flex items-center justify-between px-6 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("OperatorDashboard"))}
            className="hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-gray-900">Manage Machine</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="pt-20 px-6 pb-6">
        {/* Machine Info */}
        <Card className="p-6 mb-6 bg-gradient-to-br from-indigo-500 to-purple-500 text-white border-none">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm flex-shrink-0">
              <MapPin className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">{machine.name}</h2>
              <p className="text-white/90 text-sm mb-3">{machine.address}</p>
              <div className="flex items-center gap-2">
                <Badge
                  className={`${
                    machine.status === "active"
                      ? "bg-green-500"
                      : machine.status === "maintenance"
                      ? "bg-orange-500"
                      : "bg-red-500"
                  } border-none text-white`}
                >
                  {machine.status}
                </Badge>
                <Badge className="bg-white/20 border-white/30 text-white">
                  {totalStock || 0} items
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Status Control */}
        <Card className="p-6 mb-6 border-none shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Machine Status</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant={machine.status === "active" ? "default" : "outline"}
              onClick={() => handleStatusChange("active")}
              className={
                machine.status === "active"
                  ? "bg-green-500 hover:bg-green-600 text-white"
                  : ""
              }
            >
              <Activity className="w-4 h-4 mr-2" />
              Active
            </Button>
            <Button
              variant={machine.status === "maintenance" ? "default" : "outline"}
              onClick={() => handleStatusChange("maintenance")}
              className={
                machine.status === "maintenance"
                  ? "bg-orange-500 hover:bg-orange-600 text-white"
                  : ""
              }
            >
              <Settings className="w-4 h-4 mr-2" />
              Maintenance
            </Button>
            <Button
              variant={machine.status === "offline" ? "default" : "outline"}
              onClick={() => handleStatusChange("offline")}
              className={
                machine.status === "offline"
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : ""
              }
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Offline
            </Button>
          </div>
        </Card>

        {/* Inventory Management */}
        <Card className="p-6 border-none shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-gray-700" />
              <h3 className="text-lg font-semibold text-gray-900">
                Inventory ({machineProducts.length} products)
              </h3>
            </div>
            <Button
              onClick={() => setShowAddProduct(true)}
              size="sm"
              className="genki-gradient text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </div>

          {machineProducts.length > 0 ? (
            <div className="space-y-3">
              {machineProducts.map((product) => (
                <Card key={product.id} className="p-4 border-2 border-gray-100">
                  <div className="flex items-center gap-4">
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

                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleQuantityChange(product.id, -1)}
                        disabled={product.stock === 0}
                        className="h-8 w-8"
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <div className="w-16 text-center">
                        <p className="text-2xl font-bold text-gray-900">
                          {product.stock}
                        </p>
                        <p className="text-xs text-gray-500">in stock</p>
                      </div>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleQuantityChange(product.id, 1)}
                        className="h-8 w-8"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveProduct(product.id)}
                        className="h-8 w-8 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-3">No products in this machine</p>
              <Button
                onClick={() => setShowAddProduct(true)}
                size="sm"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Product
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Add Product Dialog */}
      <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Product to Machine</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Select Product</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Choose a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - ¥{product.price.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Initial Quantity</Label>
              <Input
                type="number"
                min="1"
                value={productQuantity}
                onChange={(e) => setProductQuantity(parseInt(e.target.value))}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddProduct(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddProduct} className="genki-gradient text-white">
              <Save className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
