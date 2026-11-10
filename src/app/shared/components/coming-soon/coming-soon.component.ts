import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/** Temporary page for sections that are still being rebuilt. */
@Component({
  selector: 'mc-coming-soon',
  standalone: true,
  template: `
    <div class="page">
      <div class="hero">
        <h1><span class="emoji">{{ emoji }}</span> {{ title }}</h1>
        <p class="sub">This page is being rebuilt for the new MoodCapsule web app.</p>
      </div>
      <div class="card" style="margin-top: 18px">
        <div class="empty">
          <span class="big">🛠️</span>
          <h3>Coming very soon</h3>
          <p>Meanwhile, keep logging your moments in the MoodCapsule Android app.</p>
        </div>
      </div>
    </div>
  `
})
export class ComingSoonComponent {
  private readonly data = inject(ActivatedRoute).snapshot.data;
  readonly title: string = this.data['title'] ?? 'MoodCapsule';
  readonly emoji: string = this.data['emoji'] ?? '✨';
}
