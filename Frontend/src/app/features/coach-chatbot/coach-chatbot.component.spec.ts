import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoachChatbotComponent } from './coach-chatbot.component';

describe('CoachChatbotComponent', () => {
  let component: CoachChatbotComponent;
  let fixture: ComponentFixture<CoachChatbotComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CoachChatbotComponent]
    });
    fixture = TestBed.createComponent(CoachChatbotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
