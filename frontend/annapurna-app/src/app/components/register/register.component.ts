import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { UtilitiesService } from 'src/app/services/utilities.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  registerForm: FormGroup;
  licenseFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private utils: UtilitiesService
  ) {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required]],
      username: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      // lic_file: ['', [Validators.required]]
    });
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.licenseFile = file;
    }
  }

  onSubmit() {
    if (this.registerForm.valid) {
      const formData = new FormData();
      formData.append('full_name', this.registerForm.get('name')?.value);
      formData.append('username', this.registerForm.get('username')?.value);
      formData.append('email', this.registerForm.get('email')?.value);
      formData.append('password', this.registerForm.get('password')?.value);
      if (this.licenseFile) {
        formData.append('license', this.licenseFile);
      }
      formData.forEach((val, key, par) => {
        console.log("login form ["+key+"]: " + val)
      })
      let formData1 = {
        'full_name': formData.get('full_name'),
        'email': formData.get('email'),
        'username': formData.get('username'),
        'password': formData.get('password'),
      }
      console.log(formData1)
      this.authService.register(formData1)
      // this.utils.redirect_page_to('/login')
    }
  }
}
