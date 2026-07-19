import type { Notification as PrismaNotification } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { Notification, NotificationType, JWTPayload } from '../types.js';
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

  async listForUser(user: JWTPayload): Promise<Notification[]> {
    const notifications = await prisma.notification.findMany({
      where: { userId: user.sub },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    return notifications.map(toNotification);
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
   * Best-effort broadcast (in-app + email) to every Student when a new
   * scholarship program is created. Callers wrap this in a catch.
   */
  async broadcastNewProgram(programName: string): Promise<void> {
    const students = await prisma.user.findMany({ where: { role: 'applicant' }, select: { id: true, email: true } });
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

    await emailService.sendNewProgramAnnouncement(
      students.map((s) => s.email),
      programName
    );
  }
}
