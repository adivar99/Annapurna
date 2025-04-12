import { Component, OnInit } from '@angular/core';
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

  constructor(
    private auth: AuthService,
    private utils: UtilitiesService,
  ) { }

  ngOnInit(): void {
    this.auth.currentUser.subscribe({
      next: (user: User) => {
        this.currUser = user
      }
    })
    // this.auth.refreshCurrentUser()
  }

  processLogout() {
    this.auth.logout();
  }
}
