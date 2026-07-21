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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editingProgram, setEditingProgram] = useState<ScholarshipProgram | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [savingEdit, setSavingEdit] = useState(false);

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

  const toEditForm = (program: ScholarshipProgram) => ({
    name: program.name,
    description: program.description,
    sponsor: program.sponsor,
    benefits: program.benefits,
    numberOfSlots: String(program.numberOfSlots),
    maxApplicants: String(program.maxApplicants),
    eligibilityRequirements: program.eligibilityRequirements,
    openingDate: new Date(program.openingDate).toISOString().slice(0, 10),
    closingDate: new Date(program.closingDate).toISOString().slice(0, 10),
    academicYear: program.academicYear,
    requiredDocuments: ''
  });

  const openEdit = async (program: ScholarshipProgram) => {
    setEditingProgram(program);
    setEditForm(toEditForm(program));
    try {
      const docs = await apiService.getRequiredDocuments(program.id);
      setEditForm((prev) => ({ ...prev, requiredDocuments: docs.map((d) => d.documentType).join(', ') }));
    } catch {
      // Non-fatal — the field just starts blank if this fails, same as
      // a brand-new program with no required documents yet.
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProgram) return;
    setSavingEdit(true);
    setError('');
    try {
      await apiService.updateScholarship(editingProgram.id, {
        name: editForm.name,
        description: editForm.description,
        sponsor: editForm.sponsor,
        benefits: editForm.benefits,
        numberOfSlots: parseInt(editForm.numberOfSlots, 10),
        maxApplicants: parseInt(editForm.maxApplicants, 10),
        eligibilityRequirements: editForm.eligibilityRequirements,
        openingDate: editForm.openingDate,
        closingDate: editForm.closingDate,
        academicYear: editForm.academicYear,
        requiredDocuments: editForm.requiredDocuments
          ? editForm.requiredDocuments.split(',').map((d) => d.trim()).filter(Boolean)
          : []
      });
      setEditingProgram(null);
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to update program');
    } finally {
      setSavingEdit(false);
    }
  };

  // +1/-1 day increments on the closing date. Shortening it enough to
  // land in the past is allowed on purpose — the next load() picks up
  // the server's auto-close (any active program whose closingDate has
  // passed flips to "closed" on read), so this is also how an admin can
  // deliberately force-close a program early.
  const handleAdjustClosingDate = async (program: ScholarshipProgram, deltaDays: number) => {
    setBusyId(program.id);
    setError('');
    try {
      const nextDate = new Date(program.closingDate);
      nextDate.setDate(nextDate.getDate() + deltaDays);
      await apiService.updateScholarship(program.id, { closingDate: nextDate.toISOString().slice(0, 10) });
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to adjust closing date');
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

  const filteredPrograms = programs.filter((program) => {
    if (statusFilter && program.status !== statusFilter) return false;
    if (searchQuery && !program.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

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

        {!loading && programs.length > 0 && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ margin: 0, minWidth: '220px' }}>
                <label htmlFor="programSearch">Search</label>
                <input
                  id="programSearch"
                  placeholder="Program name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ margin: 0, minWidth: '180px' }}>
                <label htmlFor="programStatusFilter">Status</label>
                <select id="programStatusFilter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <p>Loading...</p>
        ) : programs.length === 0 ? (
          <div className="card">
            <p style={{ color: '#6B7280' }}>No scholarship programs yet.</p>
          </div>
        ) : filteredPrograms.length === 0 ? (
          <div className="card">
            <p style={{ color: '#6B7280' }}>No programs match this filter.</p>
          </div>
        ) : (
          <div className="grid grid-2">
            {filteredPrograms.map((program) => (
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
                <p style={{ fontSize: '0.8rem', color: '#6B7280' }}>Created: {formatDate(program.createdAt)}</p>

                {isAdmin && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      className="btn btn-outline btn-sm"
                      disabled={busyId === program.id}
                      onClick={() => openEdit(program)}
                    >
                      Edit Program
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      disabled={busyId === program.id}
                      onClick={() => handleToggleStatus(program)}
                    >
                      {program.status === 'active' ? 'Close Program' : 'Reopen Program'}
                    </button>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <button
                        className="btn btn-outline btn-sm"
                        title="Shorten closing date by 1 day"
                        disabled={busyId === program.id}
                        onClick={() => handleAdjustClosingDate(program, -1)}
                      >
                        −1 Day
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        title="Extend closing date by 1 day"
                        disabled={busyId === program.id}
                        onClick={() => handleAdjustClosingDate(program, 1)}
                      >
                        +1 Day
                      </button>
                    </span>
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

      {editingProgram && (
        <Modal title={`Edit: ${editingProgram.name}`} onClose={() => setEditingProgram(null)}>
          <form onSubmit={handleUpdate}>
            <div className="form-group">
              <label htmlFor="editName">Name</label>
              <input
                id="editName"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label htmlFor="editDescription">Description</label>
              <textarea
                id="editDescription"
                rows={2}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="editSponsor">Sponsor</label>
              <input
                id="editSponsor"
                value={editForm.sponsor}
                onChange={(e) => setEditForm({ ...editForm, sponsor: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="editBenefits">Benefits</label>
              <input
                id="editBenefits"
                value={editForm.benefits}
                onChange={(e) => setEditForm({ ...editForm, benefits: e.target.value })}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="editSlots">Number of Slots</label>
                <input
                  id="editSlots"
                  type="number"
                  value={editForm.numberOfSlots}
                  onChange={(e) => setEditForm({ ...editForm, numberOfSlots: e.target.value })}
                  required
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="editMaxApplicants">Max Applicants</label>
                <input
                  id="editMaxApplicants"
                  type="number"
                  value={editForm.maxApplicants}
                  onChange={(e) => setEditForm({ ...editForm, maxApplicants: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="editEligibility">Eligibility Requirements</label>
              <input
                id="editEligibility"
                value={editForm.eligibilityRequirements}
                onChange={(e) => setEditForm({ ...editForm, eligibilityRequirements: e.target.value })}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="editOpening">Opening Date</label>
                <input
                  id="editOpening"
                  type="date"
                  value={editForm.openingDate}
                  onChange={(e) => setEditForm({ ...editForm, openingDate: e.target.value })}
                  required
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="editClosing">Closing Date</label>
                <input
                  id="editClosing"
                  type="date"
                  value={editForm.closingDate}
                  onChange={(e) => setEditForm({ ...editForm, closingDate: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="editAcademicYear">Academic Year</label>
              <input
                id="editAcademicYear"
                placeholder="2025-2026"
                value={editForm.academicYear}
                onChange={(e) => setEditForm({ ...editForm, academicYear: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="editDocs">Required Documents (comma-separated)</label>
              <input
                id="editDocs"
                placeholder="Transcript of Records, Certificate of Enrollment"
                value={editForm.requiredDocuments}
                onChange={(e) => setEditForm({ ...editForm, requiredDocuments: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-primary" type="submit" disabled={savingEdit}>
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
              <button className="btn btn-outline" type="button" onClick={() => setEditingProgram(null)} disabled={savingEdit}>
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
