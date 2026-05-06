import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Product } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private api = environment.productServiceUrl;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Product[]> {
    return this.http.get<Product[]>(this.api);
  }

  getById(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.api}/${id}`);
  }

  create(product: Product): Observable<Product> {
    return this.http.post<Product>(this.api, product);
  }

  update(id: string, product: Product): Observable<Product> {
    return this.http.put<Product>(`${this.api}/${id}`, product);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  searchByName(name: string): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.api}/search?name=${name}`);
  }

  getBySport(sport: string): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.api}/sport/${sport}`);
  }

uploadImage(file: File): Observable<{ imageUrl: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return this.http.post<{ imageUrl: string }>(
    `${this.api}/upload-image`, formData
  );
}
}
