import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/api.services';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  templateUrl: './toast-container.component.html',
  styleUrl: './toast-container.component.scss'
})
export class ToastContainerComponent {
  toastSvc = inject(ToastService);
}
