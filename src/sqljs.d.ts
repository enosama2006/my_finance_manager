declare module 'sql.js' {
  export interface QueryExecResult { columns: string[]; values: unknown[][] }
  export interface Statement {
    step(): boolean
    getAsObject(): Record<string, unknown>
    free(): void
  }
  export interface Database {
    run(sql: string, params?: unknown[]): Database
    exec(sql: string): QueryExecResult[]
    prepare(sql: string, params?: unknown[]): Statement
    export(): Uint8Array
    close(): void
  }
  export interface SqlJsStatic {
    Database: new (data?: Uint8Array) => Database
  }
  export interface InitSqlJsConfig { locateFile?: (file: string) => string }
  export default function initSqlJs(config?: InitSqlJsConfig): Promise<SqlJsStatic>
}

declare module 'sql.js/dist/sql-wasm.wasm?url' {
  const url: string
  export default url
}
