import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Intern, InternshipType, Role } from '../../services/intern.service';

@Component({
  selector: 'app-interns-directory-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './interns-directory-view.component.html',
  styleUrls: ['./interns-directory-view.component.css']
})
export class InternsDirectoryViewComponent {
  @Input() filteredInterns: Intern[] = [];
  @Input() roles: Role[] = [];
  @Input() internshipTypes: InternshipType[] = [];
  @Input() searchQuery = '';
  @Input() filterRoleId: number | null = null;
  @Input() filterTypeId: number | null = null;

  @Output() searchQueryChange = new EventEmitter<string>();
  @Output() filterRoleIdChange = new EventEmitter<string>();
  @Output() filterTypeIdChange = new EventEmitter<string>();
  @Output() clearFiltersRequested = new EventEmitter<void>();
  @Output() onboardRequested = new EventEmitter<void>();
  @Output() editRequested = new EventEmitter<Intern>();
  @Output() deleteRequested = new EventEmitter<Intern>();
}
