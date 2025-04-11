import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from './http.service';

export interface Recipe {
  id: string;
  title: string;
  description: string;
  tags: string[];
}

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
