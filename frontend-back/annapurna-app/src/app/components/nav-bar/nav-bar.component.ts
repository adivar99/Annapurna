import { Component, OnInit } from '@angular/core';
import { NavigationEnd } from '@angular/router';
import { Router } from '@angular/router';
import { User } from 'src/app/models/user.model';
import { AuthService } from 'src/app/services/auth.service';
import { UtilitiesService } from 'src/app/services/utilities.service';

@Component({
  selector: 'app-nav-bar',
  templateUrl: './nav-bar.component.html',
  styleUrls: ['./nav-bar.component.scss']
})
export class NavBarComponent implements OnInit{
  currUser: User | undefined
  isLoggedIn: boolean = false
  currentUrl: string = '';

  constructor(
    private router: Router,
    private auth: AuthService,
    private utils: UtilitiesService,
  ) { }
  
  ngOnInit(): void {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.currentUrl = event.url;
      }
    });
    this.auth.currentUser.subscribe({
      next: (user: User) => {
        this.currUser = user
      }
    })
    this.auth.isLoggedIn.subscribe({
      next: (data: boolean) => {
        console.log("NavBar: Setting loggedIn = ", data)
        this.isLoggedIn = data
      }
    })
    this.isLoggedIn = this.auth.loggedIn
  }

  
  logout() {
    this.auth.logout();
    this.utils.redirect_page_to('/landing');
  }
}
