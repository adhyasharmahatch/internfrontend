import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from './header/header.component';
import { AuthUser, InternService, Intern, Role, InternshipType } from './services/intern.service';

interface AuthMode { value: 'signin' | 'signup'; label: string; subtitle: string; }

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  public readonly internService = inject(InternService);

  // Authentication state
  isAuthenticated = signal(false);
  authMode = signal<AuthMode>({ value: 'signin', label: 'Sign in', subtitle: 'Sign in to continue' });
  authEmail = '';
  authPassword = '';
  authName = '';
  authError = signal<string | null>(null);
  authSuccess = signal<string | null>(null);
  currentUser = signal<{ name: string; email: string; role: string } | null>(null);

  // State Signals
  activeTab = signal<'dashboard' | 'interns' | 'onboard' | 'roles' | 'types' | 'config'>('dashboard');
  interns = signal<Intern[]>([]);
  
  // Search & Filter Signals
  searchQuery = signal<string>('');
  filterRoleId = signal<number | null>(null);
  filterTypeId = signal<number | null>(null);

  // Form Signals/State
  editingInternId = signal<number | null>(null);
  formFullName = '';
  formWorkEmail = '';
  formJoiningDate = '';
  formRoleId: number | null = null;
  formTypeId: number | null = null;
  editingRoleId = signal<number | null>(null);
  roleNameInput = '';
  editingTypeId = signal<number | null>(null);
  internshipTypeNameInput = '';
  internshipTypeDurationInput: number | string = '';


  // UI Toast Notification
  toastMessage = signal<string | null>(null);
  toastType = signal<'success' | 'error' | 'info'>('info');
  private toastTimeout: any;

  // Derived signals
  roles = computed<Role[]>(() => this.internService.rolesList());
  internshipTypes = computed<InternshipType[]>(() => this.internService.typesList());

  filteredInterns = computed<Intern[]>(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const roleId = this.filterRoleId();
    const typeId = this.filterTypeId();

    return this.interns().filter(intern => {
      const matchesSearch = !query || 
        intern.fullName.toLowerCase().includes(query) || 
        intern.workEmail.toLowerCase().includes(query) ||
        (intern.role?.roleName && intern.role.roleName.toLowerCase().includes(query)) ||
        (intern.internshipType?.typeName && intern.internshipType.typeName.toLowerCase().includes(query));

      const matchesRole = roleId === null || intern.roleId === roleId;
      const matchesType = typeId === null || intern.internshipTypeId === typeId;

      return matchesSearch && matchesRole && matchesType;
    });
  });

  // Dashboard Stats
  totalInterns = computed(() => this.interns().length);
  
  fullTimeCount = computed(() => 
    this.interns().filter(i => i.internshipType?.typeName?.toLowerCase().includes('full') || i.internshipTypeId === 1).length
  );
  
  remoteCount = computed(() => 
    this.interns().filter(i => i.internshipType?.typeName?.toLowerCase().includes('remote') || i.internshipTypeId === 3).length
  );

  roleDistribution = computed(() => {
    const counts: { [key: string]: number } = {};
    const rolesMap = new Map(this.roles().map(r => [r.roleId, r.roleName]));
    
    this.interns().forEach(i => {
      const name = rolesMap.get(i.roleId) || 'Unassigned Role';
      counts[name] = (counts[name] || 0) + 1;
    });

    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
      percentage: this.totalInterns() > 0 ? Math.round((count / this.totalInterns()) * 100) : 0
    })).sort((a, b) => b.count - a.count);
  });

  typeDistribution = computed(() => {
    const counts: { [key: string]: number } = {};
    const typesMap = new Map(this.internshipTypes().map(t => [t.internshipTypeId, t.typeName]));
    
    this.interns().forEach(i => {
      const name = typesMap.get(i.internshipTypeId) || 'Unassigned Type';
      counts[name] = (counts[name] || 0) + 1;
    });

    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
      percentage: this.totalInterns() > 0 ? Math.round((count / this.totalInterns()) * 100) : 0
    })).sort((a, b) => b.count - a.count);
  });

  recentJoiners = computed(() => {
    return [...this.interns()]
      .sort((a, b) => new Date(b.joiningDate).getTime() - new Date(a.joiningDate).getTime())
      .slice(0, 4);
  });

  ngOnInit() {
    const savedUser = localStorage.getItem('hatch_current_user');
    const token = this.internService.authToken();

    if (token && savedUser) {
      const parsed = JSON.parse(savedUser);
      this.currentUser.set(parsed);
      this.isAuthenticated.set(true);
      this.loadData();
    } else if (token) {
      this.internService.me().subscribe({
        next: (user) => {
          this.currentUser.set(user);
          this.isAuthenticated.set(true);
          localStorage.setItem('hatch_current_user', JSON.stringify(user));
          this.loadData();
        },
        error: () => {
          this.internService.setAuthToken(null);
          localStorage.removeItem('hatch_current_user');
          this.isAuthenticated.set(false);
          this.currentUser.set(null);
        }
      });
    }
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastMessage.set(message);
    this.toastType.set(type);
    this.toastTimeout = setTimeout(() => {
      this.toastMessage.set(null);
    }, 4000);
  }

  loadData() {
    if (!this.isAuthenticated()) {
      return;
    }

    this.internService.getInterns().subscribe({
      next: (data) => {
        this.interns.set(data);
      },
      error: (err) => {
        this.showToast(err.message || 'Error fetching interns from backend', 'error');
      }
    });
  }

  changeApiUrl(url: string) {
    if (!url || !url.startsWith('http')) {
      this.showToast('Please enter a valid HTTP/HTTPS URL', 'error');
      return;
    }
    this.internService.setApiUrl(url);
    this.showToast(`API base path set to: ${url}`, 'success');
    this.loadData();
  }

  // Set form to onboarding tab (Add Intern)
  startOnboarding() {
    this.editingInternId.set(null);
    this.formFullName = '';
    this.formWorkEmail = '';
    this.formJoiningDate = new Date().toISOString().split('T')[0];
    this.formRoleId = this.roles().length > 0 ? this.roles()[0].roleId : null;
    this.formTypeId = this.internshipTypes().length > 0 ? this.internshipTypes()[0].internshipTypeId : null;
    this.activeTab.set('onboard');
  }

  // Set form to edit intern
  startEditing(intern: Intern) {
    this.editingInternId.set(intern.internId);
    this.formFullName = intern.fullName;
    this.formWorkEmail = intern.workEmail;
    this.formJoiningDate = intern.joiningDate;
    this.formRoleId = intern.roleId;
    this.formTypeId = intern.internshipTypeId;
    this.activeTab.set('onboard');
  }

  startRoleManagement() {
    this.editingRoleId.set(null);
    this.roleNameInput = '';
    this.activeTab.set('roles');
  }

  startRoleEditing(role: Role) {
    this.editingRoleId.set(role.roleId);
    this.roleNameInput = role.roleName;
    this.activeTab.set('roles');
  }

  submitRole() {
    const roleName = this.roleNameInput.trim();
    if (!roleName) {
      this.showToast('Role name is required', 'error');
      return;
    }

    const editingRoleId = this.editingRoleId();
    if (editingRoleId !== null) {
      this.internService.updateRole(editingRoleId, { roleId: editingRoleId, roleName }).subscribe({
        next: () => {
          this.showToast(`Role "${roleName}" updated successfully`, 'success');
          this.startRoleManagement();
        },
        error: (err) => this.showToast(err.message || 'Failed to update role', 'error')
      });
    } else {
      this.internService.createRole({ roleName }).subscribe({
        next: () => {
          this.showToast(`Role "${roleName}" added successfully`, 'success');
          this.startRoleManagement();
        },
        error: (err) => this.showToast(err.message || 'Failed to add role', 'error')
      });
    }
  }

  deleteRole(roleId: number, roleName: string) {
    if (confirm(`Delete role "${roleName}"?`)) {
      this.internService.deleteRole(roleId).subscribe({
        next: () => this.showToast(`Role "${roleName}" removed successfully`, 'success'),
        error: (err) => this.showToast(err.message || 'Failed to delete role', 'error')
      });
    }
  }

  startTypeManagement() {
    this.editingTypeId.set(null);
    this.internshipTypeNameInput = '';
    this.internshipTypeDurationInput = '';
    this.activeTab.set('types');
  }

  startTypeEditing(type: InternshipType) {
    this.editingTypeId.set(type.internshipTypeId);
    this.internshipTypeNameInput = type.typeName;
    this.internshipTypeDurationInput = type.durationInMonths ?? '';
    this.activeTab.set('types');
  }

  submitInternshipType() {
    const typeName = this.internshipTypeNameInput.trim();
    const duration = Number(this.internshipTypeDurationInput);

    if (!typeName) {
      this.showToast('Internship type name is required', 'error');
      return;
    }

    if (!Number.isFinite(duration) || duration <= 0) {
      this.showToast('Duration must be a positive number of months', 'error');
      return;
    }

    const editingTypeId = this.editingTypeId();
    const payload = { internshipTypeId: editingTypeId ?? 0, typeName, durationInMonths: duration };

    if (editingTypeId !== null) {
      this.internService.updateInternshipType(editingTypeId, payload).subscribe({
        next: () => {
          this.showToast(`Internship type "${typeName}" updated successfully`, 'success');
          this.startTypeManagement();
        },
        error: (err) => this.showToast(err.message || 'Failed to update internship type', 'error')
      });
    } else {
      this.internService.createInternshipType({ typeName, durationInMonths: duration }).subscribe({
        next: () => {
          this.showToast(`Internship type "${typeName}" added successfully`, 'success');
          this.startTypeManagement();
        },
        error: (err) => this.showToast(err.message || 'Failed to add internship type', 'error')
      });
    }
  }

  deleteInternshipType(typeId: number, typeName: string) {
    if (confirm(`Delete internship type "${typeName}"?`)) {
      this.internService.deleteInternshipType(typeId).subscribe({
        next: () => this.showToast(`Internship type "${typeName}" removed successfully`, 'success'),
        error: (err) => this.showToast(err.message || 'Failed to delete internship type', 'error')
      });
    }
  }

  toggleAuthMode(mode: 'signin' | 'signup') {
    this.authError.set(null);
    this.authSuccess.set(null);
    if (mode === 'signup') {
      this.authMode.set({ value: 'signup', label: 'Create account', subtitle: 'Sign up with a Hatch email address' });
    } else {
      this.authMode.set({ value: 'signin', label: 'Sign in', subtitle: 'Sign in to continue' });
    }
  }

  submitAuth() {
    const email = this.authEmail.trim().toLowerCase();
    const password = this.authPassword.trim();

    if (!email || !password) {
      this.authError.set('Email and password are required.');
      return;
    }

    if (!email.endsWith('@hatch.com')) {
      this.authError.set('Please use a corporate email that ends with @hatch.com.');
      return;
    }

    const fullName = this.authName.trim() || email.split('@')[0].replace(/\./g, ' ');
    const normalizedName = fullName
      .split(' ')
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    const observe$ = this.authMode().value === 'signup'
      ? this.internService.signup(normalizedName, email, password)
      : this.internService.login(email, password);

    observe$.subscribe({
      next: (response) => {
        const token = (response as any).token;
        if (token) {
          this.internService.setAuthToken(token);
          const user: AuthUser = {
            name: normalizedName,
            email,
            role: this.authMode().value === 'signup' ? 'HR Coordinator' : 'Team Member'
          };
          this.currentUser.set(user);
          this.isAuthenticated.set(true);
          localStorage.setItem('hatch_current_user', JSON.stringify(user));
          this.authError.set(null);
          this.authSuccess.set(`Welcome ${user.name}!`);
          this.loadData();
        } else if (this.authMode().value === 'signup') {
          // Some signup flows return no token; authenticate immediately after signup.
          this.internService.login(email, password).subscribe({
            next: (loginResponse) => {
              const loginToken = (loginResponse as any).token;
              if (loginToken) {
                this.internService.setAuthToken(loginToken);
                const user: AuthUser = { name: normalizedName, email, role: 'HR Coordinator' };
                this.currentUser.set(user);
                this.isAuthenticated.set(true);
                localStorage.setItem('hatch_current_user', JSON.stringify(user));
                this.authError.set(null);
                this.authSuccess.set(`Welcome ${user.name}!`);
                this.loadData();
              }
            },
            error: (err) => {
              this.authError.set(err.message || 'Signup succeeded but login failed.');
            }
          });
        } else {
          this.authError.set('Authentication response did not include a token.');
        }
      },
      error: (err) => {
        this.authError.set(err?.error?.message || err.message || 'Authentication failed. Please check your credentials.');
      }
    });
  }

  logout() {
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
    this.authEmail = '';
    this.authPassword = '';
    this.authName = '';
    this.authError.set(null);
    this.authSuccess.set(null);
    this.internService.setAuthToken(null);
    localStorage.removeItem('hatch_current_user');
    this.showToast('You have been logged out.', 'info');
  }

  onSubmit() {
    if (!this.formFullName.trim()) {
      this.showToast('Full Name is required', 'error');
      return;
    }
    if (!this.formWorkEmail.trim() || !this.formWorkEmail.includes('@')) {
      this.showToast('A valid corporate email is required', 'error');
      return;
    }
    if (!this.formJoiningDate) {
      this.showToast('Joining Date is required', 'error');
      return;
    }
    if (!this.formRoleId || !this.formTypeId) {
      this.showToast('Role and Internship Type must be assigned', 'error');
      return;
    }

    const payload = {
      fullName: this.formFullName.trim(),
      workEmail: this.formWorkEmail.trim(),
      joiningDate: this.formJoiningDate,
      roleId: Number(this.formRoleId),
      internshipTypeId: Number(this.formTypeId)
    };

    const editId = this.editingInternId();

    if (editId !== null) {
      // Editing
      const updatedIntern: Intern = { ...payload, internId: editId };
      this.internService.updateIntern(editId, updatedIntern).subscribe({
        next: () => {
          this.showToast(`Intern "${payload.fullName}" updated successfully`, 'success');
          this.activeTab.set('interns');
          this.loadData();
        },
        error: (err) => {
          this.showToast(err.message || 'Update failed', 'error');
        }
      });
    } else {
      // Creating
      this.internService.createIntern(payload).subscribe({
        next: () => {
          this.showToast(`Intern "${payload.fullName}" registered successfully`, 'success');
          this.activeTab.set('interns');
          this.loadData();
        },
        error: (err) => {
          this.showToast(err.message || 'Creation failed', 'error');
        }
      });
    }
  }

  onDelete(id: number, name: string) {
    if (confirm(`Are you sure you want to remove the record for intern "${name}"?`)) {
      this.internService.deleteIntern(id).subscribe({
        next: (success) => {
          if (success) {
            this.showToast(`Intern "${name}" removed successfully`, 'success');
            this.loadData();
          } else {
            this.showToast('Failed to remove intern', 'error');
          }
        },
        error: (err) => {
          this.showToast(err.message || 'Delete operation failed', 'error');
        }
      });
    }
  }



  clearFilters() {
    this.searchQuery.set('');
    this.filterRoleId.set(null);
    this.filterTypeId.set(null);
  }

  setFilterRoleId(value: string) {
    this.filterRoleId.set(value ? Number(value) : null);
  }

  setFilterTypeId(value: string) {
    this.filterTypeId.set(value ? Number(value) : null);
  }
}