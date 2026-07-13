import { Prisma } from '@prisma/client';
import type { Announcement as PrismaAnnouncement } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { Announcement, AnnouncementType, CreateAnnouncementRequest, AnnouncementFilters, PaginatedResponse } from '../types.js';
import { NotificationService } from './NotificationService.js';

const notificationService = new NotificationService();

function toAnnouncement(record: PrismaAnnouncement): Announcement {
  return {
    id: record.id,
    title: record.title,
    content: record.content,
    announcementType: (record.announcementType as unknown as AnnouncementType) ?? undefined,
    pinned: record.pinned,
    pinnedUntil: record.pinnedUntil ?? undefined,
    createdBy: record.createdBy,
    publishedAt: record.publishedAt ?? undefined,
    imageUrl: record.imageUrl ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export class AnnouncementService {
  async create(createdBy: number, request: CreateAnnouncementRequest): Promise<Announcement> {
    const created = await prisma.announcement.create({
      data: {
        title: request.title,
        content: request.content,
        announcementType: request.announcementType as any,
        imageUrl: request.imageUrl,
        pinned: request.pinned ?? false,
        pinnedUntil: request.pinnedUntil ? new Date(request.pinnedUntil) : undefined,
        createdBy,
        publishedAt: new Date()
      }
    });

    notificationService.broadcastAnnouncement(created.title).catch((error) => {
      console.error('[NotificationService] Failed to broadcast announcement', created.id, error);
    });

    return toAnnouncement(created);
  }

  async list(filters?: AnnouncementFilters): Promise<PaginatedResponse<Announcement>> {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 10;

    const where: Prisma.AnnouncementWhereInput = {};
    if (filters?.type) where.announcementType = filters.type as any;
    if (typeof filters?.pinned === 'boolean') where.pinned = filters.pinned;

    const [items, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }]
      }),
      prisma.announcement.count({ where })
    ]);

    return {
      data: items.map(toAnnouncement),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  async getById(id: number): Promise<Announcement | undefined> {
    const record = await prisma.announcement.findUnique({ where: { id } });
    return record ? toAnnouncement(record) : undefined;
  }

  async update(id: number, request: Partial<CreateAnnouncementRequest>): Promise<Announcement | undefined> {
    try {
      const updated = await prisma.announcement.update({
        where: { id },
        data: {
          title: request.title,
          content: request.content,
          announcementType: request.announcementType as any,
          imageUrl: request.imageUrl,
          pinned: request.pinned,
          pinnedUntil: request.pinnedUntil ? new Date(request.pinnedUntil) : undefined
        }
      });
      return toAnnouncement(updated);
    } catch {
      return undefined;
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      await prisma.announcement.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
}
