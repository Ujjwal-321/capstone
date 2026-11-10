import { Component, ElementRef, computed, input, model, output, viewChildren } from '@angular/core';

/** Six boxes for a 6-digit email code. Paste works in any box. */
@Component({
  selector: 'mc-code-input',
  standalone: true,
  template: `
    <div class="boxes" role="group" [attr.aria-label]="label()">
      @for (i of slots; track i) {
        <input #box
               inputmode="numeric" autocomplete="one-time-code" maxlength="1"
               [attr.aria-label]="'Digit ' + (i + 1)"
               [value]="digit(i)"
               [disabled]="disabled()"
               (input)="onInput(i, $event)"
               (keydown)="onKey(i, $event)"
               (paste)="onPaste($event)"
               (focus)="select($event)" />
      }
    </div>
  `,
  styles: [`
    .boxes { display: flex; gap: 10px; justify-content: center; }
    input {
      width: 48px; height: 56px; border-radius: 14px; text-align: center;
      font: 600 22px var(--font); color: var(--ink); background: var(--surface);
      border: 1.5px solid var(--stroke-2); outline: none; transition: border-color .15s, box-shadow .15s;
    }
    input:focus { border-color: var(--primary); box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 18%, transparent); }
    @media (max-width: 420px) { input { width: 42px; height: 50px; font-size: 20px; } .boxes { gap: 7px; } }
  `]
})
export class CodeInputComponent {
  readonly value = model('');
  readonly disabled = input(false);
  readonly label = input('Verification code');
  readonly complete = output<string>();

  readonly slots = [0, 1, 2, 3, 4, 5];
  private readonly digits = computed(() => this.value().split(''));
  private readonly boxes = viewChildren<ElementRef<HTMLInputElement>>('box');

  digit(i: number): string {
    return (this.digits()[i] ?? '').trim();
  }

  onInput(i: number, e: Event): void {
    const el = e.target as HTMLInputElement;
    const d = el.value.replace(/\D/g, '').slice(-1);
    el.value = d;
    const chars = this.value().padEnd(6, ' ').split('');
    chars[i] = d || ' ';
    this.update(chars.join(''));
    if (d && i < 5) this.focus(i + 1);
  }

  onKey(i: number, e: KeyboardEvent): void {
    if (e.key === 'Backspace' && !(e.target as HTMLInputElement).value && i > 0) {
      e.preventDefault();
      const chars = this.value().padEnd(6, ' ').split('');
      chars[i - 1] = ' ';
      this.update(chars.join(''));
      this.focus(i - 1);
    } else if (e.key === 'ArrowLeft' && i > 0) {
      this.focus(i - 1);
    } else if (e.key === 'ArrowRight' && i < 5) {
      this.focus(i + 1);
    }
  }

  onPaste(e: ClipboardEvent): void {
    const text = (e.clipboardData?.getData('text') ?? '').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    e.preventDefault();
    this.update(text);
    this.focus(Math.min(text.length, 5));
  }

  select(e: FocusEvent): void {
    (e.target as HTMLInputElement).select();
  }

  focusFirst(): void {
    this.focus(0);
  }

  private update(raw: string): void {
    const clean = raw.replace(/\s+$/, '');
    this.value.set(clean);
    if (/^\d{6}$/.test(clean)) this.complete.emit(clean);
  }

  private focus(i: number): void {
    setTimeout(() => this.boxes()[i]?.nativeElement.focus());
  }
}
