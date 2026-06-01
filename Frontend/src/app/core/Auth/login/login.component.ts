import { Component, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, LoginRequest } from 'src/app/core/services/AuthService/auth.service';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loading = false;
  errorMessage = '';
  showPassword = false;

  // MFA states
  isMfaChoiceStep = false;
  isMfaVerifyStep = false;

  email = '';
  password = '';
  mfaCode = '';
  twoFactorType = '';
  qrCodeImage = '';

  // OTP 6-box support
  otpDigits: string[] = ['', '', '', '', '', ''];

  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  constructor(private authService: AuthService, private router: Router) {}

  onLogin(form: NgForm) {
    if (form.invalid) return;
    this.loading = true;
    this.errorMessage = '';

    const request: LoginRequest = {
      email: form.value.email,
      password: form.value.password
    };

    this.authService.login(request).subscribe({
      next: (res) => {
        if (res.requiresMfaChoice) {
          this.email = request.email;
          this.password = request.password;
          this.isMfaChoiceStep = true;
          this.loading = false;
          return;
        }
        this.authService.saveTokensAndRedirect(res, this.router);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || err.error?.error || 'Erreur de connexion';
      },
      complete: () => (this.loading = false)
    });
  }

  selectMfaMethod(method: 'EMAIL' | 'AUTH_APP') {
    if (this.loading) return;
    this.loading = true;
    this.errorMessage = '';
    this.twoFactorType = method;

    this.authService.setup2Fa({
      email: this.email,
      password: this.password,
      type: method
    }).subscribe({
      next: (res) => {
        this.loading = false;
        this.isMfaChoiceStep = false;
        this.isMfaVerifyStep = true;
        this.qrCodeImage = res.qrCodeImageBase64 || '';
        setTimeout(() => {
          const inputs = this.otpInputs?.toArray();
          if (inputs?.length) inputs[0].nativeElement.focus();
        }, 150);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || "Erreur d'initialisation du mode de validation";
      }
    });
  }

  // ── OTP handlers ─────────────────────────────────────────────────────────

  onOtpInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    const val = input.value.replace(/\D/g, '');
    this.otpDigits[index] = val.slice(-1);
    input.value = this.otpDigits[index];
    this.mfaCode = this.otpDigits.join('');

    if (this.otpDigits[index] && index < 5) {
      const next = this.otpInputs.toArray()[index + 1];
      if (next) next.nativeElement.focus();
    }

    if (this.mfaCode.length === 6) {
      setTimeout(() => this.onVerifyMfa(), 80);
    }
  }

  onOtpKeyDown(event: KeyboardEvent, index: number) {
    if (event.key === 'Backspace') {
      if (this.otpDigits[index]) {
        this.otpDigits[index] = '';
        this.mfaCode = this.otpDigits.join('');
      } else if (index > 0) {
        this.otpDigits[index - 1] = '';
        this.mfaCode = this.otpDigits.join('');
        const prev = this.otpInputs.toArray()[index - 1];
        if (prev) {
          prev.nativeElement.value = '';
          prev.nativeElement.focus();
        }
      }
      event.preventDefault();
    } else if (event.key === 'ArrowLeft' && index > 0) {
      this.otpInputs.toArray()[index - 1].nativeElement.focus();
    } else if (event.key === 'ArrowRight' && index < 5) {
      this.otpInputs.toArray()[index + 1].nativeElement.focus();
    }
  }

  onOtpPaste(event: ClipboardEvent) {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text') ?? '';
    const digits = pasted.replace(/\D/g, '').slice(0, 6);
    digits.split('').forEach((ch, i) => {
      this.otpDigits[i] = ch;
      const box = this.otpInputs.toArray()[i];
      if (box) box.nativeElement.value = ch;
    });
    this.mfaCode = this.otpDigits.join('');
    const focusIdx = Math.min(digits.length, 5);
    const target = this.otpInputs.toArray()[focusIdx];
    if (target) target.nativeElement.focus();
    if (this.mfaCode.length === 6) {
      setTimeout(() => this.onVerifyMfa(), 80);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  onVerifyMfa() {
    if (!this.mfaCode || this.mfaCode.length < 6 || this.loading) return;
    this.loading = true;

    this.authService.verify2Fa({
      email: this.email,
      password: this.password,
      code: this.mfaCode,
      type: this.twoFactorType
    }).subscribe({
      next: (res) => {
        this.authService.saveTokensAndRedirect(res, this.router);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Code invalide';
        this.otpDigits = ['', '', '', '', '', ''];
        this.mfaCode = '';
        setTimeout(() => {
          const inputs = this.otpInputs?.toArray();
          if (inputs?.length) inputs[0].nativeElement.focus();
        }, 50);
      }
    });
  }

  backToChoice() {
    this.isMfaVerifyStep = false;
    this.isMfaChoiceStep = true;
    this.mfaCode = '';
    this.otpDigits = ['', '', '', '', '', ''];
    this.qrCodeImage = '';
    this.errorMessage = '';
  }

  backToLogin() {
    this.isMfaChoiceStep = false;
    this.isMfaVerifyStep = false;
    this.errorMessage = '';
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }
}
