import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from './http.service';

@Injectable({
  providedIn: 'root'
})
export class RecipeService{


  constructor(
    private httpService: HttpService
  ) { }

  getAllRecipes(): Observable<any> {
    return this.httpService.getData('/recipes/')
  }
}
