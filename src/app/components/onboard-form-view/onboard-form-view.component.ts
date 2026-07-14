import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InternshipType, Role } from '../../services/intern.service';

@Component({
  selector: 'app-onboard-form-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './onboard-form-view.component.html',
  styleUrls: ['./onboard-form-view.component.css']
})
export class OnboardFormViewComponent {
  @Input() editingInternId: number | null = null;
  @Input() roles: Role[] = [];
  @Input() internshipTypes: InternshipType[] = [];
  @Input() formFullName = '';
  @Input() formWorkEmail = '';
  @Input() formJoiningDate = '';
  @Input() formRoleId: number | null = null;
  @Input() formTypeId: number | null = null;

  @Output() formSubmit = new EventEmitter<void>();
  @Output() cancelRequested = new EventEmitter<void>();

  @Output() formFullNameChange = new EventEmitter<string>();
  @Output() formWorkEmailChange = new EventEmitter<string>();
  @Output() formJoiningDateChange = new EventEmitter<string>();
  @Output() formRoleIdChange = new EventEmitter<number | null>();
  @Output() formTypeIdChange = new EventEmitter<number | null>();
}
