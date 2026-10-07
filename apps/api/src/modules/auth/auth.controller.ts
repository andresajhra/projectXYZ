import { Body, Controller, Get, Post } from "@nestjs/common";
import {
  googleLoginSchema, loginSchema, registerSchema,
  type GoogleLoginInput, type LoginInput, type RegisterInput, type SessionUser,
} from "@pharma/contracts";
import { CurrentUser, Public, RequirePermissions } from "../../common/auth.decorators";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("register")
  register(@Body(new ZodValidationPipe(registerSchema)) body: RegisterInput) {
    return this.auth.register(body);
  }

  @Public()
  @Post("login")
  login(@Body(new ZodValidationPipe(loginSchema)) body: LoginInput) {
    return this.auth.login(body);
  }

  @Public()
  @Post("google")
  google(@Body(new ZodValidationPipe(googleLoginSchema)) body: GoogleLoginInput) {
    return this.auth.loginWithGoogle(body.idToken);
  }

  @Get("me")
  me(@CurrentUser() user: SessionUser) {
    return this.auth.me(user.id);
  }

  /** Example of an RBAC-protected route. */
  @Get("admin-check")
  @RequirePermissions("role.manage")
  adminCheck() {
    return { ok: true };
  }
}
