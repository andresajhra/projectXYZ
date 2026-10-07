import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { DEFAULT_ROLES, PERMISSIONS } from "@pharma/contracts";
import type { AuthResponse, LoginInput, RegisterInput, SessionUser } from "@pharma/contracts";
import * as bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { PrismaService } from "../../prisma/prisma.service";
import { MailService } from "../integrations/mail/mail.service";

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

@Injectable()
export class AuthService {
  private readonly google: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {
    this.google = new OAuth2Client(this.config.get<string>("GOOGLE_CLIENT_ID"));
  }

  /** Creates tenant + default roles + owner user in one transaction. */
  private async createTenantWithOwner(input: {
    tenantName: string;
    name: string;
    email: string;
    passwordHash?: string;
    googleId?: string;
  }) {
    const slug = `${slugify(input.tenantName) || "pharmacy"}-${Math.random().toString(36).slice(2, 6)}`;

    return this.prisma.$transaction(async (tx) => {
      await Promise.all(
        PERMISSIONS.map((key) => tx.permission.upsert({ where: { key }, update: {}, create: { key } })),
      );
      const perms = await tx.permission.findMany();
      const permId = new Map(perms.map((p) => [p.key, p.id]));

      const tenant = await tx.tenant.create({ data: { name: input.tenantName, slug } });

      const roles = new Map<string, string>();
      for (const [roleName, keys] of Object.entries(DEFAULT_ROLES)) {
        const role = await tx.role.create({
          data: {
            tenantId: tenant.id,
            name: roleName,
            isSystem: true,
            permissions: { create: keys.map((k) => ({ permissionId: permId.get(k)! })) },
          },
        });
        roles.set(roleName, role.id);
      }

      return tx.user.create({
        data: {
          tenantId: tenant.id,
          email: input.email,
          name: input.name,
          passwordHash: input.passwordHash,
          googleId: input.googleId,
          roles: { create: { roleId: roles.get("OWNER")! } },
        },
      });
    });
  }

  private async buildSession(userId: string): Promise<SessionUser> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
    });
    const roles = user.roles.map((ur) => ur.role.name);
    const permissions = [
      ...new Set(user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.key))),
    ];
    return { id: user.id, tenantId: user.tenantId, email: user.email, name: user.name, roles, permissions };
  }

  private async issue(userId: string): Promise<AuthResponse> {
    const user = await this.buildSession(userId);
    const { id, ...claims } = user;
    const accessToken = await this.jwt.signAsync({ ...claims }, { subject: id });
    await this.prisma.auditLog.create({ data: { tenantId: user.tenantId, userId: id, action: "auth.session_issued" } });
    return { accessToken, user };
  }

  async register(input: RegisterInput): Promise<AuthResponse> {
    const email = input.email.toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException("Email already registered");

    const user = await this.createTenantWithOwner({
      tenantName: input.tenantName,
      name: input.name,
      email,
      passwordHash: await bcrypt.hash(input.password, 12),
    });
    void this.mail.welcome(email, input.name);
    return this.issue(user.id);
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    const ok = user?.passwordHash && (await bcrypt.compare(input.password, user.passwordHash));
    if (!user || !ok || !user.isActive) throw new UnauthorizedException("Invalid credentials");
    return this.issue(user.id);
  }

  async loginWithGoogle(idToken: string): Promise<AuthResponse> {
    const clientId = this.config.get<string>("GOOGLE_CLIENT_ID");
    if (!clientId) throw new BadRequestException("Google login is not configured");

    const ticket = await this.google.verifyIdToken({ idToken, audience: clientId }).catch(() => null);
    const p = ticket?.getPayload();
    if (!p?.email || !p.email_verified || !p.sub) throw new UnauthorizedException("Invalid Google token");

    const email = p.email.toLowerCase();
    let user = await this.prisma.user.findFirst({ where: { OR: [{ googleId: p.sub }, { email }] } });

    if (user && !user.googleId) {
      user = await this.prisma.user.update({ where: { id: user.id }, data: { googleId: p.sub } });
    } else if (!user) {
      const name = p.name ?? email;
      user = await this.createTenantWithOwner({ tenantName: `${name}'s pharmacy`, name, email, googleId: p.sub });
      void this.mail.welcome(email, name);
    }
    if (!user.isActive) throw new UnauthorizedException("User disabled");
    return this.issue(user.id);
  }

  me(userId: string) {
    return this.buildSession(userId);
  }
}
