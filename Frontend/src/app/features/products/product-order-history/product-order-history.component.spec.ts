import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductOrderHistoryComponent } from './product-order-history.component';

describe('ProductOrderHistoryComponent', () => {
  let component: ProductOrderHistoryComponent;
  let fixture: ComponentFixture<ProductOrderHistoryComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ProductOrderHistoryComponent]
    });
    fixture = TestBed.createComponent(ProductOrderHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
