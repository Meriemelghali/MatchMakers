import { Component, OnInit } from '@angular/core';
import { EventService } from '../../events/service/event.service';
import { AIService } from '../../../core/services/AIService/ai.service';
import { EventType } from '../../events/event.model';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-event-type-management',
  templateUrl: './event-type-management.component.html',
  styleUrls: ['./event-type-management.component.css']
})
export class EventTypeManagementComponent implements OnInit {
  eventTypes: EventType[] = [];
  isLoading = false;
  aiLoading = false;
  
  // Creation/Edit state
  showForm = false;
  isEditing = false;
  currentType: Partial<EventType> = {};
  

  constructor(
    private eventService: EventService,
    private aiService: AIService
  ) { }

  ngOnInit(): void {
    this.loadEventTypes();
  }

  loadEventTypes(): void {
    this.isLoading = true;
    this.eventService.getEventTypes()
      .pipe(finalize(() => this.isLoading = false))
      .subscribe(types => this.eventTypes = types);
  }

  openCreateForm(): void {
    this.currentType = {
      typeName: '',
      icon: '✨',
      description: '',
      isCompetition: false,
      requiresTeams: true,
      requiresMatches: true,
      defaultRules: []
    };
    this.isEditing = false;
    this.showForm = true;
  }

  editType(type: EventType): void {
    this.currentType = { ...type };
    this.isEditing = true;
    this.showForm = true;
  }

  deleteType(id: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce type d\'événement ?')) {
      this.eventService.deleteEventType(id).subscribe(() => {
        this.loadEventTypes();
      });
    }
  }

  saveType(): void {
    if (this.isEditing && this.currentType.id) {
       // logic for update if service exists, otherwise create
       this.eventService.createEventType(this.currentType as EventType).subscribe(() => {
         this.loadEventTypes();
         this.showForm = false;
       });
    } else {
      this.eventService.createEventType(this.currentType as EventType).subscribe(() => {
        this.loadEventTypes();
        this.showForm = false;
      });
    }
  }

  // ==== AI ACTIONS ====

  generateWithAI(): void {
    if (!this.currentType.typeName) return;
    
    this.aiLoading = true;
    this.aiService.suggestNewType(this.currentType.typeName)
      .pipe(finalize(() => this.aiLoading = false))
      .subscribe({
        next: proposal => {
          this.currentType = { ...this.currentType, ...proposal };
        },
        error: err => console.error('AI suggest error:', err)
      });
  }

  generateIconOnly(): void {
    if (!this.currentType.typeName) return;
    this.aiLoading = true;
    this.aiService.suggestNewType(this.currentType.typeName)
      .pipe(finalize(() => this.aiLoading = false))
      .subscribe({
        next: proposal => {
          this.currentType.icon = proposal.icon;
        },
        error: err => console.error('AI icon error:', err)
      });
  }

  generateDescriptionOnly(): void {
    if (!this.currentType.typeName) return;
    this.aiLoading = true;
    this.aiService.suggestNewType(this.currentType.typeName)
      .pipe(finalize(() => this.aiLoading = false))
      .subscribe({
        next: proposal => {
          this.currentType.description = proposal.description;
        },
        error: err => console.error('AI desc error:', err)
      });
  }

}