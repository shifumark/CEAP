import { Applicant } from '../types';

function formatDate(value?: string | Date) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatMoney(value?: number) {
  if (value === undefined || value === null) return '—';
  return `₱${value.toLocaleString()}`;
}

function yesNo(value?: boolean) {
  if (value === undefined || value === null) return '—';
  return value ? 'Yes' : 'No';
}

const Field = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div style={{ minWidth: '180px', flex: '1 1 220px' }}>
    <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{label}</div>
    <div style={{ fontSize: '0.9rem' }}>{value === undefined || value === null || value === '' ? '—' : value}</div>
  </div>
);

const ProfileSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: '1rem' }}>
    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4B5563', marginBottom: '0.4rem' }}>{title}</div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>{children}</div>
  </div>
);

interface Props {
  profile: Applicant | null;
  loading: boolean;
  email?: string;
}

/**
 * Read-only display of a student's full profile (Sections I-IX minus
 * documents) — shared by ApplicationReviewPage (reviewing an
 * application) and ScholarDetailPage (managing an approved scholar).
 */
const ApplicantProfileView = ({ profile, loading, email }: Props) => {
  if (loading) {
    return <p style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: '0.5rem' }}>Loading...</p>;
  }
  if (!profile) {
    return <p style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: '0.5rem' }}>Profile not available.</p>;
  }

  return (
    <div style={{ marginTop: '0.6rem' }}>
      <ProfileSection title="Personal Information">
        <Field label="Last Name" value={profile.lastName} />
        <Field label="First Name" value={profile.firstName} />
        <Field label="Middle Name" value={profile.middleName} />
        <Field label="Suffix" value={profile.suffix} />
        <Field label="Sex" value={profile.sex} />
        <Field label="Civil Status" value={profile.civilStatus} />
        <Field label="Date of Birth" value={formatDate(profile.dateOfBirth)} />
        <Field label="Age" value={profile.age} />
        <Field label="Place of Birth" value={profile.placeOfBirth} />
        <Field label="Nationality" value={profile.nationality} />
        <Field label="Type of ID" value={profile.idType} />
        <Field label="ID Number" value={profile.idNumber} />
      </ProfileSection>

      <ProfileSection title="IP Affiliation">
        <Field label="Indigenous Peoples member?" value={yesNo(profile.isIndigenousPeople)} />
        {profile.isIndigenousPeople && <Field label="IP Group/Tribe" value={profile.ipGroupTribe} />}
      </ProfileSection>

      <ProfileSection title="Contact Details">
        <Field label="Address" value={profile.address} />
        <Field label="Barangay" value={profile.barangay} />
        <Field label="Municipality/City" value={profile.municipality} />
        <Field label="Province" value={profile.province} />
        <Field label="Zip Code" value={profile.zipCode} />
        <Field label="Phone Number" value={profile.contactNumber} />
        <Field label="Email" value={email} />
      </ProfileSection>

      <ProfileSection title="Socio-economic Classification">
        <Field
          label="Classifications"
          value={profile.sectoralClassifications?.length ? profile.sectoralClassifications.join(', ') : undefined}
        />
        {profile.sectoralClassificationOther && <Field label="Other" value={profile.sectoralClassificationOther} />}
      </ProfileSection>

      <ProfileSection title="Family Background">
        <Field label="Father's Name" value={profile.father?.name} />
        <Field label="Father's Occupation" value={profile.father?.occupation} />
        <Field label="Father's Monthly Income" value={formatMoney(profile.father?.monthlyIncome)} />
        <Field label="Father's Education" value={profile.father?.educationalAttainment} />
        <Field label="Mother's Name" value={profile.mother?.name} />
        <Field label="Mother's Occupation" value={profile.mother?.occupation} />
        <Field label="Mother's Monthly Income" value={formatMoney(profile.mother?.monthlyIncome)} />
        <Field label="Mother's Education" value={profile.mother?.educationalAttainment} />
        {profile.guardian?.name && (
          <>
            <Field label="Guardian's Name" value={profile.guardian?.name} />
            <Field label="Guardian's Occupation" value={profile.guardian?.occupation} />
            <Field label="Guardian's Monthly Income" value={formatMoney(profile.guardian?.monthlyIncome)} />
            <Field label="Guardian's Education" value={profile.guardian?.educationalAttainment} />
          </>
        )}
        <Field label="Total Household Monthly Income" value={formatMoney(profile.householdMonthlyIncome)} />
        <Field label="Household Members" value={profile.numberOfHouseholdMembers} />
        <Field label="Dependents Studying" value={profile.numberOfDependentsStudying} />
        <Field label="Parental Status" value={profile.parentalStatus} />
      </ProfileSection>

      <ProfileSection title="Educational Background">
        <Field label="Current School" value={profile.schoolName} />
        <Field label="School Address" value={profile.schoolAddress} />
        <Field label="School Type" value={profile.schoolType} />
        <Field label="Year Level" value={profile.yearLevel} />
        <Field label="Course" value={profile.courseName} />
        <Field label="GWA" value={profile.gwa} />
        <Field label="Previous School" value={profile.previousSchool} />
        <Field label="Honors/Awards" value={profile.honorsAwards} />
        <Field label="Academic Status" value={profile.academicStatus} />
      </ProfileSection>

      <ProfileSection title="Other Educational Assistance">
        <Field label="Currently receiving assistance?" value={yesNo(profile.currentlyReceivingAssistance)} />
        {profile.currentlyReceivingAssistance && (
          <>
            <Field label="Program" value={profile.currentAssistanceProgram} />
            <Field label="Amount" value={formatMoney(profile.currentAssistanceAmount)} />
          </>
        )}
        <Field label="Applied for other scholarships?" value={yesNo(profile.appliedOtherScholarship)} />
        {profile.appliedOtherScholarship && <Field label="Program Applied To" value={profile.otherScholarshipProgram} />}
        <Field label="Academic Distinction & Extracurricular" value={profile.academicDistinctionExtracurricular} />
      </ProfileSection>

      <ProfileSection title="ATM Card">
        <Field label="LBP ATM Account Number" value={profile.lbpAtmAccountNumber} />
      </ProfileSection>
    </div>
  );
};

export default ApplicantProfileView;
