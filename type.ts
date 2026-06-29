
export type DuckColumnInfo = {
    name: string,
    type: string
}

export type DuckTableInfo = {
    name: string,
    columns: DuckColumnInfo[]
}

export type HistoryQuery = {
    address: string,
    naf: string,
    city: string
}
