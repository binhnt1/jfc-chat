import { Component } from '@angular/core';
import { ChatWidgetComponent } from './chat-widget/chat-widget';

@Component({
  standalone: true,
  selector: 'app-root',
  styleUrls: ['./app.css'],
  imports: [ChatWidgetComponent],
  template: '<app-chat-widget></app-chat-widget>',
})
export class AppComponent {
  title = 'chat-system';
}
