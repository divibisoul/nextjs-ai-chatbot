export const N05_ID = 'N05' as const;
export const N05_PEERS = ['N01','N02','N03','N04','N06'] as const;
export type N05Peer = (typeof N05_PEERS)[number];
export type ChannelDirection = 'IN' | 'OUT';
export function channelId(peer:N05Peer,direction:ChannelDirection){return `N05.${direction}.${peer}`;}
export const N05_IN_CHANNELS = N05_PEERS.map((peer)=>channelId(peer,'IN'));
export const N05_OUT_CHANNELS = N05_PEERS.map((peer)=>channelId(peer,'OUT'));
export const N05_CHANNEL_COUNT = N05_IN_CHANNELS.length + N05_OUT_CHANNELS.length;
export function isN05Peer(value:string):value is N05Peer{return (N05_PEERS as readonly string[]).includes(value);}
