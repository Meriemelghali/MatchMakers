import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductStatsComponent } from './product-stats.component';

describe('ProductStatsComponent', () => {
  let component: ProductStatsComponent;
  let fixture: ComponentFixture<ProductStatsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ProductStatsComponent]
    });
    fixture = TestBed.createComponent(ProductStatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
