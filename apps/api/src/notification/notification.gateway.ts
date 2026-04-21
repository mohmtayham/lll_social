import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { AuthJwtPayload } from "src/auth/types/auth-jwtPayload";
import { PrismaService } from "src/prisma/prisma.service";

type AuthedSocket = Socket & { data: Socket["data"] & { userId?: string } };

@WebSocketGateway({
  namespace: "/notifications",
  cors: {
    origin: true,
    credentials: true,
  },
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private userRoom(userId: string | number | bigint): string {
    return `user_${userId.toString()}`;
  }

  private extractToken(client: Socket): string | null {
    const authToken =
      client.handshake.auth?.token ?? client.handshake.auth?.accessToken;

    if (typeof authToken === "string" && authToken.trim().length > 0) {
      return authToken.trim();
    }

    const authorizationHeader = client.handshake.headers.authorization;
    if (
      typeof authorizationHeader === "string" &&
      authorizationHeader.toLowerCase().startsWith("bearer ")
    ) {
      return authorizationHeader.slice(7).trim();
    }

    return null;
  }

  async handleConnection(client: AuthedSocket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        throw new Error("Missing token");
      }

      const jwtSecret = this.configService.get<string>("JWT_SECRET");
      if (!jwtSecret) {
        throw new Error("JWT_SECRET is not configured");
      }

      const payload = await this.jwtService.verifyAsync<AuthJwtPayload>(token, {
        secret: jwtSecret,
      });

      // Normalize JWT sub to bigint because Prisma user id is bigint.
      const userId = BigInt(payload.sub);
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const userIdString = user.id.toString();
      client.data.userId = userIdString;

      // Join a dedicated room so services can emit to a specific user.
      client.join(this.userRoom(userIdString));
      this.logger.log(
        `Notification socket connected: ${client.id} (user ${userIdString})`,
      );
    } catch {
      client.emit("notification:error", {
        message: "Unauthorized notification connection",
      });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthedSocket): void {
    this.logger.log(`Notification socket disconnected: ${client.id}`);
  }

  sendNotificationToUser(
    userId: string | number | bigint,
    notificationPayload: unknown,
  ): void {
    const room = this.userRoom(userId);
    this.server.to(room).emit("notification:new", notificationPayload);
  }
}




