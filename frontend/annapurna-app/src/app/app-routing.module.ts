import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LandingPageComponent } from './pages/landing-page/landing-page.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { HomeComponent } from './pages/home/home.component';
import { RecipeChatComponent } from './pages/recipe-chat/recipe-chat.component';
import { AddRecipeComponent } from './pages/add-recipe/add-recipe.component';
import { AdvancedSearchComponent } from './pages/advanced-search/advanced-search.component';
import { ChatSessionsComponent } from './components/chat-sessions/chat-sessions.component';

const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'home', component: HomeComponent },
  { path: 'chat', component: RecipeChatComponent },
  { path: 'add-recipe', component: AddRecipeComponent },
  { path: 'advanced-search', component: AdvancedSearchComponent },
  { path: 'chat-sessions', component: ChatSessionsComponent },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
