import { useState, useEffect, useCallback } from 'react';
import { netbirdVpnClient } from '../services/vpn/netbirdClient';
import { NetbirdVpnConfig, VpnClientState } from '../types/vpn';

export function useNetbirdVpn() {
  const [vpnState, setVpnState] = useState<VpnClientState>(() => netbirdVpnClient.getSnapshot());

  useEffect(() => {
    const unsubscribe = netbirdVpnClient.subscribe((state) => {
      setVpnState(state);
    });
    return () => unsubscribe();
  }, []);

  const connect = useCallback(async (config: NetbirdVpnConfig) => {
    return netbirdVpnClient.connect(config);
  }, []);

  const disconnect = useCallback(async () => {
    return netbirdVpnClient.disconnect();
  }, []);

  return {
    ...vpnState,
    connect,
    disconnect,
  };
}
