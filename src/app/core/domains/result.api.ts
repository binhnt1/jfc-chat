export enum ResultType {
    Success = 1,
    Exception,
    Fail,
}

export enum LayoutState {
    Close = 0,
    Icon = 1,
    Minibar,
    Minimize,
    Maximize,
}

export enum PositionState {
    Top = 1,
    Widget,
}

export class ResultApi {
    public Object: any;
    public Type: ResultType;
    public Description: string;

    public constructor(type?: ResultType, object?: any, description?: string) {
        this.Object = object || null;
        this.Description = description || '';
        this.Type = type || ResultType.Success;
    }

    public static IsSuccess(result: any) {
        if (result) {
            let type = result.Type || result.type;
            return type == ResultType.Success;
        }
        return false;
    }

    public static ToEntity(item: any): ResultApi {
        let errCode = item.errCode;
        if (errCode == 0) {
            const entity: ResultApi = {
                Description: '',
                Object: item.data,
                Type: ResultType.Success,
            };
            return entity;
        } else {
            const entity: ResultApi = {
                Object: item,
                Type: ResultType.Fail,
                Description: item.errMsg,
            };
            return entity;
        }
    }

    public static ToException(error: any): ResultApi {
        let description: string;
        if (error && error.status == 0)
            description = 'The system connection has been interrupted, please try again later';

        const result: ResultApi = {
            Object: error,
            Type: ResultType.Exception,
            Description: description || error,
        };
        return result;
    }

    public static ToFail(error: string, obj?: any): ResultApi {
        const result: ResultApi = {
            Object: obj,
            Description: error,
            Type: ResultType.Fail,
        };
        return result;
    }
}
