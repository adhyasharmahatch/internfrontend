import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InternshipType, Role } from '../../services/intern.service';

@Component({
  selector: 'app-management-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './management-view.component.html',
  styleUrls: ['./management-view.component.css']
})
export class ManagementViewComponent {
  @Input() title = '';
  @Input() description = '';
  @Input() items: Role[] | InternshipType[] = [];
  @Input() isRoleView = true;
  @Input() formValue = '';
  @Input() formSecondaryValue: number | string = '';
  @Input() editingId: number | null = null;

  @Output() formSubmitted = new EventEmitter<void>();
  @Output() clearRequested = new EventEmitter<void>();
  @Output() editRequested = new EventEmitter<number>();
  @Output() deleteRequested = new EventEmitter<number>();
  @Output() formValueChange = new EventEmitter<string>();
  @Output() formSecondaryValueChange = new EventEmitter<number | string>();

  getItemId(item: Role | InternshipType): number {
    return this.isRoleView ? (item as Role).roleId : (item as InternshipType).internshipTypeId;
  }

  getItemLabel(item: Role | InternshipType): string {
    return this.isRoleView ? (item as Role).roleName : `${(item as InternshipType).typeName} · ${(item as InternshipType).durationInMonths} months`;
  }
}
