/**
 * useSocket — subscribes to a Socket.IO event and calls the handler.
 * Automatically cleans up the listener on unmount.
 */
import { useEffect } from "react";
import socket from "@/services/socket";

export function useSocket<T = unknown>(
  event: string,
  handler: (data: T) => void
) {
  useEffect(() => {
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [event, handler]);
}
