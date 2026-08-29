import type { MeshRequest } from './N05MeshGateway';

export type N05Agent = {
  id: string;
  name: string;
  capabilities: string[];
  execute: (request: MeshRequest) => Promise<unknown> | unknown;
};
