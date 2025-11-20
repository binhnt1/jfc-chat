import { OpenIMConfig } from "../config/openim.config";

export class ApiUrl {
    public static ToUrl(url: string, params?: ApiUrlParam[], domain?: string) {
        if (params && params.length > 0) {
            let paramString = '';
            params.forEach((param: ApiUrlParam) => {
                if (param.value !== undefined) {
                    paramString += paramString
                        ? '&' + param.key + '=' + param.value
                        : param.key + '=' + param.value;
                }
            });
            url += '?' + paramString;
        }
        
        if (url.indexOf('//') == 0 || url.indexOf('http') >= 0) 
            return url;
        let baseUrl = domain || OpenIMConfig.apiAddr;
        if (!baseUrl.endsWith('/') && !url.startsWith('/'))
            return baseUrl + '/' + url;
        else 
            return baseUrl + url;
    }
}

export class ApiUrlParam {
    public value: any;
    public key: string;
}