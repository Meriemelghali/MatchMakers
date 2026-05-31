import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CampaignListSponsorComponent } from './campaign-list-sponsor.component';

describe('CampaignListSponsorComponent', () => {
  let component: CampaignListSponsorComponent;
  let fixture: ComponentFixture<CampaignListSponsorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CampaignListSponsorComponent]
    });
    fixture = TestBed.createComponent(CampaignListSponsorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
