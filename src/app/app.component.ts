import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  model = {
    entries: [
      {
        type: 'source',
        state: 'hi'
      }
    ]
  };

  onUpdate(): void {
    console.log('updated');
  }
}
