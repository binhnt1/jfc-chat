import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    standalone: true,
    name: 'relativeTime'
})
export class RelativeTimePipe implements PipeTransform {

    transform(value: any): string {
        if (!value) {
            return '';
        }

        const date = new Date(value);
        const now = new Date();

        // Thiết lập thời gian về đầu ngày (00:00:00) để so sánh ngày
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // 1. Nếu là ngày hôm nay -> Hiển thị giờ:phút (vd: 16:45)
        if (date.getTime() >= todayStart.getTime()) {
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
        }

        // 2. Tính toán số ngày đã trôi qua
        // So sánh dựa trên số mili giây để đảm bảo tính chính xác qua các mốc nửa đêm
        const daysDifference = Math.floor((todayStart.getTime() - new Date(date).setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));

        // 3. Nếu trong vòng 7 ngày qua -> Hiển thị số ngày (vd: 1d, 6d)
        if (daysDifference < 7) {
            return `${daysDifference} day`;
        }

        // 4. Nếu hơn 7 ngày -> Hiển thị số tuần (vd: 1w, 3w)
        const weeksDifference = Math.floor(daysDifference / 7);
        return `${weeksDifference} week`;
    }
}