export abstract class Component {
    private hideBinding: EventListener;

    protected transitionTo(area: string): void {
        const allAreas = document.querySelectorAll('.master-container > div');
        allAreas.forEach((value: Element) => {
            if (value.id === area) {
                value.classList.remove('hidden');
                value.classList.remove('slide-out');
                value.classList.add('slide-in');
            } else if (
                value.classList.contains('hidden') ||
                value.classList.contains('slide-out')
            ) { // if hidden, do not hide again. If sliding-out, it will be hidden soon.
                return;
            } else {
                value.classList.remove('slide-in');
                value.classList.add('slide-out');
                this.hideBinding = this.hide.bind(this);
                value.addEventListener('animationend', this.hideBinding);
                value.addEventListener('webkitAnimationEnd', this.hideBinding);
            }
        });
    }

    private hide(event: Event): void {
        event.srcElement.removeEventListener('animationend', this.hideBinding);
        event.srcElement.removeEventListener('webkitAnimationEnd', this.hideBinding);
        event.srcElement.classList.add('hidden');
        event.srcElement.classList.remove('slide-out');
    }
}
