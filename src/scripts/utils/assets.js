export function getImageUrl(fileName) {
    if (!fileName) {
        return '';
    }
    const url = new URL(`../../images/${fileName}`, import.meta.url);
    return url.href;
}
