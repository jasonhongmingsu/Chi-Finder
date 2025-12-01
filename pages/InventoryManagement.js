import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft,
  Plus,
  Search,
  Edit,
  Trash2,
  Save,
  X,
  Package,
  AlertCircle,
  Check,
  CheckSquare,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { motion, AnimatePresence } from "framer-motion";

export default function InventoryManagement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchMode, setSearchMode] = useState("existing");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingItem, setEditingItem] = useState(null);

  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    price: "",
    image_url: "",
    sku: "",
    tags: "",
    nutritional_highlights: "",
  });

  const [inventorySettings, setInventorySettings] = useState({
    product_id: "",
    slot_number: "",
    quantity: 10,
    low_stock_threshold: 5,
    is_on_shelf: true,
    promo_tag: "",
  });

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

  const createProductMutation = useMutation({
    mutationFn: async (productData) => {
      const product = await base44.entities.Product.create(productData);
      return product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["products"]);
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

  const handleAddProduct = async () => {
    if (searchMode === "new") {
      if (!newProduct.name || !newProduct.category || !newProduct.price) {
        alert("Please fill in required fields");
        return;
      }

      const product = await createProductMutation.mutateAsync({
        ...newProduct,
        price: parseFloat(newProduct.price),
        tags: newProduct.tags ? newProduct.tags.split(",").map(t => t.trim()) : [],
      });

      inventorySettings.product_id = product.id;
    }

    if (!inventorySettings.product_id) {
      alert("Please select a product");
      return;
    }

    const currentInventory = machine.products_inventory || [];
    const exists = currentInventory.find(
      (item) => item.product_id === inventorySettings.product_id
    );

    if (exists) {
      alert("Product already exists in this machine");
      return;
    }

    const updatedInventory = [
      ...currentInventory,
      {
        ...inventorySettings,
        quantity: parseInt(inventorySettings.quantity),
        low_stock_threshold: parseInt(inventorySettings.low_stock_threshold),
      },
    ];

    await updateInventoryMutation.mutateAsync(updatedInventory);
    setShowAddDialog(false);
    resetForms();
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setInventorySettings({
      product_id: item.product_id,
      slot_number: item.slot_number || "",
      quantity: item.quantity,
      low_stock_threshold: item.low_stock_threshold || 5,
      is_on_shelf: item.is_on_shelf !== false,
      promo_tag: item.promo_tag || "",
    });
    setShowEditDialog(true);
  };

  const handleUpdateItem = async () => {
    const currentInventory = machine.products_inventory || [];
    const updatedInventory = currentInventory.map((item) =>
      item.product_id === editingItem.product_id
        ? {
            ...inventorySettings,
            quantity: parseInt(inventorySettings.quantity),
            low_stock_threshold: parseInt(inventorySettings.low_stock_threshold),
          }
        : item
    );

    await updateInventoryMutation.mutateAsync(updatedInventory);
    setShowEditDialog(false);
    setEditingItem(null);
  };

  const handleRemoveProduct = async (productId) => {
    if (confirm("Remove this product from the machine?")) {
      const currentInventory = machine.products_inventory || [];
      const updatedInventory = currentInventory.filter(
        (item) => item.product_id !== productId
      );
      await updateInventoryMutation.mutateAsync(updatedInventory);
    }
  };

  const handleBulkUpdate = async (action) => {
    if (selectedProducts.length === 0) {
      alert("Please select products first");
      return;
    }

    const currentInventory = machine.products_inventory || [];
    let updatedInventory = [...currentInventory];

    if (action === "toggle_shelf") {
      updatedInventory = updatedInventory.map((item) =>
        selectedProducts.includes(item.product_id)
          ? { ...item, is_on_shelf: !item.is_on_shelf }
          : item
      );
    } else if (action === "restock") {
      updatedInventory = updatedInventory.map((item) =>
        selectedProducts.includes(item.product_id)
          ? { ...item, quantity: item.quantity + 10 }
          : item
      );
    }

    await updateInventoryMutation.mutateAsync(updatedInventory);
    setSelectedProducts([]);
    setShowBulkDialog(false);
  };

  const resetForms = () => {
    setNewProduct({
      name: "",
      category: "",
      price: "",
      image_url: "",
      sku: "",
      tags: "",
      nutritional_highlights: "",
    });
    setInventorySettings({
      product_id: "",
      slot_number: "",
      quantity: 10,
      low_stock_threshold: 5,
      is_on_shelf: true,
      promo_tag: "",
    });
    setSearchQuery("");
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
    return product ? { ...product, ...item } : null;
  }).filter(Boolean) || [];

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm z-10 border-b border-gray-100">
        <div className="flex items-center justify-between px-6 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`${createPageUrl("MachineDetail")}?id=${machineId}`)}
            className="hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-gray-900">Manage Inventory</h1>
          <Button
            size="icon"
            onClick={() => setShowAddDialog(true)}
            className="genki-gradient text-white"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="pt-20 px-6 pb-6">
        <Card className="p-6 mb-6 bg-gradient-to-br from-indigo-500 to-purple-500 text-white border-none">
          <h2 className="text-xl font-bold mb-2">{machine.name}</h2>
          <p className="text-white/90 text-sm mb-3">{machine.address}</p>
          <div className="flex items-center justify-between">
            <Badge className="bg-white/20 border-white/30 text-white">
              {machineProducts.length} products
            </Badge>
            {selectedProducts.length > 0 && (
              <Button
                size="sm"
                onClick={() => setShowBulkDialog(true)}
                className="bg-white/20 hover:bg-white/30"
              >
                Bulk Actions ({selectedProducts.length})
              </Button>
            )}
          </div>
        </Card>

        {machineProducts.length > 0 ? (
          <div className="space-y-3">
            {machineProducts.map((item, index) => {
              const isSelected = selectedProducts.includes(item.product_id);
              return (
                <motion.div
                  key={item.product_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={`p-4 ${isSelected ? "border-2 border-[#00C781]" : ""}`}>
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() =>
                          setSelectedProducts((prev) =>
                            prev.includes(item.product_id)
                              ? prev.filter((id) => id !== item.product_id)
                              : [...prev, item.product_id]
                          )
                        }
                        className="mt-1"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-[#00C781]" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </button>

                      <div className="w-16 h-16 bg-gradient-to-br from-[#E8F9F3] to-white rounded-xl flex items-center justify-center flex-shrink-0">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <Package className="w-8 h-8 text-[#00C781]" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900">{item.name}</h3>
                            <p className="text-sm text-gray-600">¥{item.price.toFixed(2)}</p>
                          </div>
                          <Badge
                            className={`${
                              item.quantity > item.low_stock_threshold
                                ? "bg-green-100 text-green-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                            variant="outline"
                          >
                            {item.quantity} in stock
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {item.slot_number && (
                            <Badge variant="outline" className="text-xs">
                              Slot {item.slot_number}
                            </Badge>
                          )}
                          {item.promo_tag && (
                            <Badge className="bg-red-100 text-red-700 text-xs">
                              {item.promo_tag}
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              item.is_on_shelf
                                ? "bg-blue-50 text-blue-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {item.is_on_shelf ? "On Shelf" : "Off Shelf"}
                          </Badge>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditItem(item)}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveProduct(item.product_id)}
                            className="text-red-500"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <Card className="p-12 text-center border-dashed border-2">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Products Yet</h3>
            <p className="text-gray-500 mb-6">
              Start adding products to this vending machine
            </p>
            <Button onClick={() => setShowAddDialog(true)} className="genki-gradient text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add First Product
            </Button>
          </Card>
        )}
      </div>

      {/* Add Product Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Product to Machine</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex gap-2 mb-4">
              <Button
                variant={searchMode === "existing" ? "default" : "outline"}
                onClick={() => setSearchMode("existing")}
                className="flex-1"
              >
                Existing Product
              </Button>
              <Button
                variant={searchMode === "new" ? "default" : "outline"}
                onClick={() => setSearchMode("new")}
                className="flex-1"
              >
                Create New
              </Button>
            </div>

            {searchMode === "existing" ? (
              <>
                <div>
                  <Label>Search Product</Label>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-2">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => setInventorySettings({
                        ...inventorySettings,
                        product_id: product.id
                      })}
                      className={`w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                        inventorySettings.product_id === product.id ? "bg-[#E8F9F3] border-2 border-[#00C781]" : ""
                      }`}
                    >
                      <p className="font-semibold text-sm">{product.name}</p>
                      <p className="text-xs text-gray-600">¥{product.price.toFixed(2)}</p>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Product Name *</Label>
                    <Input
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Category *</Label>
                    <Select
                      value={newProduct.category}
                      onValueChange={(value) => setNewProduct({...newProduct, category: value})}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sparkling_water">Sparkling Water</SelectItem>
                        <SelectItem value="tea">Tea</SelectItem>
                        <SelectItem value="juice">Juice</SelectItem>
                        <SelectItem value="energy_drink">Energy Drink</SelectItem>
                        <SelectItem value="snacks">Snacks</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Price (¥) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                      className="mt-2"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Image URL</Label>
                    <Input
                      value={newProduct.image_url}
                      onChange={(e) => setNewProduct({...newProduct, image_url: e.target.value})}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>SKU</Label>
                    <Input
                      value={newProduct.sku}
                      onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Tags (comma separated)</Label>
                    <Input
                      value={newProduct.tags}
                      onChange={(e) => setNewProduct({...newProduct, tags: e.target.value})}
                      placeholder="sugar-free, organic"
                      className="mt-2"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Nutritional Highlights</Label>
                    <Textarea
                      value={newProduct.nutritional_highlights}
                      onChange={(e) => setNewProduct({...newProduct, nutritional_highlights: e.target.value})}
                      className="mt-2"
                      rows={2}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="border-t pt-4 mt-4">
              <h4 className="font-semibold mb-3">Machine Settings</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Slot Number</Label>
                  <Input
                    value={inventorySettings.slot_number}
                    onChange={(e) => setInventorySettings({...inventorySettings, slot_number: e.target.value})}
                    placeholder="A1"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Initial Stock</Label>
                  <Input
                    type="number"
                    value={inventorySettings.quantity}
                    onChange={(e) => setInventorySettings({...inventorySettings, quantity: e.target.value})}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Low Stock Alert</Label>
                  <Input
                    type="number"
                    value={inventorySettings.low_stock_threshold}
                    onChange={(e) => setInventorySettings({...inventorySettings, low_stock_threshold: e.target.value})}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Promo Tag</Label>
                  <Input
                    value={inventorySettings.promo_tag}
                    onChange={(e) => setInventorySettings({...inventorySettings, promo_tag: e.target.value})}
                    placeholder="NEW"
                    className="mt-2"
                  />
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={inventorySettings.is_on_shelf}
                      onChange={(e) => setInventorySettings({...inventorySettings, is_on_shelf: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Display on shelf</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddDialog(false);
              resetForms();
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddProduct} className="genki-gradient text-white">
              <Save className="w-4 h-4 mr-2" />
              Add to Machine
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product Settings</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Slot Number</Label>
                <Input
                  value={inventorySettings.slot_number}
                  onChange={(e) => setInventorySettings({...inventorySettings, slot_number: e.target.value})}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Stock Quantity</Label>
                <Input
                  type="number"
                  value={inventorySettings.quantity}
                  onChange={(e) => setInventorySettings({...inventorySettings, quantity: e.target.value})}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Low Stock Threshold</Label>
                <Input
                  type="number"
                  value={inventorySettings.low_stock_threshold}
                  onChange={(e) => setInventorySettings({...inventorySettings, low_stock_threshold: e.target.value})}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Promo Tag</Label>
                <Input
                  value={inventorySettings.promo_tag}
                  onChange={(e) => setInventorySettings({...inventorySettings, promo_tag: e.target.value})}
                  className="mt-2"
                />
              </div>
              <div className="col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={inventorySettings.is_on_shelf}
                    onChange={(e) => setInventorySettings({...inventorySettings, is_on_shelf: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Display on shelf</span>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateItem} className="genki-gradient text-white">
              <Save className="w-4 h-4 mr-2" />
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Actions Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Actions</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            <p className="text-sm text-gray-600">
              {selectedProducts.length} products selected
            </p>
            <Button
              onClick={() => handleBulkUpdate("toggle_shelf")}
              variant="outline"
              className="w-full justify-start"
            >
              Toggle On/Off Shelf
            </Button>
            <Button
              onClick={() => handleBulkUpdate("restock")}
              variant="outline"
              className="w-full justify-start"
            >
              Restock +10 units
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
