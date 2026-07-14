import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Role {
  roleId: number;
  roleName: string;
}

export interface InternshipType {
  internshipTypeId: number;
  typeName: string;
  durationInMonths?: number;
}

export interface Intern {
  internId: number;
  fullName: string;
  workEmail: string;
  joiningDate: string;
  roleId: number;
  internshipTypeId: number;
  role?: Role;
  internshipType?: InternshipType;
}

export interface AuthResponse {
  token?: string;
  fullName?: string;
  email?: string;
  role?: string;
}

export interface AuthUser {
  name: string;
  email: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class InternService {
  private readonly defaultApiUrl = 'https://localhost:7047/api';
  
  // Settings signal
  apiUrl = signal<string>(this.getInitialApiUrl());
  authToken = signal<string | null>(this.getInitialAuthToken());

  private getInitialApiUrl(): string {
    const stored = localStorage.getItem('hatch_api_url');
    // If stored URL is the old localhost:5002, clear it and use new default
    if (stored && stored.includes('5002')) {
      localStorage.removeItem('hatch_api_url');
      return this.defaultApiUrl;
    }
    return stored || this.defaultApiUrl;
  }

  private getInitialAuthToken(): string | null {
    return localStorage.getItem('hatch_auth_token');
  }

  // Master lists cache
  rolesList = signal<Role[]>([]);
  typesList = signal<InternshipType[]>([]);

  constructor(private http: HttpClient) {
    // Cache the master roles and types
    this.getRoles().subscribe({
      next: roles => this.rolesList.set(roles),
      error: err => console.error('Failed to pre-fetch roles:', err)
    });
    this.getInternshipTypes().subscribe({
      next: types => this.typesList.set(types),
      error: err => console.error('Failed to pre-fetch internship types:', err)
    });
  }

  setApiUrl(url: string) {
    this.apiUrl.set(url);
    localStorage.setItem('hatch_api_url', url);
    // Refresh the master lists when the API URL changes
    this.getRoles().subscribe({
      next: roles => this.rolesList.set(roles),
      error: err => console.error('Failed to update roles after API URL change:', err)
    });
    this.getInternshipTypes().subscribe({
      next: types => this.typesList.set(types),
      error: err => console.error('Failed to update internship types after API URL change:', err)
    });
  }

  setAuthToken(token: string | null) {
    this.authToken.set(token);
    if (token) {
      localStorage.setItem('hatch_auth_token', token);
    } else {
      localStorage.removeItem('hatch_auth_token');
    }
  }

  private refreshMasterLists() {
    this.getRoles().subscribe({
      next: roles => this.rolesList.set(roles),
      error: err => console.error('Failed to refresh roles:', err)
    });
    this.getInternshipTypes().subscribe({
      next: types => this.typesList.set(types),
      error: err => console.error('Failed to refresh internship types:', err)
    });
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authToken();
    const headersConfig: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headersConfig['Authorization'] = `Bearer ${token}`;
    }
    return new HttpHeaders(headersConfig);
  }

  signup(fullName: string, email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl()}/Auth/signup`, { fullName, email, password }, { headers: this.getAuthHeaders() });
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl()}/Auth/login`, { email, password }, { headers: this.getAuthHeaders() });
  }

  me(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${this.apiUrl()}/Auth/me`, { headers: this.getAuthHeaders() });
  }

  createRole(role: Omit<Role, 'roleId'>): Observable<Role> {
    return this.http.post<Role>(`${this.apiUrl()}/Roles`, role, { headers: this.getAuthHeaders() }).pipe(
      map(createdRole => {
        this.rolesList.set([...this.rolesList(), createdRole]);
        return createdRole;
      })
    );
  }

  updateRole(id: number, role: Role): Observable<Role> {
    return this.http.put<Role>(`${this.apiUrl()}/Roles/${id}`, role, { headers: this.getAuthHeaders() }).pipe(
      map(updatedRole => {
        this.rolesList.set(this.rolesList().map(current => current.roleId === id ? updatedRole : current));
        return updatedRole;
      })
    );
  }

  deleteRole(id: number): Observable<boolean> {
    return this.http.delete(`${this.apiUrl()}/Roles/${id}`, { headers: this.getAuthHeaders() }).pipe(
      map(() => {
        this.rolesList.set(this.rolesList().filter(role => role.roleId !== id));
        return true;
      })
    );
  }

  // Get Roles
  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.apiUrl()}/Roles`, { headers: this.getAuthHeaders() });
  }

  createInternshipType(type: Omit<InternshipType, 'internshipTypeId'>): Observable<InternshipType> {
    return this.http.post<InternshipType>(`${this.apiUrl()}/InternshipTypes`, type, { headers: this.getAuthHeaders() }).pipe(
      map(createdType => {
        this.typesList.set([...this.typesList(), createdType]);
        return createdType;
      })
    );
  }

  updateInternshipType(id: number, type: InternshipType): Observable<InternshipType> {
    return this.http.put<InternshipType>(`${this.apiUrl()}/InternshipTypes/${id}`, type, { headers: this.getAuthHeaders() }).pipe(
      map(updatedType => {
        this.typesList.set(this.typesList().map(current => current.internshipTypeId === id ? updatedType : current));
        return updatedType;
      })
    );
  }

  deleteInternshipType(id: number): Observable<boolean> {
    return this.http.delete(`${this.apiUrl()}/InternshipTypes/${id}`, { headers: this.getAuthHeaders() }).pipe(
      map(() => {
        this.typesList.set(this.typesList().filter(type => type.internshipTypeId !== id));
        return true;
      })
    );
  }

  // Get Internship Types
  getInternshipTypes(): Observable<InternshipType[]> {
    return this.http.get<InternshipType[]>(`${this.apiUrl()}/InternshipTypes`, { headers: this.getAuthHeaders() });
  }

  // Helper to map navigation properties for interns
  private populateNavigationProperties(intern: Intern): Intern {
    const roles = this.rolesList();
    const types = this.typesList();
    
    return {
      ...intern,
      role: roles.find(r => r.roleId === intern.roleId) || intern.role,
      internshipType: types.find(t => t.internshipTypeId === intern.internshipTypeId) || intern.internshipType
    };
  }

  // Get Interns
  getInterns(): Observable<Intern[]> {
    return this.http.get<Intern[]>(`${this.apiUrl()}/Interns`, { headers: this.getAuthHeaders() }).pipe(
      map(list => list.map(i => this.populateNavigationProperties(i)))
    );
  }

  // Get Single Intern by ID
  getIntern(id: number): Observable<Intern> {
    return this.http.get<Intern>(`${this.apiUrl()}/Interns/${id}`, { headers: this.getAuthHeaders() }).pipe(
      map(i => this.populateNavigationProperties(i))
    );
  }

  // Create Intern
  createIntern(intern: Omit<Intern, 'internId'>): Observable<Intern> {
    return this.http.post<Intern>(`${this.apiUrl()}/Interns`, intern, { headers: this.getAuthHeaders() }).pipe(
      map(i => this.populateNavigationProperties(i))
    );
  }

  // Update Intern
  updateIntern(id: number, intern: Intern): Observable<Intern> {
    return this.http.put<Intern>(`${this.apiUrl()}/Interns/${id}`, intern, { headers: this.getAuthHeaders() }).pipe(
      map(i => i ? this.populateNavigationProperties(i) : this.populateNavigationProperties(intern))
    );
  }

  // Delete Intern
  deleteIntern(id: number): Observable<boolean> {
    return this.http.delete(`${this.apiUrl()}/Interns/${id}`, { headers: this.getAuthHeaders() }).pipe(
      map(() => true)
    );
  }
}
