import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecipeChatComponent } from './recipe-chat.component';

describe('RecipeChatComponent', () => {
  let component: RecipeChatComponent;
  let fixture: ComponentFixture<RecipeChatComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RecipeChatComponent]
    });
    fixture = TestBed.createComponent(RecipeChatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
