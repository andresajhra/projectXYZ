import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { SessionUser } from "@pharma/contracts";
import { IS_PUBLIC, PERMISSIONS_KEY } from "./auth.decorators";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException("Missing token");

    try {
      const payload = await this.jwt.verifyAsync<Omit<SessionUser, "id"> & { sub: string }>(token);
      req.user = { ...payload, id: payload.sub } satisfies SessionUser;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!required?.length) return true;
    const user: SessionUser | undefined = ctx.switchToHttp().getRequest().user;
    const ok = !!user && required.every((p) => user.permissions.includes(p));
    if (!ok) throw new ForbiddenException("Missing permission");
    return true;
  }
}
