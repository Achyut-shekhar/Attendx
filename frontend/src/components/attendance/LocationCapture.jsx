import { useCallback, useEffect, useState } from "react";
import { MapPin, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

export default function LocationCapture({
  onLocationCaptured,
  autoCapture = false,
}) {
  const [status, setStatus] = useState("idle"); // idle, loading, success, error
  const [location, setLocation] = useState(null);
  const [error, setError] = useState("");

  const captureLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("error");
      setError("Geolocation is not supported by your browser");
      return;
    }

    setStatus("loading");
    setError("");

    const attemptCapture = (highAccuracy, timeout, isRetry = false) => {
      console.log(
        `Attempting location capture: highAccuracy=${highAccuracy}, timeout=${timeout}ms, isRetry=${isRetry}`
      );

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          console.log("Location captured successfully:", locationData);
          setLocation(locationData);
          setStatus("success");
          if (onLocationCaptured) {
            onLocationCaptured(locationData);
          }
        },
        (err) => {
          console.error("Geolocation error:", err);

          // If high accuracy timed out and this isn't already a retry, try again with low accuracy
          if (err.code === err.TIMEOUT && highAccuracy && !isRetry) {
            console.log(
              "High accuracy timed out, retrying with low accuracy..."
            );
            setError("Getting approximate location...");
            attemptCapture(false, 30000, true);
            return;
          }

          setStatus("error");
          let errorMsg = "Failed to get location. ";

          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMsg +=
                "Please allow location access in your browser settings.";
              break;
            case err.POSITION_UNAVAILABLE:
              errorMsg +=
                "Location information is unavailable. Try enabling Wi-Fi or moving near a window.";
              break;
            case err.TIMEOUT:
              errorMsg +=
                "Location request timed out. Make sure Wi-Fi is enabled and you're near a window. On desktop/laptop, location may take longer.";
              break;
            default:
              errorMsg += `Error: ${err.message}`;
          }

          setError(errorMsg);
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: timeout,
          maximumAge: 0,
        }
      );
    };

    // Start with high accuracy and 60 second timeout
    attemptCapture(true, 60000, false);
  }, [onLocationCaptured]);

  useEffect(() => {
    if (!autoCapture || status !== "idle") return;
    captureLocation();
  }, [autoCapture, captureLocation, status]);

  return (
    <div className="rounded-2xl border border-dashed border-primary/25 bg-card/80 p-4 sm:p-6 shadow-sm space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Capture your location
            </p>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Works best with Wi-Fi on and when you are near a window or
              outdoors.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={captureLocation}
          disabled={status === "loading"}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
        >
          {status === "loading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Capturing...
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4" /> Capture Location
            </>
          )}
        </button>
      </div>

      <div className="space-y-3 text-xs text-muted-foreground sm:text-sm">
        {status === "idle" && (
          <p>
            Your coordinates are only used for this session to verify you are
            within the classroom radius.
          </p>
        )}

        {status === "loading" && (
          <div className="flex items-start gap-3 rounded-2xl border border-border bg-background/90 p-3 text-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <p>
              Getting your location... Make sure location services are enabled
              and Wi-Fi is on for better accuracy.
            </p>
          </div>
        )}

        {status === "success" && location && (
          <div className="space-y-3 rounded-2xl border border-green-200 bg-green-50/90 p-4 text-green-800">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle className="h-4 w-4" />
                Location captured successfully
              </div>
              {location.accuracy && (
                <span className="text-xs font-medium text-green-700">
                  ±{Math.round(location.accuracy)}m accuracy
                </span>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/80 bg-white/70 p-3">
                <p className="text-[10px] font-semibold uppercase text-green-600">
                  Latitude
                </p>
                <p className="font-mono text-green-900">
                  {location.latitude.toFixed(6)}
                </p>
              </div>
              <div className="rounded-xl border border-white/80 bg-white/70 p-3">
                <p className="text-[10px] font-semibold uppercase text-green-600">
                  Longitude
                </p>
                <p className="font-mono text-green-900">
                  {location.longitude.toFixed(6)}
                </p>
              </div>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-destructive">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="h-4 w-4" />
              Could not capture location
            </div>
            <p className="text-destructive-foreground/90">{error}</p>
            <button
              type="button"
              onClick={captureLocation}
              className="text-xs font-semibold text-destructive underline underline-offset-4 hover:no-underline"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
