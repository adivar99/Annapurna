import { Component } from '@angular/core';
import { AuthService } from './services/auth.service';
import { HttpService } from './services/http.service';
import { UtilitiesService } from './services/utilities.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'annapurna-app';
  logged_in: boolean = false

  constructor(
    private auth: AuthService,
    private http: HttpService,
    private utils: UtilitiesService
  ) {}

  ngOnInit(){
    this.auth.isLoggedIn.subscribe((login) => {
      this.logged_in = login
    })
    this.auto_login()
  }

  auto_login() {
    this.http.getData('/auth/login').subscribe({
      next: (data) => {
      if(data != undefined) {
        this.auth.setLoggedIn(true)
        this.app_start()
      }
    },
    error: (error) => {
      console.log(error)
      // this.app_start()
    }
  })
  }

  app_start() {
    if(this.logged_in) {
      this.auth.refreshCurrentUser()
      this.utils.redirect_page_to('home')
    } else {
      this.utils.redirect_page_to('landing')
    }
  }
}
