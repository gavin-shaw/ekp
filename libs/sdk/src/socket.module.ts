import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { RedisModule } from "nestjs-redis";
import { SocketGateway } from "./socket/socket.gateway";
import { ConfigModule } from '@nestjs/config';
import { EkConfigService } from "./config/ek-config.service";

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        EventEmitterModule.forRoot(),
        RedisModule.forRootAsync(EkConfigService.createRedisAsyncOptions()),
    ],
    providers: [
        SocketGateway,
    ],
})
export class SocketModule {

}