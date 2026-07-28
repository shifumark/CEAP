import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { User as PrismaUser } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { JWT_SECRET } from '../lib/env.js';
import { supabaseAdmin, DOCUMENTS_BUCKET } from '../lib/supabase.js';
import { getDriveAccount } from '../lib/googleDrive.js';
import { User, LoginRequest, LoginResponse, UserRole, UserStatus, CreateUserRequest, JWTPayload, DeletionEntityType } from '../types.js';
import { DeletionRequestService } from './DeletionRequestService.js';
import { EmailService } from './EmailService.js';

const deletionRequestService = new DeletionRequestService();
const emailService = new EmailService();
const EMAIL_VERIFICATION_PURPOSE = 'email_verification';

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
    updatedAt: record.updatedAt,
    isDeletionReviewer: record.isDeletionReviewer
  };
}

export class AuthService {
  async login(request: LoginRequest): Promise<LoginResponse> {
    const user = await prisma.user.findUnique({ where: { email: request.email } });

    if (!user || user.deletedAt || !(await bcrypt.compare(request.password, user.passwordHash))) {
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
        passwordHash: await bcrypt.hash(request.password, 10),
        firstName: request.firstName,
        lastName: request.lastName,
        // Self-registration always lands as Student (APPLICANT) unless a
        // Super Admin is creating the account via POST /users.
        role: (request.role ?? UserRole.APPLICANT) as unknown as PrismaUser['role'],
        emailVerified: false
      }
    });

    // Confirms the address is real and actually reachable by its owner —
    // covers both self-registration and an Admin/Super Admin creating the
    // account via POST /users, since both funnel through this method.
    emailService
      .sendEmailVerification(created.email, created.firstName, this.generateEmailVerificationToken(created.id))
      .catch((error) => console.error('[EmailService] Failed to send verification email', created.id, error));

    return toUser(created);
  }

  async verifyToken(token: string): Promise<any> {
    return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  }

  async resetPassword(email: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('User not found');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(newPassword, 10) }
    });
  }

  /**
   * Self-service password change — lets a user (e.g. a scholar who just
   * logged in with a temporary password an admin gave them) set their own
   * new password. Requires the current/temporary password, unlike
   * resetPassword above which is a trusted-caller-only helper with no
   * verification of its own.
   */
  async changeOwnPassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new Error('Current password is incorrect');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(newPassword, 10) }
    });
  }

  private generateToken(user: PrismaUser): string {
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        isDeletionReviewer: user.isDeletionReviewer
      },
      JWT_SECRET,
      { expiresIn: '8h', algorithm: 'HS256' }
    );
  }

  /**
   * Signed, stateless verification link — no DB column needed to track
   * outstanding tokens, since the JWT signature and expiry are the only
   * things confirmEmailVerification below trusts. The purpose claim keeps
   * this from ever being confused with (or substituted for) a real login
   * token even though both are signed with the same secret.
   */
  private generateEmailVerificationToken(userId: number): string {
    return jwt.sign({ sub: userId, purpose: EMAIL_VERIFICATION_PURPOSE }, JWT_SECRET, {
      expiresIn: '7d',
      algorithm: 'HS256'
    });
  }

  /**
   * Confirms the address in the link was actually reachable by its
   * owner. Invalid, expired, or already-used-for-a-different-purpose
   * tokens all fail the same generic way — no need to distinguish them
   * for the user beyond "this link doesn't work, ask for a new one."
   */
  async confirmEmailVerification(token: string): Promise<User> {
    let payload: any;
    try {
      payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    } catch {
      throw new Error('This verification link is invalid or has expired.');
    }
    if (payload?.purpose !== EMAIL_VERIFICATION_PURPOSE || typeof payload.sub !== 'number') {
      throw new Error('This verification link is invalid.');
    }

    const updated = await prisma.user
      .update({ where: { id: payload.sub }, data: { emailVerified: true } })
      .catch(() => null);
    if (!updated) {
      throw new Error('This verification link is invalid.');
    }
    return toUser(updated);
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
  async updateUserAccount(
    userId: number,
    updates: { role?: UserRole; status?: UserStatus; isDeletionReviewer?: boolean }
  ): Promise<User> {
    const data: { role?: PrismaUser['role']; status?: PrismaUser['status']; isDeletionReviewer?: boolean } = {};
    if (updates.role !== undefined) data.role = updates.role as unknown as PrismaUser['role'];
    if (updates.status !== undefined) data.status = updates.status as unknown as PrismaUser['status'];
    if (updates.isDeletionReviewer !== undefined) data.isDeletionReviewer = updates.isDeletionReviewer;

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
      data: { passwordHash: await bcrypt.hash(temporaryPassword, 10) }
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

  /**
   * Deletes a Student (Applicant-role) account — never an Admin or Super
   * Admin, and never the caller's own account, regardless of who's
   * calling. An applicant who has already become a Scholar must be
   * removed via Scholar Management instead, so that flow's own
   * protections aren't bypassed by a blunt account delete here.
   *
   * A plain Admin's delete is held as a pending DeletionRequest instead
   * of happening immediately — see the matching comment on
   * ApplicationService.deleteApplication.
   */
  async deleteUser(actor: JWTPayload, targetId: number): Promise<'deleted' | 'pending'> {
    if (targetId === actor.sub) {
      throw new Error('You cannot delete your own account');
    }

    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) {
      throw new Error('User not found');
    }
    if (target.role !== 'applicant') {
      throw new Error('Only Student accounts can be deleted this way');
    }

    const scholar = await prisma.scholar.findUnique({ where: { userId: targetId } });
    if (scholar) {
      throw new Error('This user is an active Scholar — remove them from Scholar Management instead');
    }

    const label = `${target.firstName} ${target.lastName} (${target.email})`;

    if (actor.role === UserRole.ADMIN) {
      await deletionRequestService.create(actor, DeletionEntityType.USER, targetId, label);
      return 'pending';
    }

    await this.performUserDeletion(targetId);

    if (actor.role === UserRole.SUPER_ADMIN) {
      // Awaited — see the matching comment on ApplicationService.deleteApplication.
      await deletionRequestService
        .recordImmediateDeletion(actor, DeletionEntityType.USER, targetId, label)
        .catch((error) => console.error('[DeletionRequestService] Failed to record immediate deletion', targetId, error));
    }

    return 'deleted';
  }

  /**
   * The actual deletion primitive — see the matching comment on
   * ApplicationService.performApplicationDeletion.
   *
   * UploadedDocument.userId's uploader relation has no onDelete cascade
   * (deliberately, so an accidental delete fails loudly) — cleaned up
   * explicitly first, remote files included. AuditLog.userId and
   * DeletionRequest.requestedBy/reviewedBy are nullable with no cascade
   * either; detached (not deleted) so the historical record survives the
   * account's removal.
   */
  async performUserDeletion(targetId: number): Promise<void> {
    // Idempotent: a pending deletion request can outlive its target (e.g.
    // approved twice, or the account removed some other way in the
    // meantime) — nothing left to do, not an error.
    const exists = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!exists) return;

    const documents = await prisma.uploadedDocument.findMany({
      where: { userId: targetId },
      select: { filePath: true, googleDriveId: true, driveAccount: true }
    });
    const driveFiles = documents.filter((d) => d.googleDriveId).map((d) => ({ fileId: d.googleDriveId as string, driveAccount: d.driveAccount }));
    const legacyPaths = documents.filter((d) => !d.googleDriveId).map((d) => d.filePath);

    // Each file may live in a different configured Drive account (see
    // driveAccount on the schema), so the right client has to be looked
    // up per file rather than assuming they're all in the same one.
    await Promise.all(
      driveFiles.map(({ fileId, driveAccount }) =>
        getDriveAccount(driveAccount)
          .drive.files.delete({ fileId })
          .catch(() => undefined)
      )
    );
    if (legacyPaths.length > 0) {
      await supabaseAdmin.storage.from(DOCUMENTS_BUCKET).remove(legacyPaths).catch(() => undefined);
    }

    // Batched in one transaction — previously 5 separate awaited calls,
    // so a crash/error partway through (e.g. after documents were wiped
    // but before the user row itself was deleted) could leave the account
    // in an inconsistent half-deleted state.
    await prisma.$transaction([
      prisma.uploadedDocument.deleteMany({ where: { userId: targetId } }),
      prisma.auditLog.updateMany({ where: { userId: targetId }, data: { userId: null } }),
      // Same detach-not-cascade treatment as AuditLog.userId above — a
      // deletion request this account filed (or reviewed) survives as
      // history even after the account itself is gone.
      prisma.deletionRequest.updateMany({ where: { requestedBy: targetId }, data: { requestedBy: null } }),
      prisma.deletionRequest.updateMany({ where: { reviewedBy: targetId }, data: { reviewedBy: null } }),
      // Cascades: User -> Applicant -> Application -> (status history, docs).
      prisma.user.delete({ where: { id: targetId } })
    ]);
  }

  /**
   * Bulk version of deleteUser — deletes exactly the given ids, skipping
   * (not aborting on) any that fail their own individual checks, so one
   * ineligible id doesn't block the rest of the batch.
   */
  async deleteManyUsers(actor: JWTPayload, targetIds: number[]): Promise<{ deleted: number; skipped: number }> {
    let deleted = 0;
    let skipped = 0;
    for (const targetId of targetIds) {
      try {
        const result = await this.deleteUser(actor, targetId);
        if (result === 'deleted') deleted++;
        else skipped++;
      } catch {
        skipped++;
      }
    }
    return { deleted, skipped };
  }
}
