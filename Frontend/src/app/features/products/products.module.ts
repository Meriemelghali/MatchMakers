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
import { ProductAdminComponent } from './product-admin/product-admin.component';
import { ProductDetailComponent } from './product-detail/product-detail.component';
import { StarRatingComponent } from './components/star-rating/star-rating.component';
import { AdminOrdersComponent } from './admin-orders/admin-orders.component';
import { SponsorModule } from '../sponsor/sponsor.module';



@NgModule({
  declarations: [
    ProductListComponent,
    ProductFormComponent,
    ProductOrderComponent,
    ProductOrderHistoryComponent,
    ProductPaymentComponent,
    ProductChatbotComponent,
    ProductStatsComponent,
    ProductAdminComponent,
    ProductDetailComponent,
    StarRatingComponent,
    AdminOrdersComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ProductsRoutingModule,
    SponsorModule,
  ]
})
export class ProductsModule {}
