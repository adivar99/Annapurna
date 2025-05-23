import { Component } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { UtilitiesService } from 'src/app/services/utilities.service';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
  isLoggedIn: boolean = false;
  currentPage: string = '/home';
  constructor(private utils: UtilitiesService, private authService: AuthService) {
    this.authService.isLoggedIn.subscribe((isLoggedIn: boolean) => {
      this.isLoggedIn = isLoggedIn;
    });
  }

  redirect_to_page(page: string) {
    this.currentPage = page;
    this.utils.redirect_page_to(page);
  }
}
