import { describe, it, expect } from 'vitest';
import { categoryOf, formatPeso, formatFullName, isInMonth } from './PayrollPage';
import { Scholar } from '../types';

describe('categoryOf', () => {
  it('classifies Senior High/ALS year levels', () => {
    expect(categoryOf('Grade 11')).toBe('senior_high');
    expect(categoryOf('Grade 12')).toBe('senior_high');
  });

  it('classifies College year levels', () => {
    expect(categoryOf('1st Year College')).toBe('college');
    expect(categoryOf('4th Year College')).toBe('college');
  });

  it('classifies Special Course (professional) year levels', () => {
    expect(categoryOf('First Year')).toBe('special_course');
    expect(categoryOf('Fifth Year')).toBe('special_course');
  });

  it('classifies ALS', () => {
    expect(categoryOf('Alternative Learning System')).toBe('als');
  });

  it('returns empty string for missing or unrecognized year levels', () => {
    expect(categoryOf(undefined)).toBe('');
    expect(categoryOf('')).toBe('');
    expect(categoryOf('Some Unknown Level')).toBe('');
  });
});

describe('formatPeso', () => {
  it('formats with peso sign, thousands separator, and 2 decimals', () => {
    expect(formatPeso(5000)).toBe('₱5,000.00');
    expect(formatPeso(0)).toBe('₱0.00');
    expect(formatPeso(1234.5)).toBe('₱1,234.50');
  });
});

describe('formatFullName', () => {
  const base: Scholar = {
    id: 1,
    userId: 1,
    scholarshipId: 1,
    status: 'active' as any,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  it('formats as "Last, First M." when a middle name is present', () => {
    const scholar: Scholar = { ...base, studentFirstName: 'Anton', studentLastName: 'Culili', studentMiddleName: 'Jose' };
    expect(formatFullName(scholar)).toBe('Culili, Anton J.');
  });

  it('formats as "Last, First" with no trailing initial when middle name is absent', () => {
    const scholar: Scholar = { ...base, studentFirstName: 'Anton', studentLastName: 'Culili' };
    expect(formatFullName(scholar)).toBe('Culili, Anton');
  });

  it('treats a blank/whitespace-only middle name the same as absent', () => {
    const scholar: Scholar = { ...base, studentFirstName: 'Anton', studentLastName: 'Culili', studentMiddleName: '   ' };
    expect(formatFullName(scholar)).toBe('Culili, Anton');
  });

  it('falls back to the plain studentName when split name fields are missing', () => {
    const scholar: Scholar = { ...base, studentName: 'Anton Culili' };
    expect(formatFullName(scholar)).toBe('Anton Culili');
  });

  it('falls back to an em dash when nothing is available at all', () => {
    expect(formatFullName(base)).toBe('—');
  });
});

describe('isInMonth', () => {
  it('matches a date within the given calendar month/year', () => {
    expect(isInMonth(new Date(2026, 7, 15), '2026-08')).toBe(true); // Aug 15, 2026
    expect(isInMonth(new Date(2026, 7, 1), '2026-08')).toBe(true);
    expect(isInMonth(new Date(2026, 7, 31), '2026-08')).toBe(true);
  });

  it('rejects a date outside the given month, even if the day matches', () => {
    expect(isInMonth(new Date(2026, 6, 15), '2026-08')).toBe(false); // July
    expect(isInMonth(new Date(2026, 8, 15), '2026-08')).toBe(false); // September
  });

  it('rejects a date in the same month but a different year', () => {
    expect(isInMonth(new Date(2025, 7, 15), '2026-08')).toBe(false);
  });
});
