import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

@Injectable({
  providedIn: 'root'
})
export class InternService {
  private readonly defaultApiUrl = 'http://localhost:7047/api';
  
  // Settings signal
  apiUrl = signal<string>(this.getInitialApiUrl());

  private getInitialApiUrl(): string {
    const stored = localStorage.getItem('hatch_api_url');
    // If stored URL is the old localhost:5002, clear it and use new default
    if (stored && stored.includes('5002')) {
      localStorage.removeItem('hatch_api_url');
      return this.defaultApiUrl;
    }
    return stored || this.defaultApiUrl;
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

  // Get Roles
  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.apiUrl()}/Roles`);
  }

  // Get Internship Types
  getInternshipTypes(): Observable<InternshipType[]> {
    return this.http.get<InternshipType[]>(`${this.apiUrl()}/InternshipTypes`);
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
    return this.http.get<Intern[]>(`${this.apiUrl()}/Interns`).pipe(
      map(list => list.map(i => this.populateNavigationProperties(i)))
    );
  }

  // Get Single Intern by ID
  getIntern(id: number): Observable<Intern> {
    return this.http.get<Intern>(`${this.apiUrl()}/Interns/${id}`).pipe(
      map(i => this.populateNavigationProperties(i))
    );
  }

  // Create Intern
  createIntern(intern: Omit<Intern, 'internId'>): Observable<Intern> {
    return this.http.post<Intern>(`${this.apiUrl()}/Interns`, intern).pipe(
      map(i => this.populateNavigationProperties(i))
    );
  }

  // Update Intern
  updateIntern(id: number, intern: Intern): Observable<Intern> {
    return this.http.put<Intern>(`${this.apiUrl()}/Interns/${id}`, intern).pipe(
      map(i => i ? this.populateNavigationProperties(i) : this.populateNavigationProperties(intern))
    );
  }

  // Delete Intern
  deleteIntern(id: number): Observable<boolean> {
    return this.http.delete(`${this.apiUrl()}/Interns/${id}`).pipe(
      map(() => true)
    );
  }
}
