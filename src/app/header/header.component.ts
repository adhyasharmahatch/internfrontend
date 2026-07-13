import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  @Input() userName = 'Hatch User';
  @Input() userRole = 'Team Member';
  @Input() userEmail = '';
  @Input() showLogout = false;
  @Output() logoutClicked = new EventEmitter<void>();
}