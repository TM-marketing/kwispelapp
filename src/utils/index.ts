export function createPageUrl(pageName: string, queryString?: string): string {
    const base = '/' + pageName.replace(/ /g, '-');
    if (queryString) {
        return `${base}?${queryString}`;
    }
    return base;
}