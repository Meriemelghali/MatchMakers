import { Component, OnInit, OnDestroy } from '@angular/core';
import { forkJoin } from 'rxjs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProfileService, UserProfile } from '../../core/services/UserService/profile.service';
import { AuthService } from '../../core/services/AuthService/auth.service';
import { SportService } from '../../features/sports/services/sport.service';
import { Sport } from '../../features/sports/sport.model';
import { ThemeService, ThemeType } from '../../core/services/ThemeService/theme.service';
import { ToastService, ToastMessage } from '../../core/services/toast.service';
import { AIService, SportInspiration } from '../../core/services/UserService/ai.service';
import { ReclamationService } from '../../core/services/reclamation.service';
import { Reclamation } from '../../core/models/reclamation.model';
import { Router } from '@angular/router';

export interface AvatarSuggestion {
  id: string;
  name: string;
  url: string;
  previewUrl?: string;
  sportCategory: string;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, OnDestroy {
  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  userProfile?: UserProfile;
  activeTab = 'general';
  sportInspiration?: SportInspiration;
  isLoadingInspiration = false;
  
  availableSports: Sport[] = [];
  
  // Activity data
  myTeams: any[] = [];
  myClubs: any[] = [];
  myEvents: any[] = [];
  myReclamations: Reclamation[] = [];
  availableGoals: string[] = ['Perdre du poids', 'Prendre de la masse', 'Améliorer mon cardio', 'Souplesse', 'Préparation compétition', 'Remise en forme'];
  selectedSports: string[] = [];
  
  toast?: ToastMessage;
  
  isLoading = false;
  isSaving = false;
  showAvatarCreator = false;
  avatarCreatorUrl: SafeResourceUrl;
  
  // Suggestion System
  suggestedAvatars: AvatarSuggestion[] = [];
  isCustomMode = false; // Toggle between suggestions and full creator

  private messageHandler = this.handleIframeMessage.bind(this);

  constructor(
    private fb: FormBuilder,
    private profileService: ProfileService,
    private authService: AuthService,
    private sportService: SportService,
    private toastService: ToastService,
    private themeService: ThemeService,
    private aiService: AIService,
    private reclamationService: ReclamationService,
    private sanitizer: DomSanitizer,
    private router: Router

  ) {
    this.initForms();
    this.avatarCreatorUrl = this.sanitizer.bypassSecurityTrustResourceUrl('https://demo.readyplayer.me/avatar?frameApi&clearCache=true');
  }

  ngOnInit(): void {
    this.loadInitialData();
    window.addEventListener('message', this.messageHandler);
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.messageHandler);
  }

  private initForms() {
    this.toastService.toasts$.subscribe(t => {
      this.toast = t;
      setTimeout(() => this.toast = undefined, 5000); // Hide after 5s
    });
    this.profileForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: [{ value: '', disabled: true }],
      bio: [''],
      phoneNumber: [''],
      fitnessLevel: ['BEGINNER'],
      weight: [null],
      height: [null],
      fitnessGoals: [[]],
      favoriteSports: [[]],
      theme: ['DARK'],
      avatar3dUrl: ['']
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validator: this.passwordMatchValidator });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { 'mismatch': true };
  }

  loadInitialData() {
    const userId = this.authService.getUserId();
    if (!userId) return;

    this.isLoading = true;
    // Charge le profil et les sports en parallèle
    forkJoin({
      profile: this.profileService.getProfile(userId),
      sports: this.sportService.getAll()
    }).subscribe({
      next: (res) => {
        console.log('Profile Data Received:', res.profile);
        this.availableSports = res.sports;
        this.userProfile = res.profile;
        this.profileForm.patchValue(res.profile);
        
        if (res.profile.theme) {
          this.themeService.setTheme(res.profile.theme as ThemeType, true);
        }
        
        this.loadActivities(userId);
        this.loadInspiration(userId);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading data', err);
        this.isLoading = false;
        this.toastService.error('Erreur lors du chargement du profil');
      }
    });
  }

  loadProfile() {
    // Gardé pour compatibilité si appelé ailleurs, mais loadInitialData est préférable
    const userId = this.authService.getUserId();
    if (!userId) return;
    this.profileService.getProfile(userId).subscribe(data => {
      this.userProfile = data;
      this.profileForm.patchValue(data);
    });
  }

  loadActivities(userId: string) {
    this.profileService.getUserTeams(userId).subscribe((teams: any[]) => this.myTeams = teams);
    this.profileService.getUserClubs(userId).subscribe((clubs: any[]) => this.myClubs = clubs);
    this.profileService.getUserEvents(userId).subscribe((events: any[]) => this.myEvents = events);
    this.reclamationService.getReclamationsByUserId(userId).subscribe((recs: Reclamation[]) => this.myReclamations = recs);
  }

  updateProfile() {
    if (this.profileForm.invalid || !this.userProfile) return;

    const userId = this.authService.getUserId();
    if (!userId) return;

    this.isSaving = true;
    this.profileService.updateProfile(userId, this.profileForm.getRawValue()).subscribe({
      next: (updated: UserProfile) => {
        this.userProfile = updated;
        this.profileForm.patchValue(updated); // Force form sync
        this.isSaving = false;
        this.toastService.success('Profil mis à jour avec succès !');
      },
      error: (err: any) => {
        this.toastService.error('Erreur lors de la mise à jour');
        this.isSaving = false;
      }
    });
  }
  toggleGoal(goal: string) {
    const goals = this.profileForm.get('fitnessGoals')?.value as string[];
    if (goals.includes(goal)) {
      this.profileForm.patchValue({ fitnessGoals: goals.filter(g => g !== goal) });
    } else {
      this.profileForm.patchValue({ fitnessGoals: [...goals, goal] });
    }
    this.profileForm.markAsDirty();
  }

  isGoalSelected(goal: string): boolean {
    return (this.profileForm.get('fitnessGoals')?.value as string[]).includes(goal);
  }
  changePassword() {
    if (this.passwordForm.invalid) return;

    const userId = this.authService.getUserId();
    if (!userId) return;

    this.isSaving = true;
    this.profileService.changePassword(userId, this.passwordForm.value).subscribe({
      next: () => {
        this.passwordForm.reset();
        this.isSaving = false;
        alert('Mot de passe changé avec succès !');
      },
      error: (err: any) => {
        alert(err.error?.message || 'Erreur lors du changement de mot de passe');
        this.isSaving = false;
      }
    });
  }

  setTab(tab: string) {
    this.activeTab = tab;
  }
  goToSponsorProfile() {
  this.router.navigate(['/sponsor/profile']);
}

  toggleSport(sportName: string) {
    const currentSports = this.profileForm.get('favoriteSports')?.value as string[] || [];
    const index = currentSports.indexOf(sportName);

    if (index > -1) {
      // Remove if already selected
      currentSports.splice(index, 1);
    } else if (currentSports.length < 3) {
      // Add if not selected and under limit
      currentSports.push(sportName);
    }

    this.profileForm.patchValue({ favoriteSports: currentSports });
    this.profileForm.markAsDirty();
  }

  isSportSelected(sportName: string): boolean {
    const currentSports = this.profileForm.get('favoriteSports')?.value as string[] || [];
    return currentSports.includes(sportName);
  }

  selectTheme(theme: ThemeType) {
    this.profileForm.patchValue({ theme });
    this.profileForm.markAsDirty();
    this.themeService.setTheme(theme, true);
  }

  isThemeSelected(theme: string): boolean {
    return this.profileForm.get('theme')?.value === theme;
  }

  loadInspiration(userId: string) {
    this.isLoadingInspiration = true;
    this.aiService.getSportInspiration(userId).subscribe({
      next: (data) => {
        this.sportInspiration = data;
        this.isLoadingInspiration = false;
      },
      error: (err) => {
        console.error('Error loading AI inspiration', err);
        this.isLoadingInspiration = false;
      }
    });
  }

  // --- READY PLAYER ME AVATAR ---
  openAvatarCreator() {
    this.showAvatarCreator = true;
    this.isCustomMode = false;
    this.generateAvatarSuggestions();
  }

  closeAvatarCreator() {
    this.showAvatarCreator = false;
  }

  generateAvatarSuggestions() {
    const sports = this.userProfile?.favoriteSports || [];
    const hasSports = sports.length > 0;
    
    // Modèles d'athlètes Ready Player Me réels et certifiés
    const realModels = [
      'https://models.readyplayer.me/648085f1c9fc6360c70e28b8.glb', // Athlète Masculin
      'https://models.readyplayer.me/648085f5287f32997b60f589.glb', // Athlète Féminin
      'https://models.readyplayer.me/648085fba71f3918a09b589a.glb', // Style Sportif 1
      'https://models.readyplayer.me/6480860539121d5852504620.glb'  // Style Sportif 2
    ];

    // Créer 4 suggestions
    this.suggestedAvatars = realModels.map((url, index) => {
      // Rotation sur les sports favoris de l'utilisateur
      const sportName = hasSports ? sports[index % sports.length] : 'Style';
      return {
        id: (index + 1).toString(),
        name: `${sportName}`,
        url: url, // On garde l'URL brute pour l'ID/Logique
        sportCategory: sportName
      };
    });
  }

  getSafeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  selectAvatar(url: string) {
    this.profileForm.patchValue({ avatar3dUrl: url });
    this.profileForm.markAsDirty();
    if (this.userProfile) {
      this.userProfile.avatar3dUrl = url;
    }
    this.toastService.success("Modèle suggéré appliqué ! N'oubliez pas d'enregistrer.");
    this.closeAvatarCreator();
  }

  switchToCustomMode() {
    this.isCustomMode = true;
  }

  handleIframeMessage(event: MessageEvent) {
    if (!event.origin.includes('.readyplayer.me') && event.origin !== 'https://readyplayer.me') {
      return;
    }

    try {
      const json = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (json?.source !== 'readyplayerme') return;

      if (json.eventName === 'v1.avatar.exported') {
        const avatarUrl = json.data.url;
        this.profileForm.patchValue({ avatar3dUrl: avatarUrl });
        this.profileForm.markAsDirty();
        if (this.userProfile) {
          this.userProfile.avatar3dUrl = avatarUrl;
        }
        this.closeAvatarCreator();
        this.toastService.success("Avatar 3D récupéré avec succès ! N'oubliez pas d'enregistrer.");
      }
    } catch (e) { }
  }
}
