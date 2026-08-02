import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { apiService } from '../services/api';
import { Scholar, ScholarshipProgram } from '../types';
import { COLLEGE_YEAR_LEVELS, PROFESSIONAL_YEAR_LEVELS } from '../constants/profileOptions';

const SENIOR_HIGH_YEAR_LEVELS = ['Grade 11', 'Grade 12'];
const ALS_YEAR_LEVELS = ['Alternative Learning System'];

const STATUS_OPTIONS = ['active', 'inactive', 'graduated', 'terminated'];

type Category = '' | 'senior_high' | 'college' | 'special_course' | 'als';

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: '', label: 'All Categories' },
  { value: 'senior_high', label: 'Senior High School' },
  { value: 'college', label: 'College' },
  { value: 'special_course', label: 'Special Course' },
  { value: 'als', label: 'ALS' }
];

function categoryOf(yearLevel?: string): Category {
  if (!yearLevel) return '';
  if (SENIOR_HIGH_YEAR_LEVELS.includes(yearLevel)) return 'senior_high';
  if (COLLEGE_YEAR_LEVELS.includes(yearLevel)) return 'college';
  if (PROFESSIONAL_YEAR_LEVELS.includes(yearLevel)) return 'special_course';
  if (ALS_YEAR_LEVELS.includes(yearLevel)) return 'als';
  return '';
}

function formatPeso(value: number): string {
  return `₱${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(monthValue: string): string {
  if (!monthValue) return '';
  const [year, month] = monthValue.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
}

// "2026-08" -> matches any submissionDate within that calendar month,
// regardless of timezone-of-day (compares by the date's own local
// year/month, not a UTC slice of the ISO string).
function isInMonth(date: Date, monthValue: string): boolean {
  const [year, month] = monthValue.split('-').map(Number);
  return date.getFullYear() === year && date.getMonth() + 1 === month;
}

interface Signatory {
  name: string;
  title: string;
}

const PayrollPage = () => {
  const [scholars, setScholars] = useState<Scholar[]>([]);
  const [programs, setPrograms] = useState<ScholarshipProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState('active');
  const [categoryFilter, setCategoryFilter] = useState<Category>('');
  const [programFilter, setProgramFilter] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [barangaySearch, setBarangaySearch] = useState('');
  const [month, setMonth] = useState(currentMonthValue());
  const [amount, setAmount] = useState('');

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
      .filter((s) => (statusFilter ? s.status === statusFilter : true))
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
      .sort((a, b) => (a.studentName ?? '').localeCompare(b.studentName ?? ''));
  }, [scholars, statusFilter, programFilter, categoryFilter, nameSearch, barangaySearch, month]);

  const amountValue = parseFloat(amount) || 0;
  const total = amountValue * filtered.length;

  const categoryLabel = CATEGORY_OPTIONS.find((c) => c.value === categoryFilter)?.label ?? 'All Categories';
  const periodLabel = `${categoryLabel.toUpperCase()}${month ? ` — ${formatMonthLabel(month).toUpperCase()}` : ''}`;

  const handlePrint = () => window.print();

  const handleExportExcel = () => {
    const rows: (string | number)[][] = [
      ['GENERAL PAYROLL'],
      ['LGU-Conner, Apayao'],
      ['Enhanced Conner Educational Assistance Program Grantees'],
      [periodLabel],
      [
        'We acknowledge receipt of the sum shown opposite our names as financial assistance under the Conner Educational Assistance Program.'
      ],
      [],
      ['No.', 'Name', 'Barangay', 'Amount', 'Signature'],
      ...filtered.map((scholar, index) => [index + 1, scholar.studentName ?? '', scholar.studentBarangay ?? '', amountValue, '']),
      ['', '', '', '', ''],
      ['', '', 'Total', total, ''],
      [],
      [],
      ['Prepared by:'],
      [preparedBy.name],
      [preparedBy.title],
      [],
      ['Certifying Funds Available:'],
      [certifying1.name, '', certifying2.name],
      [certifying1.title, '', certifying2.title],
      [],
      ['Approved by:'],
      [approvedBy.name],
      [approvedBy.title]
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet['!cols'] = [{ wch: 6 }, { wch: 28 }, { wch: 18 }, { wch: 14 }, { wch: 20 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payroll');

    const filenameParts = ['Payroll', categoryFilter || 'all', month || 'all-months'];
    XLSX.writeFile(workbook, `${filenameParts.join('_')}.xlsx`);
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
              <label htmlFor="payrollStatus">Status</label>
              <select id="payrollStatus" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
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
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ color: 'var(--text-secondary)' }}>
                        No scholars match this filter.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((scholar, index) => (
                      <tr key={scholar.id}>
                        <td>{index + 1}</td>
                        <td>{scholar.studentName ?? '—'}</td>
                        <td>{scholar.studentBarangay ?? '—'}</td>
                        <td>{formatPeso(amountValue)}</td>
                        <td></td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filtered.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700 }}>
                        Total
                      </td>
                      <td style={{ fontWeight: 700 }}>{formatPeso(total)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

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
