import "reflect-metadata";

export enum Methods {
    get = "get",
    post = "post",
    put = "put",
    delete = "delete",
    patch = "patch",
}

export interface IRequestParameter {
    name: string;
    in: "query" | "header" | "path" | "cookie";
    required?: boolean;
    schema: SchemaObject;
    description?: string;
}

export interface IResponseObject {
    description: string;
    content: {
        [contentType: string]: {
            schema: SchemaObject;
        };
    };
}

export class RequestBody {
    content: {
        [contentType: string]: {
            schema: SchemaObject;
        };
    };
    description?: string;
    required?: boolean;

    constructor(
        content: {
            [contentType: string]: {
                schema: SchemaObject;
            };
        },
        description?: string,
        required: boolean = true
    ) {
        this.content = content;
        this.description = description;
        this.required = required;
    }
}

export interface SchemaObject {
    type?: string;
    properties?: {
        [key: string]: SchemaObject;
    };
    items?: SchemaObject;
    enum?: string[];
    format?: string;
    example?: any;
    description?: string;
    required?: string[];
    nullable?: boolean;
}

export interface PathMethod {
    operationId?: string;
    tags?: string[];
    summary?: string;
    description?: string;
    parameters?: IRequestParameter[];
    requestBody?: RequestBody;
    responses: {
        [statusCode: string]: IResponseObject;
    };
}

export interface Path {
    [method: string]: PathMethod;
}

export interface Paths {
    [path: string]: Path;
}

export interface Tag {
    name: string;
    description?: string;
}

export interface ServerObject {
    url: string;
    description?: string;
}

export interface IInfoObject {
    title: string;
    description?: string;
    version?: string;
}

export class ZeroDocs {
    public refs: { [key: string]: string } = {};
    public schemas: { [key: string]: SchemaObject } = {};
    public tags: Tag[] = [];
    public openapi: string = "3.0.1";
    public basePath: string = "/";
    public servers: ServerObject[] = [];
    public info: IInfoObject = { title: "", description: "" };
    public paths: Paths = {};
    private enabled = true;

    disableDocumentation() {
        this.enabled = false;
    }

    enableDocumentation() {
        this.enabled = true;
    }

    setBasePath(path: string) {
        this.basePath = path;
    }

    setOpenApiVersion(version: string) {
        this.openapi = version;
    }

    addSchema() {
        return (target: Function) => {
            if (!this.enabled) return;

            const schema = Reflect.getMetadata("smoke:schema", target) ?? ({} as SchemaObject);
            this.schemas[target.name] = JSON.parse(JSON.stringify(schema));
            this.refs[target.name] = `#/components/schemas/${target.name}`;
        };
    }

    addField(data: SchemaObject) {
        return (target: object, propertyKey: string) => {
            if (!this.enabled) return;

            const targetConstructor = target.constructor;
            const schema: SchemaObject = Reflect.getMetadata("smoke:schema", targetConstructor) ?? { properties: {} };
            schema.properties = schema.properties || {};
            schema.properties[propertyKey] = data;
            Reflect.defineMetadata("smoke:schema", schema, targetConstructor);
            this.refs[targetConstructor.name] = `#/components/schemas/${targetConstructor.name}`;
        };
    }

    getRef(target: Function | string): string {
        const name = typeof target === "string" ? target : target.name;
        return this.refs[name];
    }

    getSchema(target: Function | string): SchemaObject {
        if (!this.enabled) return {} as SchemaObject;
        const name = typeof target === "string" ? target : target.name;
        return this.schemas[name];
    }

    addTags(tags: Tag[]) {
        this.tags.push(...tags);
    }

    addServers(servers: ServerObject[]) {
        this.servers.push(...servers);
    }

    addInfo(info: IInfoObject) {
        this.info = info;
    }

    addRoute(data: {
        path: string;
        method: Methods;
        tags?: string[];
        requestBody?: SchemaObject;
        requestBodyDescription?: string;
        parameters?: IRequestParameter[];
        description?: string;
        operationId?: string;
        summary?: string;
        responses: {
            [key: string]: { description: string; value: SchemaObject };
        };
        responseHeaders?: {
            [key: string]: {
                description: string;
                schema: SchemaObject;
            };
        };
    }) {
        return (target?: Object | Function, operationId?: string) => {
            if (!this.enabled) return;

            let name: string | undefined;
            if (target && typeof target === "object" && target.constructor) {
                name = target.constructor.name;
            } else if (typeof target === "function") {
                name = target.name;
            }

            if (!this.paths[data.path]) {
                this.paths[data.path] = {};
            }

            this.paths[data.path][data.method] = {
                operationId:
                data.operationId ||
                operationId ||
                `${name ?? ""}_${data.method}_${data.parameters?.length || 0}`,
                description: data.description,
                summary: data.summary,
                parameters: data.parameters,
                tags: data.tags,
                requestBody: data.requestBody
                ? new RequestBody(
                    { "application/json": { schema: data.requestBody } },
                    data.requestBodyDescription
                    )
                : undefined,
                responses: Object.keys(data.responses).reduce(
                (acc, status) => {
                    acc[status] = {
                    description: data.responses[status].description,
                    content: {
                        "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                            status: {
                                type: "object",
                                properties: {
                                code: { type: "string", example: status },
                                error: {
                                    type: "boolean",
                                    example: !status.startsWith("2"),
                                },
                                },
                            },
                            message: {
                                type: "string",
                                example: status.startsWith("2") ? "Success" : "Error",
                            },
                            result: data.responses[status].value,
                            },
                        },
                        },
                    },
                    };
                    return acc;
                },
                {} as { [key: string]: IResponseObject }
                ),
            };
        };
    }

    getAPIJson() {
        return {
            openapi: this.openapi,
            servers: this.servers,
            info: this.info,
            tags: this.tags,
            paths: this.paths,
            components: {
                schemas: this.schemas,
            },
        };
    }
}

export const Documentation = new ZeroDocs();
