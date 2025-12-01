import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, MapPin, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AddMachine() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    latitude: "",
    longitude: "",
    status: "active",
  });

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  const createMachineMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.VendingMachine.create({
        ...data,
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        products_inventory: [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["machines"]);
      navigate(createPageUrl("OperatorDashboard"));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name || !formData.address || !formData.latitude || !formData.longitude) {
      alert("Please fill in all required fields");
      return;
    }

    if (
      isNaN(parseFloat(formData.latitude)) ||
      isNaN(parseFloat(formData.longitude))
    ) {
      alert("Please enter valid coordinates");
      return;
    }

    createMachineMutation.mutate(formData);
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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
          <p className="text-gray-500 mb-6">Operators only</p>
          <Button onClick={() => navigate("/")}>Go to Home</Button>
        </div>
      </div>
    );
  }

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
          <h1 className="font-semibold text-gray-900">Add New Machine</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="pt-20 px-6 pb-6">
        <Card className="p-6 max-w-2xl mx-auto border-none shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Machine Information
              </h2>
              <p className="text-sm text-gray-500">
                Fill in the details below to add a new vending machine
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Machine Name */}
            <div>
              <Label htmlFor="name" className="text-gray-900 font-medium">
                Machine Name / ID *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g., Downtown Mall - L1"
                className="mt-2"
                required
              />
            </div>

            {/* Address */}
            <div>
              <Label htmlFor="address" className="text-gray-900 font-medium">
                Full Address *
              </Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="e.g., 200 Nanjing Road, Shanghai"
                className="mt-2"
                required
              />
            </div>

            {/* Coordinates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="latitude" className="text-gray-900 font-medium">
                  Latitude *
                </Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => handleChange("latitude", e.target.value)}
                  placeholder="e.g., 31.2304"
                  className="mt-2"
                  required
                />
              </div>
              <div>
                <Label htmlFor="longitude" className="text-gray-900 font-medium">
                  Longitude *
                </Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => handleChange("longitude", e.target.value)}
                  placeholder="e.g., 121.4737"
                  className="mt-2"
                  required
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="status" className="text-gray-900 font-medium">
                Initial Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleChange("status", value)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Info Box */}
            <Card className="p-4 bg-blue-50 border-blue-100">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">💡 Tip:</span> After creating the
                machine, you can add products to its inventory from the machine
                management page.
              </p>
            </Card>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(createPageUrl("OperatorDashboard"))}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMachineMutation.isPending}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90"
              >
                <Save className="w-4 h-4 mr-2" />
                {createMachineMutation.isPending ? "Creating..." : "Create Machine"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
