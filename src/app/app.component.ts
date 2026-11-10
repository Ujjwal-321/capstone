import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent],
  template: `<router-outlet /><mc-toasts />`
})
export class AppComponent {
  // Created here so the theme follows the system setting from the first screen
  private readonly theme = inject(ThemeService);
}
