export class Util {
    public static Shuffle(array: any[]): any[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    public static PopRandomElement<T>(array: T[]): T {
        if (array.length === 0) {
            return null;
        }
        const index = Math.floor(Math.random() * array.length);
        const element = array[index];
        array = array.splice(array.indexOf(element), 1);
        return element;
    }

    public static ClearElement(element: HTMLElement): void {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }
}
