import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';

/** Split screen for sign-in pages: the gradient "capsule" story on the left, the form on the right. */
@Component({
  selector: 'mc-auth-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <div class="shell">
      <section class="story" aria-hidden="true">
        <a routerLink="/" class="brand">
          <img src="assets/brand/moodcapsule-icon.svg" alt="" width="40" height="40" />
          MoodCapsule
        </a>
        <div class="pitch">
          <h1>One emoji.<br />One sentence.<br />A whole year to look back on.</h1>
          <p>Log your moments on your phone. Come here to read them, spot your patterns and open your time capsules.</p>
        </div>
        <div class="float">
          <div class="mini m1"><span class="emoji">😌</span><div><b>🏠 Home · 8:10 AM</b>Slow coffee before class, felt calm.</div></div>
          <div class="mini m2"><span class="emoji">😄</span><div><b>🏋️ Gym · 6:40 PM</b>New personal best today!</div></div>
          <div class="mini m3"><span class="emoji">🕰️</span><div><b>Time capsule</b>Opens in 23 days</div></div>
        </div>
        <p class="foot">A Capsule Labs project · Sheridan College</p>
      </section>

      <section class="form-side">
        <button type="button" class="theme" (click)="theme.set(theme.dark() ? 'LIGHT' : 'DARK')"
                [attr.aria-label]="theme.dark() ? 'Switch to light mode' : 'Switch to dark mode'">
          <span class="emoji">{{ theme.dark() ? '☀️' : '🌙' }}</span>
        </button>
        <div class="form-wrap">
          <router-outlet />
        </div>
      </section>
    </div>
  `,
  styles: [`
    .shell { display: grid; grid-template-columns: minmax(380px, 1fr) minmax(420px, 1.05fr); min-height: 100vh; }
    .story {
      background: var(--grad-hero); color: #fff; padding: 36px 48px; position: relative; overflow: hidden;
      display: flex; flex-direction: column;
    }
    .story::before, .story::after {
      content: ''; position: absolute; border-radius: 50%; background: radial-gradient(circle, rgba(255,255,255,.35), transparent 70%);
    }
    .story::before { width: 420px; height: 420px; right: -160px; top: -140px; }
    .story::after { width: 300px; height: 300px; left: -120px; bottom: -120px; opacity: .6; }
    .brand { display: flex; align-items: center; gap: 12px; color: #fff; font-weight: 700; font-size: 21px; text-decoration: none; position: relative; z-index: 1; }
    .brand img { border-radius: 12px; box-shadow: 0 8px 20px rgba(40,20,90,.3); }
    .pitch { margin-top: auto; position: relative; z-index: 1; max-width: 460px; }
    .pitch h1 { color: #fff; font-size: 34px; line-height: 1.2; margin-bottom: 14px; }
    .pitch p { opacity: .92; font-size: 15px; }
    .float { position: relative; z-index: 1; margin: 34px 0 auto; display: flex; flex-direction: column; gap: 12px; max-width: 400px; }
    .mini {
      display: flex; gap: 12px; align-items: center; background: rgba(255,255,255,.22); border: 1px solid rgba(255,255,255,.35);
      border-radius: 18px; padding: 12px 14px; font-size: 13px; backdrop-filter: blur(6px);
      animation: bob 6s ease-in-out infinite;
    }
    .mini b { display: block; font-size: 11.5px; opacity: .9; font-weight: 600; }
    .mini .emoji { font-size: 26px; width: 44px; height: 44px; border-radius: 14px; background: rgba(255,255,255,.85); display: grid; place-items: center; flex: none; }
    .m2 { margin-left: 40px; animation-delay: -2s; }
    .m3 { margin-left: 14px; animation-delay: -4s; }
    @keyframes bob { 50% { transform: translateY(-6px); } }
    .foot { position: relative; z-index: 1; font-size: 12px; opacity: .8; margin-top: 24px; }
    .form-side { position: relative; display: flex; align-items: center; justify-content: center; padding: 40px 24px; background: var(--bg); }
    .form-wrap { width: 100%; max-width: 420px; }
    .theme {
      position: absolute; top: 18px; right: 18px; width: 42px; height: 42px; border-radius: 50%;
      border: 1px solid var(--stroke-2); background: var(--surface); cursor: pointer; font-size: 18px;
    }
    @media (max-width: 900px) {
      .shell { grid-template-columns: 1fr; }
      .story { padding: 22px 20px 26px; }
      .float, .foot { display: none; }
      .pitch { margin-top: 18px; }
      .pitch h1 { font-size: 22px; }
      .pitch p { font-size: 13px; }
      .form-side { align-items: flex-start; padding-top: 28px; }
    }
  `]
})
export class AuthShellComponent {
  readonly theme = inject(ThemeService);
}
