import { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { ApplicationReportRow, ApplicationStatus } from '../types';

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  [ApplicationStatus.DRAFT]: 'Draft',
  [ApplicationStatus.SUBMITTED]: 'Submitted',
  [ApplicationStatus.UNDER_REVIEW]: 'Under Review',
  [ApplicationStatus.DOCUMENT_VERIFICATION]: 'Document Verification',
  [ApplicationStatus.INTERVIEW]: 'Interview',
  [ApplicationStatus.APPROVED]: 'Approved',
  [ApplicationStatus.REJECTED]: 'Rejected',
  [ApplicationStatus.NEEDS_REVISION]: 'Needs Revision'
};

const COLUMNS: { key: keyof ApplicationReportRow; label: string }[] = [
  { key: 'lastName', label: 'Last Name' },
  { key: 'firstName', label: 'First Name' },
  { key: 'middleName', label: 'Middle Name' },
  { key: 'suffix', label: 'Suffix' },
  { key: 'sex', label: 'Sex' },
  { key: 'civilStatus', label: 'Civil Status' },
  { key: 'dateOfBirth', label: 'Date of Birth' },
  { key: 'age', label: 'Age' },
  { key: 'placeOfBirth', label: 'Place of Birth' },
  { key: 'address', label: 'Address' },
  { key: 'barangay', label: 'Barangay' },
  { key: 'municipality', label: 'Municipality' },
  { key: 'province', label: 'Province' },
  { key: 'contactNumber', label: 'Contact No.' },
  { key: 'email', label: 'Email' },
  { key: 'schoolName', label: 'School' },
  { key: 'courseName', label: 'Course' },
  { key: 'yearLevel', label: 'Year Level' },
  { key: 'schoolAddress', label: 'School Address' },
  { key: 'gwa', label: 'GWA' },
  { key: 'fatherName', label: "Father's Name" },
  { key: 'fatherOccupation', label: "Father's Occupation" },
  { key: 'motherName', label: "Mother's Name" },
  { key: 'motherOccupation', label: "Mother's Occupation" },
  { key: 'guardianName', label: "Guardian's Name" },
  { key: 'guardianOccupation', label: "Guardian's Occupation" },
  { key: 'householdMonthlyIncome', label: 'Household Monthly Income' },
  { key: 'scholarshipName', label: 'Scholarship Program' },
  { key: 'status', label: 'Application Status' },
  { key: 'submissionDate', label: 'Date Submitted' }
];

// On-screen table page size. CSV export uses a much larger page size
// internally (see handleDownloadCsv) since it needs every matching row,
// not just what's currently on screen.
const PAGE_SIZE = 100;
const EXPORT_PAGE_SIZE = 1000;

function formatCell(row: ApplicationReportRow, key: keyof ApplicationReportRow): string {
  const value = row[key];
  if (value === undefined || value === null || value === '') return '';
  if (key === 'status') return STATUS_LABEL[value as ApplicationStatus];
  if (key === 'dateOfBirth' || key === 'submissionDate') {
    return new Date(value as unknown as string).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }
  return String(value);
}

function toCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const ReportsPage = () => {
  const [rows, setRows] = useState<ApplicationReportRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [barangayFilter, setBarangayFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const currentFilters = () => ({
    name: nameFilter || undefined,
    barangay: barangayFilter || undefined,
    status: (statusFilter as ApplicationStatus) || undefined
  });

  const load = async (targetPage: number) => {
    setLoading(true);
    setError('');
    try {
      const result = await apiService.getApplicationReport({ ...currentFilters(), page: targetPage, pageSize: PAGE_SIZE });
      setRows(result.data);
      setTotalCount(result.total);
      setTotalPages(Math.max(1, result.totalPages));
      setPage(result.page);
    } catch (err: any) {
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    load(1);
  };

  // Pulls every page matching the current filters (not just what's on
  // screen) so the exported file always contains the complete filtered
  // dataset, regardless of on-screen pagination.
  const handleDownloadCsv = async () => {
    setExporting(true);
    setError('');
    try {
      const allRows: ApplicationReportRow[] = [];
      let exportPage = 1;
      let exportTotalPages = 1;
      do {
        const result = await apiService.getApplicationReport({ ...currentFilters(), page: exportPage, pageSize: EXPORT_PAGE_SIZE });
        allRows.push(...result.data);
        exportTotalPages = Math.max(1, result.totalPages);
        exportPage++;
      } while (exportPage <= exportTotalPages);

      const header = COLUMNS.map((c) => c.label);
      const lines = [header, ...allRows.map((row) => COLUMNS.map((c) => formatCell(row, c.key)))].map((line) =>
        line.map(toCsvValue).join(',')
      );
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `applicant-report-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-brand">Reports</div>
      </nav>

      <div className="container">
        <div className="page-header">
          <h1>Applicant Report</h1>
          <p>All applicant profiles and application statuses, filterable and exportable.</p>
        </div>

        {error && (
          <div
            style={{
              padding: '1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              color: '#DC2626'
            }}
          >
            {error}
          </div>
        )}

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <form onSubmit={handleFilterSubmit} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0, minWidth: '200px' }}>
              <label htmlFor="nameFilter">Name of Applicant</label>
              <input id="nameFilter" value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} placeholder="Search first/last name" />
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: '200px' }}>
              <label htmlFor="barangayFilter">Barangay</label>
              <input id="barangayFilter" value={barangayFilter} onChange={(e) => setBarangayFilter(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: '220px' }}>
              <label htmlFor="statusFilter">Status of Application</label>
              <select id="statusFilter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All statuses</option>
                {Object.values(ApplicationStatus).map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABEL[status]}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary btn-sm" type="submit" disabled={loading}>
              {loading ? 'Loading...' : 'Apply Filters'}
            </button>
            <button className="btn btn-outline btn-sm" type="button" onClick={handleDownloadCsv} disabled={loading || exporting || totalCount === 0}>
              {exporting ? 'Preparing export...' : 'Download as Excel/CSV'}
            </button>
          </form>
        </div>

        <div className="card" style={{ overflowX: 'auto' }}>
          {loading ? (
            <p>Loading...</p>
          ) : rows.length === 0 ? (
            <p style={{ color: '#6B7280' }}>No applicants match this filter.</p>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: 0 }}>
                  <strong>{totalCount.toLocaleString()}</strong> row{totalCount === 1 ? '' : 's'} total — showing page {page} of{' '}
                  {totalPages}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-outline btn-sm" disabled={page <= 1 || loading} onClick={() => load(page - 1)}>
                    Previous
                  </button>
                  <button className="btn btn-outline btn-sm" disabled={page >= totalPages || loading} onClick={() => load(page + 1)}>
                    Next
                  </button>
                </div>
              </div>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    {COLUMNS.map((c) => (
                      <th
                        key={c.key}
                        style={{ whiteSpace: 'nowrap', padding: '0.5rem 0.75rem', border: '1px solid var(--border-light)', background: 'rgba(139, 92, 246, 0.06)', textAlign: 'left' }}
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.applicationId}>
                      {COLUMNS.map((c) => (
                        <td key={c.key} style={{ whiteSpace: 'nowrap', padding: '0.5rem 0.75rem', border: '1px solid var(--border-light)', fontSize: '0.85rem' }}>
                          {formatCell(row, c.key)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
