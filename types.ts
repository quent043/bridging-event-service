export type SocketBridgeEventLog = {
    eventName: string;
    args: {
        amount: bigint;
        token: string;
        toChainId: bigint;
        bridgeName: string;
        sender: string;
        receiver: string;
        metadata: string;
    };
    address: `0x${string}`;
    blockHash: `0x${string}` | null;
    blockNumber: bigint | null;
    data: string;
    logIndex: number | null;
    removed: boolean;
    topics: string[];
    transactionHash: string | null;
    transactionIndex: number | null;
};
