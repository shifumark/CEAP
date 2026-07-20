import { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { Applicant, ProfileCompleteness, UpdateApplicantProfileRequest } from '../types';
import ProfileDocuments from '../components/ProfileDocuments';
import ValidIdUpload from '../components/ValidIdUpload';
import {
  SEX_OPTIONS,
  CIVIL_STATUS_OPTIONS,
  SUFFIX_OPTIONS,
  ID_TYPE_OPTIONS,
  SECTORAL_CLASSIFICATIONS,
  PARENTAL_STATUS_OPTIONS,
  YEAR_LEVEL_OPTIONS,
  COLLEGE_YEAR_LEVELS,
  SCHOOL_TYPE_OPTIONS,
  ACADEMIC_STATUS_OPTIONS
} from '../constants/profileOptions';

// Local, string-only mirror of UpdateApplicantProfileRequest so every
// input can stay a simple controlled <input>/<select> — converted to the
// real request shape only at submit time.
interface FamilyMemberForm {
  name: string;
  occupation: string;
  monthlyIncome: string;
  educationalAttainment: string;
}

interface FormState {
  firstName: string;
  lastName: string;
  middleName: string;
  suffix: string;
  dateOfBirth: string;
  age: string;
  sex: string;
  civilStatus: string;
  contactNumber: string;
  address: string;
  schoolName: string;
  courseName: string;
  yearLevel: string;
  municipality: string;
  barangay: string;
  householdMonthlyIncome: string;
  placeOfBirth: string;
  nationality: string;
  idType: string;
  idNumber: string;
  isIndigenousPeople: string; // '', 'yes', 'no'
  ipGroupTribe: string;
  province: string;
  sectoralClassifications: string[];
  sectoralClassificationOther: string;
  numberOfHouseholdMembers: string;
  numberOfDependentsStudying: string;
  parentalStatus: string;
  schoolAddress: string;
  schoolType: string;
  gwa: string;
  previousSchool: string;
  honorsAwards: string;
  academicStatus: string;
  currentlyReceivingAssistance: string;
  currentAssistanceProgram: string;
  currentAssistanceAmount: string;
  appliedOtherScholarship: string;
  otherScholarshipProgram: string;
  academicDistinctionExtracurricular: string;
  lbpAtmAccountNumber: string;
  father: FamilyMemberForm;
  mother: FamilyMemberForm;
  guardian: FamilyMemberForm;
}

const emptyFamilyMember: FamilyMemberForm = { name: '', occupation: '', monthlyIncome: '', educationalAttainment: '' };

const emptyForm: FormState = {
  firstName: '',
  lastName: '',
  middleName: '',
  suffix: '',
  dateOfBirth: '',
  age: '',
  sex: '',
  civilStatus: '',
  contactNumber: '',
  address: '',
  schoolName: '',
  courseName: '',
  yearLevel: '',
  municipality: 'Conner',
  barangay: '',
  householdMonthlyIncome: '',
  placeOfBirth: '',
  nationality: '',
  idType: '',
  idNumber: '',
  isIndigenousPeople: '',
  ipGroupTribe: '',
  province: 'Apayao',
  sectoralClassifications: [],
  sectoralClassificationOther: '',
  numberOfHouseholdMembers: '',
  numberOfDependentsStudying: '',
  parentalStatus: '',
  schoolAddress: '',
  schoolType: '',
  gwa: '',
  previousSchool: '',
  honorsAwards: '',
  academicStatus: '',
  currentlyReceivingAssistance: '',
  currentAssistanceProgram: '',
  currentAssistanceAmount: '',
  appliedOtherScholarship: '',
  otherScholarshipProgram: '',
  academicDistinctionExtracurricular: '',
  lbpAtmAccountNumber: '',
  father: { ...emptyFamilyMember },
  mother: { ...emptyFamilyMember },
  guardian: { ...emptyFamilyMember }
};

function toDateInputValue(value?: Date | string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function toYesNo(value?: boolean): string {
  if (value === true) return 'yes';
  if (value === false) return 'no';
  return '';
}

// Age is derived from Date of Birth rather than typed in directly, so the
// two values can never drift apart.
function calculateAge(dateOfBirth: string): string {
  if (!dateOfBirth) return '';
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age >= 0 ? String(age) : '';
}

function fromYesNo(value: string): boolean | undefined {
  if (value === 'yes') return true;
  if (value === 'no') return false;
  return undefined;
}

function toFamilyMemberForm(detail?: Applicant['father']): FamilyMemberForm {
  return {
    name: detail?.name ?? '',
    occupation: detail?.occupation ?? '',
    monthlyIncome: detail?.monthlyIncome !== undefined ? String(detail.monthlyIncome) : '',
    educationalAttainment: detail?.educationalAttainment ?? ''
  };
}

function applicantToForm(applicant: Applicant): FormState {
  return {
    firstName: applicant.firstName ?? '',
    lastName: applicant.lastName ?? '',
    middleName: applicant.middleName ?? '',
    suffix: applicant.suffix ?? '',
    dateOfBirth: toDateInputValue(applicant.dateOfBirth),
    age: calculateAge(toDateInputValue(applicant.dateOfBirth)) || (applicant.age !== undefined ? String(applicant.age) : ''),
    sex: applicant.sex ?? '',
    civilStatus: applicant.civilStatus ?? '',
    contactNumber: applicant.contactNumber ?? '',
    address: applicant.address ?? '',
    schoolName: applicant.schoolName ?? '',
    courseName: applicant.courseName ?? '',
    yearLevel: applicant.yearLevel ?? '',
    municipality: applicant.municipality || 'Conner',
    barangay: applicant.barangay ?? '',
    householdMonthlyIncome: applicant.householdMonthlyIncome !== undefined ? String(applicant.householdMonthlyIncome) : '',
    placeOfBirth: applicant.placeOfBirth ?? '',
    nationality: applicant.nationality ?? '',
    idType: applicant.idType ?? '',
    idNumber: applicant.idNumber ?? '',
    isIndigenousPeople: toYesNo(applicant.isIndigenousPeople),
    ipGroupTribe: applicant.ipGroupTribe ?? '',
    province: applicant.province || 'Apayao',
    sectoralClassifications: applicant.sectoralClassifications ?? [],
    sectoralClassificationOther: applicant.sectoralClassificationOther ?? '',
    numberOfHouseholdMembers: applicant.numberOfHouseholdMembers !== undefined ? String(applicant.numberOfHouseholdMembers) : '',
    numberOfDependentsStudying:
      applicant.numberOfDependentsStudying !== undefined ? String(applicant.numberOfDependentsStudying) : '',
    parentalStatus: applicant.parentalStatus ?? '',
    schoolAddress: applicant.schoolAddress ?? '',
    schoolType: applicant.schoolType ?? '',
    gwa: applicant.gwa !== undefined ? String(applicant.gwa) : '',
    previousSchool: applicant.previousSchool ?? '',
    honorsAwards: applicant.honorsAwards ?? '',
    academicStatus: applicant.academicStatus ?? '',
    currentlyReceivingAssistance: toYesNo(applicant.currentlyReceivingAssistance),
    currentAssistanceProgram: applicant.currentAssistanceProgram ?? '',
    currentAssistanceAmount: applicant.currentAssistanceAmount !== undefined ? String(applicant.currentAssistanceAmount) : '',
    appliedOtherScholarship: toYesNo(applicant.appliedOtherScholarship),
    otherScholarshipProgram: applicant.otherScholarshipProgram ?? '',
    academicDistinctionExtracurricular: applicant.academicDistinctionExtracurricular ?? '',
    lbpAtmAccountNumber: applicant.lbpAtmAccountNumber ?? '',
    father: toFamilyMemberForm(applicant.father),
    mother: toFamilyMemberForm(applicant.mother),
    guardian: toFamilyMemberForm(applicant.guardian)
  };
}

function formToRequest(form: FormState): UpdateApplicantProfileRequest {
  const num = (v: string) => (v === '' ? undefined : Number(v));
  const familyMember = (m: FamilyMemberForm) =>
    m.name || m.occupation || m.monthlyIncome || m.educationalAttainment
      ? {
          name: m.name || undefined,
          occupation: m.occupation || undefined,
          monthlyIncome: num(m.monthlyIncome),
          educationalAttainment: m.educationalAttainment || undefined
        }
      : undefined;

  return {
    firstName: form.firstName || undefined,
    lastName: form.lastName || undefined,
    middleName: form.middleName || undefined,
    suffix: form.suffix || undefined,
    dateOfBirth: form.dateOfBirth || undefined,
    age: num(form.age),
    sex: form.sex || undefined,
    civilStatus: form.civilStatus || undefined,
    contactNumber: form.contactNumber || undefined,
    address: form.address || undefined,
    schoolName: form.schoolName || undefined,
    courseName: form.courseName || undefined,
    yearLevel: form.yearLevel || undefined,
    municipality: form.municipality || undefined,
    barangay: form.barangay || undefined,
    householdMonthlyIncome: num(form.householdMonthlyIncome),
    placeOfBirth: form.placeOfBirth || undefined,
    nationality: form.nationality || undefined,
    idType: form.idType || undefined,
    idNumber: form.idNumber || undefined,
    isIndigenousPeople: fromYesNo(form.isIndigenousPeople),
    ipGroupTribe: form.ipGroupTribe || undefined,
    province: form.province || undefined,
    sectoralClassifications: form.sectoralClassifications,
    sectoralClassificationOther: form.sectoralClassificationOther || undefined,
    numberOfHouseholdMembers: num(form.numberOfHouseholdMembers),
    numberOfDependentsStudying: num(form.numberOfDependentsStudying),
    parentalStatus: form.parentalStatus || undefined,
    schoolAddress: form.schoolAddress || undefined,
    schoolType: form.schoolType || undefined,
    gwa: num(form.gwa),
    previousSchool: form.previousSchool || undefined,
    honorsAwards: form.honorsAwards || undefined,
    academicStatus: form.academicStatus || undefined,
    currentlyReceivingAssistance: fromYesNo(form.currentlyReceivingAssistance),
    currentAssistanceProgram: form.currentAssistanceProgram || undefined,
    currentAssistanceAmount: num(form.currentAssistanceAmount),
    appliedOtherScholarship: fromYesNo(form.appliedOtherScholarship),
    otherScholarshipProgram: form.otherScholarshipProgram || undefined,
    academicDistinctionExtracurricular: form.academicDistinctionExtracurricular || undefined,
    lbpAtmAccountNumber: form.lbpAtmAccountNumber || undefined,
    father: familyMember(form.father),
    mother: familyMember(form.mother),
    guardian: familyMember(form.guardian)
  };
}

const ProfilePage = () => {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [completeness, setCompleteness] = useState<ProfileCompleteness | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [downloadingForm, setDownloadingForm] = useState(false);

  const loadCompleteness = async () => {
    try {
      setCompleteness(await apiService.getProfileCompleteness());
    } catch {
      // Non-fatal — the banner just won't show if this fails.
    }
  };

  const loadAll = async () => {
    setError('');
    try {
      const [profile] = await Promise.all([apiService.getMyProfile(), loadCompleteness()]);
      setForm(applicantToForm(profile));
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const setFamilyField = (who: 'father' | 'mother' | 'guardian', field: keyof FamilyMemberForm, value: string) =>
    setForm((prev) => ({ ...prev, [who]: { ...prev[who], [field]: value } }));

  const toggleSectoral = (option: string) =>
    setForm((prev) => ({
      ...prev,
      sectoralClassifications: prev.sectoralClassifications.includes(option)
        ? prev.sectoralClassifications.filter((o) => o !== option)
        : [...prev.sectoralClassifications, option]
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await apiService.updateMyProfile(formToRequest(form));
      setForm(applicantToForm(updated));
      await loadCompleteness();
      setSuccess('Profile saved.');
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadApplicationForm = async () => {
    setDownloadingForm(true);
    setError('');
    try {
      const blob = await apiService.downloadApplicationFormPdf();
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (err: any) {
      setError(err.message || 'Failed to generate application form');
    } finally {
      setDownloadingForm(false);
    }
  };

  const isCollegeLevel = COLLEGE_YEAR_LEVELS.includes(form.yearLevel);

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-brand">My Profile</div>
      </nav>

      <div className="container">
        <div className="page-header">
          <h1>My Profile</h1>
          <p>Complete every section below — this is required before you can submit a scholarship application.</p>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            {completeness && !completeness.complete && (
              <div
                style={{
                  padding: '1rem',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.5rem',
                  color: '#92400E'
                }}
              >
                <strong>Your profile is incomplete.</strong> The following are still missing:
                <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
                  {[...completeness.missingFields, ...completeness.missingDocuments].map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {completeness && completeness.complete && (
              <div
                style={{
                  padding: '1rem',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.5rem',
                  color: '#065F46'
                }}
              >
                Your profile is complete. You're ready to submit applications.
              </div>
            )}

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

            {success && (
              <div
                style={{
                  padding: '1rem',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.5rem',
                  color: '#065F46'
                }}
              >
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                  <h3>I. Personal Information</h3>
                </div>
                <div className="form-group">
                  <label htmlFor="lastName">Last Name</label>
                  <input id="lastName" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} required autoFocus />
                </div>
                <div className="form-group">
                  <label htmlFor="firstName">First Name</label>
                  <input id="firstName" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label htmlFor="middleName">Middle Name</label>
                  <input id="middleName" value={form.middleName} onChange={(e) => set('middleName', e.target.value)} />
                </div>
                <div className="form-group">
                  <label htmlFor="suffix">Suffix</label>
                  <select id="suffix" value={form.suffix} onChange={(e) => set('suffix', e.target.value)}>
                    <option value="">Select...</option>
                    {SUFFIX_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="sex">Sex</label>
                  <select id="sex" value={form.sex} onChange={(e) => set('sex', e.target.value)}>
                    <option value="">Select...</option>
                    {SEX_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="civilStatus">Civil Status</label>
                  <select id="civilStatus" value={form.civilStatus} onChange={(e) => set('civilStatus', e.target.value)}>
                    <option value="">Select...</option>
                    {CIVIL_STATUS_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="dateOfBirth">Date of Birth</label>
                  <input
                    id="dateOfBirth"
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, dateOfBirth: e.target.value, age: calculateAge(e.target.value) }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="age">Age</label>
                  <input id="age" type="number" value={form.age} disabled />
                  <small style={{ color: '#6B7280' }}>Computed automatically from Date of Birth</small>
                </div>
                <div className="form-group">
                  <label htmlFor="placeOfBirth">Place of Birth</label>
                  <input id="placeOfBirth" value={form.placeOfBirth} onChange={(e) => set('placeOfBirth', e.target.value)} />
                </div>
                <div className="form-group">
                  <label htmlFor="nationality">Nationality</label>
                  <input id="nationality" value={form.nationality} onChange={(e) => set('nationality', e.target.value)} />
                </div>
                <div className="form-group">
                  <label htmlFor="idType">Type of ID</label>
                  <select id="idType" value={form.idType} onChange={(e) => set('idType', e.target.value)}>
                    <option value="">Select...</option>
                    {ID_TYPE_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
                <ValidIdUpload onChange={loadCompleteness} />
                <div className="form-group">
                  <label htmlFor="idNumber">Valid ID Number</label>
                  <input id="idNumber" value={form.idNumber} onChange={(e) => set('idNumber', e.target.value)} />
                </div>
              </div>

              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                  <h3>II. Indigenous Peoples (IP) Affiliation</h3>
                </div>
                <div className="form-group">
                  <label htmlFor="isIndigenousPeople">Are you a member of an Indigenous Peoples (IP) group?</label>
                  <select
                    id="isIndigenousPeople"
                    value={form.isIndigenousPeople}
                    onChange={(e) => set('isIndigenousPeople', e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                {form.isIndigenousPeople === 'yes' && (
                  <div className="form-group">
                    <label htmlFor="ipGroupTribe">IP Group/Tribe</label>
                    <input id="ipGroupTribe" value={form.ipGroupTribe} onChange={(e) => set('ipGroupTribe', e.target.value)} />
                  </div>
                )}
              </div>

              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                  <h3>III. Contact Details</h3>
                </div>
                <div className="form-group">
                  <label htmlFor="address">Home Address (Street/House No.)</label>
                  <input id="address" value={form.address} onChange={(e) => set('address', e.target.value)} />
                </div>
                <div className="form-group">
                  <label htmlFor="barangay">Barangay</label>
                  <input id="barangay" value={form.barangay} onChange={(e) => set('barangay', e.target.value)} />
                </div>
                <div className="form-group">
                  <label htmlFor="municipality">Municipality/City</label>
                  <input id="municipality" value={form.municipality} onChange={(e) => set('municipality', e.target.value)} />
                </div>
                <div className="form-group">
                  <label htmlFor="province">Province</label>
                  <input id="province" value={form.province} onChange={(e) => set('province', e.target.value)} />
                </div>
                <div className="form-group">
                  <label htmlFor="contactNumber">Phone No.</label>
                  <input id="contactNumber" value={form.contactNumber} onChange={(e) => set('contactNumber', e.target.value)} />
                </div>
              </div>

              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                  <h3>IV. Socio-economic / Sectoral Classification</h3>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: 0 }}>Check all applicable.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {SECTORAL_CLASSIFICATIONS.map((option) => (
                    <label key={option} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                      <input
                        type="checkbox"
                        checked={form.sectoralClassifications.includes(option)}
                        onChange={() => toggleSectoral(option)}
                      />
                      {option}
                    </label>
                  ))}
                </div>
                {form.sectoralClassifications.includes('Other') && (
                  <div className="form-group" style={{ marginTop: '0.75rem' }}>
                    <label htmlFor="sectoralOther">Other (please specify)</label>
                    <input
                      id="sectoralOther"
                      value={form.sectoralClassificationOther}
                      onChange={(e) => set('sectoralClassificationOther', e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                  <h3>V. Family Background</h3>
                </div>

                <h4 style={{ marginTop: 0 }}>Father</h4>
                <div className="form-group">
                  <label htmlFor="fatherName">Name</label>
                  <input id="fatherName" value={form.father.name} onChange={(e) => setFamilyField('father', 'name', e.target.value)} />
                  <small style={{ color: '#6B7280' }}>Format: First Name, Middle Initial, Last Name</small>
                </div>
                <div className="form-group">
                  <label htmlFor="fatherOccupation">Occupation</label>
                  <input
                    id="fatherOccupation"
                    value={form.father.occupation}
                    onChange={(e) => setFamilyField('father', 'occupation', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="fatherIncome">Monthly Income</label>
                  <input
                    id="fatherIncome"
                    type="number"
                    value={form.father.monthlyIncome}
                    onChange={(e) => setFamilyField('father', 'monthlyIncome', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="fatherEducation">Educational Attainment</label>
                  <input
                    id="fatherEducation"
                    value={form.father.educationalAttainment}
                    onChange={(e) => setFamilyField('father', 'educationalAttainment', e.target.value)}
                  />
                </div>

                <h4>Mother</h4>
                <div className="form-group">
                  <label htmlFor="motherName">Name</label>
                  <input id="motherName" value={form.mother.name} onChange={(e) => setFamilyField('mother', 'name', e.target.value)} />
                  <small style={{ color: '#6B7280' }}>Format: First Name, Middle Initial, Last Name</small>
                </div>
                <div className="form-group">
                  <label htmlFor="motherOccupation">Occupation</label>
                  <input
                    id="motherOccupation"
                    value={form.mother.occupation}
                    onChange={(e) => setFamilyField('mother', 'occupation', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="motherIncome">Monthly Income</label>
                  <input
                    id="motherIncome"
                    type="number"
                    value={form.mother.monthlyIncome}
                    onChange={(e) => setFamilyField('mother', 'monthlyIncome', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="motherEducation">Educational Attainment</label>
                  <input
                    id="motherEducation"
                    value={form.mother.educationalAttainment}
                    onChange={(e) => setFamilyField('mother', 'educationalAttainment', e.target.value)}
                  />
                </div>

                <h4>Guardian (if applicable)</h4>
                <div className="form-group">
                  <label htmlFor="guardianName">Name</label>
                  <input
                    id="guardianName"
                    value={form.guardian.name}
                    onChange={(e) => setFamilyField('guardian', 'name', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="guardianOccupation">Occupation</label>
                  <input
                    id="guardianOccupation"
                    value={form.guardian.occupation}
                    onChange={(e) => setFamilyField('guardian', 'occupation', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="guardianIncome">Monthly Income (optional)</label>
                  <input
                    id="guardianIncome"
                    type="number"
                    value={form.guardian.monthlyIncome}
                    onChange={(e) => setFamilyField('guardian', 'monthlyIncome', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="guardianEducation">Educational Attainment</label>
                  <input
                    id="guardianEducation"
                    value={form.guardian.educationalAttainment}
                    onChange={(e) => setFamilyField('guardian', 'educationalAttainment', e.target.value)}
                  />
                </div>

                <h4>Household</h4>
                <div className="form-group">
                  <label htmlFor="householdMonthlyIncome">Total Household Monthly Income</label>
                  <input
                    id="householdMonthlyIncome"
                    type="number"
                    value={form.householdMonthlyIncome}
                    onChange={(e) => set('householdMonthlyIncome', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="numberOfHouseholdMembers">Number of Household Members</label>
                  <input
                    id="numberOfHouseholdMembers"
                    type="number"
                    value={form.numberOfHouseholdMembers}
                    onChange={(e) => set('numberOfHouseholdMembers', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="numberOfDependentsStudying">Number of Dependents Studying</label>
                  <input
                    id="numberOfDependentsStudying"
                    type="number"
                    value={form.numberOfDependentsStudying}
                    onChange={(e) => set('numberOfDependentsStudying', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="parentalStatus">Parental Status</label>
                  <select id="parentalStatus" value={form.parentalStatus} onChange={(e) => set('parentalStatus', e.target.value)}>
                    <option value="">Select...</option>
                    {PARENTAL_STATUS_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                  <h3>VI. Educational Background</h3>
                </div>
                <div className="form-group">
                  <label htmlFor="schoolName">Current School</label>
                  <input id="schoolName" value={form.schoolName} onChange={(e) => set('schoolName', e.target.value)} />
                </div>
                <div className="form-group">
                  <label htmlFor="schoolAddress">School Address</label>
                  <input id="schoolAddress" value={form.schoolAddress} onChange={(e) => set('schoolAddress', e.target.value)} />
                </div>
                <div className="form-group">
                  <label htmlFor="schoolType">Type</label>
                  <select id="schoolType" value={form.schoolType} onChange={(e) => set('schoolType', e.target.value)}>
                    <option value="">Select...</option>
                    {SCHOOL_TYPE_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="yearLevel">Year Level</label>
                  <select id="yearLevel" value={form.yearLevel} onChange={(e) => set('yearLevel', e.target.value)}>
                    <option value="">Select...</option>
                    {YEAR_LEVEL_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
                {isCollegeLevel && (
                  <div className="form-group">
                    <label htmlFor="courseName">Course</label>
                    <input id="courseName" value={form.courseName} onChange={(e) => set('courseName', e.target.value)} />
                  </div>
                )}
                <div className="form-group">
                  <label htmlFor="gwa">General Weighted Average (GWA)</label>
                  <input id="gwa" type="number" step="0.01" value={form.gwa} onChange={(e) => set('gwa', e.target.value)} />
                </div>
                <div className="form-group">
                  <label htmlFor="previousSchool">Previous School</label>
                  <input id="previousSchool" value={form.previousSchool} onChange={(e) => set('previousSchool', e.target.value)} />
                </div>
                <div className="form-group">
                  <label htmlFor="honorsAwards">Honors/Awards Received (optional)</label>
                  <input id="honorsAwards" value={form.honorsAwards} onChange={(e) => set('honorsAwards', e.target.value)} />
                </div>
                <div className="form-group">
                  <label htmlFor="academicStatus">Academic Status</label>
                  <select id="academicStatus" value={form.academicStatus} onChange={(e) => set('academicStatus', e.target.value)}>
                    <option value="">Select...</option>
                    {ACADEMIC_STATUS_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                  <h3>VII. Other Educational Assistance / Scholarships</h3>
                </div>
                <div className="form-group">
                  <label htmlFor="currentlyReceivingAssistance">Currently receiving any scholarship/assistance?</label>
                  <select
                    id="currentlyReceivingAssistance"
                    value={form.currentlyReceivingAssistance}
                    onChange={(e) => set('currentlyReceivingAssistance', e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                {form.currentlyReceivingAssistance === 'yes' && (
                  <>
                    <div className="form-group">
                      <label htmlFor="currentAssistanceProgram">Program/Scholarship</label>
                      <input
                        id="currentAssistanceProgram"
                        value={form.currentAssistanceProgram}
                        onChange={(e) => set('currentAssistanceProgram', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="currentAssistanceAmount">Amount</label>
                      <input
                        id="currentAssistanceAmount"
                        type="number"
                        value={form.currentAssistanceAmount}
                        onChange={(e) => set('currentAssistanceAmount', e.target.value)}
                      />
                    </div>
                  </>
                )}
                <div className="form-group">
                  <label htmlFor="appliedOtherScholarship">Have you applied for other scholarships/financial assistance?</label>
                  <select
                    id="appliedOtherScholarship"
                    value={form.appliedOtherScholarship}
                    onChange={(e) => set('appliedOtherScholarship', e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                {form.appliedOtherScholarship === 'yes' && (
                  <div className="form-group">
                    <label htmlFor="otherScholarshipProgram">Program</label>
                    <input
                      id="otherScholarshipProgram"
                      value={form.otherScholarshipProgram}
                      onChange={(e) => set('otherScholarshipProgram', e.target.value)}
                    />
                  </div>
                )}
                <div className="form-group">
                  <label htmlFor="academicDistinctionExtracurricular">
                    Academic distinction &amp; extracurricular involvement (Sports, Academic and other co-curricular activities)
                  </label>
                  <textarea
                    id="academicDistinctionExtracurricular"
                    value={form.academicDistinctionExtracurricular}
                    onChange={(e) => set('academicDistinctionExtracurricular', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                  <h3>VIII. Documentary Requirements</h3>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    marginBottom: '1rem',
                    background: 'rgba(139, 92, 246, 0.05)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#6B7280' }}>
                    Don't have the official CEAP application form? Generate one pre-filled with your profile
                    information, then print and sign it before uploading it below as your "Application Form".
                  </p>
                  <button type="button" className="btn btn-outline btn-sm" disabled={downloadingForm} onClick={handleDownloadApplicationForm}>
                    {downloadingForm ? 'Generating...' : 'Download Application Form (PDF)'}
                  </button>
                </div>
                <ProfileDocuments onChange={loadCompleteness} />
              </div>

              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                  <h3>IX. ATM Card</h3>
                </div>
                <div className="form-group">
                  <label htmlFor="lbpAtmAccountNumber">LBP ATM Account Number</label>
                  <input
                    id="lbpAtmAccountNumber"
                    value={form.lbpAtmAccountNumber}
                    onChange={(e) => set('lbpAtmAccountNumber', e.target.value)}
                  />
                </div>
                <p style={{ fontSize: '0.85rem', color: '#6B7280' }}>
                  Upload the LBP ATM Card photocopy under "LBP ATM Card Photocopy" in section VIII above.
                </p>
              </div>

              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
