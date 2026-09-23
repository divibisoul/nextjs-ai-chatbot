import React from "react";

export interface AeternumAppIntegrationProps {
  children: React.ReactNode;
  boot?: () => void | Promise<void>;
}

/**
 * Additive integration boundary. It does not replace the host App.tsx and
 * does not assume a cross-repository import path.
 */
export const AeternumAppIntegration: React.FC<AeternumAppIntegrationProps> = ({ children, boot }) => {
  React.useEffect(() => {
    if (boot) void Promise.resolve(boot());
  }, [boot]);
  return <>{children}</>;
};
