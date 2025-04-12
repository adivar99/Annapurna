import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      console.log("Is form valid:", this.loginForm)
      console.log("Is password valid:", this.loginForm.get('password')?.value)
      let formData = new FormData();
      formData.append("username", this.loginForm.get('username')?.value);
      formData.append("password", this.loginForm.get('password')?.value);
      formData.append("client_id", '')
      formData.append("client_secret", '')
      formData.append("grant_type", 'password')
      formData.append("scope", '')
      this.authService.login(formData)
    }
  }

  
}
