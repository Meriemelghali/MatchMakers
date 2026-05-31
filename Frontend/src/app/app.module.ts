import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common'; // Import CommonModule
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './core/Auth/login/login.component';
import { FormsModule } from '@angular/forms';
import { PublicLayoutComponent } from './layouts/public-layout/public-layout.component';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout.component';
import { RouterModule } from '@angular/router';
import { RegisterComponent } from './core/Auth/register/register.component';
import { ForgotPasswordComponent } from './core/Auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './core/Auth/reset-password/reset-password.component';
import { AdminChoiceComponent } from './core/Auth/admin-choice/admin-choice.component';
import { BackofficeLayoutComponent } from './layouts/backoffice-layout/backoffice-layout.component';
import { RoleSelectionComponent } from './core/Auth/role-selection/role-selection.component';
import { ProfileComponent } from './features/profile/profile.component';
import { ReactiveFormsModule } from '@angular/forms';
import { AiChatbotComponent } from './layouts/ai-chatbot/ai-chatbot.component';
import { CoachDashboardComponent } from './features/coach-dashboard/coach-dashboard.component';


@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    PublicLayoutComponent,
    AuthLayoutComponent,
    RegisterComponent,
    ForgotPasswordComponent,
    ResetPasswordComponent,
    AdminChoiceComponent,
    BackofficeLayoutComponent,
    RoleSelectionComponent,
    ProfileComponent,
    AiChatbotComponent,
    CoachDashboardComponent,
  ],

  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    CommonModule, // Add CommonModule to imports
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule { }
