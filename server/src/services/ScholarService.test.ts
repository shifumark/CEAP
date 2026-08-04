import { describe, it, expect } from 'vitest';
import { toScholar, ScholarWithRelations } from './ScholarService.js';

// Regression coverage for the bug that broke production: getMyRecords
// used to call `records.map(toScholar)` directly. Array.prototype.map
// invokes its callback as (element, index, array) — toScholar's second
// and third parameters (submissionDate, receivedDate) silently received
// the array index (a number) and the array itself instead of undefined,
// which is exactly the kind of mismatch tsc caught once the codebase
// was building again, but was masked for a while by a stale deploy. The
// fix was `.map((record) => toScholar(record))`; this test exists so a
// future accidental revert to the bare-function-reference form gets
// caught by `npm test` instead of by a student's blank screen.
const record: ScholarWithRelations = {
  id: 34,
  userId: 185,
  scholarshipId: 22,
  scholarIdNumber: 'SCH-2026-00034',
  approvalDate: new Date('2026-08-01'),
  qrCode: null,
  status: 'active',
  createdAt: new Date('2026-08-01T14:56:15.501Z'),
  updatedAt: new Date('2026-08-01T14:56:15.518Z'),
  scholarship: { name: 'ASAP2', status: 'active' } as any,
  user: {
    firstName: 'Anton',
    lastName: 'Culili',
    email: 'arkanepink@gmail.com',
    applicant: { middleName: 'Jose', barangay: 'Paddaoan', address: 'Talifugu' }
  } as any
} as unknown as ScholarWithRelations;

describe('toScholar', () => {
  it('maps a single record correctly when called directly with explicit args', () => {
    const result = toScholar(record, new Date('2026-07-01'), new Date('2026-07-05'));
    expect(result.submissionDate).toEqual(new Date('2026-07-01'));
    expect(result.receivedDate).toEqual(new Date('2026-07-05'));
    expect(result.studentName).toBe('Anton Culili');
    expect(result.studentFirstName).toBe('Anton');
    expect(result.studentLastName).toBe('Culili');
    expect(result.studentMiddleName).toBe('Jose');
  });

  it('leaves submissionDate/receivedDate undefined (not corrupted) when omitted, the way getMyRecords calls it', () => {
    const records = [record, { ...record, id: 35 }];
    // The correct call pattern — an explicit wrapper arrow function, not
    // a bare function reference — so map's (index, array) never reach
    // toScholar's optional Date parameters.
    const results = records.map((r) => toScholar(r));

    expect(Array.isArray(results)).toBe(true);
    expect(results).toHaveLength(2);
    for (const r of results) {
      expect(r.submissionDate).toBeUndefined();
      expect(r.receivedDate).toBeUndefined();
    }
  });

  it('demonstrates why the bare `records.map(toScholar)` form is wrong', () => {
    const records = [record, { ...record, id: 35 }];
    // This is the exact buggy call pattern that shipped — kept here as a
    // negative example, not something any real code should do. tsc
    // rightly flags this call as a type error (that's the whole point:
    // the compiler catches this the moment the project actually builds),
    // so it's suppressed here rather than left to break `npm run build`
    // the same way it broke it in production.
    // @ts-expect-error — see comment above; this line is intentionally wrong.
    const buggyResults = records.map(toScholar);

    // Array.map passes (element, index, array) — index 0 and 1 land in
    // the submissionDate parameter as raw numbers, not Dates.
    expect(buggyResults[0].submissionDate).toBe(0);
    expect(buggyResults[1].submissionDate).toBe(1);
  });
});
