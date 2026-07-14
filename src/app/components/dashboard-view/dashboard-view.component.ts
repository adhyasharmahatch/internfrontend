import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Intern } from '../../services/intern.service';

@Component({
  selector: 'app-dashboard-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-view.component.html',
  styleUrls: ['./dashboard-view.component.css']
})
export class DashboardViewComponent {
  @Input() totalInterns = 0;
  @Input() fullTimeCount = 0;
  @Input() remoteCount = 0;
  @Input() roleDistribution: Array<{ name: string; count: number; percentage: number }> = [];
  @Input() recentJoiners: Intern[] = [];

  @Output() onboardRequested = new EventEmitter<void>();
}
