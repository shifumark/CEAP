import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { User as PrismaUser } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { JWT_SECRET } from '../lib/env.js';
import { User, LoginRequest, LoginResponse, UserRole, UserStatus, CreateUserRequest } from '../types.js';

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

    if (user.status !== 'active') {
      throw new Error('This account has been disabled. Please contact an administrator.');
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
   * Super Admin only — reassigns a user's role and/or enables/disables
   * their account. Callers must enforce the self-modification guard (a
   * Super Admin changing their own account) themselves; this method has
   * no such check of its own. Takes effect on the user's next login —
   * an already-issued JWT stays valid until its own 8h expiry, since
   * verifyToken deliberately stays a pure signature check with no
   * per-request DB lookup.
   */
  async updateUserAccount(userId: number, updates: { role?: UserRole; status?: UserStatus }): Promise<User> {
    const data: { role?: PrismaUser['role']; status?: PrismaUser['status'] } = {};
    if (updates.role !== undefined) data.role = updates.role as unknown as PrismaUser['role'];
    if (updates.status !== undefined) data.status = updates.status as unknown as PrismaUser['status'];

    const updated = await prisma.user.update({ where: { id: userId }, data });
    return toUser(updated);
  }

  /**
   * Super Admin only — generates a fresh random password for a user who
   * can't get in on their own, sets it, and returns the plaintext value
   * exactly once so the admin can relay it to the student through a
   * trusted channel (this app has no outbound email capability, so this
   * stands in for a self-service "forgot password" email link).
   */
  async adminResetPassword(userId: number): Promise<{ user: User; temporaryPassword: string }> {
    const temporaryPassword = crypto.randomBytes(9).toString('base64url'); // 12 chars, URL-safe
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: bcrypt.hashSync(temporaryPassword, 10) }
    });
    return { user: toUser(updated), temporaryPassword };
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
