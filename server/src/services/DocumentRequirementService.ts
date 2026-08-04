import type { DocumentRequirement as PrismaDocumentRequirement } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { DocumentRequirement } from '../types.js';

function toRequirement(record: PrismaDocumentRequirement): DocumentRequirement {
  return {
    id: record.id,
    documentType: record.documentType,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export class DocumentRequirementService {
  async list(): Promise<DocumentRequirement[]> {
    const rows = await prisma.documentRequirement.findMany({ orderBy: { id: 'asc' } });
    return rows.map(toRequirement);
  }

  async create(documentType: string): Promise<DocumentRequirement> {
    const trimmed = documentType?.trim();
    if (!trimmed) {
      throw new Error('Document type is required');
    }

    const existing = await prisma.documentRequirement.findUnique({ where: { documentType: trimmed } });
    if (existing) {
      throw new Error('This document requirement already exists');
    }

    try {
      const created = await prisma.documentRequirement.create({ data: { documentType: trimmed } });
      return toRequirement(created);
    } catch (error: any) {
      // The check above has a race: two concurrent creates for the same
      // documentType can both pass it before either commits.
      // DocumentRequirement.documentType is @unique, so this just turns
      // the loser's P2002 into the same friendly message instead of a
      // raw 500.
      if (error?.code === 'P2002') {
        throw new Error('This document requirement already exists');
      }
      throw error;
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      await prisma.documentRequirement.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
}
