import { UtilityHelper } from '../utility.helper';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'fileSize',
    standalone: true,
})
export class FileSizePipe implements PipeTransform {

    transform(bytes: number): string {
        if (!bytes) {
            return '';
        }
        return UtilityHelper.formatFileSize(bytes);
    }
}