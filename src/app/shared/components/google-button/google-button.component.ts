import {
  AfterViewInit, Component, ElementRef, NgZone, OnDestroy, effect, inject, input, output, signal, viewChild
} from '@angular/core';
import { environment } from '../../../../environments/environment';
import { ThemeService } from '../../../core/services/theme.service';

declare global {
  interface Window { google?: any; }
}

let scriptLoading: Promise<void> | null = null;

/** Loads Google Identity Services once per page. */
function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  scriptLoading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => { scriptLoading = null; reject(new Error('Google script failed to load')); };
    document.head.appendChild(s);
  });
  return scriptLoading;
}

/**
 * MC-69: Google's official "Continue with Google" button (Google Identity Services).
 * Emits the Google ID token; the page sends it to POST /api/auth/google.
 * Uses the WEB client ID – the site's address must be an Authorized JavaScript origin.
 */
@Component({
  selector: 'mc-google-button',
  standalone: true,
  template: `
    <div class="g-wrap" [class.off]="disabled()">
      <div #host class="g-host"></div>
      @if (failed()) {
        <p class="hint">Google sign-in couldn't load. Check your connection or ad blocker, then refresh.</p>
      }
    </div>
  `,
  styles: [`
    .g-wrap { display: flex; flex-direction: column; align-items: center; min-height: 44px; }
    .g-wrap.off { opacity: .45; pointer-events: none; filter: grayscale(.4); }
    .g-host { display: flex; justify-content: center; width: 100%; }
    .hint { margin-top: 6px; text-align: center; }
  `]
})
export class GoogleButtonComponent implements AfterViewInit, OnDestroy {
  readonly text = input<'continue_with' | 'signup_with' | 'signin_with'>('continue_with');
  readonly disabled = input(false);
  readonly token = output<string>();

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private readonly zone = inject(NgZone);
  private readonly theme = inject(ThemeService);
  readonly failed = signal(false);
  private ready = false;
  private resizeObserver?: ResizeObserver;
  private lastWidth = 0;

  constructor() {
    // Re-draw in the matching style when the theme changes
    effect(() => {
      this.theme.dark();
      if (this.ready) this.render();
    });
  }

  async ngAfterViewInit(): Promise<void> {
    try {
      await loadGoogleScript();
    } catch {
      this.failed.set(true);
      return;
    }
    window.google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (resp: { credential?: string }) => {
        if (resp.credential) this.zone.run(() => this.token.emit(resp.credential!));
      },
      ux_mode: 'popup',
      auto_select: false,
      cancel_on_tap_outside: true,
      itp_support: true
    });
    this.ready = true;
    this.render();
    this.resizeObserver = new ResizeObserver(() => {
      const w = this.width();
      if (Math.abs(w - this.lastWidth) > 24) this.render();
    });
    this.resizeObserver.observe(this.host().nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  private width(): number {
    return Math.max(200, Math.min(400, Math.floor(this.host().nativeElement.clientWidth || 320)));
  }

  private render(): void {
    const el = this.host().nativeElement;
    el.innerHTML = '';
    this.lastWidth = this.width();
    window.google.accounts.id.renderButton(el, {
      type: 'standard',
      theme: this.theme.dark() ? 'filled_black' : 'outline',
      size: 'large',
      shape: 'pill',
      text: this.text(),
      logo_alignment: 'center',
      width: this.lastWidth
    });
  }
}
