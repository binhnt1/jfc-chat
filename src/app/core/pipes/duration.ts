import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'duration',
    standalone: true,
})
export class DurationPipe implements PipeTransform {

    transform(seconds: number): string {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
    }
}