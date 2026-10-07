import { createParamDecorator, ExecutionContext, SetMetadata } from "@nestjs/common";
import type { Permission, SessionUser } from "@pharma/contracts";

export const IS_PUBLIC = "isPublic";
export const PERMISSIONS_KEY = "permissions";

/** Skip JWT auth for a route. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Require ALL listed permissions. */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): SessionUser => {
  return ctx.switchToHttp().getRequest().user;
});
