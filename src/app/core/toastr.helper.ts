declare var toastr: any;
import { ResultApi } from "./domains/result.api";

export class ToastrHelper {
    public static Exception(ex: any, title: string = 'Error', timeout: number = 8000, onclick: any = null) {
        let description = 'System error, please contact the Administrator';
        if (ex && ex.error) {
            if (typeof ex.error === 'string') {
                description = ex.error;
            } else if (ex.error && ex.error.error) {
                description = ex.error.error;
            }
        }
        toastr.options = {
            timeOut: timeout,
            onclick: onclick,
            positionClass: 'toast-top-center',
        };
        if (description) toastr.error(description, title);
    }

    public static Error(message: string, title: string = 'Error', timeout: number = 8000, onclick: any = null) {
        toastr.options = {
            timeOut: timeout,
            onclick: onclick,
            positionClass: 'toast-top-center',
        };
        if (message && message.indexOf('object') >= 0) {
            ToastrHelper.Error('System error, please contact the Administrator.', title);
            return;
        }
        if (message) toastr.error(message, title);
    }

    public static Success(message?: string, title: string = 'Success', timeout: number = 8000, onclick: any = null) {
        message = message || 'Data saved successfully.';
        toastr.options = {
            timeOut: timeout,
            onclick: onclick,
            positionClass: 'toast-top-center',
        };
        toastr.success(message, title);
    }

    public static Warning(message: string, title: string = 'Warning', timeout: number = 8000, onclick: any = null) {
        toastr.options = {
            timeOut: timeout,
            onclick: onclick,
            positionClass: 'toast-top-center',
        };
        toastr.warning(message, title);
    }

    public static ErrorResult(result: ResultApi, title: string = 'Error', timeout: number = 8000, onclick: any = null) {
        let message = result?.Description?.toString();
        if (message && message.indexOf('TypeError: You provided') >= 0) {
            return;
        }
        toastr.options = {
            timeOut: timeout,
            onclick: onclick,
            positionClass: 'toast-top-center',
        };
        toastr.error(message || 'System error, please contact the Administrator', title);
    }
}