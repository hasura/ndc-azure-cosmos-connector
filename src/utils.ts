export function mapObjectValues<T, U>(obj: { [k: string]: T }, fn: (value: T, propertyName: string) => U): Record<string, U> {
    return Object.fromEntries(Object.entries(obj).map(([prop, val]) => [prop, fn(val, prop)]));
}
