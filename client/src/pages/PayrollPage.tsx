import { useEffect, useMemo, useState } from 'react';
import writeXlsxFile, { Row } from 'write-excel-file/browser';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Scholar, ScholarshipProgram, UserRole } from '../types';
import { COLLEGE_YEAR_LEVELS, PROFESSIONAL_YEAR_LEVELS } from '../constants/profileOptions';
import Modal from '../components/Modal';

const SENIOR_HIGH_YEAR_LEVELS = ['Grade 11', 'Grade 12'];
const ALS_YEAR_LEVELS = ['Alternative Learning System'];

type RenewalTypeFilter = '' | 'new' | 'for_renewal';

const RENEWAL_TYPE_OPTIONS: { value: RenewalTypeFilter; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'new', label: 'New Scholar' },
  { value: 'for_renewal', label: 'For Renewal' }
];

type Category = '' | 'senior_high' | 'college' | 'special_course' | 'als';

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: '', label: 'All Categories' },
  { value: 'senior_high', label: 'Senior High School' },
  { value: 'college', label: 'College' },
  { value: 'special_course', label: 'Special Course' },
  { value: 'als', label: 'ALS' }
];

export function categoryOf(yearLevel?: string): Category {
  if (!yearLevel) return '';
  if (SENIOR_HIGH_YEAR_LEVELS.includes(yearLevel)) return 'senior_high';
  if (COLLEGE_YEAR_LEVELS.includes(yearLevel)) return 'college';
  if (PROFESSIONAL_YEAR_LEVELS.includes(yearLevel)) return 'special_course';
  if (ALS_YEAR_LEVELS.includes(yearLevel)) return 'als';
  return '';
}

export function formatPeso(value: number): string {
  return `₱${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// "Last name, First name, Middle initial" — e.g. "Culili, Anton J." —
// falls back to the plain "First Last" studentName for any record
// missing the split name fields (shouldn't happen for fresh data, but
// keeps this from rendering blank if it ever does).
export function formatFullName(scholar: Scholar): string {
  if (!scholar.studentLastName || !scholar.studentFirstName) return scholar.studentName ?? '—';
  const middleInitial = scholar.studentMiddleName?.trim() ? `${scholar.studentMiddleName.trim().charAt(0).toUpperCase()}.` : '';
  return [`${scholar.studentLastName}, ${scholar.studentFirstName}`, middleInitial].filter(Boolean).join(' ');
}

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// "2026-08" -> matches any submissionDate within that calendar month,
// regardless of timezone-of-day (compares by the date's own local
// year/month, not a UTC slice of the ISO string).
export function isInMonth(date: Date, monthValue: string): boolean {
  const [year, month] = monthValue.split('-').map(Number);
  return date.getFullYear() === year && date.getMonth() + 1 === month;
}

interface Signatory {
  name: string;
  title: string;
}

const PayrollPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;
  // Any Admin/Super Admin can trim who's on this specific payroll run
  // (without touching their actual Scholar record); only a Super Admin
  // can add someone who the current filters wouldn't otherwise include.
  const canRemove = isAdmin || isSuperAdmin;
  const canAdd = isSuperAdmin;

  const [scholars, setScholars] = useState<Scholar[]>([]);
  const [programs, setPrograms] = useState<ScholarshipProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [renewalTypeFilter, setRenewalTypeFilter] = useState<RenewalTypeFilter>('');
  const [categoryFilter, setCategoryFilter] = useState<Category>('');
  const [programFilter, setProgramFilter] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [barangaySearch, setBarangaySearch] = useState('');
  const [month, setMonth] = useState(currentMonthValue());
  const [amount, setAmount] = useState('');
  const [semester, setSemester] = useState('');

  // Per-run curation, local to this page — never touches the underlying
  // Scholar records. "Removed" always wins over "manually added" for the
  // same id (re-adding someone clears them from the removed set too).
  const [removedIds, setRemovedIds] = useState<Set<number>>(new Set());
  const [manuallyAddedIds, setManuallyAddedIds] = useState<Set<number>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSearch, setAddSearch] = useState('');

  const [preparedBy, setPreparedBy] = useState<Signatory>({ name: 'LUZVIMINDA T. CULILI', title: 'Economic Researcher' });
  const [certifying1, setCertifying1] = useState<Signatory>({ name: 'JODY P. KEGAN', title: 'Municipal Accountant' });
  const [certifying2, setCertifying2] = useState<Signatory>({ name: 'ROMEL J. PALAIS', title: 'Municipal Treasurer' });
  const [approvedBy, setApprovedBy] = useState<Signatory>({ name: 'ATTY. JORICO F. BAYAUA', title: 'Municipal Mayor' });

  useEffect(() => {
    apiService
      .getScholars({ pageSize: 100 })
      .then((result) => setScholars(result.data))
      .catch((err) => setError(err.message || 'Failed to load scholars'))
      .finally(() => setLoading(false));
    apiService
      .getScholarships(1, 100)
      .then((result) => setPrograms(result.data))
      .catch(() => {
        // Non-fatal — the Program filter just won't have options if this fails.
      });
  }, []);

  const filtered = useMemo(() => {
    return scholars
      .filter((s) => {
        if (renewalTypeFilter === 'new') return !s.hasRenewalRequest;
        if (renewalTypeFilter === 'for_renewal') return Boolean(s.hasRenewalRequest);
        return true;
      })
      .filter((s) => (programFilter ? s.scholarshipId === Number(programFilter) : true))
      .filter((s) => (categoryFilter ? categoryOf(s.yearLevel) === categoryFilter : true))
      .filter((s) => (nameSearch ? s.studentName?.toLowerCase().includes(nameSearch.toLowerCase()) : true))
      .filter((s) => {
        if (!barangaySearch) return true;
        const q = barangaySearch.toLowerCase();
        return (
          s.studentBarangay?.toLowerCase().includes(q) || s.studentAddress?.toLowerCase().includes(q)
        );
      })
      .filter((s) => {
        if (!month) return true;
        // No submissionDate (e.g. a manually-approved scholar who never
        // went through the online application flow) can't match a
        // specific submission month, so it's excluded rather than shown.
        if (!s.submissionDate) return false;
        return isInMonth(new Date(s.submissionDate), month);
      })
      .sort((a, b) => (a.studentLastName ?? a.studentName ?? '').localeCompare(b.studentLastName ?? b.studentName ?? ''));
  }, [scholars, renewalTypeFilter, programFilter, categoryFilter, nameSearch, barangaySearch, month]);

  // What actually gets shown/printed/exported: the filtered set, plus
  // anyone manually added back in (even if the current filters wouldn't
  // otherwise include them), minus anyone manually removed from this run.
  const finalList = useMemo(() => {
    const byId = new Map(scholars.map((s) => [s.id, s]));
    const filteredIds = new Set(filtered.map((s) => s.id));
    const manualExtras = Array.from(manuallyAddedIds)
      .filter((id) => !filteredIds.has(id))
      .map((id) => byId.get(id))
      .filter((s): s is Scholar => Boolean(s));

    return [...filtered, ...manualExtras]
      .filter((s) => !removedIds.has(s.id))
      .sort((a, b) => (a.studentLastName ?? a.studentName ?? '').localeCompare(b.studentLastName ?? b.studentName ?? ''));
  }, [scholars, filtered, manuallyAddedIds, removedIds]);

  const addCandidates = useMemo(() => {
    const finalIds = new Set(finalList.map((s) => s.id));
    return scholars
      .filter((s) => !finalIds.has(s.id))
      .filter((s) => (addSearch ? (s.studentName ?? '').toLowerCase().includes(addSearch.toLowerCase()) : true))
      .sort((a, b) => (a.studentLastName ?? a.studentName ?? '').localeCompare(b.studentLastName ?? b.studentName ?? ''));
  }, [scholars, finalList, addSearch]);

  const handleRemove = (id: number) => {
    setRemovedIds((prev) => new Set(prev).add(id));
    setManuallyAddedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleAdd = (id: number) => {
    setManuallyAddedIds((prev) => new Set(prev).add(id));
    setRemovedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const amountValue = parseFloat(amount) || 0;
  const total = amountValue * finalList.length;

  const categoryLabel = CATEGORY_OPTIONS.find((c) => c.value === categoryFilter)?.label ?? 'All Categories';
  const programLabel = programFilter ? programs.find((p) => String(p.id) === programFilter)?.name : undefined;
  const programCategoryLabel = [programLabel?.toUpperCase(), categoryLabel.toUpperCase()].filter(Boolean).join(' — ');
  const periodLabel = [programCategoryLabel, semester.trim() ? semester.trim().toUpperCase() : undefined].filter(Boolean).join(' ');

  const handlePrint = () => window.print();

  const handleExportExcel = async () => {
    const BORDER: { borderColor: string; borderStyle: 'thin' } = { borderColor: '#000000', borderStyle: 'thin' };
    const centeredLine = (value: string, extra?: Record<string, unknown>): Row => [
      { value, align: 'center', wrap: true, columnSpan: 5, ...extra },
      null,
      null,
      null,
      null
    ];

    const rows: Row[] = [
      centeredLine('GENERAL PAYROLL', { fontWeight: 'bold', fontSize: 16 }),
      centeredLine('LGU-Conner, Apayao', { fontWeight: 'bold' }),
      centeredLine('Enhanced Conner Educational Assistance Program Grantees', { fontWeight: 'bold' }),
      centeredLine(periodLabel, { fontWeight: 'bold' }),
      centeredLine(
        'We acknowledge receipt of the sum shown opposite our names as financial assistance under the Conner Educational Assistance Program.'
      ),
      [],
      ['No.', 'Name', 'Barangay', 'Amount', 'Signature'].map((header) => ({
        value: header,
        fontWeight: 'bold',
        align: 'center',
        ...BORDER
      })) as Row,
      ...finalList.map(
        (scholar, index): Row => [
          { value: index + 1, align: 'center', ...BORDER },
          { value: formatFullName(scholar), ...BORDER },
          { value: scholar.studentBarangay ?? '', ...BORDER },
          { value: amountValue, format: '"₱"#,##0.00', align: 'right', ...BORDER },
          { value: '', ...BORDER }
        ]
      ),
      [
        { value: 'Total', fontWeight: 'bold', align: 'right', columnSpan: 3, ...BORDER },
        null,
        null,
        { value: total, fontWeight: 'bold', format: '"₱"#,##0.00', align: 'right', ...BORDER },
        { value: '', ...BORDER }
      ],
      [],
      [],
      [{ value: 'Prepared by:' }],
      centeredLine(preparedBy.name, { fontWeight: 'bold' }),
      centeredLine(preparedBy.title),
      [],
      [{ value: 'Certifying Funds Available:' }],
      [
        { value: certifying1.name, fontWeight: 'bold', align: 'center', columnSpan: 2 },
        null,
        { value: '' },
        { value: certifying2.name, fontWeight: 'bold', align: 'center', columnSpan: 2 },
        null
      ],
      [
        { value: certifying1.title, align: 'center', columnSpan: 2 },
        null,
        { value: '' },
        { value: certifying2.title, align: 'center', columnSpan: 2 },
        null
      ],
      [],
      [{ value: 'Approved by:' }],
      centeredLine(approvedBy.name, { fontWeight: 'bold' }),
      centeredLine(approvedBy.title)
    ];

    const filenameParts = ['Payroll', categoryFilter || 'all', month || 'all-months'];
    await writeXlsxFile(rows, {
      sheet: 'Payroll',
      columns: [{ width: 6 }, { width: 28 }, { width: 18 }, { width: 14 }, { width: 20 }]
    }).toFile(`${filenameParts.join('_')}.xlsx`);
  };

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-brand">Payroll</div>
        <div className="navbar-actions">
          <button className="btn btn-secondary btn-sm" onClick={handleExportExcel}>
            Download Excel
          </button>
          <button className="btn btn-primary btn-sm" onClick={handlePrint}>
            Print
          </button>
        </div>
      </nav>

      <div className="container">
        <div className="page-header">
          <h1>Payroll</h1>
          <p>Generate and print a signed acknowledgment payroll for approved scholars.</p>
        </div>

        {error && (
          <div className="alert-error" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        <div className="card payroll-filters" style={{ marginBottom: '1.5rem' }}>
          <div className="grid grid-4" style={{ margin: 0 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="payrollRenewalType">Status</label>
              <select
                id="payrollRenewalType"
                value={renewalTypeFilter}
                onChange={(e) => setRenewalTypeFilter(e.target.value as RenewalTypeFilter)}
              >
                {RENEWAL_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="payrollCategory">Category</label>
              <select
                id="payrollCategory"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as Category)}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="payrollProgram">Program</label>
              <select id="payrollProgram" value={programFilter} onChange={(e) => setProgramFilter(e.target.value)}>
                <option value="">All Programs</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="payrollName">Name</label>
              <input
                id="payrollName"
                placeholder="Search by name"
                value={nameSearch}
                onChange={(e) => setNameSearch(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="payrollBarangay">Barangay</label>
              <input
                id="payrollBarangay"
                placeholder="Search by barangay"
                value={barangaySearch}
                onChange={(e) => setBarangaySearch(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="payrollMonth">Month Submitted</label>
              <input id="payrollMonth" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="payrollSemester">Semester / School Year</label>
              <input
                id="payrollSemester"
                placeholder="2ND SEMESTER (S.Y. 2025-2026)"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="payrollAmount">Amount (applies to all rows below)</label>
              <input
                id="payrollAmount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="card payroll-sheet">
            <div className="payroll-sheet-header" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ marginBottom: '0.25rem' }}>GENERAL PAYROLL</h2>
              <p style={{ fontWeight: 700, margin: 0 }}>LGU-Conner, Apayao</p>
              <p style={{ fontWeight: 700, margin: 0 }}>Enhanced Conner Educational Assistance Program Grantees</p>
              <p style={{ fontWeight: 700, margin: '0 0 1rem 0' }}>{periodLabel}</p>
              <p style={{ margin: 0 }}>
                We acknowledge receipt of the sum shown opposite our names as financial assistance under the Conner
                Educational Assistance Program.
              </p>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '3rem' }}>No.</th>
                    <th>Name</th>
                    <th>Barangay</th>
                    <th>Amount</th>
                    <th>Signature</th>
                    {canRemove && <th className="no-print">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {finalList.length === 0 ? (
                    <tr>
                      <td colSpan={canRemove ? 6 : 5} style={{ color: 'var(--text-secondary)' }}>
                        No scholars match this filter.
                      </td>
                    </tr>
                  ) : (
                    finalList.map((scholar, index) => (
                      <tr key={scholar.id}>
                        <td>{index + 1}</td>
                        <td>{formatFullName(scholar)}</td>
                        <td>{scholar.studentBarangay ?? '—'}</td>
                        <td>{formatPeso(amountValue)}</td>
                        <td></td>
                        {canRemove && (
                          <td className="no-print">
                            <button className="btn btn-outline btn-sm" type="button" onClick={() => handleRemove(scholar.id)}>
                              Remove
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
                {finalList.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700 }}>
                        Total
                      </td>
                      <td style={{ fontWeight: 700 }}>{formatPeso(total)}</td>
                      <td></td>
                      {canRemove && <td className="no-print"></td>}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {canAdd && (
              <button
                className="btn btn-outline btn-sm no-print"
                type="button"
                style={{ marginTop: '1rem' }}
                onClick={() => setShowAddModal(true)}
              >
                + Add Scholar
              </button>
            )}

            <div className="payroll-signatories" style={{ marginTop: '3rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div>
                <p style={{ marginBottom: '1.5rem' }}>Prepared by:</p>
                <SignatoryFields value={preparedBy} onChange={setPreparedBy} />
              </div>

              <div>
                <p style={{ marginBottom: '1.5rem' }}>Certifying Funds Available:</p>
                <div className="grid grid-2" style={{ margin: 0 }}>
                  <SignatoryFields value={certifying1} onChange={setCertifying1} />
                  <SignatoryFields value={certifying2} onChange={setCertifying2} />
                </div>
              </div>

              <div>
                <p style={{ marginBottom: '1.5rem' }}>Approved by:</p>
                <SignatoryFields value={approvedBy} onChange={setApprovedBy} />
              </div>
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <Modal
          title="Add Scholar to Payroll"
          onClose={() => {
            setShowAddModal(false);
            setAddSearch('');
          }}
        >
          <div className="form-group">
            <label htmlFor="addScholarSearch">Search</label>
            <input
              id="addScholarSearch"
              placeholder="Search by name"
              value={addSearch}
              onChange={(e) => setAddSearch(e.target.value)}
              autoFocus
            />
          </div>

          {addCandidates.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {addSearch ? 'No matching scholars.' : 'Every scholar is already on this payroll.'}
            </p>
          ) : (
            <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {addCandidates.map((scholar) => (
                <div
                  key={scholar.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.6rem 0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div>
                    <div>{formatFullName(scholar)}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {scholar.studentBarangay ?? '—'} · {scholar.scholarshipName ?? '—'}
                    </div>
                  </div>
                  <button className="btn btn-primary btn-sm" type="button" onClick={() => handleAdd(scholar.id)}>
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

interface SignatoryFieldsProps {
  value: Signatory;
  onChange: (value: Signatory) => void;
}

const SignatoryFields = ({ value, onChange }: SignatoryFieldsProps) => (
  <div className="payroll-signatory">
    <input
      className="payroll-signatory-name"
      value={value.name}
      onChange={(e) => onChange({ ...value, name: e.target.value })}
      style={{ fontWeight: 700, textAlign: 'center', width: '100%', marginBottom: '0.35rem' }}
    />
    <input
      className="payroll-signatory-title"
      value={value.title}
      onChange={(e) => onChange({ ...value, title: e.target.value })}
      style={{ textAlign: 'center', width: '100%' }}
    />
  </div>
);

export default PayrollPage;
