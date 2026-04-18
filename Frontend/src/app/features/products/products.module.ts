import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ProductsRoutingModule } from './products-routing.module';
import { ProductListComponent } from './product-list/product-list.component';
import { ProductFormComponent } from './product-form/product-form.component';
import { ProductOrderComponent } from './product-order/product-order.component';
import { ProductOrderHistoryComponent } from './product-order-history/product-order-history.component';
import { ProductPaymentComponent } from './product-payment/product-payment.component';
import { ProductChatbotComponent } from './product-chatbot/product-chatbot.component';
import { ProductStatsComponent } from './product-stats/product-stats.component';


@NgModule({
  declarations: [
    ProductListComponent,
    ProductFormComponent,
    ProductOrderComponent,
    ProductOrderHistoryComponent,
    ProductPaymentComponent,
    ProductChatbotComponent,
    ProductStatsComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ProductsRoutingModule
  ]
})
export class ProductsModule {}
