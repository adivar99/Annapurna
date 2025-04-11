import { EventEmitter, Injectable } from '@angular/core';

import { User } from '../models/user.model';
import { HttpService } from './http.service';
import { UtilitiesService } from './utilities.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  user: User | undefined
  currentUser = new EventEmitter<User| undefined>();
  isLoggedIn = new EventEmitter<boolean>();

  constructor(
    private httpService: HttpService,
    private utils: UtilitiesService
  ) {}

  setUser(data: any) {
    this.user = data
    this.currentUser.emit(data)
  }

  refreshCurrentUser() {
    this.httpService.getData('/auth/me').subscribe(
      (data) => {
        if(data != undefined) {
          this.setUser(data)
        }
      }, (error) => {
        this.setUser(undefined)
        this.isLoggedIn.emit(false)
        console.log(error)
      })
  }

  login(formData: FormData) {
    this.httpService.postData('/auth/login', formData).subscribe(
      (data) => {
        this.refreshCurrentUser()
        this.isLoggedIn.emit(true)
        this.utils.redirect_page_to('/home')
      }
    )
  }

  register(formData: FormData) {
    this.httpService.postData('/auth/register', formData).subscribe(
      (data) => {
        this.refreshCurrentUser()
        this.isLoggedIn.emit(true)
        this.utils.redirect_page_to('/home')
      }
    )
  }
}
