import type { Notification as PrismaNotification } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { Notification, NotificationType, JWTPayload, UserRole } from '../types.js';
import { EmailService } from './EmailService.js';

const emailService = new EmailService();

function toNotification(record: PrismaNotification): Notification {
  return {
    id: record.id,
    userId: record.userId,
    title: record.title ?? undefined,
    message: record.message ?? undefined,
    notificationType: record.notificationType as unknown as NotificationType,
    isRead: record.isRead,
    readAt: record.readAt ?? undefined,
    actionUrl: record.actionUrl ?? undefined,
    createdAt: record.createdAt
  };
}

export class NotificationService {
  async create(userId: number, type: NotificationType, title: string, message: string, actionUrl?: string) {
    await prisma.notification.create({
      data: { userId, notificationType: type as any, title, message, actionUrl }
    });
  }

  // No dedicated scheduler in this app's infra (same lazy-expiry pattern
  // used for auto-closing scholarship programs), so Student notifications
  // older than 2 days are cleaned up on read rather than on a timer.
  // Admin/Super Admin notifications are exempt — they don't get the same
  // "disappears after 2 days" treatment Students see, since staff rely on
  // them as a durable record of new applicants.
  private static readonly STUDENT_NOTIFICATION_LIFETIME_MS = 2 * 24 * 60 * 60 * 1000;

  async listForUser(user: JWTPayload): Promise<Notification[]> {
    if (user.role === UserRole.APPLICANT) {
      await prisma.notification.deleteMany({
        where: {
          userId: user.sub,
          createdAt: { lt: new Date(Date.now() - NotificationService.STUDENT_NOTIFICATION_LIFETIME_MS) }
        }
      });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: user.sub },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    return notifications.map(toNotification);
  }

  /**
   * Ownership predicate is the query itself (deleteMany scoped to
   * userId) — a user can never delete someone else's notification, even
   * by guessing an id.
   */
  async delete(user: JWTPayload, id: number): Promise<boolean> {
    const result = await prisma.notification.deleteMany({ where: { id, userId: user.sub } });
    return result.count > 0;
  }

  async deleteAll(user: JWTPayload): Promise<number> {
    const result = await prisma.notification.deleteMany({ where: { userId: user.sub } });
    return result.count;
  }

  /**
   * Ownership predicate is the query itself (updateMany scoped to
   * userId) — a user can never mark someone else's notification as read,
   * even by guessing an id.
   */
  async markAsRead(user: JWTPayload, id: number): Promise<Notification | undefined> {
    const result = await prisma.notification.updateMany({
      where: { id, userId: user.sub },
      data: { isRead: true, readAt: new Date() }
    });
    if (result.count === 0) return undefined;

    const record = await prisma.notification.findUnique({ where: { id } });
    return record ? toNotification(record) : undefined;
  }

  async markAllAsRead(user: JWTPayload): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { userId: user.sub, isRead: false },
      data: { isRead: true, readAt: new Date() }
    });
    return result.count;
  }

  /**
   * Best-effort broadcast to every Student when an announcement is
   * published. Failures here shouldn't fail the announcement creation
   * itself — callers wrap this in a catch.
   */
  async broadcastAnnouncement(title: string): Promise<void> {
    const students = await prisma.user.findMany({ where: { role: 'applicant' }, select: { id: true } });
    if (students.length === 0) return;

    await prisma.notification.createMany({
      data: students.map((s) => ({
        userId: s.id,
        notificationType: 'announcement_posted' as const,
        title: 'New Announcement',
        message: title,
        actionUrl: '/announcements'
      }))
    });
  }

  /**
   * Best-effort broadcast to every Admin and Super Admin when a student
   * submits an application. Unlike Student-facing notifications, these
   * are never auto-expired (see listForUser's 2-day cleanup, which only
   * applies to applicant-role recipients) — callers wrap this in a catch.
   */
  async notifyAdminsOfNewApplication(applicantName: string, scholarshipName: string): Promise<void> {
    const staff = await prisma.user.findMany({
      where: { role: { in: ['admin', 'super_admin'] } },
      select: { id: true }
    });
    if (staff.length === 0) return;

    await prisma.notification.createMany({
      data: staff.map((s) => ({
        userId: s.id,
        notificationType: 'application_submitted' as const,
        title: 'New Application Submitted',
        message: `${applicantName} submitted an application for ${scholarshipName}.`,
        actionUrl: '/applications'
      }))
    });
  }

  /**
   * Best-effort broadcast (in-app + email) to every Student when a new
   * scholarship program is created. Callers wrap this in a catch.
   */
  async broadcastNewProgram(programName: string): Promise<void> {
    const students = await prisma.user.findMany({
      where: { role: 'applicant' },
      select: { id: true, email: true, applicant: { select: { contactEmail: true } } }
    });
    if (students.length === 0) return;

    await prisma.notification.createMany({
      data: students.map((s) => ({
        userId: s.id,
        notificationType: 'scholarship_posted' as const,
        title: 'New Scholarship Program',
        message: `${programName} is now open for applications.`,
        actionUrl: '/programs'
      }))
    });

    // Each student's chosen notification address takes priority, falling
    // back to their account login email.
    await emailService.sendNewProgramAnnouncement(
      students.map((s) => s.applicant?.contactEmail || s.email),
      programName
    );
  }
}
