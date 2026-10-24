import { useEffect, useState } from "react";

export function useConnectivity() {
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const online = () => setOffline(false);
    const offline = () => setOffline(true);
    addEventListener("online", online);
    addEventListener("offline", offline);
    return () => {
      removeEventListener("online", online);
      removeEventListener("offline", offline);
    };
  }, []);
  return offline;
}
