import React from "react";
import { appOrchestrator } from "../../../aeternum-core-29/lib/aeternum/orchestration/AppOrchestrator";

export interface AeternumAppIntegrationProps { children: React.ReactNode; }

export const AeternumAppIntegration: React.FC<AeternumAppIntegrationProps> = ({ children }) => {
  React.useEffect(() => { appOrchestrator.boot(); }, []);
  return <>{children}</>;
};
