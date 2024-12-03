import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private supabase: SupabaseClient;

    constructor() {
        super();
        this.supabase = createClient(
            //TODO Add checks on these
            process.env.SUPABASE_URL as string,
            process.env.SUPABASE_KEY as string
        );
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }

    //TODO pas besoin de ca ici
    async createBridgeEvent(data: any) {
        const { error } = await this.supabase.from('bridge_events').insert(data);
        if (error) {
            throw new Error(`Supabase Insert Error: ${error.message}`);
        }
        return 'Record inserted successfully via Supabase';
    }

    async getBridgeEvents() {
        const { data, error } = await this.supabase.from('bridge_events').select('*');
        if (error) {
            throw new Error(`Supabase Fetch Error: ${error.message}`);
        }
        return data;
    }
}
