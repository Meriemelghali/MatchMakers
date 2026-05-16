import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductChatbotComponent } from './product-chatbot.component';

describe('ProductChatbotComponent', () => {
  let component: ProductChatbotComponent;
  let fixture: ComponentFixture<ProductChatbotComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ProductChatbotComponent]
    });
    fixture = TestBed.createComponent(ProductChatbotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
