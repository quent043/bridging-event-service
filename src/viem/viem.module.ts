import { Module, Global } from '@nestjs/common';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

@Global()
@Module({
    providers: [
        {
            provide: 'PUBLIC_CLIENT',
            useFactory: () => {
                return createPublicClient({
                    chain: mainnet,
                    transport: http(process.env.ETH_RPC_URL),
                });
            },
        },
    ],
    exports: ['PUBLIC_CLIENT'],
})
export class ViemModule {}
