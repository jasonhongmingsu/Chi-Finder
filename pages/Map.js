import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import { MapPin, Navigation, Search, RefreshCw, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

export default function Map() {
  const [userLocation, setUserLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [currentAddress, setCurrentAddress] = useState("Loading address...");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: machines = [], isLoading } = useQuery({
    queryKey: ["vendingMachines"],
    queryFn: () => base44.entities.VendingMachine.list(),
    initialData: [],
  });

  const requestLocationPermission = () => {
    setShowPermissionModal(false);
    
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(location);
        setLocationError(null);
        reverseGeocode(location.lat, location.lng);
      },
      (error) => {
        setLocationError(error.message);
        setUserLocation({ lat: 31.2304, lng: 121.4737 });
      },
      { enableHighAccuracy: true }
    );
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      const data = await response.json();
      setCurrentAddress(data.display_name || "Address not found");
    } catch (error) {
      setCurrentAddress("Unable to fetch address");
    }
  };

  const refreshLocation = () => {
    setIsRefreshing(true);
    requestLocationPermission();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPermissionModal(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (userLocation) {
      const watchId = navigator.geolocation?.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        null,
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation?.clearWatch(watchId);
    }
  }, [userLocation]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  let filteredMachines = machines
    .filter((m) => filterStatus === "all" || m.status === filterStatus)
    .filter((m) =>
      searchQuery ? m.address.toLowerCase().includes(searchQuery.toLowerCase()) : true
    )
    .map((machine) => ({
      ...machine,
      distance: userLocation
        ? calculateDistance(
            userLocation.lat,
            userLocation.lng,
            machine.latitude,
            machine.longitude
          )
        : null,
    }))
    .sort((a, b) => (a.distance || 0) - (b.distance || 0));

  if (!userLocation && !showPermissionModal) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-[#00D9FF] to-[#00C781] rounded-full flex items-center justify-center mx-auto mb-4 float-animation">
            <Navigation className="w-12 h-12 text-white" />
          </div>
          <p className="text-gray-600 font-medium">Finding nearby machines...</p>
        </div>
      </div>
    );
  }

  const machineColors = ['#00D9FF', '#FF6B9D', '#FFB800', '#00C781', '#9B6BFF'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="gradient-rainbow text-white px-6 pt-8 pb-6 gradient-animate">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-2" style={{textShadow: '0 2px 10px rgba(0,0,0,0.1)'}}>
              <MapPin className="w-8 h-8" />
              Map View 🗺️
            </h1>
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 mt-2">
              <MapPin className="w-3 h-3" />
              <p className="text-white/95 text-xs line-clamp-1">{currentAddress}</p>
              <Button
                size="icon"
                variant="ghost"
                onClick={refreshLocation}
                disabled={isRefreshing}
                className="h-5 w-5 hover:bg-white/20"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by location..."
              className="pl-12 bg-white border-none h-14 rounded-2xl shadow-vibrant text-gray-900 placeholder:text-gray-400"
            />
          </div>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full bg-white/90 border-none text-gray-900 backdrop-blur-sm h-12 rounded-2xl shadow-lg font-medium">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Machines ({machines.length})</SelectItem>
              <SelectItem value="active">🟢 Open Now</SelectItem>
              <SelectItem value="maintenance">🟡 Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Map */}
      <div className="h-[60vh] relative shadow-lg z-10">
        {userLocation && (
          <MapContainer
            center={[userLocation.lat, userLocation.lng]}
            zoom={14}
            style={{ height: "100%", width: "100%" }}
            zoomControl={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap'
            />
            
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={100}
              pathOptions={{
                fillColor: "#00D9FF",
                fillOpacity: 0.3,
                color: "#00D9FF",
                weight: 3,
              }}
              className="animate-pulse"
            />
            
            {filteredMachines.map((machine, idx) => (
              <Marker
                key={machine.id}
                position={[machine.latitude, machine.longitude]}
              >
                <Popup>
                  <div className="text-sm p-1">
                    <p className="font-bold text-gray-900 text-base">{machine.name}</p>
                    <p className="text-gray-600 text-xs mt-1">{machine.address}</p>
                    {machine.distance && (
                      <p className="text-[#00C781] text-sm font-bold mt-2 flex items-center gap-1">
                        <Navigation className="w-3 h-3" />
                        {machine.distance} km away
                      </p>
                    )}
                    <Badge className={`mt-2 ${machine.status === 'active' ? 'bg-green-500' : 'bg-orange-500'} text-white`}>
                      {machine.status === 'active' ? '🟢 Open' : '🟡 ' + machine.status}
                    </Badge>
                    <Link
                      to={`${createPageUrl("MachineDetail")}?id=${machine.id}`}
                      className="block mt-3 text-center bg-gradient-to-r from-[#00D9FF] to-[#00C781] text-white px-4 py-2 rounded-lg font-semibold text-xs"
                    >
                      View Details →
                    </Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

      {/* Nearby List */}
      <div className="px-6 py-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-5 flex items-center gap-2">
          <span className="text-3xl">📍</span>
          Nearby Machines ({filteredMachines.length})
        </h2>

        <div className="space-y-4">
          {filteredMachines.map((machine, index) => {
            const colorIndex = index % machineColors.length;
            const machineColor = machineColors[colorIndex];
            
            return (
              <motion.div
                key={machine.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={`${createPageUrl("MachineDetail")}?id=${machine.id}`}>
                  <div
                    className="p-5 rounded-3xl shadow-vibrant hover:shadow-colorful transition-all duration-300 border-2 border-white"
                    style={{
                      background: `linear-gradient(135deg, ${machineColor}11 0%, ${machineColor}05 100%)`
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                          style={{
                            background: `linear-gradient(135deg, ${machineColor} 0%, ${machineColor}DD 100%)`
                          }}
                        >
                          <MapPin className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-lg">{machine.name}</h3>
                          <p className="text-sm text-gray-600 line-clamp-1">{machine.address}</p>
                          <Badge
                            className={`mt-2 ${
                              machine.status === "active"
                                ? "bg-emerald-500 text-white"
                                : "bg-orange-400 text-white"
                            } shadow-md`}
                          >
                            {machine.status === "active" ? "🟢 Open" : "🟡 " + machine.status}
                          </Badge>
                        </div>
                      </div>
                      {machine.distance && (
                        <div
                          className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center shadow-lg"
                          style={{
                            background: `linear-gradient(135deg, ${machineColor}22 0%, ${machineColor}11 100%)`
                          }}
                        >
                          <p className="text-2xl font-black" style={{ color: machineColor }}>
                            {machine.distance}
                          </p>
                          <p className="text-xs text-gray-500 font-semibold">km</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Location Permission Dialog */}
      <Dialog open={showPermissionModal} onOpenChange={setShowPermissionModal}>
        <DialogContent className="rounded-3xl border-none shadow-colorful">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <div className="w-12 h-12 gradient-turquoise rounded-2xl flex items-center justify-center">
                <Navigation className="w-6 h-6 text-white" />
              </div>
              Enable Location 📍
            </DialogTitle>
            <DialogDescription className="space-y-4 pt-4">
              <p className="text-gray-700 text-base leading-relaxed">
                We need your location to show nearby vending machines on the map.
              </p>
              <div className="bg-gradient-to-br from-blue-100 to-cyan-100 p-4 rounded-2xl border-2 border-blue-200">
                <p className="text-sm text-gray-800 leading-relaxed">
                  <strong>🔒 Privacy First:</strong> Your location is only used to calculate
                  distances and is never stored.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowPermissionModal(false);
                setUserLocation({ lat: 31.2304, lng: 121.4737 });
              }}
              className="flex-1 h-12 rounded-2xl border-2 font-semibold"
            >
              Skip
            </Button>
            <Button
              onClick={requestLocationPermission}
              className="flex-1 h-12 rounded-2xl gradient-turquoise text-white border-none shadow-colorful font-semibold"
            >
              <Navigation className="w-4 h-4 mr-2" />
              Allow
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
