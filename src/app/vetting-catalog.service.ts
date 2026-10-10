import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { buildVettingCatalog, VettingCatalog } from './vetting-catalog';

@Injectable({ providedIn: 'root' })
export class VettingCatalogService {
  private readonly http = inject(HttpClient);

  load(): Observable<VettingCatalog> {
    return forkJoin({
      xml: this.http.get('/vetting-data/crca_initial_vetting_rules.xml', { responseType: 'text' }),
      properties: this.http.get('/vetting-data/Vetting_fr_FR.properties', { responseType: 'text' }),
    }).pipe(map(({ xml, properties }) => buildVettingCatalog(xml, properties)));
  }
}
