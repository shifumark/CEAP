import { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ScholarshipProgram, UserRole } from '../types';
import Modal from '../components/Modal';
import ApplyModal from '../components/ApplyModal';

const emptyForm = {
  name: '',
  description: '',
  sponsor: '',
  benefits: '',
  numberOfSlots: '',
  maxApplicants: '',
  eligibilityRequirements: '',
  openingDate: '',
  closingDate: '',
  academicYear: '',
  requiredDocuments: ''
};

function formatDate(value?: string | Date) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const ProgramPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;
  const isApplicant = user?.role === UserRole.APPLICANT;

  const [programs, setPrograms] = useState<ScholarshipProgram[]>([]);
  const [appliedScholarshipIds, setAppliedScholarshipIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [applyingTo, setApplyingTo] = useState<ScholarshipProgram | null>(null);
  const [deletingProgram, setDeletingProgram] = useState<ScholarshipProgram | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      const result = await apiService.getScholarships(1, 50);
      setPrograms(result.data);
      if (isApplicant) {
        const applications = await apiService.getApplications({ pageSize: 100 });
        setAppliedScholarshipIds(new Set(applications.data.map((a) => a.scholarshipId)));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load scholarship programs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplySuccess = () => {
    setApplyingTo(null);
    load();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiService.createScholarship({
        name: form.name,
        description: form.description,
        sponsor: form.sponsor,
        benefits: form.benefits,
        numberOfSlots: parseInt(form.numberOfSlots, 10),
        maxApplicants: parseInt(form.maxApplicants, 10),
        eligibilityRequirements: form.eligibilityRequirements,
        openingDate: form.openingDate,
        closingDate: form.closingDate,
        academicYear: form.academicYear,
        requiredDocuments: form.requiredDocuments
          ? form.requiredDocuments.split(',').map((d) => d.trim()).filter(Boolean)
          : undefined
      });
      setShowForm(false);
      setForm(emptyForm);
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to create scholarship program');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (program: ScholarshipProgram) => {
    setBusyId(program.id);
    setError('');
    try {
      await apiService.updateScholarship(program.id, {
        status: program.status === 'active' ? 'closed' : 'active'
      });
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to update program');
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingProgram) return;
    setDeleting(true);
    setError('');
    try {
      await apiService.deleteScholarship(deletingProgram.id);
      setDeletingProgram(null);
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to delete program');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-brand">Programs</div>
        {isAdmin && (
          <div className="navbar-actions">
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
              Create Program
            </button>
          </div>
        )}
      </nav>

      <div className="container">
        <div className="page-header">
          <h1>Scholarship Programs</h1>
          <p>Browse open scholarship programs and their eligibility requirements.</p>
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

        {loading ? (
          <p>Loading...</p>
        ) : programs.length === 0 ? (
          <div className="card">
            <p style={{ color: '#6B7280' }}>No scholarship programs yet.</p>
          </div>
        ) : (
          <div className="grid grid-2">
            {programs.map((program) => (
              <div className="card" key={program.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <h3>{program.name}</h3>
                  <span className={`badge ${program.status === 'active' ? 'badge-success' : 'badge-secondary'}`}>
                    {program.status}
                  </span>
                </div>
                <p style={{ color: '#6B7280', margin: '0.5rem 0' }}>{program.description}</p>
                <p style={{ fontSize: '0.9rem' }}>
                  <strong>Sponsor:</strong> {program.sponsor}
                </p>
                <p style={{ fontSize: '0.9rem' }}>
                  <strong>Benefits:</strong> {program.benefits}
                </p>
                <p style={{ fontSize: '0.9rem' }}>
                  <strong>Eligibility:</strong> {program.eligibilityRequirements}
                </p>
                <p style={{ fontSize: '0.9rem', color: '#6B7280' }}>
                  {program.numberOfSlots} slots · {formatDate(program.openingDate)} – {formatDate(program.closingDate)}
                </p>

                {isAdmin && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-outline btn-sm"
                      disabled={busyId === program.id}
                      onClick={() => handleToggleStatus(program)}
                    >
                      {program.status === 'active' ? 'Close Program' : 'Reopen Program'}
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ color: '#DC2626', borderColor: '#DC2626' }}
                      disabled={busyId === program.id}
                      onClick={() => setDeletingProgram(program)}
                    >
                      Delete Program
                    </button>
                  </div>
                )}

                {isApplicant && program.status === 'active' && (
                  appliedScholarshipIds.has(program.id) ? (
                    <span className="badge badge-secondary" style={{ marginTop: '1rem', display: 'inline-block' }}>
                      Already Applied
                    </span>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ marginTop: '1rem' }}
                      onClick={() => setApplyingTo(program)}
                    >
                      Apply
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <Modal title="Create Scholarship Program" onClose={() => setShowForm(false)}>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label htmlFor="progName">Name</label>
              <input id="progName" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
            </div>
            <div className="form-group">
              <label htmlFor="progDescription">Description</label>
              <textarea
                id="progDescription"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="progSponsor">Sponsor</label>
              <input id="progSponsor" value={form.sponsor} onChange={(e) => setForm({ ...form, sponsor: e.target.value })} required />
            </div>
            <div className="form-group">
              <label htmlFor="progBenefits">Benefits</label>
              <input id="progBenefits" value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} required />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="progSlots">Number of Slots</label>
                <input
                  id="progSlots"
                  type="number"
                  value={form.numberOfSlots}
                  onChange={(e) => setForm({ ...form, numberOfSlots: e.target.value })}
                  required
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="progMaxApplicants">Max Applicants</label>
                <input
                  id="progMaxApplicants"
                  type="number"
                  value={form.maxApplicants}
                  onChange={(e) => setForm({ ...form, maxApplicants: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="progEligibility">Eligibility Requirements</label>
              <input
                id="progEligibility"
                value={form.eligibilityRequirements}
                onChange={(e) => setForm({ ...form, eligibilityRequirements: e.target.value })}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="progOpening">Opening Date</label>
                <input
                  id="progOpening"
                  type="date"
                  value={form.openingDate}
                  onChange={(e) => setForm({ ...form, openingDate: e.target.value })}
                  required
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="progClosing">Closing Date</label>
                <input
                  id="progClosing"
                  type="date"
                  value={form.closingDate}
                  onChange={(e) => setForm({ ...form, closingDate: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="progAcademicYear">Academic Year</label>
              <input
                id="progAcademicYear"
                placeholder="2025-2026"
                value={form.academicYear}
                onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="progDocs">Required Documents (comma-separated)</label>
              <input
                id="progDocs"
                placeholder="Transcript of Records, Certificate of Enrollment"
                value={form.requiredDocuments}
                onChange={(e) => setForm({ ...form, requiredDocuments: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Creating...' : 'Create Program'}
              </button>
              <button className="btn btn-outline" type="button" onClick={() => setShowForm(false)} disabled={saving}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {applyingTo && (
        <ApplyModal scholarship={applyingTo} onClose={() => setApplyingTo(null)} onSuccess={handleApplySuccess} />
      )}

      {deletingProgram && (
        <Modal title="Delete Program" onClose={() => setDeletingProgram(null)}>
          <p
            style={{
              padding: '0.85rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#DC2626'
            }}
          >
            Warning: Deleting <strong>{deletingProgram.name}</strong> permanently removes it along with every
            application, scholar record, grade, renewal, allowance, and violation tied to it. This cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              className="btn btn-primary"
              type="button"
              style={{ background: '#DC2626' }}
              disabled={deleting}
              onClick={handleConfirmDelete}
            >
              {deleting ? 'Deleting...' : 'Delete Program'}
            </button>
            <button className="btn btn-outline" type="button" onClick={() => setDeletingProgram(null)} disabled={deleting}>
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ProgramPage;
