import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SponsorRegisterComponent } from './sponsor-profile.component';

describe('SponsorRegisterComponent', () => {
  let component: SponsorRegisterComponent;
  let fixture: ComponentFixture<SponsorRegisterComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SponsorRegisterComponent]
    });
    fixture = TestBed.createComponent(SponsorRegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
