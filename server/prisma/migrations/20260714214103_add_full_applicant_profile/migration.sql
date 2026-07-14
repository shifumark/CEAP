-- AlterTable
ALTER TABLE "applicants" ADD COLUMN     "academic_distinction_extracurricular" TEXT,
ADD COLUMN     "academic_status" TEXT,
ADD COLUMN     "applied_other_scholarship" BOOLEAN,
ADD COLUMN     "current_assistance_amount" DECIMAL(12,2),
ADD COLUMN     "current_assistance_program" TEXT,
ADD COLUMN     "currently_receiving_assistance" BOOLEAN,
ADD COLUMN     "gwa" DECIMAL(5,2),
ADD COLUMN     "honors_awards" TEXT,
ADD COLUMN     "id_number" TEXT,
ADD COLUMN     "id_type" TEXT,
ADD COLUMN     "ip_group_tribe" TEXT,
ADD COLUMN     "is_indigenous_people" BOOLEAN,
ADD COLUMN     "lbp_atm_account_number" TEXT,
ADD COLUMN     "nationality" TEXT,
ADD COLUMN     "number_of_dependents_studying" INTEGER,
ADD COLUMN     "number_of_household_members" INTEGER,
ADD COLUMN     "other_scholarship_program" TEXT,
ADD COLUMN     "parental_status" TEXT,
ADD COLUMN     "place_of_birth" TEXT,
ADD COLUMN     "previous_school" TEXT,
ADD COLUMN     "province" TEXT,
ADD COLUMN     "school_address" TEXT,
ADD COLUMN     "school_type" TEXT,
ADD COLUMN     "sectoral_classification_other" TEXT,
ADD COLUMN     "sectoral_classifications" TEXT[];

-- AlterTable
ALTER TABLE "family_members" ADD COLUMN     "educational_attainment" TEXT,
ADD COLUMN     "monthly_income" DECIMAL(12,2);

-- CreateIndex
CREATE UNIQUE INDEX "family_members_applicant_id_member_type_key" ON "family_members"("applicant_id", "member_type");