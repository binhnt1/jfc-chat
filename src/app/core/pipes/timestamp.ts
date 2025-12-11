import { DatePipe } from "@angular/common";
import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
    standalone: true,
    name: 'timestamp',
})
export class TimestampPipe implements PipeTransform {

    // Inject DatePipe của Angular để tái sử dụng
    constructor(public datePipe: DatePipe) { }

    /**
     * Transforms a numeric timestamp (seconds or milliseconds) into a formatted date string.
     * @param value The timestamp number.
     * @param format The desired output format (defaults to 'dd/MM/yyyy'). Use 'smart' for context-aware formatting.
     * @returns A formatted date string or an empty string if the value is invalid.
     */
    transform(value: number | null | undefined, format: string = 'dd/MM/yyyy HH:mm:ss'): string | null {
        // Trả về chuỗi rỗng nếu giá trị không hợp lệ
        if (!value) {
            return '';
        }

        // OpenIM thường trả về timestamp dạng mili giây (13 chữ số)
        // Nhưng để chắc chắn, chúng ta kiểm tra nếu nó là giây (10 chữ số) thì nhân với 1000
        const timestampInMs = value.toString().length === 10 ? value * 1000 : value;

        // Handle 'smart' format: today shows time only, other days show date + time
        if (format === 'smart') {
            const messageDate = new Date(timestampInMs);
            const today = new Date();

            // Check if the message is from today
            const isToday = messageDate.getDate() === today.getDate() &&
                           messageDate.getMonth() === today.getMonth() &&
                           messageDate.getFullYear() === today.getFullYear();

            if (isToday) {
                // Today: show only time (HH:mm)
                return this.datePipe.transform(timestampInMs, 'HH:mm');
            } else {
                // Other days: show date and time (MMM dd, HH:mm)
                return this.datePipe.transform(timestampInMs, 'MMM dd, HH:mm');
            }
        }

        // Dùng DatePipe của Angular để định dạng ngày tháng
        return this.datePipe.transform(timestampInMs, format);
    }
}
