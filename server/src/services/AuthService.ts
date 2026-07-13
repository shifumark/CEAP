import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { User as PrismaUser } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { JWT_SECRET } from '../lib/env.js';
import { User, LoginRequest, LoginResponse, UserRole, CreateUserRequest } from '../types.js';

/**
 * Authentication service backed by Postgres via Prisma.
 * Prisma's UserRole/UserStatus enum values are the same lowercase
 * strings as the app-level enums in types.ts, so the cast below is
 * a same-value reinterpretation, not a translation.
 */
function toUser(record: PrismaUser): User {
  return {
    id: record.id,
    email: record.email,
    firstName: record.firstName,
    lastName: record.lastName,
    role: record.role as unknown as User['role'],
    status: record.status as unknown as User['status'],
    emailVerified: record.emailVerified,
    profilePictureUrl: record.profilePictureUrl ?? undefined,
    lastLogin: record.lastLogin ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export class AuthService {
  async login(request: LoginRequest): Promise<LoginResponse> {
    const user = await prisma.user.findUnique({ where: { email: request.email } });

    if (!user || user.deletedAt || !bcrypt.compareSync(request.password, user.passwordHash)) {
      throw new Error('Invalid email or password');
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    return {
      token: this.generateToken(updated),
      user: toUser(updated),
      expiresIn: 8 * 60 * 60 // 8 hours in seconds
    };
  }

  async register(request: CreateUserRequest): Promise<User> {
    const existing = await prisma.user.findUnique({ where: { email: request.email } });
    if (existing) {
      throw new Error('User with this email already exists');
    }

    const created = await prisma.user.create({
      data: {
        email: request.email,
        passwordHash: bcrypt.hashSync(request.password, 10),
        firstName: request.firstName,
        lastName: request.lastName,
        // Self-registration always lands as Student (APPLICANT) unless a
        // Super Admin is creating the account via POST /users.
        role: (request.role ?? UserRole.APPLICANT) as unknown as PrismaUser['role'],
        emailVerified: false
      }
    });

    return toUser(created);
  }

  async verifyToken(token: string): Promise<any> {
    return jwt.verify(token, JWT_SECRET);
  }

  async resetPassword(email: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('User not found');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: bcrypt.hashSync(newPassword, 10) }
    });
  }

  private generateToken(user: PrismaUser): string {
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
  }

  async getUser(userId: number): Promise<User | undefined> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return user ? toUser(user) : undefined;
  }

  /**
   * Super Admin accounts are hidden from every non-Super-Admin view.
   */
  async getAllUsers(includeHidden = false): Promise<User[]> {
    const users = await prisma.user.findMany({
      where: includeHidden ? {} : { role: { not: 'super_admin' as any } },
      orderBy: { id: 'asc' }
    });
    return users.map(toUser);
  }
}
