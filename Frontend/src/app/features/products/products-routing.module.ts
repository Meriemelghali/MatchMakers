import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProductListComponent } from './product-list/product-list.component';
import { ProductFormComponent } from './product-form/product-form.component';
import { ProductOrderComponent } from './product-order/product-order.component';
import { ProductOrderHistoryComponent } from './product-order-history/product-order-history.component';
import { ProductPaymentComponent } from './product-payment/product-payment.component';
import { ProductStatsComponent } from './product-stats/product-stats.component';
import { ProductAdminComponent } from './product-admin/product-admin.component';
import { ProductDetailComponent } from './product-detail/product-detail.component';


const routes: Routes = [
  { path: '',        component: ProductListComponent },
  { path: 'add',     component: ProductFormComponent },
  { path: 'edit/:id', component: ProductFormComponent },
  { path: 'order/:id', component: ProductOrderComponent },
  { path: 'orders',    component: ProductOrderHistoryComponent },
  { path: 'payment/:orderId', component: ProductPaymentComponent },
  { path: 'stats', component: ProductStatsComponent },
  { path: 'admin', component: ProductAdminComponent },
  { path: 'detail/:id', component: ProductDetailComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProductsRoutingModule {}
