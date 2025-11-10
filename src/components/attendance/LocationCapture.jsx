import { useEffect, useState } from "react";
import { MapPin, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LocationCapture({
  onLocationCaptured,
  autoCapture = false,
}) {
  const [status, setStatus] = useState("idle"); // idle, loading, success, error
  const [location, setLocation] = useState(null);
  const [error, setError] = useState("");

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setStatus("error");
      setError("Geolocation is not supported by your browser");
      return;
    }

    setStatus("loading");
    setError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setLocation(locationData);
        setStatus("success");
        if (onLocationCaptured) {
          onLocationCaptured(locationData);
        }
      },
      (err) => {
        setStatus("error");
        let errorMsg = "Failed to get location";

        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMsg =
              "Location access denied. Please enable location permissions.";
            break;
          case err.POSITION_UNAVAILABLE:
            errorMsg = "Location information is unavailable.";
            break;
          case err.TIMEOUT:
            errorMsg = "Location request timed out.";
            break;
          default:
            errorMsg = `Error getting location: ${err.message}`;
        }

        setError(errorMsg);
        console.error("Geolocation error:", err);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  useEffect(() => {
    if (autoCapture) {
      captureLocation();
    }
  }, [autoCapture]);

  return (
    <div className="space-y-4">
      {status === "idle" && (
        <button
          onClick={captureLocation}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <MapPin className="w-4 h-4" />
          Capture Location
        </button>
      )}

      {status === "loading" && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Getting your location... Please ensure location services are
            enabled.
          </AlertDescription>
        </Alert>
      )}

      {status === "success" && location && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Location captured successfully
            <div className="text-xs mt-1 text-green-600">
              Lat: {location.latitude.toFixed(6)}, Lon:{" "}
              {location.longitude.toFixed(6)}
              {location.accuracy && ` (±${Math.round(location.accuracy)}m)`}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {status === "error" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <button
              onClick={captureLocation}
              className="ml-2 underline hover:no-underline"
            >
              Try again
            </button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
