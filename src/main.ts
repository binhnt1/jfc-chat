import 'zone.js'; 
import './styles.css';
import { appConfig } from './app/app.config';
import { createCustomElement } from '@angular/elements';
import { createApplication } from '@angular/platform-browser';
import { ChatWidgetComponent } from './app/chat-widget/chat-widget';

(async () => {
  const app = await createApplication(appConfig);

  const chatWidget = createCustomElement(ChatWidgetComponent, {
    injector: app.injector,
  });

  customElements.define('chat-widget', chatWidget);
})();
