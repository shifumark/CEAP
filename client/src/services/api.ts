import {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  User,
  Application,
  ApplicationStatusHistory,
  ApplicationFilters,
  PaginatedResponse,
  ScholarshipProgram,
  UploadedDocument,
  RequiredDocument,
  DocumentVerificationStatus,
  Scholar,
  ScholarFilters,
  Grade,
  Renewal,
  Allowance,
  Violation,
  Announcement,
  AnnouncementFilters,
  CreateAnnouncementRequest,
  Notification,
  Applicant,
  UpdateApplicantProfileRequest,
  ProfileCompleteness,
  CreateScholarshipProgramRequest,
  UpdateScholarshipProgramRequest,
  DashboardStats
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

/**
 * API Service
 * Centralized service for all API requests
 */
class ApiService {
  private token: string | null = localStorage.getItem('token');

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  getToken(): string | null {
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: any
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      method,
      headers
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

      if (response.status === 401) {
        // Token expired, clear and redirect to login. A hard navigation
        // here (this file has no access to React Router's basename) must
        // still respect Vite's configured base path — a bare '/login'
        // would 404 on GitHub Pages' /CEAP/ subpath.
        this.clearToken();
        window.location.href = `${import.meta.env.BASE_URL}login`;
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'API request failed');
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error (${method} ${endpoint}):`, error);
      throw error;
    }
  }

  // ============== AUTHENTICATION ==============

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('POST', '/auth/login', {
      email,
      password
    });

    if (response.token) {
      this.setToken(response.token);
    }

    return response;
  }

  async register(firstName: string, lastName: string, email: string, password: string): Promise<User> {
    return this.request<User>('POST', '/auth/register', {
      firstName,
      lastName,
      email,
      password
    });
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('GET', '/auth/me');
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('POST', '/auth/forgot-password', {
      email
    });
  }

  // ============== APPLICANT PROFILE ==============

  async getMyProfile(): Promise<Applicant> {
    return this.request('GET', '/applicants/me');
  }

  async updateMyProfile(data: UpdateApplicantProfileRequest): Promise<Applicant> {
    return this.request('PUT', '/applicants/me', data);
  }

  async getProfileCompleteness(): Promise<ProfileCompleteness> {
    return this.request('GET', '/applicants/me/completeness');
  }

  // ============== SCHOLARSHIPS ==============

  async getScholarships(page = 1, pageSize = 10): Promise<PaginatedResponse<ScholarshipProgram>> {
    return this.request('GET', `/scholarships?page=${page}&pageSize=${pageSize}`);
  }

  async getScholarship(id: number): Promise<ScholarshipProgram> {
    return this.request('GET', `/scholarships/${id}`);
  }

  async getRequiredDocuments(scholarshipId: number): Promise<RequiredDocument[]> {
    return this.request('GET', `/scholarships/${scholarshipId}/required-documents`);
  }

  async createScholarship(data: CreateScholarshipProgramRequest): Promise<ScholarshipProgram> {
    return this.request('POST', '/scholarships', data);
  }

  async updateScholarship(id: number, data: UpdateScholarshipProgramRequest): Promise<ScholarshipProgram> {
    return this.request('PUT', `/scholarships/${id}`, data);
  }

  async deleteScholarship(id: number) {
    return this.request('DELETE', `/scholarships/${id}`);
  }

  // ============== APPLICATIONS ==============

  async getApplications(filters?: Partial<ApplicationFilters>): Promise<PaginatedResponse<Application>> {
    const query = new URLSearchParams(filters as Record<string, string> | undefined).toString();
    return this.request('GET', `/applications?${query}`);
  }

  async getApplication(id: number): Promise<Application> {
    return this.request('GET', `/applications/${id}`);
  }

  async getApplicationHistory(id: number): Promise<ApplicationStatusHistory[]> {
    return this.request('GET', `/applications/${id}/history`);
  }

  async createApplication(scholarshipId: number): Promise<Application> {
    return this.request('POST', '/applications', {
      scholarshipId
    });
  }

  async submitApplication(applicationId: number): Promise<Application> {
    return this.request('POST', `/applications/${applicationId}/submit`, {});
  }

  async updateApplication(id: number, data: { status?: string; comments?: string }): Promise<Application> {
    return this.request('PUT', `/applications/${id}`, data);
  }

  async deleteApplication(id: number): Promise<{ message: string }> {
    return this.request('DELETE', `/applications/${id}`);
  }

  // ============== DOCUMENTS ==============

  async getApplicationDocuments(applicationId: number): Promise<UploadedDocument[]> {
    return this.request('GET', `/applications/${applicationId}/documents`);
  }

  async getMyProfileDocuments(): Promise<UploadedDocument[]> {
    return this.request('GET', '/documents/me');
  }

  async uploadDocument(documentType: string, file: File, applicationId?: number): Promise<UploadedDocument> {
    const formData = new FormData();
    if (applicationId !== undefined) {
      formData.append('applicationId', applicationId.toString());
    }
    formData.append('documentType', documentType);
    formData.append('file', file);

    const headers: HeadersInit = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      headers,
      body: formData
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Failed to upload document');
    }

    return response.json();
  }

  async deleteDocument(documentId: number): Promise<{ message: string }> {
    return this.request('DELETE', `/documents/${documentId}`);
  }

  async downloadDocument(documentId: number): Promise<{ blob: Blob; fileName: string }> {
    const headers: HeadersInit = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/download`, { headers });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Failed to download document');
    }

    const disposition = response.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    const fileName = match ? decodeURIComponent(match[1]) : `document-${documentId}`;

    return { blob: await response.blob(), fileName };
  }

  async verifyDocument(
    documentId: number,
    status: DocumentVerificationStatus,
    notes?: string
  ): Promise<UploadedDocument> {
    return this.request('PUT', `/documents/${documentId}/verify`, { status, notes });
  }

  // ============== SCHOLARS ==============

  async getMyScholarRecord(): Promise<Scholar | null> {
    try {
      return await this.request<Scholar>('GET', '/scholars/me');
    } catch {
      return null;
    }
  }

  async getScholars(filters?: Partial<ScholarFilters>): Promise<PaginatedResponse<Scholar>> {
    const query = new URLSearchParams(filters as Record<string, string> | undefined).toString();
    return this.request('GET', `/scholars?${query}`);
  }

  async getScholar(id: number): Promise<Scholar> {
    return this.request('GET', `/scholars/${id}`);
  }

  async getGrades(scholarId: number): Promise<Grade[]> {
    return this.request('GET', `/scholars/${scholarId}/grades`);
  }

  async submitGrade(
    scholarId: number,
    data: { academicYear: string; semester: string; gpa: number }
  ): Promise<Grade> {
    return this.request('POST', `/scholars/${scholarId}/grades`, data);
  }

  async getRenewals(scholarId: number): Promise<Renewal[]> {
    return this.request('GET', `/scholars/${scholarId}/renewals`);
  }

  async requestRenewal(scholarId: number, data: { academicYear: string; semester: string }): Promise<Renewal> {
    return this.request('POST', `/scholars/${scholarId}/renewals`, data);
  }

  async reviewRenewal(renewalId: number, decision: 'approved' | 'rejected', notes?: string): Promise<Renewal> {
    return this.request('PUT', `/renewals/${renewalId}`, { decision, notes });
  }

  async getAllowances(scholarId: number): Promise<Allowance[]> {
    return this.request('GET', `/scholars/${scholarId}/allowances`);
  }

  async createAllowance(
    scholarId: number,
    data: { academicYear: string; semester: string; amount: number; paymentDate?: string }
  ): Promise<Allowance> {
    return this.request('POST', `/scholars/${scholarId}/allowances`, data);
  }

  async releaseAllowance(allowanceId: number): Promise<Allowance> {
    return this.request('POST', `/allowances/${allowanceId}/release`, {});
  }

  async getViolations(scholarId: number): Promise<Violation[]> {
    return this.request('GET', `/scholars/${scholarId}/violations`);
  }

  async createViolation(
    scholarId: number,
    data: { violationType: string; description: string; severity: string; actionTaken: string }
  ): Promise<Violation> {
    return this.request('POST', `/scholars/${scholarId}/violations`, data);
  }

  // ============== DASHBOARD ==============

  async getDashboardStats(): Promise<DashboardStats> {
    return this.request('GET', '/dashboard/stats');
  }

  // ============== USERS ==============

  async getUsers() {
    return this.request('GET', '/users');
  }

  async getUser(id: number) {
    return this.request('GET', `/users/${id}`);
  }

  async createUser(data: any) {
    return this.request('POST', '/users', data);
  }

  // ============== ANNOUNCEMENTS ==============

  async getAnnouncements(filters?: Partial<AnnouncementFilters>): Promise<PaginatedResponse<Announcement>> {
    const query = new URLSearchParams(filters as Record<string, string> | undefined).toString();
    return this.request('GET', `/announcements?${query}`);
  }

  async getAnnouncement(id: number): Promise<Announcement> {
    return this.request('GET', `/announcements/${id}`);
  }

  async createAnnouncement(data: CreateAnnouncementRequest): Promise<Announcement> {
    return this.request('POST', '/announcements', data);
  }

  async updateAnnouncement(id: number, data: Partial<CreateAnnouncementRequest>): Promise<Announcement> {
    return this.request('PUT', `/announcements/${id}`, data);
  }

  async deleteAnnouncement(id: number): Promise<{ message: string }> {
    return this.request('DELETE', `/announcements/${id}`);
  }

  // ============== NOTIFICATIONS ==============

  async getNotifications(): Promise<Notification[]> {
    return this.request('GET', '/notifications');
  }

  async markNotificationAsRead(id: number): Promise<Notification> {
    return this.request('POST', `/notifications/${id}/read`, {});
  }

  async markAllNotificationsAsRead(): Promise<{ updated: number }> {
    return this.request('POST', '/notifications/read-all', {});
  }

  // ============== HEALTH ==============

  async health(): Promise<{ status: string }> {
    return this.request('GET', '/health');
  }
}

export const apiService = new ApiService();
